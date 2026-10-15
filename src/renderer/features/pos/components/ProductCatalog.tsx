import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from '../../../components/common/AppIcon';
import { GlassIcon } from '../../../components/common/GlassIcon';
import { formatMoney } from '../../../../shared/utils/money';
import { sounds } from '../../../lib/sounds';
import { useToast } from '../../../components/common/ToastContext';

export interface ProductCatalogProps {
  onSelectProduct: (product: any, variant?: any) => void;
  className?: string;
  style?: React.CSSProperties;
  refreshTrigger?: number;
}

// تطبيع النصوص العربية لتحقيق بحث سلس ودقيق بغض النظر عن اختلاف الهمزات
function normalizeArabic(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '');
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

export function ProductCatalog({
  onSelectProduct,
  className = '',
  style = {},
  refreshTrigger,
}: ProductCatalogProps): React.ReactElement {
  const { warning: toastWarning } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [variantModalProduct, setVariantModalProduct] = useState<any | null>(null);

  // تحميل المنتجات الحقيقية المسجلة من قاعدة البيانات
  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      if (electron?.searchProducts) {
        const res = await electron.searchProducts('', { isActive: true, limit: 1000 });
        if (res?.success && Array.isArray(res.data)) {
          const activeOnly = res.data.filter((p: any) => p.is_active !== 0);
          setProducts(activeOnly);
          return;
        }
      }
      setProducts([]);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [refreshTrigger]);

  // استخراج قائمة التصنيفات الفريدة مع حساب عدد المنتجات في كل تصنيف
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { الكل: products.length };
    products.forEach((p) => {
      const cat = p.category_name || p.category || 'عام';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts);
  }, [products]);

  // تصفية المنتجات حسب التصنيف وعبارة البحث (مع دعم الباركود والـ SKU وتطبيع الحروف)
  const filteredProducts = useMemo(() => {
    const qNorm = normalizeArabic(searchQuery.trim());
    return products.filter((p) => {
      const name = p.name_ar || p.name || '';
      const brand = p.brand_name || p.brand || '';
      const cat = p.category_name || p.category || 'عام';

      const matchCat = selectedCategory === 'الكل' || cat === selectedCategory;
      if (!matchCat) return false;

      if (!qNorm) return true;

      const nameNorm = normalizeArabic(name);
      const brandNorm = normalizeArabic(brand);

      if (nameNorm.includes(qNorm) || brandNorm.includes(qNorm)) {
        return true;
      }

      // مطابقة الباركود أو الـ SKU المباشر
      const hasBarcodeOrSku = p.variants?.some((v: any) =>
        v.barcodes?.some((b: string) => b.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
        (v.sku && v.sku.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      );

      return Boolean(hasBarcodeOrSku);
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
        {products.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
              color: 'var(--text-muted)',
              padding: 40,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 112, 136, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <AppIcon name="inventory_2" size={30} color="var(--color-primary)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
              قاعدة البيانات نظيفة وجاهزة للبدء
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.6 }}>
              لا توجد منتجات مسجلة في المتجر حالياً. يمكنك البدء بإضافة منتجاتك وأسعارك من شاشة المنتجات والباركود.
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
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
                  onClick={() => {
                    if (isOutOfStock) {
                      sounds.playWarning();
                      toastWarning(`المنتج "${product.name_ar || product.name}" غير متوفر بالمخزون حالياً (الرصيد: 0)`);
                    } else {
                      handleProductClick(product);
                    }
                  }}
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
                    opacity: isOutOfStock ? 0.65 : 1,
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
