import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { SalesService } from '../../src/main/services/sales.service';
import { ProductsService } from '../../src/main/services/products.service';
import { CashService } from '../../src/main/services/cash.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('SalesService (Point of Sale Engine & FEFO)', () => {
  let db: Database.Database;
  let salesService: SalesService;
  let productsService: ProductsService;
  let cashService: CashService;
  let authService: AuthService;

  let cashierId: number;
  let shiftId: number;
  let variantId: number;
  let batchId1: number;
  let batchId2: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    salesService = new SalesService(db);
    productsService = new ProductsService(db);
    cashService = new CashService(db);
    authService = new AuthService(db);

    const cashier = authService.createUser({
      username: 'pos_cashier',
      display_name: 'كاشير نقطة البيع',
      password: 'pos',
      pin: '1234',
      role: USER_ROLES.CASHIER,
    });
    cashierId = cashier.id;

    const shift = await cashService.openShift(cashierId, 100000); // 1000 ج.م
    shiftId = shift.id;

    // إنشاء منتج و Variant
    const product = await productsService.createProduct({
      name_ar: 'ماسكارا مقاومة للماء',
      variants: [
        {
          variant_name: 'أسود فحمي',
          selling_price: 15000, // 150 ج.م
          barcodes: ['6220000111222'],
        },
      ],
    });
    variantId = product.variants[0].id;

    // إضافة دفعتين للمخزون:
    // الدفعة 1: صلاحية أقرب (تنتهي 2026-12-01) بها 3 قطع
    const b1 = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-EARLY', '2026-12-01', 9000, 3, datetime('now'))
      `)
      .run(variantId);
    batchId1 = Number(b1.lastInsertRowid);

    // الدفعة 2: صلاحية أبعد (تنتهي 2027-06-01) بها 10 قطع
    const b2 = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-LATE', '2027-06-01', 9500, 10, datetime('now'))
      `)
      .run(variantId);
    batchId2 = Number(b2.lastInsertRowid);
  });

  afterEach(() => {
    db.close();
  });

  test('تطبيق خوارزمية FEFO واختيار الدفعة الأقرب انتهاءً أولاً واقتطاع المخزون', async () => {
    // بيع 5 قطع: يجب أن تأخذ 3 من الدفعة 1 (الأقرب انتهاءً) و 2 من الدفعة 2
    const sale = await salesService.createSale(
      {
        items: [
          {
            variant_id: variantId,
            qty: 5,
            unit_price: 15000,
            discount_amount: 0,
          },
        ],
        payments: [
          {
            method: 'cash',
            amount: 75000, // 5 * 150 = 750 ج.م
          },
        ],
        discount_amount: 0,
        notes: 'تجربة بيع بـ FEFO',
      },
      cashierId,
      shiftId
    );

    expect(sale.id).toBeDefined();
    expect(sale.invoice_no).toBe('INV-00001');
    expect(sale.total).toBe(75000);
    expect(sale.status).toBe('completed');
    expect(sale.items?.length).toBe(2); // سطرين: 3 من الدفعة الأولى و 2 من الدفعة الثانية

    // فحص الرصيد المتبقي في الدفعات بعد عمل الـ Trigger
    const batch1Row = db
      .prepare('SELECT qty_remaining FROM batches WHERE id = ?')
      .get(batchId1) as { qty_remaining: number };
    const batch2Row = db
      .prepare('SELECT qty_remaining FROM batches WHERE id = ?')
      .get(batchId2) as { qty_remaining: number };

    expect(batch1Row.qty_remaining).toBe(0); // نفذت الدفعة الأقرب
    expect(batch2Row.qty_remaining).toBe(8); // تبقى 8 من 10

    // فحص تسجيل حركة نقدية بالخزنة للبيع النقدي
    const cashMovements = db
      .prepare("SELECT * FROM cash_movements WHERE type = 'sale' AND ref_id = ?")
      .all(sale.id) as any[];
    expect(cashMovements.length).toBe(1);
    expect(cashMovements[0].amount).toBe(75000);
  });

  test('رفض إتمام البيع في حال كان المبلغ المدفوع أقل من الإجمالي', async () => {
    await expect(
      salesService.createSale(
        {
          items: [
            {
              variant_id: variantId,
              qty: 1,
              unit_price: 15000,
              discount_amount: 0,
            },
          ],
          payments: [
            {
              method: 'cash',
              amount: 10000, // 100 ج.م والمطلوب 150 ج.م
            },
          ],
          discount_amount: 0,
        },
        cashierId,
        shiftId
      )
    ).rejects.toThrow('أقل من إجمالي الفاتورة');
  });

  test('تعليق فاتورة واستئنافها بنجاح (Hold & Resume Sale)', async () => {
    const cartData = {
      items: [{ variant_id: variantId, qty: 2 }],
      customer: 'أميرة سالم',
    };

    const holdId = await salesService.holdSale(cartData, shiftId, cashierId, 'أميرة سالم');
    expect(holdId).toBeDefined();

    const heldList = await salesService.getHeldSales();
    expect(heldList.length).toBe(1);
    expect(heldList[0].id).toBe(holdId);

    // استئناف الفاتورة وحذفها من المعلقات
    const resumed = await salesService.resumeHeldSale(holdId);
    expect(resumed.id).toBe(holdId);

    const emptyHeldList = await salesService.getHeldSales();
    expect(emptyHeldList.length).toBe(0);
  });

  test('إلغاء فاتورة مبيعات (Void Sale) وإرجاع المخزون وعكس حركة الخزنة', async () => {
    const sale = await salesService.createSale(
      {
        items: [
          {
            variant_id: variantId,
            qty: 2,
            unit_price: 15000,
            discount_amount: 0,
          },
        ],
        payments: [
          {
            method: 'cash',
            amount: 30000,
          },
        ],
        discount_amount: 0,
      },
      cashierId,
      shiftId
    );

    // إلغاء الفاتورة
    const voided = await salesService.voidSale(sale.id, cashierId, 'طلب العميل إلغاء الشراء');
    expect(voided.status).toBe('voided');
    expect(voided.void_reason).toBe('طلب العميل إلغاء الشراء');

    // التأكد من استعادة رصيد الدفعة في المخزون
    const b1After = db
      .prepare('SELECT qty_remaining FROM batches WHERE id = ?')
      .get(batchId1) as { qty_remaining: number };
    expect(b1After.qty_remaining).toBe(3); // عادت القطعتان للدفعة 1

    // التأكد من حركة الاسترداد النقدي في الخزنة
    const refundMovement = db
      .prepare("SELECT * FROM cash_movements WHERE type = 'refund' AND ref_id = ?")
      .get(sale.id) as any;
    expect(refundMovement).toBeDefined();
    expect(refundMovement.amount).toBe(-30000);
  });
});
