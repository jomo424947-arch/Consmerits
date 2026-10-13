export interface CartLineItem {
  id: string;
  variantId: number;
  productName: string;
  variantName?: string;
  barcode: string;
  unitPrice: number; // بالقروش
  qty: number;
  discount: number; // بالقروش
  total: number; // بالقروش
}
