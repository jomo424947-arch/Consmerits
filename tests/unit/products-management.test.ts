import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { ProductsService } from '../../src/main/services/products.service';
import { AuditService } from '../../src/main/services/audit.service';

describe('Products Management: Update, Delete, Audit & History', () => {
  let db: Database.Database;
  let auditService: AuditService;
  let productsService: ProductsService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    db.prepare(`
      INSERT INTO users (id, uuid, username, display_name, password_hash, role, is_active, created_at)
      VALUES (1, 'u-1', 'admin_test', 'المسؤول', 'hash', 'owner', 1, datetime('now'))
    `).run();

    auditService = new AuditService(db);
    productsService = new ProductsService(db, auditService);
  });

  afterEach(() => {
    db.close();
  });

  test('تعديل اسم المنتج وسعر البيع وتوثيق الفارق في سجل الرقابة وتاريخ الأسعار', async () => {
    // 1. إنشاء منتج أولي
    const categoryId = productsService.getOrCreateCategory('مكياج');
    const brandId = productsService.getOrCreateBrand('لوريال');
    const created = await productsService.createProduct(
      {
        name_ar: 'أحمر شفاه كلاسيك',
        category_id: categoryId,
        brand_id: brandId,
        variants: [
          {
            name: 'درجة 01',
            sale_price: 15000, // 150.00 ج.م
            min_stock: 5,
            barcodes: ['6221234567890'],
          },
        ],
      },
      1
    );

    expect(created.name_ar).toBe('أحمر شفاه كلاسيك');
    expect(created.variants[0].sale_price).toBe(15000);

    // 2. تعديل الاسم وسعر البيع
    const updated = await productsService.updateProduct(
      created.id,
      {
        name_ar: 'أحمر شفاه مات فائق الثبات',
        sale_price: 19500, // 195.00 ج.م
        price_change_reason: 'تعديل قائمة الأسعار الرسمية',
      },
      1
    );

    expect(updated.name_ar).toBe('أحمر شفاه مات فائق الثبات');
    expect(updated.variants[0].sale_price).toBe(19500);

    // 3. التحقق من تسجيل تاريخ الأسعار (Price History)
    const history = productsService.getProductPriceHistory(created.id);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].old_price).toBe(15000);
    expect(history[0].new_price).toBe(19500);
    expect(history[0].reason).toBe('تعديل قائمة الأسعار الرسمية');

    // 4. التحقق من توثيق العملية في سجل الرقابة (Audit Logs)
    const { logs: auditLogs } = auditService.listLogs({ entityType: 'products' });
    const priceChangeLog = auditLogs.find((l) => l.action === 'PRODUCT_PRICE_CHANGED');
    expect(priceChangeLog).toBeDefined();
    expect((priceChangeLog?.details as any).old_price).toBe(15000);
    expect((priceChangeLog?.details as any).new_price).toBe(19500);
  });

  test('حذف نهائي (Hard Delete) لمنتج جديد لم تجرَ عليه أي حركات مبيعات أو مخزون', async () => {
    const created = await productsService.createProduct(
      {
        name_ar: 'منتج تجريبي قابل للحذف',
        variants: [
          {
            name: 'افتراضي',
            sale_price: 5000,
            barcodes: ['6229999999999'],
          },
        ],
      },
      1
    );

    const deleteResult = await productsService.deleteProduct(created.id, 1);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.action).toBe('deleted');

    // التأكد من عدم وجوده في قاعدة البيانات
    const found = db.prepare('SELECT id FROM products WHERE id = ?').get(created.id);
    expect(found).toBeUndefined();
  });

  test('الحذف الآمن بالأرشفة (Soft Delete) عند وجود مبيعات سابقة للمنتج', async () => {
    // 1. إنشاء منتج ومستخدم ووردية وفاتورة بيع
    const created = await productsService.createProduct(
      {
        name_ar: 'عطر فرنسي فاخر',
        variants: [
          {
            name: '100ml',
            sale_price: 80000,
            initial_stock: 10,
          },
        ],
      },
      1
    );

    const variantId = created.variants[0].id;

    // تسجيل مبيعات سابقة على الصنف
    db.prepare(`
      INSERT INTO shifts (uuid, user_id, opening_balance, status, opened_at)
      VALUES ('shift-uuid-1', 1, 100000, 'open', datetime('now'))
    `).run();

    const saleRes = db.prepare(`
      INSERT INTO sales (uuid, seq_no, invoice_no, user_id, shift_id, subtotal, discount_amount, tax_amount, total, status, created_at)
      VALUES ('sale-uuid-1', 1, 'INV-0001', 1, 1, 80000, 0, 0, 80000, 'completed', datetime('now'))
    `).run();
    const saleId = Number(saleRes.lastInsertRowid);

    // جلب الدفعة المرتبطة
    const batch = db.prepare('SELECT id FROM batches WHERE variant_id = ?').get(variantId) as { id: number };

    db.prepare(`
      INSERT INTO sale_items (sale_id, variant_id, batch_id, product_name, variant_name, qty, unit_price, unit_cost, discount_amount, line_total)
      VALUES (?, ?, ?, 'عطر فرنسي فاخر', '100ml', 1, 80000, 50000, 0, 80000)
    `).run(saleId, variantId, batch.id);

    // 2. محاولة حذف المنتج
    const deleteResult = await productsService.deleteProduct(created.id, 1);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.action).toBe('archived');

    // التأكد من أن المنتج لا زال موجوداً في الجدول لحماية الفاتورة السابقة ولكن بحالة مؤرشف (is_active = 0)
    const productInDb = db.prepare('SELECT is_active FROM products WHERE id = ?').get(created.id) as { is_active: number };
    expect(productInDb.is_active).toBe(0);
  });
});
