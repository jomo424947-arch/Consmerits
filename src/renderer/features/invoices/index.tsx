import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Printer,
  Eye,
  CheckCircle2,
  XCircle,
  Coins,
  CreditCard,
  Layers,
  Calendar,
  User,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { InvoiceReceiptModal } from '../pos/components/InvoiceReceiptModal';
import { formatMoney } from '../../../shared/utils/money';
import { Sale } from '../../../shared/types/sales.types';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';
import { formatDateArabic, formatTimeArabic } from '../../lib/formatters';

export function InvoicesScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      if (electron?.listSales) {
        const res = await electron.listSales();
        if (res?.success && Array.isArray(res.data)) {
          setSales(res.data);
          return;
        }
      }
      setSales([]);
    } catch (err: any) {
      toastError(err.message || 'تعذر جلب سجل الفواتير');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handlePrintReceipt = async (sale: Sale) => {
    try {
      sounds.playClick();
      const electron = (window as any).electron;
      if (electron?.printReceipt) {
        await electron.printReceipt(sale.id);
        sounds.playSaleSuccess();
        toastSuccess(`تم إرسال الفاتورة #${sale.invoice_no} للطباعة`);
      }
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'فشلت إعادة الطباعة');
    }
  };

  const getMethodBadge = (sale: Sale) => {
    const methods = sale.payments?.map((p) => p.method) || [];
    if (methods.includes('cash') && methods.includes('card')) {
      return (
        <span
          style={{
            backgroundColor: '#FFF8E1',
            color: '#B78103',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Layers size={13} />
          <span>مختلط (كاش + فيزا)</span>
        </span>
      );
    }
    if (methods.includes('card')) {
      return (
        <span
          style={{
            backgroundColor: '#E3F2FD',
            color: '#1565C0',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <CreditCard size={13} />
          <span>بطاقة / فيزا</span>
        </span>
      );
    }
    return (
      <span
        style={{
          backgroundColor: '#E8F5E9',
          color: '#2E7D32',
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Coins size={13} />
        <span>نقدي (كاش)</span>
      </span>
    );
  };

  const filteredSales = sales.filter((s) => {
    const matchQuery =
      s.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.seq_no).includes(searchQuery);

    const matchStatus = statusFilter === 'all' || s.status === statusFilter;

    let matchMethod = true;
    if (methodFilter !== 'all') {
      const methods = s.payments?.map((p) => p.method) || [];
      matchMethod = methods.includes(methodFilter as any);
    }

    return matchQuery && matchStatus && matchMethod;
  });

  const totalFilteredAmount = filteredSales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* بطاقات الإحصائيات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي الفواتير المسجلة</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {sales.length} فاتورة
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي قيمة الفواتير المعروضة</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#21633D', marginTop: 4 }}>
            {formatMoney(totalFilteredAmount)}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>فواتير مكتملة وناجحة</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)', marginTop: 4 }}>
            {sales.filter((s) => s.status === 'completed').length}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', backgroundColor: '#FFFFFF' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>فواتير ملغاة (Voided)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#962B34', marginTop: 4 }}>
            {sales.filter((s) => s.status === 'voided').length}
          </div>
        </div>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
          <div style={{ width: 280 }}>
            <Input
              placeholder="بحث برقم الفاتورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="in"
            style={{ width: 160, height: 40, fontSize: 13 }}
          >
            <option value="all">جميع الحالات</option>
            <option value="completed">مكتملة فقط</option>
            <option value="voided">ملغاة فقط</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="in"
            style={{ width: 160, height: 40, fontSize: 13 }}
          >
            <option value="all">جميع طرق الدفع</option>
            <option value="cash">نقدي (كاش)</option>
            <option value="card">بطاقة / فيزا</option>
          </select>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            sounds.playClick();
            fetchSales();
            toastSuccess('تم تحديث سجل الفواتير');
          }}
          style={{ height: 40 }}
        >
          <RefreshCw size={15} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* جدول الفواتير */}
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
        {filteredSales.length === 0 ? (
          <EmptyState
            icon={FileText}
            variant="brand"
            title="لا توجد فواتير مسجلة"
            description="لم يتم العثور على أي فاتورة مبيعات مطابقة لمعايير البحث في قاعدة البيانات"
          />
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '5%', padding: '12px 14px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '16%', padding: '12px 14px' }}>رقم الفاتورة</th>
                  <th style={{ width: '18%', padding: '12px 14px' }}>التاريخ والوقت</th>
                  <th style={{ width: '14%', padding: '12px 14px' }}>طريقة الدفع</th>
                  <th style={{ width: '12%', padding: '12px 14px', textAlign: 'center' }}>عدد الأصناف</th>
                  <th style={{ width: '15%', padding: '12px 14px', textAlign: 'left' }}>الإجمالي الصافي</th>
                  <th style={{ width: '10%', padding: '12px 14px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ width: '10%', padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s, idx) => {
                  const isVoided = s.status === 'voided';
                  const itemsCount = s.items?.reduce((sum, it) => sum + it.qty, 0) || 0;

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        backgroundColor: isVoided ? 'rgba(251, 234, 235, 0.4)' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--color-brand-deep)',
                            backgroundColor: '#F0F3F1',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {s.invoice_no}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                            {formatDateArabic(s.created_at)}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              direction: 'ltr',
                              textAlign: 'right',
                              fontFamily: 'Space Grotesk, sans-serif',
                            }}
                          >
                            {formatTimeArabic(s.created_at)}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {getMethodBadge(s)}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                        {itemsCount} قطعة
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, fontSize: 15, color: isVoided ? '#962B34' : 'var(--color-brand-deep)' }}>
                        {formatMoney(s.total)}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isVoided ? (
                          <span className="badge badge-danger">ملغاة</span>
                        ) : (
                          <span className="badge badge-success">مكتملة</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setSelectedSale(s);
                            }}
                            className="btn btn-secondary"
                            style={{ height: 30, padding: '0 8px', fontSize: 12 }}
                            title="عرض تفاصيل الفاتورة"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(s)}
                            className="btn btn-secondary"
                            style={{ height: 30, padding: '0 8px', fontSize: 12 }}
                            title="إعادة طباعة الإيصال الحراري"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة عرض ومعاينة الفاتورة قبل الطباعة */}
      <InvoiceReceiptModal
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
      />
    </div>
  );
}

export default InvoicesScreen;
