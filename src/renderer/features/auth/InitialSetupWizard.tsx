import React, { useState } from 'react';
import {
  Store,
  Phone,
  MapPin,
  User,
  Lock,
  KeyRound,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SafeUser } from '../../../shared/types/users.types';
import { sounds } from '../../lib/sounds';

interface InitialSetupWizardProps {
  onSetupComplete: (user: SafeUser) => void;
}

export function InitialSetupWizard({ onSetupComplete }: InitialSetupWizardProps): React.ReactElement {
  // بيانات المتجر
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  // بيانات حساب المالك
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const triggerError = (msg: string) => {
    sounds.playError();
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من الحقول
    if (!storeName.trim()) {
      triggerError('يرجى إدخال اسم المتجر أو المحل');
      return;
    }
    if (!storePhone.trim()) {
      triggerError('يرجى إدخال رقم الهاتف للتواصل والفواتير');
      return;
    }
    if (!displayName.trim()) {
      triggerError('يرجى إدخال اسم المالك أو المدير');
      return;
    }
    if (!username.trim()) {
      triggerError('يرجى إدخال اسم مستخدم للدخول الإداري');
      return;
    }
    if (username.trim().length < 3) {
      triggerError('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      triggerError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط بدون مسافات');
      return;
    }
    if (!password) {
      triggerError('يرجى إدخال كلمة المرور');
      return;
    }
    if (password.length < 6) {
      triggerError('كلمة المرور يجب أن تتكون من 6 خانات على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      triggerError('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    if (!pin.trim()) {
      triggerError('يرجى إدخال رمز PIN السريع (للكاشير)');
      return;
    }
    if (!/^\d{4}$/.test(pin.trim())) {
      triggerError('رمز PIN يجب أن يتكون من 4 أرقام بالضبط');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const electron = (window as any).electron;
      if (!electron?.completeInitialSetup) {
        // Fallback في المعاينة
        sounds.playSaleSuccess();
        onSetupComplete({
          id: 1,
          uuid: 'dev-owner',
          username: username.trim(),
          display_name: displayName.trim(),
          role: 'owner',
          is_active: 1,
          created_at: new Date().toISOString(),
        });
        return;
      }

      const res = await electron.completeInitialSetup({
        storeName: storeName.trim(),
        storePhone: storePhone.trim(),
        storeAddress: storeAddress.trim(),
        displayName: displayName.trim(),
        username: username.trim(),
        password,
        pin: pin.trim(),
      });

      if (res?.success && res.user) {
        sounds.playSaleSuccess();
        onSetupComplete(res.user);
      } else {
        triggerError(res?.error || 'حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة ثانية');
      }
    } catch (err: any) {
      triggerError(err.message || 'حدث خطأ غير متوقع أثناء إعداد النظام');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        padding: '20px 16px 30px 16px',
        background: 'radial-gradient(circle at 50% 10%, #FFF5F7 0%, #FFFFFF 65%, #FFF0F3 100%)',
        userSelect: 'none',
        fontFamily: 'var(--font-family, "Alexandria", sans-serif)',
        direction: 'rtl',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        className={isShaking ? 'shake' : ''}
        style={{
          width: '100%',
          maxWidth: 680,
          margin: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '22px 28px',
          boxShadow: '0 20px 48px -12px rgba(255, 149, 165, 0.22), 0 4px 16px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(255, 149, 165, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'relative',
        }}
      >
        {/* الترويسة الرئيسية والترحيب */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(255, 112, 136, 0.35)',
              marginBottom: 8,
            }}
          >
            <Sparkles size={22} />
          </div>

          <h1
            style={{
              fontSize: 19,
              fontWeight: 800,
              color: '#111827',
              margin: '0 0 4px 0',
              lineHeight: 1.25,
            }}
          >
            تهيئة النظام وإعداد الحساب لأول مرة
          </h1>
          <p
            style={{
              fontSize: 12.5,
              color: '#6B7280',
              margin: 0,
              maxWidth: 500,
              lineHeight: 1.4,
            }}
          >
            مرحباً بك! يرجى إدخال بيانات متجرك وحساب المالك الرئيسي لبدء استخدام نظام المبيعات ونقاط البيع بأمان تام.
          </p>
        </div>

        {/* تنبيه الخطأ عند وجود خطأ بالمدخلات */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#991B1B',
              fontSize: 12.5,
              fontWeight: 600,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* القسم 1: بيانات المتجر */}
          <div
            style={{
              backgroundColor: '#FAFAF9',
              borderRadius: 14,
              padding: '12px 16px',
              border: '1px solid #F0EAEB',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D63B5E', fontWeight: 700, fontSize: 13.5 }}>
              <Store size={16} />
              <span>1. بيانات المتجر والنشاط</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  اسم المتجر / المحل <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="مثال: كوزمتكس بيوتي ستور"
                    autoFocus
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 34px 0 10px',
                      borderRadius: 8,
                      border: '1.5px solid #E5E7EB',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Store size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  رقم الهاتف للتواصل <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="مثال: 01012345678"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 34px 0 10px',
                      borderRadius: 8,
                      border: '1.5px solid #E5E7EB',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Phone size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                عنوان المتجر أو الفرع (اختياري)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="مثال: شارع الجمهورية - الفرع الرئيسي"
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 34px 0 10px',
                    borderRadius: 8,
                    border: '1.5px solid #E5E7EB',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <MapPin size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
              </div>
            </div>
          </div>

          {/* القسم 2: حساب المالك الرئيسي */}
          <div
            style={{
              backgroundColor: '#FAFAF9',
              borderRadius: 14,
              padding: '12px 16px',
              border: '1px solid #F0EAEB',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D63B5E', fontWeight: 700, fontSize: 13.5 }}>
              <User size={16} />
              <span>2. بيانات حساب المالك والمدير الرئيسي</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  اسم المالك الشخصي <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="مثال: محمد أحمد"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 34px 0 10px',
                      borderRadius: 8,
                      border: '1.5px solid #E5E7EB',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <User size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  اسم المستخدم لتسجيل الدخول <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: admin"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 34px 0 10px',
                      borderRadius: 8,
                      border: '1.5px solid #E5E7EB',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      direction: 'ltr',
                      textAlign: 'right',
                    }}
                  />
                  <User size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  كلمة المرور الإدارية (6 خانات فأكثر) <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 34px 0 10px',
                      borderRadius: 8,
                      border: '1.5px solid #E5E7EB',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  تأكيد كلمة المرور <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 34px 0 10px',
                      borderRadius: 8,
                      border: '1.5px solid #E5E7EB',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                رمز PIN السريع (4 أرقام للدخول السريع في الكاشير) <span style={{ color: '#E11D48' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="مثال: 1234"
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 34px 0 10px',
                    borderRadius: 8,
                    border: '1.5px solid #E5E7EB',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '2px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <KeyRound size={15} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: 11 }} />
              </div>
              <span style={{ fontSize: 11, color: '#6B7280', marginTop: 3, display: 'block' }}>
                يُستخدم رمز الـ PIN هذا لتسجيل الدخول السريع في نقاط البيع وتفويض الخصومات والعمليات الحساسة.
              </span>
            </div>
          </div>

          {/* زر الإنهاء وبدء الاستخدام */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 800,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 20px rgba(255, 112, 136, 0.35)',
              transition: 'all 0.18s ease',
              marginTop: 4,
            }}
          >
            {isLoading ? (
              <span>جاري حفظ التهيئة وتجهيز النظام...</span>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>حفظ الإعدادات وبدء استخدام النظام</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default InitialSetupWizard;
