export interface ProductItemRow {
  id: number;
  name: string;
  category: string;
  brand: string;
  variantsCount: number;
  totalStock: number;
  unit: string;
  primaryBarcode?: string;
  price?: number; // بالقروش
  variantId?: number;
  isActive?: number;
}
