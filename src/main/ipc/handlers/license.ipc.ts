/**
 * معالجات IPC لنظام الترخيص والتفعيل
 * تربط بين واجهة المستخدم وخدمة الترخيص في العملية الرئيسية
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { licenseService } from '../../services/license.service';

export function registerLicenseIpcHandlers(): void {
  /**
   * فحص حالة التفعيل الحالية
   */
  ipcMain.handle(IPC_CHANNELS.LICENSE_CHECK_STATUS, () => {
    try {
      const status = licenseService.checkActivationStatus();
      return { success: true, ...status };
    } catch (err) {
      console.error('خطا في فحص حالة الترخيص:', err);
      return { success: false, isActivated: false };
    }
  });

  /**
   * تفعيل التطبيق بالمفتاح المدخل
   */
  ipcMain.handle(IPC_CHANNELS.LICENSE_ACTIVATE, (_event, key: string) => {
    try {
      const result = licenseService.activate(key);
      return result;
    } catch (err) {
      console.error('خطا في عملية التفعيل:', err);
      return { success: false, error: 'حدث خطا غير متوقع اثناء التفعيل' };
    }
  });

  /**
   * جلب معرف الجهاز
   */
  ipcMain.handle(IPC_CHANNELS.LICENSE_GET_MACHINE_ID, () => {
    try {
      const machineId = licenseService.getMachineId();
      return { success: true, machineId };
    } catch (err) {
      console.error('خطا في جلب معرف الجهاز:', err);
      return { success: false, machineId: '' };
    }
  });

  /**
   * جلب معلومات الترخيص
   */
  ipcMain.handle(IPC_CHANNELS.LICENSE_GET_INFO, () => {
    try {
      const info = licenseService.getLicenseInfo();
      return { success: true, ...info };
    } catch (err) {
      console.error('خطا في جلب معلومات الترخيص:', err);
      return { success: false };
    }
  });
}
