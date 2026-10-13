/**
 * خدمة النسخ الاحتياطي والاسترجاع وإدارة المخاطر (Backup & Disaster Recovery Service)
 * تدير: أخذ لقطة SQLite ذرية عبر VACUUM INTO، التدوير والحذف الآلي،
 * التصدير لفلاشة USB، فحص سلامة القاعدة الدوري، والاسترجاع
 */

import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { auditService as globalAuditService, AuditService } from './audit.service';

export interface BackupResult {
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupScheduleStatus {
  lastBackup: string | null;
  totalBackups: number;
  lastIntegrityCheck: string | null;
  lastUsbBackup: string | null;
  usbBackupReminderNeeded: boolean;
  retentionDays: number;
}

export class BackupService {
  private db?: Database.Database;
  private auditService: AuditService;

  constructor(db?: Database.Database, audit?: AuditService) {
    this.db = db;
    this.auditService = audit ?? (db ? new AuditService(db) : globalAuditService);
  }

  private getDb(): Database.Database {
    return this.db ?? getDatabase();
  }

  /**
   * الحصول على مسار مجلد النسخ الاحتياطية الافتراضي
   */
  getDefaultBackupDir(): string {
    const db = this.getDb();
    const dbPath = (db as any).name;
    if (dbPath && dbPath !== ':memory:' && dbPath !== '') {
      return path.join(path.dirname(dbPath), 'backups');
    }
    return path.join(process.cwd(), 'backups');
  }

  /**
   * إنشاء نسخة احتياطية بالاعتماد على SQLite VACUUM INTO
   * - يضمن تكامل البيانات 100% حتى أثناء البيع والكتابة
   * - يكتب الملف الناتج مباشرة في المسار المحدد
   */
  async createBackup(destinationPath?: string, userId?: number): Promise<BackupResult> {
    const db = this.getDb();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `cosmetics_backup_${timestamp}.db`;

    const targetDir = destinationPath || this.getDefaultBackupDir();

    // التأكد من وجود مجلد النسخ الاحتياطية
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, fileName);

    // SQLite VACUUM INTO: نسخة ذرية متكاملة
    db.exec(`VACUUM INTO '${fullPath.replace(/'/g, "''")}'`);

    const stat = fs.statSync(fullPath);

    if (userId) {
      this.auditService.log({
        userId,
        action: 'BACKUP_CREATED',
        entityType: 'system',
        entityId: 0,
        details: {
          file: fullPath,
          size_bytes: stat.size,
        },
      });
    }

    return {
      filePath: fullPath,
      sizeBytes: stat.size,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * استعادة قاعدة البيانات من نسخة احتياطية
   * - التحقق من وجود الملف وسلامته أولاً
   * - لا يمكن استعادة قاعدة بيانات :memory:
   */
  async restoreBackup(backupFilePath: string, userId?: number): Promise<boolean> {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`ملف النسخة الاحتياطية غير موجود: ${backupFilePath}`);
    }

    const db = this.getDb();
    const dbPath = (db as any).name;

    if (!dbPath || dbPath === ':memory:' || dbPath === '') {
      throw new Error('لا يمكن استعادة نسخة احتياطية لقاعدة بيانات مؤقتة :memory:');
    }

    // التحقق من سلامة ملف النسخة الاحتياطية عبر integrity_check
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const backupDb = new BetterSqlite3(backupFilePath, { readonly: true });
    try {
      const integrityResult = backupDb.pragma('integrity_check') as { integrity_check: string }[];
      if (integrityResult[0]?.integrity_check !== 'ok') {
        throw new Error('ملف النسخة الاحتياطية تالف أو غير صالح');
      }
    } finally {
      backupDb.close();
    }

    if (userId) {
      this.auditService.log({
        userId,
        action: 'BACKUP_RESTORED',
        entityType: 'system',
        entityId: 0,
        details: { backupFile: backupFilePath },
      });
    }

    // إغلاق الاتصال الحالي ونسخ الملف
    db.close();
    fs.copyFileSync(backupFilePath, dbPath);

    return true;
  }

  /**
   * تدوير النسخ الاحتياطية وحذف النسخ القديمة لتوفير المساحة
   * تحذف النسخ الأقدم من retentionDays (افتراضياً 30 يوماً) مع الاحتفاظ بحد أدنى من النسخ
   */
  rotateBackups(
    maxAgeDays: number = 30,
    keepMinCount: number = 5,
    backupDir?: string
  ): { deleted: string[]; remaining: number } {
    const targetDir = backupDir || this.getDefaultBackupDir();
    if (!fs.existsSync(targetDir)) {
      return { deleted: [], remaining: 0 };
    }

    const backups = this.listBackups(targetDir);
    if (backups.length <= keepMinCount) {
      return { deleted: [], remaining: backups.length };
    }

    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const deleted: string[] = [];

    // نحتفظ بـ keepMinCount الأحدث دائماً مهما كان عمرها
    const candidates = backups.slice(keepMinCount);

    for (const b of candidates) {
      try {
        const fileAge = now - new Date(b.createdAt).getTime();
        if (fileAge > maxAgeMs) {
          if (fs.existsSync(b.filePath)) {
            fs.unlinkSync(b.filePath);
            deleted.push(b.filePath);
          }
        }
      } catch (err) {
        console.error(`خطأ أثناء تدوير النسخة ${b.filePath}:`, err);
      }
    }

    if (deleted.length > 0) {
      this.auditService.log({
        userId: 0,
        action: 'BACKUP_ROTATION',
        entityType: 'system',
        details: { deletedFiles: deleted, deletedCount: deleted.length },
      });
    }

    const remaining = this.listBackups(targetDir).length;
    return { deleted, remaining };
  }

  /**
   * إنشاء نسخة احتياطية تلقائية (مثلاً عند إغلاق الوردية أو إغلاق التطبيق) مع التدوير
   */
  async runAutoBackup(backupDir?: string, userId?: number): Promise<BackupResult> {
    const result = await this.createBackup(backupDir, userId);
    this.rotateBackups(30, 5, backupDir);

    const db = this.getDb();
    try {
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_auto_backup', ?, datetime('now'))"
      ).run(result.createdAt);
    } catch {
      // تجاهل إذا كانت القاعدة مؤقتة أو غير مهيأة
    }

    return result;
  }

  /**
   * تصدير النسخة الاحتياطية لفلاشة USB أو مسار خارجي
   */
  async exportToPath(targetPath: string, userId?: number): Promise<BackupResult> {
    const result = await this.createBackup(targetPath, userId);

    const db = this.getDb();
    try {
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_usb_backup', ?, datetime('now'))"
      ).run(new Date().toISOString());
    } catch {
      // في الاختبارات
    }

    if (userId) {
      this.auditService.log({
        userId,
        action: 'BACKUP_EXPORT_USB',
        entityType: 'system',
        entityId: 0,
        details: { targetPath, file: result.filePath },
      });
    }

    return result;
  }

  /**
   * التحقق من سلامة قاعدة البيانات الحالية (Integrity Check)
   */
  verifyIntegrity(): { ok: boolean; details: string } {
    const db = this.getDb();
    const result = db.pragma('integrity_check') as { integrity_check: string }[];
    const ok = result[0]?.integrity_check === 'ok';
    return {
      ok,
      details: result[0]?.integrity_check ?? 'unknown',
    };
  }

  /**
   * فحص السلامة الأسبوعي التلقائي
   */
  weeklyIntegrityCheck(force: boolean = false): { ok: boolean; details: string; checkedAt: string } {
    const db = this.getDb();
    const nowIso = new Date().toISOString();

    if (!force) {
      try {
        const lastCheckRow = db
          .prepare("SELECT value FROM settings WHERE key = 'last_integrity_check'")
          .get() as { value: string } | undefined;

        if (lastCheckRow?.value) {
          const lastCheckTime = new Date(lastCheckRow.value).getTime();
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - lastCheckTime < sevenDaysMs) {
            return { ok: true, details: 'الفحص الدوري تم مؤخراً', checkedAt: lastCheckRow.value };
          }
        }
      } catch {
        // إذا كان الجدول غير متاح بعد
      }
    }

    const { ok, details } = this.verifyIntegrity();

    try {
      db.prepare(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_integrity_check', ?, datetime('now'))"
      ).run(nowIso);
    } catch {
      // في بيئة الاختبار
    }

    this.auditService.log({
      userId: 0,
      action: ok ? 'INTEGRITY_CHECK_OK' : 'INTEGRITY_CHECK_FAILED',
      entityType: 'system',
      details: { details, ok },
    });

    return { ok, details, checkedAt: nowIso };
  }

  /**
   * فحص هل يلزم تذكير المالك بأخذ نسخة على فلاشة USB (تنبيه أسبوعي)
   */
  shouldPromptUSBBackup(): boolean {
    const db = this.getDb();
    try {
      const row = db
        .prepare("SELECT value FROM settings WHERE key = 'last_usb_backup'")
        .get() as { value: string } | undefined;

      if (!row || !row.value) return true;

      const lastUsbTime = new Date(row.value).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - lastUsbTime > sevenDaysMs;
    } catch {
      return false;
    }
  }

  /**
   * جلب ملخص حالة وجدولة النسخ الاحتياطي
   */
  getBackupScheduleStatus(backupDir?: string): BackupScheduleStatus {
    const db = this.getDb();
    const backups = this.listBackups(backupDir);

    let lastIntegrity: string | null = null;
    let lastUsb: string | null = null;
    let retentionDays = 30;

    try {
      const intRow = db
        .prepare("SELECT value FROM settings WHERE key = 'last_integrity_check'")
        .get() as { value: string } | undefined;
      lastIntegrity = intRow?.value || null;

      const usbRow = db
        .prepare("SELECT value FROM settings WHERE key = 'last_usb_backup'")
        .get() as { value: string } | undefined;
      lastUsb = usbRow?.value || null;

      const retRow = db
        .prepare("SELECT value FROM settings WHERE key = 'backup_retention_days'")
        .get() as { value: string } | undefined;
      if (retRow?.value) retentionDays = parseInt(retRow.value, 10) || 30;
    } catch {
      // اختبارات
    }

    return {
      lastBackup: backups[0]?.createdAt ?? null,
      totalBackups: backups.length,
      lastIntegrityCheck: lastIntegrity,
      lastUsbBackup: lastUsb,
      usbBackupReminderNeeded: this.shouldPromptUSBBackup(),
      retentionDays,
    };
  }

  /**
   * جلب قائمة النسخ الاحتياطية المتاحة في مجلد النسخ الافتراضي
   */
  listBackups(backupDir?: string): BackupResult[] {
    const targetDir = backupDir || this.getDefaultBackupDir();

    if (!fs.existsSync(targetDir)) {
      return [];
    }

    const files = fs.readdirSync(targetDir).filter((f) => f.startsWith('cosmetics_backup_') && f.endsWith('.db'));

    return files
      .map((f) => {
        const fullPath = path.join(targetDir, f);
        const stat = fs.statSync(fullPath);
        return {
          filePath: fullPath,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const backupService = new BackupService();
