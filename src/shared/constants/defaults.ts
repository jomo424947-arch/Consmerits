/**
 * الإعدادات والافتراضيات القياسية لنظام الكاشير
 */

export const APP_DEFAULTS = {
  CURRENCY: 'ج.م',
  CURRENCY_UNIT: 'قرش',
  TAX_RATE_PERCENT: 0, // المحل بدون ضريبة مضافة أو معفاة افتراضياً
  MAX_CASHIER_DISCOUNT_PERCENT: 5, // الخصم المسموح للكاشير دون إذن مدير
  INACTIVITY_LOCK_MINUTES: 5,
  EXPIRY_ALERT_DAYS: [30, 60, 90],
  RECEIPT_WIDTH_MM: 80,
  INTERNAL_BARCODE_PREFIX: '20', // EAN-13 بادئة للاستخدام الداخلي
} as const;
