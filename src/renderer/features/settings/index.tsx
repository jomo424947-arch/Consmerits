import React, { useState } from 'react';
import {
  Store,
  Users,
  HardDriveDownload,
  ShieldCheck,
  Save,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { GlassIcon, GlassIconVariant } from '../../components/common/GlassIcon';
import { UsersPage } from '../users/UsersPage';
import { BackupPage } from '../backup/BackupPage';
import { AuditLogPage } from '../audit/AuditLogPage';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';
import { MESSAGES } from '../../lib/messages';

type SettingsTab = 'store' | 'users' | 'backup' | 'audit';

interface TabDef {
  id: SettingsTab;
  label: string;
  icon: typeof Store;
  variant: GlassIconVariant;
}

const tabs: TabDef[] = [
  { id: 'store', label: 'بيانات المحل والترويسة', icon: Store, variant: 'brand' },
  { id: 'users', label: 'المستخدمون والصلاحيات', icon: Users, variant: 'primary' },
  { id: 'backup', label: 'النسخ الاحتياطي والأمان', icon: HardDriveDownload, variant: 'gold' },
  { id: 'audit', label: 'سجل التدقيق والرقابة', icon: ShieldCheck, variant: 'rose' },
];

export function SettingsScreen(): React.ReactElement {
  const { success: toastSuccess } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('store');

  // بيانات المحل
  const [storeName, setStoreName] = useState('محل مستحضرات التجميل والعطور');
  const [storeAddress, setStoreAddress] = useState('شارع التحرير، الدقي، الجيزة');
  const [storePhone, setStorePhone] = useState('01012345678');
  const [taxNumber, setTaxNumber] = useState('300-456-789');
  const [receiptFooter, setReceiptFooter] = useState('شكراً لزيارتكم - نتمنى لكم يوماً جميلاً');

  // سياسات الأمان
  const [autoLockMinutes, setAutoLockMinutes] = useState('5');
  const [maxFailedAttempts, setMaxFailedAttempts] = useState('5');
  const [lockoutDuration, setLockoutDuration] = useState('15');
  const [retentionDays, setRetentionDays] = useState('30');

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playSaleSuccess();
    toastSuccess('تم حفظ بيانات المتجر والترويسة بنجاح');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playSaleSuccess();
    toastSuccess('تم تحديث سياسات الأمان والقفل التلقائي بنجاح');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, direction: 'rtl', height: '100%' }}>
      {/* شريط التبويبات الفرعية الزجاجي */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          backgroundColor: '#FFFFFF',
          padding: 6,
          gap: 6,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                setActiveSubTab(tab.id);
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: isActive ? '1px solid rgba(79, 107, 94, 0.25)' : '1px solid transparent',
                borderRadius: 10,
                backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                color: isActive ? 'var(--color-brand-deep)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.18s ease',
              }}
            >
              <GlassIcon icon={tab.icon} size="xs" variant={tab.variant} active={isActive} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* محتوى الإعدادات */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {activeSubTab === 'store' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* بطاقة بيانات المتجر */}
            <form onSubmit={handleSaveStore}>
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <GlassIcon icon={Store} size="sm" variant="brand" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand-deep)', margin: 0 }}>
                    بيانات المتجر والترويسة للإيصالات
                  </h3>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    اسم المحل / العلامة التجارية
                  </label>
                  <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    العنوان المطبوع بالإيصال
                  </label>
                  <Input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      رقم الهاتف للتواصل
                    </label>
                    <Input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} required />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      الرقم الضريبي / السجل
                    </label>
                    <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    رسالة تذييل الإيصال الحراري
                  </label>
                  <Input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
                </div>

                <Button type="submit" variant="primary" style={{ height: 44, marginTop: 8 }}>
                  <Save size={16} />
                  <span>حفظ إعدادات المتجر</span>
                </Button>
              </div>
            </form>

            {/* بطاقة سياسات الأمان */}
            <form onSubmit={handleSaveSecurity}>
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <GlassIcon icon={Lock} size="sm" variant="gold" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand-deep)', margin: 0 }}>
                    سياسات الأمان والقفل التلقائي
                  </h3>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    مهلة القفل التلقائي للشاشة عند خمول الكاشير (بالدقائق)
                  </label>
                  <Input
                    type="number"
                    value={autoLockMinutes}
                    onChange={(e) => setAutoLockMinutes(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    الحد الأقصى لمحاولات تسجيل الدخول الفاشلة قبل التجميد
                  </label>
                  <Input
                    type="number"
                    value={maxFailedAttempts}
                    onChange={(e) => setMaxFailedAttempts(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    مدة تجميد الحساب عند تكرار إدخال PIN خاطئ (بالدقائق)
                  </label>
                  <Input
                    type="number"
                    value={lockoutDuration}
                    onChange={(e) => setLockoutDuration(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    مدة الاحتفاظ بالنسخ الاحتياطية وتدويرها تلقائياً (بالأيام)
                  </label>
                  <Input
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" variant="secondary" style={{ height: 44, marginTop: 8 }}>
                  <ShieldCheck size={16} />
                  <span>تحديث سياسات الأمان والحماية</span>
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeSubTab === 'users' && <UsersPage />}

        {activeSubTab === 'backup' && <BackupPage />}

        {activeSubTab === 'audit' && <AuditLogPage />}
      </div>
    </div>
  );
}

export default SettingsScreen;
