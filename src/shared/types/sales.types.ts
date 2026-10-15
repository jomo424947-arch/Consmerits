export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'credit' | 'split';

export type SaleStatus = 'completed' | 'voided' | 'held';

export interface SalePayment {
  id: number;
  sale_id: number;
  method: PaymentMethod;
  amount: number; // بالقروش
}

export interface SaleItem {
  id: number;
  sale_id: number;
  variant_id: number;
  batch_id: number;
  product_name: string; // Snapshot وقت البيع
  item_name?: string; // اسم بديل متطابق مع التوثيق
  variant_name?: string | null;
  qty: number;
  unit_price: number; // بالقروش (Snapshot)
  unit_cost: number; // بالقروش (Snapshot)
  discount_amount: number; // بالقروش
  line_total: number; // بالقروش
}

export interface Sale {
  id: number;
  uuid: string;
  seq_no: number; // ترقيم متسلسل بلا فجوات
  invoice_no: string; // كود الفاتورة المقروء
  user_id: number;
  customer_id?: number | null;
  shift_id: number;
  subtotal: number; // بالقروش
  discount_amount: number; // بالقروش
  tax_amount: number; // بالقروش
  total: number; // بالقروش
  status: SaleStatus;
  void_reason?: string | null;
  notes?: string | null;
  created_at: string;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface HeldSale {
  id: string; // UUID
  hold_no: number;
  created_at: string;
  payload?: string; // JSON
  items?: Array<{
    variant_id: number;
    product_name: string;
    variant_name?: string;
    sale_price: number;
    qty: number;
    barcode: string;
  }>;
  customer_name?: string;
  notes?: string;
}
