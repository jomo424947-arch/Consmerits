export type PromotionType = 'percentage' | 'fixed_amount' | 'bogo' | 'bundle';

export interface Promotion {
  id: number;
  uuid: string;
  name: string;
  code?: string | null;
  type: PromotionType;
  discount_value: number; // النسبة المئوية أو القيمة بالقروش
  min_qty: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: PromotionItem[];
}

export interface PromotionItem {
  id: number;
  promotion_id: number;
  product_id?: number | null;
  variant_id?: number | null;
  category_id?: number | null;
  product_name?: string | null;
  category_name?: string | null;
}

export interface CreatePromotionInput {
  name: string;
  code?: string | null;
  type: PromotionType;
  discount_value: number;
  min_qty?: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: number;
  notes?: string | null;
  product_ids?: number[];
  variant_ids?: number[];
  category_ids?: number[];
}

export interface UpdatePromotionInput extends Partial<CreatePromotionInput> {}

export interface AppliedPromotionDiscount {
  promotionId: number;
  promotionName: string;
  discountAmount: number; // بالقروش
  note?: string;
}
