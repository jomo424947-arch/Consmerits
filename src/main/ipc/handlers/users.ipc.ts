/**
 * معالجات IPC لإدارة المستخدمين وحسابات الموظفين (Owner Only)
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { PERMISSIONS } from '../../../shared/constants/permissions';
import { authService } from '../../services/auth.service';
import { rbacService } from '../../services/rbac.service';
import { sessionService } from '../../services/session.service';
import { CreateUserInput, UpdateUserInput } from '../../../shared/types/users.types';

export function registerUsersIpcHandlers(): void {
  // فحص حارس الصلاحية
  function checkOwnerPermission() {
    const auth = rbacService.authorize(PERMISSIONS.USERS_MANAGE);
    if (!auth.allowed) {
      throw new Error(auth.reason || 'إدارة المستخدمين مقتصرة على مالك النظام فقط');
    }
  }

  // عرض قائمة المستخدمين
  ipcMain.handle(IPC_CHANNELS.USERS_LIST, async () => {
    try {
      checkOwnerPermission();
      const users = authService.listUsers();
      return { success: true, data: users };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // جلب مستخدم محدد
  ipcMain.handle(IPC_CHANNELS.USERS_GET, async (_event, id: number) => {
    try {
      checkOwnerPermission();
      const user = authService.getUserById(id);
      return { success: true, data: user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // إضافة مستخدم جديد
  ipcMain.handle(IPC_CHANNELS.USERS_CREATE, async (_event, input: CreateUserInput) => {
    try {
      checkOwnerPermission();
      const actorId = sessionService.getCurrentUserId() ?? undefined;
      const newUser = authService.createUser(input, actorId);
      return { success: true, data: newUser };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تعديل مستخدم
  ipcMain.handle(
    IPC_CHANNELS.USERS_UPDATE,
    async (_event, { id, input }: { id: number; input: UpdateUserInput }) => {
      try {
        checkOwnerPermission();
        const actorId = sessionService.getCurrentUserId() ?? undefined;
        const updated = authService.updateUser(id, input, actorId);
        return { success: true, data: updated };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // تفعيل / تعطيل مستخدم
  ipcMain.handle(IPC_CHANNELS.USERS_TOGGLE_ACTIVE, async (_event, id: number) => {
    try {
      checkOwnerPermission();
      const actorId = sessionService.getCurrentUserId() ?? undefined;
      const updated = authService.toggleUserActive(id, actorId);
      return { success: true, data: updated };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // إعادة تعيين كلمة مرور مستخدم
  ipcMain.handle(
    IPC_CHANNELS.USERS_RESET_PASSWORD,
    async (_event, { id, newPassword }: { id: number; newPassword: string }) => {
      try {
        checkOwnerPermission();
        const actorId = sessionService.getCurrentUserId() ?? undefined;
        const ok = authService.resetPassword(id, newPassword, actorId);
        return { success: ok };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // إلغاء تجميد الحساب يدوياً
  ipcMain.handle(IPC_CHANNELS.USERS_UNLOCK, async (_event, id: number) => {
    try {
      checkOwnerPermission();
      const actorId = sessionService.getCurrentUserId() ?? undefined;
      const ok = authService.unlockAccount(id, actorId);
      return { success: ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
