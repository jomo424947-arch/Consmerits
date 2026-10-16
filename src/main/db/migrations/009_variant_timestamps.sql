-- ============================================================================
-- Migration 009: Variant Timestamps & Maintenance
-- إضافة عمود updated_at لجدول درجات وأحجام المنتجات (product_variants)
-- لتسجيل وقت آخر تحديث أو أرشفة لدرجات المنتجات
-- ============================================================================

ALTER TABLE product_variants ADD COLUMN updated_at TEXT;
