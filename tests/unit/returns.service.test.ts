import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { ReturnsService } from '../../src/main/services/returns.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('ReturnsService (خدمة المرتجعات وسياسات الإرجاع)', () => {
  let db: Database.Database;
  let returnsService: ReturnsService;
  let authService: AuthService;
  let userId: number;
  let shiftId: number;
  let customerId: number;
  let variantId: number;
  let batchId: number;
  let saleId: number;
  let saleItemId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    returnsService = new ReturnsService(db);
    authService = new AuthService(db);

    const user = authService.createUser({
      username: 'cashier_ret',
      display_name: 'كاشير المرتجعات',
      password: 'password',
      pin: '7788',
      role: USER_ROLES.CASHIER,
    });
    userId = user.id;

    // وردية مفتوحة
    const shiftRes = db
      .prepare(`
        INSERT INTO shifts (uuid, user_id, opening_balance, status, opened_at)
        VALUES ('SHIFT-RET', ?, 100000, 'open', datetime('now'))
      `)
      .run(userId);
    shiftId = Number(shiftRes.lastInsertRowid);

    // عميل
    const custRes = db
      .prepare(`
        INSERT INTO customers (uuid, name, phone, credit_limit, balance, is_active, created_at)
        VALUES ('CUST-RET', 'نورهان سعيد', '01011122233', 100000, 50000, 1, datetime('now'))
      `)
      .run();
    customerId = Number(custRes.lastInsertRowid);

    // قسم وصنف ودفعة
    const cat = db.prepare("INSERT INTO categories (uuid, name, created_at) VALUES ('CAT-R', 'مكياج', datetime('now'))").run();
    const prod = db.prepare("INSERT INTO products (uuid, category_id, name_ar, created_at, updated_at) VALUES ('PROD-R', ?, 'بودرة مضغوطة', datetime('now'), datetime('now'))").run(Number(cat.lastInsertRowid));
    const v = db.prepare("INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock) VALUES ('VAR-R', ?, 'Beige 02', 'SKU-POW-02', 15000, 5)").run(Number(prod.lastInsertRowid));
    variantId = Number(v.lastInsertRowid);

    // دفعة متبقي بها 10 قطع
    const b = db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'BATCH-R1', date('now', '+180 days'), 8000, 10, datetime('now'))
    `).run(variantId);
    batchId = Number(b.lastInsertRowid);

    // إنشاء فاتورة بيع سابقة: بيع 4 قطع بسعر 15000 للقطعة (إجمالي 60000)
    const saleRes = db.prepare(`
      INSERT INTO sales (uuid, seq_no, invoice_no, user_id, shift_id, customer_id, subtotal, discount_amount, tax_amount, total, status, created_at)
      VALUES ('SALE-RET-1', 101, 'INV-00101', ?, ?, ?, 60000, 0, 0, 60000, 'completed', datetime('now'))
    `).run(userId, shiftId, customerId);
    saleId = Number(saleRes.lastInsertRowid);

    // سطر الفاتورة
    const itemRes = db.prepare(`
      INSERT INTO sale_items (sale_id, variant_id, batch_id, product_name, variant_name, qty, unit_price, unit_cost, discount_amount, line_total)
      VALUES (?, ?, ?, 'بودرة مضغوطة', 'Beige 02', 4, 15000, 8000, 0, 60000)
    `).run(saleId, variantId, batchId);
    saleItemId = Number(itemRes.lastInsertRowid);

    // سداد كاش
    db.prepare(`
      INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, 'cash', 60000)
    `).run(saleId);
  });

  afterEach(() => {
    db.close();
  });

  test('إرجاع منتج سليم (good): إعادة الكمية للمخزون على نفس الدفعة ورد المبلغ نقداً', async () => {
    // إرجاع 2 قطعة من أصل 4
    const returnInvoice = await returnsService.createReturn({
      sale_id: saleId,
      user_id: userId,
      refund_method: 'cash',
      reason: 'العميل اشترى درجة خاطئة',
      shift_id: shiftId,
      items: [
        {
          sale_item_id: saleItemId,
          qty: 2,
          condition: 'good',
        },
      ],
    });

    expect(returnInvoice.id).toBeDefined();
    expect(returnInvoice.total_refund).toBe(30000); // 2 * 15000
    expect(returnInvoice.refund_method).toBe('cash');

    // 1. فحص عودة الكمية للمخزون في الدفعة الأصلية (كانت 10 وأصبحت 12 عبر المشغل)
    const batch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(batchId) as {
      qty_remaining: number;
    };
    expect(batch.qty_remaining).toBe(12);

    // 2. فحص حركة المخزون المسجلة بنوع sale_return
    const mov = db
      .prepare("SELECT * FROM stock_movements WHERE ref_type = 'return' AND ref_id = ?")
      .get(returnInvoice.id) as { type: string; qty: number; batch_id: number };
    expect(mov.type).toBe('sale_return');
    expect(mov.qty).toBe(2);
    expect(mov.batch_id).toBe(batchId);

    // 3. فحص حركة الخزنة النقدية (رد نقدي سالب)
    const cashMove = db
      .prepare("SELECT * FROM cash_movements WHERE ref_type = 'return' AND ref_id = ?")
      .get(returnInvoice.id) as { type: string; amount: number };
    expect(cashMove.type).toBe('refund');
    expect(cashMove.amount).toBe(-30000);
  });

  test('إرجاع منتج تالف (damaged): عدم إعادة الكمية للمخزون الصالح ورد القيمة', async () => {
    // إرجاع قطعة واحدة تالفة
    const ret = await returnsService.createReturn({
      sale_id: saleId,
      user_id: userId,
      refund_method: 'cash',
      reason: 'المنتج تالف من الداخل',
      items: [
        {
          sale_item_id: saleItemId,
          qty: 1,
          condition: 'damaged',
        },
      ],
    });

    expect(ret.total_refund).toBe(15000);

    // رصيد الدفعة في المخزون الصالح لم يتغير (يبقى 10 ولا يرجع للمخزون)
    const batch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(batchId) as {
      qty_remaining: number;
    };
    expect(batch.qty_remaining).toBe(10);
  });

  test('إرجاع كرصيد حساب عميل (credit refund) وتخفيض مديونية العميل', async () => {
    // إرجاع قطعتين رصيد (قيمة 30000)
    await returnsService.createReturn({
      sale_id: saleId,
      user_id: userId,
      refund_method: 'credit',
      items: [
        {
          sale_item_id: saleItemId,
          qty: 2,
          condition: 'good',
        },
      ],
    });

    // رصيد العميل المدين كان 50000 وينخفض بـ 30000 ليصبح 20000
    const customer = db.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as {
      balance: number;
    };
    expect(customer.balance).toBe(20000);
  });

  test('منع إرجاع كمية تتجاوز الكمية المباعة أو المتبقية', async () => {
    // إرجاع 3 قطع
    await returnsService.createReturn({
      sale_id: saleId,
      user_id: userId,
      refund_method: 'cash',
      items: [{ sale_item_id: saleItemId, qty: 3, condition: 'good' }],
    });

    // محاولة إرجاع 2 قطع إضافية (متبقي 1 فقط لأن الأصلي 4) -> يجب أن تفشل
    await expect(
      returnsService.createReturn({
        sale_id: saleId,
        user_id: userId,
        refund_method: 'cash',
        items: [{ sale_item_id: saleItemId, qty: 2, condition: 'good' }],
      })
    ).rejects.toThrow('تتجاوز الكمية المتبقية المسموح بها (1)');
  });
});
