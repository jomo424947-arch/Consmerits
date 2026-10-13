/**
 * معالجات IPC للتقارير ولوحة المؤشرات
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { reportsService } from '../../services/reports.service';

export function registerReportsIpcHandlers(): void {
  // لوحة المؤشرات (Dashboard KPIs)
  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_DASHBOARD, async () => {
    try {
      const data = reportsService.getDashboardKpis();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تقرير المبيعات اليومي / الدوري
  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_DAILY, async (_event, filter?: any) => {
    try {
      let filterObj: any = filter;
      if (typeof filter === 'string') {
        filterObj = { startDate: filter, endDate: filter };
      }
      const data = reportsService.getDailySalesReport(filterObj);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تقرير الأرباح والخسائر
  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PROFIT_LOSS, async (_event, filter: { startDate: string; endDate: string }) => {
    try {
      const data = reportsService.getProfitLossReport(filter);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تقرير طرق الدفع
  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PAYMENT_METHODS, async (_event, filter?: any) => {
    try {
      const data = reportsService.getSalesByPaymentMethod(filter);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تقرير حركة وأداء الأصناف (Top sellers & Dead stock)
  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PRODUCT_PERFORMANCE, async (_event, options?: any) => {
    try {
      const data = reportsService.getProductPerformanceReport(options);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // ملخص التدفق النقدي
  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_CASH_FLOW, async (_event, filter: { startDate: string; endDate: string }) => {
    try {
      const data = reportsService.getCashFlowSummary(filter);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
