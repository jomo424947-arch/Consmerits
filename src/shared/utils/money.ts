/**
 * معالجة وحساب المبالغ المالية بالقروش
 * لتجنب مشاكل الكسور العشرية في JavaScript
 */

/** تحويل من جنيه إلى قروش */
export function toPiasters(pounds: number): number {
  return Math.round(pounds * 100);
}

/** تحويل من قروش إلى جنيه */
export function toPounds(piasters: number): number {
  return piasters / 100;
}

/** تنسيق المبلغ كرقم عشري بالجنيه دون لاحقة */
export function formatPiastersToPounds(piasters: number): string {
  return (piasters / 100).toFixed(2);
}

/** تنسيق المبلغ للعرض بالجنيه المصري */
export function formatMoney(piasters: number): string {
  return (piasters / 100).toFixed(2) + ' ج.م';
}
