import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { CustomersService } from '../../src/main/services/customers.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('CustomersService (خدمة العملاء وحسابات الآجل)', () => {
  let db: Database.Database;
  let customersService: CustomersService;
  let authService: AuthService;
  let userId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    customersService = new CustomersService(db);
    authService = new AuthService(db);

    const user = authService.createUser({
      username: 'cashier_cust',
      display_name: 'كاشير العملاء',
      password: 'password',
      pin: '3344',
      role: USER_ROLES.CASHIER,
    });
    userId = user.id;
  });

  afterEach(() => {
    db.close();
  });

  test('إنشاء عميل جديد والبحث عنه وتحديث بياناته بنجاح', async () => {
    const customer = await customersService.create(
      {
        name: 'سارة أحمد محمود',
        phone: '01122334455',
        credit_limit: 50000, // 500 ج.م
        initial_balance: 10000, // 100 ج.م
        notes: 'عميلة VIP',
      },
      userId
    );

    expect(customer.id).toBeDefined();
    expect(customer.name).toBe('سارة أحمد محمود');
    expect(customer.credit_limit).toBe(50000);
    expect(customer.balance).toBe(10000);

    // البحث
    const list = await customersService.list({ search: 'سارة' });
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(customer.id);

    // التحديث
    const updated = await customersService.update(
      customer.id,
      { phone: '01199998888', credit_limit: 80000 },
      userId
    );
    expect(updated.phone).toBe('01199998888');
    expect(updated.credit_limit).toBe(80000);
  });

  test('فحص الحد الائتماني للعميل (Credit Limit Check)', async () => {
    const customer = await customersService.create(
      {
        name: 'منار كريم',
        credit_limit: 40000, // حد 400 ج.م
        initial_balance: 25000, // عليها 250 ج.م
      },
      userId
    );

    // فحص شراء بمبلغ 10000 (المجموع 35000 <= 40000 -> مسموح)
    const check1 = await customersService.checkCreditLimit(customer.id, 10000);
    expect(check1.allowed).toBe(true);
    expect(check1.availableCredit).toBe(15000);

    // فحص شراء بمبلغ 20000 (المجموع 45000 > 40000 -> مرفوض)
    const check2 = await customersService.checkCreditLimit(customer.id, 20000);
    expect(check2.allowed).toBe(false);
  });

  test('منع أرشفة عميل عليه مديونية متبقية والسماح بها بعد السداد', async () => {
    const customer = await customersService.create(
      { name: 'عميل مدين', initial_balance: 15000 },
      userId
    );

    await expect(customersService.archive(customer.id, userId)).rejects.toThrow(
      'لا يمكن أرشفة عميل عليه مديونية متبقية'
    );

    // سداد المبلغ بالكامل
    await customersService.recordPayment({
      customerId: customer.id,
      amount: 15000,
      paymentMethod: 'cash',
      userId,
    });

    await customersService.archive(customer.id, userId);

    const archived = await customersService.getById(customer.id);
    expect(archived?.is_active).toBe(0);
  });

  test('تسجيل دفعة سداد آجل للعميل وتخفيض رصيده وتسجيل حركة إيداع في الخزنة', async () => {
    const customer = await customersService.create(
      { name: 'هدى مصطفى', initial_balance: 30000 },
      userId
    );

    // فتح وردية للتأكد من تسجيل حركة الخزنة
    const shiftRes = db
      .prepare(`
        INSERT INTO shifts (uuid, user_id, opening_balance, status, opened_at)
        VALUES ('SHIFT-CUST', ?, 50000, 'open', datetime('now'))
      `)
      .run(userId);
    const shiftId = Number(shiftRes.lastInsertRowid);

    const payment = await customersService.recordPayment({
      customerId: customer.id,
      amount: 12000,
      paymentMethod: 'cash',
      note: 'سداد دفعة من الحساب نقداً',
      userId,
      shiftId,
    });

    expect(payment.id).toBeDefined();
    expect(payment.amount).toBe(12000);

    // فحص انخفاض رصيد العميل (30000 - 12000 = 18000)
    const updatedCust = await customersService.getById(customer.id);
    expect(updatedCust?.balance).toBe(18000);

    // فحص تسجيل حركة إيداع الخزنة
    const cashMove = db
      .prepare(
        "SELECT * FROM cash_movements WHERE ref_type = 'customer_payment' AND ref_id = ?"
      )
      .get(payment.id) as { type: string; amount: number; note: string } | undefined;

    expect(cashMove).toBeDefined();
    expect(cashMove?.type).toBe('deposit');
    expect(cashMove?.amount).toBe(12000);
    expect(cashMove?.note).toContain('سداد آجل من العميل');
  });

  test('استخراج كشف حساب العميل الشامل وحساب الرصيد التراكمي بدقة', async () => {
    const customer = await customersService.create({ name: 'كشف حساب عميل' }, userId);

    // وردية
    const shiftRes = db
      .prepare(`
        INSERT INTO shifts (uuid, user_id, opening_balance, status, opened_at)
        VALUES ('SHIFT-STMT', ?, 50000, 'open', datetime('now'))
      `)
      .run(userId);
    const shiftId = Number(shiftRes.lastInsertRowid);

    // 1. فاتورة بيع آجل بقيمة 40000
    const saleRes = db
      .prepare(`
        INSERT INTO sales (uuid, seq_no, invoice_no, user_id, shift_id, customer_id, subtotal, discount_amount, tax_amount, total, status, created_at)
        VALUES ('SALE-CUST-1', 1, 'INV-001', ?, ?, ?, 40000, 0, 0, 40000, 'completed', datetime('now', '-3 days'))
      `)
      .run(userId, shiftId, customer.id);
    const saleId = Number(saleRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO sale_payments (sale_id, method, amount)
      VALUES (?, 'credit', 40000)
    `).run(saleId);

    db.prepare('UPDATE customers SET balance = balance + 40000 WHERE id = ?').run(customer.id);

    // 2. سداد 15000
    await customersService.recordPayment({
      customerId: customer.id,
      amount: 15000,
      paymentMethod: 'cash',
      userId,
    });

    const stmt = await customersService.getStatement(customer.id);

    expect(stmt.total_credit_sales).toBe(40000);
    expect(stmt.total_payments).toBe(15000);
    expect(stmt.current_balance).toBe(25000);
    expect(stmt.entries.length).toBe(2);

    expect(stmt.entries[0].type).toBe('sale');
    expect(stmt.entries[0].debit).toBe(40000);
    expect(stmt.entries[0].balance_after).toBe(40000);

    expect(stmt.entries[1].type).toBe('payment');
    expect(stmt.entries[1].credit).toBe(15000);
    expect(stmt.entries[1].balance_after).toBe(25000);
  });
});
