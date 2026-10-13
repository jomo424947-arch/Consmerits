/**
 * خوارزميات توليد والتحقق من باركود EAN-13
 */

/** حساب خانة التحقق (Check Digit) لباركود EAN-13 */
export function calculateEan13CheckDigit(first12Digits: string): number {
  if (first12Digits.length !== 12 || !/^\d+$/.test(first12Digits)) {
    throw new Error('يجب أن يحتوي الباركود على 12 رقمًا قبل حساب خانة التحقق');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits[i], 10);
    // الأرقام في المواقع الزوجية (0-indexed: 1, 3, 5, 7, 9, 11) تُضرب في 3
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/** التحقق من صحة باركود EAN-13 كامل */
export function validateEan13(barcode: string): boolean {
  if (barcode.length !== 13 || !/^\d+$/.test(barcode)) {
    return false;
  }
  const first12 = barcode.slice(0, 12);
  const checkDigit = parseInt(barcode[12], 10);
  return calculateEan13CheckDigit(first12) === checkDigit;
}

/** توليد باركود داخلي قياسي بالبادئة 200 (المخصصة للاستخدام الداخلي بالمحلات) */
export function generateInternalBarcode(internalId: number, prefix: string = '200'): string {
  const padLength = 12 - prefix.length;
  const paddedId = String(internalId).padStart(padLength, '0');
  const first12 = `${prefix}${paddedId}`;
  const checkDigit = calculateEan13CheckDigit(first12);
  return `${first12}${checkDigit}`;
}
