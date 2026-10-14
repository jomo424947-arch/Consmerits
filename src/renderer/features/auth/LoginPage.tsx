import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  KeyRound,
  User,
  Lock,
  AlertCircle,
  Delete,
  Users,
  Crown,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { SafeUser } from '../../../shared/types/users.types';
import { UserRole, ROLE_LABELS } from '../../../shared/constants/roles';
import { sounds } from '../../lib/sounds';
import logoImg from '../../assets/logo.png';

export interface LoginUserSummary {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  has_pin: boolean;
}

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

  // قائمة الحسابات المسجلة على هذا الجهاز
  const [availableUsers, setAvailableUsers] = useState<LoginUserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<LoginUserSummary | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // جلب المستخدمين المسجلين على هذا الجهاز عند بدء التشغيل
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const electron = (window as any).electron;
        if (electron?.getLoginUsers) {
          const users: LoginUserSummary[] = await electron.getLoginUsers();
          if (isMounted && Array.isArray(users)) {
            setAvailableUsers(users);
            if (users.length > 0) {
              // تحديد أول مستخدم يمتلك PIN تلقائياً أو أول مستخدم
              const defaultUser = users.find((u) => u.has_pin) || users[0];
              setSelectedUser(defaultUser);
              if (defaultUser) {
                setUsername(defaultUser.username);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load login users', err);
      } finally {
        if (isMounted) setIsLoadingUsers(false);
      }
    };

    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // اختيار مستخدم
  const handleSelectUser = (user: LoginUserSummary) => {
    sounds.playClick();
    setSelectedUser(user);
    setPin('');
    setError(null);
    setUsername(user.username);
    if (mode === 'pin' && !user.has_pin) {
      triggerError('هذا الحساب لم يتم تعيين رمز PIN له، يرجى الدخول بكلمة المرور');
    }
  };

  // دعم لوحة المفاتيح المباشرة للـ PIN (أرقام 0-9، Enter، Backspace، Escape)
  useEffect(() => {
    if (mode !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        sounds.playClick();
        if (pin.length < 4) {
          const nextPin = pin + e.key;
          setPin(nextPin);
          setError(null);
          if (nextPin.length === 4) {
            handlePinSubmit(undefined, nextPin);
          }
        }
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
  }, [mode, pin, selectedUser]);

  const triggerError = (msg: string) => {
    sounds.playError();
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handlePinDigit = (digit: string) => {
    sounds.playClick();
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        handlePinSubmit(undefined, nextPin);
      }
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

  const handlePinSubmit = async (e?: React.FormEvent, pinOverride?: string) => {
    if (e) e.preventDefault();
    const effectivePin = pinOverride || pin;
    if (!effectivePin || effectivePin.length !== 4) {
      triggerError('يرجى إدخال رمز PIN المكون من 4 أرقام');
      return;
    }

    if (selectedUser && !selectedUser.has_pin) {
      triggerError('هذا الحساب لم يتم تعيين رمز PIN له، يرجى تسجيل الدخول بكلمة المرور');
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
          id: selectedUser?.id || 1,
          uuid: 'dev',
          username: selectedUser?.username || 'admin',
          display_name: selectedUser?.display_name || 'مدير المحل (افتراضي)',
          role: selectedUser?.role || 'owner',
          is_active: 1,
          created_at: new Date().toISOString(),
        });
        return;
      }

      const res = await electron.loginWithPin(effectivePin, selectedUser?.id);
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
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#FFFFFF',
        backgroundImage: `
          radial-gradient(circle at 85% 15%, rgba(255, 149, 165, 0.18) 0%, transparent 48%),
          radial-gradient(circle at 15% 85%, rgba(255, 149, 165, 0.08) 0%, transparent 50%),
          #FFFFFF
        `,
        color: '#111827',
        direction: 'rtl',
        padding: '24px 16px',
        boxSizing: 'border-box',
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: 'var(--font-family, system-ui, sans-serif)',
      }}
    >
      {/* هالات الإضاءة الجمالية في الخلفية (Ambient Aesthetics) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -90,
          right: -90,
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 149, 165, 0.22) 0%, rgba(255, 149, 165, 0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -110,
          left: -110,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 149, 165, 0.1) 0%, rgba(255, 149, 165, 0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* البطاقة الرئيسية الفاخرة (Elevated White Luxury Card) */}
      <div
        className={isShaking ? 'animate-shake' : 'animate-scale-in'}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          maxHeight: '96vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          border: '1.5px solid rgba(255, 149, 165, 0.25)',
          boxShadow: `
            0 25px 60px -15px rgba(255, 149, 165, 0.18),
            0 12px 28px -6px rgba(0, 0, 0, 0.04),
            0 0 0 1px #F3F4F6
          `,
          padding: '26px 26px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          zIndex: 10,
        }}
      >
        {/* رأس البطاقة وشعار Boutique Gouri */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              padding: 3,
              background: 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)',
              boxShadow: '0 12px 30px -4px rgba(255, 112, 136, 0.4), 0 4px 10px rgba(0, 0, 0, 0.04)',
              margin: '0 auto 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
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

          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.3px',
              lineHeight: 1.3,
            }}
          >
            Boutique Gouri • بوتيك جوري
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12.5,
              color: '#FF6584',
              fontWeight: 700,
            }}
          >
            BEAUTY & COSMETICS • نظام المبيعات ونقاط البيع
          </p>
        </div>

        {/* محول النمط الفاخر (Segmented Control Tabs) */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F9FAFB',
            borderRadius: 14,
            padding: 5,
            gap: 6,
            border: '1.5px solid #E5E7EB',
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
              padding: '9px 0',
              border: mode === 'pin' ? '1px solid rgba(255, 149, 165, 0.25)' : '1px solid transparent',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: mode === 'pin' ? '#FFFFFF' : 'transparent',
              color: mode === 'pin' ? '#111827' : '#4B5563',
              boxShadow: mode === 'pin' ? '0 3px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(255, 149, 165, 0.2)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <KeyRound size={16} color={mode === 'pin' ? '#FF7088' : '#6B7280'} strokeWidth={2.2} />
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
              padding: '9px 0',
              border: mode === 'password' ? '1px solid rgba(255, 149, 165, 0.25)' : '1px solid transparent',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: mode === 'password' ? '#FFFFFF' : 'transparent',
              color: mode === 'password' ? '#111827' : '#4B5563',
              boxShadow: mode === 'password' ? '0 3px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(255, 149, 165, 0.2)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <User size={16} color={mode === 'password' ? '#FF7088' : '#6B7280'} strokeWidth={2.2} />
            <span>اسم المستخدم (إدارة)</span>
          </button>
        </div>

        {/* قائمة الحسابات المسجلة على هذا الجهاز (Device Registered Accounts Switcher) */}
        {availableUsers.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#374151',
                }}
              >
                <Users size={15} color="#FF7088" />
                <span>اختر الحساب المسجل:</span>
              </div>
              {selectedUser && (
                <span
                  style={{
                    fontSize: 11.5,
                    color: '#6B7280',
                    fontWeight: 600,
                  }}
                >
                  المحدد: <strong style={{ color: '#FF6584' }}>{selectedUser.display_name}</strong>
                </span>
              )}
            </div>

            {/* شريط بطاقات الحسابات التفاعلي */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: availableUsers.length > 3 ? 'auto' : 'hidden',
                padding: '3px 2px 7px',
                scrollbarWidth: 'thin',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {availableUsers.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    style={{
                      flex: availableUsers.length <= 3 ? 1 : '0 0 115px',
                      minWidth: availableUsers.length <= 3 ? 0 : 115,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px 6px',
                      borderRadius: 14,
                      border: isSelected
                        ? '2px solid #FF7088'
                        : '1.5px solid #F3F4F6',
                      backgroundColor: isSelected ? '#FFF5F7' : '#FAFAFA',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(255, 112, 136, 0.22), 0 1px 3px rgba(0, 0, 0, 0.04)'
                        : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                      outline: 'none',
                      position: 'relative',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#FECDD3';
                        e.currentTarget.style.backgroundColor = '#FFF8F9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#F3F4F6';
                        e.currentTarget.style.backgroundColor = '#FAFAFA';
                      }
                    }}
                  >
                    {/* علامة الاختيار النشط */}
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 5,
                          left: 5,
                          width: 17,
                          height: 17,
                          borderRadius: '50%',
                          backgroundColor: '#FF7088',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(255, 112, 136, 0.4)',
                        }}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}

                    {/* أيقونة الأفاتار بحسب دور المستخدم */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background:
                          user.role === 'owner'
                            ? 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)'
                            : user.role === 'manager'
                            ? 'linear-gradient(135deg, #C7D2FE 0%, #6366F1 100%)'
                            : 'linear-gradient(135deg, #FFCCD5 0%, #FF7088 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 5,
                        boxShadow: isSelected
                          ? '0 3px 8px rgba(255, 112, 136, 0.35)'
                          : '0 2px 4px rgba(0, 0, 0, 0.04)',
                        color: user.role === 'owner' ? '#78350F' : '#FFFFFF',
                      }}
                    >
                      {user.role === 'owner' && <Crown size={18} strokeWidth={2.2} />}
                      {user.role === 'manager' && <ShieldCheck size={18} strokeWidth={2.2} />}
                      {user.role === 'cashier' && <User size={18} strokeWidth={2.2} />}
                    </div>

                    {/* اسم الحساب */}
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: isSelected ? '#111827' : '#374151',
                        textAlign: 'center',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        padding: '0 4px',
                      }}
                      title={user.display_name}
                    >
                      {user.display_name}
                    </span>

                    {/* دور الحساب وحالة الـ PIN */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        marginTop: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 6,
                          backgroundColor: isSelected ? 'rgba(255, 112, 136, 0.15)' : '#F3F4F6',
                          color: isSelected ? '#BE123C' : '#6B7280',
                        }}
                      >
                        {ROLE_LABELS[user.role] || user.role}
                      </span>

                      {!user.has_pin && (
                        <span
                          title="يتطلب كلمة مرور"
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: 4,
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <Lock size={8} />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* شريط رسالة الخطأ (Alert Banner) */}
        {error && (
          <div
            className="animate-slide-up"
            style={{
              backgroundColor: '#FFF1F2',
              border: '1.5px solid #FECDD3',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#BE123C',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertCircle size={18} color="#E11D48" />
            <span>{error}</span>
          </div>
        )}

        {/* نمط إدخال رمز الـ PIN (PIN Keypad Mode) */}
        {mode === 'pin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* شريط نقاط الـ PIN المضيئة (Luminous Pearl Dots) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 20,
                height: 56,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                border: '1.5px solid #E5E7EB',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)',
              }}
            >
              {[0, 1, 2, 3].map((index) => {
                const isFilled = index < pin.length;
                return (
                  <div
                    key={index}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: isFilled
                        ? 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)'
                        : '#FFFFFF',
                      border: isFilled ? 'none' : '1.5px solid #D1D5DB',
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isFilled ? 'scale(1.28)' : 'scale(1)',
                      boxShadow: isFilled
                        ? '0 0 14px rgba(255, 149, 165, 0.95), 0 2px 6px rgba(255, 101, 132, 0.45)'
                        : 'none',
                    }}
                  />
                );
              })}
            </div>

            {/* لوحة المفاتيح التفاعلية (Tactile High-Contrast Keypad) */}
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
                    height: 56,
                    fontSize: 24,
                    fontWeight: 700,
                    borderRadius: 14,
                    border: '1.5px solid #EAE5DC',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFF8F9';
                    e.currentTarget.style.borderColor = '#FF95A5';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(255, 149, 165, 0.28)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#EAE5DC';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.03)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                >
                  {digit}
                </button>
              ))}

              {/* زر المسح الشامل (Clear) */}
              <button
                type="button"
                onClick={handlePinClear}
                style={{
                  height: 56,
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 14,
                  border: '1.5px solid #FECDD3',
                  backgroundColor: '#FFFFFF',
                  color: '#BE123C',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFF1F2';
                  e.currentTarget.style.borderColor = '#FF95A5';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(255, 149, 165, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#FECDD3';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
              >
                مسح
              </button>

              {/* الصفر (0) */}
              <button
                type="button"
                onClick={() => handlePinDigit('0')}
                style={{
                  height: 56,
                  fontSize: 24,
                  fontWeight: 700,
                  borderRadius: 14,
                  border: '1.5px solid #EAE5DC',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFDF5';
                  e.currentTarget.style.borderColor = '#FF95A5';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(255, 149, 165, 0.28)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#EAE5DC';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.03)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
              >
                0
              </button>

              {/* زر حذف رقم واحد (Backspace) */}
              <button
                type="button"
                onClick={handlePinBackspace}
                aria-label="مسح خانة واحدة"
                style={{
                  height: 56,
                  fontSize: 21,
                  fontWeight: 700,
                  borderRadius: 14,
                  border: '1.5px solid #EAE5DC',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFDF5';
                  e.currentTarget.style.borderColor = '#FF95A5';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(255, 149, 165, 0.28)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#EAE5DC';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.03)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
              >
                <Delete size={20} color="#6B7280" />
              </button>
            </div>

            {/* الزر الرئيسي لدخول الوردية (Luxury Rose CTA) */}
            <button
              type="button"
              onClick={() => handlePinSubmit()}
              disabled={isLoading || pin.length !== 4}
              style={{
                height: 52,
                fontSize: 16,
                fontWeight: 700,
                marginTop: 4,
                borderRadius: 14,
                border: 'none',
                background:
                  pin.length === 4
                    ? 'linear-gradient(135deg, #FF95A5 0%, #FF6B8B 100%)'
                    : '#F3F4F6',
                color: pin.length === 4 ? '#FFFFFF' : '#9CA3AF',
                cursor: pin.length === 4 && !isLoading ? 'pointer' : 'not-allowed',
                boxShadow:
                  pin.length === 4
                    ? '0 8px 24px -4px rgba(255, 107, 139, 0.5), 0 2px 6px rgba(0, 0, 0, 0.06)'
                    : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                outline: 'none',
                textShadow: pin.length === 4 ? '0 1px 2px rgba(0, 0, 0, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (pin.length === 4 && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(255, 107, 139, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (pin.length === 4 && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px -4px rgba(255, 107, 139, 0.5), 0 2px 6px rgba(0, 0, 0, 0.06)';
                }
              }}
            >
              {isLoading
                ? 'جاري التحقق...'
                : selectedUser
                ? `دخول الوردية (${selectedUser.display_name})`
                : 'دخول الوردية'}
            </button>
          </div>
        )}

        {/* نمط اسم المستخدم وكلمة المرور (Username & Password Form Mode) */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13.5,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: '#111827',
                }}
              >
                اسم المستخدم
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  autoFocus
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 42px 0 14px',
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: 15,
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FF95A5';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 149, 165, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <User
                  size={18}
                  color="#9CA3AF"
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13.5,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: '#111827',
                }}
              >
                كلمة المرور
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 42px 0 14px',
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: 15,
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FF95A5';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255, 149, 165, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <Lock
                  size={18}
                  color="#9CA3AF"
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              style={{
                height: 52,
                fontSize: 16,
                fontWeight: 700,
                marginTop: 6,
                borderRadius: 14,
                border: 'none',
                background:
                  username.trim() && password
                    ? 'linear-gradient(135deg, #FF95A5 0%, #FF6B8B 100%)'
                    : '#F3F4F6',
                color: username.trim() && password ? '#FFFFFF' : '#9CA3AF',
                cursor: username.trim() && password && !isLoading ? 'pointer' : 'not-allowed',
                boxShadow:
                  username.trim() && password
                    ? '0 8px 24px -4px rgba(255, 107, 139, 0.5), 0 2px 6px rgba(0, 0, 0, 0.06)'
                    : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                textShadow: username.trim() && password ? '0 1px 2px rgba(0, 0, 0, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (username.trim() && password && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(255, 107, 139, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (username.trim() && password && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px -4px rgba(255, 107, 139, 0.5), 0 2px 6px rgba(0, 0, 0, 0.06)';
                }
              }}
            >
              {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;

