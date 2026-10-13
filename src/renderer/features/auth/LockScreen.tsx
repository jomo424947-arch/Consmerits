import React, { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { GlassIcon } from '../../components/common/GlassIcon';
import { SafeUser } from '../../../shared/types/users.types';
import { ROLE_LABELS } from '../../../shared/constants/roles';
import { sounds } from '../../lib/sounds';

interface LockScreenProps {
  currentUser: SafeUser;
  onUnlock: () => void;
  onSwitchUser: () => void;
}

export function LockScreen({ currentUser, onUnlock, onSwitchUser }: LockScreenProps): React.ReactElement {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // ساعة حية في شاشة القفل
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const dateStr = now.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      setCurrentTime(`${timeStr} • ${dateStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // دعم لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        sounds.playClick();
        setPin((prev) => (prev.length < 6 ? prev + e.key : prev));
        setError(null);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        sounds.playClick();
        setPin((prev) => prev.slice(0, -1));
        setError(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const triggerError = (msg: string) => {
    sounds.playError();
    setError(msg);
    setIsShaking(true);
    setPin('');
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleDigit = (digit: string) => {
    sounds.playClick();
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    sounds.playClick();
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    sounds.playClick();
    setPin('');
    setError(null);
  };

  const handleUnlock = async () => {
    if (!pin) {
      triggerError('يرجى إدخال رمز PIN لفتح القفل');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const electron = (window as any).electron;
      if (!electron?.loginWithPin) {
        sounds.playSaleSuccess();
        onUnlock();
        return;
      }

      const res = await electron.loginWithPin(pin);
      if (res?.success && (res.user?.id === currentUser.id || res.user)) {
        sounds.playSaleSuccess();
        await electron.unlockScreen?.();
        onUnlock();
      } else {
        triggerError('رمز PIN غير صحيح');
      }
    } catch (err: any) {
      triggerError(err.message || 'خطأ أثناء فتح القفل');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at 50% 30%, rgba(47, 74, 62, 0.94) 0%, rgba(20, 32, 26, 0.97) 100%)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        color: '#FFFFFF',
        userSelect: 'none',
        padding: 20,
      }}
    >
      <div
        className={isShaking ? 'animate-shake' : 'animate-scale-in'}
        style={{
          width: '100%',
          maxWidth: 390,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* ساعة القفل */}
        <div style={{ fontSize: 13, color: '#E3EAE5', fontWeight: 500, letterSpacing: '0.2px' }}>
          {currentTime}
        </div>

        {/* Lock Icon */}
        <GlassIcon icon={Lock} size="xl" variant="gold" glow />

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#FFFFFF' }}>
            الشاشة مقفلة للحماية
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255, 255, 255, 0.65)' }}>
            أدخل رمز PIN لاستئناف العمل بالوردية
          </p>
        </div>

        {/* User Card */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GlassIcon icon={User} size="xs" variant="primary" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{currentUser.display_name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onSwitchUser();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: '#F4E8C1',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <ArrowLeftRight size={13} />
            <span>تبديل المستخدم</span>
          </button>
        </div>

        {error && (
          <div
            className="animate-slide-up"
            style={{
              width: '100%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#FCA5A5',
              fontSize: 12,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Dots */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '4px 0',
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                backgroundColor: idx < pin.length ? '#E3EAE5' : 'rgba(255, 255, 255, 0.18)',
                boxShadow: idx < pin.length ? '0 0 10px rgba(227, 234, 229, 0.8)' : 'none',
                transform: idx < pin.length ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {/* Keypad */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              style={{
                height: 48,
                fontSize: 20,
                fontWeight: 600,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            style={{
              height: 48,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 10,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#F87171',
              cursor: 'pointer',
            }}
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              height: 48,
              fontSize: 20,
              fontWeight: 600,
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              height: 48,
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            ⌫
          </button>
        </div>

        <Button
          variant="primary"
          onClick={handleUnlock}
          disabled={isVerifying || pin.length < 4}
          isLoading={isVerifying}
          style={{
            width: '100%',
            height: 46,
            background: 'linear-gradient(135deg, #4F6B5E 0%, #355245 100%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: 15,
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          فتح الشاشة 🔓
        </Button>
      </div>
    </div>
  );
}

export default LockScreen;
