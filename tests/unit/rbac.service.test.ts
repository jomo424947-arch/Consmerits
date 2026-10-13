import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { RbacService } from '../../src/main/services/rbac.service';
import { AuthService } from '../../src/main/services/auth.service';
import { SessionService } from '../../src/main/services/session.service';
import { AuditService } from '../../src/main/services/audit.service';
import { PERMISSIONS, hasPermission } from '../../src/shared/constants/permissions';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('RbacService (نظام التحكم بالوصول ومصفوفة الصلاحيات RBAC)', () => {
  let db: Database.Database;
  let authService: AuthService;
  let sessionService: SessionService;
  let auditService: AuditService;
  let rbacService: RbacService;

  let ownerUser: any;
  let managerUser: any;
  let cashierUser: any;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    auditService = new AuditService(db);
    sessionService = new SessionService();
    authService = new AuthService(db, auditService, sessionService);
    rbacService = new RbacService(db, sessionService, auditService, authService);

    ownerUser = authService.createUser({
      username: 'test_admin',
      display_name: 'صاحب المحل',
      password: 'pass',
      pin: '1111',
      role: USER_ROLES.OWNER,
    });

    managerUser = authService.createUser({
      username: 'manager_user',
      display_name: 'مدير الصالة',
      password: 'pass',
      pin: '2222',
      role: USER_ROLES.MANAGER,
    });

    cashierUser = authService.createUser({
      username: 'cashier_user',
      display_name: 'الكاشير',
      password: 'pass',
      pin: '3333',
      role: USER_ROLES.CASHIER,
    });
  });

  afterEach(() => {
    db.close();
  });

  test('التحقق المباشر من مصفوفة الصلاحيات حسب الدور (Role Permissions)', () => {
    // 1. المالك يمتلك رؤية الأرباح وإدارة المستخدمين والنسخ والاسترجاع
    expect(hasPermission(USER_ROLES.OWNER, PERMISSIONS.REPORTS_VIEW_PROFIT)).toBe(true);
    expect(hasPermission(USER_ROLES.OWNER, PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPermission(USER_ROLES.OWNER, PERMISSIONS.BACKUP_RESTORE)).toBe(true);

    // 2. المدير محجوب عنه أرباح المالك الصافية واسترجاع النسخ وإدارة المستخدمين
    expect(hasPermission(USER_ROLES.MANAGER, PERMISSIONS.REPORTS_VIEW_PROFIT)).toBe(false);
    expect(hasPermission(USER_ROLES.MANAGER, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(hasPermission(USER_ROLES.MANAGER, PERMISSIONS.BACKUP_RESTORE)).toBe(false);
    // لكن يملك صلاحية البيع وتعديل الأسعار واعتماد الجرد
    expect(hasPermission(USER_ROLES.MANAGER, PERMISSIONS.POS_SCAN_AND_SELL)).toBe(true);
    expect(hasPermission(USER_ROLES.MANAGER, PERMISSIONS.PRODUCTS_EDIT_PRICE)).toBe(true);
    expect(hasPermission(USER_ROLES.MANAGER, PERMISSIONS.INVENTORY_APPROVE_ADJUSTMENT)).toBe(true);

    // 3. الكاشير محجوب عنه تكلفة الشراء وتعديل الأسعار والتقارير المالية
    expect(hasPermission(USER_ROLES.CASHIER, PERMISSIONS.PRODUCTS_VIEW_COST)).toBe(false);
    expect(hasPermission(USER_ROLES.CASHIER, PERMISSIONS.PRODUCTS_EDIT_PRICE)).toBe(false);
    expect(hasPermission(USER_ROLES.CASHIER, PERMISSIONS.REPORTS_VIEW_STANDARD)).toBe(false);
    // ويملك فقط وظائف الكاشير الأساسية
    expect(hasPermission(USER_ROLES.CASHIER, PERMISSIONS.POS_SCAN_AND_SELL)).toBe(true);
    expect(hasPermission(USER_ROLES.CASHIER, PERMISSIONS.POS_APPLY_DISCOUNT_LOW)).toBe(true);
  });

  test('فحص التخويل المباشر عبر الجلسة النشطة (Active Session Authorization)', () => {
    // تعيين الكاشير في الجلسة
    sessionService.setCurrentUser(cashierUser);

    const cashierSell = rbacService.authorize(PERMISSIONS.POS_SCAN_AND_SELL);
    expect(cashierSell.allowed).toBe(true);

    // محاولة الكاشير الاطلاع على التكاليف ترفض صراحة
    const cashierCost = rbacService.authorize(PERMISSIONS.PRODUCTS_VIEW_COST);
    expect(cashierCost.allowed).toBe(false);

    // محاولة الكاشير تطبيق خصم أعلى من 5% تتطلب PIN مدير
    const cashierHighDiscount = rbacService.authorize(PERMISSIONS.POS_APPLY_DISCOUNT_HIGH);
    expect(cashierHighDiscount.allowed).toBe(false);
    expect(cashierHighDiscount.requiredOverride).toBe('manager_pin');
  });

  test('منع إلغاء الفاتورة المحفوظة نهائياً لجميع الأدوار (Zero Void on Saved Sales)', () => {
    // المالك نفسه لا يمكنه إلغاء فاتورة بيع مكتملة (التصحيح فقط عبر مرتجع)
    sessionService.setCurrentUser(ownerUser);
    const voidAttempt = rbacService.authorize(PERMISSIONS.POS_VOID_SAVED_SALE);
    expect(voidAttempt.allowed).toBe(false);
    expect(voidAttempt.reason).toContain('مرتجع');
  });

  test('تجاوز الصلاحية بنجاح عبر رمز PIN للمدير والمالك (Manager Override)', async () => {
    // الكاشير يحتاج تفويض لتطبيق خصم استثنائي
    const overrideSuccess = await rbacService.authorizeWithOverridePin(
      PERMISSIONS.POS_APPLY_DISCOUNT_HIGH,
      '2222', // PIN المدير
      cashierUser.id
    );

    expect(overrideSuccess.success).toBe(true);
    expect(overrideSuccess.authorizedBy).toBe('manager_user');

    // محاولة إدخال PIN خاطئ تفشل
    const overrideFail = await rbacService.authorizeWithOverridePin(
      PERMISSIONS.POS_APPLY_DISCOUNT_HIGH,
      '9999',
      cashierUser.id
    );

    expect(overrideFail.success).toBe(false);
  });
});
