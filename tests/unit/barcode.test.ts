/**
 * اختبارات الوحدة للتحقق من صحة وتوليد باركود EAN-13
 */

import { describe, test, expect } from 'vitest';
import { validateEan13, calculateEan13CheckDigit, generateInternalBarcode } from '../../src/shared/utils/barcode';

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
});
