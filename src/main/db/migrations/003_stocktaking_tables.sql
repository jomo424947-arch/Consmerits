-- Migration 003: جداول الجرد وإعدادات المخزون والصلاحية
-- تاريخ الإنشاء: 2026-10-12

CREATE TABLE IF NOT EXISTS stock_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL CHECK (scope IN ('all', 'category', 'brand', 'manual')),
    scope_id INTEGER,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'reviewed', 'approved', 'cancelled')),
    user_id INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS stock_count_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    count_id INTEGER NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    system_qty INTEGER NOT NULL,
    counted_qty INTEGER,
    difference INTEGER,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_count ON stock_count_items(count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_variant ON stock_count_items(variant_id);

-- إعدادات إضافية للمخزون والمرتجعات
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
    ('return_window_days', '14', datetime('now')),
    ('require_manager_return', '1', datetime('now')),
    ('allow_open_product_return', '0', datetime('now')),
    ('dead_stock_days', '90', datetime('now'));
