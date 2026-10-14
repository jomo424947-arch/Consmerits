import React, { useState, useEffect } from 'react';
import {
  Banknote,
  CreditCard,
  Layers,
  Printer,
  CheckCircle2,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { GlassIcon } from '../../../components/common/GlassIcon';
import { AppIcon } from '../../../components/common/AppIcon';
import { formatMoney } from '../../../../shared/utils/money';
import { CartLineItem } from '../types';
import { sounds } from '../../../lib/sounds';
import { useToast } from '../../../components/common/ToastContext';
import { MESSAGES } from '../../../lib/messages';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number; // بالقروش
  subtotal: number;
  discount: number;
  cart: CartLineItem[];
  customerId?: number | null;
  onSaleComplete: () => void;
}

type PaymentMethodType = 'cash' | 'card' | 'split';

export function PaymentModal({
  isOpen,
  onClose,
  total,
  subtotal,
  discount,
  cart,
  customerId,
  onSaleComplete,
}: PaymentModalProps): React.ReactElement | null {
  const { success: toastSuccess, error: toastError } = useToast();
  const [method, setMethod] = useState<PaymentMethodType>('cash');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [cardAmountStr, setCardAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [printReceipt, setPrintReceipt] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // تحويل المبلغ الكلي إلى جنيه/ريال للعرض والإدخال
  const totalInUnits = total / 100;

  useEffect(() => {
    if (isOpen) {
      // التهيئة الافتراضية عند فتح النافذة
      setMethod('cash');
      setCashAmountStr(totalInUnits.toFixed(2));
      setCardAmountStr('0');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, totalInUnits]);

  if (!isOpen) return null;

  // الحسابات النقدية
  const parsedCash = parseFloat(cashAmountStr) || 0;
  const parsedCard = parseFloat(cardAmountStr) || 0;

  const totalPaid = method === 'cash' ? parsedCash : method === 'card' ? totalInUnits : parsedCash + parsedCard;
  const changeDue = Math.max(0, totalPaid - totalInUnits);
  const remainingDue = Math.max(0, totalInUnits - totalPaid);

  const isPaymentValid = totalPaid >= totalInUnits - 0.001;

  // أزرار الفئات النقدية السريعة
  const quickCashOptions = [
    { label: 'المبلغ بالضبط', val: totalInUnits },
    { label: '+10', val: Math.ceil(totalInUnits / 10) * 10 },
    { label: '+50', val: Math.ceil(totalInUnits / 50) * 50 || 50 },
    { label: '+100', val: Math.ceil(totalInUnits / 100) * 100 || 100 },
    { label: '+200', val: Math.ceil(totalInUnits / 200) * 200 || 200 },
  ];

  const handleQuickCash = (val: number) => {
    sounds.playClick();
    setCashAmountStr(val.toFixed(2));
    setError(null);
  };

  const handleSubmitPayment = async () => {
    if (isSubmitting) return;

    if (!isPaymentValid) {
      sounds.playError();
      setError('المبلغ المدفوع غير كافٍ لتغطية إجمالي الفاتورة');
      return;
    }

    if (cart.length === 0) {
      sounds.playError();
      setError(MESSAGES.CART_EMPTY);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const electron = (window as any).electron;

      // تجميع طرق الدفع بالقروش
      const payments = [];
      if (method === 'cash') {
        payments.push({
          method: 'cash' as const,
          amount: Math.round(totalInUnits * 100),
        });
      } else if (method === 'card') {
        payments.push({
          method: 'card' as const,
          amount: Math.round(totalInUnits * 100),
        });
      } else {
        if (parsedCash > 0) {
          payments.push({
            method: 'cash' as const,
            amount: Math.round(parsedCash * 100),
          });
        }
        if (parsedCard > 0) {
          payments.push({
            method: 'card' as const,
            amount: Math.round(parsedCard * 100),
          });
        }
      }

      const salePayload = {
        customer_id: customerId || null,
        items: cart.map((item) => ({
          variant_id: item.variantId,
          qty: item.qty,
          unit_price: item.unitPrice,
          discount_amount: item.discount || 0,
        })),
        payments,
        discount_amount: discount || 0,
        notes: notes.trim() || null,
      };

      if (!electron?.createSale) {
        sounds.playError();
        setError('تعذر الاتصال بالخدمة الرئيسية لتسجيل الفاتورة');
        return;
      }

      const res = await electron.createSale(salePayload);
      if (res?.success) {
        sounds.playSaleSuccess();
        sounds.playCashRegister();
        toastSuccess(MESSAGES.SALE_SUCCESS);
        onSaleComplete();
        onClose();
      } else {
        const errorMsg = res?.error?.message || res?.error || MESSAGES.UNEXPECTED_ERROR;
        sounds.playError();
        setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
    } catch (err: any) {
      sounds.playError();
      setError(err.message || MESSAGES.UNEXPECTED_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إتمام عملية الدفع وإصدار الفاتورة"
      icon={<GlassIcon icon={Coins} size="sm" variant="brand" />}
      width={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, direction: 'rtl' }}>
        {/* ملخص المبلغ الكلي */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(47, 74, 62, 0.08) 0%, rgba(79, 107, 94, 0.04) 100%)',
            border: '1px solid rgba(79, 107, 94, 0.2)',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>المبلغ الإجمالي المستحق</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {formatMoney(total)}
            </div>
          </div>

          <div style={{ textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>
            <div>عدد الأصناف: {cart.length}</div>
            {discount > 0 && (
              <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                الخصم: {formatMoney(discount)}-
              </div>
            )}
          </div>
        </div>

        {/* اختيار وسيلة الدفع */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMethod('cash');
              setCashAmountStr(totalInUnits.toFixed(2));
              setError(null);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '14px 10px',
              borderRadius: 12,
              border: method === 'cash' ? '2px solid var(--color-primary)' : '1px solid #D5DAD6',
              backgroundColor: method === 'cash' ? 'var(--color-primary-light)' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <GlassIcon icon={Banknote} size="sm" variant="brand" active={method === 'cash'} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-deep)' }}>
              نقدي (كاش)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMethod('card');
              setCardAmountStr(totalInUnits.toFixed(2));
              setError(null);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '14px 10px',
              borderRadius: 12,
              border: method === 'card' ? '2px solid var(--color-primary)' : '1px solid #D5DAD6',
              backgroundColor: method === 'card' ? 'var(--color-primary-light)' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <GlassIcon icon={CreditCard} size="sm" variant="info" active={method === 'card'} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-deep)' }}>
              بطاقة / شبكة
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMethod('split');
              setError(null);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '14px 10px',
              borderRadius: 12,
              border: method === 'split' ? '2px solid var(--color-primary)' : '1px solid #D5DAD6',
              backgroundColor: method === 'split' ? 'var(--color-primary-light)' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <GlassIcon icon={Layers} size="sm" variant="gold" active={method === 'split'} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-deep)' }}>
              دفع مختلط (مجزأ)
            </span>
          </button>
        </div>

        {/* حقول الدفع النقدي والفئات السريعة */}
        {method === 'cash' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                المبلغ المستلم من العميل:
              </label>
              <input
                type="number"
                step="any"
                value={cashAmountStr}
                onChange={(e) => {
                  setCashAmountStr(e.target.value);
                  setError(null);
                }}
                className="in"
                style={{ fontSize: 18, fontWeight: 700, height: 48 }}
                autoFocus
              />
            </div>

            {/* أزرار الفئات السريعة */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {quickCashOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickCash(opt.val)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #D0D8D3',
                    backgroundColor: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--color-brand-deep)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F4F1')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  {opt.label} ({opt.val.toFixed(2)})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* الدفع المختلط */}
        {method === 'split' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                المبلغ النقدي:
              </label>
              <input
                type="number"
                step="any"
                value={cashAmountStr}
                onChange={(e) => setCashAmountStr(e.target.value)}
                className="in"
                style={{ fontSize: 16, fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                المبلغ بالبطاقة:
              </label>
              <input
                type="number"
                step="any"
                value={cardAmountStr}
                onChange={(e) => setCardAmountStr(e.target.value)}
                className="in"
                style={{ fontSize: 16, fontWeight: 600 }}
              />
            </div>
          </div>
        )}

        {/* عرض المتبقي للعميل أو العجز */}
        <div
          style={{
            backgroundColor: remainingDue > 0 ? '#FDF3F3' : '#EDF8F1',
            border: remainingDue > 0 ? '1px solid #F5C6CB' : '1px solid #B8E2C8',
            borderRadius: 12,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: remainingDue > 0 ? '#962B34' : '#21633D' }}>
            {remainingDue > 0 ? 'المتبقي لتحصيل الفاتورة:' : 'المتبقي للعميل (الفكة):'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: remainingDue > 0 ? '#962B34' : '#21633D' }}>
            {remainingDue > 0 ? `${remainingDue.toFixed(2)} ج.م` : `${changeDue.toFixed(2)} ج.م`}
          </div>
        </div>

        {/* خيار طباعة الإيصال والملاحظات */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
            />
            <AppIcon name="print" size={17} color="var(--color-primary)" />
            <span>طباعة الإيصال الحراري تلقائياً</span>
          </label>
        </div>

        {error && (
          <div
            className="animate-slide-up"
            style={{
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AppIcon name="error" size={17} />
            <span>{error}</span>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <Button
            variant="success"
            onClick={handleSubmitPayment}
            disabled={isSubmitting || !isPaymentValid}
            isLoading={isSubmitting}
            preventDoubleClick
            style={{
              flex: 1,
              height: 48,
              fontSize: 15.5,
              fontWeight: 700,
              gap: 8,
            }}
          >
            <AppIcon name="check_circle" size={19} />
            <span>تأكيد وطباعة الفاتورة</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            disabled={isSubmitting}
            style={{ width: 110, height: 48 }}
          >
            إلغاء
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default PaymentModal;
