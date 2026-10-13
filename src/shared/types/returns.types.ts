export type RefundMethod = 'cash' | 'credit' | 'exchange';
export type ReturnItemCondition = 'good' | 'damaged';

export interface CreateReturnItemInput {
  sale_item_id: number;
  qty: number;
  condition: ReturnItemCondition;
}

export interface CreateReturnInput {
  sale_id: number;
  user_id: number;
  refund_method: RefundMethod;
  reason?: string | null;
  items: CreateReturnItemInput[];
  shift_id?: number | null; // في حالة الرد النقدي لربط حركة الخزنة
}

export interface ReturnItem {
  id: number;
  return_id: number;
  sale_item_id: number;
  variant_id: number;
  qty: number;
  condition: ReturnItemCondition;
  batch_id?: number | null;
  // للعرض
  product_name?: string;
  variant_name?: string;
  unit_price?: number;
  line_total?: number;
}

export interface ReturnInvoice {
  id: number;
  uuid: string;
  sale_id: number;
  sale_seq_no?: number;
  user_id: number;
  user_name?: string;
  customer_id?: number | null;
  customer_name?: string;
  total_refund: number; // بالقروش
  refund_method: RefundMethod;
  reason?: string | null;
  created_at: string;
  items?: ReturnItem[];
}

export interface ExchangeInput {
  return_input: CreateReturnInput;
  new_sale_items: Array<{
    variant_id: number;
    qty: number;
    discount_amount?: number;
  }>;
  difference_payment_method?: 'cash' | 'card' | 'credit';
  user_id: number;
  shift_id?: number | null;
  notes?: string | null;
}

export interface ExchangeResult {
  return_invoice: ReturnInvoice;
  new_sale_id?: number;
  price_difference: number; // موجب: العميل يدفع الفرق، سالب: رد الفرق للعميل، 0: تعادل
  action_taken: 'customer_paid' | 'customer_refunded' | 'even_exchange';
}
