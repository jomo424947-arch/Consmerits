import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { runMigrations } from '../../src/main/db/migrator';
import { BackupService } from '../../src/main/services/backup.service';

describe('BackupService (خدمة النسخ الاحتياطي والاسترجاع وإدارة الكوارث)', () => {
  let db: Database.Database;
  let backupService: BackupService;
  let tempDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    backupService = new BackupService(db);

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmetics-backup-test-'));
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('فحص سلامة قاعدة البيانات الحالية (Database Integrity Check)', () => {
    const result = backupService.verifyIntegrity();
    expect(result.ok).toBe(true);
    expect(result.details).toBe('ok');
  });

  test('إنشاء نسخة احتياطية ذرية (VACUUM INTO) وحفظها في مجلد مخصص', async () => {
    const result = await backupService.createBackup(tempDir);

    expect(result.filePath).toBeDefined();
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.createdAt).toBeDefined();

    // التأكد من أن الملف صالح كقاعدة بيانات SQLite
    const testDb = new Database(result.filePath, { readonly: true });
    const check = testDb.pragma('integrity_check') as { integrity_check: string }[];
    expect(check[0]?.integrity_check).toBe('ok');
    testDb.close();
  });

  test('عرض قائمة النسخ الاحتياطية المتاحة (listBackups) مرتبة زمنياً', async () => {
    const b1 = await backupService.createBackup(tempDir);
    const list = backupService.listBackups(tempDir);

    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].filePath).toBe(b1.filePath);
    expect(list[0].sizeBytes).toBe(b1.sizeBytes);
  });

  test('محاولة استعادة ملف غير موجود ترمي خطأ صريحاً', async () => {
    const fakePath = path.join(tempDir, 'non_existent_backup.db');
    await expect(backupService.restoreBackup(fakePath)).rejects.toThrow('غير موجود');
  });

  test('تصدير نسخة احتياطية لمسار خارجي (فلاشة USB)', async () => {
    const exportResult = await backupService.exportToPath(tempDir);
    expect(exportResult).toBeDefined();
    expect(fs.existsSync(exportResult.filePath)).toBe(true);
    expect(exportResult.sizeBytes).toBeGreaterThan(0);
  });

  test('تدوير النسخ الاحتياطية وحذف النسخ القديمة (Rotation)', async () => {
    // إنشاء 6 ملفات نسخ احتياطية وهمية بتواريخ سابقة
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      const fileName = `cosmetics_backup_2026-0${i + 1}-01T00-00-00.db`;
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, 'dummy sqlite content');

      // تعديل وقت التعديل ليكون أقدم من 40 يوماً
      const pastTime = (now - 45 * 24 * 60 * 60 * 1000) / 1000;
      fs.utimesSync(filePath, pastTime, pastTime);
    }

    expect(backupService.listBackups(tempDir).length).toBe(6);

    // تدوير مع الاحتفاظ بـ 5 كحد أدنى وحذف الأقدم من 30 يوماً
    const rotateResult = backupService.rotateBackups(30, 5, tempDir);
    expect(rotateResult.deleted.length).toBe(1);
    expect(rotateResult.remaining).toBe(5);
  });

  test('فحص السلامة الأسبوعي وملخص جدولة النسخ', () => {
    const weeklyCheck = backupService.weeklyIntegrityCheck(true);
    expect(weeklyCheck.ok).toBe(true);
    expect(weeklyCheck.checkedAt).toBeDefined();

    const scheduleStatus = backupService.getBackupScheduleStatus(tempDir);
    expect(scheduleStatus).toBeDefined();
    expect(scheduleStatus.retentionDays).toBe(30);
    expect(scheduleStatus.usbBackupReminderNeeded).toBe(true);
  });
});
