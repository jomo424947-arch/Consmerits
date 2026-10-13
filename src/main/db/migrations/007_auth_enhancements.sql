-- ============================================================================
-- Migration 007: Auth, Security & Backup Enhancements (Doc 09)
-- إضافة حقول تتبع محاولات تسجيل الدخول والقفل التلقائي وفهارس الرقابة وإعدادات الأمان
-- ============================================================================

-- إضافة أعمدة الحماية وتتبع الجلسات إلى جدول users
ALTER TABLE users ADD COLUMN last_login TEXT;
ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;

-- فهارس إضافية لتسريع استعلامات سجل التدقيق الأمني والتحقيقات الرقابية
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- إعدادات الأمان والنسخ الاحتياطي والقفل التلقائي
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
    ('auto_lock_minutes', '5', datetime('now')),
    ('max_login_attempts', '5', datetime('now')),
    ('lockout_minutes', '15', datetime('now')),
    ('backup_retention_days', '30', datetime('now')),
    ('last_integrity_check', '', datetime('now')),
    ('last_usb_backup', '', datetime('now')),
    ('weekly_usb_reminder', '1', datetime('now'));
