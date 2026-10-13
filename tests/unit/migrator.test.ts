/**
 * اختبارات الوحدة لمشغل الترحيلات (Migrator Engine Tests)
 */

import fs from 'fs';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations, getCurrentSchemaVersion } from '../../src/main/db/migrator';

describe('Database Migrator', () => {
  let db: Database.Database;

  beforeEach(() => {
    // قاعدة بيانات مؤقتة بالذاكرة لكل اختبار
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    db.close();
  });

  test('يرجع رقم الإصدار 0 في قاعدة بيانات فارغة', () => {
    const version = getCurrentSchemaVersion(db);
    expect(version).toBe(0);
  });

  test('تطبيق الترحيلات بنجاح وتحديث schema_version إلى آخر إصدار', () => {
    const migrationsDir = 'src/main/db/migrations';
    const totalMigrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length;
    const result = runMigrations(db);

    expect(result.appliedCount).toBe(totalMigrations);
    expect(result.currentVersion).toBe(totalMigrations);

    // التأكد من تسجيل الإصدار
    const versionAfter = getCurrentSchemaVersion(db);
    expect(versionAfter).toBe(totalMigrations);
  });

  test('تشغيل الترحيلات مرة أخرى لا يكرر التنفيذ (Idempotency)', () => {
    const migrationsDir = 'src/main/db/migrations';
    const totalMigrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length;
    const firstRun = runMigrations(db);
    expect(firstRun.appliedCount).toBe(totalMigrations);

    const secondRun = runMigrations(db);
    expect(secondRun.appliedCount).toBe(0);
    expect(secondRun.currentVersion).toBe(totalMigrations);
  });

  test('التأكد من إنشاء جدول schema_version والبيانات الأولية', () => {
    const migrationsDir = 'src/main/db/migrations';
    const totalMigrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length;
    runMigrations(db);

    const versionRow = db
      .prepare('SELECT version, applied_at FROM schema_version WHERE version = ?')
      .get(totalMigrations) as { version: number; applied_at: string };

    expect(versionRow).toBeDefined();
    expect(versionRow.version).toBe(totalMigrations);
    expect(versionRow.applied_at).toBeDefined();

    // فحص عداد الفواتير
    const counterRow = db
      .prepare("SELECT value FROM counters WHERE name = 'sale_seq'")
      .get() as { value: number };

    expect(counterRow).toBeDefined();
    expect(counterRow.value).toBe(0);

    // فحص عداد الباركود الداخلي من migration 002
    const barcodeCounter = db
      .prepare("SELECT value FROM counters WHERE name = 'internal_barcode_seq'")
      .get() as { value: number };
    expect(barcodeCounter).toBeDefined();
    expect(barcodeCounter.value).toBe(0);

    // فحص الإعدادات الأولية
    const settingRow = db
      .prepare("SELECT value FROM settings WHERE key = 'currency'")
      .get() as { value: string };

    expect(settingRow).toBeDefined();
    expect(settingRow.value).toBe('ج.م');

    // فحص إعداد allow_zero_stock_sale من migration 002
    const zeroStockSetting = db
      .prepare("SELECT value FROM settings WHERE key = 'allow_zero_stock_sale'")
      .get() as { value: string };
    expect(zeroStockSetting).toBeDefined();
    expect(zeroStockSetting.value).toBe('0');
  });
});
