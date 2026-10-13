import React from 'react';
import { Plus, Minus, Trash2, ShoppingBag, Sparkles } from 'lucide-react';
import { CartLineItem } from '../types';
import { formatMoney } from '../../../../shared/utils/money';
import { GlassIcon } from '../../../components/common/GlassIcon';
import { EmptyState } from '../../../components/common/EmptyState';

interface CartTableProps {
  items: CartLineItem[];
  onRemove: (id: string) => void;
  onUpdateQty?: (id: string, qty: number) => void;
  lastScannedId?: string;
}

export function CartTable({
  items,
  onRemove,
  onUpdateQty,
  lastScannedId,
}: CartTableProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        variant="brand"
        title="سلة البيع فارغة حالياً"
        description="قم بتوجيه قارئ الباركود نحو المنتج، أو أدخل كود المنتج في حقل البحث أعلاه لإضافته إلى الفاتورة"
        style={{ margin: '40px auto', border: 'none', background: 'transparent' }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead>
          <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
            <th style={{ width: '5%', padding: '12px 14px', textAlign: 'center' }}>#</th>
            <th style={{ width: '18%', padding: '12px 14px' }}>الباركود</th>
            <th style={{ width: '32%', padding: '12px 14px' }}>المنتج / الصنف</th>
            <th style={{ width: '14%', padding: '12px 14px', textAlign: 'left' }}>سعر الوحدة</th>
            <th style={{ width: '16%', padding: '12px 14px', textAlign: 'center' }}>الكمية</th>
            <th style={{ width: '15%', padding: '12px 14px', textAlign: 'left' }}>الإجمالي</th>
            <th style={{ width: '8%', padding: '12px 14px', textAlign: 'center' }}>حذف</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isLatest = lastScannedId === item.id;
            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: '1px solid var(--border-light)',
                  backgroundColor: isLatest ? 'rgba(227, 234, 229, 0.4)' : '#FFFFFF',
                  transition: 'background 0.2s ease',
                }}
              >
                {/* تسلسل */}
                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {items.length - index}
                </td>

                {/* الباركود */}
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-brand-deep)',
                      backgroundColor: '#F0F3F1',
                      padding: '3px 7px',
                      borderRadius: 4,
                      border: '1px solid #D5DDD8',
                    }}
                  >
                    {item.barcode}
                  </span>
                </td>

                {/* اسم المنتج والصنف */}
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>
                      {item.productName}
                    </div>
                    {item.availableStock !== undefined && (
                      <span
                        style={{
                          fontSize: 11,
                          backgroundColor: '#EAEFEA',
                          color: '#21633D',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        المتاح: {item.availableStock}
                      </span>
                    )}
                  </div>
                  {item.variantName && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.variantName}
                    </div>
                  )}
                </td>

                {/* سعر الوحدة */}
                <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>
                  {formatMoney(item.unitPrice)}
                </td>

                {/* التحكم بالكمية (+ و -) */}
                <td style={{ padding: '12px 14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateQty?.(item.id, item.qty - 1)}
                      title="تقليل الكمية"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid #D5DAD6',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Minus size={14} />
                    </button>

                    <span
                      style={{
                        minWidth: 28,
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--color-brand-deep)',
                      }}
                    >
                      {item.qty}
                    </span>

                    <button
                      type="button"
                      onClick={() => onUpdateQty?.(item.id, item.qty + 1)}
                      disabled={item.availableStock !== undefined && item.qty >= item.availableStock}
                      title={
                        item.availableStock !== undefined && item.qty >= item.availableStock
                          ? 'وصلت للحد الأقصى للمخزون المتوفر'
                          : 'زيادة الكمية'
                      }
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid #D5DAD6',
                        background:
                          item.availableStock !== undefined && item.qty >= item.availableStock
                            ? '#F0F3F1'
                            : '#FFFFFF',
                        cursor:
                          item.availableStock !== undefined && item.qty >= item.availableStock
                            ? 'not-allowed'
                            : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color:
                          item.availableStock !== undefined && item.qty >= item.availableStock
                            ? '#A0A6A2'
                            : 'var(--text-secondary)',
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </td>

                {/* الإجمالي */}
                <td
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--color-brand-deep)',
                  }}
                >
                  {formatMoney(item.total)}
                </td>

                {/* زر الحذف */}
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    title="حذف هذا الصنف من الفاتورة"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-danger)',
                      cursor: 'pointer',
                      padding: 6,
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CartTable;
