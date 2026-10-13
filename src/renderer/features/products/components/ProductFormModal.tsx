import React, { useState } from 'react';
import { Tag, Sparkles, Barcode, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { GlassIcon } from '../../../components/common/GlassIcon';
import { sounds } from '../../../lib/sounds';
import { useToast } from '../../../components/common/ToastContext';
import { MESSAGES } from '../../../lib/messages';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
}: ProductFormModalProps): React.ReactElement | null {
  const { success: toastSuccess, error: toastError } = useToast();
  const [nameAr, setNameAr] = useState('');
  const [categoryName, setCategoryName] = useState('مكياج');
  const [brandName, setBrandName] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [barcode, setBarcode] = useState('');
  const [initialStockStr, setInitialStockStr] = useState('10');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    sounds.playClick();
    // توليد باركود داخلي يبدأ بـ 200
    const randomSeq = Math.floor(100000000 + Math.random() * 900000000);
    const code = `200${randomSeq}`.slice(0, 13);
    setBarcode(code);
    toastSuccess('تم توليد باركود داخلي جديد بنجاح');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      sounds.playError();
      toastError('يرجى إدخال اسم المنتج باللغة العربية');
      return;
    }

    const priceNum = parseFloat(priceStr);
    if (isNaN(priceNum) || priceNum <= 0) {
      sounds.playError();
      toastError('يرجى إدخال سعر بيع صحيح أكبر من الصفر');
      return;
    }

    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      const piasters = Math.round(priceNum * 100);
      const stock = parseInt(initialStockStr, 10) || 0;

      const payload = {
        name_ar: nameAr.trim(),
        category_name: categoryName.trim() || 'عام',
        brand_name: brandName.trim() || null,
        unit: 'قطعة',
        variants: [
          {
            name: 'الافتراضي',
            sale_price: piasters,
            min_stock: 5,
            initial_stock: stock,
            barcodes: barcode.trim() ? [barcode.trim()] : [],
          },
        ],
      };

      if (electron?.invoke) {
        await electron.invoke('products:create', payload);
      }

      sounds.playSaleSuccess();
      toastSuccess(MESSAGES.PRODUCT_SAVED);
      onSuccess();
      onClose();
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'تعذر حفظ المنتج');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة منتج وصنف جديد"
      icon={<GlassIcon icon={Tag} size="sm" variant="primary" />}
      width={520}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
            اسم المنتج (بالعربية) *
          </label>
          <Input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="مثال: أحمر شفاه مات درجة 05"
            autoFocus
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              القسم / التصنيف
            </label>
            <select
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="in"
              style={{ height: 44 }}
            >
              <option value="مكياج">مكياج</option>
              <option value="عناية بالبشرة">عناية بالبشرة</option>
              <option value="عناية بالشعر">عناية بالشعر</option>
              <option value="عطور">عطور</option>
              <option value="أظافر">أظافر</option>
              <option value="إكسسوارات">إكسسوارات</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              الماركة / البراند
            </label>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="مثال: لوريال، ميبيلين..."
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              سعر البيع (ج.م) *
            </label>
            <Input
              type="number"
              step="any"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="مثال: 150.00"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              رصيد المخزون الأولي
            </label>
            <Input
              type="number"
              value={initialStockStr}
              onChange={(e) => setInitialStockStr(e.target.value)}
              placeholder="10"
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>الباركود الدولي أو الداخلي</label>
            <button
              type="button"
              onClick={handleGenerateBarcode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              + توليد باركود تلقائي
            </button>
          </div>
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="امسح بالباركود أو اتركه للتوليد التلقائي"
            icon={<Barcode size={18} />}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            style={{ flex: 1, height: 44, fontSize: 14 }}
          >
            <CheckCircle2 size={16} />
            <span>حفظ المنتج والباركود</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            style={{ width: 100, height: 44 }}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ProductFormModal;
