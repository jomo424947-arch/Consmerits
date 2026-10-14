import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  FolderOpen,
  FileText,
  Users,
  Phone,
  Receipt,
  Package,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { GlassIcon } from '../../components/common/GlassIcon';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/ToastContext';
import { sounds } from '../../lib/sounds';
import {
  DatabaseInspectionResult,
  BackupFileInfo,
  InspectorSale,
  InspectorContact,
  InspectorUser,
  InspectorProduct,
  InspectorShift,
  InspectorAuditLog,
} from '../../../shared/types/db-inspector.types';

type InspectorTab = 'overview' | 'users' | 'contacts' | 'sales' | 'products' | 'shifts' | 'audit';

export function DatabaseInspectorScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DatabaseInspectionResult | null>(null);
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'customer' | 'supplier' | 'debt'>('all');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<InspectorSale | null>(null);

  // جلب النسخ الاحتياطية المتوفرة تلقائياً عند فتح الشاشة
  useEffect(() => {
    fetchAvailableBackups();
    // تحميل تلقائي لقاعدة البيانات الحالية
    loadActiveDatabase();
  }, []);

  const fetchAvailableBackups = async () => {
    try {
      const electron = (window as any).electron;
      if (electron?.listInspectorBackups) {
        const res = await electron.listInspectorBackups();
        if (res?.success && Array.isArray(res.data)) {
          setBackups(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to list backups:', err);
    }
  };

  const loadActiveDatabase = async () => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      if (electron?.inspectDatabase) {
        const res = await electron.inspectDatabase();
        if (res?.success && res.data) {
          setData(res.data);
          sounds.playSaleSuccess();
          return;
        } else if (res?.error) {
          toastError(res.error);
        }
      }
    } catch (err: any) {
      toastError(err.message || 'فشل فحص قاعدة البيانات الحالية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = async () => {
    try {
      const electron = (window as any).electron;
      if (!electron?.selectDatabaseFile) {
        toastError('ميزة اختيار الملفات غير متوفرة في هذا المتصفح');
        return;
      }

      const res = await electron.selectDatabaseFile();
      if (res?.canceled) return;

      if (res?.success && res.filePath) {
        await inspectSpecificFile(res.filePath);
      } else if (res?.error) {
        toastError(res.error);
      }
    } catch (err: any) {
      toastError(err.message || 'حدث خطأ أثناء فتح نافذة الملفات');
    }
  };

  const inspectSpecificFile = async (filePath: string) => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      const res = await electron.inspectDatabase(filePath);
      if (res?.success && res.data) {
        setData(res.data);
        sounds.playSaleSuccess();
        toastSuccess(`تم فحص ملف: ${res.data.meta.fileName} بنجاح`);
      } else {
        sounds.playError();
        toastError(res?.error || 'فشل فحص الملف المحدد');
      }
    } catch (err: any) {
      sounds.playError();
      toastError(err.message || 'خطأ أثناء فحص الملف');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toastSuccess(`تم نسخ الرقم: ${phone}`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleExportJson = () => {
    if (!data) return;
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `database_audit_${data.meta.fileName.replace('.db', '')}_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      sounds.playSaleSuccess();
      toastSuccess('تم تصدير ملف التقرير الكامل بصيغة JSON بنجاح');
    } catch (err: any) {
      toastError('فشل تصدير التقرير: ' + err.message);
    }
  };

  // تصفية جهات الاتصال والأرقام
  const filteredContacts = useMemo(() => {
    if (!data) return [];
    return data.contacts.filter((c) => {
      const matchQuery =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchQuery) return false;

      if (contactFilter === 'customer') return c.type === 'عميل';
      if (contactFilter === 'supplier') return c.type === 'مورد';
      if (contactFilter === 'debt') return c.balanceEgp > 0;
      return true;
    });
  }, [data, searchQuery, contactFilter]);

  // تصفية العمليات
  const filteredSales = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.sales;
    const q = searchQuery.toLowerCase();
    return data.sales.filter(
      (s) =>
        s.invoiceNo.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.paymentMethod.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // تصفية المستخدمين
  const filteredUsers = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.users;
    const q = searchQuery.toLowerCase();
    return data.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.roleArabic.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // تصفية المنتجات
  const filteredProducts = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.products;
    const q = searchQuery.toLowerCase();
    return data.products.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
        p.barcodes.some((b) => b.includes(q))
    );
  }, [data, searchQuery]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 18,
        padding: '24px 32px',
        overflowY: 'auto',
        backgroundColor: '#F8FAFC',
        color: '#1E293B',
        direction: 'rtl',
      }}
    >
      {/* 1. ترويسة الصفحة وأزرار التحكم الرئيسية */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          backgroundColor: '#FFFFFF',
          padding: '20px 24px',
          borderRadius: 16,
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #FF6584 0%, #FF95A5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px -4px rgba(255, 101, 132, 0.35)',
              color: '#FFFFFF',
            }}
          >
            <Database size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
              مستكشف وفاحص قواعد البيانات SQLite
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
              رفع واستعراض محتويات أي ملف قاعدة بيانات أو نسخة احتياطية (.db) في وضع القراءة الآمن (المسجلين، الأرقام،
              والعمليات)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            onClick={handleSelectFile}
            disabled={isLoading}
            variant="primary"
            style={{
              background: 'linear-gradient(135deg, #FF6584 0%, #FF95A5 100%)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              boxShadow: '0 6px 14px -3px rgba(255, 101, 132, 0.35)',
            }}
          >
            <FolderOpen size={18} />
            <span>رفع / اختيار ملف قاعدة بيانات (.db)</span>
          </Button>

          <Button
            onClick={loadActiveDatabase}
            disabled={isLoading}
            variant="secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
            <span>فحص القاعدة النشطة الحالية</span>
          </Button>

          {data && (
            <Button
              onClick={handleExportJson}
              variant="secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 10,
                fontWeight: 600,
                borderColor: '#CBD5E1',
              }}
            >
              <Download size={17} />
              <span>تصدير تقرير JSON</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. شريط النسخ الاحتياطية المتوفرة للاختيار السريع */}
      {backups.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: '14px 20px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: '#334155',
              whiteSpace: 'nowrap',
            }}
          >
            <Layers size={17} color="#FF6584" />
            <span>نسخ احتياطية متوفرة:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflowX: 'auto' }}>
            {backups.slice(0, 5).map((b) => (
              <button
                key={b.filePath}
                onClick={() => inspectSpecificFile(b.filePath)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: data?.meta.filePath === b.filePath ? '1.5px solid #FF6584' : '1px solid #E2E8F0',
                  backgroundColor: data?.meta.filePath === b.filePath ? 'rgba(255, 101, 132, 0.08)' : '#F8FAFC',
                  color: data?.meta.filePath === b.filePath ? '#FF6584' : '#475569',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{b.fileName}</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>({b.fileSizeFormatted})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. بطاقة بيانات الملف المفحوص وحالة السلامة */}
      {data && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: '18px 24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: data.meta.integrityOk ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: data.meta.integrityOk ? '#16A34A' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {data.meta.integrityOk ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{data.meta.fileName}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: data.meta.integrityOk ? '#DCFCE7' : '#FEE2E2',
                    color: data.meta.integrityOk ? '#16A34A' : '#DC2626',
                  }}
                >
                  {data.meta.integrityMessage}
                </span>
                {data.meta.schemaVersion && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                    }}
                  >
                    مخطط V{data.meta.schemaVersion}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, wordBreak: 'break-all' }}>
                المسار: <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{data.meta.filePath}</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#475569' }}>
            <div>
              حجم الملف: <strong>{data.meta.fileSizeFormatted}</strong>
            </div>
            <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
            <div>
              المتجر: <strong>{data.meta.storeName || 'بوتيك جوري'}</strong>
            </div>
            {data.meta.storePhone && (
              <>
                <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
                <div>
                  هاتف المتجر: <strong>{data.meta.storePhone}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. بطاقات الإحصائيات الشاملة (KPIs Cards) */}
      {data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {/* المستخدمون المسجلون */}
          <div
            onClick={() => setActiveTab('users')}
            style={{
              backgroundColor: activeTab === 'users' ? '#FFF5F7' : '#FFFFFF',
              borderColor: activeTab === 'users' ? '#FF6584' : '#E2E8F0',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>المستخدمين المسجلين</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#FF6584', marginTop: 4 }}>
                {data.kpis.totalUsers}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 101, 132, 0.1)',
                color: '#FF6584',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
          </div>

          {/* دليل الأرقام والتواصل */}
          <div
            onClick={() => setActiveTab('contacts')}
            style={{
              backgroundColor: activeTab === 'contacts' ? '#F0FDF4' : '#FFFFFF',
              borderColor: activeTab === 'contacts' ? '#22C55E' : '#E2E8F0',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>الأرقام والتواصل</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>
                {data.contacts.length}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Phone size={22} />
            </div>
          </div>

          {/* فواتير وعمليات البيع */}
          <div
            onClick={() => setActiveTab('sales')}
            style={{
              backgroundColor: activeTab === 'sales' ? '#F0F9FF' : '#FFFFFF',
              borderColor: activeTab === 'sales' ? '#0284C7' : '#E2E8F0',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>عمليات وفواتير البيع</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0284C7', marginTop: 4 }}>
                {data.kpis.totalSalesCount}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={22} />
            </div>
          </div>

          {/* إجمالي الإيرادات */}
          <div
            onClick={() => setActiveTab('sales')}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>إجمالي المبيعات المحققة</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                {data.kpis.totalRevenueEgp.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500 }}>ج.م</span>
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={22} />
            </div>
          </div>

          {/* المنتجات المسجلة */}
          <div
            onClick={() => setActiveTab('products')}
            style={{
              backgroundColor: activeTab === 'products' ? '#FAF5FF' : '#FFFFFF',
              borderColor: activeTab === 'products' ? '#9333EA' : '#E2E8F0',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>المنتجات والأصناف</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#9333EA', marginTop: 4 }}>
                {data.kpis.totalProducts}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                color: '#9333EA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={22} />
            </div>
          </div>

          {/* الورديات */}
          <div
            onClick={() => setActiveTab('shifts')}
            style={{
              backgroundColor: activeTab === 'shifts' ? '#FFFBEB' : '#FFFFFF',
              borderColor: activeTab === 'shifts' ? '#F59E0B' : '#E2E8F0',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>الورديات والخزينة</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                {data.kpis.totalShifts}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={22} />
            </div>
          </div>

          {/* سجلات الرقابة والتدقيق */}
          <div
            onClick={() => setActiveTab('audit')}
            style={{
              backgroundColor: activeTab === 'audit' ? '#F1F5F9' : '#FFFFFF',
              borderColor: activeTab === 'audit' ? '#475569' : '#E2E8F0',
              borderWidth: 1.5,
              borderStyle: 'solid',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>سجلات الرقابة</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#475569', marginTop: 4 }}>
                {data.kpis.totalAuditLogs}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                backgroundColor: 'rgba(71, 85, 105, 0.1)',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={22} />
            </div>
          </div>
        </div>
      )}

      {/* 5. شريط التبويبات والبحث الشامل */}
      {data && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              borderBottom: '1px solid #F1F5F9',
              paddingBottom: 14,
            }}
          >
            {/* التبويبات */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: activeTab === 'overview' ? '#FF6584' : 'transparent',
                  color: activeTab === 'overview' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Database size={16} />
                <span>نظرة عامة</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: activeTab === 'users' ? '#FF6584' : 'transparent',
                  color: activeTab === 'users' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Users size={16} />
                <span>المستخدمين المسجلين ({data.users.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('contacts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: activeTab === 'contacts' ? '#FF6584' : 'transparent',
                  color: activeTab === 'contacts' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Phone size={16} />
                <span>دليل الأرقام والتواصل ({data.contacts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sales')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: activeTab === 'sales' ? '#FF6584' : 'transparent',
                  color: activeTab === 'sales' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Receipt size={16} />
                <span>فواتير العمليات ({data.sales.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: activeTab === 'products' ? '#FF6584' : 'transparent',
                  color: activeTab === 'products' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Package size={16} />
                <span>المنتجات والمخزون ({data.products.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('shifts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: activeTab === 'shifts' ? '#FF6584' : 'transparent',
                  color: activeTab === 'shifts' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Clock size={16} />
                <span>الورديات ({data.shifts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: activeTab === 'audit' ? '#FF6584' : 'transparent',
                  color: activeTab === 'audit' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <ShieldCheck size={16} />
                <span>سجل الرقابة ({data.auditLogs.length})</span>
              </button>
            </div>

            {/* حقل البحث السريع */}
            {activeTab !== 'overview' && (
              <div style={{ position: 'relative', width: 280 }}>
                <Search
                  size={17}
                  color="#94A3B8"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="بحث سريع في النتائج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    outline: 'none',
                    direction: 'rtl',
                  }}
                />
              </div>
            )}
          </div>

          {/* محتوى التبويب المختار */}
          <div>
            {/* 1. تبويب نظرة عامة */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  {/* ملخص المستخدمين الأحدث */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: 16,
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                        👥 المستخدمون المسجلون ({data.users.length})
                      </h3>
                      <button
                        onClick={() => setActiveTab('users')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FF6584',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        عرض الكل ←
                      </button>
                    </div>
                    {data.users.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>
                        لا يوجد مستخدمون مسجلون في هذه القاعدة
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.users.slice(0, 5).map((u) => (
                          <div
                            key={u.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: 8,
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: 13, color: '#0F172A' }}>{u.displayName}</strong>
                              <span style={{ fontSize: 12, color: '#64748B', marginRight: 6 }}>@{u.username}</span>
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 6,
                                backgroundColor:
                                  u.role === 'owner'
                                    ? '#FEF3C7'
                                    : u.role === 'manager'
                                    ? '#E0E7FF'
                                    : '#DCFCE7',
                                color:
                                  u.role === 'owner'
                                    ? '#B45309'
                                    : u.role === 'manager'
                                    ? '#4338CA'
                                    : '#15803D',
                              }}
                            >
                              {u.roleArabic}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ملخص الأرقام والتواصل */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: 16,
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                        📞 أحدث أرقام التواصل والعملاء ({data.contacts.length})
                      </h3>
                      <button
                        onClick={() => setActiveTab('contacts')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FF6584',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        عرض الكل ←
                      </button>
                    </div>
                    {data.contacts.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>
                        لا توجد أرقام مسجلة في هذه القاعدة
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.contacts.slice(0, 5).map((c) => (
                          <div
                            key={c.id + c.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: 8,
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: 13, color: '#0F172A' }}>{c.name}</strong>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: '#64748B',
                                  marginRight: 6,
                                  backgroundColor: '#F1F5F9',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {c.type}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', direction: 'ltr' }}>
                                {c.phone}
                              </span>
                              {c.phone && c.phone !== 'غير مسجل' && (
                                <button
                                  onClick={() => handleCopyPhone(c.phone)}
                                  title="نسخ الرقم"
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    color: copiedPhone === c.phone ? '#16A34A' : '#94A3B8',
                                    cursor: 'pointer',
                                    padding: 2,
                                  }}
                                >
                                  {copiedPhone === c.phone ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* أحدث العمليات والفواتير */}
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 16,
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                      🧾 أحدث فواتير البيع المسجلة
                    </h3>
                    <button
                      onClick={() => setActiveTab('sales')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FF6584',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      عرض جميع الفواتير ({data.sales.length}) ←
                    </button>
                  </div>
                  {data.sales.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>
                      لا توجد فواتير مبيعات مسجلة في قاعدة البيانات المحددة
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9', color: '#475569', textAlign: 'right' }}>
                            <th style={{ padding: '8px 12px' }}>رقم الفاتورة</th>
                            <th style={{ padding: '8px 12px' }}>التاريخ والوقت</th>
                            <th style={{ padding: '8px 12px' }}>الكاشير</th>
                            <th style={{ padding: '8px 12px' }}>العميل</th>
                            <th style={{ padding: '8px 12px' }}>طريقة الدفع</th>
                            <th style={{ padding: '8px 12px' }}>الصافي</th>
                            <th style={{ padding: '8px 12px' }}>الحالة</th>
                            <th style={{ padding: '8px 12px' }}>التفاصيل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.sales.slice(0, 5).map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>{s.invoiceNo}</td>
                              <td style={{ padding: '8px 12px', color: '#64748B' }}>
                                {new Date(s.createdAt).toLocaleString('ar-EG')}
                              </td>
                              <td style={{ padding: '8px 12px' }}>{s.cashierName}</td>
                              <td style={{ padding: '8px 12px' }}>{s.customerName || 'عميل نقدي'}</td>
                              <td style={{ padding: '8px 12px' }}>{s.paymentMethod}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#16A34A' }}>
                                {s.totalEgp.toFixed(2)} ج.م
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    backgroundColor: s.status === 'completed' ? '#DCFCE7' : '#FEE2E2',
                                    color: s.status === 'completed' ? '#16A34A' : '#DC2626',
                                    fontWeight: 700,
                                  }}
                                >
                                  {s.statusArabic}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <button
                                  onClick={() => setSelectedSale(s)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#FFFFFF',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  عرض الأصناف
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. تبويب المستخدمين المسجلين */}
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  قائمة بجميع حسابات الموظفين والمديرين المسجلين في قاعدة البيانات وأدوارهم:
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                        <th style={{ padding: '10px 14px' }}>#</th>
                        <th style={{ padding: '10px 14px' }}>الاسم الكامل</th>
                        <th style={{ padding: '10px 14px' }}>اسم المستخدم (Username)</th>
                        <th style={{ padding: '10px 14px' }}>الدور والصلاحية</th>
                        <th style={{ padding: '10px 14px' }}>رمز PIN سريع</th>
                        <th style={{ padding: '10px 14px' }}>حالة الحساب</th>
                        <th style={{ padding: '10px 14px' }}>تاريخ التسجيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                            لا توجد نتائج مطابقة لبحثك
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>{u.id}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{u.displayName}</td>
                            <td style={{ padding: '10px 14px', color: '#334155' }}>
                              <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                                @{u.username}
                              </code>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  backgroundColor:
                                    u.role === 'owner'
                                      ? '#FEF3C7'
                                      : u.role === 'manager'
                                      ? '#E0E7FF'
                                      : '#DCFCE7',
                                  color:
                                    u.role === 'owner'
                                      ? '#B45309'
                                      : u.role === 'manager'
                                      ? '#4338CA'
                                      : '#15803D',
                                }}
                              >
                                {u.roleArabic}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {u.hasPin ? (
                                <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 700 }}>✓ مسجل</span>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: u.isActive ? '#DCFCE7' : '#FEE2E2',
                                  color: u.isActive ? '#15803D' : '#B91C1C',
                                }}
                              >
                                {u.isActive ? 'حساب نشط' : 'معطل'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>
                              {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. تبويب دليل الأرقام والتواصل (العملاء والموردين) */}
            {activeTab === 'contacts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setContactFilter('all')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: 'none',
                        backgroundColor: contactFilter === 'all' ? '#0F172A' : '#F1F5F9',
                        color: contactFilter === 'all' ? '#FFFFFF' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      الكل ({data.contacts.length})
                    </button>
                    <button
                      onClick={() => setContactFilter('customer')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: 'none',
                        backgroundColor: contactFilter === 'customer' ? '#0284C7' : '#F1F5F9',
                        color: contactFilter === 'customer' ? '#FFFFFF' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      العملاء ({data.contacts.filter((c) => c.type === 'عميل').length})
                    </button>
                    <button
                      onClick={() => setContactFilter('supplier')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: 'none',
                        backgroundColor: contactFilter === 'supplier' ? '#7C3AED' : '#F1F5F9',
                        color: contactFilter === 'supplier' ? '#FFFFFF' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      الموردين ({data.contacts.filter((c) => c.type === 'مورد').length})
                    </button>
                    <button
                      onClick={() => setContactFilter('debt')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: 'none',
                        backgroundColor: contactFilter === 'debt' ? '#DC2626' : '#F1F5F9',
                        color: contactFilter === 'debt' ? '#FFFFFF' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      أصحاب المديونيات ({data.contacts.filter((c) => c.balanceEgp > 0).length})
                    </button>
                  </div>

                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    إجمالي النتائج المعروضة: <strong>{filteredContacts.length}</strong> رقم
                  </span>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                        <th style={{ padding: '10px 14px' }}>الاسم</th>
                        <th style={{ padding: '10px 14px' }}>رقم الهاتف</th>
                        <th style={{ padding: '10px 14px' }}>النوع</th>
                        <th style={{ padding: '10px 14px' }}>الرصيد / المديونية</th>
                        <th style={{ padding: '10px 14px' }}>العنوان / ملاحظات</th>
                        <th style={{ padding: '10px 14px' }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                            لا توجد جهات اتصال مطابقة لبحثك
                          </td>
                        </tr>
                      ) : (
                        filteredContacts.map((c) => (
                          <tr key={c.id + c.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{c.name}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontWeight: 700, color: '#0284C7', direction: 'ltr', display: 'inline-block' }}>
                                {c.phone}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  backgroundColor:
                                    c.type === 'عميل' ? '#E0F2FE' : c.type === 'مورد' ? '#EDE9FE' : '#FEF3C7',
                                  color:
                                    c.type === 'عميل' ? '#0369A1' : c.type === 'مورد' ? '#6D28D9' : '#B45309',
                                }}
                              >
                                {c.type}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {c.balanceEgp > 0 ? (
                                <span style={{ color: '#DC2626', fontWeight: 700 }}>
                                  عليه مديونية: {c.balanceEgp.toFixed(2)} ج.م
                                </span>
                              ) : c.balanceEgp < 0 ? (
                                <span style={{ color: '#16A34A', fontWeight: 700 }}>
                                  دائن له: {Math.abs(c.balanceEgp).toFixed(2)} ج.م
                                </span>
                              ) : (
                                <span style={{ color: '#64748B' }}>0.00 ج.م</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>
                              {c.address || c.notes || '—'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {c.phone && c.phone !== 'غير مسجل' && (
                                <button
                                  onClick={() => handleCopyPhone(c.phone)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#FFFFFF',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: copiedPhone === c.phone ? '#16A34A' : '#475569',
                                  }}
                                >
                                  {copiedPhone === c.phone ? <Check size={14} /> : <Copy size={14} />}
                                  <span>{copiedPhone === c.phone ? 'تم النسخ' : 'نسخ الرقم'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. تبويب العمليات والفواتير */}
            {activeTab === 'sales' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#64748B' }}>
                  <span>سجل كامل لجميع حركات وفواتير المبيعات المسجلة في القاعدة:</span>
                  <span>العدد: <strong>{filteredSales.length}</strong> فاتورة</span>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                        <th style={{ padding: '10px 14px' }}>رقم الفاتورة</th>
                        <th style={{ padding: '10px 14px' }}>التاريخ والوقت</th>
                        <th style={{ padding: '10px 14px' }}>الكاشير</th>
                        <th style={{ padding: '10px 14px' }}>العميل ورقم الهاتف</th>
                        <th style={{ padding: '10px 14px' }}>طريقة الدفع</th>
                        <th style={{ padding: '10px 14px' }}>الإجمالي</th>
                        <th style={{ padding: '10px 14px' }}>الخصم</th>
                        <th style={{ padding: '10px 14px' }}>الصافي المدفوع</th>
                        <th style={{ padding: '10px 14px' }}>الحالة</th>
                        <th style={{ padding: '10px 14px' }}>الأصناف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                            لا توجد فواتير مطابقة لبحثك
                          </td>
                        </tr>
                      ) : (
                        filteredSales.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>
                              {s.invoiceNo}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>
                              {new Date(s.createdAt).toLocaleString('ar-EG')}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{s.cashierName}</td>
                            <td style={{ padding: '10px 14px' }}>
                              {s.customerName ? (
                                <div>
                                  <strong>{s.customerName}</strong>
                                  {s.customerPhone && (
                                    <div style={{ fontSize: 11, color: '#0284C7', direction: 'ltr' }}>
                                      {s.customerPhone}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94A3B8' }}>عميل نقدي</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>{s.paymentMethod}</td>
                            <td style={{ padding: '10px 14px' }}>{s.subtotalEgp.toFixed(2)} ج.م</td>
                            <td style={{ padding: '10px 14px', color: s.discountEgp > 0 ? '#DC2626' : '#94A3B8' }}>
                              {s.discountEgp > 0 ? `-${s.discountEgp.toFixed(2)}` : '0.00'}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: '#16A34A', fontSize: 14 }}>
                              {s.totalEgp.toFixed(2)} ج.م
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  backgroundColor: s.status === 'completed' ? '#DCFCE7' : '#FEE2E2',
                                  color: s.status === 'completed' ? '#15803D' : '#B91C1C',
                                }}
                              >
                                {s.statusArabic}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <button
                                onClick={() => setSelectedSale(s)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  color: '#FF6584',
                                }}
                              >
                                عرض البنود ({s.itemsCount})
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. تبويب المنتجات والمخزون */}
            {activeTab === 'products' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#64748B' }}>
                  <span>كتالوج المنتجات والمخزون والأسعار المسجلة في القاعدة:</span>
                  <span>العدد: <strong>{filteredProducts.length}</strong> منتج</span>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                        <th style={{ padding: '10px 14px' }}>#</th>
                        <th style={{ padding: '10px 14px' }}>اسم المنتج</th>
                        <th style={{ padding: '10px 14px' }}>التصنيف والماركة</th>
                        <th style={{ padding: '10px 14px' }}>الباركود</th>
                        <th style={{ padding: '10px 14px' }}>سعر البيع</th>
                        <th style={{ padding: '10px 14px' }}>تكلفة الشراء</th>
                        <th style={{ padding: '10px 14px' }}>الرصيد المتبقي</th>
                        <th style={{ padding: '10px 14px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                            لا توجد منتجات مطابقة للبحث
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.id}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{p.nameAr}</td>
                            <td style={{ padding: '10px 14px', color: '#475569' }}>
                              {p.categoryName || 'عام'} {p.brandName && `• ${p.brandName}`}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {p.barcodes.length > 0 ? (
                                <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                                  {p.barcodes[0]}
                                </code>
                              ) : (
                                <span style={{ color: '#94A3B8' }}>بدون باركود</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0284C7' }}>
                              {p.salePriceEgp.toFixed(2)} ج.م
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>
                              {p.unitCostEgp > 0 ? `${p.unitCostEgp.toFixed(2)} ج.م` : '—'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: p.currentStock > 5 ? '#16A34A' : p.currentStock > 0 ? '#D97706' : '#DC2626',
                                }}
                              >
                                {p.currentStock} {p.unit}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: p.isActive ? '#DCFCE7' : '#F1F5F9',
                                  color: p.isActive ? '#15803D' : '#64748B',
                                }}
                              >
                                {p.isActive ? 'نشط للبيع' : 'مؤرشف'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. تبويب الورديات والخزينة */}
            {activeTab === 'shifts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  سجل ورديات الكاشير وحركة الإيداع والإغلاق والعجز/الزيادة:
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                        <th style={{ padding: '10px 14px' }}># الوردية</th>
                        <th style={{ padding: '10px 14px' }}>الكاشير المسؤول</th>
                        <th style={{ padding: '10px 14px' }}>وقت الفتح</th>
                        <th style={{ padding: '10px 14px' }}>وقت الإغلاق</th>
                        <th style={{ padding: '10px 14px' }}>رصيد البداية</th>
                        <th style={{ padding: '10px 14px' }}>المتوقع</th>
                        <th style={{ padding: '10px 14px' }}>الفعلي (الإغلاق)</th>
                        <th style={{ padding: '10px 14px' }}>الفارق (عجز/زيادة)</th>
                        <th style={{ padding: '10px 14px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.shifts.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                            لا توجد ورديات مسجلة
                          </td>
                        </tr>
                      ) : (
                        data.shifts.map((sh) => (
                          <tr key={sh.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>#{sh.id}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{sh.cashierName}</td>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>
                              {new Date(sh.openedAt).toLocaleString('ar-EG')}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>
                              {sh.closedAt ? new Date(sh.closedAt).toLocaleString('ar-EG') : '—'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>{sh.openingBalanceEgp.toFixed(2)} ج.م</td>
                            <td style={{ padding: '10px 14px' }}>
                              {sh.expectedBalanceEgp !== undefined ? `${sh.expectedBalanceEgp.toFixed(2)} ج.م` : '—'}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                              {sh.closingBalanceEgp !== undefined ? `${sh.closingBalanceEgp.toFixed(2)} ج.م` : '—'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {sh.differenceEgp !== undefined ? (
                                sh.differenceEgp === 0 ? (
                                  <span style={{ color: '#16A34A', fontWeight: 700 }}>متطابق (0)</span>
                                ) : sh.differenceEgp > 0 ? (
                                  <span style={{ color: '#16A34A', fontWeight: 700 }}>
                                    +{sh.differenceEgp.toFixed(2)} زيادة
                                  </span>
                                ) : (
                                  <span style={{ color: '#DC2626', fontWeight: 700 }}>
                                    {sh.differenceEgp.toFixed(2)} عجز
                                  </span>
                                )
                              ) : (
                                '—'
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: sh.status === 'open' ? '#FEF3C7' : '#F1F5F9',
                                  color: sh.status === 'open' ? '#B45309' : '#475569',
                                }}
                              >
                                {sh.statusArabic}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. تبويب سجل التدقيق والرقابة */}
            {activeTab === 'audit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  سجل غير قابل للتعديل يوثق جميع الحركات والأحداث الأمنية التي تمت على هذا النظام:
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>
                        <th style={{ padding: '10px 14px' }}>التاريخ والوقت</th>
                        <th style={{ padding: '10px 14px' }}>المستخدم الفاعل</th>
                        <th style={{ padding: '10px 14px' }}>نوع العملية</th>
                        <th style={{ padding: '10px 14px' }}>الكيان المرتبط</th>
                        <th style={{ padding: '10px 14px' }}>التفاصيل الموثقة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>
                            لا توجد سجلات تدقيق
                          </td>
                        </tr>
                      ) : (
                        data.auditLogs.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px', color: '#64748B' }}>
                              {new Date(a.createdAt).toLocaleString('ar-EG')}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{a.userName}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: '#FF6584',
                                }}
                              >
                                {a.actionArabic}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#475569' }}>
                              {a.entityType} {a.entityId && `#${a.entityId}`}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748B', maxWidth: 350 }}>
                              <pre
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'monospace',
                                  backgroundColor: '#F8FAFC',
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                {typeof a.details === 'object' ? JSON.stringify(a.details) : a.details || '—'}
                              </pre>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة تفاصيل بنود الفاتورة المحددة */}
      {selectedSale && (
        <Modal
          isOpen={Boolean(selectedSale)}
          onClose={() => setSelectedSale(null)}
          title={`تفاصيل الفاتورة: ${selectedSale.invoiceNo}`}
          width={680}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                backgroundColor: '#F8FAFC',
                padding: 14,
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              <div>
                الكاشير: <strong>{selectedSale.cashierName}</strong>
              </div>
              <div>
                العميل: <strong>{selectedSale.customerName || 'عميل نقدي'}</strong>
              </div>
              <div>
                طريقة الدفع: <strong>{selectedSale.paymentMethod}</strong>
              </div>
              <div>
                التاريخ: <strong>{new Date(selectedSale.createdAt).toLocaleString('ar-EG')}</strong>
              </div>
              <div>
                الإجمالي قبل الخصم: <strong>{selectedSale.subtotalEgp.toFixed(2)} ج.م</strong>
              </div>
              <div>
                الصافي النهائي: <strong style={{ color: '#16A34A' }}>{selectedSale.totalEgp.toFixed(2)} ج.م</strong>
              </div>
            </div>

            <h4 style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 700 }}>بنود ومنتجات الفاتورة:</h4>
            {selectedSale.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 13 }}>
                لا توجد بنود مفصلة لهذه الفاتورة
              </div>
            ) : (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', textAlign: 'right' }}>
                      <th style={{ padding: '8px 12px' }}>اسم المنتج</th>
                      <th style={{ padding: '8px 12px' }}>الدرجة / الحجم</th>
                      <th style={{ padding: '8px 12px' }}>الكمية</th>
                      <th style={{ padding: '8px 12px' }}>سعر القطعة</th>
                      <th style={{ padding: '8px 12px' }}>إجمالي السطر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.productName}</td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>{it.variantName || '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{it.qty}</td>
                        <td style={{ padding: '8px 12px' }}>{it.unitPriceEgp.toFixed(2)} ج.م</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#16A34A' }}>
                          {it.lineTotalEgp.toFixed(2)} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <Button onClick={() => setSelectedSale(null)} variant="secondary">
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default DatabaseInspectorScreen;
