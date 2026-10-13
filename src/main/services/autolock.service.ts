/**
 * خدمة القفل التلقائي للشاشة (Auto-Lock Service)
 * تقفل شاشة التطبيق بعد فترة من الخمول لحماية النظام من التلاعب إذا ترك الكاشير الكاونتر
 */

import { BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { auditService as globalAuditService, AuditService } from './audit.service';
import { sessionService as globalSessionService, SessionService } from './session.service';

export class AutoLockService {
  private db?: Database.Database;
  private auditService: AuditService;
  private sessionService: SessionService;
  private isLocked: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private lockTimeoutMs: number = 5 * 60 * 1000; // 5 دقائق افتراضياً
  private windowRef: BrowserWindow | null = null;

  constructor(
    db?: Database.Database,
    audit?: AuditService,
    session?: SessionService
  ) {
    this.db = db;
    this.auditService = audit ?? (db ? new AuditService(db) : globalAuditService);
    this.sessionService = session ?? globalSessionService;
  }

  private getDb(): Database.Database {
    return this.db ?? getDatabase();
  }

  /**
   * ربط النافذة الرئيسية وتحميل مدة القفل من الإعدادات
   */
  initialize(mainWindow: BrowserWindow): void {
    this.windowRef = mainWindow;
    this.refreshTimeoutFromSettings();
    this.resetTimer();
  }

  /**
   * تحديث مهلة الخمول من جدول الإعدادات
   */
  refreshTimeoutFromSettings(): void {
    try {
      const db = this.getDb();
      const row = db
        .prepare("SELECT value FROM settings WHERE key = 'auto_lock_minutes'")
        .get() as { value: string } | undefined;

      const minutes = row?.value ? parseInt(row.value, 10) : 5;
      this.lockTimeoutMs = (minutes > 0 ? minutes : 5) * 60 * 1000;
    } catch {
      this.lockTimeoutMs = 5 * 60 * 1000;
    }
  }

  /**
   * إعادة ضبط مؤقت الخمول عند حدوث أي نشاط (نقر، ضغط مفتاح، مسح باركود)
   */
  recordActivity(): void {
    if (this.isLocked) return;
    this.resetTimer();
  }

  private resetTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    if (this.lockTimeoutMs > 0 && this.sessionService.isAuthenticated()) {
      this.timer = setTimeout(() => {
        this.lock();
      }, this.lockTimeoutMs);
    }
  }

  /**
   * قفل الشاشة فورياً
   */
  lock(): void {
    if (this.isLocked) return;
    this.isLocked = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const user = this.sessionService.getCurrentUser();
    if (user) {
      this.auditService.log({
        userId: user.id,
        action: 'SECURITY_AUTO_LOCK',
        entityType: 'system',
        details: { username: user.username },
      });
    }

    // إرسال تنبيه القفل لنافذة العرض
    if (this.windowRef && !this.windowRef.isDestroyed()) {
      this.windowRef.webContents.send('system:lock-state-changed', { isLocked: true });
    }
  }

  /**
   * فتح قفل الشاشة بعد إدخال PIN الصحيح
   */
  unlock(): void {
    this.isLocked = false;
    this.resetTimer();

    const user = this.sessionService.getCurrentUser();
    if (user) {
      this.auditService.log({
        userId: user.id,
        action: 'SECURITY_SCREEN_UNLOCKED',
        entityType: 'system',
        details: { username: user.username },
      });
    }

    if (this.windowRef && !this.windowRef.isDestroyed()) {
      this.windowRef.webContents.send('system:lock-state-changed', { isLocked: false });
    }
  }

  getLockStatus(): boolean {
    return this.isLocked;
  }

  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const autoLockService = new AutoLockService();
