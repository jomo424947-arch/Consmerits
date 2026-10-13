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
import { LoginPage, LockScreen } from './features/auth';
import { SafeUser } from '../shared/types/users.types';
import { Loader2 } from 'lucide-react';

export type NavTab =
  | 'pos'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'returns'
  | 'cash'
  | 'reports'
  | 'settings';

export function AppContent(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const lastActivityReport = useRef(0);

  // فحص الجلسة الحالية عند الإقلاع
  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const electron = (window as any).electron;
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
          gap: 16,
          height: '100vh',
          backgroundColor: '#1B2B24',
          color: '#E3EAE5',
          fontSize: 16,
          fontFamily: 'inherit',
          direction: 'rtl',
        }}
      >
        <Loader2 size={36} color="#E3EAE5" style={{ animation: 'spin 1s linear infinite' }} />
        <span>جاري تهيئة وتشغيل نظام كوزمتكس ستور الآمن...</span>
      </div>
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
          {activeTab === 'products' && <ProductsScreen />}
          {activeTab === 'inventory' && <InventoryScreen />}
          {activeTab === 'purchases' && <PurchasesScreen />}
          {activeTab === 'returns' && <ReturnsScreen />}
          {activeTab === 'cash' && <CashScreen />}
          {activeTab === 'reports' && <ReportsScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
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
