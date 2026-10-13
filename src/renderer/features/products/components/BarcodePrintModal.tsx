import React, { useState } from 'react';
import { Printer, Barcode, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { GlassIcon } from '../../../components/common/GlassIcon';
import { sounds } from '../../../lib/sounds';
import { useToast } from '../../../components/common/ToastContext';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  variantName?: string;
  priceFormatted: string;
  barcode: string;
}

export function BarcodePrintModal({
  isOpen,
  onClose,
  productName,
  variantName,
  priceFormatted,
  barcode,
}: BarcodePrintModalProps): React.ReactElement | null {
  const { success: toastSuccess, error: toastError } = useToast();
  const [copies, setCopies] = useState('1');
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(copies, 10);
    if (isNaN(count) || count <= 0) {
      sounds.playError();
      toastError('يرجى إدخال عدد ملصقات صحيح أكبر من الصفر');
      return;
    }

    setIsPrinting(true);
    try {
      const electron = (window as any).electron;
      const labels = [
        {
          productName,
          variantName,
          priceFormatted,
          barcode,
          copiesCount: count,
        },
      ];

      if (electron?.printBarcodeLabels) {
        const res = await electron.printBarcodeLabels(labels);
        if (!res?.success) {
          throw new Error(res?.error || 'فشلت عملية الطباعة');
        }
      }

      sounds.playSaleSuccess();
      toastSuccess(`تم إرسال ${count} ملصق باركود للطباعة بنجاح`);
      onClose();
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'تعذر إتمام طباعة ملصق الباركود');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="طباعة ملصق الباركود للمنتج"
      icon={<GlassIcon icon={Printer} size="sm" variant="primary" />}
      width={460}
    >
      <form onSubmit={handlePrint} style={{ display: 'flex', flexDirection: 'column', gap: 16, direction: 'rtl' }}>
        {/* معاينة شكل ملصق الباركود الحراري */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>معاينة ملصق الباركود (38 × 25 مم)</div>
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              border: '1.5px dashed #4F6B5E',
              borderRadius: 8,
              padding: '12px 24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2B24', maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {productName}
            </div>
            {variantName && variantName !== 'الافتراضي' && (
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{variantName}</div>
            )}

            {/* خطوط الباركود الرمزية */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 2,
                height: 38,
                margin: '8px 0 4px',
              }}
            >
              {[3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2].map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: w,
                    height: (i % 5 === 0) ? 38 : 32,
                    backgroundColor: '#000',
                  }}
                />
              ))}
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
              {barcode}
            </div>

            <div style={{ fontSize: 14, fontWeight: 800, color: '#21633D', marginTop: 4 }}>
              {priceFormatted}
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            عدد النسخ والملصقات المطلوب طباعتها:
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              type="number"
              min="1"
              max="1000"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              placeholder="1"
              style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}
              required
              autoFocus
            />
            {['1', '5', '10', '20'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCopies(preset)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #D5DAD6',
                  backgroundColor: copies === preset ? 'var(--color-primary-light)' : '#FFFFFF',
                  color: copies === preset ? 'var(--color-brand-deep)' : '#555',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPrinting}
            style={{ flex: 1, height: 44, fontSize: 14 }}
          >
            <Printer size={16} />
            <span>طباعة الملصقات الآن</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{ width: 90, height: 44 }}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default BarcodePrintModal;
