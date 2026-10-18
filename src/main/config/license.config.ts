/**
 * اعدادات نظام الترخيص والتفعيل (License Configuration)
 * يحتوي على المفتاح الثابت، مفتاح التشفير، واعدادات الحماية
 */

/**
 * مفتاح التفعيل الثابت للتطبيق
 * يجب ادخاله عند اول تشغيل بعد التثبيت
 */
export const ACTIVATION_KEY = 'GOUR-BTQE-2026-XKEY';

/**
 * مفتاح تشفير ملف التفعيل المحفوظ على الجهاز
 * يستخدم AES-256-GCM لمنع التلاعب بملف التفعيل
 */
export const LICENSE_ENCRYPTION_KEY = 'cG9zLWJvdXRpcXVlLWdvdXJpLTIwMjYtc2VjcmV0LWtleQ==';

/**
 * اسم ملف التفعيل المشفر المحفوظ في مجلد بيانات التطبيق
 */
export const LICENSE_FILE_NAME = '.license.dat';

/**
 * اقصى عدد محاولات تفعيل خاطئة قبل القفل المؤقت
 */
export const MAX_ACTIVATION_ATTEMPTS = 5;

/**
 * مدة القفل بعد تجاوز الحد الاقصى للمحاولات (بالدقائق)
 */
export const LOCKOUT_DURATION_MINUTES = 30;
