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

// أنماط باركود Code128 (المعيار الدولي لطباعة الباركود في الإيصالات)
const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112'
];

/**
 * توليد باركود Code128 SVG نقي بدقة عالية دون الحاجة لمكتبات خارجية
 */
export function generateCode128Svg(text: string, height: number = 38): string {
  const clean = text.trim() || 'INV-00000';
  const codes = [104]; // Start Code B
  let checksum = 104;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code >= 0 && code < 103 ? code : 0);
    checksum += (code >= 0 && code < 103 ? code : 0) * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  let bars = '';
  let x = 8;
  for (const c of codes) {
    const pattern = CODE128_PATTERNS[c] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const w = parseInt(pattern[j], 10);
      if (isBar) {
        bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;
      }
      x += w;
      isBar = !isBar;
    }
  }
  return `<svg viewBox="0 0 ${x + 8} ${height}" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;width:100%;max-width:190px;height:${height}px;">${bars}</svg>`;
}

/** توليد باركود داخلي قياسي بالبادئة 200 (المخصصة للاستخدام الداخلي بالمحلات) */
export function generateInternalBarcode(internalId: number, prefix: string = '200'): string {
  const padLength = 12 - prefix.length;
  const paddedId = String(internalId).padStart(padLength, '0');
  const first12 = `${prefix}${paddedId}`;
  const checkDigit = calculateEan13CheckDigit(first12);
  return `${first12}${checkDigit}`;
}


