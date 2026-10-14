import React, { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, ArrowLeftRight, Delete } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { GlassIcon } from '../../components/common/GlassIcon';
import { SafeUser } from '../../../shared/types/users.types';
import { ROLE_LABELS } from '../../../shared/constants/roles';
import { sounds } from '../../lib/sounds';
import logoImg from '../../assets/logo.png';

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
        if (pin.length < 4) {
          const nextPin = pin + e.key;
          setPin(nextPin);
          setError(null);
          if (nextPin.length === 4) {
            handleUnlock(nextPin);
          }
        }
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
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        handleUnlock(nextPin);
      }
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

  const handleUnlock = async (pinOverride?: string) => {
    const effectivePin = pinOverride || pin;
    if (!effectivePin || effectivePin.length !== 4) {
      triggerError('يرجى إدخال رمز PIN المكون من 4 أرقام');
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

      const res = await electron.loginWithPin(effectivePin);
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
        backgroundColor: '#FFFFFF',
        backgroundImage: `
          radial-gradient(circle at 85% 15%, rgba(255, 149, 165, 0.18) 0%, transparent 48%),
          radial-gradient(circle at 15% 85%, rgba(255, 149, 165, 0.08) 0%, transparent 50%),
          #FFFFFF
        `,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        color: '#111827',
        userSelect: 'none',
        padding: 20,
        fontFamily: 'var(--font-family, system-ui, sans-serif)',
      }}
    >
      <div
        className={isShaking ? 'animate-shake' : 'animate-scale-in'}
        style={{
          width: '100%',
          maxWidth: 410,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          border: '1.5px solid rgba(255, 149, 165, 0.25)',
          boxShadow: `
            0 25px 60px -15px rgba(255, 149, 165, 0.18),
            0 12px 28px -6px rgba(0, 0, 0, 0.04),
            0 0 0 1px #F3F4F6
          `,
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* ساعة القفل */}
        <div
          style={{
            fontSize: 13,
            color: '#4B5563',
            fontWeight: 600,
            letterSpacing: '0.2px',
            backgroundColor: '#F9FAFB',
            padding: '4px 14px',
            borderRadius: 20,
            border: '1.5px solid #E5E7EB',
          }}
        >
          {currentTime}
        </div>

        {/* Boutique Gouri Logo Badge with Lock Badge */}
        <div style={{ position: 'relative', marginTop: 2 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              padding: 2.5,
              background: 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)',
              boxShadow: '0 10px 24px -4px rgba(255, 112, 136, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: '#FF6584',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              border: '2px solid #FFFFFF',
            }}
          >
            <Lock size={13} color="#FFFFFF" strokeWidth={2.6} />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#111827' }}>
            Boutique Gouri • الشاشة مقفلة
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#FF6584', fontWeight: 600 }}>
            أدخل رمز PIN لاستئناف العمل بالوردية
          </p>
        </div>

        {/* User Card */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            border: '1.5px solid #E5E7EB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={16} color="#FF7088" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#111827' }}>{currentUser.display_name}</div>
              <div style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}>
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
              gap: 5,
              background: '#FFFFFF',
              border: '1.5px solid #E5E7EB',
              borderRadius: 8,
              padding: '6px 10px',
              color: '#BE123C',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            <ArrowLeftRight size={13} />
            <span>تبديل</span>
          </button>
        </div>

        {error && (
          <div
            className="animate-slide-up"
            style={{
              width: '100%',
              backgroundColor: '#FFF1F2',
              border: '1.5px solid #FECDD3',
              borderRadius: 10,
              padding: '8px 12px',
              color: '#BE123C',
              fontSize: 12.5,
              fontWeight: 700,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <AlertCircle size={15} color="#E11D48" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Dots */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 18,
            height: 48,
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '1.5px solid #E5E7EB',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)',
          }}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  background: isFilled
                    ? 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)'
                    : '#FFFFFF',
                  border: isFilled ? 'none' : '1.5px solid #D1D5DB',
                  boxShadow: isFilled
                    ? '0 0 12px rgba(255, 149, 165, 0.95), 0 2px 4px rgba(255, 101, 132, 0.4)'
                    : 'none',
                  transform: isFilled ? 'scale(1.25)' : 'scale(1)',
                  transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            );
          })}
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
                height: 50,
                fontSize: 22,
                fontWeight: 700,
                borderRadius: 12,
                border: '1.5px solid #EAE5DC',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FFF8F9';
                e.currentTarget.style.borderColor = '#FF95A5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#EAE5DC';
              }}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            style={{
              height: 50,
              fontSize: 13.5,
              fontWeight: 700,
              borderRadius: 12,
              border: '1.5px solid #FECDD3',
              backgroundColor: '#FFFFFF',
              color: '#BE123C',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFF1F2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              height: 50,
              fontSize: 22,
              fontWeight: 700,
              borderRadius: 12,
              border: '1.5px solid #EAE5DC',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFDF5';
              e.currentTarget.style.borderColor = '#FF95A5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#EAE5DC';
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              height: 50,
              fontSize: 19,
              fontWeight: 700,
              borderRadius: 12,
              border: '1.5px solid #EAE5DC',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFDF5';
              e.currentTarget.style.borderColor = '#FF95A5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#EAE5DC';
            }}
          >
            <Delete size={20} color="#6B7280" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleUnlock()}
          disabled={isVerifying || pin.length !== 4}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 14,
            border: 'none',
            background:
              pin.length === 4
                ? 'linear-gradient(135deg, #FF95A5 0%, #FF6B8B 100%)'
                : '#F3F4F6',
            color: pin.length === 4 ? '#FFFFFF' : '#9CA3AF',
            cursor: pin.length === 4 && !isVerifying ? 'pointer' : 'not-allowed',
            boxShadow:
              pin.length === 4
                ? '0 8px 24px -4px rgba(255, 107, 139, 0.5), 0 2px 6px rgba(0, 0, 0, 0.06)'
                : 'none',
            fontSize: 15.5,
            fontWeight: 700,
            marginTop: 4,
            transition: 'all 0.2s ease',
          }}
        >
          {isVerifying ? 'جاري التحقق...' : 'فتح الشاشة'}
        </button>
      </div>
    </div>
  );
}

export default LockScreen;
