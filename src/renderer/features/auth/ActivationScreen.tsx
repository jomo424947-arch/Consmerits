/**
 * شاشة تفعيل التطبيق (Activation Screen)
 * تظهر عند اول تشغيل قبل اي شاشة اخرى
 * تطلب من المستخدم ادخال مفتاح التفعيل للسماح باستخدام النظام
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Lock,
  Monitor,
  Loader2,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { sounds } from '../../lib/sounds';

interface ActivationScreenProps {
  onActivationSuccess: () => void;
}

export function ActivationScreen({ onActivationSuccess }: ActivationScreenProps): React.ReactElement {
  const [keyParts, setKeyParts] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [machineId, setMachineId] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // جلب معرف الجهاز عند التحميل
  useEffect(() => {
    const fetchMachineId = async () => {
      try {
        const electron = (window as any).electron;
        if (electron?.getMachineId) {
          const res = await electron.getMachineId();
          if (res?.machineId) {
            setMachineId(res.machineId.substring(0, 12).toUpperCase());
          }
        }
      } catch {
        // تجاهل
      }
    };
    fetchMachineId();
    inputRefs[0].current?.focus();
  }, []);

  const triggerError = (msg: string) => {
    try { sounds.playError(); } catch {}
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handlePartChange = (index: number, value: string) => {
    // السماح فقط بالحروف والارقام
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
    const newParts = [...keyParts];
    newParts[index] = cleaned;
    setKeyParts(newParts);
    setError(null);

    // الانتقال التلقائي للحقل التالي عند اكتمال 4 احرف
    if (cleaned.length === 4 && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // الرجوع للحقل السابق عند الضغط على Backspace في حقل فارغ
    if (e.key === 'Backspace' && keyParts[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    // الانتقال بالسهم
    if (e.key === 'ArrowLeft' && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
    if (e.key === 'ArrowRight' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    const parts = pasted.split('-');

    if (parts.length === 4) {
      setKeyParts(parts.map(p => p.slice(0, 4)));
      inputRefs[3].current?.focus();
    } else {
      // محاولة تقسيم النص بدون شرطات
      const flat = pasted.replace(/-/g, '');
      if (flat.length >= 16) {
        setKeyParts([
          flat.slice(0, 4),
          flat.slice(4, 8),
          flat.slice(8, 12),
          flat.slice(12, 16),
        ]);
        inputRefs[3].current?.focus();
      }
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullKey = keyParts.join('-');

    if (keyParts.some(p => p.length !== 4)) {
      triggerError('يرجى ادخال مفتاح التفعيل كاملا (16 حرف/رقم)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const electron = (window as any).electron;
      if (!electron?.activateLicense) {
        triggerError('خطا في الاتصال بنظام الترخيص');
        setIsLoading(false);
        return;
      }

      const result = await electron.activateLicense(fullKey);

      if (result.success) {
        try { sounds.playSaleSuccess(); } catch {}
        setIsSuccess(true);
        setTimeout(() => {
          onActivationSuccess();
        }, 1500);
      } else {
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }
        if (result.lockedUntil) {
          setLockedUntil(result.lockedUntil);
        }
        triggerError(result.error || 'مفتاح التفعيل غير صحيح');
      }
    } catch (err) {
      triggerError('حدث خطا غير متوقع. يرجى المحاولة مرة اخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormComplete = keyParts.every(p => p.length === 4);
  const isLocked = lockedUntil && new Date(lockedUntil).getTime() > Date.now();

  return (
    <div style={styles.container}>
      {/* الخلفية المتدرجة */}
      <div style={styles.bgGradient} />
      <div style={styles.bgPattern} />

      <div
        style={{
          ...styles.card,
          ...(isShaking ? styles.shake : {}),
        }}
      >
        {/* الشعار */}
        <div style={styles.logoWrapper}>
          <div style={styles.logoBorder}>
            <img
              src={logoImg}
              alt="Boutique Gouri"
              style={styles.logoImg}
            />
          </div>
        </div>

        <h1 style={styles.title}>تفعيل نظام Boutique Gouri</h1>
        <p style={styles.subtitle}>
          يرجى ادخال مفتاح التفعيل الخاص بك لبدء استخدام النظام
        </p>

        {/* رسالة النجاح */}
        {isSuccess && (
          <div style={styles.successBox}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <span>تم التفعيل بنجاح! جاري تحميل النظام...</span>
          </div>
        )}

        {/* رسالة الخطا */}
        {error && !isSuccess && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* رسالة القفل */}
        {isLocked && !isSuccess && (
          <div style={styles.lockBox}>
            <Lock size={18} style={{ flexShrink: 0 }} />
            <span>
              تم قفل التفعيل مؤقتا بسبب كثرة المحاولات الخاطئة.
              يرجى الانتظار ثم المحاولة مرة اخرى.
            </span>
          </div>
        )}

        {!isSuccess && (
          <form onSubmit={handleActivate} style={styles.form}>
            {/* حقول ادخال المفتاح */}
            <div style={styles.keyLabel}>
              <KeyRound size={16} color="#FF7088" />
              <span>مفتاح التفعيل</span>
            </div>

            <div style={styles.keyInputRow} onPaste={handlePaste}>
              {keyParts.map((part, index) => (
                <React.Fragment key={index}>
                  <input
                    ref={inputRefs[index]}
                    type="text"
                    value={part}
                    onChange={(e) => handlePartChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    maxLength={4}
                    disabled={isLoading || !!isLocked}
                    placeholder="----"
                    style={{
                      ...styles.keyInput,
                      ...(part.length === 4 ? styles.keyInputFilled : {}),
                      ...(isLocked ? styles.keyInputDisabled : {}),
                    }}
                    dir="ltr"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {index < 3 && <span style={styles.keySeparator}>-</span>}
                </React.Fragment>
              ))}
            </div>

            {/* عدد المحاولات المتبقية */}
            {attemptsRemaining !== null && attemptsRemaining > 0 && !isLocked && (
              <p style={styles.attemptsText}>
                المحاولات المتبقية: {attemptsRemaining} من 5
              </p>
            )}

            {/* زر التفعيل */}
            <button
              type="submit"
              disabled={!isFormComplete || isLoading || !!isLocked}
              style={{
                ...styles.submitBtn,
                ...(!isFormComplete || isLoading || !!isLocked
                  ? styles.submitBtnDisabled
                  : {}),
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <Shield size={18} />
                  <span>تفعيل النظام</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* معرف الجهاز */}
        {machineId && !isSuccess && (
          <div style={styles.machineIdBox}>
            <Monitor size={14} color="#9CA3AF" />
            <span style={styles.machineIdLabel}>معرف الجهاز:</span>
            <span style={styles.machineIdValue}>{machineId}</span>
          </div>
        )}

        {/* ملاحظة المساعدة */}
        {!isSuccess && (
          <p style={styles.helpText}>
            للحصول على مفتاح التفعيل، يرجى التواصل مع المطور
          </p>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shakeAnim {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.3); }
          50% { box-shadow: 0 0 0 12px rgba(22, 163, 74, 0); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    direction: 'rtl',
    fontFamily: 'Alexandria, Tajawal, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGradient: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, #FFF0F3 0%, #FFFFFF 40%, #FFF9FA 60%, #FFF0F3 100%)',
    zIndex: 0,
  },
  bgPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'radial-gradient(circle at 20% 30%, rgba(255, 149, 165, 0.08) 0%, transparent 50%), ' +
      'radial-gradient(circle at 80% 70%, rgba(255, 112, 136, 0.06) 0%, transparent 50%)',
    zIndex: 0,
  },
  card: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: '40px 44px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px -12px rgba(26, 31, 38, 0.08), 0 0 0 1px rgba(240, 232, 234, 0.6)',
    animation: 'fadeInUp 0.5s ease-out',
    textAlign: 'center',
  },
  shake: {
    animation: 'shakeAnim 0.4s ease-in-out',
  },
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoBorder: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    padding: 2.5,
    background: 'linear-gradient(135deg, #FF95A5 0%, #FF6584 100%)',
    boxShadow: '0 12px 28px -4px rgba(255, 112, 136, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1F26',
    margin: '0 0 6px 0',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    margin: '0 0 24px 0',
    lineHeight: 1.6,
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    color: '#15803D',
    borderRadius: 12,
    padding: '14px 18px',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 16,
    border: '1px solid #BBF7D0',
    animation: 'successPulse 1.5s ease-in-out infinite',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF2F2',
    color: '#B91C1C',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
    border: '1px solid #FECACA',
    textAlign: 'right' as const,
  },
  lockBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8E6',
    color: '#946800',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
    border: '1px solid #FDE68A',
    textAlign: 'right' as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  keyLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: '#1A1F26',
    justifyContent: 'center',
  },
  keyInputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    direction: 'ltr' as const,
  },
  keyInput: {
    width: 82,
    height: 50,
    textAlign: 'center' as const,
    fontSize: 20,
    fontWeight: 800,
    fontFamily: 'monospace',
    letterSpacing: '3px',
    color: '#1A1F26',
    backgroundColor: '#FAF9F9',
    border: '2px solid #E4DCDD',
    borderRadius: 12,
    outline: 'none',
    transition: 'all 0.2s ease',
    caretColor: '#FF7088',
  },
  keyInputFilled: {
    borderColor: '#FF95A5',
    backgroundColor: '#FFF0F3',
    color: '#1A1F26',
  },
  keyInputDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  keySeparator: {
    fontSize: 22,
    fontWeight: 800,
    color: '#D1D5DB',
    userSelect: 'none' as const,
  },
  attemptsText: {
    fontSize: 12,
    color: '#946800',
    fontWeight: 600,
    margin: 0,
    textAlign: 'center' as const,
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    backgroundColor: '#FF7088',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px -2px rgba(255, 112, 136, 0.35)',
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  machineIdBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    padding: '10px 16px',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    border: '1px solid #F0E8EA',
  },
  machineIdLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 600,
  },
  machineIdValue: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: '1px',
    direction: 'ltr' as const,
  },
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
    lineHeight: 1.6,
  },
};
