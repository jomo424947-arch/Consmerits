import React, { useState } from 'react';
import {
  Truck,
  Plus,
  FileText,
  DollarSign,
  Users,
  Search,
  CheckCircle2,
  Calendar,
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

interface PurchaseInvoice {
  id: number;
  invoiceNo: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  date: string;
  itemsCount: number;
}

interface SupplierItem {
  id: number;
  name: string;
  phone: string;
  balance: number; // رصيد مستحق له
}

export function PurchasesScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // حقول إضافة فاتورة مشتريات
  const [supplierName, setSupplierName] = useState('مؤسسة الجمال الدولية');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [costPriceStr, setCostPriceStr] = useState('');
  const [qtyStr, setQtyStr] = useState('10');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');

  // بيانات نموذجية غنية لفواتير المشتريات
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([
    { id: 1, invoiceNo: 'PO-2026-081', supplierName: 'مؤسسة الجمال الدولية', totalAmount: 485000, paidAmount: 485000, status: 'paid', date: '2026-10-10', itemsCount: 45 },
    { id: 2, invoiceNo: 'PO-2026-082', supplierName: 'شركة النقاء لمستحضرات التجميل', totalAmount: 320000, paidAmount: 200000, status: 'partial', date: '2026-10-08', itemsCount: 30 },
    { id: 3, invoiceNo: 'PO-2026-083', supplierName: 'توريدات العطور ومواد التجميل', totalAmount: 185000, paidAmount: 0, status: 'unpaid', date: '2026-10-05', itemsCount: 15 },
  ]);

  const [suppliers] = useState<SupplierItem[]>([
    { id: 1, name: 'مؤسسة الجمال الدولية', phone: '01012345678', balance: 0 },
    { id: 2, name: 'شركة النقاء لمستحضرات التجميل', phone: '01198765432', balance: 120000 },
    { id: 3, name: 'توريدات العطور ومواد التجميل', phone: '01234567890', balance: 185000 },
  ]);

  const totalPurchases = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPayableToSuppliers = suppliers.reduce((sum, s) => sum + s.balance, 0);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(costPriceStr);
    const qty = parseInt(qtyStr, 10);

    if (!invoiceNumber.trim() || isNaN(cost) || isNaN(qty) || cost <= 0 || qty <= 0) {
      sounds.playError();
      toastError('يرجى استكمال جميع بيانات الفاتورة بشكل صحيح');
      return;
    }

    const totalInPiasters = Math.round(cost * 100 * qty);
    const newInvoice: PurchaseInvoice = {
      id: Date.now(),
      invoiceNo: invoiceNumber.trim(),
      supplierName,
      totalAmount: totalInPiasters,
      paidAmount: totalInPiasters,
      status: 'paid',
      date: new Date().toISOString().split('T')[0],
      itemsCount: qty,
    };

    sounds.playSaleSuccess();
    setInvoices([newInvoice, ...invoices]);
    toastSuccess(MESSAGES.PURCHASE_SAVED);
    setIsInvoiceModalOpen(false);
    setInvoiceNumber('');
    setProductName('');
    setCostPriceStr('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* بطاقات المؤشرات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={Truck} size="lg" variant="info" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المشتريات</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {formatMoney(totalPurchases)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={Users} size="lg" variant="primary" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>عدد الموردين النشطين</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {suppliers.length}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={DollarSign} size="lg" variant="gold" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>مستحقات آجلة للموردين</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#A87910' }}>
              {formatMoney(totalPayableToSuppliers)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={FileText} size="lg" variant="brand" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>عدد الفواتير المستلمة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {invoices.length}
            </div>
          </div>
        </div>
      </div>

      {/* شريط التبويبات والبحث */}
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
        <div style={{ display: 'flex', gap: 6, backgroundColor: '#F0F3F1', padding: 4, borderRadius: 10 }}>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('invoices');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'invoices' ? '#FFFFFF' : 'transparent',
              fontWeight: activeTab === 'invoices' ? 700 : 500,
              color: activeTab === 'invoices' ? 'var(--color-brand-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            فواتير المشتريات
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('suppliers');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'suppliers' ? '#FFFFFF' : 'transparent',
              fontWeight: activeTab === 'suppliers' ? 700 : 500,
              color: activeTab === 'suppliers' ? 'var(--color-brand-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            دليل وأرصدة الموردين
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 280 }}>
            <Input
              placeholder="بحث برقم الفاتورة أو اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              sounds.playClick();
              setIsInvoiceModalOpen(true);
            }}
            style={{ height: 42, padding: '0 18px' }}
          >
            <Plus size={16} />
            <span>تسجيل فاتورة شراء</span>
          </Button>
        </div>
      </div>

      {/* محتوى الجداول */}
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
        {activeTab === 'invoices' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '6%', padding: '12px 16px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '16%', padding: '12px 16px' }}>رقم الفاتورة</th>
                  <th style={{ width: '28%', padding: '12px 16px' }}>المورد</th>
                  <th style={{ width: '16%', padding: '12px 16px' }}>تاريخ الاستلام</th>
                  <th style={{ width: '16%', padding: '12px 16px', textAlign: 'left' }}>إجمالي الفاتورة</th>
                  <th style={{ width: '18%', padding: '12px 16px', textAlign: 'center' }}>حالة السداد</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          backgroundColor: '#F0F3F1',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        {inv.invoiceNo}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                      {inv.supplierName}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {inv.date}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 14 }}>
                      {formatMoney(inv.totalAmount)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {inv.status === 'paid' ? (
                        <span className="badge badge-success">مسددة بالكامل ✓</span>
                      ) : inv.status === 'partial' ? (
                        <span className="badge badge-warn">سداد جزئي</span>
                      ) : (
                        <span className="badge badge-danger">آجلة غير مسددة</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '6%', padding: '12px 16px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '34%', padding: '12px 16px' }}>اسم المورد / الشركة</th>
                  <th style={{ width: '24%', padding: '12px 16px' }}>رقم الهاتف للتواصل</th>
                  <th style={{ width: '20%', padding: '12px 16px', textAlign: 'left' }}>الرصيد المستحق للمورد</th>
                  <th style={{ width: '16%', padding: '12px 16px', textAlign: 'center' }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace' }}>
                      {s.phone}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: 14,
                        color: s.balance > 0 ? '#962B34' : '#21633D',
                      }}
                    >
                      {formatMoney(s.balance)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {s.balance === 0 ? (
                        <span className="badge badge-success">حساب خالص ✓</span>
                      ) : (
                        <span className="badge badge-warn">مستحق السداد</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة تسجيل فاتورة شراء جديدة */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="تسجيل فاتورة شراء وتوريد مخزون"
        icon={<GlassIcon icon={Truck} size="sm" variant="info" />}
        width={540}
      >
        <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                المورد *
              </label>
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="in"
                style={{ height: 44 }}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                رقم فاتورة الشراء *
              </label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="مثال: INV-9840"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              الصنف المورد *
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
                سعر تكلفة الشراء للقطعة (ج.م) *
              </label>
              <Input
                type="number"
                step="any"
                value={costPriceStr}
                onChange={(e) => setCostPriceStr(e.target.value)}
                placeholder="75.00"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                الكمية المستلمة *
              </label>
              <Input
                type="number"
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
                placeholder="20"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              تاريخ انتهاء الصلاحية للتشغيلة (FEFO)
            </label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Button type="submit" variant="primary" style={{ flex: 1, height: 44 }}>
              <CheckCircle2 size={16} />
              <span>اعتماد وتوريد المخزون</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                sounds.playClick();
                setIsInvoiceModalOpen(false);
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

export default PurchasesScreen;
