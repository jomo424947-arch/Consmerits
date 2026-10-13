import { z } from 'zod';

export const recordMovementSchema = z.object({
  batch_id: z.number().int().positive(),
  type: z.enum([
    'purchase',
    'sale',
    'sale_return',
    'purchase_return',
    'adjust_in',
    'adjust_out',
    'expired',
    'tester',
  ]),
  qty: z.number().int().refine((val) => val !== 0, 'الكمية لا يمكن أن تكون صفرًا'),
  note: z.string().optional().nullable(),
});

export const auditCountItemSchema = z.object({
  variant_id: z.number().int().positive(),
  actual_qty: z.number().int().nonnegative(),
});

export const auditCountSchema = z.object({
  items: z.array(auditCountItemSchema),
  notes: z.string().optional().nullable(),
});
