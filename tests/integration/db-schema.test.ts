/**
 * اختبارات التكامل لقاعدة البيانات: الجداول، القيود الصارمة، الـ Triggers، والنزاهة
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';

describe('Database Schema & Integrity Tests', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = FULL');
    runMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  test('التأكد من إنشاء جميع الجداول الـ 25 الأساسية', () => {
    const expectedTables = [
      'schema_version',
      'settings',
      'counters',
      'users',
      'categories',
      'brands',
      'customers',
      'suppliers',
      'products',
      'product_variants',
      'product_barcodes',
      'batches',
      'shifts',
      'sales',
      'sale_items',
      'sale_payments',
      'held_sales',
      'stock_movements',
      'purchases',
      'purchase_items',
      'returns',
      'return_items',
      'cash_movements',
      'expenses',
      'audit_log',
    ];

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    for (const expectedTable of expectedTables) {
      expect(tableNames).toContain(expectedTable);
    }
  });

  describe('قيود النزاهة (Integrity Constraints)', () => {
    test('منع تكرار الباركود (UNIQUE Constraint)', () => {
      // إدخال مستخدم وتصنيف ومنتج
      db.prepare(`
        INSERT INTO categories (uuid, name, created_at)
        VALUES ('cat-1', 'العناية بالبشرة', datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO products (uuid, name_ar, category_id, unit, created_at, updated_at)
        VALUES ('prod-1', 'سيروم فيتامين سي', 1, 'قطعة', datetime('now'), datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO product_variants (uuid, product_id, sale_price)
        VALUES ('var-1', 1, 25000)
      `).run();

      // إدخال الباركود الأول
      db.prepare(`
        INSERT INTO product_barcodes (variant_id, barcode)
        VALUES (1, '6221234567890')
      `).run();

      // محاولة إدخال نفس الباركود مجدداً
      expect(() => {
        db.prepare(`
          INSERT INTO product_barcodes (variant_id, barcode)
          VALUES (1, '6221234567890')
        `).run();
      }).toThrow(/UNIQUE constraint failed: product_barcodes\.barcode/);
    });

    test('فشل حركة المخزون ذات الكمية صفر (CHECK qty <> 0)', () => {
      // إعداد البيانات الأولية
      db.prepare(`
        INSERT INTO users (uuid, username, display_name, password_hash, role, created_at)
        VALUES ('u-1', 'admin', 'المدير', 'hash', 'owner', datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO products (uuid, name_ar, unit, created_at, updated_at)
        VALUES ('p-1', 'كريم مرطب', 'قطعة', datetime('now'), datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO product_variants (uuid, product_id, sale_price)
        VALUES ('v-1', 1, 15000)
      `).run();

      db.prepare(`
        INSERT INTO batches (variant_id, unit_cost, qty_remaining, received_at)
        VALUES (1, 10000, 10, datetime('now'))
      `).run();

      expect(() => {
        db.prepare(`
          INSERT INTO stock_movements (batch_id, type, qty, user_id, created_at)
          VALUES (1, 'adjust_in', 0, 1, datetime('now'))
        `).run();
      }).toThrow(/CHECK constraint failed/);
    });

    test('منع الرصيد السالب للدفعة (CHECK qty_remaining >= 0)', () => {
      db.prepare(`
        INSERT INTO products (uuid, name_ar, unit, created_at, updated_at)
        VALUES ('p-1', 'كريم مرطب', 'قطعة', datetime('now'), datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO product_variants (uuid, product_id, sale_price)
        VALUES ('v-1', 1, 15000)
      `).run();

      expect(() => {
        db.prepare(`
          INSERT INTO batches (variant_id, unit_cost, qty_remaining, received_at)
          VALUES (1, 10000, -5, datetime('now'))
        `).run();
      }).toThrow(/CHECK constraint failed/);
    });
  });

  describe('مشغلات الأمان والمخزون (Triggers)', () => {
    beforeEach(() => {
      db.prepare(`
        INSERT INTO users (uuid, username, display_name, password_hash, role, created_at)
        VALUES ('u-1', 'admin', 'المدير', 'hash', 'owner', datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO products (uuid, name_ar, unit, created_at, updated_at)
        VALUES ('p-1', 'غسول وجه', 'قطعة', datetime('now'), datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO product_variants (uuid, product_id, sale_price)
        VALUES ('v-1', 1, 12000)
      `).run();

      db.prepare(`
        INSERT INTO batches (variant_id, unit_cost, qty_remaining, received_at)
        VALUES (1, 8000, 20, datetime('now'))
      `).run();
    });

    test('trg_movement_apply: تحديث كمية الدفعة تلقائياً عند إضافة حركة بيع', () => {
      // تسجيل حركة خروج 5 قطع (بيع)
      db.prepare(`
        INSERT INTO stock_movements (batch_id, type, qty, user_id, created_at)
        VALUES (1, 'sale', -5, 1, datetime('now'))
      `).run();

      const batch = db.prepare('SELECT qty_remaining FROM batches WHERE id = 1').get() as {
        qty_remaining: number;
      };

      expect(batch.qty_remaining).toBe(15);

      // تسجيل حركة دخول 10 قطع (شراء)
      db.prepare(`
        INSERT INTO stock_movements (batch_id, type, qty, user_id, created_at)
        VALUES (1, 'purchase', 10, 1, datetime('now'))
      `).run();

      const batchUpdated = db.prepare('SELECT qty_remaining FROM batches WHERE id = 1').get() as {
        qty_remaining: number;
      };

      expect(batchUpdated.qty_remaining).toBe(25);
    });

    test('فشل الحركة والتراجع عند محاولة بيع أكثر من المتاح بالمخزون', () => {
      // محاولة سحب 30 قطعة والرصيد 20 فقط -> يسبب qty_remaining = -10 -> فشل القيد
      expect(() => {
        db.prepare(`
          INSERT INTO stock_movements (batch_id, type, qty, user_id, created_at)
          VALUES (1, 'sale', -30, 1, datetime('now'))
        `).run();
      }).toThrow(/CHECK constraint failed/);

      // التأكد من عدم تغيير كمية الدفعة
      const batch = db.prepare('SELECT qty_remaining FROM batches WHERE id = 1').get() as {
        qty_remaining: number;
      };
      expect(batch.qty_remaining).toBe(20);
    });

    test('trg_movement_no_update: منع تعديل أي حركة مخزون مسجلة', () => {
      db.prepare(`
        INSERT INTO stock_movements (batch_id, type, qty, user_id, created_at)
        VALUES (1, 'purchase', 5, 1, datetime('now'))
      `).run();

      expect(() => {
        db.prepare('UPDATE stock_movements SET qty = 10 WHERE id = 1').run();
      }).toThrow(/stock_movements is append-only/);
    });

    test('trg_movement_no_delete: منع حذف أي حركة مخزون مسجلة', () => {
      db.prepare(`
        INSERT INTO stock_movements (batch_id, type, qty, user_id, created_at)
        VALUES (1, 'purchase', 5, 1, datetime('now'))
      `).run();

      expect(() => {
        db.prepare('DELETE FROM stock_movements WHERE id = 1').run();
      }).toThrow(/stock_movements is append-only/);
    });

    test('trg_prevent_completed_sale_update: منع تعديل الفاتورة المكتملة', () => {
      db.prepare(`
        INSERT INTO shifts (uuid, user_id, opening_balance, opened_at)
        VALUES ('sh-1', 1, 50000, datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO sales (
          uuid, seq_no, invoice_no, user_id, shift_id,
          subtotal, total, status, created_at
        ) VALUES (
          's-1', 1, 'INV-001', 1, 1,
          12000, 12000, 'completed', datetime('now')
        )
      `).run();

      // محاولة تغيير الإجمالي أو الخصم بعد الحفظ
      expect(() => {
        db.prepare('UPDATE sales SET total = 10000 WHERE id = 1').run();
      }).toThrow(/فواتير البيع المكتملة غير قابلة للتعديل/);
    });

    test('trg_prevent_sale_delete: منع حذف فاتورة البيع نهائياً', () => {
      db.prepare(`
        INSERT INTO shifts (uuid, user_id, opening_balance, opened_at)
        VALUES ('sh-1', 1, 50000, datetime('now'))
      `).run();

      db.prepare(`
        INSERT INTO sales (
          uuid, seq_no, invoice_no, user_id, shift_id,
          subtotal, total, status, created_at
        ) VALUES (
          's-1', 1, 'INV-001', 1, 1,
          12000, 12000, 'completed', datetime('now')
        )
      `).run();

      expect(() => {
        db.prepare('DELETE FROM sales WHERE id = 1').run();
      }).toThrow(/فواتير البيع غير قابلة للحذف نهائياً/);
    });

    test('trg_audit_log_no_update & trg_audit_log_no_delete: سجل الرقابة Append-Only', () => {
      db.prepare(`
        INSERT INTO audit_log (user_id, action, entity_type, created_at)
        VALUES (1, 'LOGIN', 'users', datetime('now'))
      `).run();

      expect(() => {
        db.prepare("UPDATE audit_log SET action = 'LOGOUT' WHERE id = 1").run();
      }).toThrow(/audit_log is append-only/);

      expect(() => {
        db.prepare('DELETE FROM audit_log WHERE id = 1').run();
      }).toThrow(/audit_log is append-only/);
    });
  });
});
