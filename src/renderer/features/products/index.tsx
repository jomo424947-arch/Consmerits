import React, { useState } from 'react';
import { Tag, Plus, Search, Sparkles, Package, AlertTriangle, Layers, Barcode, Printer } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { GlassIcon } from '../../components/common/GlassIcon';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ProductFormModal } from './components/ProductFormModal';
import { BarcodePrintModal } from './components/BarcodePrintModal';
import { useProducts } from './hooks/useProducts';
import { formatMoney } from '../../../shared/utils/money';
import { sounds } from '../../lib/sounds';

export function ProductsScreen(): React.ReactElement {
  const { products, searchQuery, setSearchQuery, isLoading, refresh } = useProducts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printingProduct, setPrintingProduct] = useState<{
    name: string;
    barcode: string;
    priceFormatted: string;
  } | null>(null);

  const totalStockCount = products.reduce((sum, p) => sum + p.totalStock, 0);
  const lowStockCount = products.filter((p) => p.totalStock <= 5).length;
  const categoriesCount = new Set(products.map((p) => p.category)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* بطاقات الإحصائيات العلوية */}
      {/* بطاقات الإحصائيات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المنتجات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {products.length}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المخزون بالقطع</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {totalStockCount}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>أصناف منخفضة الرصيد</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: lowStockCount > 0 ? '#962B34' : 'var(--color-brand-deep)', marginTop: 4 }}>
            {lowStockCount}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>الأقسام والتصنيفات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {categoriesCount}
          </div>
        </div>
      </div>

      {/* شريط الأدوات والبحث */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ width: 380 }}>
          <Input
            placeholder="بحث بالاسم أو الماركة أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="primary"
            onClick={() => {
              sounds.playClick();
              setIsModalOpen(true);
            }}
            style={{ height: 42, padding: '0 18px', fontSize: 14 }}
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
        {products.length === 0 ? (
          <EmptyState
            icon={Tag}
            variant="primary"
            title="لا توجد منتجات مسجلة"
            description="لم يتم العثور على أي منتج يطابق معايير البحث الحالية، أو أن قاعدة البيانات فارغة"
            actionLabel="+ إضافة منتج جديد"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '5%', padding: '12px 14px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '28%', padding: '12px 14px' }}>اسم المنتج / الصنف</th>
                  <th style={{ width: '14%', padding: '12px 14px' }}>القسم</th>
                  <th style={{ width: '14%', padding: '12px 14px' }}>الماركة</th>
                  <th style={{ width: '12%', padding: '12px 14px', textAlign: 'center' }}>الباركود</th>
                  <th style={{ width: '14%', padding: '12px 14px', textAlign: 'center' }}>المخزون المتوفر</th>
                  <th style={{ width: '13%', padding: '12px 14px', textAlign: 'center' }}>طباعة ملصق</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => {
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
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-brand-deep)', fontSize: 14 }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          الوحدة: {p.unit}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
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

                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {p.brand}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
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

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isOut ? (
                          <span className="badge badge-danger">نفد المخزون</span>
                        ) : isLow ? (
                          <span className="badge badge-warn">{p.totalStock} {p.unit} (منخفض)</span>
                        ) : (
                          <span className="badge badge-success">{p.totalStock} {p.unit}</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {p.primaryBarcode && p.primaryBarcode !== '---' && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              sounds.playClick();
                              setPrintingProduct({
                                name: p.name,
                                barcode: p.primaryBarcode!,
                                priceFormatted: formatMoney(p.price || 0),
                              });
                            }}
                            style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                            title="طباعة ملصق باركود حراري"
                          >
                            <Printer size={13} />
                            <span>طباعة</span>
                          </Button>
                        )}
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refresh}
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
