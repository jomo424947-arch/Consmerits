import { z } from 'zod';

export const createProductVariantSchema = z.object({
  variant_name: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  cost_price: z.number().int().nonnegative().optional().default(0),
  selling_price: z.number().int().nonnegative().optional(),
  sale_price: z.number().int().nonnegative().optional(),
  min_selling_price: z.number().int().nonnegative().optional().nullable(),
  wholesale_price: z.number().int().nonnegative().optional().nullable(),
  min_stock_level: z.number().int().nonnegative().optional().default(0),
  min_stock: z.number().int().nonnegative().optional(),
  max_stock_level: z.number().int().nonnegative().optional().nullable(),
  barcodes: z.array(z.string().min(1)).default([]),
});

export const createProductSchema = z.object({
  name_ar: z.string().min(1, 'الاسم بالعربية مطلوب'),
  name_en: z.string().optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  brand_id: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().default('قطعة'),
  variants: z.array(createProductVariantSchema).min(1, 'يجب إضافة variant واحد على الأقل'),
});

export const updateProductSchema = z.object({
  name_ar: z.string().min(1, 'الاسم بالعربية مطلوب').optional(),
  name_en: z.string().optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  brand_id: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

export const bulkUpdateProductsSchema = z.object({
  product_ids: z.array(z.number().int().positive()).optional(),
  variant_ids: z.array(z.number().int().positive()).optional(),
  category_id: z.number().int().positive().optional().nullable(),
  brand_id: z.number().int().positive().optional().nullable(),
  is_active: z.number().int().min(0).max(1).optional(),
  price_adjustment: z
    .object({
      type: z.enum(['fixed', 'percentage']),
      value: z.number(), // إيجابي للزيادة، سلبي للخصم
    })
    .optional(),
});

export type CreateProductVariantInput = z.input<typeof createProductVariantSchema>;
export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type BulkUpdateProductsInput = z.infer<typeof bulkUpdateProductsSchema>;
