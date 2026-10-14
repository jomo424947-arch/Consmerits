import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { runMigrations } from '../../src/main/db/migrator';
import { DbInspectorService } from '../../src/main/services/db-inspector.service';

describe('DbInspectorService (خدمة فحص واستعراض قواعد البيانات)', () => {
  let tempDir: string;
  let tempDbPath: string;
  let service: DbInspectorService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmetics-inspector-test-'));
    tempDbPath = path.join(tempDir, 'test_store.db');

    // إنشاء قاعدة بيانات حقيقية وإدخال بيانات نموذجية
    const db = new Database(tempDbPath);
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    // 1. إعدادات المتجر
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('store_name', 'بوتيك جوري تيست', datetime('now'))").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('store_phone', '01099998888', datetime('now'))").run();

    // 2. مستخدمين
    db.prepare(`
      INSERT INTO users (uuid, username, display_name, password_hash, pin_hash, role, is_active, created_at)
      VALUES ('u1', 'owner_test', 'أحمد المالك', 'hash', 'pinhash', 'owner', 1, '2026-01-01')
    `).run();
    db.prepare(`
      INSERT INTO users (uuid, username, display_name, password_hash, pin_hash, role, is_active, created_at)
      VALUES ('u2', 'cashier_mona', 'منى كاشير', 'hash', NULL, 'cashier', 1, '2026-01-02')
    `).run();

    // 3. عملاء وموردين (أرقام الهواتف والمديونيات)
    db.prepare(`
      INSERT INTO customers (uuid, name, phone, credit_limit, balance, notes, is_active, created_at)
      VALUES ('c1', 'سارة محمد', '01122334455', 50000, 15000, 'عميلة مميزة', 1, '2026-01-03')
    `).run();
    db.prepare(`
      INSERT INTO suppliers (uuid, name, phone, address, balance, is_active, created_at)
      VALUES ('s1', 'شركة لوريال مصر', '01234567890', 'مدينة نصر', 25000, 1, '2026-01-04')
    `).run();

    // 4. تصنيف ومنتج ومخزون
    db.prepare(`INSERT INTO categories (uuid, name, is_active, created_at) VALUES ('cat1', 'عناية بالبشرة', 1, '2026-01-01')`).run();
    db.prepare(`
      INSERT INTO products (uuid, name_ar, name_en, category_id, unit, is_active, created_at, updated_at)
      VALUES ('p1', 'سيروم فيتامين سي', 'Vitamin C Serum', 1, 'قطعة', 1, '2026-01-01', '2026-01-01')
    `).run();
    db.prepare(`
      INSERT INTO product_variants (uuid, product_id, name, sale_price, min_stock, is_active)
      VALUES ('pv1', 1, '30ml', 35000, 5, 1)
    `).run();
    db.prepare(`
      INSERT INTO product_barcodes (variant_id, barcode, is_internal)
      VALUES (1, '6221122334455', 0)
    `).run();
    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (1, 'BATCH001', '2027-12-31', 20000, 20, '2026-01-01')
    `).run();

    // 5. وردية وفاتورة مبيعات
    db.prepare(`
      INSERT INTO shifts (uuid, user_id, opening_balance, closing_balance, expected_balance, difference, status, opened_at, closed_at)
      VALUES ('sh1', 2, 50000, 70000, 70000, 0, 'closed', '2026-01-05 10:00:00', '2026-01-05 22:00:00')
    `).run();
    db.prepare(`
      INSERT INTO sales (uuid, seq_no, invoice_no, user_id, shift_id, customer_id, subtotal, discount_amount, tax_amount, total, status, created_at)
      VALUES ('sale1', 1, 'INV-2026-0001', 2, 1, 1, 35000, 5000, 0, 30000, 'completed', '2026-01-05 14:30:00')
    `).run();
    db.prepare(`
      INSERT INTO sale_items (sale_id, variant_id, batch_id, product_name, variant_name, qty, unit_price, unit_cost, discount_amount, line_total)
      VALUES (1, 1, 1, 'سيروم فيتامين سي', '30ml', 1, 35000, 20000, 5000, 30000)
    `).run();
    db.prepare(`
      INSERT INTO sale_payments (sale_id, method, amount)
      VALUES (1, 'cash', 30000)
    `).run();

    // 6. سجل الرقابة
    db.prepare(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, created_at)
      VALUES (1, 'USER_CREATED', 'user', 2, '{"username":"cashier_mona"}', '2026-01-02')
    `).run();

    db.close();
    service = new DbInspectorService();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('فحص ملف قاعدة البيانات واستخراج بيانات السلامة والـ Metadata بدقة', () => {
    const result = service.inspectDatabase(tempDbPath);

    expect(result.meta.fileName).toBe('test_store.db');
    expect(result.meta.integrityOk).toBe(true);
    expect(result.meta.storeName).toBe('بوتيك جوري تيست');
    expect(result.meta.storePhone).toBe('01099998888');
    expect(result.meta.fileSizeBytes).toBeGreaterThan(0);
    expect(result.meta.fileSizeFormatted).toBeDefined();
  });

  test('استخراج قائمة المستخدمين والمسجلين مع الأدوار وحالة الـ PIN (مين مسجل؟)', () => {
    const result = service.inspectDatabase(tempDbPath);

    expect(result.users.length).toBe(2);
    const owner = result.users.find((u) => u.username === 'owner_test');
    expect(owner).toBeDefined();
    expect(owner?.displayName).toBe('أحمد المالك');
    expect(owner?.role).toBe('owner');
    expect(owner?.roleArabic).toBe('مالك النظام');
    expect(owner?.hasPin).toBe(true);

    const cashier = result.users.find((u) => u.username === 'cashier_mona');
    expect(cashier).toBeDefined();
    expect(cashier?.roleArabic).toBe('كاشير مبيعات');
    expect(cashier?.hasPin).toBe(false);
  });

  test('استخراج دليل الأرقام والتواصل (العملاء والموردين وأرقامهم ومديونياتهم)', () => {
    const result = service.inspectDatabase(tempDbPath);

    expect(result.contacts.length).toBeGreaterThanOrEqual(2);

    const customer = result.contacts.find((c) => c.name === 'سارة محمد');
    expect(customer).toBeDefined();
    expect(customer?.phone).toBe('01122334455');
    expect(customer?.type).toBe('عميل');
    expect(customer?.balanceEgp).toBe(150); // 15000 قروش = 150 ج.م

    const supplier = result.contacts.find((c) => c.name === 'شركة لوريال مصر');
    expect(supplier).toBeDefined();
    expect(supplier?.phone).toBe('01234567890');
    expect(supplier?.type).toBe('مورد');
    expect(supplier?.address).toBe('مدينة نصر');
  });

  test('استخراج جميع العمليات وفواتير المبيعات مع بنودها والكاشير', () => {
    const result = service.inspectDatabase(tempDbPath);

    expect(result.sales.length).toBe(1);
    const sale = result.sales[0];
    expect(sale.invoiceNo).toBe('INV-2026-0001');
    expect(sale.cashierName).toBe('منى كاشير');
    expect(sale.customerName).toBe('سارة محمد');
    expect(sale.customerPhone).toBe('01122334455');
    expect(sale.subtotalEgp).toBe(350);
    expect(sale.discountEgp).toBe(50);
    expect(sale.totalEgp).toBe(300);
    expect(sale.paymentMethod).toContain('نقدي');
    expect(sale.items.length).toBe(1);
    expect(sale.items[0].productName).toBe('سيروم فيتامين سي');
    expect(sale.items[0].qty).toBe(1);
  });

  test('استخراج الكتالوج والمخزون والورديات وسجلات الرقابة', () => {
    const result = service.inspectDatabase(tempDbPath);

    expect(result.products.length).toBe(1);
    expect(result.products[0].nameAr).toBe('سيروم فيتامين سي');
    expect(result.products[0].barcodes).toContain('6221122334455');
    expect(result.products[0].currentStock).toBe(20);

    expect(result.shifts.length).toBe(1);
    expect(result.shifts[0].cashierName).toBe('منى كاشير');
    expect(result.shifts[0].differenceEgp).toBe(0);

    expect(result.auditLogs.length).toBe(1);
    expect(result.auditLogs[0].action).toBe('USER_CREATED');

    // التحقق من حساب الـ KPIs
    expect(result.kpis.totalUsers).toBe(2);
    expect(result.kpis.totalSalesCount).toBe(1);
    expect(result.kpis.totalRevenueEgp).toBe(300);
    expect(result.kpis.totalProducts).toBe(1);
    expect(result.kpis.totalStockQty).toBe(20);
  });

  test('رمي خطأ واضح باللغة العربية إذا كان مسار الملف غير موجود', () => {
    expect(() => {
      service.inspectDatabase(path.join(tempDir, 'non_existent.db'));
    }).toThrow('ملف قاعدة البيانات غير موجود في المسار');
  });
});
