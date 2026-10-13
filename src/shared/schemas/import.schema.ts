import { z } from 'zod';

export const importRowSchema = z.object({
  name_ar: z.string().min(1, 'اسم المنتج بالعربية مطلوب'),
  name_en: z.string().optional().nullable(),
  category_name: z.string().optional().nullable(),
  brand_name: z.string().optional().nullable(),
  variant_name: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  selling_price: z.number().int().nonnegative('سعر البيع يجب أن يكون صفراً أو أكثر'),
  cost_price: z.number().int().nonnegative().optional().default(0),
  barcode: z.string().optional().nullable(),
  initial_stock: z.number().int().nonnegative().optional().default(0),
});

export const importPreviewSchema = z.object({
  rows: z.array(importRowSchema),
});

export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportPreviewInput = z.infer<typeof importPreviewSchema>;

export interface ImportValidationResult {
  totalRows: number;
  validRows: ImportRow[];
  invalidRows: Array<{
    rowIndex: number;
    data: any;
    errors: string[];
  }>;
}

export interface ImportExecutionResult {
  success: boolean;
  importedProductsCount: number;
  importedVariantsCount: number;
  failedCount: number;
  errors: string[];
}
