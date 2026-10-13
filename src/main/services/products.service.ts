/**
 * خدمة إدارة المنتجات والأصناف والباركود (Products Service)
 * تدير: إنشاء وتحديث المنتجات، إدارة الـ Variants، البحث بالاسم والباركود والـ SKU،
 * توليد باركود EAN-13 الداخلي، والتحديث بالجملة
 */

import crypto from 'crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import {
  Product,
  ProductVariant,
  ProductWithVariants,
  VariantDetail,
  ProductLookupResult,
  Batch,
} from '../../shared/types/products.types';
import {
  CreateProductInput,
  UpdateProductInput,
  BulkUpdateProductsInput,
} from '../../shared/schemas/products.schema';
import { generateInternalBarcode, validateEan13 } from '../../shared/utils/barcode';
import { auditService as globalAuditService, AuditService } from './audit.service';

export interface ProductSearchOptions {
  categoryId?: number;
  brandId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class ProductsService {
  private db?: Database.Database;
  private auditService: AuditService;

  constructor(db?: Database.Database, audit?: AuditService) {
    this.db = db;
    this.auditService = audit ?? (db ? new AuditService(db) : globalAuditService);
  }

  private getDb(): Database.Database {
    return this.db ?? getDatabase();
  }

  /**
   * توليد باركود داخلي فريد EAN-13 يبدأ بالبادئة 200
   */
  async generateInternalBarcode(): Promise<string> {
    const db = this.getDb();
    let barcode = '';

    const generateTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO counters (name, value) VALUES ('internal_barcode_seq', 1)
        ON CONFLICT(name) DO UPDATE SET value = value + 1
      `).run();

      const row = db
        .prepare("SELECT value FROM counters WHERE name = 'internal_barcode_seq'")
        .get() as { value: number };

      const seq = row?.value ?? 1;
      barcode = generateInternalBarcode(seq, '200');

      // التأكد من عدم وجود الباركود مسبقاً (احتياط أمان)
      const existing = db
        .prepare('SELECT id FROM product_barcodes WHERE barcode = ?')
        .get(barcode);
      if (existing) {
        // إذا تصادف وجوده، نقفز للرقم التالي
        db.prepare(
          "UPDATE counters SET value = value + 1 WHERE name = 'internal_barcode_seq'"
        ).run();
        const nextRow = db
          .prepare("SELECT value FROM counters WHERE name = 'internal_barcode_seq'")
          .get() as { value: number };
        barcode = generateInternalBarcode(nextRow.value, '200');
      }
    });

    generateTx();
    return barcode;
  }

  /**
   * إنشاء تصنيف إن لم يكن موجوداً
   */
  getOrCreateCategory(name: string): number {
    const db = this.getDb();
    const cleanName = name.trim();
    const existing = db
      .prepare('SELECT id FROM categories WHERE name = ?')
      .get(cleanName) as { id: number } | undefined;

    if (existing) {
      return existing.id;
    }

    const uuid = crypto.randomUUID();
    const result = db
      .prepare(
        "INSERT INTO categories (uuid, name, is_active, created_at) VALUES (?, ?, 1, datetime('now'))"
      )
      .run(uuid, cleanName);

    return Number(result.lastInsertRowid);
  }

  /**
   * إنشاء ماركة تجارية إن لم تكن موجودة
   */
  getOrCreateBrand(name: string): number {
    const db = this.getDb();
    const cleanName = name.trim();
    const existing = db
      .prepare('SELECT id FROM brands WHERE name = ?')
      .get(cleanName) as { id: number } | undefined;

    if (existing) {
      return existing.id;
    }

    const uuid = crypto.randomUUID();
    const result = db
      .prepare(
        "INSERT INTO brands (uuid, name, is_active, created_at) VALUES (?, ?, 1, datetime('now'))"
      )
      .run(uuid, cleanName);

    return Number(result.lastInsertRowid);
  }

  /**
   * إنشاء منتج كامل مع الـ Variants والباركود داخل Transaction واحد
   */
  async createProduct(
    input: CreateProductInput,
    actorUserId?: number
  ): Promise<ProductWithVariants> {
    const db = this.getDb();
    let productId = 0;

    const createTx = db.transaction(() => {
      const productUuid = crypto.randomUUID();

      let categoryId = input.category_id ?? null;
      if (!categoryId && (input as any).category_name) {
        categoryId = this.getOrCreateCategory((input as any).category_name);
      }

      let brandId = input.brand_id ?? null;
      if (!brandId && (input as any).brand_name) {
        brandId = this.getOrCreateBrand((input as any).brand_name);
      }

      const insertProduct = db.prepare(`
        INSERT INTO products (
          uuid, category_id, brand_id, name_ar, name_en, unit, image_path, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `);

      const pResult = insertProduct.run(
        productUuid,
        categoryId,
        brandId,
        input.name_ar.trim(),
        input.name_en?.trim() ?? null,
        input.unit ?? 'قطعة',
        (input as any).image_path ?? null
      );
      productId = Number(pResult.lastInsertRowid);

      const insertVariant = db.prepare(`
        INSERT INTO product_variants (
          uuid, product_id, sku, name, sale_price, min_stock, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `);

      const insertBarcode = db.prepare(`
        INSERT INTO product_barcodes (variant_id, barcode, is_internal)
        VALUES (?, ?, ?)
      `);

      for (const vInput of input.variants) {
        const variantUuid = crypto.randomUUID();
        const salePrice = vInput.sale_price ?? vInput.selling_price ?? 0;
        const variantName = vInput.variant_name ?? vInput.name ?? null;
        const minStock = vInput.min_stock ?? vInput.min_stock_level ?? 0;
        const sku = vInput.sku?.trim() || null;

        const vResult = insertVariant.run(
          variantUuid,
          productId,
          sku,
          variantName,
          salePrice,
          minStock
        );
        const variantId = Number(vResult.lastInsertRowid);

        const barcodes = vInput.barcodes && vInput.barcodes.length > 0 ? vInput.barcodes : [];

        if (barcodes.length === 0) {
          // توليد باركود داخلي تلقائي للـ variant في حال لم يحدد المستخدم باركود
          db.prepare(`
            INSERT INTO counters (name, value) VALUES ('internal_barcode_seq', 1)
            ON CONFLICT(name) DO UPDATE SET value = value + 1
          `).run();
          const row = db
            .prepare("SELECT value FROM counters WHERE name = 'internal_barcode_seq'")
            .get() as { value: number };
          const autoBarcode = generateInternalBarcode(row.value, '200');
          insertBarcode.run(variantId, autoBarcode, 1);
        } else {
          barcodes.forEach((bCode) => {
            const isInternal = bCode.startsWith('20') ? 1 : 0;
            insertBarcode.run(variantId, bCode.trim(), isInternal);
          });
        }

        // إنشاء الدفعة الافتتاحية للمخزون إذا تم إدخال رصيد أولي أكبر من الصفر
        const initialStock = Number((vInput as any).initial_stock) || 0;
        if (initialStock > 0) {
          const batchNo = `INIT-${Date.now().toString().slice(-6)}`;
          const batchRes = db.prepare(`
            INSERT INTO batches (variant_id, batch_no, expiry_date, unit_cost, qty_remaining, received_at)
            VALUES (?, ?, NULL, ?, 0, datetime('now'))
          `).run(variantId, batchNo, (vInput as any).cost_price ?? 0);
          const batchId = Number(batchRes.lastInsertRowid);

          // إدراج حركة المخزون (سيقوم مشغل trg_movement_apply بزيادة qty_remaining في الدفعة)
          db.prepare(`
            INSERT INTO stock_movements (batch_id, type, qty, ref_type, ref_id, user_id, note, created_at)
            VALUES (?, 'adjust_in', ?, 'initial_stock', ?, ?, 'رصيد مخزون افتتاحي عند إضافة المنتج', datetime('now'))
          `).run(batchId, initialStock, productId, actorUserId ?? 1);
        }
      }

      if (actorUserId) {
        this.auditService.log({
          userId: actorUserId,
          action: 'CREATE_PRODUCT',
          entityType: 'products',
          entityId: productId,
          details: { name_ar: input.name_ar, variants_count: input.variants.length },
        });
      }
    });

    createTx();
    return this.getProductDetails(productId);
  }

  /**
   * تحديث بيانات المنتج الأساسية
   */
  async updateProduct(
    id: number,
    input: UpdateProductInput,
    actorUserId?: number
  ): Promise<ProductWithVariants> {
    const db = this.getDb();

    const updateTx = db.transaction(() => {
      const updates: string[] = ["updated_at = datetime('now')"];
      const params: any[] = [];

      if (input.name_ar !== undefined) {
        updates.push('name_ar = ?');
        params.push(input.name_ar.trim());
      }
      if (input.name_en !== undefined) {
        updates.push('name_en = ?');
        params.push(input.name_en?.trim() ?? null);
      }
      if (input.category_id !== undefined) {
        updates.push('category_id = ?');
        params.push(input.category_id);
      }
      if (input.brand_id !== undefined) {
        updates.push('brand_id = ?');
        params.push(input.brand_id);
      }
      if (input.unit !== undefined) {
        updates.push('unit = ?');
        params.push(input.unit);
      }
      if ((input as any).image_path !== undefined) {
        updates.push('image_path = ?');
        params.push((input as any).image_path ?? null);
      }
      if (input.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(input.is_active);
      }

      params.push(id);
      db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      if (actorUserId) {
        this.auditService.log({
          userId: actorUserId,
          action: 'UPDATE_PRODUCT',
          entityType: 'products',
          entityId: id,
          details: input as Record<string, unknown>,
        });
      }
    });

    updateTx();
    return this.getProductDetails(id);
  }

  /**
   * جلب تفاصيل منتج بالكامل مع جميع الـ variants والباركود والدفعات الحالية
   */
  getProductDetails(id: number): ProductWithVariants {
    const db = this.getDb();
    const product = db
      .prepare(`
        SELECT p.*, c.name as category_name, b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = ?
      `)
      .get(id) as (Product & { category_name?: string; brand_name?: string }) | undefined;

    if (!product) {
      throw new Error(`المنتج غير موجود برقم: ${id}`);
    }

    const variants = db
      .prepare(`
        SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC
      `)
      .all(id) as ProductVariant[];

    const variantDetails: VariantDetail[] = variants.map((v) => {
      const barcodes = db
        .prepare('SELECT barcode FROM product_barcodes WHERE variant_id = ? ORDER BY id ASC')
        .all(v.id) as { barcode: string }[];

      const stockRow = db
        .prepare(`
          SELECT COALESCE(SUM(qty_remaining), 0) AS total_stock
          FROM batches
          WHERE variant_id = ? AND qty_remaining > 0
        `)
        .get(v.id) as { total_stock: number } | undefined;

      const batches = db
        .prepare(`
          SELECT * FROM batches
          WHERE variant_id = ? AND qty_remaining > 0
          ORDER BY expiry_date ASC NULLS LAST, id ASC
        `)
        .all(v.id) as Batch[];

      return {
        ...v,
        selling_price: v.sale_price,
        sale_price: v.sale_price,
        variant_name: v.name,
        name: v.name,
        cost_price: 0,
        min_stock_level: v.min_stock,
        min_stock: v.min_stock,
        barcodes: barcodes.map((b) => b.barcode),
        total_stock: stockRow?.total_stock ?? 0,
        batches,
      };
    });

    return {
      ...product,
      variants: variantDetails,
    };
  }

  /**
   * البحث عن منتج بواسطة الباركود (مخصص لشاشة البيع POS)
   * يرجع تفاصيل المنتج + الـ Variant المطابق + الرصيد المتاح
   */
  async getProductByBarcode(barcode: string): Promise<ProductLookupResult | null> {
    const db = this.getDb();
    const cleanBarcode = barcode.trim();

    const row = db
      .prepare(`
        SELECT 
          pb.barcode,
          v.id as variant_id,
          v.product_id
        FROM product_barcodes pb
        JOIN product_variants v ON pb.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        WHERE pb.barcode = ? AND p.is_active = 1 AND v.is_active = 1
      `)
      .get(cleanBarcode) as { barcode: string; variant_id: number; product_id: number } | undefined;

    if (!row) {
      return null;
    }

    const fullProduct = this.getProductDetails(row.product_id);
    const matchedVariant = fullProduct.variants.find((v) => v.id === row.variant_id);

    if (!matchedVariant) {
      return null;
    }

    return {
      product: fullProduct,
      variant: matchedVariant,
      matched_barcode: cleanBarcode,
      category_name: fullProduct.category_name,
      brand_name: fullProduct.brand_name,
      available_stock: matchedVariant.total_stock,
    };
  }

  /**
   * بحث سريع بالاسم والباركود و SKU مع دعم الفلاتر والصفحات
   */
  async searchProducts(
    query: string,
    options?: ProductSearchOptions
  ): Promise<ProductWithVariants[]> {
    const db = this.getDb();
    const q = `%${query.trim()}%`;
    const limit = options?.limit ?? 50;
    const offset = ((options?.page ?? 1) - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (query.trim()) {
      whereClauses.push(`(
        p.name_ar LIKE ? OR 
        p.name_en LIKE ? OR 
        v.sku LIKE ? OR 
        pb.barcode LIKE ?
      )`);
      params.push(q, q, q, q);
    }

    if (options?.categoryId) {
      whereClauses.push('p.category_id = ?');
      params.push(options.categoryId);
    }

    if (options?.brandId) {
      whereClauses.push('p.brand_id = ?');
      params.push(options.brandId);
    }

    if (options?.isActive !== undefined) {
      whereClauses.push('p.is_active = ?');
      params.push(options.isActive ? 1 : 0);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const productIdsRows = db
      .prepare(`
        SELECT DISTINCT p.id
        FROM products p
        LEFT JOIN product_variants v ON p.id = v.product_id
        LEFT JOIN product_barcodes pb ON v.id = pb.variant_id
        ${whereSql}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, limit, offset) as { id: number }[];

    return productIdsRows.map((r) => this.getProductDetails(r.id));
  }

  /**
   * أرشفة منتج (تعطيل النشاط)
   */
  async archiveProduct(id: number, actorUserId?: number): Promise<boolean> {
    const db = this.getDb();
    const archiveTx = db.transaction(() => {
      db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
      db.prepare("UPDATE product_variants SET is_active = 0, updated_at = datetime('now') WHERE product_id = ?").run(id);

      if (actorUserId) {
        this.auditService.log({
          userId: actorUserId,
          action: 'ARCHIVE_PRODUCT',
          entityType: 'products',
          entityId: id,
        });
      }
    });

    archiveTx();
    return true;
  }

  /**
   * التحديث بالجملة للمنتجات (تعديل الأسعار، تغيير التصنيف، الأرشفة الجماعية)
   */
  async bulkUpdate(input: BulkUpdateProductsInput, actorUserId?: number): Promise<number> {
    const db = this.getDb();
    let updatedCount = 0;

    const bulkTx = db.transaction(() => {
      // 1. تحديث المنتجات المحددة
      if (input.product_ids && input.product_ids.length > 0) {
        const placeholders = input.product_ids.map(() => '?').join(',');
        if (input.category_id !== undefined) {
          db.prepare(`UPDATE products SET category_id = ? WHERE id IN (${placeholders})`).run(
            input.category_id,
            ...input.product_ids
          );
        }
        if (input.brand_id !== undefined) {
          db.prepare(`UPDATE products SET brand_id = ? WHERE id IN (${placeholders})`).run(
            input.brand_id,
            ...input.product_ids
          );
        }
        if (input.is_active !== undefined) {
          db.prepare(`UPDATE products SET is_active = ? WHERE id IN (${placeholders})`).run(
            input.is_active,
            ...input.product_ids
          );
          db.prepare(`UPDATE product_variants SET is_active = ? WHERE product_id IN (${placeholders})`).run(
            input.is_active,
            ...input.product_ids
          );
        }
        updatedCount += input.product_ids.length;
      }

      // 2. تعديل الأسعار للـ Variants
      if (input.price_adjustment) {
        let variantIds: number[] = input.variant_ids ?? [];
        if (variantIds.length === 0 && input.product_ids && input.product_ids.length > 0) {
          const placeholders = input.product_ids.map(() => '?').join(',');
          const vRows = db
            .prepare(`SELECT id FROM product_variants WHERE product_id IN (${placeholders})`)
            .all(...input.product_ids) as { id: number }[];
          variantIds = vRows.map((r) => r.id);
        }

        if (variantIds.length > 0) {
          for (const vId of variantIds) {
            const variant = db
              .prepare('SELECT sale_price FROM product_variants WHERE id = ?')
              .get(vId) as { sale_price: number } | undefined;

            if (variant) {
              let newPrice = variant.sale_price;
              if (input.price_adjustment.type === 'fixed') {
                newPrice = Math.max(0, newPrice + input.price_adjustment.value);
              } else if (input.price_adjustment.type === 'percentage') {
                const delta = Math.round((newPrice * input.price_adjustment.value) / 100);
                newPrice = Math.max(0, newPrice + delta);
              }

              db.prepare('UPDATE product_variants SET sale_price = ? WHERE id = ?').run(
                newPrice,
                vId
              );
            }
          }
        }
      }

      if (actorUserId) {
        this.auditService.log({
          userId: actorUserId,
          action: 'BULK_UPDATE_PRODUCTS',
          entityType: 'products',
          details: input as Record<string, unknown>,
        });
      }
    });

    bulkTx();
    return updatedCount;
  }
}

export const productsService = new ProductsService();
