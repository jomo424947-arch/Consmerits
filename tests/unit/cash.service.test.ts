import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { CashService } from '../../src/main/services/cash.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('CashService', () => {
  let db: Database.Database;
  let cashService: CashService;
  let authService: AuthService;
  let cashierId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    cashService = new CashService(db);
    authService = new AuthService(db);

    const cashier = authService.createUser({
      username: 'cashier_user',
      display_name: 'كاشير الورديات',
      password: 'password',
      pin: '5566',
      role: USER_ROLES.CASHIER,
    });
    cashierId = cashier.id;
  });

  afterEach(() => {
    db.close();
  });

  test('فتح وردية جديدة وتسجيل الرصيد الافتتاحي ومنع فتح ورديتين لنفس الكاشير', async () => {
    const shift = await cashService.openShift(cashierId, 50000); // 500 ج.م

    expect(shift.id).toBeDefined();
    expect(shift.status).toBe('open');
    expect(shift.opening_balance).toBe(50000);

    const active = await cashService.getActiveShift(cashierId);
    expect(active?.id).toBe(shift.id);

    // محاولة فتح وردية ثانية بينما الأولى مفتوحة تفشل
    await expect(cashService.openShift(cashierId, 20000)).rejects.toThrow(
      'توجد وردية مفتوحة بالفعل'
    );
  });

  test('تسجيل مصروفات نقدية وخصمها من رصيد الخزنة', async () => {
    const shift = await cashService.openShift(cashierId, 100000); // 1000 ج.م

    const expense = await cashService.recordExpense({
      shift_id: shift.id,
      user_id: cashierId,
      category: 'ضيافة وبوفيه',
      amount: 15000, // 150 ج.م
      note: 'شراء شاي ومياه معدنية',
    });

    expect(expense.id).toBeDefined();
    expect(expense.amount).toBe(15000);
    expect(expense.category).toBe('ضيافة وبوفيه');

    // فحص تقرير الوردية المؤقت
    const summary = cashService.getShiftSummary(shift.id);
    expect(summary.total_expenses).toBe(15000);
    expect(summary.expected_balance).toBe(85000); // 1000 - 150 = 850 ج.م
  });

  test('إغلاق الوردية بالعد الأعمى وحساب العجز أو الزيادة بدقة', async () => {
    const shift = await cashService.openShift(cashierId, 50000); // 500 ج.م

    // تسجيل مبيعات نقدية بقيمة 300 ج.م
    await cashService.recordCashMovement({
      shift_id: shift.id,
      user_id: cashierId,
      type: 'sale',
      amount: 30000,
      note: 'فاتورة نقدية',
    });

    // المتوقع: 500 + 300 = 800 ج.م (80000 قرش)
    // الكاشير أدخل في العد الأعمى 780 ج.م (78000 قرش) -> يوجد عجز 20 ج.م (-2000)
    const closed = await cashService.closeShift(shift.id, 78000, 'عجز طفيف نهاية الوردية');

    expect(closed.shift.status).toBe('closed');
    expect(closed.expected_balance).toBe(80000);
    expect(closed.actual_balance).toBe(78000);
    expect(closed.difference).toBe(-2000); // عجز 20 ج.م
  });

  test('تسجيل الإيداعات (Cash In) والسحوبات (Cash Drop) وتأثيرها على الرصيد', async () => {
    const shift = await cashService.openShift(cashierId, 50000); // 500 ج.م

    // تزويد فكة (إيداع 200 ج.م)
    const deposit = await cashService.recordDeposit(shift.id, cashierId, 20000, 'فكة إضافية');
    expect(deposit.type).toBe('deposit');
    expect(deposit.amount).toBe(20000);

    // سحب فائض نقدية للخزنة (Cash Drop 300 ج.م)
    const drop = await cashService.recordWithdrawal(shift.id, cashierId, 30000, 'توريد للخزنة الرئيسية');
    expect(drop.type).toBe('withdrawal');
    expect(drop.amount).toBe(-30000);

    const summary = cashService.getShiftSummary(shift.id);
    expect(summary.total_deposits).toBe(20000);
    expect(summary.total_withdrawals).toBe(30000);
    // المتوقع = 500 + 200 - 300 = 400 ج.م (40000 قرش)
    expect(summary.expected_balance).toBe(40000);

    // التحقق من فلترة الحركات
    const movements = await cashService.getCashMovements({ shift_id: shift.id });
    expect(movements.length).toBe(3); // افتتاح + إيداع + سحب

    const depositsOnly = await cashService.getCashMovements({ shift_id: shift.id, type: 'deposit' });
    expect(depositsOnly.length).toBe(2); // افتتاح (نوعه deposit) + الإيداع الإضافي
  });

  test('استعراض المصروفات وتصنيفاتها وسجل الورديات وفتح الدرج', async () => {
    const shift = await cashService.openShift(cashierId, 30000);

    await cashService.recordExpense({
      shift_id: shift.id,
      user_id: cashierId,
      category: 'نظافة ومستلزمات',
      amount: 5000,
      note: 'مناديل ومطهر',
    });

    const categories = cashService.getExpenseCategories();
    expect(categories).toContain('نظافة ومستلزمات');
    expect(categories).toContain('إيجار ومرافق');

    const expenses = await cashService.getExpenses({ shift_id: shift.id });
    expect(expenses.length).toBe(1);
    expect(expenses[0].category).toBe('نظافة ومستلزمات');

    // تسجيل فتح درج النقدية
    await expect(cashService.logDrawerOpen(shift.id, cashierId, 'فحص الفكة')).resolves.not.toThrow();

    // فحص تاريخ الورديات
    const history = await cashService.getShiftHistory({ userId: cashierId });
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].cashier_name).toBe('كاشير الورديات');
  });
});

