import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from '../../../components/common/AppIcon';
import { GlassIcon } from '../../../components/common/GlassIcon';
import { formatMoney } from '../../../../shared/utils/money';
import { sounds } from '../../../lib/sounds';

export interface ProductCatalogProps {
  onSelectProduct: (product: any, variant?: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

// قائمة أيقونات مقترحة للتصنيفات لتبدو الواجهة فائقة الجمال مثل أنظمة نقاط البيع الحديثة
const categoryIconMap: Record<string, string> = {
  الكل: 'grid_view',
  'العناية بالبشرة': 'spa',
  المكياج: 'palette',
  'مكياج وتجميل': 'brush',
  العطور: 'auto_awesome',
  'العناية بالشعر': 'water_drop',
  'العناية بالجسم': 'sanitizer',
  'أدوات وإكسسوارات': 'content_cut',
  عام: 'inventory_2',
};

// أصناف تجميلية افتراضية جاهزة للعرض فوراً في حال كانت قاعدة البيانات جديدة وخالية
const FALLBACK_STARTER_PRODUCTS = [
  {
    id: 101,
    name_ar: 'سيروم فيتامين سي للتفتيح والنضارة',
    category_name: 'العناية بالبشرة',
    brand_name: 'The Ordinary',
    variants: [
      { id: 1001, name: '30ml', sale_price: 25000, total_stock: 24, barcodes: ['6221112223331'] },
    ],
  },
  {
    id: 102,
    name_ar: 'أحمر شفاه مات مخملي طويل الثبات',
    category_name: 'المكياج',
    brand_name: 'Maybelline',
    variants: [
      { id: 1002, name: 'أحمر كلاسيكي #05', sale_price: 18000, total_stock: 30, barcodes: ['6221112223332'] },
      { id: 1003, name: 'نود وردي #12', sale_price: 18000, total_stock: 18, barcodes: ['6221112223333'] },
    ],
  },
  {
    id: 103,
    name_ar: 'فاونديشن تغطية كاملة ومات (SPF 20)',
    category_name: 'المكياج',
    brand_name: "L'Oreal Paris",
    variants: [
      { id: 1004, name: 'درجة عاجي 120', sale_price: 32000, total_stock: 15, barcodes: ['6221112223334'] },
      { id: 1005, name: 'درجة بيج طبيعي 200', sale_price: 32000, total_stock: 12, barcodes: ['6221112223335'] },
    ],
  },
  {
    id: 104,
    name_ar: 'مسكرة تكثيف ومضاعفة حجم الرموش',
    category_name: 'المكياج',
    brand_name: 'Essence',
    variants: [
      { id: 1006, name: 'أسود فحمي', sale_price: 14000, total_stock: 35, barcodes: ['6221112223336'] },
    ],
  },
  {
    id: 105,
    name_ar: 'واقي شمس جل غير دهني SPF 50+',
    category_name: 'العناية بالبشرة',
    brand_name: 'La Roche-Posay',
    variants: [
      { id: 1007, name: '50ml', sale_price: 42000, total_stock: 16, barcodes: ['6221112223337'] },
    ],
  },
  {
    id: 106,
    name_ar: 'كريم مرطب يومي بحمض الهيالورونيك',
    category_name: 'العناية بالبشرة',
    brand_name: 'CeraVe',
    variants: [
      { id: 1008, name: '177ml', sale_price: 29000, total_stock: 22, barcodes: ['6221112223338'] },
    ],
  },
  {
    id: 107,
    name_ar: 'عطر مسك أبيض فاخر مركز (EDP)',
    category_name: 'العطور',
    brand_name: 'Arabian Oud',
    variants: [
      { id: 1009, name: '50ml', sale_price: 55000, total_stock: 10, barcodes: ['6221112223339'] },
    ],
  },
  {
    id: 108,
    name_ar: 'زيت الأرغان المعالج للشعر التالف',
    category_name: 'العناية بالشعر',
    brand_name: 'OGX Beauty',
    variants: [
      { id: 1010, name: '100ml', sale_price: 23000, total_stock: 18, barcodes: ['6221112223340'] },
    ],
  },
  {
    id: 109,
    name_ar: 'شامبو مغذي للشعر بالكيراتين وزيت الخروع',
    category_name: 'العناية بالشعر',
    brand_name: 'Garnier',
    variants: [
      { id: 1011, name: '400ml', sale_price: 12500, total_stock: 28, barcodes: ['6221112223341'] },
    ],
  },
  {
    id: 110,
    name_ar: 'غسول رغوي منظف للبشرة المختلطة والدهنية',
    category_name: 'العناية بالبشرة',
    brand_name: 'Bioderma',
    variants: [
      { id: 1012, name: '200ml', sale_price: 31000, total_stock: 14, barcodes: ['6221112223342'] },
    ],
  },
  {
    id: 111,
    name_ar: 'مجموعة فرش مكياج احترافية متكاملة 12 قطعة',
    category_name: 'أدوات وإكسسوارات',
    brand_name: 'Real Techniques',
    variants: [
      { id: 1013, name: 'طقم كامل', sale_price: 38000, total_stock: 8, barcodes: ['6221112223343'] },
    ],
  },
  {
    id: 112,
    name_ar: 'لوشن ترطيب عميق للجسم بزبدة الشيا النقية',
    category_name: 'العناية بالجسم',
    brand_name: 'Vaseline',
    variants: [
      { id: 1014, name: '400ml', sale_price: 16500, total_stock: 20, barcodes: ['6221112223344'] },
    ],
  },
];

export function ProductCatalog({
  onSelectProduct,
  className = '',
  style = {},
}: ProductCatalogProps): React.ReactElement {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [variantModalProduct, setVariantModalProduct] = useState<any | null>(null);

  // تحميل المنتجات من قاعدة البيانات مع الفولباك التلقائي
  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      if (electron?.searchProducts) {
        const res = await electron.searchProducts('');
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setProducts(res.data);
          return;
        }
      }
      // في حال كانت قاعدة البيانات فارغة بعد التهيئة
      setProducts(FALLBACK_STARTER_PRODUCTS);
    } catch {
      setProducts(FALLBACK_STARTER_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // استخراج قائمة التصنيفات الفريدة مع حساب عدد المنتجات في كل تصنيف
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { الكل: products.length };
    products.forEach((p) => {
      const cat = p.category_name || p.category || 'عام';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts);
  }, [products]);

  // تصفية المنتجات حسب التصنيف وعبارة البحث
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const name = p.name_ar || p.name || '';
      const brand = p.brand_name || p.brand || '';
      const cat = p.category_name || p.category || 'عام';

      const matchCat = selectedCategory === 'الكل' || cat === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // إضافة المنتج للسلة بنقرة زر
  const handleProductClick = (product: any) => {
    const variants = product.variants || [];
    if (variants.length > 1) {
      // فتح نافذة اختيار الدرجة أو الحجم إذا كان للمنتج أكثر من خيار
      sounds.playClick();
      setVariantModalProduct(product);
    } else {
      // إضافة فورية مباشرة
      onSelectProduct(product, variants[0]);
    }
  };

  const handleSelectVariant = (variant: any) => {
    if (variantModalProduct) {
      onSelectProduct(variantModalProduct, variant);
      setVariantModalProduct(null);
    }
  };

  return (
    <div
      className={`glass-card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        gap: 12,
        overflow: 'hidden',
        boxSizing: 'border-box',
        border: '1px solid var(--border-light)',
        ...style,
      }}
    >
      {/* ترويسة الكتالوج: شريط البحث والأصناف والتحديث */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* حقل البحث السريع بالاسم */}
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#F8FAF9',
            border: '1px solid var(--border-input)',
            borderRadius: 10,
            padding: '0 12px',
            height: 38,
            transition: 'border-color 0.15s ease',
          }}
        >
          <AppIcon name="search" size={17} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="بحث سريع في قائمة المنتجات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              fontFamily: 'var(--font-family)',
              color: 'var(--text-main)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 2,
              }}
            >
              <AppIcon name="close" size={15} />
            </button>
          )}
        </div>

        {/* عداد المنتجات وزر التحديث */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontWeight: 500,
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            {filteredProducts.length} منتج
          </span>

          <button
            type="button"
            onClick={fetchCatalog}
            title="تحديث قائمة المنتجات"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border-input)',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F3F1')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <AppIcon name="sync" size={16} />
          </button>
        </div>
      </div>

      {/* شريط التصنيفات (Category Chips Bar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          userSelect: 'none',
        }}
      >
        {categoriesWithCounts.map(([cat, count]) => {
          const isSelected = selectedCategory === cat;
          const icon = categoryIconMap[cat] || 'inventory_2';
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                sounds.playClick();
                setSelectedCategory(cat);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-light)',
                backgroundColor: isSelected ? 'var(--color-primary-light)' : '#FFFFFF',
                color: isSelected ? 'var(--color-brand-deep)' : 'var(--text-secondary)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 1px 4px rgba(79, 107, 94, 0.15)' : 'none',
              }}
            >
              <AppIcon name={icon} size={15} color={isSelected ? 'var(--color-brand-deep)' : 'var(--color-primary)'} />
              <span>{cat}</span>
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.75,
                  padding: '1px 5px',
                  borderRadius: 10,
                  backgroundColor: isSelected ? '#FFFFFF' : '#EDF0EE',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* شبكة بطاقات المنتجات القابلة للتمرير */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2px 4px 6px',
        }}
      >
        {filteredProducts.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 10,
              color: 'var(--text-muted)',
              padding: 40,
              textAlign: 'center',
            }}
          >
            <AppIcon name="search_off" size={40} color="#B0B8B3" />
            <div style={{ fontSize: 14, fontWeight: 600 }}>لم يتم العثور على منتجات تطابق البحث</div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('الكل');
              }}
              style={{ height: 34, fontSize: 12, padding: '0 14px' }}
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
              gap: 12,
            }}
          >
            {filteredProducts.map((product) => {
              const primaryVariant = product.variants?.[0] || {};
              const price = primaryVariant.sale_price ?? product.price ?? 0;
              const totalStock =
                product.variants?.reduce((s: number, v: any) => s + (v.total_stock || 0), 0) ??
                product.totalStock ??
                999;
              const hasMultipleVariants = (product.variants?.length || 0) > 1;
              const catName = product.category_name || product.category || 'عام';
              const catIcon = categoryIconMap[catName] || 'spa';

              const isOutOfStock = totalStock <= 0;
              const isLowStock = totalStock > 0 && totalStock <= 5;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && handleProductClick(product)}
                  className="glass-card"
                  style={{
                    backgroundColor: isOutOfStock ? '#FAFBF9' : '#FFFFFF',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border-light)',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.6 : 1,
                    transition: 'all 0.16s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (!isOutOfStock) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'rgba(255, 149, 165, 0.45)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 149, 165, 0.16)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isOutOfStock) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }
                  }}
                >
                  {/* الشريط العلوي للبطاقة: أيقونة التصنيف وشارة المخزون */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        backgroundColor: 'rgba(255, 149, 165, 0.14)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppIcon name={catIcon} size={15} color="var(--color-primary)" />
                    </div>

                    {/* شارة المخزون */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 6,
                        fontFamily: 'Space Grotesk, sans-serif',
                        backgroundColor: isOutOfStock
                          ? '#FCE8E8'
                          : isLowStock
                          ? '#FEF3D6'
                          : '#FFF0F3',
                        color: isOutOfStock
                          ? '#962B34'
                          : isLowStock
                          ? '#A87910'
                          : '#D63B5E',
                      }}
                    >
                      {isOutOfStock ? 'نفد' : isLowStock ? `باقي ${totalStock}` : `متوفر ${totalStock}`}
                    </span>
                  </div>

                  {/* اسم المنتج والماركة */}
                  <div style={{ marginBottom: 10, flex: 1 }}>
                    <h4
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--color-brand-deep)',
                        margin: 0,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {product.name_ar || product.name}
                    </h4>

                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {product.brand_name || product.brand || catName}
                    </div>
                  </div>

                  {/* الشريط السفلي: السعر وزر الإضافة */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTop: '1px dashed #F5EAEB',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14.5,
                          fontWeight: 800,
                          color: 'var(--color-brand-deep)',
                          fontFamily: 'Space Grotesk, sans-serif',
                        }}
                      >
                        {formatMoney(price)}
                      </div>
                      {hasMultipleVariants && (
                        <div style={{ fontSize: 9.5, color: '#D63B5E', fontWeight: 600 }}>
                          {product.variants.length} درجات / خيارات
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isOutOfStock) handleProductClick(product);
                      }}
                      title="إضافة للسلة"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: 'var(--color-primary)',
                        border: 'none',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 8px rgba(255, 149, 165, 0.4)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isOutOfStock) e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isOutOfStock) e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                      }}
                    >
                      <AppIcon name="add" size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نافذة سريعة لاختيار الدرجة / الحجم في حال كان للمنتج أكثر من Variant */}
      {variantModalProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 30, 25, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setVariantModalProduct(null)}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand-deep)', margin: 0 }}>
                  اختر الدرجة أو الحجم المطلوب
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {variantModalProduct.name_ar || variantModalProduct.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVariantModalProduct(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 4,
                }}
              >
                <AppIcon name="close" size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {variantModalProduct.variants?.map((v: any) => {
                const isOutOfStock = (v.total_stock ?? 0) <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleSelectVariant(v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border-light)',
                      backgroundColor: '#FAFAF9',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.5 : 1,
                      textAlign: 'right',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock) e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isOutOfStock) e.currentTarget.style.backgroundColor = '#FAFAF9';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-brand-deep)' }}>
                        {v.name || v.variant_name || 'الافتراضي'}
                      </div>
                      <div style={{ fontSize: 11, color: isOutOfStock ? '#962B34' : 'var(--text-muted)' }}>
                        {isOutOfStock ? 'غير متوفر بالمخزون' : `المتوفر: ${v.total_stock ?? 0} قطعة`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: 'var(--color-brand-deep)',
                          fontFamily: 'Space Grotesk, sans-serif',
                        }}
                      >
                        {formatMoney(v.sale_price ?? 0)}
                      </span>
                      <AppIcon name="add_circle" size={20} color="var(--color-primary)" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCatalog;
