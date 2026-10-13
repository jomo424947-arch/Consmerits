/**
 * قاموس الرسائل والنصوص التوضيحية والتنبيهات باللغة العربية
 * مصاغ بأسلوب احترافي واضح ومريح للمستخدم
 */

export const MESSAGES = {
  // أخطاء وإشعارات البيع
  SALE_SUCCESS: 'تم تسجيل عملية البيع وإصدار الفاتورة بنجاح',
  SALE_HELD_SUCCESS: 'تم تعليق الفاتورة الحالية بنجاح، يمكنك استئنافها لاحقاً',
  SALE_RESUMED: 'تم استرجاع الفاتورة المعلقة إلى شاشة البيع',
  SALE_VOIDED: 'تم إلغاء الفاتورة بالكامل بنجاح',
  CART_EMPTY: 'سلة المبيعات فارغة، يرجى إضافة منتج أولاً',
  INSUFFICIENT_PAID: 'المبلغ المدفوع أقل من إجمالي الفاتورة المطلوب',
  PRODUCT_NOT_FOUND: 'لم يتم العثور على أي منتج يطابق الباركود أو الاسم المدخل',
  BARCODE_EMPTY: 'يرجى إدخال أو مسح الباركود أولاً',
  STOCK_DEPLETED: 'عفواً، الكمية المتوفرة في المخزن من هذا المنتج غير كافية',
  ITEM_ADDED: 'تمت إضافة المنتج إلى السلة',
  ITEM_REMOVED: 'تم حذف المنتج من السلة',
  DISCOUNT_EXCEEDED: 'نسبة الخصم تتجاوز الحد الأقصى المسموح به لك',
  QUANTITY_INVALID: 'يرجى إدخال كمية صحيحة أكبر من الصفر',

  // الوردية والصندوق
  SHIFT_OPENED: 'تم فتح الوردية وبدء الدوام بنجاح',
  SHIFT_CLOSED: 'تم إغلاق الوردية وترحيل الحسابات بنجاح',
  SHIFT_NOT_ACTIVE: 'تنبيه: لا توجد وردية مفتوحة حالياً، يرجى فتح وردية للبدء في البيع',
  CASH_DEPOSIT_SUCCESS: 'تم تسجيل إيداع النقدية في الدرج بنجاح',
  CASH_WITHDRAW_SUCCESS: 'تم تسجيل سحب النقدية بنجاح',
  EXPENSE_RECORDED: 'تم تسجيل المصروف بنجاح وخصمه من رصيد الصندوق',

  // المنتجات والمخزون
  PRODUCT_SAVED: 'تم حفظ بيانات المنتج بنجاح',
  PRODUCT_UPDATED: 'تم تحديث بيانات المنتج بنجاح',
  PRODUCT_ARCHIVED: 'تمت أرشفة المنتج بنجاح',
  EXPIRY_ALERT_NEAR: 'تنبيه: توجد دفعات تقترب من تاريخ انتهاء الصلاحية',
  COUNT_APPROVED: 'تم اعتماد محضر الجرد وتسوية فروقات المخزون',
  BATCH_ADDED: 'تمت إضافة تشغيلة المخزون بنجاح',

  // المرتجعات والمشتريات
  RETURN_SUCCESS: 'تم إرجاع المنتجات واسترداد المبلغ بنجاح',
  RETURN_INVOICE_NOT_FOUND: 'رقم الفاتورة الأصلية غير موجود بالنظام',
  PURCHASE_SAVED: 'تم تسجيل فاتورة المشتريات وتحديث أرصدة وتكاليف المخزون',
  PURCHASE_PAYMENT_SUCCESS: 'تم تسجيل دفعة المورد بنجاح',

  // إدارة المستخدمين والصلاحيات
  LOGIN_SUCCESS: 'أهلاً بك، تم تسجيل الدخول بنجاح',
  LOGIN_FAILED: 'اسم المستخدم أو كلمة المرور غير صحيحة',
  PIN_INVALID: 'رمز PIN المدخل غير صحيح، يرجى المحاولة مرة أخرى',
  USER_LOCKED: 'تم قفل هذا الحساب لتكرار المحاولات الخاطئة، يرجى التواصل مع المدير',
  USER_SAVED: 'تم حفظ بيانات المستخدم بنجاح',
  PASSWORD_CHANGED: 'تم تغيير كلمة المرور بنجاح',
  OVERRIDE_APPROVED: 'تمت الموافقة على التخطي الإداري بنجاح',
  OVERRIDE_DENIED: 'رمز PIN الخاص بالمدير غير صحيح أو لا يملك صلاحية التخطي',
  PERMISSION_DENIED: 'عفواً، لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء',

  // النسخ الاحتياطي والنظام
  BACKUP_SUCCESS: 'تم إنشاء نسخة احتياطية آمنة بنجاح وحفظها',
  BACKUP_RESTORE_SUCCESS: 'تمت استعادة قاعدة البيانات بنجاح، سيتم إعادة تشغيل التطبيق',
  BACKUP_USB_SUCCESS: 'تم تصدير النسخة الاحتياطية إلى وحدة التخزين الخارجية USB',
  SETTINGS_SAVED: 'تم حفظ الإعدادات بنجاح وتطبيق التغييرات',
  CONFIRM_DELETE: 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء',
  OFFLINE_READY: 'النظام يعمل بوضع عدم الاتصال المحلي 100% وبأمان تام',
  UNEXPECTED_ERROR: 'حدث خطأ غير متوقع أثناء معالجة الطلب، يرجى المحاولة ثانية',
} as const;

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: unknown }).message);
    // ترجمة بعض رسائل الخطأ الشائعة
    if (msg.includes('UNIQUE constraint failed')) return 'هذا السجل أو الباركود مسجل مسبقاً في النظام';
    if (msg.includes('FOREIGN KEY constraint failed')) return 'لا يمكن إتمام العملية لارتباط هذا السجل ببيانات أخرى';
    if (msg.includes('NOT NULL constraint failed')) return 'يرجى استكمال جميع الحقول الإلزامية المطلوبة';
    return msg;
  }
  return MESSAGES.UNEXPECTED_ERROR;
}
