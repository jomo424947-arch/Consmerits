export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id: number;
  uuid: string;
  user_id: number;
  opening_balance: number; // بالقروش
  closing_balance?: number | null; // العد الأعمى للكاشير بالقروش
  expected_balance?: number | null; // الحساب التلقائي من النظام بالقروش
  difference?: number | null; // العجز أو الزيادة بالقروش
  status: ShiftStatus;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;

  // أسماء بديلة للتوافق مع الخدمات القديمة
  opening_cash?: number;
  actual_closing_cash?: number | null;
  expected_closing_cash?: number | null;
  difference_amount?: number | null;
  cashier_name?: string;
}

export interface CashMovementsFilter {
  shift_id: number;
  type?: CashMovementType;
}

export interface ExpensesFilter {
  shift_id?: number;
  category?: string;
  date_from?: string;
  date_to?: string;
}

export type CashMovementType =
  | 'sale'
  | 'refund'
  | 'expense'
  | 'deposit'
  | 'withdrawal';

export interface CashMovement {
  id: number;
  shift_id: number;
  user_id?: number | null;
  type: CashMovementType;
  amount: number; // بالقروش (+ إيداع/بيع، - سحب/مصروف)
  ref_type?: string | null;
  ref_id?: number | null;
  note?: string | null;
  reason?: string; // اسم بديل للـ note
  created_at: string;
}

export interface Expense {
  id: number;
  uuid: string;
  shift_id: number;
  user_id: number;
  category: string;
  amount: number; // بالقروش
  note?: string | null;
  created_at: string;
}
