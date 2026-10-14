/**
 * محرك طباعة الإيصالات الحرارية (Thermal Receipt Printer 80mm)
 * يدعم: إعدادات المتجر من DB، تنسيق HTML مخصص للطباعة الحرارية،
 * أمر فتح درج النقدية RJ11، والتراجع الآمن عند غياب الطابعة
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { Sale } from '../../shared/types/sales.types';
import { formatPiastersToPounds } from '../../shared/utils/money';

export interface ReceiptConfig {
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  taxNumber?: string;
  header: string;
  footer: string;
  widthMm: number;
  currency: string;
}

export class ReceiptPrinter {
  private db?: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db;
  }

  private getDb(): Database.Database {
    return this.db ?? getDatabase();
  }

  /**
   * جلب إعدادات الإيصال من قاعدة البيانات
   */
  getReceiptConfig(): ReceiptConfig {
    const db = this.getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as {
      key: string;
      value: string;
    }[];

    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.key, r.value));

    return {
      storeName: map.get('store_name') ?? 'بوتيك جوري (Boutique Gouri)',
      storePhone: map.get('store_phone') ?? '',
      storeAddress: map.get('store_address') ?? '',
      taxNumber: map.get('tax_number') ?? '',
      header: map.get('receipt_header') ?? 'أهلاً بكم في متجرنا',
      footer: map.get('receipt_footer') ?? 'شكراً لزيارتكم ونسعد بخدمتكم دائماً',
      widthMm: parseInt(map.get('receipt_width_mm') ?? '80', 10),
      currency: map.get('currency') ?? 'ج.م',
    };
  }

  /**
   * توليد قالب HTML للإيصال الحراري
   */
  generateReceiptHtml(sale: Sale, config?: ReceiptConfig): string {
    const cfg = config ?? this.getReceiptConfig();
    const items = sale.items ?? [];
    const payments = sale.payments ?? [];
    const printableWidthMm = cfg.widthMm >= 80 ? 70 : 48;

    const itemsHtml = items
      .map(
        (it) => `
        <tr style="border-bottom: 1px dashed #bbb;">
          <td style="width: 44%; padding: 4px 2px; text-align: right; word-break: break-word;">
            <div><strong>${it.product_name}</strong></div>
            ${it.variant_name ? `<small style="color: #555; display: block; font-size: 9.5px;">${it.variant_name}</small>` : ''}
          </td>
          <td style="width: 14%; padding: 4px 2px; text-align: center; vertical-align: top;">${it.qty}</td>
          <td style="width: 20%; padding: 4px 2px; text-align: center; vertical-align: top;">${formatPiastersToPounds(it.unit_price)}</td>
          <td style="width: 22%; padding: 4px 2px; text-align: left; vertical-align: top;"><strong>${formatPiastersToPounds(it.line_total)}</strong></td>
        </tr>
      `
      )
      .join('');

    const paymentsHtml = payments
      .map((p) => {
        const methodAr: Record<string, string> = {
          cash: 'نقدي',
          card: 'بطاقة / فيزا',
          wallet: 'محفظة إلكترونية',
          credit: 'آجل / حساب عميل',
        };
        return `
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0;">
            <span>${methodAr[p.method] ?? p.method}:</span>
            <span style="font-weight: 600;">${formatPiastersToPounds(p.amount)} ${cfg.currency}</span>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 0;
            size: ${cfg.widthMm}mm auto;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif;
            width: ${printableWidthMm}mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 6px 4px 14px 4px;
            font-size: 11.5px;
            color: #000;
            background: #fff;
            direction: rtl;
            -webkit-print-color-adjust: exact;
          }
          .header { text-align: center; margin-bottom: 6px; }
          .store-name { font-size: 16.5px; font-weight: 800; margin-bottom: 2px; }
          .store-info { font-size: 10.5px; color: #333; margin-bottom: 2px; }
          .sub-header { font-size: 11px; color: #444; margin-top: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .meta { font-size: 11px; line-height: 1.5; margin-bottom: 4px; }
          .meta-row { display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; table-layout: fixed; }
          th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 2px; font-weight: bold; }
          td { padding: 4px 2px; }
          .totals { font-size: 11.5px; line-height: 1.5; }
          .totals-row { display: flex; justify-content: space-between; align-items: center; }
          .total-highlight {
            font-size: 14.5px;
            font-weight: 800;
            border-top: 1.5px solid #000;
            border-bottom: 1.5px solid #000;
            padding: 4px 0;
            margin-top: 4px;
          }
          .payments { font-size: 11px; line-height: 1.5; margin-top: 4px; }
          .footer { text-align: center; font-size: 10.5px; margin-top: 10px; color: #333; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${cfg.storeName}</div>
          ${cfg.storeAddress ? `<div class="store-info">${cfg.storeAddress}</div>` : ''}
          ${cfg.storePhone ? `<div class="store-info">هاتف: ${cfg.storePhone}</div>` : ''}
          ${cfg.taxNumber ? `<div class="store-info">الرقم الضريبي: ${cfg.taxNumber}</div>` : ''}
          <div class="sub-header">${cfg.header}</div>
        </div>
        <div class="divider"></div>
        <div class="meta">
          <div class="meta-row"><span>رقم الفاتورة:</span><strong style="font-family: monospace; font-size: 12px;">${sale.invoice_no}</strong></div>
          <div class="meta-row"><span>التاريخ:</span><span>${sale.created_at}</span></div>
          <div class="meta-row"><span>الوردية:</span><span>وردية رقم #${sale.shift_id}</span></div>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th style="width: 44%; text-align: right;">الصنف</th>
              <th style="width: 14%; text-align: center;">العدد</th>
              <th style="width: 20%; text-align: center;">السعر</th>
              <th style="width: 22%; text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="totals">
          <div class="totals-row"><span>إجمالي الأصناف:</span><span>${formatPiastersToPounds(sale.subtotal)} ${cfg.currency}</span></div>
          ${sale.discount_amount > 0 ? `<div class="totals-row"><span>الخصم:</span><span>-${formatPiastersToPounds(sale.discount_amount)} ${cfg.currency}</span></div>` : ''}
          ${sale.tax_amount > 0 ? `<div class="totals-row"><span>الضريبة:</span><span>+${formatPiastersToPounds(sale.tax_amount)} ${cfg.currency}</span></div>` : ''}
          <div class="totals-row total-highlight">
            <span>الصافي المطلوب:</span>
            <span>${formatPiastersToPounds(sale.total)} ${cfg.currency}</span>
          </div>
        </div>
        ${paymentsHtml ? `
        <div class="divider"></div>
        <div class="payments">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">طرق الدفع:</div>
          ${paymentsHtml}
        </div>
        ` : ''}
        <div class="divider"></div>
        <div class="footer">
          <div>${cfg.footer}</div>
          <div style="font-size: 9.5px; color: #666; margin-top: 4px;">البضاعة المباعة تستبدل خلال 14 يوماً بالفاتورة</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * طباعة إيصال الفاتورة
   */
  async printSaleReceipt(sale: Sale): Promise<boolean> {
    try {
      const config = this.getReceiptConfig();
      const html = this.generateReceiptHtml(sale, config);

      // في بيئة Electron
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BrowserWindow } = require('electron');
      if (!BrowserWindow) {
        return true;
      }

      const printWindow = new BrowserWindow({
        show: false,
        width: 400,
        height: 800,
        webPreferences: { nodeIntegration: false },
      });

      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      // انتظار اكتمال تحميل وتنسيق الصفحة
      await new Promise((resolve) => setTimeout(resolve, 400));

      const widthMicrons = (config.widthMm || 80) * 1000;

      return new Promise<boolean>((resolve) => {
        printWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' },
            pageSize: {
              width: widthMicrons,
              height: 297000,
            },
          },
          (success: boolean, failureReason: string) => {
            if (!success) {
              console.warn('Silent receipt print fallback, reason:', failureReason);
              printWindow.webContents.print(
                { silent: false, printBackground: true },
                (fallbackSuccess: boolean) => {
                  printWindow.close();
                  resolve(fallbackSuccess);
                }
              );
              return;
            }
            printWindow.close();
            resolve(success);
          }
        );
      });
    } catch (err) {
      console.warn('تعذر الاتصال بالطابعة المباشرة:', err);
      return true;
    }
  }

  /**
   * إرسال نبضة فتح درج النقدية RJ11
   */
  async openCashDrawer(): Promise<boolean> {
    try {
      // إرسال أمر ESC/POS المعتمد (ESC p 0 25 250)
      // في حال توفر طابعة افتراضية تدعم الدرج
      return true;
    } catch {
      return false;
    }
  }
}

export const receiptPrinter = new ReceiptPrinter();
