import React, { useState, useEffect } from 'react';
import { Sparkles, KeyRound, User, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { GlassIcon } from '../../components/common/GlassIcon';
import { SafeUser } from '../../../shared/types/users.types';
import { sounds } from '../../lib/sounds';

interface LoginPageProps {
  onLoginSuccess: (user: SafeUser) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps): React.ReactElement {
  const [mode, setMode] = useState<'pin' | 'password'>('pin');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // دعم لوحة المفاتيح المباشرة للـ PIN (أرقام 0-9، Enter، Backspace)
  useEffect(() => {
    if (mode !== 'pin') return;

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
        handlePinSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPin('');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, pin]);

  const triggerError = (msg: string) => {
    sounds.playError();
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handlePinDigit = (digit: string) => {
    sounds.playClick();
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handlePinBackspace = () => {
    sounds.playClick();
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handlePinClear = () => {
    sounds.playClick();
    setPin('');
    setError(null);
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      triggerError('يرجى إدخال رمز PIN المكون من 4 إلى 6 أرقام');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const electron = (window as any).electron;
      if (!electron?.loginWithPin) {
        // Fallback في بيئة المعاينة
        sounds.playSaleSuccess();
        onLoginSuccess({
          id: 1,
          uuid: 'dev',
          username: 'admin',
          display_name: 'مدير المحل (افتراضي)',
          role: 'owner',
          is_active: 1,
          created_at: new Date().toISOString(),
        });
        return;
      }

      const res = await electron.loginWithPin(pin);
      if (res?.success && res.user) {
        sounds.playSaleSuccess();
        onLoginSuccess(res.user);
      } else {
        triggerError(res?.error || 'رمز PIN غير صحيح، يرجى المحاولة ثانية');
        setPin('');
      }
    } catch (err: any) {
      triggerError(err.message || 'حدث خطأ أثناء الاتصال بالنظام');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      triggerError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const electron = (window as any).electron;
      if (!electron?.login) {
        sounds.playSaleSuccess();
        onLoginSuccess({
          id: 1,
          uuid: 'dev',
          username: 'admin',
          display_name: 'مدير المحل (افتراضي)',
          role: 'owner',
          is_active: 1,
          created_at: new Date().toISOString(),
        });
        return;
      }

      const res = await electron.login({ username: username.trim(), password });
      if (res?.success && res.user) {
        sounds.playSaleSuccess();
        onLoginSuccess(res.user);
      } else {
        triggerError(res?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      triggerError(err.message || 'حدث خطأ أثناء التحقق من الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 50% 20%, #2F4A3E 0%, #1B2B24 55%, #101B16 100%)',
        color: '#FFFFFF',
        direction: 'rtl',
        padding: 20,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <div
        className={isShaking ? 'animate-shake' : 'animate-scale-in'}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Header & Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <GlassIcon icon={Sparkles} size="2xl" variant="rose" glow />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            نظام بيع وجرد مستحضرات التجميل
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
            سجّل دخولك لبدء الوردية وإدارة المبيعات الآمنة
          </p>
        </div>

        {/* Mode Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 12,
            padding: 4,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMode('pin');
              setError(null);
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 0',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: mode === 'pin' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: mode === 'pin' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
              transition: 'all 0.18s',
            }}
          >
            <KeyRound size={15} />
            <span>رمز PIN السريع (كاشير)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMode('password');
              setError(null);
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 0',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: mode === 'password' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: mode === 'password' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
              transition: 'all 0.18s',
            }}
          >
            <User size={15} />
            <span>اسم المستخدم (إدارة)</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="animate-slide-up"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#FCA5A5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Entry Mode */}
        {mode === 'pin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* PIN Display Dots */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 14,
                height: 52,
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor:
                      index < pin.length ? '#E3EAE5' : 'rgba(255, 255, 255, 0.18)',
                    transition: 'all 0.18s ease',
                    transform: index < pin.length ? 'scale(1.25)' : 'scale(1)',
                    boxShadow:
                      index < pin.length
                        ? '0 0 10px rgba(227, 234, 229, 0.8)'
                        : 'none',
                  }}
                />
              ))}
            </div>

            {/* Keypad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinDigit(digit)}
                  style={{
                    height: 54,
                    fontSize: 22,
                    fontWeight: 600,
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinClear}
                style={{
                  height: 54,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 12,
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
                onClick={() => handlePinDigit('0')}
                style={{
                  height: 54,
                  fontSize: 22,
                  fontWeight: 600,
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinBackspace}
                style={{
                  height: 54,
                  fontSize: 18,
                  fontWeight: 600,
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
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
              onClick={() => handlePinSubmit()}
              disabled={isLoading || pin.length < 4}
              isLoading={isLoading}
              style={{
                height: 48,
                fontSize: 15,
                fontWeight: 600,
                marginTop: 4,
                background: 'linear-gradient(135deg, #4F6B5E 0%, #355245 100%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(47, 74, 62, 0.5)',
              }}
            >
              دخول الوردية ⏎
            </Button>
          </div>
        )}

        {/* Username & Password Mode */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(255,255,255,0.75)' }}>
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: admin"
                autoFocus
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  color: '#FFFFFF',
                  fontSize: 15,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'rgba(255,255,255,0.75)' }}>
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  color: '#FFFFFF',
                  fontSize: 15,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !username.trim() || !password}
              isLoading={isLoading}
              style={{
                height: 48,
                fontSize: 15,
                fontWeight: 600,
                marginTop: 6,
                background: 'linear-gradient(135deg, #4F6B5E 0%, #355245 100%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(47, 74, 62, 0.5)',
              }}
            >
              تسجيل الدخول
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
