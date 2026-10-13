import { z } from 'zod';

export const createSaleItemSchema = z.object({
  variant_id: z.number().int().positive(),
  qty: z.number().int().positive(),
  unit_price: z.number().int().nonnegative(),
  discount_amount: z.number().int().nonnegative().default(0),
});

export const createSalePaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'wallet', 'credit']),
  amount: z.number().int().positive(),
});

export const createSaleSchema = z.object({
  customer_id: z.number().int().positive().optional().nullable(),
  items: z.array(createSaleItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
  payments: z.array(createSalePaymentSchema).min(1, 'يجب تحديد طريقة الدفع'),
  discount_amount: z.number().int().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
