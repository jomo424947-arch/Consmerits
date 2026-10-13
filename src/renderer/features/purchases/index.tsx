import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  FileText,
  DollarSign,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Package,
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
import { Purchase, Supplier } from '../../../shared/types/purchases.types';

export function PurchasesScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // البيانات الحقيقية من قاعدة البيانات
  const [invoices, setInvoices] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // نافذة إضافة فاتورة مشتريات
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('');
  const [costPriceStr, setCostPriceStr] = useState('');
  const [qtyStr, setQtyStr] = useState('10');
  const [expiryDate, setExpiryDate] = useState('');
  const [paidStr, setPaidStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');

  // نافذة إضافة مورد جديد
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      if (!electron) return;

      // 1. جلب فواتير المشتريات
      if (electron.listPurchases) {
        const pRes = await electron.listPurchases();
        if (pRes?.success && Array.isArray(pRes.data)) {
          setInvoices(pRes.data);
        } else {
          setInvoices([]);
        }
      }

      // 2. جلب الموردين
      if (electron.listSuppliers) {
        const sRes = await electron.listSuppliers();
        if (sRes?.success && Array.isArray(sRes.data)) {
          setSuppliers(sRes.data);
          if (sRes.data.length > 0 && selectedSupplierId === '') {
            setSelectedSupplierId(sRes.data[0].id);
          }
        } else {
          setSuppliers([]);
        }
      }

      // 3. جلب المنتجات لاختيار الصنف
      if (electron.listProducts) {
        const prodRes = await electron.listProducts({ limit: 100 });
        if (prodRes?.success && Array.isArray(prodRes.data)) {
          setProductsList(prodRes.data);
          if (prodRes.data.length > 0 && prodRes.data[0].variants?.length > 0) {
            setSelectedVariantId(prodRes.data[0].variants[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      toastError('تعذر تحميل بيانات المشتريات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPurchases = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPayableToSuppliers = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

  // تسجيل مورد جديد
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      sounds.playError();
      toastError('يرجى إدخال اسم المورد');
      return;
    }

    try {
      const electron = (window as any).electron;
      const res = await electron.createSupplier({
        data: {
          name: newSupplierName.trim(),
          phone: newSupplierPhone.trim() || undefined,
          address: newSupplierAddress.trim() || undefined,
          initial_balance: 0,
        },
        userId: 1,
      });

      if (res?.success) {
        sounds.playSaleSuccess();
        toastSuccess('تمت إضافة المورد بنجاح');
        setIsSupplierModalOpen(false);
        setNewSupplierName('');
        setNewSupplierPhone('');
        setNewSupplierAddress('');
        fetchData();
      } else {
        throw new Error(res?.error || 'فشل حفظ المورد');
      }
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'حدث خطأ أثناء حفظ المورد');
    }
  };

  // تسجيل فاتورة مشتريات
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(costPriceStr);
    const qty = parseInt(qtyStr, 10);

    if (!selectedSupplierId || !selectedVariantId || isNaN(cost) || isNaN(qty) || cost <= 0 || qty <= 0) {
      sounds.playError();
      toastError('يرجى تحديد المورد والصنف وإدخال التكلفة والكمية بشكل صحيح');
      return;
    }

    const costPiasters = Math.round(cost * 100);
    const totalPiasters = costPiasters * qty;
    const paidPiasters = paymentMethod === 'credit' ? 0 : paidStr ? Math.round(parseFloat(paidStr) * 100) : totalPiasters;

    try {
      const electron = (window as any).electron;
      const res = await electron.createPurchaseInvoice({
        supplier_id: Number(selectedSupplierId),
        invoice_no: invoiceNumber.trim() || undefined,
        items: [
          {
            variant_id: Number(selectedVariantId),
            qty,
            unit_cost: costPiasters,
            expiry_date: expiryDate.trim() || undefined,
          },
        ],
        paid: paidPiasters,
        payment_method: paymentMethod,
        user_id: 1,
      });

      if (res?.success) {
        sounds.playSaleSuccess();
        toastSuccess(MESSAGES.PURCHASE_SAVED);
        setIsInvoiceModalOpen(false);
        setInvoiceNumber('');
        setCostPriceStr('');
        setPaidStr('');
        fetchData();
      } else {
        throw new Error(res?.error || 'فشل حفظ فاتورة المشتريات');
      }
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'حدث خطأ أثناء حفظ الفاتورة');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_no?.toLowerCase().includes(q) ||
      inv.supplier_name?.toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.phone?.includes(q);
  });

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
            variant="secondary"
            onClick={() => fetchData()}
            disabled={isLoading}
            style={{ height: 42, padding: '0 14px' }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>

          {activeTab === 'suppliers' ? (
            <Button
              variant="primary"
              onClick={() => {
                sounds.playClick();
                setIsSupplierModalOpen(true);
              }}
              style={{ height: 42, padding: '0 18px' }}
            >
              <Plus size={16} />
              <span>إضافة مورد جديد</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                sounds.playClick();
                if (suppliers.length === 0) {
                  setIsSupplierModalOpen(true);
                  toastError('يرجى إضافة مورد أولاً قبل إنشاء فاتورة شراء');
                } else {
                  setIsInvoiceModalOpen(true);
                }
              }}
              style={{ height: 42, padding: '0 18px' }}
            >
              <Plus size={16} />
              <span>تسجيل فاتورة شراء</span>
            </Button>
          )}
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
            {filteredInvoices.length === 0 ? (
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
                <Truck size={42} opacity={0.4} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>لا توجد فواتير مشتريات مسجلة بعد</div>
                <div style={{ fontSize: 12 }}>
                  يمكنك تسجيل فواتير المشتريات لتوريد وتحديث كميات المخزون وتواريخ الصلاحية
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                    <th style={{ width: '6%', padding: '12px 16px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '18%', padding: '12px 16px' }}>رقم الفاتورة</th>
                    <th style={{ width: '26%', padding: '12px 16px' }}>المورد</th>
                    <th style={{ width: '16%', padding: '12px 16px' }}>تاريخ الاستلام</th>
                    <th style={{ width: '16%', padding: '12px 16px', textAlign: 'left' }}>إجمالي الفاتورة</th>
                    <th style={{ width: '18%', padding: '12px 16px', textAlign: 'center' }}>حالة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, idx) => (
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
                          {inv.invoice_no || `PUR-#${inv.id}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                        {inv.supplier_name || 'مورد عام'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                        {inv.created_at?.slice(0, 10)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 14 }}>
                        {formatMoney(inv.total)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {inv.paid >= inv.total ? (
                          <span className="badge badge-success">مسددة بالكامل ✓</span>
                        ) : inv.paid > 0 ? (
                          <span className="badge badge-warn">سداد جزئي</span>
                        ) : (
                          <span className="badge badge-danger">آجلة غير مسددة</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredSuppliers.length === 0 ? (
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
                <Users size={42} opacity={0.4} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>لا يوجد موردون مسجلون بعد</div>
                <div style={{ fontSize: 12 }}>
                  اضغط على "إضافة مورد جديد" لإضافة أول شركة توريد إلى النظام
                </div>
              </div>
            ) : (
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
                  {filteredSuppliers.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace' }}>
                        {s.phone || '---'}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 700,
                          fontSize: 14,
                          color: (s.balance || 0) > 0 ? '#962B34' : '#21633D',
                        }}
                      >
                        {formatMoney(s.balance || 0)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {(s.balance || 0) <= 0 ? (
                          <span className="badge badge-success">حساب خالص ✓</span>
                        ) : (
                          <span className="badge badge-warn">مستحق السداد</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* نافذة تسجيل فاتورة شراء جديدة */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="تسجيل فاتورة شراء وتوريد مخزون"
        icon={<GlassIcon icon={Truck} size="sm" variant="info" />}
        width={560}
      >
        <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                المورد *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="in"
                style={{ height: 44, width: '100%' }}
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                رقم فاتورة الشراء (اختياري)
              </label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="مثال: INV-9840"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              الصنف المورد *
            </label>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(Number(e.target.value))}
              className="in"
              style={{ height: 44, width: '100%' }}
              required
            >
              {productsList.map((p) =>
                p.variants?.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {p.name_ar} {v.name ? `(${v.name})` : ''} - {v.primary_barcode || v.barcodes?.[0] || ''}
                  </option>
                ))
              )}
            </select>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                تاريخ انتهاء الصلاحية للتشغيلة (FEFO)
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                طريقة الدفع للمورد
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="in"
                style={{ height: 44, width: '100%' }}
              >
                <option value="cash">نقداً (كاش مسدد بالكامل)</option>
                <option value="credit">آجل على الحساب (غير مسدد)</option>
                <option value="card">تحويل بنكي / بطاقة</option>
              </select>
            </div>
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

      {/* نافذة إضافة مورد جديد */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title="إضافة مورد / شركة توريد جديدة"
        icon={<GlassIcon icon={Users} size="sm" variant="primary" />}
        width={460}
      >
        <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              اسم المورد أو الشركة *
            </label>
            <Input
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="مثال: شركة النقاء لمستحضرات التجميل"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              رقم الهاتف للتواصل
            </label>
            <Input
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
              placeholder="010XXXXXXXX"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              العنوان / المستودع
            </label>
            <Input
              value={newSupplierAddress}
              onChange={(e) => setNewSupplierAddress(e.target.value)}
              placeholder="المنطقة الصناعية، 6 أكتوبر"
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Button type="submit" variant="primary" style={{ flex: 1, height: 44 }}>
              <CheckCircle2 size={16} />
              <span>حفظ المورد</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                sounds.playClick();
                setIsSupplierModalOpen(false);
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
