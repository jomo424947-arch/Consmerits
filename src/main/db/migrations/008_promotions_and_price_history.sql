-- ============================================================================
-- Migration 008: Promotions, Discounts & Product Price History
-- إضافة جداول العروض الترويجية والخصومات وسجل تغير الأسعار
-- ============================================================================

-- 1. جدول سجل وتاريخ تغير الأسعار للـ Variants
CREATE TABLE IF NOT EXISTS product_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    old_price INTEGER NOT NULL,             -- السعر القديم بالقروش
    new_price INTEGER NOT NULL,             -- السعر الجديد بالقروش
    user_id INTEGER REFERENCES users(id),
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_variant ON product_price_history(variant_id);

-- 2. جدول العروض الترويجية والخصومات
CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'bogo', 'bundle')),
    discount_value INTEGER NOT NULL DEFAULT 0, -- النسبة المئوية (مثلا 20 لـ 20%) أو المبلغ المالي بالقروش
    min_qty INTEGER NOT NULL DEFAULT 1,       -- الحد الأدنى لكمية الشراء لتفعيل العرض
    start_date TEXT,                          -- تاريخ البداية
    end_date TEXT,                            -- تاريخ النهاية
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);

-- 3. جدول الأصناف والأقسام المشمولة بالعرض الترويجي
CREATE TABLE IF NOT EXISTS promotion_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promotion_items_promo ON promotion_items(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_items_variant ON promotion_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_promotion_items_category ON promotion_items(category_id);
