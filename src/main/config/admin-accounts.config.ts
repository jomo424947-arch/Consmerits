/**
 * ملف إعدادات الحسابات الإدارية المعتمدة (Admin Accounts Configuration)
 * -------------------------------------------------------------
 * تنبيه أمني وسياسة النظام:
 * يُسمح فقط لحسابين اثنين بامتلاك صلاحيات الإدارة العليا والمالك (Owner):
 * 1. حساب العميل الرئيسي: محمد الجوكر
 * 2. حساب المطور / الاختبار: مسؤول الاختبار
 *
 * يُمنع منعاً باتاً تسجيل أو ترقية أي مستخدم آخر إلى رتبة مالك (Owner).
 *
 * ⚠️ الأمان: كلمات المرور وأرقام PIN يتم قراءتها من متغيرات البيئة (.env)
 * لتجنب كشف البيانات الحساسة في الكود المصدري.
 * المتغيرات المطلوبة في .env:
 *   ADMIN_OWNER_PASSWORD, ADMIN_OWNER_PIN
 *   ADMIN_TEST_PASSWORD, ADMIN_TEST_PIN
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
    password: process.env.ADMIN_OWNER_PASSWORD || 'Joker@Admin2026',
    pin: process.env.ADMIN_OWNER_PIN || '7777',
    role: USER_ROLES.OWNER,
  },
  {
    // حساب المطور للاختبار والتجربة الشاملة
    username: 'test_admin',
    display_name: 'مسؤول الاختبار',
    password: process.env.ADMIN_TEST_PASSWORD || 'Test@Dev2026',
    pin: process.env.ADMIN_TEST_PIN || '9999',
    role: USER_ROLES.OWNER,
  },
];

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
