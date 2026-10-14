/**
 * معالجات IPC للمصادقة وتأكيد الهوية وإدارة الجلسات
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { authService } from '../../services/auth.service';
import { sessionService } from '../../services/session.service';
import { rbacService } from '../../services/rbac.service';
import { auditService } from '../../services/audit.service';
import { Permission } from '../../../shared/constants/permissions';

export function registerAuthIpcHandlers(): void {
  // تسجيل الدخول باسم المستخدم وكلمة المرور
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, credentials: any) => {
    try {
      if (!credentials?.username || !credentials?.password) {
        return { success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' };
      }

      const result = await authService.loginWithPasswordDetailed(
        credentials.username.trim(),
        credentials.password
      );

      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تسجيل الدخول السريع برمز PIN
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN_PIN, async (_event, pinInput: any, maybeUserId?: number) => {
    try {
      const pin = typeof pinInput === 'string' ? pinInput : pinInput?.pin;
      const userId = typeof pinInput === 'object' && pinInput?.userId ? pinInput.userId : maybeUserId;
      if (!pin) {
        return { success: false, error: 'رمز الـ PIN مطلوب' };
      }

      const result = await authService.loginWithPinDetailed(pin.trim(), userId);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // جلب قائمة الحسابات النشطة المتاحة في شاشة الدخول
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_LOGIN_USERS, async () => {
    try {
      const users = authService.getLoginUsers();
      return { success: true, data: users };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تسجيل الخروج وإنهاء الجلسة
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    try {
      const user = sessionService.getCurrentUser();
      if (user) {
        auditService.log({
          userId: user.id,
          action: 'LOGOUT',
          entityType: 'users',
          entityId: user.id,
          details: { username: user.username },
        });
      }
      sessionService.clearSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // التحقق من صلاحية المدير برمز PIN (Manager Override)
  ipcMain.handle(IPC_CHANNELS.AUTH_VERIFY_PIN, async (_event, pin: string) => {
    try {
      const isValid = await authService.verifyManagerPin(pin);
      return { success: isValid };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // جلب المستخدم الحالي المسجل
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_CURRENT_USER, async () => {
    try {
      const user = sessionService.getCurrentUser();
      return { success: true, data: user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تغيير كلمة المرور للمستخدم الحالي
  ipcMain.handle(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, async (_event, data: { oldPass: string; newPass: string }) => {
    try {
      const user = sessionService.getCurrentUser();
      if (!user) {
        return { success: false, error: 'لا توجد جلسة نشطة' };
      }

      const ok = authService.changePassword(user.id, data.oldPass, data.newPass);
      if (!ok) {
        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // إعادة تعيين رمز PIN للمستخدم الحالي
  ipcMain.handle(IPC_CHANNELS.AUTH_RESET_PIN, async (_event, data: { pin: string }) => {
    try {
      const user = sessionService.getCurrentUser();
      if (!user) {
        return { success: false, error: 'لا توجد جلسة نشطة' };
      }

      const ok = authService.resetPin(user.id, data.pin, user.id);
      return { success: ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تفويض استثنائي وتجاوز الصلاحية برمز PIN
  ipcMain.handle(
    IPC_CHANNELS.SYSTEM_OVERRIDE_PIN,
    async (_event, data: { permission: Permission; pin: string }) => {
      try {
        const actorId = sessionService.getCurrentUserId() ?? undefined;
        const result = await rbacService.authorizeWithOverridePin(
          data.permission,
          data.pin,
          actorId
        );
        return result;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // فحص هل تم إعداد وتهيئة النظام مسبقاً
  ipcMain.handle(IPC_CHANNELS.AUTH_CHECK_SETUP_STATUS, async () => {
    try {
      const isSetupCompleted = authService.isSetupCompleted();
      return { success: true, isSetupCompleted };
    } catch (err: any) {
      return { success: false, error: err.message, isSetupCompleted: false };
    }
  });

  // إتمام التهيئة الأولية للمتجر وإنشاء حساب المالك الأول
  ipcMain.handle(IPC_CHANNELS.AUTH_COMPLETE_INITIAL_SETUP, async (_event, data: any) => {
    try {
      const result = await authService.completeInitialSetup(data);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
