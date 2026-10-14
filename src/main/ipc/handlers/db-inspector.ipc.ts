/**
 * معالجات IPC لمستكشف وفاحص قاعدة البيانات (Database Inspector IPC Handlers)
 */

import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { dbInspectorService } from '../../services/db-inspector.service';

export function registerDbInspectorIpcHandlers(): void {
  // 1. اختيار ملف قاعدة بيانات من الجهاز عبر نافذة حوار النظام
  ipcMain.handle(IPC_CHANNELS.DB_INSPECTOR_SELECT_FILE, async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'اختر ملف قاعدة بيانات SQLite أو نسخة احتياطية للفحص',
        properties: ['openFile'],
        filters: [
          { name: 'ملفات قواعد بيانات SQLite (*.db, *.sqlite)', extensions: ['db', 'sqlite', 'sqlite3'] },
          { name: 'جميع الملفات (*.*)', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, filePath: result.filePaths[0] };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل فتح نافذة اختيار الملف' };
    }
  });

  // 2. فحص محتويات ملف قاعدة بيانات
  ipcMain.handle(IPC_CHANNELS.DB_INSPECTOR_INSPECT, async (_event, filePath?: string) => {
    try {
      const data = dbInspectorService.inspectDatabase(filePath);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل قراءة وفحص ملف قاعدة البيانات' };
    }
  });

  // 3. الحصول على مسار قاعدة البيانات الحالية للنظام
  ipcMain.handle(IPC_CHANNELS.DB_INSPECTOR_GET_DEFAULT_PATH, async () => {
    try {
      const dbPath = dbInspectorService.getDefaultDbPath();
      return { success: true, data: { path: dbPath } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // 4. الحصول على قائمة النسخ الاحتياطية المتوفرة
  ipcMain.handle(IPC_CHANNELS.DB_INSPECTOR_LIST_BACKUPS, async () => {
    try {
      const backups = dbInspectorService.listBackupFiles();
      return { success: true, data: backups };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
