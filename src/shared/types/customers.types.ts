export interface Customer {
  id: number;
  uuid: string;
  name: string;
  phone?: string | null;
  credit_limit: number; // الحد الائتماني بالقروش
  balance: number; // رصيد العميل المدين بالقروش
  notes?: string | null;
  is_active: number;
  created_at: string;
  sales_count?: number;
  total_sales_amount?: number;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  credit_limit?: number; // بالقروش
  initial_balance?: number; // بالقروش
  notes?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string | null;
  credit_limit?: number;
  notes?: string | null;
  is_active?: number;
}

export interface CustomerPayment {
  id: number;
  uuid: string;
  customer_id: number;
  customer_name?: string;
  amount: number; // بالقروش
  payment_method: string;
  note?: string | null;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export interface CustomerStatementEntry {
  type: 'sale' | 'payment' | 'return';
  date: string;
  debit: number; // مدين (فاتورة بيع آجل)
  credit: number; // دائن (سداد أو مرتجع رصيد)
  balance_after?: number;
  description: string;
  ref_id?: number;
}

export interface CustomerStatement {
  customer: Customer;
  total_credit_sales: number;
  total_payments: number;
  total_returns: number;
  current_balance: number;
  entries: CustomerStatementEntry[];
}

export interface CustomerPurchaseHistoryItem {
  id: number;
  seq_no: number;
  created_at: string;
  total: number;
  status: string;
  payment_method?: string;
  items_count?: number;
}
