import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('فحص تكامل إنشاء الحسابات والإعداد الأولي (Admin Integration)', () => {
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

  test('إنشاء حساب مالك عبر معالج الإعداد الأولي بنجاح', async () => {
    // التأكد أن النظام غير مهيأ (لا يوجد مالك)
    expect(authService.isSetupCompleted()).toBe(false);

    // إتمام الإعداد الأولي عبر المعالج
    const result = await authService.completeInitialSetup({
      storeName: 'بوتيك جوري',
      storePhone: '01012345678',
      storeAddress: 'القاهرة',
      username: 'shop_owner',
      displayName: 'صاحب المحل',
      password: 'SecurePass123',
      pin: '4321',
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.username).toBe('shop_owner');
    expect(result.user?.role).toBe(USER_ROLES.OWNER);

    // التأكد أن النظام مهيأ الآن
    expect(authService.isSetupCompleted()).toBe(true);

    // نجاح تسجيل الدخول بكلمة المرور
    const login = await authService.loginWithPasswordDetailed('shop_owner', 'SecurePass123');
    expect(login.success).toBe(true);

    // نجاح تسجيل الدخول بـ PIN
    const pinLogin = await authService.loginWithPinDetailed('4321');
    expect(pinLogin.success).toBe(true);
    expect(pinLogin.user?.username).toBe('shop_owner');
  });

  test('منع إعادة التهيئة الأولية إذا كان المالك موجوداً بالفعل', async () => {
    // إتمام الإعداد الأولي
    await authService.completeInitialSetup({
      storeName: 'بوتيك جوري',
      username: 'first_owner',
      displayName: 'المالك الأول',
      password: 'SecurePass123',
      pin: '1234',
    });

    // محاولة إعادة التهيئة يجب أن تفشل
    const secondSetup = await authService.completeInitialSetup({
      storeName: 'محل آخر',
      username: 'second_owner',
      displayName: 'مالك ثاني',
      password: 'AnotherPass',
      pin: '5678',
    });

    expect(secondSetup.success).toBe(false);
    expect(secondSetup.error).toContain('تم إعداد النظام مسبقاً');
  });

  test('السماح بإنشاء حساب مالك بأي اسم مستخدم عبر الإعداد الأولي', async () => {
    const result = await authService.completeInitialSetup({
      storeName: 'محل الزهور',
      username: 'any_owner_name',
      displayName: 'صاحب المحل',
      password: 'MyPassword!',
      pin: '9999',
    });

    expect(result.success).toBe(true);
    expect(result.user?.username).toBe('any_owner_name');
    expect(result.user?.role).toBe(USER_ROLES.OWNER);
  });

  test('السماح بإنشاء كاشير ومدير صالة بصورة طبيعية', () => {
    const manager = authService.createUser({
      username: 'manager_hassan',
      display_name: 'حسن مدير الفرع',
      password: 'pass',
      pin: '3344',
      role: USER_ROLES.MANAGER,
    });
    expect(manager.role).toBe(USER_ROLES.MANAGER);

    const cashier = authService.createUser({
      username: 'cashier_nour',
      display_name: 'نور كاشير',
      password: 'pass',
      pin: '5566',
      role: USER_ROLES.CASHIER,
    });
    expect(cashier.role).toBe(USER_ROLES.CASHIER);
  });

  test('السماح بإنشاء حساب مالك إضافي عبر createUser بعد الإعداد الأولي', async () => {
    // إعداد أولي
    await authService.completeInitialSetup({
      storeName: 'بوتيك جوري',
      username: 'primary_owner',
      displayName: 'المالك الرئيسي',
      password: 'Password123',
      pin: '1111',
    });

    // إنشاء مالك إضافي يجب أن ينجح
    const secondOwner = authService.createUser({
      username: 'second_owner',
      display_name: 'شريك المحل',
      password: 'PartnerPass',
      pin: '2222',
      role: USER_ROLES.OWNER,
    });

    expect(secondOwner.role).toBe(USER_ROLES.OWNER);
    expect(secondOwner.username).toBe('second_owner');
  });
});
