import { z } from 'zod';

export const auditFilterSchema = z.object({
  userId: z.number().int().positive().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ YYYY-MM-DD').optional(),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});
