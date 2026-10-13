import React, { useState, useEffect } from 'react';
import { PauseCircle, PlayCircle, Clock, Trash2, ShoppingBag } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { GlassIcon } from '../../../components/common/GlassIcon';
import { EmptyState } from '../../../components/common/EmptyState';
import { formatMoney } from '../../../../shared/utils/money';
import { sounds } from '../../../lib/sounds';
import { useToast } from '../../../components/common/ToastContext';
import { MESSAGES } from '../../../lib/messages';

interface HeldSale {
  id: number;
  customer_name?: string;
  total_amount: number;
  item_count: number;
  created_at: string;
  cart_data: string;
}

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (cartItems: any[], customerName?: string) => void;
}

export function HeldSalesModal({
  isOpen,
  onClose,
  onResume,
}: HeldSalesModalProps): React.ReactElement | null {
  const { success: toastSuccess, error: toastError } = useToast();
  const [heldList, setHeldList] = useState<HeldSale[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHeld = async () => {
      setIsLoading(true);
      try {
        const electron = (window as any).electron;
        if (electron?.getHeldSales) {
          const res = await electron.getHeldSales();
          if (res?.success && Array.isArray(res.data)) {
            setHeldList(res.data);
          }
        }
      } catch (err: any) {
        toastError(err.message || 'تعذر تحميل الفواتير المعلقة');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeld();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResume = async (sale: HeldSale) => {
    sounds.playClick();
    try {
      const electron = (window as any).electron;
      let parsedItems = [];
      try {
        parsedItems = typeof sale.cart_data === 'string' ? JSON.parse(sale.cart_data) : sale.cart_data;
      } catch {
        parsedItems = [];
      }

      if (electron?.invoke) {
        await electron.invoke('sales:resume-held', sale.id);
      }

      toastSuccess(MESSAGES.SALE_RESUMED);
      onResume(parsedItems, sale.customer_name);
      onClose();
    } catch (err: any) {
      toastError(err.message || 'تعذر استئناف الفاتورة');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="قائمة الفواتير المعلقة"
      icon={<GlassIcon icon={PauseCircle} size="sm" variant="gold" />}
      width={600}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
        {heldList.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            variant="gold"
            title="لا توجد فواتير معلقة حالياً"
            description="يمكنك تعليق أي فاتورة جارية بالضغط على F6 واستئنافها في أي وقت"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
            {heldList.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FAFBF9',
                  transition: 'background 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-brand-deep)' }}>
                    {item.customer_name || 'عميل نقدي سريع'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} />
                      <span>{new Date(item.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span>•</span>
                    <span>{item.item_count || 1} منتجات</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
                    {formatMoney(item.total_amount)}
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleResume(item)}
                    style={{ height: 38, padding: '0 14px', fontSize: 13 }}
                  >
                    <PlayCircle size={15} />
                    <span>استئناف الفاتورة</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <Button
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
          >
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default HeldSalesModal;
