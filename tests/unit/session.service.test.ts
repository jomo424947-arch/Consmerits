import { describe, test, expect, beforeEach } from 'vitest';
import { SessionService } from '../../src/main/services/session.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('SessionService (خدمة الجلسات)', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    sessionService = new SessionService();
  });

  test('إدارة المستخدم النشط وحالة تسجيل الدخول', () => {
    expect(sessionService.isAuthenticated()).toBe(false);
    expect(sessionService.getCurrentUser()).toBeNull();
    expect(sessionService.getCurrentUserId()).toBeNull();
    expect(sessionService.getCurrentRole()).toBeNull();

    sessionService.setCurrentUser({
      id: 5,
      uuid: 'uuid-5',
      username: 'cashier_session',
      display_name: 'كاشير الجلسة',
      role: USER_ROLES.CASHIER,
      is_active: 1,
      created_at: new Date().toISOString(),
    });

    expect(sessionService.isAuthenticated()).toBe(true);
    expect(sessionService.getCurrentUserId()).toBe(5);
    expect(sessionService.getCurrentRole()).toBe(USER_ROLES.CASHIER);
    expect(sessionService.getCurrentUser()?.username).toBe('cashier_session');

    // تسجيل الخروج
    sessionService.clearSession();
    expect(sessionService.isAuthenticated()).toBe(false);
    expect(sessionService.getCurrentUser()).toBeNull();
  });
});
