import React, { useState, useEffect, useRef } from 'react';
import { ToastProvider } from './components/common/ToastContext';
import { UserProvider } from './lib/UserContext';
import { MainLayout } from './components/layout/MainLayout';
import { PosScreen } from './features/pos';
import { ProductsScreen } from './features/products';
import { InventoryScreen } from './features/inventory';
import { PurchasesScreen } from './features/purchases';
import { ReturnsScreen } from './features/returns';
import { CashScreen } from './features/cash';
import { ReportsScreen } from './features/reports';
import { SettingsScreen } from './features/settings';
import { InvoicesScreen } from './features/invoices';
import { DatabaseInspectorScreen } from './features/db-inspector';
import { LoginPage, LockScreen, InitialSetupWizard } from './features/auth';
import { SafeUser } from '../shared/types/users.types';
import { Loader2 } from 'lucide-react';
import logoImg from './assets/logo.png';

export type NavTab =
  | 'pos'
  | 'invoices'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'returns'
  | 'cash'
  | 'reports'
  | 'settings'
  | 'db-inspector';

export function AppContent(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSetupCompleted, setIsSetupCompleted] = useState(true);

  const lastActivityReport = useRef(0);

  // فحص الجلسة الحالية وحالة تهيئة النظام عند الإقلاع
  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const electron = (window as any).electron;
        if (electron?.checkSetupStatus) {
          const setupRes = await electron.checkSetupStatus();
          if (setupRes && setupRes.success !== false) {
            setIsSetupCompleted(setupRes.isSetupCompleted);
          }
        }
        if (electron?.getCurrentUser) {
          const res = await electron.getCurrentUser();
          if (res?.success && res.data) {
            setCurrentUser(res.data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsInitializing(false);
      }
    };

    checkInitialSession();
  }, []);

  // الاستماع لأحداث القفل التلقائي من المعالج الرئيسي
  useEffect(() => {
    const electron = (window as any).electron;
    if (electron?.onLockStateChanged) {
      const cleanup = electron.onLockStateChanged((state: { isLocked: boolean }) => {
        setIsLocked(state.isLocked);
      });
      return cleanup;
    }
  }, []);

  // رصد نشاط المستخدم لإعادة ضبط مؤقت القفل التلقائي للخمول (Throttled كل 10 ثوانٍ)
  const reportActivity = () => {
    const now = Date.now();
    if (now - lastActivityReport.current > 10000) {
      lastActivityReport.current = now;
      const electron = (window as any).electron;
      electron?.reportActivity?.();
    }
  };

  const handleLogout = async () => {
    try {
      const electron = (window as any).electron;
      await electron?.logout?.();
    } finally {
      setCurrentUser(null);
      setIsLocked(false);
    }
  };

  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          height: '100vh',
          backgroundColor: '#FFFFFF',
          color: '#1A1F26',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'inherit',
          direction: 'rtl',
        }}
      >
        <div
          style={{
            width: 82,
            height: 82,
            borderRadius: '50%',
            padding: 2.5,
            background: 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)',
            boxShadow: '0 12px 28px -4px rgba(255, 112, 136, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <img
            src={logoImg}
            alt="Boutique Gouri Logo"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
        <Loader2 size={30} color="#FF7088" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: 700, color: '#111827' }}>جاري تهيئة وتشغيل نظام Boutique Gouri...</span>
      </div>
    );
  }

  // إذا لم يتم إعداد النظام لأول مرة، نعرض معالج الإعداد الأولي
  if (!isSetupCompleted) {
    return (
      <InitialSetupWizard
        onSetupComplete={(user) => {
          setCurrentUser(user);
          setIsSetupCompleted(true);
          setIsLocked(false);
        }}
      />
    );
  }

  // إذا لم يكن هناك مستخدم مسجل الدخول، نعرض شاشة تسجيل الدخول
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLocked(false);
        }}
      />
    );
  }

  return (
    <UserProvider
      value={{
        currentUser,
        setCurrentUser,
        logout: handleLogout,
        lockScreen: () => {
          const electron = (window as any).electron;
          electron?.lockScreen?.();
        },
      }}
    >
      <div
        onKeyDown={reportActivity}
        onClick={reportActivity}
        onMouseMove={reportActivity}
        style={{ height: '100%', width: '100%' }}
      >
        {/* شاشة القفل عند الخمول */}
        {isLocked && (
          <LockScreen
            currentUser={currentUser}
            onUnlock={() => setIsLocked(false)}
            onSwitchUser={handleLogout}
          />
        )}

        <MainLayout
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        >
          {activeTab === 'pos' && <PosScreen />}
          {activeTab === 'invoices' && <InvoicesScreen />}
          {activeTab === 'products' && <ProductsScreen />}
          {activeTab === 'inventory' && <InventoryScreen />}
          {activeTab === 'purchases' && <PurchasesScreen />}
          {activeTab === 'returns' && <ReturnsScreen />}
          {activeTab === 'cash' && <CashScreen />}
          {activeTab === 'reports' && <ReportsScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
          {activeTab === 'db-inspector' && <DatabaseInspectorScreen />}
        </MainLayout>
      </div>
    </UserProvider>
  );
}

export function App(): React.ReactElement {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
