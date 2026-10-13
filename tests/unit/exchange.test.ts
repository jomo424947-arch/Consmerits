import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { ReturnsService } from '../../src/main/services/returns.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('Exchange Engine (عمليات استبدال البضاعة)', () => {
  let db: Database.Database;
  let returnsService: ReturnsService;
  let authService: AuthService;
  let userId: number;
  let shiftId: number;
  let oldVariantId: number;
  let oldBatchId: number;
  let newVariantId: number;
  let newBatchId: number;
  let saleId: number;
  let saleItemId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    returnsService = new ReturnsService(db);
    authService = new AuthService(db);

    const user = authService.createUser({
      username: 'exchange_cashier',
      display_name: 'كاشير الاستبدال',
      password: 'password',
      pin: '1122',
      role: USER_ROLES.CASHIER,
    });
    userId = user.id;

    const shiftRes = db
      .prepare(`
        INSERT INTO shifts (uuid, user_id, opening_balance, status, opened_at)
        VALUES ('SHIFT-EXCH', ?, 100000, 'open', datetime('now'))
      `)
      .run(userId);
    shiftId = Number(shiftRes.lastInsertRowid);

    const cat = db.prepare("INSERT INTO categories (uuid, name, created_at) VALUES ('CAT-EX', 'مكياج', datetime('now'))").run();
    const prod = db.prepare("INSERT INTO products (uuid, category_id, name_ar, created_at, updated_at) VALUES ('PROD-EX', ?, 'أحمر شفاه', datetime('now'), datetime('now'))").run(Number(cat.lastInsertRowid));

    // الصنف القديم (سعر البيع 10000 = 100 ج.م)
    const vOld = db.prepare("INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock) VALUES ('VAR-OLD', ?, 'Red 01', 'SKU-RED-01', 10000, 2)").run(Number(prod.lastInsertRowid));
    oldVariantId = Number(vOld.lastInsertRowid);

    const bOld = db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'B-OLD', date('now', '+100 days'), 5000, 5, datetime('now'))
    `).run(oldVariantId);
    oldBatchId = Number(bOld.lastInsertRowid);

    // الصنف الجديد (سعر البيع 16000 = 160 ج.م)
    const vNew = db.prepare("INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock) VALUES ('VAR-NEW', ?, 'Ruby 05 Premium', 'SKU-RUBY-05', 16000, 2)").run(Number(prod.lastInsertRowid));
    newVariantId = Number(vNew.lastInsertRowid);

    const bNew = db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'B-NEW', date('now', '+200 days'), 8000, 10, datetime('now'))
    `).run(newVariantId);
    newBatchId = Number(bNew.lastInsertRowid);

    // فاتورة بيع سابقة اشترى فيها العميل الصنف القديم (قطعتين بـ 20000)
    const sRes = db.prepare(`
      INSERT INTO sales (uuid, seq_no, invoice_no, user_id, shift_id, subtotal, discount_amount, tax_amount, total, status, created_at)
      VALUES ('SALE-EX-1', 201, 'INV-00201', ?, ?, 20000, 0, 0, 20000, 'completed', datetime('now'))
    `).run(userId, shiftId);
    saleId = Number(sRes.lastInsertRowid);

    const siRes = db.prepare(`
      INSERT INTO sale_items (sale_id, variant_id, batch_id, product_name, variant_name, qty, unit_price, unit_cost, discount_amount, line_total)
      VALUES (?, ?, ?, 'أحمر شفاه', 'Red 01', 2, 10000, 5000, 0, 20000)
    `).run(saleId, oldVariantId, oldBatchId);
    saleItemId = Number(siRes.lastInsertRowid);

    db.prepare("INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, 'cash', 20000)").run(saleId);
  });

  afterEach(() => {
    db.close();
  });

  test('استبدال بصنف أعلى سعراً: العميل يدفع فرق السعر نقداً', async () => {
    // استبدال قطعة واحدة من القديم (قيمة 10000) بقطعة واحدة من الجديد (سعر 16000)
    // الفرق: 16000 - 10000 = 6000 يدفعها العميل
    const result = await returnsService.createExchange({
      return_input: {
        sale_id: saleId,
        user_id: userId,
        refund_method: 'exchange',
        shift_id: shiftId,
        items: [
          {
            sale_item_id: saleItemId,
            qty: 1,
            condition: 'good',
          },
        ],
      },
      new_sale_items: [
        {
          variant_id: newVariantId,
          qty: 1,
        },
      ],
      difference_payment_method: 'cash',
      user_id: userId,
      shift_id: shiftId,
    });

    expect(result.action_taken).toBe('customer_paid');
    expect(result.price_difference).toBe(6000);
    expect(result.return_invoice.total_refund).toBe(10000);
    expect(result.new_sale_id).toBeDefined();

    // فحص عودة القطعة القديمة للمخزون (5 + 1 = 6)
    const oldBatch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(oldBatchId) as {
      qty_remaining: number;
    };
    expect(oldBatch.qty_remaining).toBe(6);

    // فحص خروج القطعة الجديدة من المخزون (10 - 1 = 9)
    const newBatch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(newBatchId) as {
      qty_remaining: number;
    };
    expect(newBatch.qty_remaining).toBe(9);
  });

  test('استبدال بصنف أقل سعراً: المحل يرد فرق السعر نقداً للعميل', async () => {
    // استبدال قطعتين من القديم (قيمة 20000) بقطعة واحدة من الجديد (سعر 16000)
    // الفرق: 16000 - 20000 = -4000 (رد 4000 للعميل)
    const result = await returnsService.createExchange({
      return_input: {
        sale_id: saleId,
        user_id: userId,
        refund_method: 'exchange',
        shift_id: shiftId,
        items: [
          {
            sale_item_id: saleItemId,
            qty: 2,
            condition: 'good',
          },
        ],
      },
      new_sale_items: [
        {
          variant_id: newVariantId,
          qty: 1,
        },
      ],
      difference_payment_method: 'cash',
      user_id: userId,
      shift_id: shiftId,
    });

    expect(result.action_taken).toBe('customer_refunded');
    expect(result.price_difference).toBe(-4000);
    expect(result.return_invoice.total_refund).toBe(20000);

    // فحص تسجيل حركة رد الفرق في الخزنة
    const cashMove = db
      .prepare("SELECT * FROM cash_movements WHERE ref_type = 'exchange_diff'")
      .get() as { type: string; amount: number } | undefined;

    expect(cashMove).toBeDefined();
    expect(cashMove?.type).toBe('refund');
    expect(cashMove?.amount).toBe(-4000);
  });
});
