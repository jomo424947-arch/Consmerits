import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('AuthService (المصادقة وإدارة المستخدمين والحماية)', () => {
  let db: Database.Database;
  let authService: AuthService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    authService = new AuthService(db);
  });

  afterEach(() => {
    db.close();
  });

  test(
    'تسجيل مالك جديد وتسجيل الدخول بكلمة المرور وبـ PIN بنجاح',
    async () => {
      const user = authService.createUser({
        username: 'cashier1',
        display_name: 'أحمد كاشير',
        password: 'password123',
        pin: '9876',
        role: USER_ROLES.CASHIER,
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('cashier1');
      expect(user.role).toBe('cashier');
      expect((user as any).password_hash).toBeUndefined();
      expect((user as any).pin_hash).toBeUndefined();

      // تسجيل الدخول بكلمة المرور
      const loggedInPass = await authService.loginWithPassword('cashier1', 'password123');
      expect(loggedInPass).not.toBeNull();
      expect(loggedInPass?.username).toBe('cashier1');

      // تسجيل الدخول بكلمة مرور خاطئة
      const wrongPass = await authService.loginWithPassword('cashier1', 'wrong');
      expect(wrongPass).toBeNull();

      // تسجيل الدخول بـ PIN
      const loggedInPin = await authService.loginWithPin('9876');
      expect(loggedInPin).not.toBeNull();
      expect(loggedInPin?.username).toBe('cashier1');

      // PIN خاطئ
      const wrongPin = await authService.loginWithPin('0000');
      expect(wrongPin).toBeNull();
    },
    15000
  );

  test('التحقق من رمز PIN للمدير أو المالك بنجاح وفشل للكاشير العادي', async () => {
    authService.createUser({
      username: 'manager1',
      display_name: 'المدير العام',
      password: 'pass',
      pin: '1122',
      role: USER_ROLES.MANAGER,
    });

    authService.createUser({
      username: 'cashier2',
      display_name: 'كاشير مسائي',
      password: 'pass',
      pin: '3344',
      role: USER_ROLES.CASHIER,
    });

    // PIN المدير يرجع true
    const isManager = await authService.verifyManagerPin('1122');
    expect(isManager).toBe(true);

    // PIN الكاشير يرجع false حتى لو كان صحيحاً ككاشير
    const isCashierManager = await authService.verifyManagerPin('3344');
    expect(isCashierManager).toBe(false);

    // PIN وهمي
    const isUnknown = await authService.verifyManagerPin('0000');
    expect(isUnknown).toBe(false);
  });

  test('إتمام الإعداد الأولي عبر المعالج (Setup Wizard) وعدم السماح بإعادته', async () => {
    // التأكد أن النظام غير مهيأ
    expect(authService.isSetupCompleted()).toBe(false);

    const result = await authService.completeInitialSetup({
      storeName: 'بوتيك جوري',
      username: 'shop_owner',
      displayName: 'صاحب المحل',
      password: 'SecurePass123',
      pin: '4321',
    });

    expect(result.success).toBe(true);
    expect(result.user?.username).toBe('shop_owner');
    expect(result.user?.role).toBe(USER_ROLES.OWNER);
    expect(authService.isSetupCompleted()).toBe(true);

    // منع إعادة التهيئة
    const secondSetup = await authService.completeInitialSetup({
      storeName: 'محل آخر',
      username: 'another_owner',
      displayName: 'مالك ثاني',
      password: 'AnotherPass1',
      pin: '5678',
    });
    expect(secondSetup.success).toBe(false);
  });

  test('تجميد الحساب تلقائياً بعد 5 محاولات تسجيل دخول خاطئة وفك التجميد', async () => {
    authService.createUser({
      username: 'cashier_lock_test',
      display_name: 'كاشير الاختبار',
      password: 'correct_password',
      role: USER_ROLES.CASHIER,
    });

    // محاولات 1 إلى 4 خاطئة
    for (let i = 1; i <= 4; i++) {
      const res = await authService.loginWithPasswordDetailed('cashier_lock_test', 'wrong_pass');
      expect(res.success).toBe(false);
      expect(res.attemptsRemaining).toBe(5 - i);
      expect(res.lockedUntil).toBeNull();
    }

    // المحاولة الخامسة: يجب أن يتجمد الحساب
    const res5 = await authService.loginWithPasswordDetailed('cashier_lock_test', 'wrong_pass');
    expect(res5.success).toBe(false);
    expect(res5.attemptsRemaining).toBe(0);
    expect(res5.lockedUntil).not.toBeNull();
    expect(res5.error).toContain('تجميد');

    // محاولة بكلمة المرور الصحيحة أثناء التجميد تفشل أيضاً
    const correctWhileLocked = await authService.loginWithPasswordDetailed(
      'cashier_lock_test',
      'correct_password'
    );
    expect(correctWhileLocked.success).toBe(false);
    expect(correctWhileLocked.error).toContain('تجميد');

    // فك تجميد الحساب
    const user = authService.listUsers().find((u) => u.username === 'cashier_lock_test')!;
    authService.unlockAccount(user.id);

    // تسجيل الدخول الصحيح ينجح الآن
    const successAfterUnlock = await authService.loginWithPasswordDetailed(
      'cashier_lock_test',
      'correct_password'
    );
    expect(successAfterUnlock.success).toBe(true);
  }, 20000);

  test('إدارة المستخدمين: تعديل البيانات، تغيير كلمة المرور، وتعطيل الحساب', () => {
    const created = authService.createUser({
      username: 'user_crud',
      display_name: 'الموظف الجديد',
      password: 'oldpassword',
      role: USER_ROLES.CASHIER,
      pin: '1234',
    });

    // تحديث الاسم والدور
    const updated = authService.updateUser(created.id, {
      display_name: 'الموظف المعتمد',
      role: USER_ROLES.MANAGER,
    });
    expect(updated.display_name).toBe('الموظف المعتمد');
    expect(updated.role).toBe(USER_ROLES.MANAGER);

    // تغيير كلمة المرور
    const changeFailed = authService.changePassword(created.id, 'wrong_old', 'newpass123');
    expect(changeFailed).toBe(false);

    const changeSuccess = authService.changePassword(created.id, 'oldpassword', 'newpass123');
    expect(changeSuccess).toBe(true);

    // تعطيل الحساب
    const deactivated = authService.toggleUserActive(created.id);
    expect(deactivated.is_active).toBe(0);

    // إعادة تفعيل الحساب
    const activated = authService.toggleUserActive(created.id);
    expect(activated.is_active).toBe(1);
  });

  test('قائمة مستخدمي تسجيل الدخول السريع وتحديد الحساب برمز PIN', async () => {
    // تهيئة مالك يدوياً وجلب المستخدمين لشاشة تسجيل الدخول
    authService.createUser({
      username: 'test_owner',
      display_name: 'صاحب المحل',
      password: 'OwnerPass123',
      pin: '4321',
      role: USER_ROLES.OWNER,
    });
    const loginUsers = authService.getLoginUsers();
    expect(loginUsers.length).toBeGreaterThan(0);
    expect(loginUsers[0]).toHaveProperty('id');
    expect(loginUsers[0]).toHaveProperty('username');
    expect(loginUsers[0]).toHaveProperty('display_name');
    expect(loginUsers[0]).toHaveProperty('role');
    expect(loginUsers[0]).toHaveProperty('has_pin');

    // إنشاء مستخدم بكود PIN محدد
    const cashier = authService.createUser({
      username: 'pin_target_user',
      display_name: 'كاشير الورديات',
      password: 'somepassword',
      role: USER_ROLES.CASHIER,
      pin: '7788',
    });

    // تسجيل الدخول مع تحديد الحساب المستهدف وPIN صحيح
    const targetedLogin = await authService.loginWithPinDetailed('7788', cashier.id);
    expect(targetedLogin.success).toBe(true);
    expect(targetedLogin.user?.username).toBe('pin_target_user');

    // تسجيل الدخول مع تحديد الحساب المستهدف وPIN خاطئ
    const wrongTargetPin = await authService.loginWithPinDetailed('0000', cashier.id);
    expect(wrongTargetPin.success).toBe(false);
    expect(wrongTargetPin.error).toContain('رمز PIN غير صحيح');
  });
});
