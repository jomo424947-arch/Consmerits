export interface Category {
  id: number;
  uuid: string;
  name: string;
  is_active: number;
  created_at: string;
}

export interface Brand {
  id: number;
  uuid: string;
  name: string;
  is_active: number;
  created_at: string;
}

export interface Product {
  id: number;
  uuid: string;
  name_ar: string;
  name_en?: string | null;
  category_id?: number | null;
  brand_id?: number | null;
  description?: string | null;
  unit?: string;
  image_path?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: number;
  uuid: string;
  product_id: number;
  sku?: string | null;
  variant_name?: string | null;
  name?: string | null;
  cost_price?: number;
  sale_price: number;
  selling_price?: number;
  min_selling_price?: number | null;
  wholesale_price?: number | null;
  min_stock: number;
  min_stock_level?: number;
  max_stock_level?: number | null;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductBarcode {
  id: number;
  variant_id: number;
  barcode: string;
  is_primary?: number;
  is_internal?: number;
  created_at?: string;
}

import type { Batch } from './inventory.types';
export type { Batch };

export interface VariantDetail extends ProductVariant {
  selling_price: number;
  sale_price: number;
  barcodes: string[];
  total_stock: number;
  batches?: Batch[];
}

export interface ProductWithVariants extends Product {
  category_name?: string | null;
  brand_name?: string | null;
  variants: VariantDetail[];
}

export interface ProductLookupResult {
  product: Product;
  variant: VariantDetail;
  matched_barcode: string;
  category_name?: string | null;
  brand_name?: string | null;
  available_stock: number;
}
