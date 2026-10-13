import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { InventoryService } from '../../src/main/services/inventory.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('InventoryService', () => {
  let db: Database.Database;
  let inventoryService: InventoryService;
  let authService: AuthService;
  let userId: number;
  let variantId: number;
  let categoryId: number;
  let brandId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    inventoryService = new InventoryService(db);
    authService = new AuthService(db);

    const user = authService.createUser({
      username: 'inv_admin',
      display_name: 'مدير المخزون',
      password: 'password',
      pin: '1234',
      role: USER_ROLES.MANAGER,
    });
    userId = user.id;

    // إعداد قسم وماركة ومنتج وصنف
    const catRes = db
      .prepare("INSERT INTO categories (uuid, name, created_at) VALUES ('CAT-1', 'مستحضرات عناية', datetime('now'))")
      .run();
    categoryId = Number(catRes.lastInsertRowid);

    const brandRes = db
      .prepare("INSERT INTO brands (uuid, name, created_at) VALUES ('BR-1', 'سيراميك بلس', datetime('now'))")
      .run();
    brandId = Number(brandRes.lastInsertRowid);

    const prodRes = db
      .prepare(
        "INSERT INTO products (uuid, category_id, brand_id, name_ar, created_at, updated_at) VALUES ('PROD-1', ?, ?, 'سيروم هيالورونيك', datetime('now'), datetime('now'))"
      )
      .run(categoryId, brandId);
    const prodId = Number(prodRes.lastInsertRowid);

    const varRes = db
      .prepare(`
        INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
        VALUES ('VAR-1', ?, '30ml', 'SKU-SERUM-30', 8000, 5)
      `)
      .run(prodId);
    variantId = Number(varRes.lastInsertRowid);
  });

  afterEach(() => {
    db.close();
  });

  test('تطبيق خوارزمية FEFO بدقة: السحب من الدفعة الأقرب انتهاءً أولاً ثم الأبعد', async () => {
    // إدخال دفعتين: الأولى تنتهي بعد 30 يوم، الثانية بعد 90 يوم
    const res1 = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-A', date('now', '+30 days'), 5000, 10, datetime('now'))
      `)
      .run(variantId);
    const batch1Id = Number(res1.lastInsertRowid);

    const res2 = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-B', date('now', '+90 days'), 5200, 15, datetime('now'))
      `)
      .run(variantId);
    const batch2Id = Number(res2.lastInsertRowid);

    // طلب كمية 12 (يجب أن تأخذ 10 كاملة من BATCH-A و 2 من BATCH-B)
    const allocations = inventoryService.allocateBatchesFEFO(variantId, 12, false, db);

    expect(allocations.length).toBe(2);
    expect(allocations[0].batchId).toBe(batch1Id);
    expect(allocations[0].qty).toBe(10);
    expect(allocations[1].batchId).toBe(batch2Id);
    expect(allocations[1].qty).toBe(2);
  });

  test('رمي خطأ عند طلب كمية تفوق الرصيد المتاح في المخزون', () => {
    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'BATCH-SMALL', date('now', '+60 days'), 5000, 3, datetime('now'))
    `).run(variantId);

    expect(() => {
      inventoryService.allocateBatchesFEFO(variantId, 10, false, db);
    }).toThrow('الكمية المطلوبة (10) غير متوفرة في المخزون');
  });

  test('تسجيل حركة مخزون معيارية وتحديث رصيد الدفعة تلقائياً عبر الـ Trigger', async () => {
    const res = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-TEST', date('now', '+60 days'), 4000, 20, datetime('now'))
      `)
      .run(variantId);
    const batchId = Number(res.lastInsertRowid);

    // تسجيل حركة خروج 5
    const movementId = await inventoryService.recordMovement({
      batchId,
      type: 'adjust_out',
      qty: -5,
      userId,
      note: 'فحص دوري',
    });

    expect(movementId).toBeGreaterThan(0);

    // التحقق من أن Trigger قام بتخفيض qty_remaining إلى 15
    const updatedBatch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(batchId) as {
      qty_remaining: number;
    };
    expect(updatedBatch.qty_remaining).toBe(15);

    // التحقق من جلب الحركات مع التفاصيل
    const history = await inventoryService.getStockMovements({ batchId });
    expect(history.total).toBe(1);
    expect(history.movements[0].type).toBe('adjust_out');
    expect(history.movements[0].qty).toBe(-5);
    expect(history.movements[0].product_name).toBe('سيروم هيالورونيك');
  });

  test('تسجيل إهلاك منتهي الصلاحية وتسجيل تستر بنجاح', async () => {
    const res = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-DEMO', date('now', '-5 days'), 4000, 10, datetime('now'))
      `)
      .run(variantId);
    const batchId = Number(res.lastInsertRowid);

    // إهلاك 3
    await inventoryService.markExpired(batchId, 3, userId, 'تالف منتهي');

    let batch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(batchId) as {
      qty_remaining: number;
    };
    expect(batch.qty_remaining).toBe(7);

    // تسجيل تستر 2
    await inventoryService.markTester(batchId, 2, userId, 'عينة للعرض');

    batch = db.prepare('SELECT qty_remaining FROM batches WHERE id = ?').get(batchId) as {
      qty_remaining: number;
    };
    expect(batch.qty_remaining).toBe(5);
  });

  test('حساب تقييم المخزون الإجمالي وبالأقسام وبالعلامات التجارية بدقة', async () => {
    // إضافة دفعة للصنف: 10 قطع، تكلفة 5000 (50 ج.م)، سعر بيع الصنف 8000 (80 ج.م)
    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'BATCH-VAL', date('now', '+60 days'), 5000, 10, datetime('now'))
    `).run(variantId);

    const val = await inventoryService.getValuation('category');

    expect(val.total_cost_value).toBe(50000); // 10 * 5000
    expect(val.total_sale_value).toBe(80000); // 10 * 8000
    expect(val.expected_profit).toBe(30000); // 80000 - 50000
    expect(val.total_items_count).toBe(10);

    expect(val.by_category).toBeDefined();
    expect(val.by_category?.length).toBe(1);
    expect(val.by_category?.[0].category_name).toBe('مستحضرات عناية');
    expect(val.by_category?.[0].cost_value).toBe(50000);
  });
});
