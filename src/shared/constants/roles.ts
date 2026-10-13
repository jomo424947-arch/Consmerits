/**
 * أداور المستخدمين في النظام وصلاحياتهم
 * (Owner, Manager, Cashier)
 */

export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.OWNER]: 'مالك',
  [USER_ROLES.MANAGER]: 'مدير',
  [USER_ROLES.CASHIER]: 'كاشير',
};
