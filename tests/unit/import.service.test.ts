import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { ImportService } from '../../src/main/services/import.service';
import { ProductsService } from '../../src/main/services/products.service';

describe('ImportService (CSV/Excel Import Engine)', () => {
  let db: Database.Database;
  let importService: ImportService;
  let productsService: ProductsService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    productsService = new ProductsService(db);
    importService = new ImportService(db, productsService);
  });

  afterEach(() => {
    db.close();
  });

  test('تحليل ملف CSV بالأعمدة العربية وفصل الحقول بنجاح', () => {
    const csvContent = `اسم المنتج,القسم,الماركة,درجة اللون,سعر البيع,الباركود,الرصيد الافتتاحي
بودرة تثبيت شفافة,مكياج الوجه,Maybelline,01 Light,220,6221111222233,15
كحل عين سائل,العيون,Essence,Black,85,6221111222244,30`;

    const parsed = importService.parseCsv(csvContent);
    expect(parsed.length).toBe(2);
    expect(parsed[0].name_ar).toBe('بودرة تثبيت شفافة');
    expect(parsed[0].category_name).toBe('مكياج الوجه');
    expect(parsed[0].brand_name).toBe('Maybelline');
    expect(parsed[0].selling_price).toBe(22000); // 220 ج.م -> 22000 قرش
    expect(parsed[0].initial_stock).toBe(15);
  });

  test('التحقق من صحة البيانات ورفض الأسطر التي ينقصها الاسم أو السعر أو ذات الباركود المكرر', () => {
    const rawRows = [
      {
        name_ar: 'منتج صالح',
        selling_price: 5000,
        barcode: '1111111111111',
      },
      {
        name_ar: '', // فارغ - خطأ
        selling_price: 5000,
        barcode: '2222222222222',
      },
      {
        name_ar: 'منتج بباركود مكرر',
        selling_price: 6000,
        barcode: '1111111111111', // مكرر - خطأ
      },
    ];

    const validation = importService.validateRows(rawRows);
    expect(validation.totalRows).toBe(3);
    expect(validation.validRows.length).toBe(1);
    expect(validation.invalidRows.length).toBe(2);
    expect(validation.invalidRows[0].errors[0]).toContain('اسم المنتج بالعربية مطلوب');
    expect(validation.invalidRows[1].errors[0]).toContain('مكرر');
  });

  test('تنفيذ الاستيراد وإنشاء المنتجات والأقسام والماركات والمخزون الافتتاحي', async () => {
    const validRows = [
      {
        name_ar: 'غسول للبشرة الدهنية',
        category_name: 'العناية بالبشرة',
        brand_name: 'CeraVe',
        variant_name: '236ml',
        selling_price: 35000,
        cost_price: 25000,
        barcode: '3333333333333',
        initial_stock: 12,
      },
      {
        name_ar: 'غسول للبشرة الدهنية', // نفس المنتج بـ Variant مختلف
        category_name: 'العناية بالبشرة',
        brand_name: 'CeraVe',
        variant_name: '473ml',
        selling_price: 55000,
        cost_price: 40000,
        barcode: '4444444444444',
        initial_stock: 8,
      },
    ];

    const result = await importService.executeImport(validRows);
    expect(result.success).toBe(true);
    expect(result.importedProductsCount).toBe(1); // منتج واحد
    expect(result.importedVariantsCount).toBe(2); // درجتان

    // فحص قاعدة البيانات للتأكد من ربط الأقسام والماركات والرصيد
    const products = await productsService.searchProducts('غسول');
    expect(products.length).toBe(1);
    expect(products[0].category_name).toBe('العناية بالبشرة');
    expect(products[0].brand_name).toBe('CeraVe');
    expect(products[0].variants.length).toBe(2);
    expect(products[0].variants[0].total_stock).toBe(12);
    expect(products[0].variants[1].total_stock).toBe(8);
  });
});
