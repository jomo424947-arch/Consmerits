/**
 * خدمة التحقق من الصلاحيات والرقابة (RBAC Service)
 * تفحص صلاحيات المستخدمين والورديات، وتدير طلبات تفويض المدير والمالك (Overrides)
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { Permission, hasPermission, getRequiredOverride, PERMISSIONS } from '../../shared/constants/permissions';
import { UserRole, USER_ROLES } from '../../shared/constants/roles';
import { sessionService, SessionService } from './session.service';
import { auditService as globalAuditService, AuditService } from './audit.service';
import { authService as globalAuthService, AuthService } from './auth.service';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredOverride?: 'manager_pin' | 'owner_pin' | null;
}

export class RbacService {
  private db?: Database.Database;
  private sessionService: SessionService;
  private auditService: AuditService;
  private authService: AuthService;

  constructor(
    db?: Database.Database,
    session?: SessionService,
    audit?: AuditService,
    auth?: AuthService
  ) {
    this.db = db;
    this.sessionService = session ?? sessionService;
    this.auditService = audit ?? (db ? new AuditService(db) : globalAuditService);
    this.authService = auth ?? (db ? new AuthService(db, this.auditService) : globalAuthService);
  }

  private getDb(): Database.Database {
    return this.db ?? getDatabase();
  }

  /**
   * جلب دور مستخدم من قاعدة البيانات عبر الـ id
   */
  getUserRole(userId: number): UserRole | null {
    const db = this.getDb();
    const row = db.prepare('SELECT role FROM users WHERE id = ? AND is_active = 1').get(userId) as
      | { role: UserRole }
      | undefined;
    return row?.role ?? null;
  }

  /**
   * التحقق من امتلاك المستخدم للصلاحية المطلوبة
   */
  authorize(permission: Permission, userId?: number): AuthorizationResult {
    let effectiveUserId = userId ?? this.sessionService.getCurrentUserId();
    let role: UserRole | null = null;

    if (effectiveUserId) {
      role = this.getUserRole(effectiveUserId);
    } else {
      role = this.sessionService.getCurrentRole();
    }

    if (!role) {
      return {
        allowed: false,
        reason: 'لم يتم العثور على جلسة مستخدم نشطة أو المستخدم غير نشط',
      };
    }

    // منع الحذف والإلغاء المباشر للفواتير المحفوظة بشكل مطلق لجميع الأدوار
    if (permission === PERMISSIONS.POS_VOID_SAVED_SALE) {
      this.auditService.log({
        userId: effectiveUserId || 0,
        action: 'SECURITY_BLOCKED_VOID_SALE',
        entityType: 'sales',
        details: { reason: 'فواتير البيع المكتملة لا يمكن إلغاؤها إلا عبر مرتجع' },
      });
      return {
        allowed: false,
        reason: 'فواتير البيع المكتملة لا يمكن إلغاؤها مباشرة — الإجراء متاح فقط عبر المرتجعات',
      };
    }

    const isDirectlyAllowed = hasPermission(role, permission);
    if (isDirectlyAllowed) {
      return { allowed: true };
    }

    const override = getRequiredOverride(role, permission);
    if (override) {
      return {
        allowed: false,
        reason: override === 'owner_pin' ? 'يتطلب إذن ورمز PIN للمالك' : 'يتطلب إذن ورمز PIN للمدير',
        requiredOverride: override,
      };
    }

    // محاولة غير مصرح بها تماماً
    if (effectiveUserId) {
      this.auditService.log({
        userId: effectiveUserId,
        action: 'SECURITY_ACCESS_DENIED',
        entityType: 'permission',
        details: { permission, role },
      });
    }

    return {
      allowed: false,
      reason: 'ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء',
    };
  }

  /**
   * تنفيذ تجاوز الصلاحية بواسطة رمز PIN للمدير أو المالك
   */
  async authorizeWithOverridePin(
    permission: Permission,
    pin: string,
    actorUserId?: number
  ): Promise<{ success: boolean; error?: string; authorizedBy?: string }> {
    const role = actorUserId ? this.getUserRole(actorUserId) : this.sessionService.getCurrentRole();
    const requiredOverride = role ? getRequiredOverride(role, permission) : 'manager_pin';

    const db = this.getDb();
    let authorizedUser: { id: number; username: string; role: string; pin_hash: string | null } | undefined;

    if (requiredOverride === 'owner_pin') {
      // فقط المالك يمكنه منح الموافقة
      const owners = db
        .prepare("SELECT id, username, role, pin_hash FROM users WHERE role = 'owner' AND is_active = 1 AND pin_hash IS NOT NULL")
        .all() as { id: number; username: string; role: string; pin_hash: string | null }[];

      for (const owner of owners) {
        if (owner.pin_hash && (await this.authService.verifyPin(pin, owner.pin_hash))) {
          authorizedUser = owner;
          break;
        }
      }
    } else {
      // المدير أو المالك
      const managers = db
        .prepare("SELECT id, username, role, pin_hash FROM users WHERE role IN ('owner', 'manager') AND is_active = 1 AND pin_hash IS NOT NULL")
        .all() as { id: number; username: string; role: string; pin_hash: string | null }[];

      for (const m of managers) {
        if (m.pin_hash && (await this.authService.verifyPin(pin, m.pin_hash))) {
          authorizedUser = m;
          break;
        }
      }
    }

    if (!authorizedUser) {
      this.auditService.log({
        userId: actorUserId ?? 0,
        action: 'SECURITY_OVERRIDE_FAILED',
        entityType: 'permission',
        details: { permission, requiredOverride },
      });
      return { success: false, error: 'رمز PIN غير صحيح أو غير مصرح له بهذه الموافقة' };
    }

    this.auditService.log({
      userId: authorizedUser.id,
      action: 'SECURITY_OVERRIDE_GRANTED',
      entityType: 'permission',
      details: {
        permission,
        actorUserId,
        authorizer: authorizedUser.username,
        authorizerRole: authorizedUser.role,
      },
    });

    return {
      success: true,
      authorizedBy: authorizedUser.username,
    };
  }
}

export const rbacService = new RbacService();
