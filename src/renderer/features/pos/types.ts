export interface CartLineItem {
  id: string;
  variantId: number;
  productName: string;
  variantName?: string;
  barcode: string;
  unitPrice: number; // بالقروش
  qty: number;
  availableStock?: number;
  discount: number; // بالقروش
  total: number; // بالقروش
}
