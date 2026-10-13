/**
 * خدمة المصادقة وإدارة المستخدمين (Authentication & Users Service)
 * تدير: تسجيل الدخول بكلمة المرور أو الـ PIN، والتحقق من صلاحية المدير،
 * قفل الحساب عند تكرار المحاولات الفاشلة، وإدارة المستخدمين وتحديث كلمات المرور
 */

import crypto from 'crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import {
  SafeUser,
  User,
  CreateUserInput,
  UpdateUserInput,
  LoginResult,
} from '../../shared/types/users.types';
import { USER_ROLES, UserRole } from '../../shared/constants/roles';
import { ALLOWED_ADMIN_ACCOUNTS, isAllowedAdminUsername } from '../config/admin-accounts.config';
import { auditService as globalAuditService, AuditService } from './audit.service';
import { sessionService as globalSessionService, SessionService } from './session.service';

/**
 * تجزئة كلمة المرور باستخدام Scrypt ومفتاح Salt عشوائي
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * التحقق من كلمة المرور بمقارنة آمنة زمنياً (Timing Safe)
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * تجزئة رقم الـ PIN
 */
export function hashPin(pin: string): string {
  return hashPassword(pin);
}

/**
 * التحقق من رقم الـ PIN
 */
export function verifyPin(pin: string, storedPinHash: string): boolean {
  return verifyPassword(pin, storedPinHash);
}

export class AuthService {
  private db?: Database.Database;
  private auditService: AuditService;
  private sessionService: SessionService;

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

  private toSafeUser(user: User): SafeUser {
    const { password_hash, pin_hash, ...safe } = user;
    return safe;
  }

  /**
   * دالة مساعدة لفحص هل الحساب مجمد
   */
  private isAccountLocked(user: User): boolean {
    if (!user.locked_until) return false;
    const lockedUntil = new Date(user.locked_until).getTime();
    return lockedUntil > Date.now();
  }

  /**
   * تسجيل محاولة دخول فاشلة وتجميد الحساب إذا بلغت 5 محاولات
   */
  private handleFailedAttempt(user: User): { attemptsRemaining: number; lockedUntil: string | null } {
    const db = this.getDb();
    const currentCount = (user.failed_login_count || 0) + 1;
    const maxAttempts = 5;

    if (currentCount >= maxAttempts) {
      // تجميد لمدة 15 دقيقة
      const lockUntilDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE users
        SET failed_login_count = ?, locked_until = ?
        WHERE id = ?
      `).run(currentCount, lockUntilDate, user.id);

      this.auditService.log({
        userId: user.id,
        action: 'SECURITY_ACCOUNT_LOCKED',
        entityType: 'users',
        entityId: user.id,
        details: {
          username: user.username,
          failedAttempts: currentCount,
          lockedUntil: lockUntilDate,
        },
      });

      return { attemptsRemaining: 0, lockedUntil: lockUntilDate };
    } else {
      db.prepare(`
        UPDATE users
        SET failed_login_count = ?
        WHERE id = ?
      `).run(currentCount, user.id);

      this.auditService.log({
        userId: user.id,
        action: 'SECURITY_LOGIN_FAILED',
        entityType: 'users',
        entityId: user.id,
        details: {
          username: user.username,
          failedAttempts: currentCount,
          attemptsRemaining: maxAttempts - currentCount,
        },
      });

      return { attemptsRemaining: maxAttempts - currentCount, lockedUntil: null };
    }
  }

  /**
   * تصفير عداد المحاولات وتحديث وقت آخر دخول
   */
  private handleSuccessfulLogin(user: User, method: 'PASSWORD' | 'PIN'): SafeUser {
    const db = this.getDb();
    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET failed_login_count = 0, locked_until = NULL, last_login = ?
      WHERE id = ?
    `).run(nowIso, user.id);

    const safeUser = this.toSafeUser({
      ...user,
      last_login: nowIso,
      failed_login_count: 0,
      locked_until: null,
    });

    this.sessionService.setCurrentUser(safeUser);

    this.auditService.log({
      userId: user.id,
      action: method === 'PASSWORD' ? 'LOGIN_PASSWORD' : 'LOGIN_PIN',
      entityType: 'users',
      entityId: user.id,
      details: { username: user.username, role: user.role },
    });

    return safeUser;
  }

  /**
   * تسجيل الدخول باسم المستخدم وكلمة المرور مع تفاصيل كاملة
   */
  async loginWithPasswordDetailed(username: string, password: string): Promise<LoginResult> {
    const db = this.getDb();
    const user = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username) as User | undefined;

    if (!user) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    if (!user.is_active) {
      return { success: false, error: 'هذا الحساب معطّل، يرجى مراجعة المالك' };
    }

    if (this.isAccountLocked(user)) {
      return {
        success: false,
        error: 'تم تجميد هذا الحساب مؤقتاً لتكرار المحاولات الخاطئة. يرجى الانتظار 15 دقيقة.',
        lockedUntil: user.locked_until,
      };
    }

    if (!verifyPassword(password, user.password_hash)) {
      const { attemptsRemaining, lockedUntil } = this.handleFailedAttempt(user);
      if (lockedUntil) {
        return {
          success: false,
          error: 'تم تجاوز الحد الأقصى للمحاولات وتم تجميد الحساب لمدة 15 دقيقة.',
          lockedUntil,
          attemptsRemaining: 0,
        };
      }
      return {
        success: false,
        error: `كلمة المرور غير صحيحة. المتبقي: ${attemptsRemaining} محاولات.`,
        attemptsRemaining,
        lockedUntil: null,
      };
    }

    const safeUser = this.handleSuccessfulLogin(user, 'PASSWORD');
    return { success: true, user: safeUser };
  }

  /**
   * تسجيل الدخول السريع برمز PIN مع تفاصيل كاملة
   */
  async loginWithPinDetailed(pin: string): Promise<LoginResult> {
    const db = this.getDb();
    const users = db
      .prepare('SELECT * FROM users WHERE pin_hash IS NOT NULL AND is_active = 1')
      .all() as User[];

    for (const user of users) {
      if (this.isAccountLocked(user)) {
        continue;
      }

      if (user.pin_hash && verifyPin(pin, user.pin_hash)) {
        const safeUser = this.handleSuccessfulLogin(user, 'PIN');
        return { success: true, user: safeUser };
      }
    }

    return {
      success: false,
      error: 'رمز PIN غير صحيح أو الحساب مجمد',
    };
  }

  /**
   * تسجيل الدخول باسم المستخدم وكلمة المرور (للتوافق مع الاستدعاءات السابقة)
   */
  async loginWithPassword(username: string, password: string): Promise<SafeUser | null> {
    const res = await this.loginWithPasswordDetailed(username, password);
    return res.user ?? null;
  }

  /**
   * تسجيل الدخول السريع برمز الـ PIN (للتوافق مع الاستدعاءات السابقة)
   */
  async loginWithPin(pin: string): Promise<SafeUser | null> {
    const res = await this.loginWithPinDetailed(pin);
    return res.user ?? null;
  }

  /**
   * التحقق من رقم الـ PIN
   */
  verifyPin(pin: string, storedPinHash: string): boolean {
    return verifyPin(pin, storedPinHash);
  }

  /**
   * التحقق من صلاحية المدير برمز PIN (لتجاوز الخصم أو تفويض العمليات)
   */
  async verifyManagerPin(pin: string): Promise<boolean> {
    const db = this.getDb();
    const managers = db
      .prepare(
        "SELECT * FROM users WHERE role IN ('owner', 'manager') AND pin_hash IS NOT NULL AND is_active = 1"
      )
      .all() as User[];

    for (const manager of managers) {
      if (this.isAccountLocked(manager)) {
        continue;
      }

      if (manager.pin_hash && verifyPin(pin, manager.pin_hash)) {
        this.auditService.log({
          userId: manager.id,
          action: 'VERIFY_MANAGER_PIN_SUCCESS',
          entityType: 'users',
          entityId: manager.id,
          details: { manager: manager.username },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * إنشاء مستخدم جديد
   */
  createUser(input: CreateUserInput, actorUserId?: number): SafeUser {
    const db = this.getDb();

    // فحص فرادة اسم المستخدم
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(input.username.trim());
    if (existing) {
      throw new Error(`اسم المستخدم "${input.username}" مستخدم بالفعل`);
    }

    // التحقق من الصلاحيات الإدارية: يُسمح فقط للحسابات المعتمدة برتبة المالك
    if (input.role === USER_ROLES.OWNER && !isAllowedAdminUsername(input.username)) {
      throw new Error('غير مصرح بتعيين هذا الحساب كمدير/مالك. الحسابات الإدارية المعتمدة محددة مسبقاً فقط.');
    }

    const uuid = crypto.randomUUID();
    const password = input.password && input.password.trim() ? input.password : '123456';
    const password_hash = hashPassword(password);
    const pin_hash = input.pin && input.pin.trim() ? hashPin(input.pin.trim()) : null;

    const stmt = db.prepare(`
      INSERT INTO users (uuid, username, display_name, password_hash, pin_hash, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `);

    const result = stmt.run(
      uuid,
      input.username.trim(),
      input.display_name.trim(),
      password_hash,
      pin_hash,
      input.role
    );

    const insertedId = Number(result.lastInsertRowid);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(insertedId) as User;

    if (actorUserId) {
      this.auditService.log({
        userId: actorUserId,
        action: 'CREATE_USER',
        entityType: 'users',
        entityId: insertedId,
        details: { username: input.username, role: input.role },
      });
    }

    return this.toSafeUser(user);
  }

  /**
   * جلب قائمة جميع المستخدمين
   */
  listUsers(): SafeUser[] {
    const db = this.getDb();
    const users = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as User[];
    return users.map((u) => this.toSafeUser(u));
  }

  /**
   * جلب مستخدم بواسطة ID
   */
  getUserById(id: number): SafeUser | null {
    const db = this.getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return user ? this.toSafeUser(user) : null;
  }

  /**
   * تحديث بيانات مستخدم
   */
  updateUser(id: number, input: UpdateUserInput, actorUserId?: number): SafeUser {
    const db = this.getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(input.display_name.trim());
    }

    if (input.role !== undefined) {
      if (input.role === USER_ROLES.OWNER && !isAllowedAdminUsername(user.username)) {
        throw new Error('غير مصرح بترقية هذا المستخدم إلى مدير/مالك. الحسابات الإدارية المعتمدة محددة مسبقاً فقط.');
      }
      updates.push('role = ?');
      params.push(input.role);
    }

    if (input.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(input.is_active);
    }

    if (input.password && input.password.trim()) {
      updates.push('password_hash = ?');
      params.push(hashPassword(input.password.trim()));
    }

    if (input.pin !== undefined) {
      updates.push('pin_hash = ?');
      params.push(input.pin && input.pin.trim() ? hashPin(input.pin.trim()) : null);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;

    if (actorUserId) {
      this.auditService.log({
        userId: actorUserId,
        action: 'UPDATE_USER',
        entityType: 'users',
        entityId: id,
        details: { changes: input },
      });
    }

    return this.toSafeUser(updatedUser);
  }

  /**
   * تبديل حالة تفعيل المستخدم (تفعيل / تعطيل)
   */
  toggleUserActive(id: number, actorUserId?: number): SafeUser {
    const db = this.getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    // منع تعطيل المالك الأخير للنظام
    if (user.role === USER_ROLES.OWNER && user.is_active === 1) {
      const activeOwners = db
        .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND is_active = 1")
        .get() as { count: number };
      if (activeOwners.count <= 1) {
        throw new Error('لا يمكن تعطيل المالك الوحيد النشط للنظام');
      }
    }

    const newActiveState = user.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newActiveState, id);

    if (actorUserId) {
      this.auditService.log({
        userId: actorUserId,
        action: newActiveState === 1 ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entityType: 'users',
        entityId: id,
        details: { username: user.username },
      });
    }

    return this.getUserById(id)!;
  }

  /**
   * تغيير كلمة المرور بواسطة المستخدم نفسه
   */
  changePassword(userId: number, oldPass: string, newPass: string): boolean {
    const db = this.getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    if (!user) return false;

    if (!verifyPassword(oldPass, user.password_hash)) {
      return false;
    }

    const newHash = hashPassword(newPass);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

    this.auditService.log({
      userId,
      action: 'CHANGE_PASSWORD',
      entityType: 'users',
      entityId: userId,
      details: { username: user.username },
    });

    return true;
  }

  /**
   * إعادة تعيين كلمة المرور (بواسطة المالك)
   */
  resetPassword(userId: number, newPass: string, actorUserId?: number): boolean {
    const db = this.getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    if (!user) return false;

    const newHash = hashPassword(newPass);
    db.prepare(`
      UPDATE users
      SET password_hash = ?, failed_login_count = 0, locked_until = NULL
      WHERE id = ?
    `).run(newHash, userId);

    if (actorUserId) {
      this.auditService.log({
        userId: actorUserId,
        action: 'RESET_PASSWORD',
        entityType: 'users',
        entityId: userId,
        details: { targetUser: user.username },
      });
    }

    return true;
  }

  /**
   * إعادة تعيين رمز الـ PIN
   */
  resetPin(userId: number, newPin: string, actorUserId?: number): boolean {
    const db = this.getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    if (!user) return false;

    const newPinHash = newPin && newPin.trim() ? hashPin(newPin.trim()) : null;
    db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(newPinHash, userId);

    if (actorUserId) {
      this.auditService.log({
        userId: actorUserId,
        action: 'RESET_PIN',
        entityType: 'users',
        entityId: userId,
        details: { targetUser: user.username },
      });
    }

    return true;
  }

  /**
   * إلغاء تجميد الحساب يدوياً (Unfreeze)
   */
  unlockAccount(userId: number, actorUserId?: number): boolean {
    const db = this.getDb();
    db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?').run(userId);

    if (actorUserId) {
      this.auditService.log({
        userId: actorUserId,
        action: 'UNLOCK_ACCOUNT',
        entityType: 'users',
        entityId: userId,
        details: { unlockedUserId: userId },
      });
    }

    return true;
  }

  /**
   * إنشاء وتأكيد وجود الحسابات الإدارية المعتمدة للمحل (محمد الجوكر وحساب الاختبار)
   */
  seedDefaultOwnerIfNone(): SafeUser | null {
    const db = this.getDb();
    // إزالة أو تعطيل الحساب الافتراضي التجريبي القديم إن وُجد لتعزيز الأمان
    try {
      db.prepare("DELETE FROM users WHERE username = 'admin' AND display_name = 'مدير النظام الرئيسي'").run();
    } catch {
      // في حال كان للحساب القديم سجلات تدقيق أو عمليات مرتبطة، يتم تعطيله بالكامل وسحب الصلاحيات
      try {
        db.prepare(`
          UPDATE users 
          SET is_active = 0, 
              password_hash = 'DISABLED_ACCOUNT', 
              pin_hash = NULL, 
              role = 'cashier' 
          WHERE username = 'admin'
        `).run();
      } catch {
        // تجاهل أي خطأ ثانوي
      }
    }

    let primaryOwner: SafeUser | null = null;
    let seededAny = false;

    for (const admin of ALLOWED_ADMIN_ACCOUNTS) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(admin.username);
      if (!existing) {
        const user = this.createUser({
          username: admin.username,
          display_name: admin.display_name,
          password: admin.password,
          pin: admin.pin,
          role: admin.role,
        });
        if (!primaryOwner) {
          primaryOwner = user;
        }
        seededAny = true;
      }
    }

    return seededAny ? primaryOwner : null;
  }
}

export const authService = new AuthService();
