/**
 * وحدة التعافي من الإغلاق غير النظيف وحماية قاعدة البيانات والذاكرة المؤقتة
 * (Unclean Exit Recovery & Integrity Guard)
 * - تدير ملف المؤشر (.session-active)
 * - تنظف فقط مجلدات الكاش الرسومي المتضررة (GPUCache, DawnCache, ...) دون المساس بأي بيانات
 * - تنفذ wal_checkpoint(TRUNCATE) و PRAGMA quick_check
 * - تأخذ نسخة احتياطية فورية في حال وجود أي خطأ في سلامة الملف
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { logger } from './logger';

export class RecoveryManager {
  private static getMarkerPath(userDataDir: string): string {
    return path.join(userDataDir, '.session-active');
  }

  /**
   * تنظيف مجلدات الكاش الرسومي المتضررة نهائياً في كل إقلاع لحماية ويندوز 7
   */
  public static cleanGpuCache(userDataDir: string): void {
    const cacheDirsToClean = [
      'GPUCache',
      'DawnCache',
      'DawnGraphiteCache',
      'DawnWebGPUCache',
      'Code Cache',
      'GrShaderCache',
      'ShaderCache',
    ];

    for (const dirName of cacheDirsToClean) {
      const fullDir = path.join(userDataDir, dirName);
      if (fs.existsSync(fullDir)) {
        try {
          fs.rmSync(fullDir, { recursive: true, force: true });
          logger.info(`تم حذف مجلد الكاش المؤقت بنجاح: ${dirName}`);
        } catch (rmErr) {
          logger.warn(`تعذر حذف مجلد الكاش ${dirName}:`, rmErr);
        }
      }
    }
  }

  /**
   * فحص وإجراء التعافي التلقائي عند الإقلاع إذا كان الإغلاق السابق غير نظيف
   */
  public static handleStartupRecovery(userDataDir: string, dbPath: string): void {
    // تنظيف الكاش الرسومي دائماً في كل إقلاع لمنع انهيار كروميوم على ويندوز 7
    this.cleanGpuCache(userDataDir);

    const markerFile = this.getMarkerPath(userDataDir);

    if (fs.existsSync(markerFile)) {
      logger.warn('WARNING: اكتشاف إغلاق غير نظيف للجلسة السابقة (.session-active marker found)');
      logger.info('بدء إجراءات التعافي التلقائي وتفريغ قاعدة البيانات...');

      // 2. فحص سلامة وتفريغ ملفات قاعدة البيانات SQLite WAL
      if (fs.existsSync(dbPath)) {
        try {
          logger.info(`فتح اتصال استرجاع لفحص وتفريغ قاعدة البيانات: ${dbPath}`);
          const recoveryDb = new Database(dbPath, { timeout: 7000 });
          try {
            recoveryDb.pragma('busy_timeout = 7000');
            const cpResult = recoveryDb.pragma('wal_checkpoint(TRUNCATE)');
            logger.info('نتيجة تنفيذ PRAGMA wal_checkpoint(TRUNCATE):', cpResult);

            const checkResult = recoveryDb.pragma('quick_check') as { quick_check?: string }[];
            const status = checkResult[0]?.quick_check ?? 'unknown';
            logger.info(`نتيجة فحص السلامة PRAGMA quick_check: ${status}`);

            if (status !== 'ok') {
              logger.error(`تحذير سلامة: quick_check أرجع (${status})! جاري أخذ نسخة إنقاذ فورية...`);
              const corruptBackup = path.join(
                userDataDir,
                `boutique_gouri_corrupt_${Date.now()}.db`
              );
              fs.copyFileSync(dbPath, corruptBackup);
              logger.warn(`تم حفظ نسخة الإنقاذ في: ${corruptBackup}`);
            }
          } finally {
            recoveryDb.close();
            logger.info('تم إغلاق اتصال الاسترجاع بنجاح');
          }
        } catch (dbRecoveryErr) {
          logger.error('خطأ أثناء فحص واسترجاع قاعدة البيانات بعد الإغلاق غير النظيف:', dbRecoveryErr);
        }
      }
    } else {
      logger.info('الإغلاق السابق كان نظيفاً (لا يوجد مؤشر .session-active معلق)');
    }

    // كتابة مؤشر الجلسة النشطة الحالية
    this.markSessionActive(userDataDir);
  }

  /**
   * كتابة مؤشر الجلسة النشطة
   */
  public static markSessionActive(userDataDir: string): void {
    try {
      const markerFile = this.getMarkerPath(userDataDir);
      const data = JSON.stringify({
        pid: process.pid,
        startTime: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.1',
      });
      fs.writeFileSync(markerFile, data, 'utf8');
      logger.info(`تم تسجيل مؤشر الجلسة النشطة: ${markerFile}`);
    } catch (err) {
      logger.warn('تعذر كتابة ملف مؤشر الجلسة النشطة:', err);
    }
  }

  /**
   * حذف مؤشر الجلسة النشطة عند الإغلاق النظيف
   */
  public static clearSessionActive(userDataDir: string): void {
    try {
      const markerFile = this.getMarkerPath(userDataDir);
      if (fs.existsSync(markerFile)) {
        fs.unlinkSync(markerFile);
        logger.info(`تم حذف مؤشر الجلسة بنظافة: ${markerFile}`);
      }
    } catch (err) {
      logger.warn('تعذر حذف مؤشر الجلسة عند الإغلاق:', err);
    }
  }
}
