import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { GlassIcon } from '../../components/common/GlassIcon';
import { AppIcon } from '../../components/common/AppIcon';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/ToastContext';
import { BarcodeInput } from './components/BarcodeInput';
import { CartTable } from './components/CartTable';
import { ProductCatalog } from './components/ProductCatalog';
import { PaymentModal } from './components/PaymentModal';
import { HeldSalesModal } from './components/HeldSalesModal';
import { InvoiceReceiptModal } from './components/InvoiceReceiptModal';
import { usePos } from './hooks/usePos';
import { formatMoney } from '../../../shared/utils/money';
import { Sale } from '../../../shared/types/sales.types';
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
    addProductToCart,
    updateQuantity,
    removeItem,
    clearCart,
    restoreCart,
  } = usePos();

  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
  const [autoPrintAfterSale, setAutoPrintAfterSale] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [customDiscountStr, setCustomDiscountStr] = useState('0');
  const [catalogRefreshTrigger, setCatalogRefreshTrigger] = useState(0);

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

  const handleSelectCatalogProduct = (product: any, variant?: any) => {
    const res = addProductToCart(product, variant);
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
        gridTemplateColumns: 'minmax(0, 1fr) 420px',
        gap: 16,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* القسم الرئيسي الأيمن: الباركود وشريط الاختصارات وكتالوج المنتجات المتسع بالكامل */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* شريط الإدخال السريع للباركود */}
        <BarcodeInput onScan={handleScan} isLoading={isLoading} />

        {/* كتالوج المنتجات المتسع والكامل بكامل المساحة */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ProductCatalog
            onSelectProduct={handleSelectCatalogProduct}
            refreshTrigger={catalogRefreshTrigger}
            style={{ height: '100%', minWidth: 0 }}
          />
        </div>
      </div>

      {/* القسم الجانبي الأيسر: العميل، سلة المبيعات الحالية، ملخص الإجمالي، وأزرار الدفع والإجراءات */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          height: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* بطاقة العميل الحالي */}
        <div
          className="glass-card"
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GlassIcon icon="person" size="xs" variant="primary" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                {customerName || 'عميل نقدي سريع'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>نقاط الولاء: 0 نقطة</div>
            </div>
          </div>
        </div>

        {/* كارد سلة المبيعات الحالية (تم نقلها هنا لتوسيع كتالوج المنتجات) */}
        <div
          className="glass-card"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--border-light)',
            padding: 0,
          }}
        >
          {/* شريط ترويسة السلة */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#F8FAF9',
              borderBottom: '1.5px solid var(--border-light)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AppIcon name="shopping_cart" size={17} color="var(--color-primary)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-brand-deep)' }}>
                سلة المبيعات الحالية
              </span>
              <span
                className="kbd-badge"
                style={{
                  backgroundColor: '#FFF0F3',
                  color: '#D63B5E',
                  padding: '1px 7px',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  borderColor: 'rgba(255, 149, 165, 0.35)',
                }}
              >
                {cart.length} صنف
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  sounds.playWarning();
                  setShowClearConfirm(true);
                }}
                title="مسح وتفريغ السلة"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-danger)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  borderRadius: 6,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <AppIcon name="delete_sweep" size={14} />
                <span>تفريغ السلة</span>
              </button>
            )}
          </div>

          {/* محتوى جدول السلة القابل للتمرير بوضع compact */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <CartTable
              items={cart}
              onRemove={removeItem}
              onUpdateQty={updateQuantity}
              lastScannedId={lastScannedItem?.id}
              compact={true}
              emptyTitle="سلة البيع فارغة"
              emptyDescription="انقر على أي منتج من الكتالوج لإضافته، أو وجّه قارئ الباركود"
            />
          </div>
        </div>

        {/* بطاقة ملخص الإجمالي وأزرار السداد والإجراءات */}
        <div
          className="glass-card"
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '1.5px solid rgba(255, 149, 165, 0.28)',
            boxShadow: '0 6px 22px rgba(255, 149, 165, 0.09)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* ملخص الإجمالي */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 8,
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                إجمالي الفاتورة النهائي
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                  marginTop: 3,
                }}
              >
                <span>عدد الأصناف: <strong>{cart.length}</strong></span>
                <span>•</span>
                <span>إجمالي القطع: <strong>{totalItemCount}</strong></span>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div
                className="num-stat font-display"
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--color-brand-deep)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                }}
              >
                {formatMoney(total)}
              </div>
              {discountAmount > 0 && (
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    color: 'var(--color-danger)',
                    fontWeight: 600,
                    backgroundColor: 'var(--color-danger-bg)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    display: 'inline-block',
                  }}
                >
                  خصم: {formatMoney(discountAmount)}-
                </div>
              )}
            </div>
          </div>

          {/* حقل إدخال الخصم إن كان مفعلاً */}
          {showDiscountInput && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                placeholder="قيمة الخصم ج.م"
                value={customDiscountStr}
                onChange={(e) => setCustomDiscountStr(e.target.value)}
                className="in"
                style={{ height: 36, fontSize: 13 }}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplyDiscount}
                style={{ height: 36, padding: '0 12px', fontSize: 12.5 }}
              >
                تطبيق
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDiscountInput(false)}
                style={{ height: 36, padding: '0 10px', fontSize: 12.5 }}
              >
                إلغاء
              </button>
            </div>
          )}

          {/* زر إتمام الدفع والسداد الرئيسي (بتدرج الروز الفاخر المطابق لصفحة الدخول) */}
          <Button
            variant="primary"
            style={{
              height: 48,
              fontSize: 15.5,
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(255, 149, 165, 0.4)',
              gap: 10,
            }}
            disabled={cart.length === 0}
            onClick={() => {
              sounds.playClick();
              setIsPaymentOpen(true);
            }}
          >
            <AppIcon name="credit_card" size={20} />
            <span>إتمام الدفع والسداد</span>
          </Button>

          {/* أزرار الإجراءات الثانوية بشبكة 2x2 منظمة وسريعة */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {/* إضافة خصم */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                sounds.playClick();
                setShowDiscountInput(!showDiscountInput);
              }}
              style={{ height: 36, fontSize: 12, gap: 6, padding: '0 8px', justifyContent: 'center' }}
            >
              <AppIcon name="percent" size={15} color="var(--color-primary)" />
              <span>إضافة خصم</span>
            </button>

            {/* تعليق الفاتورة */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleHoldSale}
              disabled={cart.length === 0}
              style={{ height: 36, fontSize: 12, gap: 6, padding: '0 8px', justifyContent: 'center' }}
            >
              <AppIcon name="pause_circle" size={15} color="var(--color-primary)" />
              <span>تعليق</span>
            </button>

            {/* الفواتير المعلقة */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                sounds.playClick();
                setIsHeldModalOpen(true);
              }}
              style={{ height: 36, fontSize: 12, gap: 6, padding: '0 8px', justifyContent: 'center' }}
            >
              <AppIcon name="pending_actions" size={15} color="var(--color-gold)" />
              <span>معلقة</span>
            </button>

            {/* إلغاء ومسح */}
            <button
              type="button"
              className="btn btn-danger-outline"
              onClick={() => {
                sounds.playWarning();
                setShowClearConfirm(true);
              }}
              disabled={cart.length === 0}
              style={{ height: 36, fontSize: 12, gap: 6, padding: '0 8px', justifyContent: 'center' }}
            >
              <AppIcon name="delete_sweep" size={15} color="var(--color-danger)" />
              <span>إلغاء</span>
            </button>
          </div>
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
        onSaleComplete={(createdSale, autoPrint) => {
          clearCart();
          setIsPaymentOpen(false);
          setAutoPrintAfterSale(autoPrint);
          setPreviewSale(createdSale);
          setCatalogRefreshTrigger((prev) => prev + 1);
        }}
      />

      {/* نافذة معاينة الفاتورة قبل الطباعة */}
      <InvoiceReceiptModal
        isOpen={Boolean(previewSale)}
        onClose={() => setPreviewSale(null)}
        sale={previewSale}
        autoPrint={autoPrintAfterSale}
        onNewSale={() => {
          setPreviewSale(null);
          clearCart();
        }}
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
