/**
 * اختبارات الوحدة لتحويلات وتنسيقات المبالغ المالية بالقروش
 */

import { describe, test, expect } from 'vitest';
import { toPiasters, toPounds, formatMoney } from '../../src/shared/utils/money';

describe('Money Utils (القروش والجنيه)', () => {
  test('تحويل الجنيه إلى قروش بشكل دقيق', () => {
    expect(toPiasters(150.75)).toBe(15075);
    expect(toPiasters(10)).toBe(1000);
    expect(toPiasters(0)).toBe(0);
  });

  test('تحويل القروش إلى جنيه', () => {
    expect(toPounds(15075)).toBe(150.75);
    expect(toPounds(1000)).toBe(10);
  });

  test('تنسيق المبلغ مع العملة', () => {
    expect(formatMoney(15075)).toBe('150.75 ج.م');
  });
});
