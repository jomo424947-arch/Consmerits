/**
 * معالجات IPC للمنتجات والباركود والاستيراد والطباعة
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';
import { productsService } from '../../services/products.service';
import { importService } from '../../services/import.service';
import { barcodePrinter } from '../../printing/barcode-printer';

export function registerProductsIpcHandlers(): void {
  // بحث المنتجات
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_SEARCH, async (_event, query, options) => {
    try {
      const products = await productsService.searchProducts(query, options);
      return { success: true, data: products };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // فحص بالباركود
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_BY_BARCODE, async (_event, barcode) => {
    try {
      const product = await productsService.getProductByBarcode(barcode);
      return { success: true, data: product };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // قائمة المنتجات
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_LIST, async (_event, options) => {
    try {
      const products = await productsService.searchProducts('', options);
      return { success: true, data: products };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تفاصيل منتج واحد
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET, async (_event, id) => {
    try {
      const product = productsService.getProductDetails(id);
      return { success: true, data: product };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // إنشاء منتج
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_CREATE, async (_event, input, actorUserId) => {
    try {
      const product = await productsService.createProduct(input, actorUserId);
      return { success: true, data: product };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تحديث منتج
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_UPDATE, async (_event, id, input, actorUserId) => {
    try {
      const product = await productsService.updateProduct(id, input, actorUserId);
      return { success: true, data: product };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // أرشفة منتج
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_ARCHIVE, async (_event, id, actorUserId) => {
    try {
      await productsService.archiveProduct(id, actorUserId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // تحديث بالجملة
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_BULK_UPDATE, async (_event, input, actorUserId) => {
    try {
      const count = await productsService.bulkUpdate(input, actorUserId);
      return { success: true, data: { updatedCount: count } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // توليد باركود داخلي
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GENERATE_BARCODE, async () => {
    try {
      const barcode = await productsService.generateInternalBarcode();
      return { success: true, data: barcode };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // استيراد ملف إكسيل / CSV
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_IMPORT_EXCEL, async (_event, fileContentOrRows, actorUserId) => {
    try {
      let rows: any[] = [];
      if (typeof fileContentOrRows === 'string') {
        rows = importService.parseCsv(fileContentOrRows);
      } else if (Array.isArray(fileContentOrRows)) {
        rows = fileContentOrRows;
      }

      const validation = importService.validateRows(rows);
      if (validation.invalidRows.length > 0 && validation.validRows.length === 0) {
        return {
          success: false,
          error: 'فشل استيراد الملف لوجود أخطاء في جميع الأسطر',
          validation,
        };
      }

      const result = await importService.executeImport(validation.validRows, actorUserId);
      return { success: true, data: result, validation };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // طباعة ملصقات الباركود
  ipcMain.handle(IPC_CHANNELS.BARCODES_PRINT_LABELS, async (_event, labels) => {
    try {
      const printed = await barcodePrinter.printLabels(labels);
      return { success: true, data: { printed } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
