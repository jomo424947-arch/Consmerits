import { z } from 'zod';

export const openShiftSchema = z.object({
  opening_cash: z.number().int().nonnegative('المبلغ الافتتاحي لا يمكن أن يكون سالبًا'),
  notes: z.string().optional().nullable(),
});

export const closeShiftSchema = z.object({
  actual_closing_cash: z.number().int().nonnegative('المبلغ الفعلي لا يمكن أن يكون سالبًا'),
  notes: z.string().optional().nullable(),
});

export const recordCashMovementSchema = z.object({
  type: z.enum(['expense', 'deposit', 'withdrawal']),
  amount: z.number().int().positive('المبلغ يجب أن يكون أكبر من صفر'),
  reason: z.string().min(1, 'سبب الحركة مطلوب'),
});
