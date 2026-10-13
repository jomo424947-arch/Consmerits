import React, { useState, useEffect } from 'react';
import {
  Package,
  Calendar,
  AlertTriangle,
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { GlassIcon } from '../../components/common/GlassIcon';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';

interface BatchRow {
  id: number;
  productName: string;
  variantName?: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  qty: number;
  daysRemaining: number;
}

interface MovementRow {
  id: number;
  productName: string;
  type: string;
  qtyChange: number;
  reason?: string;
  date: string;
  actor: string;
}

export function InventoryScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'batches' | 'movements'>('batches');
  const [searchQuery, setSearchQuery] = useState('');
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInventoryData = async () => {
    setIsLoading(true);
    try {
      const electron = (window as any).electron;
      if (!electron) return;

      // 1. جلب الدفعات الحقيقية
      if (electron.getExpiringBatches) {
        const res = await electron.getExpiringBatches(3650); // جلب دفعات حتى 10 سنوات
        if (res?.success && Array.isArray(res.data)) {
          const mapped: BatchRow[] = res.data.map((b: any) => ({
            id: b.batch_id || b.id,
            productName: b.product_name || 'مستحضر تجميل',
            variantName: b.variant_name,
            barcode: b.barcode || '---',
            batchNumber: b.batch_no || `BATCH-${b.id}`,
            expiryDate: b.expiry_date || 'غير محدد',
            qty: b.qty_remaining ?? b.quantity_remaining ?? 0,
            daysRemaining: b.days_remaining ?? (
              b.expiry_date
                ? Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24))
                : 9999
            ),
          }));
          setBatches(mapped);
        } else {
          setBatches([]);
        }
      }

      // 2. جلب حركات المخزون الحقيقية
      if (electron.getStockMovements) {
        const movRes = await electron.getStockMovements({ limit: 100 });
        if (movRes?.success && movRes.data?.movements) {
          const mappedMovs: MovementRow[] = movRes.data.movements.map((m: any) => {
            let typeLabel = m.type;
            if (m.type === 'adjust_in') typeLabel = 'رصيد افتتاحي / تسوية';
            else if (m.type === 'sale') typeLabel = 'مبيعات كاشير';
            else if (m.type === 'purchase') typeLabel = 'توريد مشتريات';
            else if (m.type === 'sale_return') typeLabel = 'مرتجع مبيعات';
            else if (m.type === 'purchase_return') typeLabel = 'مرتجع مورد';
            else if (m.type === 'adjust_out') typeLabel = 'تسوية عجز';
            else if (m.type === 'expired') typeLabel = 'إهلاك منتهي';
            else if (m.type === 'tester') typeLabel = 'تستر وعينات';

            return {
              id: m.id,
              productName: m.product_name || 'صنف',
              type: typeLabel,
              qtyChange: m.qty,
              reason: m.note || '---',
              date: m.created_at || '---',
              actor: m.username || 'المستخدم',
            };
          });
          setMovements(mappedMovs);
        } else {
          setMovements([]);
        }
      }
    } catch (err: any) {
      toastError(err.message || 'تعذر جلب بيانات المخزون');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const expiringNearCount = batches.filter((b) => b.daysRemaining <= 45 && b.daysRemaining > 0).length;
  const expiredCount = batches.filter((b) => b.daysRemaining <= 0).length;
  const validCount = batches.filter((b) => b.daysRemaining > 45).length;

  const filteredBatches = batches.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.productName.toLowerCase().includes(q) || b.batchNumber.toLowerCase().includes(q);
  });

  const filteredMovements = movements.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.productName.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* بطاقات المؤشرات العلوية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <GlassIcon icon={Package} size="lg" variant="gold" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي التشغيلات المسجلة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {batches.length}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <GlassIcon icon={CheckCircle2} size="lg" variant="success" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>تشغيلات صالحة وبعيدة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#21633D' }}>
              {validCount}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <GlassIcon icon={AlertTriangle} size="lg" variant="gold" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>أوشكت على الانتهاء (&lt;45 يوم)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#A87910' }}>
              {expiringNearCount}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            backgroundColor: '#FFFFFF',
          }}
        >
          <GlassIcon icon={AlertCircle} size="lg" variant="danger" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>منتهية الصلاحية (ممنوع البيع)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#962B34' }}>
              {expiredCount}
            </div>
          </div>
        </div>
      </div>

      {/* شريط التبويبات الفرعية والبحث */}
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
              setActiveSubTab('batches');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeSubTab === 'batches' ? '#FFFFFF' : 'transparent',
              fontWeight: activeSubTab === 'batches' ? 700 : 500,
              color: activeSubTab === 'batches' ? 'var(--color-brand-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              boxShadow: activeSubTab === 'batches' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            التشغيلات والصلاحية (FEFO)
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveSubTab('movements');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeSubTab === 'movements' ? '#FFFFFF' : 'transparent',
              fontWeight: activeSubTab === 'movements' ? 700 : 500,
              color: activeSubTab === 'movements' ? 'var(--color-brand-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              boxShadow: activeSubTab === 'movements' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            سجل حركات المخزون
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 280 }}>
            <Input
              placeholder="بحث برقم التشغيلة أو اسم المنتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              fetchInventoryData();
              toastSuccess('تم تحديث بيانات المخزون');
            }}
            style={{ height: 40 }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>تحديث</span>
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
        {activeSubTab === 'batches' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredBatches.length === 0 ? (
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
                <Package size={42} opacity={0.4} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>لا توجد دفعات أو تشغيلات مخزون مسجلة بعد</div>
                <div style={{ fontSize: 12 }}>
                  عند إضافة منتجات برصيد مخزون أو توريد فواتير مشتريات، ستظهر تشغيلات FEFO هنا
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                    <th style={{ width: '6%', padding: '12px 16px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '16%', padding: '12px 16px' }}>رقم التشغيلة (Batch)</th>
                    <th style={{ width: '30%', padding: '12px 16px' }}>اسم المنتج / الصنف</th>
                    <th style={{ width: '16%', padding: '12px 16px' }}>تاريخ الصلاحية</th>
                    <th style={{ width: '14%', padding: '12px 16px', textAlign: 'center' }}>الكمية المتبقية</th>
                    <th style={{ width: '18%', padding: '12px 16px', textAlign: 'center' }}>حالة الصلاحية (FEFO)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((b, idx) => {
                    const isExp = b.daysRemaining <= 0;
                    const isNear = b.daysRemaining > 0 && b.daysRemaining <= 45;

                    return (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          backgroundColor: isExp ? 'rgba(251, 234, 235, 0.4)' : isNear ? 'rgba(246, 235, 211, 0.25)' : '#FFFFFF',
                        }}
                      >
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
                            {b.batchNumber}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-brand-deep)', fontSize: 14 }}>
                            {b.productName}
                          </div>
                          {b.variantName && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.variantName}</div>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <div style={{ fontWeight: 600 }}>{b.expiryDate}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {b.daysRemaining >= 9000
                              ? 'صلاحية مفتوحة'
                              : isExp
                              ? `منتهية منذ ${Math.abs(b.daysRemaining)} يوم`
                              : `متبقي ${b.daysRemaining} يوم`}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 14 }}>
                          {b.qty} قطعة
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {isExp ? (
                            <span className="badge badge-danger">منتهية الصلاحية ✕</span>
                          ) : isNear ? (
                            <span className="badge badge-warn">تنبيه: تنتهي قريباً !</span>
                          ) : (
                            <span className="badge badge-success">صالحة ونشطة ✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeSubTab === 'movements' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredMovements.length === 0 ? (
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
                <History size={42} opacity={0.4} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>لا توجد حركات مخزون مسجلة بعد</div>
                <div style={{ fontSize: 12 }}>
                  يتم تسجيل كل إضافة، مبيعات، أو تعديل في سجل تتبعي معتمد تلقائياً
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                    <th style={{ width: '6%', padding: '12px 16px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '18%', padding: '12px 16px' }}>التاريخ والوقت</th>
                    <th style={{ width: '28%', padding: '12px 16px' }}>المنتج</th>
                    <th style={{ width: '16%', padding: '12px 16px' }}>نوع الحركة</th>
                    <th style={{ width: '14%', padding: '12px 16px', textAlign: 'center' }}>الكمية</th>
                    <th style={{ width: '18%', padding: '12px 16px' }}>السبب / الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m, idx) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {m.date}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                        {m.productName}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className={`badge ${
                            m.qtyChange > 0 ? 'badge-success' : 'badge-neutral'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: 14,
                          color: m.qtyChange > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                      >
                        {m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {m.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryScreen;
