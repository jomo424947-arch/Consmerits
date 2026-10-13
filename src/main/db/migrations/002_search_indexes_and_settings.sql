-- Migration 002: فهارس البحث وإعدادات البيع والباركود الداخلي
-- تاريخ الإنشاء: 2026-10-12

-- 1. فهارس البحث النصي والـ SKU لتسريع البحث في شاشة البيع وشاشة المنتجات
CREATE INDEX IF NOT EXISTS idx_products_name_ar ON products(name_ar);
CREATE INDEX IF NOT EXISTS idx_products_name_en ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

-- 2. عداد الباركود الداخلي التلقائي (EAN-13 يبدأ بـ 200)
INSERT OR IGNORE INTO counters (name, value) VALUES ('internal_barcode_seq', 0);

-- 3. إعدادات نقطة البيع والطباعة التلقائية
-- allow_zero_stock_sale: '0' = منع البيع عند رصيد صفر، '1' = تحذير والسماح
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('allow_zero_stock_sale', '0', datetime('now'));
-- auto_print_receipt: '1' = طباعة تلقائية بعد إتمام الدفع، '0' = يدوي
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('auto_print_receipt', '1', datetime('now'));
