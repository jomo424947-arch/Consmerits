-- ============================================================================
-- Migration 001: Initial Database Schema for Cosmetics POS & Inventory System
-- معمارية قاعدة البيانات الشاملة لنظام نقطة البيع والمخزون لمحل مستحضرات التجميل
-- متوافقة 100% مع وثيقة التصميم (docs/01-قاعدة-البيانات.md) وقواعد النزاهة
-- ============================================================================

-- 1. تتبع إصدارات مخطط قاعدة البيانات
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- 2. إعدادات النظام العامة
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. العدادات التسلسلية (لترقيم الفواتير بلا فجوات)
CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
);

-- 4. المستخدمون والمصادقة والصلاحيات
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    pin_hash TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 5. التصنيفات الرئيسية
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 6. الماركات والبراندات التجارية
CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 7. العملاء وحسابات الآجل
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    credit_limit INTEGER NOT NULL DEFAULT 0, -- بالقروش
    balance INTEGER NOT NULL DEFAULT 0,      -- رصيد مدين بالقروش
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 8. الموردون وحسابات التوريد
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    balance INTEGER NOT NULL DEFAULT 0,      -- رصيد المورد بالقروش
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 9. المنتجات الرئيسية
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    category_id INTEGER REFERENCES categories(id),
    brand_id INTEGER REFERENCES brands(id),
    unit TEXT NOT NULL DEFAULT 'قطعة',
    image_path TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 10. درجات وأحجام المنتجات (Product Variants)
CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    name TEXT,                                            -- درجة اللون أو الحجم
    sku TEXT UNIQUE,
    sale_price INTEGER NOT NULL CHECK (sale_price >= 0),  -- بالقروش
    min_stock INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- 11. باركودات المنتجات (فريدة عالمياً)
CREATE TABLE IF NOT EXISTS product_barcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    barcode TEXT NOT NULL UNIQUE,                         -- باركود دولي أو محلي فريد
    is_internal INTEGER NOT NULL DEFAULT 0
);

-- 12. دفعات التوريد وتواريخ الصلاحية (Batches)
CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    batch_no TEXT,
    expiry_date TEXT,                                     -- YYYY-MM-DD
    unit_cost INTEGER NOT NULL CHECK (unit_cost >= 0),    -- بالقروش
    qty_remaining INTEGER NOT NULL CHECK (qty_remaining >= 0), -- لا يسمح بأي رصيد سالب
    received_at TEXT NOT NULL
);

-- 13. ورديات الكاشير
CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    opening_balance INTEGER NOT NULL,                     -- بالقروش
    closing_balance INTEGER,                              -- العد الأعمى بالقروش
    expected_balance INTEGER,                             -- المحسوب تلقائياً بالقروش
    difference INTEGER,                                   -- الفارق بالقروش
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    notes TEXT
);

-- 14. فواتير المبيعات
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    seq_no INTEGER NOT NULL UNIQUE,                       -- ترقيم تسلسلي مستمر بلا فجوات
    invoice_no TEXT NOT NULL UNIQUE,                      -- كود الفاتورة المنسق للعرض والطباعة
    user_id INTEGER NOT NULL REFERENCES users(id),
    shift_id INTEGER NOT NULL REFERENCES shifts(id),
    customer_id INTEGER REFERENCES customers(id),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),      -- الإجمالي قبل الخصم والضريبة بالقروش
    discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0), -- الخصم بالقروش
    tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),           -- الضريبة بالقروش
    total INTEGER NOT NULL CHECK (total >= 0),            -- الصافي النهائي بالقروش
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'held')),
    void_reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
);

-- 15. بنود الفاتورة (Snapshot وقت البيع)
CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    batch_id INTEGER NOT NULL REFERENCES batches(id),
    product_name TEXT NOT NULL,                           -- اسم المنتج لقطة وقت البيع
    variant_name TEXT,                                    -- درجة اللون/المقاس وقت البيع
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),  -- سعر البيع بالقروش (Snapshot)
    unit_cost INTEGER NOT NULL CHECK (unit_cost >= 0),    -- تكلفة الشراء بالقروش (Snapshot)
    discount_amount INTEGER NOT NULL DEFAULT 0,           -- الخصم على البند بالقروش
    line_total INTEGER NOT NULL                           -- إجمالي السطر بالقروش
);

-- 16. مدفوعات الفاتورة
CREATE TABLE IF NOT EXISTS sale_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'wallet', 'credit')),
    amount INTEGER NOT NULL CHECK (amount > 0)            -- المبلغ المدفوع بالقروش
);

-- 17. الفواتير المعلقة (Held Sales)
CREATE TABLE IF NOT EXISTS held_sales (
    id TEXT PRIMARY KEY,                                  -- UUID
    hold_no INTEGER NOT NULL,
    payload TEXT NOT NULL,                                -- JSON يضم محتويات السلة والعميل
    created_at TEXT NOT NULL
);

-- 18. حركات المخزون (سجل تتبعي Append-Only)
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES batches(id),
    type TEXT NOT NULL CHECK (type IN
        ('purchase', 'sale', 'sale_return', 'purchase_return',
         'adjust_in', 'adjust_out', 'expired', 'tester')),
    qty INTEGER NOT NULL CHECK (qty <> 0),                -- + دخول, - خروج
    ref_type TEXT,
    ref_id INTEGER,
    user_id INTEGER NOT NULL REFERENCES users(id),
    note TEXT,
    created_at TEXT NOT NULL
);

-- 19. فواتير المشتريات والتوريد
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    invoice_no TEXT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    total INTEGER NOT NULL CHECK (total >= 0),            -- إجمالي الفاتورة بالقروش
    paid INTEGER NOT NULL DEFAULT 0 CHECK (paid >= 0),    -- المدفوع بالقروش
    payment_method TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    note TEXT,
    created_at TEXT NOT NULL
);

-- 20. بنود فواتير المشتريات
CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    batch_id INTEGER REFERENCES batches(id),
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_cost INTEGER NOT NULL CHECK (unit_cost >= 0),    -- تكلفة الشراء للقطعة بالقروش
    expiry_date TEXT,                                     -- YYYY-MM-DD
    suggested_price INTEGER                               -- سعر البيع المقترح بالقروش
);

-- 21. فواتير المرتجعات
CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    total_refund INTEGER NOT NULL CHECK (total_refund >= 0), -- إجمالي المسترجع بالقروش
    refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'credit', 'exchange')),
    reason TEXT,
    created_at TEXT NOT NULL
);

-- 22. بنود المرتجعات
CREATE TABLE IF NOT EXISTS return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL REFERENCES returns(id),
    sale_item_id INTEGER NOT NULL REFERENCES sale_items(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    qty INTEGER NOT NULL CHECK (qty > 0),
    condition TEXT NOT NULL CHECK (condition IN ('good', 'damaged')), -- good = يعود للمخزون, damaged = هالك
    batch_id INTEGER REFERENCES batches(id)
);

-- 23. حركات الخزنة النقدية
CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL REFERENCES shifts(id),
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('sale', 'refund', 'expense', 'deposit', 'withdrawal')),
    amount INTEGER NOT NULL,                              -- بالقروش (+ إيداع/بيع, - سحب/مصروف)
    ref_type TEXT,
    ref_id INTEGER,
    note TEXT,
    created_at TEXT NOT NULL
);

-- 24. المصروفات النثرية والتشغيلية
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    shift_id INTEGER NOT NULL REFERENCES shifts(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),           -- بالقروش
    note TEXT,
    created_at TEXT NOT NULL
);

-- 25. سجل الرقابة والتدقيق الأمني (Audit Log - Append-Only)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,                                         -- بيانات JSON
    created_at TEXT NOT NULL
);

-- ============================================================================
-- الفهارس لتسريع الاستعلامات والبحث اللحظي (Indexes)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_barcode ON product_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_variant ON product_barcodes(variant_id);
CREATE INDEX IF NOT EXISTS idx_batches_variant_expiry ON batches(variant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_variant_qty ON batches(variant_id, qty_remaining);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_seq_no ON sales(seq_no);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant ON sale_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON cash_movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- مشغلات الحماية والنزاهة الفائقة (Triggers)
-- ============================================================================

-- 1) القلب النابض للمخزون: تحديث كمية الدفعة المتبقية تلقائياً عند أي حركة مخزون
-- وفي حال أصبح الرصيد سالباً، يفشل قيد batches.qty_remaining >= 0 ويتم التراجع الكامل (Rollback)
CREATE TRIGGER IF NOT EXISTS trg_movement_apply
AFTER INSERT ON stock_movements
BEGIN
    UPDATE batches
    SET qty_remaining = qty_remaining + NEW.qty
    WHERE id = NEW.batch_id;
END;

-- 2) المخزون Append-Only: منع تعديل أي حركة مسجلة نهائياً
CREATE TRIGGER IF NOT EXISTS trg_movement_no_update
BEFORE UPDATE ON stock_movements
BEGIN
    SELECT RAISE(ABORT, 'stock_movements is append-only');
END;

-- 3) المخزون Append-Only: منع حذف أي حركة مسجلة نهائياً
CREATE TRIGGER IF NOT EXISTS trg_movement_no_delete
BEFORE DELETE ON stock_movements
BEGIN
    SELECT RAISE(ABORT, 'stock_movements is append-only');
END;

-- 4) النزاهة المالية: منع تعديل الفاتورة المكتملة (التصحيح فقط عبر مرتجع)
CREATE TRIGGER IF NOT EXISTS trg_prevent_completed_sale_update
BEFORE UPDATE ON sales
WHEN OLD.status = 'completed' AND NEW.status NOT IN ('voided')
BEGIN
    SELECT RAISE(ABORT, 'فواتير البيع المكتملة غير قابلة للتعديل');
END;

-- 5) منع التعديل على أي فاتورة تم إلغاؤها سابقاً
CREATE TRIGGER IF NOT EXISTS trg_prevent_voided_sale_update
BEFORE UPDATE ON sales
WHEN OLD.status = 'voided'
BEGIN
    SELECT RAISE(ABORT, 'لا يمكن تعديل فاتورة ملغاة');
END;

-- 6) منع حذف أي فاتورة بيع نهائياً
CREATE TRIGGER IF NOT EXISTS trg_prevent_sale_delete
BEFORE DELETE ON sales
BEGIN
    SELECT RAISE(ABORT, 'فواتير البيع غير قابلة للحذف نهائياً');
END;

-- 7) سجل التدقيق الأمني Append-Only: منع تعديل سجل الرقابة
CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_update
BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

-- 8) سجل التدقيق الأمني Append-Only: منع حذف أي حدث رقابي
CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_delete
BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

-- ============================================================================
-- البيانات الأولية الأساسية (Initial Seed Data)
-- ============================================================================

-- عداد أرقام فواتير المبيعات
INSERT OR IGNORE INTO counters (name, value) VALUES ('sale_seq', 0);

-- الإعدادات الافتراضية للنظام
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
    ('store_name', 'محل مستحضرات التجميل', datetime('now')),
    ('currency', 'ج.م', datetime('now')),
    ('tax_rate', '0', datetime('now')),
    ('receipt_header', 'أهلاً بكم في متجرنا', datetime('now')),
    ('receipt_footer', 'شكراً لزيارتكم ونسعد بخدمتكم دائماً', datetime('now')),
    ('receipt_width_mm', '80', datetime('now')),
    ('max_cashier_discount', '5', datetime('now')),
    ('expiry_alert_days', '30,60,90', datetime('now')),
    ('auto_backup_enabled', '1', datetime('now')),
    ('backup_interval_hours', '24', datetime('now'));
