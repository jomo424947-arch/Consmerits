import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Layers,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
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

interface SystemPrinter {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number;
  statusText: string;
  isThermalRecommended: boolean;
}

const LABEL_SIZES = [
  { id: '38x25', label: '38 × 25 مم (الافتراضي للباركود)', width: 38, height: 25 },
  { id: '40x25', label: '40 × 25 مم', width: 40, height: 25 },
  { id: '50x25', label: '50 × 25 مم', width: 50, height: 25 },
  { id: '50x30', label: '50 × 30 مم', width: 50, height: 30 },
  { id: '58x40', label: '58 × 40 مم', width: 58, height: 40 },
];

export function BarcodePrintModal({
  isOpen,
  onClose,
  productName,
  variantName,
  priceFormatted,
  barcode,
}: BarcodePrintModalProps): React.ReactElement | null {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [copies, setCopies] = useState('1');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [printers, setPrinters] = useState<SystemPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedSizeId, setSelectedSizeId] = useState<string>('38x25');
  const [storeName, setStoreName] = useState<string>('بوتيك جوري');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const previewSvgRef = useRef<SVGSVGElement | null>(null);

  // جلب الطابعات وإعدادات المتجر عند فتح المودال
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const loadPrintersAndSettings = async () => {
      try {
        const electron = (window as any).electron;
        if (!electron) return;

        // جلب الإعدادات
        if (electron.getSettings) {
          const sRes = await electron.getSettings();
          if (mounted && sRes?.success && sRes.data) {
            if (sRes.data.store_name) setStoreName(sRes.data.store_name);
            if (sRes.data.barcode_printer_name) {
              setSelectedPrinter(sRes.data.barcode_printer_name);
            }
            if (sRes.data.barcode_label_size) {
              setSelectedSizeId(sRes.data.barcode_label_size);
            }
          }
        }

        // جلب الطابعات
        if (electron.getSystemPrinters) {
          const res = await electron.getSystemPrinters();
          if (mounted && res?.success && Array.isArray(res.data)) {
            setPrinters(res.data);

            // إذا لم تكن هناك طابعة محددة بعد، نختار تلقائياً أفضل طابعة حرارية
            if (!selectedPrinter) {
              const bestThermal = res.data.find(
                (p: SystemPrinter) => p.isThermalRecommended && p.status === 0
              );
              const anyThermal = res.data.find(
                (p: SystemPrinter) => p.isThermalRecommended
              );
              const defaultP = res.data.find((p: SystemPrinter) => p.isDefault);

              const chosen =
                bestThermal?.name || anyThermal?.name || defaultP?.name || (res.data[0]?.name ?? '');
              setSelectedPrinter(chosen);
            }
          }
        }
      } catch (err) {
        console.warn('تعذر جلب الطابعات والإعدادات:', err);
      }
    };

    loadPrintersAndSettings();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // رسم باركود حقيقي عالي التباين في شاشة المعاينة
  useEffect(() => {
    if (!isOpen || !previewSvgRef.current || !barcode) return;

    try {
      const cleanCode = barcode.trim();
      const is13 = /^\d{13}$/.test(cleanCode);

      try {
        JsBarcode(previewSvgRef.current, cleanCode, {
          format: is13 ? 'EAN13' : 'CODE128',
          displayValue: false,
          width: 2,
          height: 38,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        JsBarcode(previewSvgRef.current, cleanCode, {
          format: 'CODE128',
          displayValue: false,
          width: 2,
          height: 38,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      }
    } catch (e) {
      console.warn('خطأ في رسم معاينة الباركود:', e);
    }
  }, [isOpen, barcode, selectedSizeId]);

  if (!isOpen) return null;

  const currentSize =
    LABEL_SIZES.find((s) => s.id === selectedSizeId) || LABEL_SIZES[0];
  const activePrinterInfo = printers.find((p) => p.name === selectedPrinter);

  const handlePrinterChange = async (printerName: string) => {
    setSelectedPrinter(printerName);
    try {
      const electron = (window as any).electron;
      if (electron?.updateSettings) {
        await electron.updateSettings([
          { key: 'barcode_printer_name', value: printerName },
        ]);
      }
    } catch {
      // ignore
    }
  };

  const handleSizeChange = async (sizeId: string) => {
    setSelectedSizeId(sizeId);
    try {
      const electron = (window as any).electron;
      const sizeDef = LABEL_SIZES.find((s) => s.id === sizeId);
      if (electron?.updateSettings && sizeDef) {
        await electron.updateSettings([
          { key: 'barcode_label_size', value: sizeId },
          { key: 'barcode_label_width_mm', value: String(sizeDef.width) },
          { key: 'barcode_label_height_mm', value: String(sizeDef.height) },
        ]);
      }
    } catch {
      // ignore
    }
  };

  // تفريغ قائمة الطباعة وإلغاء التعليق
  const handleClearQueue = async () => {
    setIsClearingQueue(true);
    try {
      const electron = (window as any).electron;
      if (electron?.clearPrintQueue) {
        const res = await electron.clearPrintQueue(selectedPrinter);
        if (res?.success) {
          sounds.playSaleSuccess();
          toastSuccess('تم تفريغ قائمة الطباعة وإلغاء الأوامر العالقة بنجاح');

          // تحديث قائمة الطابعات
          if (electron.getSystemPrinters) {
            const pRes = await electron.getSystemPrinters();
            if (pRes?.success && Array.isArray(pRes.data)) {
              setPrinters(pRes.data);
            }
          }
        } else {
          toastError(res?.message || 'تعذر تفريغ قائمة الطباعة');
        }
      }
    } catch (err: any) {
      toastError(err?.message || 'فشل فك تعليق الطابعة');
    } finally {
      setIsClearingQueue(false);
    }
  };

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

      const options = {
        printerName: selectedPrinter || undefined,
        labelWidthMm: currentSize.width,
        labelHeightMm: currentSize.height,
      };

      if (electron?.printBarcodeLabels) {
        const res = await electron.printBarcodeLabels(labels, options);
        if (!res?.success) {
          throw new Error(res?.error || 'فشلت عملية الطباعة المباشرة');
        }
      }

      sounds.playSaleSuccess();
      toastSuccess(`تم إرسال ${count} ملصق للطابعة (${selectedPrinter || 'الافتراضية'}) بنجاح`);
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
      title="طباعة ملصقات الباركود للمنتج"
      icon={<GlassIcon icon={Printer} size="sm" variant="primary" />}
      width={500}
    >
      <form onSubmit={handlePrint} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
        
        {/* شريط حالة الطابعة المحددة */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 10,
            backgroundColor: '#F7FAF8',
            border: '1px solid #D5E2DA',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor:
                  activePrinterInfo?.status === 0 ? '#10B981' : '#EF4444',
                boxShadow:
                  activePrinterInfo?.status === 0
                    ? '0 0 8px rgba(16, 185, 129, 0.6)'
                    : '0 0 8px rgba(239, 68, 68, 0.6)',
              }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2B24' }}>
                الطابعة:{' '}
                <span style={{ color: 'var(--color-brand-deep)' }}>
                  {selectedPrinter || 'الطابعة الافتراضية للويندوز'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>
                {activePrinterInfo?.status === 0
                  ? '🟢 متصلة وجاهزة للطباعة الفورية'
                  : '🔴 الطابعة غير متصلة أو بها مهام معلقة'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleClearQueue}
              disabled={isClearingQueue}
              title="تفريغ مهام الطباعة المعلقة وفك تعليق الطابعة"
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #C4D3CB',
                backgroundColor: '#FFFFFF',
                color: '#2C4A3E',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <RefreshCw size={12} className={isClearingQueue ? 'spin-animation' : ''} />
              <span>فك التعليق</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #C4D3CB',
                backgroundColor: showAdvanced ? 'var(--color-primary-light)' : '#FFFFFF',
                color: 'var(--color-brand-deep)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Sliders size={12} />
              <span>{showAdvanced ? 'إخفاء الإعدادات' : 'تغيير الطابعة'}</span>
            </button>
          </div>
        </div>

        {/* إعدادات متقدمة لاختيار الطابعة ومقاس الملصق */}
        {showAdvanced && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: '#F3F6F4',
              border: '1px solid #D1DED6',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                اختيار طابعة الباركود:
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => handlePrinterChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #B7C9C0',
                  backgroundColor: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              >
                {printers.length === 0 ? (
                  <option value="">لا توجد طابعات مكتشفة (سيتم استخدام الافتراضية)</option>
                ) : (
                  printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.isThermalRecommended ? '⭐ (طابعة ملصقات)' : ''}{' '}
                      {p.isDefault ? '(الافتراضية)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                مقاس ورق الملصق (Label Size):
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LABEL_SIZES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => handleSizeChange(size.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border:
                        selectedSizeId === size.id
                          ? '1.5px solid var(--color-brand-deep)'
                          : '1px solid #CCD8D1',
                      backgroundColor:
                        selectedSizeId === size.id ? 'var(--color-primary-light)' : '#FFFFFF',
                      color:
                        selectedSizeId === size.id ? 'var(--color-brand-deep)' : '#444',
                      fontSize: 11.5,
                      fontWeight: selectedSizeId === size.id ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* معاينة شكل ملصق الباركود الحراري الحقيقي */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            معاينة ملصق الباركود المباشر ({currentSize.width} × {currentSize.height} مم)
          </div>

          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              border: '2px solid #1B2B24',
              borderRadius: 6,
              padding: '8px 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              width: 250,
              minHeight: 140,
              boxSizing: 'border-box',
            }}
          >
            {/* الترويسة واسم المتجر */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px dashed #DDD',
                paddingBottom: 3,
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: '#1B2B24' }}>
                {storeName}
              </span>
              {variantName && variantName !== 'الافتراضي' && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: '#000',
                    border: '1px solid #000',
                    padding: '1px 5px',
                    borderRadius: 3,
                  }}
                >
                  {variantName}
                </span>
              )}
            </div>

            {/* اسم المنتج */}
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 900,
                color: '#000000',
                maxWidth: 220,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                margin: '2px 0',
              }}
            >
              {productName}
            </div>

            {/* خطوط الباركود الحقيقية فائقة التباين */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '3px 0',
              }}
            >
              <svg
                ref={previewSvgRef}
                style={{
                  width: '95%',
                  height: 40,
                  shapeRendering: 'crispEdges',
                  display: 'block',
                }}
              />
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: '#000000',
                  marginTop: 2,
                }}
              >
                {barcode}
              </div>
            </div>

            {/* السعر النهائي البارز */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'baseline',
                gap: 6,
                borderTop: '1px solid #000000',
                paddingTop: 3,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#000000' }}>السعر:</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#000000' }}>
                {priceFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* عدد النسخ */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            عدد الملصقات المطلوب طباعتها:
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
            {['1', '5', '10', '20', '50'].map((preset) => (
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
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPrinting}
            style={{ flex: 1, height: 46, fontSize: 14.5, fontWeight: 700 }}
          >
            <Printer size={17} />
            <span>{isPrinting ? 'جارٍ إرسال أمر الطباعة...' : 'طباعة الملصقات الآن'}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{ width: 90, height: 46 }}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default BarcodePrintModal;
