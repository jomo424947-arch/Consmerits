/**
 * معالجات IPC للمخزون والصلاحية والجرد
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { inventoryService } from '../../services/inventory.service';
import { StockCountScopeType, StockMovementType } from '../../../shared/types/inventory.types';

export function registerInventoryIpcHandlers(): void {
  // رصيد الصنف ودفعاته
  ipcMain.handle(IPC_CHANNELS.INVENTORY_GET_STOCK, async (_event, variantId: number) => {
    try {
      const data = await inventoryService.getVariantStock(variantId);
      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // الدفعات وشيكة الانتهاء
  ipcMain.handle(IPC_CHANNELS.INVENTORY_GET_EXPIRING, async (_event, days: number = 30) => {
    try {
      const data = await inventoryService.getExpiringBatches(days);
      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // سجل حركات المخزون
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_GET_MOVEMENTS,
    async (
      _event,
      filters?: {
        variantId?: number;
        batchId?: number;
        type?: StockMovementType;
        limit?: number;
        offset?: number;
      }
    ) => {
      try {
        const data = await inventoryService.getStockMovements(filters);
        return { success: true, data };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // تسجيل حركة مخزون يدوية
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_RECORD_MOVEMENT,
    async (
      _event,
      params: {
        batchId: number;
        type: StockMovementType;
        qty: number;
        refType?: string | null;
        refId?: number | null;
        userId: number;
        note?: string | null;
      }
    ) => {
      try {
        const movementId = await inventoryService.recordMovement(params);
        return { success: true, data: { movementId } };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // إهلاك منتهي الصلاحية
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_MARK_EXPIRED,
    async (
      _event,
      params: { batchId: number; qty: number; userId: number; note?: string }
    ) => {
      try {
        await inventoryService.markExpired(params.batchId, params.qty, params.userId, params.note);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // تسجيل تستر / عينة
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_MARK_TESTER,
    async (
      _event,
      params: { batchId: number; qty: number; userId: number; note?: string }
    ) => {
      try {
        await inventoryService.markTester(params.batchId, params.qty, params.userId, params.note);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // إنشاء دورة جرد
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_CREATE_COUNT,
    async (
      _event,
      params: {
        scope: StockCountScopeType;
        scopeId?: number | null;
        userId: number;
        variantIds?: number[];
      }
    ) => {
      try {
        const data = await inventoryService.createStockCount(params);
        return { success: true, data };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // قائمة دورات الجرد
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_GET_COUNTS,
    async (_event, filters?: { status?: string; limit?: number }) => {
      try {
        const data = await inventoryService.getStockCounts(filters);
        return { success: true, data };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // جلب دورة جرد بالمعرف
  ipcMain.handle(IPC_CHANNELS.INVENTORY_GET_COUNT_BY_ID, async (_event, countId: number) => {
    try {
      const data = await inventoryService.getStockCountById(countId);
      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // تسليم العد الفعلي
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_SUBMIT_COUNT,
    async (
      _event,
      params: {
        countId: number;
        items: Array<{ variantId: number; countedQty: number; note?: string }>;
        userId: number;
      }
    ) => {
      try {
        await inventoryService.submitCount(params.countId, params.items, params.userId);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // اعتماد الجرد
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_APPROVE_COUNT,
    async (_event, params: { countId: number; approverId: number }) => {
      try {
        await inventoryService.approveCount(params.countId, params.approverId);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // إلغاء الجرد
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_CANCEL_COUNT,
    async (_event, params: { countId: number; userId: number }) => {
      try {
        await inventoryService.cancelCount(params.countId, params.userId);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // التنبيهات الشاملة (صلاحية + نواقص + راكد)
  ipcMain.handle(IPC_CHANNELS.INVENTORY_GET_ALERTS, async () => {
    try {
      const data = await inventoryService.getAlerts();
      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // تقييم المخزون
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_GET_VALUATION,
    async (_event, groupBy?: 'category' | 'brand') => {
      try {
        const data = await inventoryService.getValuation(groupBy);
        return { success: true, data };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );
}
