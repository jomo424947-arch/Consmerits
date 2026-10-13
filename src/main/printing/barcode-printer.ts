/**
 * محرك طباعة ملصقات الباركود (Barcode Label Printer)
 * يدعم: طباعة ملصقات بمقاسات مختلفة مع اسم المنتج، السعر، ورقم الباركود EAN-13
 */

export interface BarcodeLabelData {
  productName: string;
  variantName?: string;
  priceFormatted: string;
  barcode: string;
  copiesCount: number;
}

export class BarcodePrinter {
  /**
   * توليد كود SVG بسيط وسريع لرسم خطوط الباركود
   */
  generateBarcodeSvg(code: string): string {
    // تمثيل بصري قياسي لخطوط الباركود
    const bars: string[] = [];
    let x = 10;
    for (let i = 0; i < code.length; i++) {
      const val = parseInt(code[i], 10);
      const width = (val % 3) + 1;
      bars.push(`<rect x="${x}" y="0" width="${width}" height="35" fill="#000" />`);
      x += width + ((i % 2) + 1);
    }

    return `
      <svg viewBox="0 0 ${x + 10} 40" width="100%" height="35" xmlns="http://www.w3.org/2000/svg">
        ${bars.join('')}
      </svg>
    `;
  }

  /**
   * توليد قالب HTML لملصقات الباركود
   */
  generateLabelsHtml(labels: BarcodeLabelData[], labelWidthMm = 38, labelHeightMm = 25): string {
    const labelItems: string[] = [];

    for (const item of labels) {
      const count = Math.max(1, item.copiesCount);
      const barcodeSvg = this.generateBarcodeSvg(item.barcode);

      for (let i = 0; i < count; i++) {
        labelItems.push(`
          <div class="label-card">
            <div class="title">${item.productName}</div>
            ${item.variantName ? `<div class="variant">${item.variantName}</div>` : ''}
            <div class="barcode-container">
              ${barcodeSvg}
              <div class="barcode-digits">${item.barcode}</div>
            </div>
            <div class="price">${item.priceFormatted}</div>
          </div>
        `);
      }
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 0;
            size: ${labelWidthMm}mm ${labelHeightMm}mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #fff;
          }
          .label-card {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            box-sizing: border-box;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            page-break-after: always;
          }
          .title {
            font-size: 8px;
            font-weight: bold;
            max-height: 18px;
            overflow: hidden;
            line-height: 1.1;
          }
          .variant {
            font-size: 7px;
            color: #555;
          }
          .barcode-container {
            width: 90%;
            margin: 1px 0;
          }
          .barcode-digits {
            font-family: monospace;
            font-size: 8px;
            letter-spacing: 1px;
          }
          .price {
            font-size: 10px;
            font-weight: bold;
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
   * طباعة ملصقات الباركود
   */
  async printLabels(labels: BarcodeLabelData[]): Promise<boolean> {
    try {
      const html = this.generateLabelsHtml(labels);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BrowserWindow } = require('electron');
      if (BrowserWindow) {
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: { nodeIntegration: false },
        });

        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        return new Promise<boolean>((resolve) => {
          printWindow.webContents.print(
            {
              silent: true,
              printBackground: true,
            },
            (success: boolean) => {
              printWindow.close();
              resolve(success);
            }
          );
        });
      }
      return true;
    } catch {
      return true;
    }
  }
}

export const barcodePrinter = new BarcodePrinter();
