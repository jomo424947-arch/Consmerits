/**
 * مدير اتصال وتكوين قاعدة بيانات SQLite (Better-SQLite3)
 * يوفر اتصالاً آمناً وسريعاً مضبوطاً بـ WAL Mode و Foreign Keys و Synchronous FULL
 * ويدعم التهيئة التلقائية للبيانات وقواعد الاختبارات (In-Memory)
 * ومحصن بدوال lazy & idempotent تضمن استقرار الإقلاع في المرة الثانية وما بعدها
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { dialog } from 'electron';
import { runMigrations, MigrationResult } from './migrator';
import { logger } from '../logger';

export interface DatabaseConnectionOptions {
  filename?: string;
  verbose?: boolean;
  migrationsDir?: string;
  autoMigrate?: boolean;
}

let dbInstance: Database.Database | null = null;
let migrationResultCache: MigrationResult | null = null;

/**
 * الحصول على المسار الافتراضي لملف قاعدة البيانات
 */
export function getDefaultDatabasePath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      const userDataDir = app.getPath('userData');
      return path.join(userDataDir, 'boutique_gouri.db');
    }
  } catch {
    // بيئة الاختبارات أو بيئة Node العادية
  }

  return path.resolve(process.cwd(), 'boutique_gouri.db');
}

/**
 * فحص ما إذا كان اتصال قاعدة البيانات مفتوحاً ونشطاً
 */
export function isDatabaseOpen(): boolean {
  return dbInstance !== null && dbInstance.open;
}

/**
 * فتح اتصال قاعدة البيانات مع ضبط الـ PRAGMAs وإعادة المحاولة التلقائية عند القفل المؤقت
 */
export function getDatabase(options?: DatabaseConnectionOptions): Database.Database {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }

  const dbPath = options?.filename || getDefaultDatabasePath();

  // إنشاء المجلد الأب إذا لم يكن موجوداً
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      dbInstance = new Database(dbPath, {
        verbose: options?.verbose ? (msg) => logger.debug(`[SQL] ${msg}`) : undefined,
        timeout: 5000,
      });

      // تفعيل إعدادات الأمان والأداء الصارمة
      dbInstance.pragma('journal_mode = WAL');
      dbInstance.pragma('foreign_keys = ON');
      dbInstance.pragma('synchronous = FULL');
      dbInstance.pragma('busy_timeout = 5000');

      logger.info(`تم فتح اتصال قاعدة البيانات بنجاح في المحاولة ${attempts}: ${dbPath}`);
      return dbInstance;
    } catch (err: any) {
      logger.warn(`فشلت محاولة فتح قاعدة البيانات (${attempts}/${maxAttempts}):`, err);
      if (attempts >= maxAttempts) {
        logger.error(`فشل نهائي في فتح قاعدة البيانات بعد ${maxAttempts} محاولات:`, err);
        try {
          dialog.showErrorBox(
            'خطأ في فتح قاعدة البيانات',
            `تعذر فتح ملف قاعدة البيانات بعد ${maxAttempts} محاولات:\n${err?.message || String(err)}\n\nيرجى التأكد من عدم وجود نسخة أخرى تعمل في إدارة المهام، والتحقق من صلاحيات الملفات.`
          );
        } catch {}
        throw err;
      }
      // تأخير تزامني قصير قبل إعادة المحاولة (500ms)
      const start = Date.now();
      while (Date.now() - start < 500) {
        // انتظار تزامني
      }
    }
  }

  throw new Error('تعذر فتح قاعدة البيانات بعد تكرار المحاولات.');
}

/**
 * تهيئة قاعدة البيانات بالكامل (فتح الاتصال + تطبيق الترحيلات)
 */
export function initializeDatabase(options?: DatabaseConnectionOptions): {
  db: Database.Database;
  migrationResult: MigrationResult;
} {
  const db = getDatabase(options);

  const migrationResult = runMigrations(db, {
    migrationsDir: options?.migrationsDir,
  });

  const MIN_REQUIRED_VERSION = 9;
  if (migrationResult.currentVersion < MIN_REQUIRED_VERSION) {
    const msg = `إصدار قاعدة البيانات الحالي (${migrationResult.currentVersion}) أقل من الإصدار الأدنى المطلوب (${MIN_REQUIRED_VERSION}). تعذر تهيئة كافة الجداول.`;
    logger.error(msg);
    throw new Error(msg);
  }

  migrationResultCache = migrationResult;
  logger.info(`تم تطبيق والتحقق من ترحيلات قاعدة البيانات: الإصدار ${migrationResult.currentVersion}`);

  return {
    db,
    migrationResult,
  };
}

/**
 * دالة استدعاء كسولة وغير مكررة (Lazy & Idempotent)
 * تضمن وجود اتصال صالح وترحيلات مطبقة دون رمي استثناءات مكررة
 * مستخدمة في app.whenReady و createWindow و second-instance
 */
export function ensureDatabase(options?: DatabaseConnectionOptions): Database.Database {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }
  const { db } = initializeDatabase(options);
  return db;
}

/**
 * إغلاق اتصال قاعدة البيانات الحالي مع تفريغ WAL بشكل آمن ومكرر (Idempotent)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      if (dbInstance.open) {
        try {
          const cp = dbInstance.pragma('wal_checkpoint(TRUNCATE)');
          logger.info('نتيجة تنفيذ wal_checkpoint(TRUNCATE) عند الإغلاق:', cp);
        } catch (cpErr) {
          logger.warn('تنبيه: تعذر تفريغ ملف WAL عند الإغلاق:', cpErr);
        }
        dbInstance.close();
        logger.info('تم إغلاق اتصال قاعدة البيانات بنجاح.');
      }
    } catch (closeErr) {
      logger.error('خطأ أثناء إغلاق قاعدة البيانات:', closeErr);
    } finally {
      dbInstance = null;
      migrationResultCache = null;
    }
  }
}
