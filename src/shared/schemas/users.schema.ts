import { z } from 'zod';
import { USER_ROLES } from '../constants/roles';

export const loginWithPasswordSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const loginWithPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'رمز PIN يجب أن يتكون من 4 إلى 6 أرقام'),
});

export const createUserSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  display_name: z.string().min(1, 'الاسم الظاهر مطلوب'),
  role: z.enum([USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER]),
  password: z.string().min(4, 'كلمة المرور يجب أن تكون 4 أحرف على الأقل').optional(),
  pin: z.string().regex(/^\d{4,6}$/, 'رمز PIN يجب أن يتكون من 4 إلى 6 أرقام').optional().nullable(),
});

export const updateUserSchema = z.object({
  display_name: z.string().min(1, 'الاسم الظاهر مطلوب').optional(),
  role: z.enum([USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER]).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
  password: z.string().min(4, 'كلمة المرور يجب أن تكون 4 أحرف على الأقل').optional(),
  pin: z.string().regex(/^\d{4,6}$/, 'رمز PIN يجب أن يتكون من 4 إلى 6 أرقام').optional().nullable(),
});

export const changePasswordSchema = z.object({
  oldPass: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPass: z.string().min(4, 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل'),
});

export const overridePinSchema = z.object({
  permission: z.string().min(1, 'الصلاحية مطلوبة'),
  pin: z.string().regex(/^\d{4,6}$/, 'رمز PIN يجب أن يتكون من 4 إلى 6 أرقام'),
});
