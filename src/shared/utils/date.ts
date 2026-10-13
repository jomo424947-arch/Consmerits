/**
 * أدوات التعامل مع التواريخ والأوقات
 * التخزين يكون UTC والعرض بتوقيت القاهرة المحلي
 */

export function getCurrentUtcIso(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export function formatCairoDateTime(utcIsoString: string): string {
  if (!utcIsoString) return '';
  const date = new Date(utcIsoString.includes('Z') ? utcIsoString : `${utcIsoString}Z`);
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function getDaysUntilExpiry(expiryDateStr: string): number {
  if (!expiryDateStr) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
