import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { SuppliersService } from '../../src/main/services/suppliers.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('SuppliersService (خدمة الموردين وحساباتهم)', () => {
  let db: Database.Database;
  let suppliersService: SuppliersService;
  let authService: AuthService;
  let userId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    suppliersService = new SuppliersService(db);
    authService = new AuthService(db);

    const user = authService.createUser({
      username: 'purchasing_mgr',
      display_name: 'مسؤول المشتريات',
      password: 'password',
      pin: '1234',
      role: USER_ROLES.MANAGER,
    });
    userId = user.id;
  });

  afterEach(() => {
    db.close();
  });

  test('إنشاء مورد جديد والبحث عنه وتحديث بياناته بنجاح', async () => {
    const created = await suppliersService.create(
      {
        name: 'شركة لوريال باريس مصر',
        phone: '01012345678',
        address: 'القاهرة - المعادي',
        initial_balance: 100000, // 1000 ج.م رصيد افتتاحي
      },
      userId
    );

    expect(created.id).toBeDefined();
    expect(created.name).toBe('شركة لوريال باريس مصر');
    expect(created.balance).toBe(100000);

    // البحث
    const searchList = await suppliersService.list({ search: 'لوريال' });
    expect(searchList.length).toBe(1);
    expect(searchList[0].id).toBe(created.id);

    // التحديث
    const updated = await suppliersService.update(
      created.id,
      { phone: '01099999999', address: 'التجمع الخامس' },
      userId
    );
    expect(updated.phone).toBe('01099999999');
    expect(updated.address).toBe('التجمع الخامس');
  });

  test('منع أرشفة مورد له رصيد متبقي والسماح بها بعد تصفية الرصيد', async () => {
    const supplier = await suppliersService.create(
      { name: 'مورد مدين', initial_balance: 50000 },
      userId
    );

    // محاولة الأرشفة تفشل بسبب الرصيد
    await expect(suppliersService.archive(supplier.id, userId)).rejects.toThrow(
      'لا يمكن أرشفة مورد له رصيد متبقي مستحق'
    );

    // سداد الرصيد بالكامل
    await suppliersService.recordPayment({
      supplierId: supplier.id,
      amount: 50000,
      paymentMethod: 'cash',
      userId,
    });

    // الآن تنجح الأرشفة
    await suppliersService.archive(supplier.id, userId);

    const archived = await suppliersService.getById(supplier.id);
    expect(archived?.is_active).toBe(0);
  });

  test('تسجيل دفعة سداد للمورد وتخفيض رصيده وتسجيل حركة الخزنة', async () => {
    const supplier = await suppliersService.create(
      { name: 'شركة إيفا لمستحضرات التجميل', initial_balance: 200000 },
      userId
    );

    // فتح وردية للتأكد من ربط حركة الخزنة
    const shiftRes = db
      .prepare(`
        INSERT INTO shifts (uuid, user_id, opening_balance, status, opened_at)
        VALUES ('SHIFT-SUP', ?, 100000, 'open', datetime('now'))
      `)
      .run(userId);
    const shiftId = Number(shiftRes.lastInsertRowid);

    const payment = await suppliersService.recordPayment({
      supplierId: supplier.id,
      amount: 75000, // 750 ج.م
      paymentMethod: 'cash',
      note: 'دفعة نقدية تحت الحساب',
      userId,
      shiftId,
    });

    expect(payment.id).toBeDefined();
    expect(payment.amount).toBe(75000);

    // فحص رصيد المورد بعد السداد (200000 - 75000 = 125000)
    const updatedSupplier = await suppliersService.getById(supplier.id);
    expect(updatedSupplier?.balance).toBe(125000);

    // فحص تسجيل حركة صرف الخزنة
    const cashMove = db
      .prepare(
        "SELECT * FROM cash_movements WHERE ref_type = 'supplier_payment' AND ref_id = ?"
      )
      .get(payment.id) as { type: string; amount: number; note: string } | undefined;

    expect(cashMove).toBeDefined();
    expect(cashMove?.type).toBe('withdrawal');
    expect(cashMove?.amount).toBe(75000);
    expect(cashMove?.note).toContain('سداد للمورد');
  });

  test('استخراج كشف حساب المورد وحساب الرصيد التراكمي بدقة', async () => {
    const supplier = await suppliersService.create({ name: 'مورد كشف حساب' }, userId);

    // 1. فاتورة شراء بقيمة 50000
    db.prepare(`
      INSERT INTO purchases (uuid, invoice_no, supplier_id, subtotal, discount, tax, total, paid, payment_method, status, user_id, created_at)
      VALUES ('PUR-1', 'INV-001', ?, 50000, 0, 0, 50000, 0, 'credit', 'completed', ?, datetime('now', '-2 days'))
    `).run(supplier.id, userId);
    db.prepare('UPDATE suppliers SET balance = balance + 50000 WHERE id = ?').run(supplier.id);

    // 2. سداد 20000
    await suppliersService.recordPayment({
      supplierId: supplier.id,
      amount: 20000,
      paymentMethod: 'cash',
      userId,
    });

    const statement = await suppliersService.getStatement(supplier.id);

    expect(statement.total_purchases).toBe(50000);
    expect(statement.total_payments).toBe(20000);
    expect(statement.current_balance).toBe(30000);
    expect(statement.entries.length).toBe(2);

    expect(statement.entries[0].type).toBe('purchase');
    expect(statement.entries[0].debit).toBe(50000);
    expect(statement.entries[0].balance_after).toBe(50000);

    expect(statement.entries[1].type).toBe('payment');
    expect(statement.entries[1].credit).toBe(20000);
    expect(statement.entries[1].balance_after).toBe(30000);
  });
});
