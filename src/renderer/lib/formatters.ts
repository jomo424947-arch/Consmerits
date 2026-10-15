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

/**
 * تحويل تاريخ مخزن (سواء ISO مع Z أو SQLite بدون Z) إلى كائن Date محلي دقيق
 */
export function parseDbDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (!s) return null;

  // إذا كانت بصيغة SQLite القديمة YYYY-MM-DD HH:MM:SS (مخزنة بـ datetime('now') في UTC)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    const d = new Date(s.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d;
  }

  // إذا كانت ISO أو أي صيغة صالحة
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * تنسيق التاريخ والوقت باللغة العربية مع توقيت الجهاز المحلي
 * مثال: "15/10/2026 • 03:01 م"
 */
export function formatDateTimeArabic(dateStr?: string | null): string {
  const d = parseDbDate(dateStr);
  if (!d) return dateStr || '---';

  const dateFormatted = d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeFormatted = d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return `${dateFormatted} • ${timeFormatted}`;
}

/**
 * تنسيق التاريخ فقط
 */
export function formatDateArabic(dateStr?: string | null): string {
  const d = parseDbDate(dateStr);
  if (!d) return dateStr || '---';

  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * تنسيق الوقت فقط بصيغة 12 ساعة مع ص/م
 */
export function formatTimeArabic(dateStr?: string | null): string {
  const d = parseDbDate(dateStr);
  if (!d) return dateStr || '---';

  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
