/**
 * أدوات تنسيق النصوص والأرقام والعملات لواجهة المستخدم
 */

export function formatCurrencyArabic(piasters: number): string {
  const pounds = piasters / 100;
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(pounds);
}

export function formatNumberArabic(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}
