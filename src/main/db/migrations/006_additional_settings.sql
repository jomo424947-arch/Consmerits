-- الترحيل 006: إعدادات إضافية للنظام (Doc 08)
-- إضافة الإعدادات الجديدة المطلوبة من الوثائق

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
    ('store_name_en', '', datetime('now')),
    ('store_phone', '', datetime('now')),
    ('store_whatsapp', '', datetime('now')),
    ('store_address', '', datetime('now')),
    ('store_logo_path', '', datetime('now')),
    ('tax_registration_no', '', datetime('now')),
    ('commercial_register_no', '', datetime('now')),
    ('printer_name', '', datetime('now')),
    ('receipt_show_tax_no', '0', datetime('now')),
    ('receipt_copies', '1', datetime('now')),
    ('auto_open_drawer_on_cash_sale', '1', datetime('now')),
    ('barcode_scan_increase_qty', '1', datetime('now')),
    ('allow_zero_stock_sale', '0', datetime('now')),
    ('max_cashier_discount_percent', '5', datetime('now')),
    ('return_window_days', '14', datetime('now')),
    ('require_manager_return', '1', datetime('now')),
    ('allow_opened_cosmetics_return', '0', datetime('now')),
    ('theme', 'light', datetime('now')),
    ('currency_symbol', 'ج.م', datetime('now')),
    ('decimal_places', '2', datetime('now')),
    ('auto_backup_path', '', datetime('now')),
    ('max_cashier_expense_limit', '10000', datetime('now'));
