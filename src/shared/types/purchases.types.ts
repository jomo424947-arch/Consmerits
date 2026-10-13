export interface Supplier {
  id: number;
  uuid: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  balance: number; // رصيد المورد بالقروش
  current_balance?: number; // اسم بديل للتوافق
  is_active: number;
  created_at: string;
  purchases_count?: number;
  total_purchases_amount?: number;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  initial_balance?: number; // بالقروش
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  is_active?: number;
}

export interface CreatePurchaseItemInput {
  variant_id: number;
  qty: number;
  unit_cost: number; // بالقروش
  batch_no?: string | null;
  expiry_date?: string | null; // YYYY-MM-DD
  suggested_sale_price?: number | null; // تحديث سعر البيع للصنف إن وُجد
}

export interface CreatePurchaseInput {
  supplier_id: number;
  invoice_no?: string | null;
  items: CreatePurchaseItemInput[];
  discount?: number; // بالقروش
  tax?: number; // بالقروش
  paid: number; // المدفوع بالقروش
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'credit';
  notes?: string | null;
  user_id: number;
  shift_id?: number | null; // لربطه بحركة الخزنة إذا كان الدفع نقدي
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  variant_id: number;
  batch_id?: number | null;
  qty: number;
  unit_cost: number; // بالقروش
  total_cost: number; // بالقروش
  suggested_sale_price?: number | null; // بالقروش
  // للعرض
  product_name?: string;
  variant_name?: string;
  sku?: string;
  batch_no?: string | null;
  expiry_date?: string | null;
}

export interface Purchase {
  id: number;
  uuid: string;
  invoice_no?: string | null;
  supplier_id: number;
  supplier_name?: string;
  user_id: number;
  user_name?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number; // إجمالي الفاتورة بالقروش
  paid: number; // المدفوع بالقروش
  payment_method: string;
  status: 'completed' | 'partial' | 'cancelled';
  notes?: string | null;
  created_at: string;
  items?: PurchaseItem[];
}

export interface SupplierPayment {
  id: number;
  uuid: string;
  supplier_id: number;
  supplier_name?: string;
  amount: number; // بالقروش
  payment_method: string;
  note?: string | null;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export interface PurchaseReturnItem {
  id: number;
  return_id: number;
  purchase_item_id: number;
  variant_id: number;
  batch_id: number;
  qty: number;
  unit_cost: number;
  product_name?: string;
  variant_name?: string;
}

export interface PurchaseReturn {
  id: number;
  uuid: string;
  purchase_id: number;
  supplier_id: number;
  supplier_name?: string;
  total_refund: number; // بالقروش
  user_id: number;
  user_name?: string;
  note?: string | null;
  created_at: string;
  items?: PurchaseReturnItem[];
}

export interface SupplierStatementEntry {
  type: 'purchase' | 'payment' | 'return';
  date: string;
  debit: number; // مدين (فواتير شراء)
  credit: number; // دائن (سداد أو مرتجع)
  balance_after?: number;
  description: string;
  ref_id?: number;
}

export interface SupplierStatement {
  supplier: Supplier;
  total_purchases: number;
  total_payments: number;
  total_returns: number;
  current_balance: number;
  entries: SupplierStatementEntry[];
}

export interface CostHistoryEntry {
  purchase_date: string;
  supplier_name: string;
  unit_cost: number;
  qty: number;
  invoice_no?: string | null;
}

export interface SupplierCostComparison {
  supplier_name: string;
  avg_cost: number;
  min_cost: number;
  max_cost: number;
  purchase_count: number;
}
