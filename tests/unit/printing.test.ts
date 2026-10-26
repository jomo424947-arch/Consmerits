/**
 * اختبارات وحدة شاملة لمنظومة الطباعة (Receipt & Barcode Printing System)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { receiptPrinter, ReceiptPrinter } from '../../src/main/printing/receipt-printer';
import { barcodePrinter, BarcodePrinter } from '../../src/main/printing/barcode-printer';
import { generateCode128Svg } from '../../src/shared/utils/barcode';
import { Sale } from '../../src/shared/types/sales.types';

describe('منظومة الطباعة المحدثة (Printing System)', () => {
  let db: any;

  beforeEach(() => {
    const settingsMap: Record<string, string> = {
      store_name: 'بوتيك جوري للاختبار',
      receipt_header: 'أهلاً وسهلاً',
      receipt_footer: 'شكراً لزيارتكم',
      receipt_width_mm: '80',
      currency_symbol: 'ج.م',
      barcode_printer_name: 'XP-235B',
    };

    db = {
      prepare: (sql: string) => ({
        all: () => Object.entries(settingsMap).map(([key, value]) => ({ key, value })),
        get: (param?: any) => {
          if (sql.includes("key = 'store_name'")) return { value: settingsMap.store_name };
          if (sql.includes("key = 'barcode_printer_name'")) return { value: settingsMap.barcode_printer_name };
          if (sql.includes("key = 'printer_name'")) return { value: settingsMap.printer_name };
          if (sql.includes('users') && param) return { display_name: 'كاشير المحل' };
          return undefined;
        },
      }),
      exec: () => {},
    };
  });

  test('توليد باركود Code128 SVG نقي بدقة عالية دون أخطاء', () => {
    const svg = generateCode128Svg('INV-20261016-001', 38);
    expect(svg).toBeDefined();
    expect(svg.includes('<svg')).toBe(true);
    expect(svg.includes('rect')).toBe(true);
    expect(svg.includes('INV-20261016-001')).toBe(false); // Code128 SVG يحتوي على المستطيلات فقط
  });

  test('محرك الإيصالات يقرأ الإعدادات بنجاح من قاعدة البيانات مع التخزين المؤقت للشعار', () => {
    const printer = new ReceiptPrinter(db);
    const config1 = printer.getReceiptConfig();
    expect(config1.storeName).toBe('بوتيك جوري للاختبار');
    expect(config1.widthMm).toBe(80);
    expect(config1.currency).toBe('ج.م');

    // استدعاء ثاني يتأكد من استقرار الذاكرة المؤقتة للشعار
    const config2 = printer.getReceiptConfig();
    expect(config2.storeName).toBe('بوتيك جوري للاختبار');
  });

  test('توليد قالب HTML للإيصال الحراري بجميع البنود والباركود وطرق الدفع', () => {
    const printer = new ReceiptPrinter(db);
    const sampleSale: Sale = {
      id: 1,
      uuid: 'sale-test-uuid',
      seq_no: 1,
      user_id: 1,
      shift_id: 1,
      invoice_no: 'INV-00123',
      subtotal: 30000,
      discount_amount: 5000,
      tax_amount: 0,
      total: 25000,
      status: 'completed',
      created_at: '2026-10-16 12:00:00',
      items: [
        {
          id: 1,
          sale_id: 1,
          variant_id: 10,
          batch_id: 100,
          product_name: 'أحمر شفاه مات فائق الثبات',
          variant_name: 'لون أحمر ناري',
          qty: 2,
          unit_price: 15000,
          unit_cost: 8000,
          discount_amount: 5000,
          line_total: 25000,
        },
      ],
      payments: [
        {
          id: 1,
          sale_id: 1,
          method: 'cash',
          amount: 30000,
        },
      ],
    };

    const html = printer.generateReceiptHtml(sampleSale);
    expect(html).toBeDefined();
    expect(html.includes('INV-00123')).toBe(true);
    expect(html.includes('أحمر شفاه مات فائق الثبات')).toBe(true);
    expect(html.includes('لون أحمر ناري')).toBe(true);
    expect(html.includes('250.00')).toBe(true);
    expect(html.includes('نقدي (كاش)')).toBe(true);
    expect(html.includes('بوتيك جوري للاختبار')).toBe(true);
  });

  test('تحديد الطابعة المستهدفة للباركود يفضل الطابعة المحفوظة أو المتصلة بنجاح', async () => {
    const printer = new BarcodePrinter(db);
    const mockPrinters = [
      {
        name: 'HP LaserJet 1020',
        displayName: 'HP LaserJet 1020',
        isDefault: true,
        status: 0,
        statusText: 'جاهزة ومتصلة',
        isThermalRecommended: false,
      },
      {
        name: 'XP-235B',
        displayName: 'Xprinter XP-235B',
        isDefault: false,
        status: 0,
        statusText: 'جاهزة ومتصلة',
        isThermalRecommended: true,
      },
    ];

    // يجب أن تختار XP-235B لأنها المحفوظة في إعدادات DB ومتصلة (status === 0)
    const target = await printer.resolveTargetPrinter(undefined, mockPrinters);
    expect(target).toBe('XP-235B');

    // إذا طُلب صراحة اسم طابعة أخرى متصلة
    const targetExplicit = await printer.resolveTargetPrinter('HP LaserJet 1020', mockPrinters);
    expect(targetExplicit).toBe('HP LaserJet 1020');
  });
});
