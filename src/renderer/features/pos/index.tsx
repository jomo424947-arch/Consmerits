import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  PauseCircle,
  PlayCircle,
  Trash2,
  Percent,
  User,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { GlassIcon } from '../../components/common/GlassIcon';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/ToastContext';
import { BarcodeInput } from './components/BarcodeInput';
import { CartTable } from './components/CartTable';
import { PaymentModal } from './components/PaymentModal';
import { HeldSalesModal } from './components/HeldSalesModal';
import { HotkeysBar } from './components/HotkeysBar';
import { usePos } from './hooks/usePos';
import { formatMoney } from '../../../shared/utils/money';
import { sounds } from '../../lib/sounds';
import { MESSAGES } from '../../lib/messages';

export function PosScreen(): React.ReactElement {
  const {
    cart,
    subtotal,
    discountAmount,
    total,
    totalItemCount,
    customerId,
    customerName,
    isLoading,
    lastScannedItem,
    setDiscountAmount,
    setCustomerName,
    addItemByBarcode,
    updateQuantity,
    removeItem,
    clearCart,
    restoreCart,
  } = usePos();

  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [customDiscountStr, setCustomDiscountStr] = useState('0');

  // الاستماع لاختصارات لوحة المفاتيح المخصصة لشاشة البيع
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // تجنب تشويش الاختصارات عند فتح المودالات
      if (isPaymentOpen || isHeldModalOpen || showClearConfirm) return;

      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length === 0) {
          toastWarning(MESSAGES.CART_EMPTY);
          return;
        }
        sounds.playClick();
        setIsPaymentOpen(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleHoldSale();
      } else if (e.key === 'F7') {
        e.preventDefault();
        sounds.playClick();
        setIsHeldModalOpen(true);
      } else if (e.key === 'Escape' && cart.length > 0) {
        e.preventDefault();
        sounds.playWarning();
        setShowClearConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentOpen, isHeldModalOpen, showClearConfirm]);

  const handleScan = async (barcode: string) => {
    const res = await addItemByBarcode(barcode);
    if (!res.success && res.message) {
      toastError(res.message);
    }
  };

  const handleHoldSale = async () => {
    if (cart.length === 0) {
      toastWarning(MESSAGES.CART_EMPTY);
      return;
    }

    try {
      const electron = (window as any).electron;
      if (electron?.invoke) {
        await electron.invoke('sales:hold', JSON.stringify(cart), null, null, customerName || 'عميل نقدي');
      }
      sounds.playClick();
      toastSuccess(MESSAGES.SALE_HELD_SUCCESS);
      clearCart();
    } catch (err: any) {
      toastError(err.message || 'تعذر تعليق الفاتورة');
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(customDiscountStr) || 0;
    const piasters = Math.round(val * 100);
    if (piasters > subtotal) {
      toastError(MESSAGES.DISCOUNT_EXCEEDED);
      return;
    }
    sounds.playClick();
    setDiscountAmount(piasters);
    setShowDiscountInput(false);
    toastSuccess('تم تطبيق الخصم على الفاتورة');
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: 20,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* القسم الرئيسي الأيمن: الباركود وشريط الاختصارات وجدول المنتجات */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, height: '100%' }}>
        {/* شريط الإدخال السريع */}
        <BarcodeInput onScan={handleScan} isLoading={isLoading} />

        {/* شريط الاختصارات المفتاحية السريعة */}
        <HotkeysBar />

        {/* جدول سلة المبيعات الزجاجي */}
        <div
          className="glass-card"
          style={{
            flex: 1,
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FFFFFF',
          }}
        >
          <CartTable
            items={cart}
            onRemove={removeItem}
            onUpdateQty={updateQuantity}
            lastScannedId={lastScannedItem?.id}
          />
        </div>
      </div>

      {/* القسم الجانبي الأيسر: ملخص الفاتورة وإتمام الدفع والإجراءات */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
        {/* بطاقة العميل الحالي */}
        <div
          className="glass-card"
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GlassIcon icon={User} size="xs" variant="primary" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                {customerName || 'عميل نقدي سريع'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>نقاط الولاء: 0 نقطة</div>
            </div>
          </div>
        </div>

        {/* بطاقة إجمالي الفاتورة الفاخرة */}
        <div
          className="glass-card"
          style={{
            padding: '24px 20px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAF8 100%)',
            border: '1.5px solid rgba(79, 107, 94, 0.25)',
            boxShadow: '0 8px 24px rgba(47, 74, 62, 0.08)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            إجمالي الفاتورة النهائي
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: 'var(--color-brand-deep)',
              margin: '10px 0 6px',
              letterSpacing: '-0.5px',
            }}
          >
            {formatMoney(total)}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 8,
            }}
          >
            <span>عدد الأصناف: <strong>{cart.length}</strong></span>
            <span>•</span>
            <span>إجمالي القطع: <strong>{totalItemCount}</strong></span>
          </div>

          {/* تفاصيل الخصم إن وجد */}
          {discountAmount > 0 && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: 'var(--color-danger)',
                fontWeight: 600,
                backgroundColor: 'var(--color-danger-bg)',
                padding: '4px 10px',
                borderRadius: 6,
                display: 'inline-block',
              }}
            >
              خصم إضافي: {formatMoney(discountAmount)}-
            </div>
          )}
        </div>

        {/* أزرار الإجراءات الرئيسية */}
        <div
          className="glass-card"
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* زر الدفع الرئيسي الكبير */}
          <Button
            variant="success"
            style={{
              height: 52,
              fontSize: 17,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(33, 99, 61, 0.3)',
            }}
            kbdShortcut="F4"
            disabled={cart.length === 0}
            onClick={() => {
              sounds.playClick();
              setIsPaymentOpen(true);
            }}
          >
            <CreditCard size={20} />
            <span>إتمام الدفع والسداد</span>
          </Button>

          {/* إضافة خصم */}
          {!showDiscountInput ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                sounds.playClick();
                setShowDiscountInput(true);
              }}
              style={{ height: 42, fontSize: 13 }}
            >
              <Percent size={15} />
              <span>إضافة خصم على الفاتورة</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                placeholder="قيمة الخصم ج.م"
                value={customDiscountStr}
                onChange={(e) => setCustomDiscountStr(e.target.value)}
                className="in"
                style={{ height: 38, fontSize: 13 }}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplyDiscount}
                style={{ height: 38, padding: '0 12px', fontSize: 13 }}
              >
                تطبيق
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDiscountInput(false)}
                style={{ height: 38, padding: '0 10px', fontSize: 13 }}
              >
                إلغاء
              </button>
            </div>
          )}

          {/* تعليق الفاتورة */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleHoldSale}
            disabled={cart.length === 0}
            style={{ height: 42, fontSize: 13 }}
          >
            <PauseCircle size={16} />
            <span>تعليق الفاتورة الحالية</span>
            <span className="kbd-badge kbd-badge-dark">F6</span>
          </button>

          {/* استرجاع معلق */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              sounds.playClick();
              setIsHeldModalOpen(true);
            }}
            style={{ height: 42, fontSize: 13 }}
          >
            <PlayCircle size={16} />
            <span>الفواتير المعلقة</span>
            <span className="kbd-badge kbd-badge-dark">F7</span>
          </button>

          {/* إلغاء الفاتورة بالكامل */}
          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={() => {
              sounds.playWarning();
              setShowClearConfirm(true);
            }}
            disabled={cart.length === 0}
            style={{ height: 42, fontSize: 13, marginTop: 4 }}
          >
            <Trash2 size={16} />
            <span>إلغاء ومسح الفاتورة</span>
            <span className="kbd-badge" style={{ borderColor: '#F5C6CB', color: 'var(--color-danger)' }}>Esc</span>
          </button>
        </div>
      </div>

      {/* نافذة الدفع */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={total}
        subtotal={subtotal}
        discount={discountAmount}
        cart={cart}
        customerId={customerId}
        onSaleComplete={clearCart}
      />

      {/* نافذة الفواتير المعلقة */}
      <HeldSalesModal
        isOpen={isHeldModalOpen}
        onClose={() => setIsHeldModalOpen(false)}
        onResume={(items, custName) => restoreCart(items, null, custName)}
      />

      {/* تأكيد مسح الفاتورة */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="تأكيد إلغاء الفاتورة"
        message="هل أنت متأكد من رغبتك في إلغاء وتفريغ سلة المبيعات بالكامل؟ سيتم مسح جميع الأصناف الممسوحة حالياً."
        confirmLabel="إلغاء الفاتورة"
        cancelLabel="تراجع"
        isDangerous
        onConfirm={() => {
          clearCart();
          setShowClearConfirm(false);
          toastSuccess(MESSAGES.SALE_VOIDED);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}

export * from './types';
export * from './hooks/usePos';
export default PosScreen;
