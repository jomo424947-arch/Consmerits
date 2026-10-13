-- Migration 004: ترقية فواتير الشراء، مرتجعات الشراء، وسداد الموردين
-- تاريخ الإنشاء: 2026-10-12

-- 1. إضافة الأعمدة المطلوبة لجدول purchases
ALTER TABLE purchases ADD COLUMN subtotal INTEGER DEFAULT 0;
ALTER TABLE purchases ADD COLUMN discount INTEGER DEFAULT 0;
ALTER TABLE purchases ADD COLUMN tax INTEGER DEFAULT 0;
ALTER TABLE purchases ADD COLUMN status TEXT DEFAULT 'completed';

-- 2. إضافة الأعمدة المطلوبة لجدول purchase_items
ALTER TABLE purchase_items ADD COLUMN total_cost INTEGER DEFAULT 0;

-- 3. دفعات سداد الموردين
CREATE TABLE IF NOT EXISTS supplier_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    note TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
);

-- 4. مرتجعات الشراء
CREATE TABLE IF NOT EXISTS purchase_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    total_refund INTEGER NOT NULL CHECK (total_refund >= 0),
    user_id INTEGER NOT NULL REFERENCES users(id),
    note TEXT,
    created_at TEXT NOT NULL
);

-- 5. بنود مرتجعات الشراء
CREATE TABLE IF NOT EXISTS purchase_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    purchase_item_id INTEGER NOT NULL REFERENCES purchase_items(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    batch_id INTEGER NOT NULL REFERENCES batches(id),
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_cost INTEGER NOT NULL DEFAULT 0
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_variant ON purchase_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase ON purchase_returns(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);

-- عداد فواتير الشراء التسلسلي
INSERT OR IGNORE INTO counters (name, value) VALUES ('purchase_seq', 0);
