import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  RefreshCw,
  Package,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { GlassIcon } from '../../components/common/GlassIcon';
import { formatMoney } from '../../../shared/utils/money';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';
import { MESSAGES } from '../../lib/messages';
import { ReturnInvoice, RefundMethod, ReturnItemCondition } from '../../../shared/types/returns.types';

export function ReturnsScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // قائمة المرتجعات الحقيقية
  const [returns, setReturns] = useState<ReturnInvoice[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);

  // حقول تسجيل مرتجع جديد
  const [selectedSaleId, setSelectedSaleId] = useState<number | ''>('');
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [condition, setCondition] = useState<ReturnItemCondition>('good');
  const [reason, setReason] = useState('رغبة العميل (بدون عيب)');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('cash');

  const fetchReturnsData = async () => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      if (!electron) return;

      // 1. جلب المرتجعات
      if (electron.listReturns) {
        const retRes = await electron.listReturns();
        if (retRes?.success && Array.isArray(retRes.data)) {
          setReturns(retRes.data);
        } else {
          setReturns([]);
        }
      }

      // 2. جلب المبيعات المكتملة
      if (electron.listSales) {
        const salesRes = await electron.listSales({ limit: 50 });
        if (salesRes?.success && Array.isArray(salesRes.data)) {
          setSalesList(salesRes.data);
        }
      }
    } catch (err: any) {
      console.error(err);
      toastError('تعذر تحميل بيانات المرتجعات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnsData();
  }, []);

  // عند اختيار فاتورة مبيعات، جلب تفاصيل بنودها
  const handleSaleSelect = async (saleId: number) => {
    setSelectedSaleId(saleId);
    try {
      const electron = (window as any).electron;
      const res = await electron.getSale(saleId);
      if (res?.success && res.data) {
        setSelectedSaleDetails(res.data);
        if (res.data.items?.length > 0) {
          setSelectedItemId(res.data.items[0].id);
          setReturnQty(1);
        }
      }
    } catch {
      setSelectedSaleDetails(null);
    }
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSaleId || !selectedItemId || returnQty <= 0) {
      sounds.playError();
      toastError('يرجى تحديد فاتورة المبيعات والبند والكمية المراد إرجاعها');
      return;
    }

    try {
      const electron = (window as any).electron;
      const res = await electron.processReturn({
        sale_id: Number(selectedSaleId),
        user_id: 1,
        refund_method: refundMethod,
        reason: reason.trim() || undefined,
        items: [
          {
            sale_item_id: Number(selectedItemId),
            qty: returnQty,
            condition,
          },
        ],
      });

      if (res?.success) {
        sounds.playSaleSuccess();
        toastSuccess('تم تسجيل المرتجع بنجاح وتحديث المخزون');
        setIsModalOpen(false);
        setSelectedSaleId('');
        setSelectedSaleDetails(null);
        setSelectedItemId('');
        setReturnQty(1);
        fetchReturnsData();
      } else {
        throw new Error(res?.error || 'فشل معالجة المرتجع');
      }
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'حدث خطأ أثناء معالجة المرتجع');
    }
  };

  const totalRefunded = returns.reduce((sum, r) => sum + (r.total_refund || 0), 0);

  const filteredReturns = returns.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.id.toString().includes(q) ||
      r.sale_id.toString().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* بطاقات الإحصائيات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={RotateCcw} size="lg" variant="danger" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المبالغ المستردة</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#962B34' }}>
              {formatMoney(totalRefunded)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={FileText} size="lg" variant="brand" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>عدد عمليات الإرجاع</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {returns.length} عملية
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={CheckCircle2} size="lg" variant="success" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>سياسة الإرجاع والاستبدال</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#21633D' }}>
              14 يوماً مع إرجاع فوري للمخزون
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
        <div style={{ width: 320 }}>
          <Input
            placeholder="بحث برقم المرتجع أو الفاتورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            onClick={() => fetchReturnsData()}
            disabled={isLoading}
            style={{ height: 42, padding: '0 14px' }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              sounds.playClick();
              if (salesList.length === 0) {
                toastError('لا توجد فواتير مبيعات سابقة لإرجاعها');
                return;
              }
              setIsModalOpen(true);
            }}
            style={{ height: 42, padding: '0 18px' }}
          >
            <Plus size={16} />
            <span>تسجيل طلب مرتجع جديد</span>
          </Button>
        </div>
      </div>

      {/* جدول المرتجعات */}
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
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filteredReturns.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 48,
                gap: 12,
                color: 'var(--text-muted)',
              }}
            >
              <RotateCcw size={42} opacity={0.4} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>لا توجد عمليات مرتجع مسجلة بعد</div>
              <div style={{ fontSize: 12 }}>
                عند إرجاع أي صنف مرتبط بفاتورة مبيعات، سيتم توثيقه وتعديل المخزون والخزنة آلياً هنا
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '8%', padding: '12px 16px', textAlign: 'center' }}>رقم المرتجع</th>
                  <th style={{ width: '14%', padding: '12px 16px' }}>الفاتورة الأصلية</th>
                  <th style={{ width: '16%', padding: '12px 16px' }}>تاريخ المرتجع</th>
                  <th style={{ width: '16%', padding: '12px 16px', textAlign: 'left' }}>المبلغ المسترد</th>
                  <th style={{ width: '14%', padding: '12px 16px', textAlign: 'center' }}>طريقة الرد</th>
                  <th style={{ width: '32%', padding: '12px 16px' }}>سبب الإرجاع</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          backgroundColor: 'rgba(235, 87, 87, 0.1)',
                          color: '#C53030',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        RET-#{r.id}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          backgroundColor: '#F0F3F1',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        فاتورة #{r.sale_id}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {r.created_at?.slice(0, 16)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 14, color: '#962B34' }}>
                      {formatMoney(r.total_refund)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span className="badge badge-neutral">
                        {r.refund_method === 'cash' ? 'نقداً (كاش)' : r.refund_method === 'credit' ? 'رصيد دائن' : 'استبدال'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {r.reason || 'بدون إبداء سبب'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* نافذة تسجيل مرتجع جديد */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل مرتجع مرتبط بفاتورة مبيعات"
        icon={<GlassIcon icon={RotateCcw} size="sm" variant="danger" />}
        width={540}
      >
        <form onSubmit={handleCreateReturn} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              اختر فاتورة المبيعات الأصلية *
            </label>
            <select
              value={selectedSaleId}
              onChange={(e) => handleSaleSelect(Number(e.target.value))}
              className="in"
              style={{ height: 44, width: '100%' }}
              required
            >
              <option value="">-- اضغط لاختيار فاتورة البيع --</option>
              {salesList.map((s) => (
                <option key={s.id} value={s.id}>
                  فاتورة #{s.invoice_number || s.seq_no || s.id} - بتاريخ {s.created_at?.slice(0, 10)} - بقيمة {formatMoney(s.total)}
                </option>
              ))}
            </select>
          </div>

          {selectedSaleDetails && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                اختر الصنف المراد إرجاعه من الفاتورة *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(Number(e.target.value))}
                className="in"
                style={{ height: 44, width: '100%' }}
                required
              >
                {selectedSaleDetails.items?.map((it: any) => (
                  <option key={it.id} value={it.id}>
                    {it.product_name} {it.variant_name ? `(${it.variant_name})` : ''} - الكمية المباعة: {it.qty} - السعر: {formatMoney(it.unit_price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                الكمية المراد إرجاعها *
              </label>
              <Input
                type="number"
                min="1"
                value={returnQty.toString()}
                onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                حالة المنتج المرتجع *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="in"
                style={{ height: 44, width: '100%' }}
              >
                <option value="good">سليم (يعود للمخزون الصالح)</option>
                <option value="damaged">تالف / هالك (لا يعود للبيع)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                طريقة رد المبلغ للعميل *
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="in"
                style={{ height: 44, width: '100%' }}
              >
                <option value="cash">نقداً من الدرج (كاش)</option>
                <option value="credit">رصيد دائن للعميل</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                سبب الإرجاع
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: تغيير درجة اللون"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Button type="submit" variant="primary" style={{ flex: 1, height: 44 }}>
              <CheckCircle2 size={16} />
              <span>اعتماد المرتجع واسترداد القيمة</span>
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
