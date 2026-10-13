import React, { useState } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { GlassIcon } from '../../components/common/GlassIcon';
import { EmptyState } from '../../components/common/EmptyState';
import { formatMoney } from '../../../shared/utils/money';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';
import { MESSAGES } from '../../lib/messages';

interface ReturnRecord {
  id: number;
  returnNo: string;
  originalInvoiceNo: string;
  productName: string;
  qty: number;
  refundAmount: number;
  reason: string;
  method: string;
  date: string;
  actor: string;
}

export function ReturnsScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // حقول تسجيل مرتجع جديد
  const [invoiceNo, setInvoiceNo] = useState('');
  const [productName, setProductName] = useState('');
  const [qtyStr, setQtyStr] = useState('1');
  const [refundStr, setRefundStr] = useState('');
  const [reason, setReason] = useState('رغبة العميل (بدون عيب)');
  const [refundMethod, setRefundMethod] = useState('نقداً من الدرج');

  const [returns, setReturns] = useState<ReturnRecord[]>([
    {
      id: 1,
      returnNo: 'RET-101',
      originalInvoiceNo: 'INV-1020',
      productName: 'أحمر شفاه مات درجة 04',
      qty: 1,
      refundAmount: 14500,
      reason: 'تبديل درجة اللون',
      method: 'نقداً من الدرج',
      date: '2026-10-12 14:10',
      actor: 'كاشير المحل',
    },
    {
      id: 2,
      returnNo: 'RET-102',
      originalInvoiceNo: 'INV-1015',
      productName: 'ماسكارا مقاومة للماء',
      qty: 1,
      refundAmount: 9500,
      reason: 'عيوب في العبوة',
      method: 'نقداً من الدرج',
      date: '2026-10-10 17:45',
      actor: 'المدير',
    },
  ]);

  const totalRefunded = returns.reduce((sum, r) => sum + r.refundAmount, 0);

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(qtyStr, 10);
    const refund = parseFloat(refundStr);

    if (!invoiceNo.trim() || !productName.trim() || isNaN(qty) || isNaN(refund) || refund <= 0) {
      sounds.playError();
      toastError('يرجى استكمال جميع بيانات الإرجاع بدقة');
      return;
    }

    const newRecord: ReturnRecord = {
      id: Date.now(),
      returnNo: `RET-${returns.length + 103}`,
      originalInvoiceNo: invoiceNo.trim(),
      productName: productName.trim(),
      qty,
      refundAmount: Math.round(refund * 100),
      reason,
      method: refundMethod,
      date: new Date().toLocaleString('ar-EG'),
      actor: 'كاشير المحل',
    };

    sounds.playDelete();
    setReturns([newRecord, ...returns]);
    toastSuccess(MESSAGES.RETURN_SUCCESS);
    setIsModalOpen(false);
    setInvoiceNo('');
    setProductName('');
    setRefundStr('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* بطاقات المؤشرات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={RotateCcw} size="lg" variant="danger" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المبالغ المستردة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-danger)' }}>
              {formatMoney(totalRefunded)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={FileText} size="lg" variant="gold" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>عدد عمليات الإرجاع</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {returns.length}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={CheckCircle2} size="lg" variant="success" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>حالة استرجاع المخزون</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#21633D' }}>
              معاد ومسوّى آلياً
            </div>
          </div>
        </div>
      </div>

      {/* شريط الإجراءات والبحث */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ width: 340 }}>
          <Input
            placeholder="بحث برقم الإشعار أو الفاتورة الأصلية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>

        <Button
          variant="danger"
          onClick={() => {
            sounds.playClick();
            setIsModalOpen(true);
          }}
          style={{ height: 42, padding: '0 18px' }}
        >
          <Plus size={16} />
          <span>تسجيل عملية إرجاع</span>
        </Button>
      </div>

      {/* جدول سجلات المرتجعات */}
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
        {returns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            variant="danger"
            title="لا توجد عمليات إرجاع مسجلة"
            description="جميع المبيعات مؤكدة، لم يتم تسجيل أي إشعار استرجاع أو استبدال حتى الآن"
          />
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '6%', padding: '12px 16px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '14%', padding: '12px 16px' }}>رقم الإشعار</th>
                  <th style={{ width: '16%', padding: '12px 16px' }}>الفاتورة الأصلية</th>
                  <th style={{ width: '26%', padding: '12px 16px' }}>المنتج المرتجع</th>
                  <th style={{ width: '14%', padding: '12px 16px', textAlign: 'left' }}>المبلغ المسترد</th>
                  <th style={{ width: '14%', padding: '12px 16px' }}>طريقة الرد</th>
                  <th style={{ width: '10%', padding: '12px 16px' }}>السبب</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r, idx) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-danger)' }}>
                      {r.returnNo}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--color-brand-deep)' }}>
                      {r.originalInvoiceNo}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {r.productName} ({r.qty} قطعة)
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--color-danger)' }}>
                      {formatMoney(r.refundAmount)}-
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      <span className="badge badge-neutral">{r.method}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {r.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة تسجيل مرتجع جديد */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل عملية إرجاع منتج ورد مبلغ"
        icon={<GlassIcon icon={RotateCcw} size="sm" variant="danger" />}
        width={520}
      >
        <form onSubmit={handleCreateReturn} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                رقم الفاتورة الأصلية *
              </label>
              <Input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="مثال: INV-1025"
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                طريقة رد المبلغ *
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="in"
                style={{ height: 44 }}
              >
                <option value="نقداً من الدرج">نقداً من الدرج</option>
                <option value="استرجاع على البطاقة">استرجاع على البطاقة</option>
                <option value="رصيد متجر للعميل">رصيد متجر للعميل</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              اسم المنتج المرتجع *
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="مثال: كريم أساس سائل 30مل"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                الكمية المرتجعة *
              </label>
              <Input
                type="number"
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
                placeholder="1"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                المبلغ المسترد للعميل (ج.م) *
              </label>
              <Input
                type="number"
                step="any"
                value={refundStr}
                onChange={(e) => setRefundStr(e.target.value)}
                placeholder="مثال: 120.00"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              سبب الإرجاع *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="in"
              style={{ height: 44 }}
            >
              <option value="رغبة العميل (بدون عيب)">رغبة العميل (بدون عيب)</option>
              <option value="عيب في العبوة أو المنتج">عيب في العبوة أو المنتج</option>
              <option value="خطأ في تسجيل الصنف من الكاشير">خطأ في تسجيل الصنف من الكاشير</option>
              <option value="صلاحية قريبة أو منتهية">صلاحية قريبة أو منتهية</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Button type="submit" variant="danger" style={{ flex: 1, height: 44 }}>
              <CheckCircle2 size={16} />
              <span>تأكيد الإرجاع وخصم المبلغ من الدرج</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                sounds.playClick();
                setIsModalOpen(false);
              }}
              style={{ width: 100, height: 44 }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ReturnsScreen;
