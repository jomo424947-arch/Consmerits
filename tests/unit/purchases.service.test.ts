import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { PurchasesService } from '../../src/main/services/purchases.service';
import { SuppliersService } from '../../src/main/services/suppliers.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('PurchasesService (خدمة فواتير الشراء والمرتجعات)', () => {
  let db: Database.Database;
  let purchasesService: PurchasesService;
  let suppliersService: SuppliersService;
  let authService: AuthService;
  let userId: number;
  let supplierId: number;
  let variantId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    purchasesService = new PurchasesService(db);
    suppliersService = new SuppliersService(db);
    authService = new AuthService(db);

    const user = authService.createUser({
      username: 'purchaser',
      display_name: 'أمين المشتريات',
      password: 'password',
      pin: '5566',
      role: USER_ROLES.MANAGER,
    });
    userId = user.id;

    // مورد تجريبي
    const supplier = db
      .prepare(`
        INSERT INTO suppliers (uuid, name, phone, balance, is_active, created_at)
        VALUES ('SUP-1', 'المورد الذهبي', '0123456789', 0, 1, datetime('now'))
      `)
      .run();
    supplierId = Number(supplier.lastInsertRowid);

    // تجهيز منتج وصنف
    const cat = db
      .prepare("INSERT INTO categories (uuid, name, created_at) VALUES ('CAT-1', 'عناية', datetime('now'))")
      .run();
    const prod = db
      .prepare(`
        INSERT INTO products (uuid, category_id, name_ar, created_at, updated_at)
        VALUES ('PROD-1', ?, 'كريم مرطب غني', datetime('now'), datetime('now'))
      `)
      .run(Number(cat.lastInsertRowid));

    const v = db
      .prepare(`
        INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
        VALUES ('VAR-1', ?, '50ml', 'SKU-CREAM-50', 5000, 5)
      `)
      .run(Number(prod.lastInsertRowid));
    variantId = Number(v.lastInsertRowid);
  });

  afterEach(() => {
    db.close();
  });

  test('إنشاء فاتورة شراء متكاملة: إنشاء الدفعات وحركات المخزون وتحديث أسعار البيع وحساب الآجل', async () => {
    // شراء 20 قطعة بتكلفة 3000 (30 ج.م) للقطعة، وسعر بيع مقترح 6500 (65 ج.م)
    // الإجمالي: 60000. المدفوع: 20000 (نقدي). المتبقي آجل: 40000.
    const purchase = await purchasesService.create({
      supplier_id: supplierId,
      invoice_no: 'INV-SUP-101',
      items: [
        {
          variant_id: variantId,
          qty: 20,
          unit_cost: 3000,
          batch_no: 'BATCH-SUP-101',
          expiry_date: '2027-12-31',
          suggested_sale_price: 6500,
        },
      ],
      discount: 0,
      tax: 0,
      paid: 20000,
      payment_method: 'cash',
      user_id: userId,
      notes: 'شحنة تجريبية',
    });

    expect(purchase.id).toBeDefined();
    expect(purchase.total).toBe(60000);
    expect(purchase.paid).toBe(20000);
    expect(purchase.status).toBe('partial');
    expect(purchase.items?.length).toBe(1);

    const item = purchase.items![0];
    expect(item.batch_id).toBeDefined();

    // 1. فحص الدفعة المنشأة ورصيدها بالمخزون (تمت زيادته بـ 20 عبر المشغل)
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(item.batch_id) as {
      qty_remaining: number;
      unit_cost: number;
      batch_no: string;
    };
    expect(batch.qty_remaining).toBe(20);
    expect(batch.unit_cost).toBe(3000);
    expect(batch.batch_no).toBe('BATCH-SUP-101');

    // 2. فحص حركة المخزون المسجلة
    const movement = db
      .prepare("SELECT * FROM stock_movements WHERE ref_type = 'purchase' AND ref_id = ?")
      .get(purchase.id) as { type: string; qty: number; batch_id: number };
    expect(movement.type).toBe('purchase');
    expect(movement.qty).toBe(20);
    expect(movement.batch_id).toBe(item.batch_id);

    // 3. فحص تحديث سعر البيع في الصنف إلى 6500
    const variant = db.prepare('SELECT sale_price FROM product_variants WHERE id = ?').get(variantId) as {
      sale_price: number;
    };
    expect(variant.sale_price).toBe(6500);

    // 4. فحص رصيد المورد الآجل (المتبقي 40000)
    const supplier = db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(supplierId) as {
      balance: number;
    };
    expect(supplier.balance).toBe(40000);
  });

  test('إنشاء مرتجع شراء: خصم المخزون وتخفيض رصيد المورد ومنع تجاوز الكمية', async () => {
    // 1. إنشاء فاتورة شراء بكمية 10
    const purchase = await purchasesService.create({
      supplier_id: supplierId,
      items: [
        {
          variant_id: variantId,
          qty: 10,
          unit_cost: 3000,
        },
      ],
      paid: 0, // آجل بالكامل (رصيد المورد يرتفع 30000)
      user_id: userId,
    });

    const purchaseItemId = purchase.items![0].id;
    const batchId = purchase.items![0].batch_id!;

    // 2. إرجاع 4 قطع للمورد
    const ret = await purchasesService.createReturn({
      purchaseId: purchase.id,
      items: [{ purchaseItemId, qty: 4 }],
      userId,
      note: 'بضاعة غير مطابقة للمواصفات',
    });

    expect(ret.id).toBeDefined();
    expect(ret.total_refund).toBe(12000); // 4 * 3000

    // 3. فحص انخفاض رصيد الدفعة بالمخزون (10 - 4 = 6)
    const batch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(batchId) as {
      qty_remaining: number;
    };
    expect(batch.qty_remaining).toBe(6);

    // 4. فحص انخفاض رصيد المورد (30000 - 12000 = 18000)
    const supplier = db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(supplierId) as {
      balance: number;
    };
    expect(supplier.balance).toBe(18000);

    // 5. محاولة إرجاع كمية إضافية أكبر من المتبقي (متبقي 6 فإرجاع 7 يجب أن يفشل)
    await expect(
      purchasesService.createReturn({
        purchaseId: purchase.id,
        items: [{ purchaseItemId, qty: 7 }],
        userId,
      })
    ).rejects.toThrow('الكمية المرتجعة (7) تتجاوز الكمية المتبقية المسموح بإرجاعها (6)');
  });

  test('استعلام تاريخ التكلفة ومقارنة الأسعار بين الموردين', async () => {
    // إنشاء مورد ثانٍ
    const sup2Res = db
      .prepare("INSERT INTO suppliers (uuid, name, balance, is_active, created_at) VALUES ('SUP-2', 'مؤسسة النور', 0, 1, datetime('now'))")
      .run();
    const sup2Id = Number(sup2Res.lastInsertRowid);

    // شراء من المورد الأول بتكلفة 3000
    await purchasesService.create({
      supplier_id: supplierId,
      items: [{ variant_id: variantId, qty: 10, unit_cost: 3000 }],
      paid: 30000,
      user_id: userId,
    });

    // شراء من المورد الثاني بتكلفة 2800
    await purchasesService.create({
      supplier_id: sup2Id,
      items: [{ variant_id: variantId, qty: 15, unit_cost: 2800 }],
      paid: 42000,
      user_id: userId,
    });

    const history = await purchasesService.getCostHistory(variantId);
    expect(history.length).toBe(2);

    const comparison = await purchasesService.getCostComparison(variantId);
    expect(comparison.length).toBe(2);
    // الأرخص أولاً
    expect(comparison[0].supplier_name).toBe('مؤسسة النور');
    expect(comparison[0].min_cost).toBe(2800);
    expect(comparison[1].supplier_name).toBe('المورد الذهبي');
    expect(comparison[1].min_cost).toBe(3000);
  });
});
