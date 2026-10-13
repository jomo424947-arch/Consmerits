import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Coins,
  CreditCard,
  ShoppingBag,
  Award,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { GlassIcon } from '../../components/common/GlassIcon';
import { formatMoney } from '../../../shared/utils/money';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';

interface TopProduct {
  name: string;
  category: string;
  soldQty: number;
  totalRevenue: number;
}

export function ReportsScreen(): React.ReactElement {
  const { success: toastSuccess } = useToast();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  // إحصائيات تقرير اليوم
  const stats = {
    totalSales: 1845000, // 18,450.00 ج.م
    invoiceCount: 42,
    avgTicket: 43928, // 439.28 ج.م
    totalProfit: 625000, // 6,250.00 ج.م
    cashSales: 1120000,
    cardSales: 725000,
    discountsGiven: 48000,
  };

  const topProducts: TopProduct[] = [
    { name: 'أحمر شفاه مخملي ميني', category: 'مكياج', soldQty: 26, totalRevenue: 325000 },
    { name: 'سيروم حمض الهيالورونيك 30مل', category: 'عناية بالبشرة', soldQty: 18, totalRevenue: 450000 },
    { name: 'ماسكارا لاش برنسيس المقاومة للماء', category: 'عيون', soldQty: 15, totalRevenue: 142500 },
    { name: 'كريم مرطب غني للبشرة', category: 'عناية بالبشرة', soldQty: 12, totalRevenue: 240000 },
    { name: 'بودرة تثبيت شفافة خفيفة', category: 'مكياج', soldQty: 9, totalRevenue: 135000 },
  ];

  const handleExportExcel = () => {
    sounds.playSaleSuccess();
    toastSuccess('تم تصدير تقرير المبيعات والإحصائيات بنجاح إلى ملف Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* شريط اختيار الفترة والتصدير */}
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
              setPeriod('today');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: period === 'today' ? '#FFFFFF' : 'transparent',
              fontWeight: period === 'today' ? 700 : 500,
              color: period === 'today' ? 'var(--color-brand-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            تقرير اليوم
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setPeriod('week');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: period === 'week' ? '#FFFFFF' : 'transparent',
              fontWeight: period === 'week' ? 700 : 500,
              color: period === 'week' ? 'var(--color-brand-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            هذا الأسبوع
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setPeriod('month');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: period === 'month' ? '#FFFFFF' : 'transparent',
              fontWeight: period === 'month' ? 700 : 500,
              color: period === 'month' ? 'var(--color-brand-deep)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            هذا الشهر
          </button>
        </div>

        <Button
          variant="secondary"
          onClick={handleExportExcel}
          style={{ height: 42, padding: '0 18px' }}
        >
          <FileSpreadsheet size={16} color="#21633D" />
          <span>تصدير التقرير إلى Excel</span>
        </Button>
      </div>

      {/* بطاقات المؤشرات المالية الرئيسية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={TrendingUp} size="lg" variant="brand" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المبيعات</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {formatMoney(stats.totalSales)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={ShoppingBag} size="lg" variant="primary" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>عدد الفواتير الصادرة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {stats.invoiceCount} فاتورة
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={Sparkles} size="lg" variant="success" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>صافي الربح التقديري</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#21633D' }}>
              {formatMoney(stats.totalProfit)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={Coins} size="lg" variant="gold" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>متوسط الفاتورة للعميل</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#A87910' }}>
              {formatMoney(stats.avgTicket)}
            </div>
          </div>
        </div>
      </div>

      {/* قسم توزيع وسائل الدفع + المنتجات الأكثر مبيعاً */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18, flex: 1, minHeight: 0 }}>
        {/* توزيع طرق الدفع */}
        <div
          className="glass-card"
          style={{
            padding: 20,
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GlassIcon icon={Coins} size="sm" variant="gold" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand-deep)', margin: 0 }}>
              توزيع وسائل الدفع
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: '#FAFBF9',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Coins size={18} color="var(--color-primary)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>الدفع النقدي (كاش)</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-brand-deep)' }}>
                {formatMoney(stats.cashSales)}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: '#FAFBF9',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={18} color="var(--color-brand-deep)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>البطاقات والفيزا (شبكة)</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-brand-deep)' }}>
                {formatMoney(stats.cardSales)}
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: 'rgba(246, 235, 211, 0.4)',
                border: '1px solid rgba(122, 90, 18, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, color: '#7A5A12', fontWeight: 600 }}>
                إجمالي الخصومات الممنوحة
              </span>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#7A5A12' }}>
                {formatMoney(stats.discountsGiven)}
              </span>
            </div>
          </div>
        </div>

        {/* المنتجات الأكثر مبيعاً */}
        <div
          className="glass-card"
          style={{
            padding: 0,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#FAFBF9',
            }}
          >
            <GlassIcon icon={Award} size="sm" variant="gold" glow />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand-deep)', margin: 0 }}>
              أكثر المنتجات مبيعاً وطلباً (Top Sellers)
            </h3>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                  <th style={{ width: '8%', padding: '12px 16px', textAlign: 'center' }}>الترتيب</th>
                  <th style={{ width: '42%', padding: '12px 16px' }}>اسم المنتج</th>
                  <th style={{ width: '20%', padding: '12px 16px' }}>القسم</th>
                  <th style={{ width: '15%', padding: '12px 16px', textAlign: 'center' }}>الكمية المباعة</th>
                  <th style={{ width: '15%', padding: '12px 16px', textAlign: 'left' }}>الإيراد المحقق</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: idx === 0 ? '#C59B27' : idx === 1 ? '#9E9E9E' : '#A0A6A2',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      <span className="badge badge-neutral">{p.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>
                      {p.soldQty} قطعة
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#21633D' }}>
                      {formatMoney(p.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsScreen;
