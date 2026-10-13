/**
 * ملف إعدادات الحسابات الإدارية المعتمدة (Admin Accounts Configuration)
 * -------------------------------------------------------------
 * تنبيه أمني وسياسة النظام:
 * يُسمح فقط لحسابين اثنين بامتلاك صلاحيات الإدارة العليا والمالك (Owner):
 * 1. حساب العميل الرئيسي: محمد الجوكر
 * 2. حساب المطور / الاختبار: مسؤول الاختبار
 *
 * يُمنع منعاً باتاً تسجيل أو ترقية أي مستخدم آخر إلى رتبة مالك (Owner).
 */

import { USER_ROLES, UserRole } from '../../shared/constants/roles';

export interface AdminAccountConfig {
  readonly username: string;
  readonly display_name: string;
  readonly password: string;
  readonly pin: string;
  readonly role: UserRole;
}

export const ALLOWED_ADMIN_ACCOUNTS: readonly AdminAccountConfig[] = [
  {
    // حساب العميل الأساسي (المالك)
    username: 'mohamed_joker',
    display_name: 'محمد الجوكر',
    password: 'Joker@Admin2026',
    pin: '7777',
    role: USER_ROLES.OWNER,
  },
  {
    // حساب المطور للاختبار والتجربة الشاملة
    username: 'test_admin',
    display_name: 'مسؤول الاختبار',
    password: 'Test@Dev2026',
    pin: '9999',
    role: USER_ROLES.OWNER,
  },
] as const;

/**
 * فحص هل اسم المستخدم مصرح له بامتلاك صلاحية الإدارة/المالك
 */
export function isAllowedAdminUsername(username: string): boolean {
  if (!username) return false;
  const normalized = username.trim().toLowerCase();
  return ALLOWED_ADMIN_ACCOUNTS.some(
    (acc) => acc.username.toLowerCase() === normalized
  );
}

/**
 * جلب قائمة أسماء الحسابات الإدارية المعتمدة
 */
export function getAllowedAdminUsernames(): string[] {
  return ALLOWED_ADMIN_ACCOUNTS.map((acc) => acc.username);
}
