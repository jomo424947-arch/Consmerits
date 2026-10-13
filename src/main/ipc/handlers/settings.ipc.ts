/**
 * معالجات IPC للإعدادات العامة
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { settingsService } from '../../services/settings.service';

export function registerSettingsIpcHandlers(): void {
  // جلب جميع الإعدادات
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    try {
      const data = settingsService.getAll();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تحديث إعداد أو مجموعة إعدادات
  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, updates: { key: string; value: string }[], userId?: number) => {
    try {
      settingsService.bulkUpdate(updates, userId);
      return { success: true, data: settingsService.getAll() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
