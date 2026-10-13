import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { runMigrations } from '../../src/main/db/migrator';
import { ReportsService } from '../../src/main/services/reports.service';
import { AuthService } from '../../src/main/services/auth.service';
import { CashService } from '../../src/main/services/cash.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('ReportsService (محرك التقارير والإحصائيات)', () => {
  let db: Database.Database;
  let reportsService: ReportsService;
  let cashService: CashService;
  let cashierId: number;
  let shiftId: number;
  let productId: number;
  let variantId: number;
  let batchId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    reportsService = new ReportsService(db);
    cashService = new CashService(db);

    const authService = new AuthService(db);
    const cashier = authService.createUser({
      username: 'report_cashier',
      display_name: 'كاشير التقارير',
      password: 'password',
      pin: '9900',
      role: USER_ROLES.CASHIER,
    });
    cashierId = cashier.id;

    // إنشاء وردية
    const shiftUuid = crypto.randomUUID();
    const shiftRes = db
      .prepare(
        `INSERT INTO shifts (uuid, user_id, opening_balance, status, opened_at) VALUES (?, ?, 50000, 'open', datetime('now'))`
      )
      .run(shiftUuid, cashierId);
    shiftId = Number(shiftRes.lastInsertRowid);

    // إيداع افتتاحي
    db.prepare(
      `INSERT INTO cash_movements (shift_id, user_id, type, amount, note, created_at) VALUES (?, ?, 'deposit', 50000, 'رصيد افتتاحي للوردية', datetime('now'))`
    ).run(shiftId, cashierId);

    // إنشاء تصنيف
    const catRes = db
      .prepare(
        `INSERT INTO categories (uuid, name, created_at) VALUES (?, 'عناية بالبشرة', datetime('now'))`
      )
      .run(crypto.randomUUID());
    const catId = Number(catRes.lastInsertRowid);

    // إنشاء منتج
    const prodRes = db
      .prepare(
        `INSERT INTO products (uuid, name_ar, category_id, is_active, created_at, updated_at) VALUES (?, 'كريم مرطب', ?, 1, datetime('now'), datetime('now'))`
      )
      .run(crypto.randomUUID(), catId);
    productId = Number(prodRes.lastInsertRowid);

    // إنشاء متغيّر المنتج (Variant)
    const varRes = db
      .prepare(
        `INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock, is_active) VALUES (?, ?, '50ml', 'SKU-001', 15000, 5, 1)`
      )
      .run(crypto.randomUUID(), productId);
    variantId = Number(varRes.lastInsertRowid);

    // إضافة باركود
    db.prepare(`INSERT INTO product_barcodes (variant_id, barcode) VALUES (?, '6221155001234')`).run(
      variantId
    );

    // إنشاء دفعة
    const batchRes = db
      .prepare(
        `INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at) VALUES (?, 'BATCH-001', date('now', '+180 days'), 8000, 50, datetime('now'))`
      )
      .run(variantId);
    batchId = Number(batchRes.lastInsertRowid);

    // تنفيذ عمليتي بيع
    const saleSeq1 = db
      .prepare(`UPDATE counters SET value = value + 1 WHERE name = 'sale_seq' RETURNING value`)
      .get() as { value: number };

    const saleUuid1 = crypto.randomUUID();
    const saleRes1 = db
      .prepare(
        `INSERT INTO sales (uuid, seq_no, invoice_no, user_id, shift_id, subtotal, discount_amount, tax_amount, total, status, created_at) VALUES (?, ?, ?, ?, ?, 30000, 0, 0, 30000, 'completed', datetime('now'))`
      )
      .run(
        saleUuid1,
        saleSeq1.value,
        `INV-${String(saleSeq1.value).padStart(6, '0')}`,
        cashierId,
        shiftId
      );
    const saleId1 = Number(saleRes1.lastInsertRowid);

    db.prepare(
      `INSERT INTO sale_items (sale_id, variant_id, batch_id, product_name, variant_name, qty, unit_price, unit_cost, discount_amount, line_total) VALUES (?, ?, ?, 'كريم مرطب', '50ml', 2, 15000, 8000, 0, 30000)`
    ).run(saleId1, variantId, batchId);
    db.prepare(`INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, 'cash', 30000)`).run(
      saleId1
    );
    db.prepare(
      `INSERT INTO cash_movements (shift_id, user_id, type, amount, ref_type, ref_id, note, created_at) VALUES (?, ?, 'sale', 30000, 'sale', ?, 'فاتورة نقدية', datetime('now'))`
    ).run(shiftId, cashierId, saleId1);

    // بيع ثاني بالبطاقة
    const saleSeq2 = db
      .prepare(`UPDATE counters SET value = value + 1 WHERE name = 'sale_seq' RETURNING value`)
      .get() as { value: number };
    const saleUuid2 = crypto.randomUUID();
    const saleRes2 = db
      .prepare(
        `INSERT INTO sales (uuid, seq_no, invoice_no, user_id, shift_id, subtotal, discount_amount, tax_amount, total, status, created_at) VALUES (?, ?, ?, ?, ?, 15000, 0, 0, 15000, 'completed', datetime('now'))`
      )
      .run(
        saleUuid2,
        saleSeq2.value,
        `INV-${String(saleSeq2.value).padStart(6, '0')}`,
        cashierId,
        shiftId
      );
    const saleId2 = Number(saleRes2.lastInsertRowid);

    db.prepare(
      `INSERT INTO sale_items (sale_id, variant_id, batch_id, product_name, variant_name, qty, unit_price, unit_cost, discount_amount, line_total) VALUES (?, ?, ?, 'كريم مرطب', '50ml', 1, 15000, 8000, 0, 15000)`
    ).run(saleId2, variantId, batchId);
    db.prepare(`INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, 'card', 15000)`).run(
      saleId2
    );

    // تسجيل مصروف
    db.prepare(
      `INSERT INTO expenses (uuid, shift_id, user_id, category, amount, note, created_at) VALUES (?, ?, ?, 'وجبات وضيافة', 3000, 'مياه وشاي', datetime('now'))`
    ).run(crypto.randomUUID(), shiftId, cashierId);
    db.prepare(
      `INSERT INTO cash_movements (shift_id, user_id, type, amount, ref_type, note, created_at) VALUES (?, ?, 'expense', -3000, 'expense', 'مصروف ضيافة', datetime('now'))`
    ).run(shiftId, cashierId);
  });

  afterEach(() => {
    db.close();
  });

  test('لوحة المؤشرات (Dashboard KPIs): مبيعات وأرباح ومخزون ووردية نشطة', () => {
    const kpis = reportsService.getDashboardKpis();

    // إجمالي مبيعات اليوم = 30000 + 15000 = 45000 قرش
    expect(kpis.today_sales_piasters).toBe(45000);
    expect(kpis.today_invoices_count).toBe(2);
    expect(kpis.avg_basket_size_piasters).toBe(22500);

    // الأرباح: 3 وحدات × (15000 - 8000) = 21000 بدون خصم
    expect(kpis.today_net_profit_piasters).toBe(21000);

    // وردية نشطة
    expect(kpis.active_shift).toBeDefined();
    expect(kpis.active_shift!.id).toBe(shiftId);
    expect(kpis.active_shift!.cashier_name).toBe('كاشير التقارير');

    // أكثر المنتجات مبيعاً اليوم
    expect(kpis.top_products_today.length).toBe(1);
    expect(kpis.top_products_today[0].name).toContain('كريم مرطب');
  });

  test('تقرير المبيعات اليومي: إجماليات دقيقة ونسب الأرباح', () => {
    const today = new Date().toISOString().slice(0, 10);
    const report = reportsService.getDailySalesReport({ startDate: today, endDate: today });

    expect(report.items.length).toBe(1);
    expect(report.totals.total_invoices).toBe(2);
    expect(report.totals.total_net_sales).toBe(45000);
    expect(report.totals.total_gross_profit).toBeGreaterThan(0);
  });

  test('تقرير طرق الدفع: تقسيم نقدي وبطاقات بدقة', () => {
    const payments = reportsService.getSalesByPaymentMethod();

    expect(payments.length).toBeGreaterThanOrEqual(2);
    const cashPayment = payments.find((p) => p.method === 'cash');
    const cardPayment = payments.find((p) => p.method === 'card');

    expect(cashPayment).toBeDefined();
    expect(cashPayment!.amount_piasters).toBe(30000);
    expect(cardPayment).toBeDefined();
    expect(cardPayment!.amount_piasters).toBe(15000);
  });

  test('تقرير الأرباح والخسائر (P&L): إيرادات وتكاليف ومصروفات', () => {
    const today = new Date().toISOString().slice(0, 10);
    const pl = reportsService.getProfitLossReport({ startDate: today, endDate: today });

    expect(pl.gross_sales).toBe(45000);
    expect(pl.cogs).toBe(24000); // 3 × 8000
    expect(pl.gross_profit).toBe(21000);
    expect(pl.operating_expenses_total).toBe(3000);
    expect(pl.net_profit).toBe(18000); // 21000 - 3000
    expect(pl.expenses_breakdown.length).toBe(1);
    expect(pl.expenses_breakdown[0].category).toBe('وجبات وضيافة');
  });

  test('تقرير أداء المنتجات: الأفضل مبيعاً', () => {
    const performance = reportsService.getProductPerformanceReport({ days: 1 });

    expect(performance.top_sellers.length).toBe(1);
    expect(performance.top_sellers[0].product_name).toContain('كريم مرطب');
    expect(performance.top_sellers[0].units_sold).toBe(3);
    expect(performance.top_sellers[0].revenue_piasters).toBe(45000);
    expect(performance.top_sellers[0].profit_piasters).toBe(21000);
  });

  test('ملخص التدفق النقدي: تدفقات واردة وصادرة وصافي', () => {
    const today = new Date().toISOString().slice(0, 10);
    const cashFlow = reportsService.getCashFlowSummary({ startDate: today, endDate: today });

    expect(cashFlow.inflows.cash_sales).toBe(30000);
    expect(cashFlow.outflows.operating_expenses).toBe(3000);
    expect(cashFlow.net_cash_flow).toBe(27000);
  });
});
