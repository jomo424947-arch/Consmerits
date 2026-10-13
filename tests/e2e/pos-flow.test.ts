/**
 * اختبارات التدفق الشامل لشاشة البيع (E2E POS Flow)
 * محاكاة كاملة لدورة عمل نقطة البيع في محل مستحضرات التجميل:
 * تسجيل دخول الكاشير -> فتح وردية -> مسح باركود المنتج -> بيع وفق خوارزمية FEFO ->
 * تسجيل حركة الخزنة -> استخراج الإيصال الحراري -> إغلاق الوردية وإصدار تقرير Z-Report
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { AuthService } from '../../src/main/services/auth.service';
import { CashService } from '../../src/main/services/cash.service';
import { ProductsService } from '../../src/main/services/products.service';
import { SalesService } from '../../src/main/services/sales.service';
import { ReceiptPrinter } from '../../src/main/printing/receipt-printer';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('POS End-to-End Complete Real-World Workflow', () => {
  let db: Database.Database;
  let authService: AuthService;
  let cashService: CashService;
  let productsService: ProductsService;
  let salesService: SalesService;
  let receiptPrinter: ReceiptPrinter;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    authService = new AuthService(db);
    cashService = new CashService(db);
    productsService = new ProductsService(db);
    salesService = new SalesService(db);
    receiptPrinter = new ReceiptPrinter(db);
  });

  afterEach(() => {
    db.close();
  });

  test('اكتمال سيناريو البيع المتكامل من تسجيل الدخول حتى إغلاق الوردية والتقرير المالي', async () => {
    // 1. تسجيل كاشير في النظام وتسجيل الدخول بـ PIN
    const cashier = authService.createUser({
      username: 'sarah_pos',
      display_name: 'سارة أحمد',
      password: 'password123',
      pin: '7788',
      role: USER_ROLES.CASHIER,
    });

    const loggedIn = await authService.loginWithPin('7788');
    expect(loggedIn).not.toBeNull();
    expect(loggedIn?.id).toBe(cashier.id);

    // 2. فتح الوردية برصيد افتتاحي 200 ج.م (20000 قرش)
    const shift = await cashService.openShift(cashier.id, 20000, 'وردية صباحية');
    expect(shift.status).toBe('open');
    expect(shift.opening_balance).toBe(20000);

    // 3. إضافة منتج تجميلي مع درجتين لون وباركود
    const product = await productsService.createProduct({
      name_ar: 'كريم أساس سائل فوتوفوكس',
      name_en: 'Photo Focus Liquid Foundation',
      variants: [
        {
          variant_name: 'درجة بيج فاتح Soft Beige',
          selling_price: 28000, // 280 ج.م
          barcodes: ['6228889990001'],
        },
      ],
    });
    const variantId = product.variants[0].id;
    const barcode = '6228889990001';

    // 4. استلام دفعتين من المنتج بتواريخ صلاحية مختلفة
    // دفعة قريبة: تنتهي بعد شهر وبها قطعتان
    const b1 = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-A', '2026-11-15', 18000, 2, datetime('now'))
      `)
      .run(variantId);
    const batchAId = Number(b1.lastInsertRowid);

    // دفعة أبعد: تنتهي بعد سنة وبها 10 قطع
    const b2 = db
      .prepare(`
        INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
        VALUES (?, 'BATCH-B', '2027-11-15', 18500, 10, datetime('now'))
      `)
      .run(variantId);
    const batchBId = Number(b2.lastInsertRowid);

    // 5. محاكاة مسح الباركود بواسطة ماسح الكاشير
    const lookup = await productsService.getProductByBarcode(barcode);
    expect(lookup).not.toBeNull();
    expect(lookup?.product.name_ar).toBe('كريم أساس سائل فوتوفوكس');
    expect(lookup?.variant.variant_name).toBe('درجة بيج فاتح Soft Beige');
    expect(lookup?.available_stock).toBe(12); // 2 + 10

    // 6. بيع 3 قطع للعميل نقداً
    // خوارزمية FEFO يجب أن تأخذ 2 من BATCH-A وتكمل قطعة من BATCH-B
    const sale = await salesService.createSale(
      {
        items: [
          {
            variant_id: variantId,
            qty: 3,
            unit_price: 28000,
            discount_amount: 0,
          },
        ],
        payments: [
          {
            method: 'cash',
            amount: 84000, // 3 * 280 = 840 ج.م
          },
        ],
        discount_amount: 0,
        notes: 'مبيعات نقدية للعميلة منى',
      },
      cashier.id,
      shift.id
    );

    expect(sale.status).toBe('completed');
    expect(sale.total).toBe(84000);
    expect(sale.items?.length).toBe(2); // تم تقسيمها على الدفعتين

    // 7. التحقق من تحديث أرصدة الدفعات عبر مشغلات قاعدة البيانات (Triggers)
    const batchARow = db
      .prepare('SELECT qty_remaining FROM batches WHERE id = ?')
      .get(batchAId) as { qty_remaining: number };
    const batchBRow = db
      .prepare('SELECT qty_remaining FROM batches WHERE id = ?')
      .get(batchBId) as { qty_remaining: number };

    expect(batchARow.qty_remaining).toBe(0); // تم بيع القطعتين
    expect(batchBRow.qty_remaining).toBe(9); // تم بيع قطعة واحدة وتبقت 9

    // 8. توليد وفحص الإيصال الحراري 80mm
    const receiptHtml = receiptPrinter.generateReceiptHtml(sale);
    expect(receiptHtml).toContain('كريم أساس سائل فوتوفوكس');
    expect(receiptHtml).toContain(sale.invoice_no);
    expect(receiptHtml).toContain('840.00');

    // 9. تسجيل مصروف تشغيلي خلال الوردية (مثلاً مصاريف نظافة 40 ج.م)
    await cashService.recordExpense({
      shift_id: shift.id,
      user_id: cashier.id,
      category: 'نظافة',
      amount: 4000,
      note: 'أدوات تنظيف المحل',
    });

    // 10. إغلاق الوردية بالعد الأعمى
    // الحساب المتوقع في الدرج: 200 (افتتاحي) + 840 (مبيعات نقدي) - 40 (مصروف) = 1000 ج.م (100000 قرش)
    // الكاشيرة قامت بالعد الفعلي ووجدت 1000 ج.م تماماً
    const zReport = await cashService.closeShift(shift.id, 100000, 'إغلاق وردية ممتاز بلا عجز');

    expect(zReport.shift.status).toBe('closed');
    expect(zReport.expected_balance).toBe(100000);
    expect(zReport.actual_balance).toBe(100000);
    expect(zReport.difference).toBe(0);
    expect(zReport.total_cash_sales).toBe(84000);
    expect(zReport.total_expenses).toBe(4000);
  }, 30000);
});
