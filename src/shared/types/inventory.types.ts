export interface Batch {
  id: number;
  variant_id: number;
  batch_no?: string | null;
  expiry_date?: string | null; // YYYY-MM-DD
  unit_cost: number; // بالقروش
  qty_remaining: number;
  received_at: string;
}

export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'sale_return'
  | 'purchase_return'
  | 'adjust_in'
  | 'adjust_out'
  | 'expired'
  | 'tester';

export interface StockMovement {
  id: number;
  batch_id: number;
  type: StockMovementType;
  qty: number; // موجب للإدخال، سالب للإخراج
  ref_type?: string | null;
  ref_id?: number | null;
  user_id: number;
  note?: string | null;
  created_at: string;
}

export interface StockMovementWithDetails extends StockMovement {
  product_name?: string;
  variant_name?: string;
  sku?: string;
  batch_no?: string;
  username?: string;
}

export interface ExpiryAlertItem {
  variant_id: number;
  product_name: string;
  variant_name?: string;
  batch_id?: number;
  batch_no?: string;
  expiry_date: string;
  days_remaining: number;
  qty_remaining: number;
  unit_cost: number;
}

export interface BatchAllocation {
  batchId: number;
  qty: number;
  unitCost: number;
}

export type StockCountScopeType = 'all' | 'category' | 'brand' | 'manual';

export interface StockCount {
  id: number;
  uuid: string;
  scope: StockCountScopeType;
  scope_id?: number | null;
  status: 'in_progress' | 'reviewed' | 'approved' | 'cancelled';
  user_id: number;
  approved_by?: number | null;
  created_at: string;
  completed_at?: string | null;
  user_name?: string;
  approver_name?: string;
  items_count?: number;
  total_difference?: number;
}

export interface StockCountItem {
  id: number;
  count_id: number;
  variant_id: number;
  system_qty: number;
  counted_qty?: number | null;
  difference?: number | null;
  note?: string | null;
  product_name?: string;
  variant_name?: string;
  sku?: string;
}

export interface VariantStockInfo {
  variant_id: number;
  product_name: string;
  variant_name?: string;
  sku?: string;
  min_stock: number;
  total_qty: number;
  batches: Batch[];
}

export interface InventoryAlert {
  type: 'expired' | 'expiring_critical' | 'expiring_warning' | 'expiring_notice' | 'low_stock' | 'dead_stock';
  severity: 'danger' | 'warning' | 'info';
  variant_id: number;
  product_name: string;
  variant_name?: string;
  sku?: string;
  batch_id?: number;
  batch_no?: string;
  expiry_date?: string;
  days_remaining?: number;
  qty_remaining?: number;
  min_stock?: number;
  message?: string;
}

export interface ValuationCategoryGroup {
  category_id?: number;
  category_name: string;
  cost_value: number;
  sale_value: number;
  expected_profit: number;
  total_qty: number;
}

export interface ValuationBrandGroup {
  brand_id?: number;
  brand_name: string;
  cost_value: number;
  sale_value: number;
  expected_profit: number;
  total_qty: number;
}

export interface InventoryValuation {
  total_cost_value: number;
  total_sale_value: number;
  expected_profit: number;
  total_items_count: number;
  by_category?: ValuationCategoryGroup[];
  by_brand?: ValuationBrandGroup[];
}
