/**
 * معالجات IPC لسجل التدقيق الأمني والرقابة
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { PERMISSIONS } from '../../../shared/constants/permissions';
import { auditService, AuditFilterOptions } from '../../services/audit.service';
import { rbacService } from '../../services/rbac.service';

export function registerAuditIpcHandlers(): void {
  // التحقق من صلاحية قراءة سجل التدقيق (المالك والمدير)
  function checkAuditPermission() {
    const auth = rbacService.authorize(PERMISSIONS.AUDIT_VIEW);
    if (!auth.allowed) {
      throw new Error(auth.reason || 'الاطلاع على سجل الرقابة مخصص للإدارة فقط');
    }
  }

  // استعراض سجلات التدقيق
  ipcMain.handle(IPC_CHANNELS.AUDIT_LIST, async (_event, filters?: AuditFilterOptions) => {
    try {
      checkAuditPermission();
      const result = auditService.listLogs(filters);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تصدير سجلات التدقيق كـ CSV
  ipcMain.handle(IPC_CHANNELS.AUDIT_EXPORT, async (_event, filters?: AuditFilterOptions) => {
    try {
      checkAuditPermission();
      const csv = auditService.exportToCSV(filters);
      return { success: true, data: csv };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
