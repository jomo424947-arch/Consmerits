import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { InventoryService } from '../../src/main/services/inventory.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('Stocktaking (الجرد الفعلي والتسوية)', () => {
  let db: Database.Database;
  let inventoryService: InventoryService;
  let authService: AuthService;
  let adminId: number;
  let variant1Id: number;
  let variant2Id: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    inventoryService = new InventoryService(db);
    authService = new AuthService(db);

    const admin = authService.createUser({
      username: 'test_admin',
      display_name: 'مدير المتجر',
      password: 'password',
      pin: '7788',
      role: USER_ROLES.OWNER,
    });
    adminId = admin.id;

    // تجهيز قسم ومنتجات
    const catRes = db
      .prepare("INSERT INTO categories (uuid, name, created_at) VALUES ('CAT-MK', 'مكياج', datetime('now'))")
      .run();
    const catId = Number(catRes.lastInsertRowid);

    const p1 = db
      .prepare(
        "INSERT INTO products (uuid, category_id, name_ar, created_at, updated_at) VALUES ('P1', ?, 'روج كلاسيك', datetime('now'), datetime('now'))"
      )
      .run(catId);
    const p2 = db
      .prepare(
        "INSERT INTO products (uuid, category_id, name_ar, created_at, updated_at) VALUES ('P2', ?, 'ماسكارا ضد الماء', datetime('now'), datetime('now'))"
      )
      .run(catId);

    const v1 = db
      .prepare(`
        INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
        VALUES ('VAR-1', ?, 'Red 01', 'SKU-LIP-RED', 6000, 5)
      `)
      .run(Number(p1.lastInsertRowid));
    variant1Id = Number(v1.lastInsertRowid);

    const v2 = db
      .prepare(`
        INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
        VALUES ('VAR-2', ?, 'Black', 'SKU-MASC-BLK', 8000, 5)
      `)
      .run(Number(p2.lastInsertRowid));
    variant2Id = Number(v2.lastInsertRowid);

    // إضافة أرصدة ابتدائية: variant1 له 10 قطع، variant2 له 20 قطعة
    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'BATCH-V1', date('now', '+120 days'), 3000, 10, datetime('now'))
    `).run(variant1Id);

    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'BATCH-V2', date('now', '+120 days'), 4000, 20, datetime('now'))
    `).run(variant2Id);
  });

  afterEach(() => {
    db.close();
  });

  test('دورة الجرد المتكاملة: إنشاء الدورة -> إدخال العد الفعلي -> الاعتماد -> تطبيق التسويات المخزنية بدقة', async () => {
    // 1. إنشاء دورة جرد شاملة (all)
    const stockCount = await inventoryService.createStockCount({
      scope: 'all',
      userId: adminId,
    });

    expect(stockCount.id).toBeDefined();
    expect(stockCount.status).toBe('in_progress');

    // فحص بنود الجرد وتطابق رصيد النظام الابتدائي
    const countData = await inventoryService.getStockCountById(stockCount.id);
    expect(countData.items.length).toBe(2);

    const item1 = countData.items.find((i) => i.variant_id === variant1Id);
    const item2 = countData.items.find((i) => i.variant_id === variant2Id);

    expect(item1?.system_qty).toBe(10);
    expect(item2?.system_qty).toBe(20);

    // 2. إدخال العد الفعلي:
    // الصنف الأول: وجدنا 12 قطعة (زيادة 2)
    // الصنف الثاني: وجدنا 17 قطعة (عجز 3)
    await inventoryService.submitCount(
      stockCount.id,
      [
        { variantId: variant1Id, countedQty: 12, note: 'تم العثور على عبوتين إضافيتين' },
        { variantId: variant2Id, countedQty: 17, note: 'عجز 3 عبوات' },
      ],
      adminId
    );

    // التأكد من تحول الحالة إلى 'reviewed' وحساب الفروقات
    const reviewedData = await inventoryService.getStockCountById(stockCount.id);
    expect(reviewedData.count.status).toBe('reviewed');

    const revItem1 = reviewedData.items.find((i) => i.variant_id === variant1Id);
    const revItem2 = reviewedData.items.find((i) => i.variant_id === variant2Id);

    expect(revItem1?.difference).toBe(2);
    expect(revItem2?.difference).toBe(-3);

    // 3. اعتماد دورة الجرد من قبل المدير
    await inventoryService.approveCount(stockCount.id, adminId);

    const approvedData = await inventoryService.getStockCountById(stockCount.id);
    expect(approvedData.count.status).toBe('approved');
    expect(approvedData.count.approved_by).toBe(adminId);
    expect(approvedData.count.completed_at).toBeDefined();

    // 4. فحص الأرصدة الفعلية بعد التسوية في المخزون
    const v1Stock = await inventoryService.getVariantStock(variant1Id);
    const v2Stock = await inventoryService.getVariantStock(variant2Id);

    expect(v1Stock.total_qty).toBe(12); // زاد من 10 إلى 12
    expect(v2Stock.total_qty).toBe(17); // نقص من 20 إلى 17

    // 5. فحص حركات المخزون المسجلة كمرجع لدورة الجرد
    const { movements } = await inventoryService.getStockMovements();
    const adjustIn = movements.find((m) => m.type === 'adjust_in' && m.ref_id === stockCount.id);
    const adjustOut = movements.find((m) => m.type === 'adjust_out' && m.ref_id === stockCount.id);

    expect(adjustIn).toBeDefined();
    expect(adjustIn?.qty).toBe(2);

    expect(adjustOut).toBeDefined();
    expect(adjustOut?.qty).toBe(-3);
  });

  test('إلغاء دورة الجرد لا يطبق أي تسويات مخزنية على الأرصدة', async () => {
    const stockCount = await inventoryService.createStockCount({
      scope: 'all',
      userId: adminId,
    });

    await inventoryService.cancelCount(stockCount.id, adminId);

    const cancelledData = await inventoryService.getStockCountById(stockCount.id);
    expect(cancelledData.count.status).toBe('cancelled');

    // الرصيد لم يتغير
    const v1Stock = await inventoryService.getVariantStock(variant1Id);
    expect(v1Stock.total_qty).toBe(10);
  });
});
