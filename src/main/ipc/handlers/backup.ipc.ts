/**
 * معالجات IPC للنسخ الاحتياطي والاسترجاع وإدارة المخاطر
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { PERMISSIONS } from '../../../shared/constants/permissions';
import { backupService } from '../../services/backup.service';
import { rbacService } from '../../services/rbac.service';
import { sessionService } from '../../services/session.service';
import { authService } from '../../services/auth.service';

export function registerBackupIpcHandlers(): void {
  // إنشاء نسخة احتياطية (المدير أو المالك)
  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async (_event, destPath?: string) => {
    try {
      const auth = rbacService.authorize(PERMISSIONS.BACKUP_CREATE);
      if (!auth.allowed) {
        throw new Error(auth.reason || 'غير مصرح بإنشاء نسخة احتياطية');
      }

      const userId = sessionService.getCurrentUserId() ?? undefined;
      const result = await backupService.createBackup(destPath, userId);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // استعادة من نسخة احتياطية (المالك فقط مع تأكيد كلمة المرور)
  ipcMain.handle(
    IPC_CHANNELS.BACKUP_RESTORE,
    async (_event, { backupFilePath, ownerPassword }: { backupFilePath: string; ownerPassword?: string }) => {
      try {
        const auth = rbacService.authorize(PERMISSIONS.BACKUP_RESTORE);
        if (!auth.allowed) {
          throw new Error(auth.reason || 'استعادة البيانات مقتصرة على مالك النظام فقط');
        }

        const currentUser = sessionService.getCurrentUser();
        if (currentUser && ownerPassword) {
          const verified = await authService.loginWithPasswordDetailed(currentUser.username, ownerPassword);
          if (!verified.success) {
            throw new Error('كلمة مرور المالك غير صحيحة، تم إلغاء الاستعادة لحماية البيانات');
          }
        }

        const userId = sessionService.getCurrentUserId() ?? undefined;
        const ok = await backupService.restoreBackup(backupFilePath, userId);
        return { success: true, data: { restored: ok } };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // عرض قائمة النسخ الاحتياطية المتوفرة
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, async (_event, backupDir?: string) => {
    try {
      const list = backupService.listBackups(backupDir);
      return { success: true, data: list };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تصدير لفلاشة USB أو مسار خارجي
  ipcMain.handle(IPC_CHANNELS.BACKUP_EXPORT_USB, async (_event, targetPath: string) => {
    try {
      const auth = rbacService.authorize(PERMISSIONS.BACKUP_CREATE);
      if (!auth.allowed) {
        throw new Error(auth.reason || 'غير مصرح بتصدير نسخة احتياطية');
      }

      const userId = sessionService.getCurrentUserId() ?? undefined;
      const result = await backupService.exportToPath(targetPath, userId);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // التحقق من سلامة قاعدة البيانات
  ipcMain.handle(IPC_CHANNELS.BACKUP_VERIFY_INTEGRITY, async () => {
    try {
      const result = backupService.verifyIntegrity();
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تنفيذ تدوير النسخ وحذف الأقدم من 30 يوماً
  ipcMain.handle(IPC_CHANNELS.BACKUP_ROTATE, async (_event, maxAgeDays?: number) => {
    try {
      const auth = rbacService.authorize(PERMISSIONS.BACKUP_CREATE);
      if (!auth.allowed) {
        throw new Error(auth.reason || 'غير مصرح بإجراء تدوير النسخ');
      }

      const result = backupService.rotateBackups(maxAgeDays ?? 30);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // جلب ملخص وحالة جدولة النسخ الاحتياطي
  ipcMain.handle(IPC_CHANNELS.BACKUP_SCHEDULE_STATUS, async () => {
    try {
      const status = backupService.getBackupScheduleStatus();
      return { success: true, data: status };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
