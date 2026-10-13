import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { InventoryService } from '../../src/main/services/inventory.service';

describe('Inventory Alerts Engine (محرك تنبيهات المخزون والصلاحية)', () => {
  let db: Database.Database;
  let inventoryService: InventoryService;
  let prodId: number;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    inventoryService = new InventoryService(db);

    const catRes = db
      .prepare("INSERT INTO categories (uuid, name, created_at) VALUES ('CAT-P', 'عطور', datetime('now'))")
      .run();
    const catId = Number(catRes.lastInsertRowid);

    const prodRes = db
      .prepare(
        "INSERT INTO products (uuid, category_id, name_ar, created_at, updated_at) VALUES ('PROD-PERF', ?, 'عطر مسك الختام', datetime('now'), datetime('now'))"
      )
      .run(catId);
    prodId = Number(prodRes.lastInsertRowid);
  });

  afterEach(() => {
    db.close();
  });

  test('كشف المنتجات منتهية الصلاحية ووشيكة الانتهاء (30 / 60 / 90 يوم) بدقة', async () => {
    // 1. صنف 1: دفعة منتهية
    const v1 = db.prepare(`
      INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
      VALUES ('V-EXP', ?, '100ml Expired', 'SKU-EXP', 15000, 2)
    `).run(prodId);
    const v1Id = Number(v1.lastInsertRowid);

    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'B-EXP', date('now', '-10 days'), 10000, 4, datetime('now'))
    `).run(v1Id);

    // 2. صنف 2: دفعة وشيكة حرج (بعد 15 يوم)
    const v2 = db.prepare(`
      INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
      VALUES ('V-CRIT', ?, '100ml Crit', 'SKU-CRIT', 15000, 2)
    `).run(prodId);
    const v2Id = Number(v2.lastInsertRowid);

    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'B-CRIT', date('now', '+15 days'), 10000, 6, datetime('now'))
    `).run(v2Id);

    // 3. صنف 3: دفعة وشيكة تحذير (بعد 45 يوم)
    const v3 = db.prepare(`
      INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
      VALUES ('V-WARN', ?, '100ml Warn', 'SKU-WARN', 15000, 2)
    `).run(prodId);
    const v3Id = Number(v3.lastInsertRowid);

    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'B-WARN', date('now', '+45 days'), 10000, 8, datetime('now'))
    `).run(v3Id);

    const alerts = await inventoryService.getAlerts();

    const expAlert = alerts.find((a) => a.variant_id === v1Id && a.type === 'expired');
    expect(expAlert).toBeDefined();
    expect(expAlert?.severity).toBe('danger');
    expect(expAlert?.qty_remaining).toBe(4);

    const critAlert = alerts.find((a) => a.variant_id === v2Id && a.type === 'expiring_critical');
    expect(critAlert).toBeDefined();
    expect(critAlert?.severity).toBe('danger');

    const warnAlert = alerts.find((a) => a.variant_id === v3Id && a.type === 'expiring_warning');
    expect(warnAlert).toBeDefined();
    expect(warnAlert?.severity).toBe('warning');
  });

  test('كشف تنبيهات النواقص (Low Stock) عند نزول الرصيد عن الحد الأدنى', async () => {
    // صنف حد أدنى 10، ولديه رصيد 3 فقط
    const v = db.prepare(`
      INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
      VALUES ('V-LOW', ?, 'Low Stock Var', 'SKU-LOW', 4000, 10)
    `).run(prodId);
    const vId = Number(v.lastInsertRowid);

    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'B-LOW', date('now', '+200 days'), 2000, 3, datetime('now'))
    `).run(vId);

    const alerts = await inventoryService.getAlerts();
    const lowAlert = alerts.find((a) => a.variant_id === vId && a.type === 'low_stock');

    expect(lowAlert).toBeDefined();
    expect(lowAlert?.severity).toBe('danger');
    expect(lowAlert?.min_stock).toBe(10);
    expect(lowAlert?.qty_remaining).toBe(3);
  });

  test('كشف تنبيهات الأصناف الراكدة (Dead Stock)', async () => {
    // صنف لديه رصيد بالمخزون ولم يتم بيعه إطلاقاً
    const v = db.prepare(`
      INSERT INTO product_variants (uuid, product_id, name, sku, sale_price, min_stock)
      VALUES ('V-DEAD', ?, 'Dead Stock Var', 'SKU-DEAD', 9000, 0)
    `).run(prodId);
    const vId = Number(v.lastInsertRowid);

    db.prepare(`
      INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
      VALUES (?, 'B-DEAD', date('now', '+365 days'), 5000, 25, datetime('now'))
    `).run(vId);

    const alerts = await inventoryService.getAlerts();
    const deadAlert = alerts.find((a) => a.variant_id === vId && a.type === 'dead_stock');

    expect(deadAlert).toBeDefined();
    expect(deadAlert?.severity).toBe('warning');
    expect(deadAlert?.qty_remaining).toBe(25);
  });
});
