/**
 * خدمة العروض الترويجية والخصومات (Promotions & Discounts Service)
 * تدير: إنشاء وتحديث وحذف العروض الترويجية، احتساب الخصومات آلياً لسلة المشتريات،
 * وتطبيق عروض النسب المئوية، المبالغ الثابتة، و BOGO.
 */

import crypto from 'crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import {
  Promotion,
  PromotionItem,
  CreatePromotionInput,
  UpdatePromotionInput,
  AppliedPromotionDiscount,
} from '../../shared/types/promotions.types';
import { auditService as globalAuditService, AuditService } from './audit.service';

export class PromotionsService {
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
   * جلب قائمة العروض الترويجية
   */
  getPromotions(activeOnly: boolean = false): Promotion[] {
    const db = this.getDb();
    try {
      let query = 'SELECT * FROM promotions';
      if (activeOnly) {
        query += " WHERE is_active = 1 AND (start_date IS NULL OR start_date <= date('now')) AND (end_date IS NULL OR end_date >= date('now'))";
      }
      query += ' ORDER BY id DESC';

      const promos = db.prepare(query).all() as Promotion[];

      return promos.map((p) => {
        const items = db
          .prepare(`
            SELECT 
              pi.*, 
              p.name_ar as product_name,
              c.name as category_name
            FROM promotion_items pi
            LEFT JOIN products p ON pi.product_id = p.id
            LEFT JOIN categories c ON pi.category_id = c.id
            WHERE pi.promotion_id = ?
          `)
          .all(p.id) as PromotionItem[];

        return {
          ...p,
          items,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * جلب عرض ترويجي محدد بمعرفه
   */
  getPromotionById(id: number): Promotion | null {
    const db = this.getDb();
    const promo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id) as Promotion | undefined;
    if (!promo) return null;

    const items = db
      .prepare(`
        SELECT 
          pi.*, 
          p.name_ar as product_name,
          c.name as category_name
        FROM promotion_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        LEFT JOIN categories c ON pi.category_id = c.id
        WHERE pi.promotion_id = ?
      `)
      .all(id) as PromotionItem[];

    return {
      ...promo,
      items,
    };
  }

  /**
   * إنشاء عرض ترويجي جديد
   */
  createPromotion(input: CreatePromotionInput, actorUserId?: number): Promotion {
    const db = this.getDb();
    let promoId = 0;

    const createTx = db.transaction(() => {
      const uuid = crypto.randomUUID();
      const code = input.code?.trim() || `PROMO-${Date.now().toString().slice(-6)}`;

      const stmt = db.prepare(`
        INSERT INTO promotions (uuid, name, code, type, discount_value, min_qty, start_date, end_date, is_active, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const res = stmt.run(
        uuid,
        input.name.trim(),
        code,
        input.type,
        input.discount_value,
        input.min_qty ?? 1,
        input.start_date || null,
        input.end_date || null,
        input.is_active ?? 1,
        input.notes?.trim() || null
      );

      promoId = Number(res.lastInsertRowid);

      // إدراج الأصناف المرتبطة
      if (input.product_ids && input.product_ids.length > 0) {
        const itemStmt = db.prepare('INSERT INTO promotion_items (promotion_id, product_id) VALUES (?, ?)');
        for (const pId of input.product_ids) {
          itemStmt.run(promoId, pId);
        }
      }

      if (input.category_ids && input.category_ids.length > 0) {
        const catStmt = db.prepare('INSERT INTO promotion_items (promotion_id, category_id) VALUES (?, ?)');
        for (const cId of input.category_ids) {
          catStmt.run(promoId, cId);
        }
      }

      if (actorUserId) {
        this.auditService.log({
          userId: actorUserId,
          action: 'CREATE_PROMOTION',
          entityType: 'promotions',
          entityId: promoId,
          details: { name: input.name, type: input.type, discount_value: input.discount_value },
        });
      }
    });

    createTx();
    return this.getPromotionById(promoId)!;
  }

  /**
   * تحديث بيانات عرض ترويجي
   */
  updatePromotion(id: number, input: UpdatePromotionInput, actorUserId?: number): Promotion {
    const db = this.getDb();
    const existing = db.prepare('SELECT id FROM promotions WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`العرض الترويجي برقم ${id} غير موجود`);
    }

    const updateTx = db.transaction(() => {
      const updates: string[] = ["updated_at = datetime('now')"];
      const params: any[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        params.push(input.name.trim());
      }
      if (input.code !== undefined) {
        updates.push('code = ?');
        params.push(input.code?.trim() || null);
      }
      if (input.type !== undefined) {
        updates.push('type = ?');
        params.push(input.type);
      }
      if (input.discount_value !== undefined) {
        updates.push('discount_value = ?');
        params.push(input.discount_value);
      }
      if (input.min_qty !== undefined) {
        updates.push('min_qty = ?');
        params.push(input.min_qty);
      }
      if (input.start_date !== undefined) {
        updates.push('start_date = ?');
        params.push(input.start_date || null);
      }
      if (input.end_date !== undefined) {
        updates.push('end_date = ?');
        params.push(input.end_date || null);
      }
      if (input.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(input.is_active);
      }
      if (input.notes !== undefined) {
        updates.push('notes = ?');
        params.push(input.notes?.trim() || null);
      }

      params.push(id);
      db.prepare(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      // تحديث الأصناف إن تم إرسالها
      if (input.product_ids !== undefined) {
        db.prepare('DELETE FROM promotion_items WHERE promotion_id = ? AND product_id IS NOT NULL').run(id);
        const itemStmt = db.prepare('INSERT INTO promotion_items (promotion_id, product_id) VALUES (?, ?)');
        for (const pId of input.product_ids) {
          itemStmt.run(id, pId);
        }
      }

      if (input.category_ids !== undefined) {
        db.prepare('DELETE FROM promotion_items WHERE promotion_id = ? AND category_id IS NOT NULL').run(id);
        const catStmt = db.prepare('INSERT INTO promotion_items (promotion_id, category_id) VALUES (?, ?)');
        for (const cId of input.category_ids) {
          catStmt.run(id, cId);
        }
      }

      if (actorUserId) {
        this.auditService.log({
          userId: actorUserId,
          action: 'UPDATE_PROMOTION',
          entityType: 'promotions',
          entityId: id,
          details: input as Record<string, unknown>,
        });
      }
    });

    updateTx();
    return this.getPromotionById(id)!;
  }

  /**
   * حذف عرض ترويجي
   */
  deletePromotion(id: number, actorUserId?: number): boolean {
    const db = this.getDb();
    const existing = db.prepare('SELECT name FROM promotions WHERE id = ?').get(id) as { name: string } | undefined;
    if (!existing) {
      throw new Error(`العرض الترويجي برقم ${id} غير موجود`);
    }

    db.transaction(() => {
      db.prepare('DELETE FROM promotion_items WHERE promotion_id = ?').run(id);
      db.prepare('DELETE FROM promotions WHERE id = ?').run(id);

      if (actorUserId) {
        this.auditService.log({
          userId: actorUserId,
          action: 'DELETE_PROMOTION',
          entityType: 'promotions',
          entityId: id,
          details: { name: existing.name },
        });
      }
    })();

    return true;
  }

  /**
   * احتساب الخصومات الترويجية النشطة لبنود الفاتورة / السلة
   */
  calculateDiscounts(
    cartItems: {
      productId: number;
      variantId?: number;
      categoryId?: number;
      unitPrice: number; // بالقروش
      qty: number;
    }[]
  ): AppliedPromotionDiscount[] {
    const activePromos = this.getPromotions(true);
    if (activePromos.length === 0 || cartItems.length === 0) return [];

    const discounts: AppliedPromotionDiscount[] = [];

    for (const promo of activePromos) {
      // جمع البنود المشمولة بالعرض
      const promoProductIds = new Set(
        (promo.items || []).filter((i) => i.product_id != null).map((i) => i.product_id!)
      );
      const promoCategoryIds = new Set(
        (promo.items || []).filter((i) => i.category_id != null).map((i) => i.category_id!)
      );

      const appliesToAll = promoProductIds.size === 0 && promoCategoryIds.size === 0;

      for (const item of cartItems) {
        const isMatched =
          appliesToAll ||
          promoProductIds.has(item.productId) ||
          (item.categoryId && promoCategoryIds.has(item.categoryId));

        if (!isMatched) continue;
        if (item.qty < promo.min_qty) continue;

        let discountPiasters = 0;

        if (promo.type === 'percentage') {
          // نسبة مئوية من السعر الإجمالي للبند
          const lineTotal = item.unitPrice * item.qty;
          discountPiasters = Math.round((lineTotal * promo.discount_value) / 100);
        } else if (promo.type === 'fixed_amount') {
          // مبلغ خصم ثابت لكل قطعة
          discountPiasters = Math.min(item.unitPrice, promo.discount_value) * item.qty;
        } else if (promo.type === 'bogo') {
          // اشترِ X واحصل على قطعة مجانية (مثلاً min_qty = 2 تعني اشتر 1 واحصل على 1)
          const freeItemsCount = Math.floor(item.qty / promo.min_qty);
          discountPiasters = freeItemsCount * item.unitPrice;
        }

        if (discountPiasters > 0) {
          discounts.push({
            promotionId: promo.id,
            promotionName: promo.name,
            discountAmount: discountPiasters,
            note: `عرض: ${promo.name}`,
          });
        }
      }
    }

    return discounts;
  }
}

export const promotionsService = new PromotionsService();
