import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Tag,
  Package,
  Truck,
  RotateCcw,
  Coins,
  BarChart3,
  Settings,
  Sparkles,
  Lock,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { NavTab } from '../../App';
import { ROLE_LABELS } from '../../../shared/constants/roles';
import { SafeUser } from '../../../shared/types/users.types';
import { GlassIcon, GlassIconVariant } from '../common/GlassIcon';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { sounds } from '../../lib/sounds';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser?: SafeUser | null;
  onLogout?: () => void;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  icon: typeof ShoppingCart;
  variant: GlassIconVariant;
  hotkey: string;
}

const navItems: NavItemDef[] = [
  { id: 'pos', label: 'شاشة البيع (POS)', icon: ShoppingCart, variant: 'brand', hotkey: 'F1' },
  { id: 'products', label: 'المنتجات والباركود', icon: Tag, variant: 'primary', hotkey: 'F2' },
  { id: 'inventory', label: 'المخزون والصلاحية', icon: Package, variant: 'gold', hotkey: 'F3' },
  { id: 'purchases', label: 'المشتريات والموردين', icon: Truck, variant: 'info', hotkey: 'F4' },
  { id: 'returns', label: 'المرتجعات والبدائل', icon: RotateCcw, variant: 'danger', hotkey: 'F5' },
  { id: 'cash', label: 'الخزنة والورديات', icon: Coins, variant: 'gold', hotkey: 'F6' },
  { id: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3, variant: 'brand', hotkey: 'F7' },
  { id: 'settings', label: 'الإعدادات والمستخدمين', icon: Settings, variant: 'neutral', hotkey: 'F8' },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  currentUser: propUser,
  onLogout,
}: SidebarProps): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(propUser || null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getIsMuted());

  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
      return;
    }
    const fetchUser = async () => {
      try {
        const electron = (window as any).electron;
        if (electron?.getCurrentUser) {
          const res = await electron.getCurrentUser();
          if (res?.success && res.data) {
            setCurrentUser(res.data);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchUser();
  }, [propUser]);

  const handleTabClick = (tabId: NavTab) => {
    sounds.playClick();
    onSelectTab(tabId);
  };

  const handleManualLock = async () => {
    sounds.playWarning();
    const electron = (window as any).electron;
    await electron?.lockScreen?.();
  };

  const handleConfirmLogout = async () => {
    sounds.playClick();
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    } else {
      const electron = (window as any).electron;
      await electron?.logout?.();
      window.location.reload();
    }
  };

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
    if (!next) {
      sounds.playClick();
    }
  };

  return (
    <>
      <aside
        className="glass-sidebar"
        style={{
          width: 250,
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          zIndex: 20,
          userSelect: 'none',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 18px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%)',
          }}
        >
          <GlassIcon icon={Sparkles} size="lg" variant="rose" glow />
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--color-brand-deep)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              كوزمتكس ستور
            </h2>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 500,
              }}
            >
              نظام نقاط البيع وإدارة التجميل
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            flex: 1,
            padding: '14px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflowY: 'auto',
          }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: isActive
                    ? '1px solid rgba(79, 107, 94, 0.25)'
                    : '1px solid transparent',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--color-brand-deep)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F4F6F4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <GlassIcon
                  icon={item.icon}
                  size="sm"
                  variant={item.variant}
                  active={isActive}
                />
                <span style={{ flex: 1 }}>{item.label}</span>
                <span
                  className="kbd-badge"
                  style={{
                    backgroundColor: isActive ? '#FFFFFF' : 'rgba(0, 0, 0, 0.05)',
                    color: isActive ? 'var(--color-brand-deep)' : 'var(--text-muted)',
                    borderColor: isActive ? 'rgba(79, 107, 94, 0.3)' : 'transparent',
                  }}
                >
                  {item.hotkey}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sound Toggle & System Tools Strip */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAF9',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>المؤثرات الصوتية</span>
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isMuted ? 'var(--color-danger)' : 'var(--color-primary)',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isMuted ? 'صامت' : 'مفعل'}</span>
          </button>
        </div>

        {/* User / Shift Footer & Security Actions */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: '#F8F9F8',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--color-brand-deep)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {currentUser?.display_name || 'كاشير المحل'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {currentUser ? ROLE_LABELS[currentUser.role] : 'مستخدم نشط'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleManualLock}
                title="قفل الشاشة فورياً لحماية المحل (F12)"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-input)',
                  borderRadius: 8,
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4A514D',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EAEFEA')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <Lock size={15} />
              </button>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                title="تسجيل الخروج"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #F5C6CB',
                  borderRadius: 8,
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-danger)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FBEAEB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* مودال تأكيد تسجيل الخروج */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="تأكيد تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟ سيتم إنهاء جلستك الحالية والعودة لشاشة الدخول."
        confirmLabel="تسجيل الخروج"
        cancelLabel="البقاء"
        isDangerous
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

export default Sidebar;
