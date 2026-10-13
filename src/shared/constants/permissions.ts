/**
 * مصفوفة الصلاحيات ونظام التحكم بالوصول المستند إلى الدور (Role-Based Access Control - RBAC)
 * متوافقة 100% مع وثيقة التصميم docs/09-الأمان-والنسخ-الاحتياطي.md
 */

import { USER_ROLES, UserRole } from './roles';

export const PERMISSIONS = {
  // POS & Sales
  POS_SCAN_AND_SELL: 'pos:scan_and_sell',
  POS_APPLY_DISCOUNT_LOW: 'pos:apply_discount_low', // حتى 5%
  POS_APPLY_DISCOUNT_HIGH: 'pos:apply_discount_high', // > 5% يتطلب PIN مدير
  POS_HOLD_RESUME: 'pos:hold_resume',
  POS_VOID_ITEM: 'pos:void_item', // إلغاء بند أثناء البيع
  POS_VOID_SAVED_SALE: 'pos:void_saved_sale', // ممنوع قطعي للجميع (التصحيح عبر مرتجع فقط)
  POS_REFUND_WITH_RECEIPT: 'pos:refund_with_receipt',
  POS_REFUND_WITHOUT_RECEIPT: 'pos:refund_without_receipt', // يتطلب PIN مالك
  POS_OPEN_DRAWER_NOSALE: 'pos:open_drawer_nosale', // يتطلب إذن للكاشير
  POS_RECORD_PETTY_EXPENSE: 'pos:record_petty_expense', // الكاشير حتى حد، المدير والمالك متاح

  // Products & Pricing
  PRODUCTS_VIEW_COST: 'products:view_cost', // محجوب عن الكاشير
  PRODUCTS_EDIT_PRICE: 'products:edit_price',
  PRODUCTS_MANAGE: 'products:manage',

  // Inventory & Stocktaking
  INVENTORY_COUNT_SCAN: 'inventory:count_scan', // مسح وعد فقط للكاشير
  INVENTORY_APPROVE_ADJUSTMENT: 'inventory:approve_adjustment', // اعتماد التسويات

  // Purchases
  PURCHASES_CREATE: 'purchases:create',
  PURCHASES_MANAGE: 'purchases:manage',

  // Reports
  REPORTS_VIEW_STANDARD: 'reports:view_standard',
  REPORTS_VIEW_PROFIT: 'reports:view_profit', // للمالك فقط

  // Settings
  SETTINGS_MANAGE: 'settings:manage', // للمالك فقط

  // Backup & Restore
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore', // للمالك فقط

  // Users Management
  USERS_MANAGE: 'users:manage', // للمالك فقط

  // Audit Log
  AUDIT_VIEW: 'audit:view', // مالك ومدير فقط
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * مصفوفة الصلاحيات المباشرة لكل دور
 */
export const RBAC_MATRIX: Record<UserRole, Record<Permission, boolean>> = {
  [USER_ROLES.OWNER]: {
    [PERMISSIONS.POS_SCAN_AND_SELL]: true,
    [PERMISSIONS.POS_APPLY_DISCOUNT_LOW]: true,
    [PERMISSIONS.POS_APPLY_DISCOUNT_HIGH]: true,
    [PERMISSIONS.POS_HOLD_RESUME]: true,
    [PERMISSIONS.POS_VOID_ITEM]: true,
    [PERMISSIONS.POS_VOID_SAVED_SALE]: false, // ممنوع قطعي للجميع طبقاً للوثيقة
    [PERMISSIONS.POS_REFUND_WITH_RECEIPT]: true,
    [PERMISSIONS.POS_REFUND_WITHOUT_RECEIPT]: true,
    [PERMISSIONS.POS_OPEN_DRAWER_NOSALE]: true,
    [PERMISSIONS.POS_RECORD_PETTY_EXPENSE]: true,
    [PERMISSIONS.PRODUCTS_VIEW_COST]: true,
    [PERMISSIONS.PRODUCTS_EDIT_PRICE]: true,
    [PERMISSIONS.PRODUCTS_MANAGE]: true,
    [PERMISSIONS.INVENTORY_COUNT_SCAN]: true,
    [PERMISSIONS.INVENTORY_APPROVE_ADJUSTMENT]: true,
    [PERMISSIONS.PURCHASES_CREATE]: true,
    [PERMISSIONS.PURCHASES_MANAGE]: true,
    [PERMISSIONS.REPORTS_VIEW_STANDARD]: true,
    [PERMISSIONS.REPORTS_VIEW_PROFIT]: true,
    [PERMISSIONS.SETTINGS_MANAGE]: true,
    [PERMISSIONS.BACKUP_CREATE]: true,
    [PERMISSIONS.BACKUP_RESTORE]: true,
    [PERMISSIONS.USERS_MANAGE]: true,
    [PERMISSIONS.AUDIT_VIEW]: true,
  },
  [USER_ROLES.MANAGER]: {
    [PERMISSIONS.POS_SCAN_AND_SELL]: true,
    [PERMISSIONS.POS_APPLY_DISCOUNT_LOW]: true,
    [PERMISSIONS.POS_APPLY_DISCOUNT_HIGH]: true,
    [PERMISSIONS.POS_HOLD_RESUME]: true,
    [PERMISSIONS.POS_VOID_ITEM]: true,
    [PERMISSIONS.POS_VOID_SAVED_SALE]: false, // ممنوع قطعي
    [PERMISSIONS.POS_REFUND_WITH_RECEIPT]: true,
    [PERMISSIONS.POS_REFUND_WITHOUT_RECEIPT]: false, // يتطلب PIN مالك
    [PERMISSIONS.POS_OPEN_DRAWER_NOSALE]: true,
    [PERMISSIONS.POS_RECORD_PETTY_EXPENSE]: true,
    [PERMISSIONS.PRODUCTS_VIEW_COST]: true, // إشراف تشغيلي
    [PERMISSIONS.PRODUCTS_EDIT_PRICE]: true,
    [PERMISSIONS.PRODUCTS_MANAGE]: true,
    [PERMISSIONS.INVENTORY_COUNT_SCAN]: true,
    [PERMISSIONS.INVENTORY_APPROVE_ADJUSTMENT]: true,
    [PERMISSIONS.PURCHASES_CREATE]: true,
    [PERMISSIONS.PURCHASES_MANAGE]: true,
    [PERMISSIONS.REPORTS_VIEW_STANDARD]: true,
    [PERMISSIONS.REPORTS_VIEW_PROFIT]: false, // أرباح المالك محجوبة
    [PERMISSIONS.SETTINGS_MANAGE]: false,
    [PERMISSIONS.BACKUP_CREATE]: true,
    [PERMISSIONS.BACKUP_RESTORE]: false, // للمالك فقط
    [PERMISSIONS.USERS_MANAGE]: false, // للمالك فقط
    [PERMISSIONS.AUDIT_VIEW]: true,
  },
  [USER_ROLES.CASHIER]: {
    [PERMISSIONS.POS_SCAN_AND_SELL]: true,
    [PERMISSIONS.POS_APPLY_DISCOUNT_LOW]: true,
    [PERMISSIONS.POS_APPLY_DISCOUNT_HIGH]: false, // يتطلب PIN مدير
    [PERMISSIONS.POS_HOLD_RESUME]: true,
    [PERMISSIONS.POS_VOID_ITEM]: true,
    [PERMISSIONS.POS_VOID_SAVED_SALE]: false, // ممنوع قطعي
    [PERMISSIONS.POS_REFUND_WITH_RECEIPT]: true, // مشروط بالسياسة
    [PERMISSIONS.POS_REFUND_WITHOUT_RECEIPT]: false, // ممنوع
    [PERMISSIONS.POS_OPEN_DRAWER_NOSALE]: false, // يتطلب إذن
    [PERMISSIONS.POS_RECORD_PETTY_EXPENSE]: true, // حتى حد معين
    [PERMISSIONS.PRODUCTS_VIEW_COST]: false, // محجوب تماماً
    [PERMISSIONS.PRODUCTS_EDIT_PRICE]: false,
    [PERMISSIONS.PRODUCTS_MANAGE]: false,
    [PERMISSIONS.INVENTORY_COUNT_SCAN]: true, // مسح وعد فقط
    [PERMISSIONS.INVENTORY_APPROVE_ADJUSTMENT]: false,
    [PERMISSIONS.PURCHASES_CREATE]: false,
    [PERMISSIONS.PURCHASES_MANAGE]: false,
    [PERMISSIONS.REPORTS_VIEW_STANDARD]: false,
    [PERMISSIONS.REPORTS_VIEW_PROFIT]: false,
    [PERMISSIONS.SETTINGS_MANAGE]: false,
    [PERMISSIONS.BACKUP_CREATE]: false,
    [PERMISSIONS.BACKUP_RESTORE]: false,
    [PERMISSIONS.USERS_MANAGE]: false,
    [PERMISSIONS.AUDIT_VIEW]: false,
  },
};

/**
 * تحديد ما إذا كانت الصلاحية تتطلب موافقة خاصة وتجاوزاً (Override)
 */
export function getRequiredOverride(
  role: UserRole,
  permission: Permission
): 'manager_pin' | 'owner_pin' | null {
  if (hasPermission(role, permission)) {
    return null;
  }

  // الكاشير يطلب مدير للخصومات المرتفعة وفتح الدرج
  if (role === USER_ROLES.CASHIER) {
    if (permission === PERMISSIONS.POS_APPLY_DISCOUNT_HIGH) return 'manager_pin';
    if (permission === PERMISSIONS.POS_OPEN_DRAWER_NOSALE) return 'manager_pin';
    if (permission === PERMISSIONS.POS_REFUND_WITHOUT_RECEIPT) return 'owner_pin';
  }

  // المدير يطلب مالك للمرتجع بدون فاتورة
  if (role === USER_ROLES.MANAGER) {
    if (permission === PERMISSIONS.POS_REFUND_WITHOUT_RECEIPT) return 'owner_pin';
    if (permission === PERMISSIONS.BACKUP_RESTORE) return 'owner_pin';
    if (permission === PERMISSIONS.SETTINGS_MANAGE) return 'owner_pin';
  }

  return null;
}

/**
 * التحقق من امتلاك الدور لصلاحية معينة
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return RBAC_MATRIX[role]?.[permission] === true;
}
