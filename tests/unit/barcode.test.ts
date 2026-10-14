/**
 * اختبارات الوحدة للتحقق من صحة وتوليد باركود EAN-13
 */

import { describe, test, expect } from 'vitest';
import { validateEan13, calculateEan13CheckDigit, generateInternalBarcode } from '../../src/shared/utils/barcode';
import { barcodePrinter } from '../../src/main/printing/barcode-printer';

describe('Barcode Utils (EAN-13)', () => {
  test('حساب خانة التحقق لـ 12 رقمًا', () => {
    // مثال لباركود قياسي
    const first12 = '622123456789';
    const checkDigit = calculateEan13CheckDigit(first12);
    expect(checkDigit).toBeGreaterThanOrEqual(0);
    expect(checkDigit).toBeLessThanOrEqual(9);
  });

  test('توليد باركود داخلي يبدأ بـ 20 وله خانة تحقق صالحة', () => {
    const internalBarcode = generateInternalBarcode(105);
    expect(internalBarcode.startsWith('20')).toBe(true);
    expect(internalBarcode.length).toBe(13);
    expect(validateEan13(internalBarcode)).toBe(true);
  });

  test('توليد كود SVG فائق التباين وحواف صلبة للطباعة الحرارية للـ EAN-13', () => {
    const svg = barcodePrinter.generateBarcodeSvg('6221234567890');
    expect(svg).toBeDefined();
    expect(svg.includes('<svg')).toBe(true);
    expect(svg.includes('shape-rendering="crispEdges"')).toBe(true);
    expect(svg.includes('fill="#000000"')).toBe(true);
  });

  test('توليد باركود Code-128 تلقائي للنصوص والأكواد غير القياسية', () => {
    const svg = barcodePrinter.generateBarcodeSvg('COSM-9988');
    expect(svg).toBeDefined();
    expect(svg.includes('<svg')).toBe(true);
    expect(svg.includes('shape-rendering="crispEdges"')).toBe(true);
  });

  test('توليد قالب HTML لملصقات بمقاس 38x25 مم مع الترويسة والسعر', () => {
    const html = barcodePrinter.generateLabelsHtml(
      [
        {
          productName: 'سيروم نضارة',
          priceFormatted: '250.00 ج.م',
          barcode: '6221234567890',
          copiesCount: 2,
        },
      ],
      38,
      25
    );

    expect(html.includes('38mm 25mm')).toBe(true);
    expect(html.includes('سيروم نضارة')).toBe(true);
    expect(html.includes('250.00 ج.م')).toBe(true);
    expect(html.includes('barcode-digits')).toBe(true);
  });
});

