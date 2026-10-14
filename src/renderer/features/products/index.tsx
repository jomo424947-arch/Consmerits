import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Search,
  Sparkles,
  Package,
  AlertTriangle,
  Layers,
  Barcode,
  Printer,
  Edit3,
  Trash2,
  History,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { GlassIcon } from '../../components/common/GlassIcon';
import { EmptyState } from '../../components/common/EmptyState';
import { ProductFormModal } from './components/ProductFormModal';
import { BarcodePrintModal } from './components/BarcodePrintModal';
import { StockCardModal } from './components/StockCardModal';
import { PromotionsModal } from './components/PromotionsModal';
import { useProducts } from './hooks/useProducts';
import { formatMoney } from '../../../shared/utils/money';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';
import { ProductItemRow } from './types';

export function ProductsScreen(): React.ReactElement {
  const { products, searchQuery, setSearchQuery, isLoading, refresh } = useProducts();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItemRow | null>(null);
  const [stockCardProduct, setStockCardProduct] = useState<ProductItemRow | null>(null);
  const [isPromotionsOpen, setIsPromotionsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [printingProduct, setPrintingProduct] = useState<{
    name: string;
    barcode: string;
    priceFormatted: string;
  } | null>(null);

  const totalStockCount = products.reduce((sum, p) => sum + p.totalStock, 0);
  const lowStockCount = products.filter((p) => p.totalStock <= 5).length;
  const categoriesList = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const handleDeleteProduct = async (p: ProductItemRow) => {
    sounds.playClick();
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المنتج "${p.name}"؟\n\n` +
      `• إذا لم تكن هناك مبيعات سابقة: سيتم حذفه نهائياً وتطهير القاعدة.\n` +
      `• إذا كانت هناك مبيعات أو حركات سابقة: سيتم أرشفته وإخفاؤه بأمان للحفاظ على دقة التقارير المالية.`
    );
    if (!confirmed) return;

    try {
      const electron = (window as any).electron;
      if (electron?.deleteProduct) {
        const res = await electron.deleteProduct(p.id);
        if (res?.success) {
          sounds.playSaleSuccess();
          toastSuccess(res.data.message);
          refresh();
        } else {
          sounds.playError();
          toastError(res?.error || 'تعذر حذف المنتج');
        }
      }
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'حدث خطأ أثناء محاولة الحذف');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* بطاقات الإحصائيات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="glass-card" style={{ padding: '14px 16px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المنتجات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {products.length}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 16px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المخزون بالقطع</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {totalStockCount}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 16px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>أصناف منخفضة الرصيد</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: lowStockCount > 0 ? '#962B34' : 'var(--color-brand-deep)',
              marginTop: 4,
            }}
          >
            {lowStockCount}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 16px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>الأقسام والتصنيفات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {categoriesList.length}
          </div>
        </div>
      </div>

      {/* شريط الأدوات والبحث والفلترة */}
      <div
        className="glass-card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flex: 1, maxWidth: 550 }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="بحث بالاسم أو الباركود أو الماركة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              height: 42,
              borderRadius: 8,
              border: '1.5px solid var(--border-light)',
              padding: '0 12px',
              fontSize: 13,
              backgroundColor: '#FAFCFA',
              cursor: 'pointer',
            }}
          >
            <option value="all">جميع الأقسام</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {/* زر إدارة العروض الترويجية */}
          <Button
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              setIsPromotionsOpen(true);
            }}
            style={{
              height: 42,
              padding: '0 16px',
              fontSize: 13,
              borderColor: '#E8D5C4',
              color: '#8D4004',
              backgroundColor: '#FFF9F5',
            }}
          >
            <Sparkles size={16} color="#E65100" />
            <span>العروض والخصومات</span>
          </Button>

          {/* زر إضافة منتج جديد */}
          <Button
            variant="primary"
            onClick={() => {
              sounds.playClick();
              setIsAddModalOpen(true);
            }}
            style={{ height: 42, padding: '0 18px', fontSize: 13 }}
          >
            <Plus size={16} />
            <span>إضافة منتج جديد</span>
          </Button>
        </div>
      </div>

      {/* جدول المنتجات */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Tag}
            variant="primary"
            title="لا توجد منتجات مسجلة"
            description="لم يتم العثور على أي منتج يطابق معايير البحث الحالية، أو أن قاعدة البيانات فارغة"
            actionLabel="+ إضافة منتج جديد"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '4%', padding: '12px 10px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '25%', padding: '12px 14px' }}>اسم المنتج / الصنف</th>
                  <th style={{ width: '12%', padding: '12px 12px' }}>القسم</th>
                  <th style={{ width: '12%', padding: '12px 12px' }}>الماركة</th>
                  <th style={{ width: '13%', padding: '12px 12px', textAlign: 'center' }}>سعر البيع</th>
                  <th style={{ width: '12%', padding: '12px 12px', textAlign: 'center' }}>الباركود</th>
                  <th style={{ width: '10%', padding: '12px 12px', textAlign: 'center' }}>المخزون</th>
                  <th style={{ width: '12%', padding: '12px 14px', textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const isLow = p.totalStock <= 5 && p.totalStock > 0;
                  const isOut = p.totalStock === 0;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td
                        style={{
                          padding: '12px 10px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: 13,
                        }}
                      >
                        {idx + 1}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-brand-deep)', fontSize: 14 }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>الوحدة: {p.unit}</div>
                      </td>

                      <td style={{ padding: '12px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span
                          style={{
                            backgroundColor: '#EAEFEA',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          {p.category}
                        </span>
                      </td>

                      <td style={{ padding: '12px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {p.brand}
                      </td>

                      {/* سعر البيع */}
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: 'var(--color-brand-deep)',
                            fontSize: 14,
                            backgroundColor: '#F3F7F3',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {formatMoney(p.price || 0)}
                        </span>
                      </td>

                      {/* الباركود */}
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: '#F0F3F1',
                            padding: '3px 7px',
                            borderRadius: 4,
                          }}
                        >
                          {p.primaryBarcode || '---'}
                        </span>
                      </td>

                      {/* المخزون */}
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        {isOut ? (
                          <span className="badge badge-danger">نفد المخزون</span>
                        ) : isLow ? (
                          <span className="badge badge-warn">
                            {p.totalStock} {p.unit}
                          </span>
                        ) : (
                          <span className="badge badge-success">
                            {p.totalStock} {p.unit}
                          </span>
                        )}
                      </td>

                      {/* إجراءات الصنف: كارت صنف، تعديل، طباعة باركود، حذف */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          {/* كارت الصنف */}
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setStockCardProduct(p);
                            }}
                            style={{
                              background: '#F0F4F8',
                              border: '1px solid #D9E2EC',
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#102A43',
                            }}
                            title="عرض كارت حركة الصنف وتاريخ الأسعار"
                          >
                            <History size={14} />
                          </button>

                          {/* تعديل المنتج */}
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setEditingProduct(p);
                            }}
                            style={{
                              background: '#E8F5E9',
                              border: '1px solid #C8E6C9',
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#1B5E20',
                            }}
                            title="تعديل بيانات المنتج وسعر البيع"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* طباعة ملصق */}
                          {p.primaryBarcode && p.primaryBarcode !== '---' && (
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                setPrintingProduct({
                                  name: p.name,
                                  barcode: p.primaryBarcode!,
                                  priceFormatted: formatMoney(p.price || 0),
                                });
                              }}
                              style={{
                                background: '#FFF8E1',
                                border: '1px solid #FFE082',
                                borderRadius: 6,
                                padding: '5px 8px',
                                cursor: 'pointer',
                                color: '#F57F17',
                              }}
                              title="طباعة ملصق باركود حراري"
                            >
                              <Printer size={14} />
                            </button>
                          )}

                          {/* حذف المنتج */}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            style={{
                              background: '#FFEBEE',
                              border: '1px solid #FFCDD2',
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#C62828',
                            }}
                            title="حذف / أرشفة المنتج بأمان"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إضافة منتج جديد */}
      <ProductFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refresh}
      />

      {/* نافذة تعديل منتج قائم */}
      {editingProduct && (
        <ProductFormModal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSuccess={refresh}
          productToEdit={editingProduct}
        />
      )}

      {/* نافذة كارت الصنف وتاريخ الحركات والأسعار */}
      {stockCardProduct && (
        <StockCardModal
          isOpen={Boolean(stockCardProduct)}
          onClose={() => setStockCardProduct(null)}
          product={stockCardProduct}
        />
      )}

      {/* نافذة العروض الترويجية والخصومات */}
      <PromotionsModal
        isOpen={isPromotionsOpen}
        onClose={() => setIsPromotionsOpen(false)}
      />

      {/* نافذة طباعة الباركود */}
      {printingProduct && (
        <BarcodePrintModal
          isOpen={Boolean(printingProduct)}
          onClose={() => setPrintingProduct(null)}
          productName={printingProduct.name}
          priceFormatted={printingProduct.priceFormatted}
          barcode={printingProduct.barcode}
        />
      )}
    </div>
  );
}

export default ProductsScreen;
