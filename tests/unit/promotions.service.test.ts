import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { PromotionsService } from '../../src/main/services/promotions.service';
import { AuditService } from '../../src/main/services/audit.service';

describe('PromotionsService: Offers & Discounts Engine', () => {
  let db: Database.Database;
  let auditService: AuditService;
  let promotionsService: PromotionsService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    db.prepare(`
      INSERT INTO users (id, uuid, username, display_name, password_hash, role, is_active, created_at)
      VALUES (1, 'u-1', 'admin_test', 'المسؤول', 'hash', 'owner', 1, datetime('now'))
    `).run();

    auditService = new AuditService(db);
    promotionsService = new PromotionsService(db, auditService);
  });

  afterEach(() => {
    db.close();
  });

  test('إنشاء عرض خصم نسبة مئوية والتحقق من احتساب الخصم في السلة', () => {
    // 1. إنشاء عرض خصم 20%
    const promo = promotionsService.createPromotion(
      {
        name: 'عرض الصيف 20%',
        type: 'percentage',
        discount_value: 20,
        min_qty: 1,
      },
      1
    );

    expect(promo.id).toBeDefined();
    expect(promo.name).toBe('عرض الصيف 20%');

    // 2. احتساب الخصم على سلة مشتريات (قطعة بقيمة 200 ج.م = 20000 قرش)
    const discounts = promotionsService.calculateDiscounts([
      {
        productId: 10,
        unitPrice: 20000,
        qty: 1,
      },
    ]);

    expect(discounts.length).toBe(1);
    expect(discounts[0].discountAmount).toBe(4000); // 20% من 20000 = 4000 قرش (40 ج.م)
  });

  test('عرض اشترِ 1 واحصل على 1 مجاناً (BOGO)', () => {
    // إنشاء عرض BOGO بحد أدنى 2
    promotionsService.createPromotion(
      {
        name: 'اشترِ 1 واحصل على 1 مجاناً',
        type: 'bogo',
        discount_value: 100,
        min_qty: 2,
      },
      1
    );

    // إذا اشترى العميل قطعة واحدة، لا يطبق العرض
    const singleItemDiscounts = promotionsService.calculateDiscounts([
      {
        productId: 5,
        unitPrice: 15000,
        qty: 1,
      },
    ]);
    expect(singleItemDiscounts.length).toBe(0);

    // إذا اشترى قطعتين، يخصم ثمن قطعة واحدة كاملة (15000 قرش)
    const twoItemsDiscounts = promotionsService.calculateDiscounts([
      {
        productId: 5,
        unitPrice: 15000,
        qty: 2,
      },
    ]);
    expect(twoItemsDiscounts.length).toBe(1);
    expect(twoItemsDiscounts[0].discountAmount).toBe(15000);
  });

  test('تحديث وحذف العرض الترويجي', () => {
    const promo = promotionsService.createPromotion({
      name: 'عرض أسبوعي مؤقت',
      type: 'fixed_amount',
      discount_value: 1500, // 15 ج.م
      min_qty: 1,
    });

    const updated = promotionsService.updatePromotion(promo.id, {
      name: 'عرض أسبوعي محدث',
      discount_value: 2000,
    });
    expect(updated.name).toBe('عرض أسبوعي محدث');
    expect(updated.discount_value).toBe(2000);

    const deleted = promotionsService.deletePromotion(promo.id, 1);
    expect(deleted).toBe(true);

    const check = promotionsService.getPromotionById(promo.id);
    expect(check).toBeNull();
  });
});
