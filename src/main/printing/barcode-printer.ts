/**
 * محرك طباعة ملصقات الباركود الحرارية الاحترافي (Professional Thermal Barcode Label Engine)
 * يدعم:
 * - توليد باركود حقيقي عالي الكثافة والتباين (EAN-13 و Code-128) عبر JsBarcode
 * - إيقاف التنعيم المضاد للتشويش (shape-rendering: crispEdges) لمنع بهتان الخطوط في الطابعات الحرارية
 * - مقاسات ملصقات قياسية متنوعة (38x25mm، 40x25mm، 50x30mm، 50x25mm، 58x40mm)
 * - استهداف الطابعة النشطة تلقائياً (مثل Xprinter XP-235B) وحفظ اختيار المستخدم
 * - مهلة أمان قصوى (10 ثوانٍ) لمنع تعليق زر الطباعة نهائياً
 * - تفريغ قائمة الطباعة وإلغاء الأوامر العالقة تلقائياً أو يدوياً
 */

import JsBarcode from 'jsbarcode';
import { DOMImplementation, XMLSerializer } from '@xmldom/xmldom';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';

export interface BarcodeLabelData {
  productName: string;
  variantName?: string;
  priceFormatted: string;
  barcode: string;
  copiesCount: number;
}

export interface BarcodePrintOptions {
  printerName?: string;
  labelWidthMm?: number;
  labelHeightMm?: number;
}

export interface SystemPrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number;
  statusText: string;
  isThermalRecommended: boolean;
}

export class BarcodePrinter {
  private db?: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db;
  }

  private getDb(): Database.Database {
    return this.db ?? getDatabase();
  }

  /**
   * جلب اسم المتجر المحفوظ في الإعدادات لعرضه على الملصق
   */
  getStoreName(): string {
    try {
      const db = this.getDb();
      const row = db.prepare("SELECT value FROM settings WHERE key = 'store_name'").get() as
        | { value: string }
        | undefined;
      return row?.value || 'بوتيك جوري';
    } catch {
      return 'بوتيك جوري';
    }
  }

  /**
   * جلب اسم طابعة الباركود المفضلة من الإعدادات
   */
  getConfiguredPrinterName(): string {
    try {
      const db = this.getDb();
      const row = db
        .prepare("SELECT value FROM settings WHERE key = 'barcode_printer_name'")
        .get() as { value: string } | undefined;
      return row?.value || '';
    } catch {
      return '';
    }
  }

  /**
   * توليد كود SVG حقيقي للباركود (EAN-13 أو Code-128) فائق التباين ومناسب للطباعة الحرارية
   */
  generateBarcodeSvg(code: string, width = 2, height = 45): string {
    const cleanCode = (code || '').trim();
    if (!cleanCode) return '';

    try {
      const doc = new DOMImplementation().createDocument(
        'http://www.w3.org/1999/xhtml',
        'html',
        null
      );
      const svgNode = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');

      // فحص هل الكود مكون من 13 رقماً مطابقاً لمعيار EAN-13
      const is13Digits = /^\d{13}$/.test(cleanCode);
      let rendered = false;

      if (is13Digits) {
        try {
          JsBarcode(svgNode, cleanCode, {
            xmlDocument: doc as any,
            format: 'EAN13',
            displayValue: false,
            width,
            height,
            margin: 0,
            background: '#ffffff',
            lineColor: '#000000',
          });
          rendered = true;
        } catch {
          // إذا كان فحص Checksum الخاص بـ EAN-13 غير صحيح نتحول تلقائياً لـ CODE128
        }
      }

      if (!rendered) {
        JsBarcode(svgNode, cleanCode, {
          xmlDocument: doc as any,
          format: 'CODE128',
          displayValue: false,
          width,
          height,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      }

      // تفعيل خصائص الحواف الصلبة لمنع أي بهتان ناتج عن الـ Anti-aliasing في الطابعات الحرارية
      svgNode.setAttribute('shape-rendering', 'crispEdges');
      svgNode.setAttribute('class', 'barcode-svg');

      return new XMLSerializer().serializeToString(svgNode);
    } catch (err) {
      console.error('خطأ أثناء توليد كود SVG للباركود:', err);
      return '';
    }
  }

  /**
   * توليد قالب HTML لملصقات الباركود بمقاس دقيق وخطوط سوداء داكنة
   */
  generateLabelsHtml(
    labels: BarcodeLabelData[],
    labelWidthMm = 38,
    labelHeightMm = 25
  ): string {
    const storeName = this.getStoreName();
    const labelItems: string[] = [];

    // ضبط أبعاد خطوط الباركود بحسب مساحة الملصق
    const barcodeHeightPx = labelHeightMm >= 30 ? 55 : 42;
    const barcodeModuleWidth = labelWidthMm >= 50 ? 2 : 2;

    for (const item of labels) {
      const count = Math.max(1, item.copiesCount);
      const barcodeSvg = this.generateBarcodeSvg(
        item.barcode,
        barcodeModuleWidth,
        barcodeHeightPx
      );

      for (let i = 0; i < count; i++) {
        labelItems.push(`
          <div class="label-card">
            <div class="header-row">
              <span class="store-name">${storeName}</span>
              ${
                item.variantName && item.variantName !== 'الافتراضي'
                  ? `<span class="variant-tag">${item.variantName}</span>`
                  : ''
              }
            </div>

            <div class="product-title">${item.productName}</div>

            <div class="barcode-wrapper">
              <div class="barcode-svg-container">
                ${barcodeSvg}
              </div>
              <div class="barcode-digits">${item.barcode}</div>
            </div>

            <div class="footer-row">
              <span class="price-label">السعر:</span>
              <span class="price-val">${item.priceFormatted}</span>
            </div>
          </div>
        `);
      }
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>طباعة ملصقات الباركود</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            margin: 0;
            size: ${labelWidthMm}mm ${labelHeightMm}mm;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif;
            direction: rtl;
          }
          .label-card {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            max-width: ${labelWidthMm}mm;
            max-height: ${labelHeightMm}mm;
            padding: 1.2mm 1.5mm 1mm 1.5mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
            background: #ffffff;
          }
          .header-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            line-height: 1;
            padding-bottom: 0.3mm;
          }
          .store-name {
            font-size: 6.5pt;
            font-weight: 800;
            color: #000000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 70%;
            text-align: right;
          }
          .variant-tag {
            font-size: 6pt;
            font-weight: 700;
            color: #000000;
            border: 0.5pt solid #000000;
            padding: 0.2mm 1mm;
            border-radius: 1mm;
            white-space: nowrap;
          }
          .product-title {
            font-size: 8pt;
            font-weight: 900;
            color: #000000;
            line-height: 1.15;
            max-height: 2.3em;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-break: break-word;
            width: 100%;
          }
          .barcode-wrapper {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 0.3mm 0;
            flex-grow: 1;
          }
          .barcode-svg-container {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            max-height: 12mm;
            overflow: hidden;
          }
          .barcode-svg {
            width: 96%;
            max-width: 96%;
            height: auto;
            max-height: 11.5mm;
            shape-rendering: crispEdges !important;
            image-rendering: pixelated !important;
            display: block;
          }
          .barcode-digits {
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 7.5pt;
            font-weight: 800;
            letter-spacing: 1.5px;
            color: #000000;
            line-height: 1;
            margin-top: 0.4mm;
          }
          .footer-row {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: baseline;
            gap: 2mm;
            border-top: 0.75pt solid #000000;
            padding-top: 0.4mm;
            line-height: 1;
          }
          .price-label {
            font-size: 6.5pt;
            font-weight: 700;
            color: #000000;
          }
          .price-val {
            font-size: 9pt;
            font-weight: 900;
            color: #000000;
          }
        </style>
      </head>
      <body>
        ${labelItems.join('')}
      </body>
      </html>
    `;
  }

  /**
   * جلب قائمة الطابعات المثبتة على نظام التشغيل مع تصنيف طابعات الباركود الحرارية
   */
  async getSystemPrinters(): Promise<SystemPrinterInfo[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BrowserWindow } = require('electron');
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) {
        return [];
      }

      const rawPrinters = await win.webContents.getPrintersAsync();
      return rawPrinters.map((p: any) => {
        const lowerName = (p.name || '').toLowerCase();
        const isThermal =
          lowerName.includes('xp-') ||
          lowerName.includes('xprinter') ||
          lowerName.includes('235') ||
          lowerName.includes('365') ||
          lowerName.includes('barcode') ||
          lowerName.includes('label') ||
          lowerName.includes('thermal') ||
          lowerName.includes('pos');

        let statusText = 'جاهزة';
        if (p.status !== 0) {
          statusText = 'بها خطأ / غير متصلة';
        }

        return {
          name: p.name,
          displayName: p.displayName || p.name,
          isDefault: Boolean(p.isDefault),
          status: p.status,
          statusText,
          isThermalRecommended: isThermal,
        };
      });
    } catch (err) {
      console.error('فشل جلب قائمة الطابعات من النظام:', err);
      return [];
    }
  }

  /**
   * تحديد اسم الطابعة الأكثر ملاءمة لطباعة الباركود (المحددة يدوياً، أو المحفوظة، أو طابعة Xprinter النشطة)
   */
  async resolveTargetPrinter(explicitName?: string): Promise<string | undefined> {
    if (explicitName && explicitName.trim()) {
      return explicitName.trim();
    }

    const configured = this.getConfiguredPrinterName();
    if (configured && configured.trim()) {
      return configured.trim();
    }

    const printers = await this.getSystemPrinters();
    if (printers.length === 0) return undefined;

    // تفضيل طابعة باركود حرارية بحالة عادية (Online/Normal)
    const onlineThermal = printers.find((p) => p.isThermalRecommended && p.status === 0);
    if (onlineThermal) return onlineThermal.name;

    // أي طابعة باركود حرارية مثبتة
    const anyThermal = printers.find((p) => p.isThermalRecommended);
    if (anyThermal) return anyThermal.name;

    // الطابعة الافتراضية
    const defaultPrinter = printers.find((p) => p.isDefault);
    if (defaultPrinter) return defaultPrinter.name;

    return printers[0]?.name;
  }

  /**
   * تفريغ قائمة انتظار الطباعة وإلغاء أي مهام عالقة أو متوقفة بسبب أخطاء الاتصال
   */
  async clearPrintQueue(
    printerName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { exec } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      if (process.platform === 'win32') {
        if (printerName) {
          const sanitized = printerName.replace(/["';`$]/g, '');
          await execAsync(
            `powershell -NoProfile -Command "Get-PrintJob -PrinterName '${sanitized}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue"`
          );
        } else {
          await execAsync(
            `powershell -NoProfile -Command "Get-Printer | ForEach-Object { Get-PrintJob -PrinterName $_.Name -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue }"`
          );
        }
      }

      return {
        success: true,
        message: 'تم تفريغ قائمة مهام الطباعة وإلغاء الأوامر العالقة بنجاح',
      };
    } catch (err: any) {
      console.error('فشل تفريغ قائمة الطباعة:', err);
      return {
        success: false,
        message: err?.message || 'تعذر تفريغ قائمة الطباعة',
      };
    }
  }

  /**
   * طباعة ملصقات الباركود بحماية كاملة من التعليق مع ضبط المقاسات وتحديد الطابعة
   */
  async printLabels(
    labels: BarcodeLabelData[],
    options?: BarcodePrintOptions
  ): Promise<{ success: boolean; error?: string }> {
    const widthMm = options?.labelWidthMm || 38;
    const heightMm = options?.labelHeightMm || 25;

    try {
      const targetPrinterName = await this.resolveTargetPrinter(options?.printerName);
      const html = this.generateLabelsHtml(labels, widthMm, heightMm);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BrowserWindow } = require('electron');
      if (!BrowserWindow) {
        return { success: true };
      }

      const printWindow = new BrowserWindow({
        show: false,
        width: 400,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      let isFinished = false;

      return await new Promise<{ success: boolean; error?: string }>((resolve) => {
        // حزام أمان قصوي: مهلة 10 ثوانٍ تضمن إغلاق النافذة وعدم تعليق الزر نهائياً
        const safetyTimer = setTimeout(() => {
          if (!isFinished) {
            isFinished = true;
            if (!printWindow.isDestroyed()) {
              printWindow.close();
            }
            resolve({
              success: false,
              error:
                'انتهت مهلة استجابة الطابعة (10 ثوانٍ). يرجى التأكد من توصيل كابل USB، تشغيل الطابعة، وعدم وجود انحشار ورق.',
            });
          }
        }, 10000);

        printWindow.webContents.on('did-fail-load', () => {
          if (!isFinished) {
            isFinished = true;
            clearTimeout(safetyTimer);
            if (!printWindow.isDestroyed()) {
              printWindow.close();
            }
            resolve({
              success: false,
              error: 'تعذر إنشاء وتنسيق قالب ملصقات الباركود',
            });
          }
        });

        printWindow
          .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
          .then(() => {
            // انتظار تحميل الخطوط والريندر
            setTimeout(() => {
              if (isFinished || printWindow.isDestroyed()) return;

              const printOptions: any = {
                silent: true,
                printBackground: true,
                margins: { marginType: 'none' },
                color: false, // أحادي اللون لضمان أقصى تباين في الطابعات الحرارية
              };

              if (targetPrinterName) {
                printOptions.deviceName = targetPrinterName;
              }

              printWindow.webContents.print(
                printOptions,
                (success: boolean, failureReason: string) => {
                  if (!isFinished) {
                    isFinished = true;
                    clearTimeout(safetyTimer);
                    if (!printWindow.isDestroyed()) {
                      printWindow.close();
                    }

                    if (!success) {
                      console.warn('فشل أمر طباعة الباركود الصامت:', failureReason);
                      resolve({
                        success: false,
                        error: failureReason
                          ? `فشل أمر الطباعة: ${failureReason}`
                          : 'رفضت الطابعة أمر الطباعة المباشر، تحقق من منفذ USB والورق',
                      });
                    } else {
                      resolve({ success: true });
                    }
                  }
                }
              );
            }, 350);
          })
          .catch((loadErr: any) => {
            if (!isFinished) {
              isFinished = true;
              clearTimeout(safetyTimer);
              if (!printWindow.isDestroyed()) {
                printWindow.close();
              }
              resolve({
                success: false,
                error: loadErr?.message || 'فشل تحميل بيانات الملصقات للطباعة',
              });
            }
          });
      });
    } catch (err: any) {
      console.error('Barcode printer error:', err);
      return { success: false, error: err?.message || 'حدث خطأ غير متوقع أثناء الطباعة' };
    }
  }
}

export const barcodePrinter = new BarcodePrinter();
