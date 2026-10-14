import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { GlassIcon } from './GlassIcon';
import { AppIcon } from './AppIcon';
import { sounds } from '../../lib/sounds';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      // تشغيل الصوت المناسب
      if (type === 'error') {
        sounds.playError();
      } else if (type === 'success') {
        sounds.playClick();
      } else if (type === 'warning') {
        sounds.playWarning();
      } else {
        sounds.playClick();
      }

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title: string = 'تم بنجاح') => showToast(message, 'success', title),
    [showToast]
  );

  const error = useCallback(
    (message: string, title: string = 'خطأ') => showToast(message, 'error', title),
    [showToast]
  );

  const warning = useCallback(
    (message: string, title: string = 'تنبيه') => showToast(message, 'warning', title),
    [showToast]
  );

  const info = useCallback(
    (message: string, title: string = 'معلومة') => showToast(message, 'info', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* حاوية الإشعارات */}
      <div className="toast-container" role="region" aria-live="polite">
        {toasts.map((toast) => {
          const isErr = toast.type === 'error';
          const isSucc = toast.type === 'success';
          const isWarn = toast.type === 'warning';

          const icon = isSucc
            ? CheckCircle2
            : isErr
            ? AlertCircle
            : isWarn
            ? AlertTriangle
            : Info;

          const variant = isSucc
            ? 'success'
            : isErr
            ? 'danger'
            : isWarn
            ? 'gold'
            : 'info';

          return (
            <div
              key={toast.id}
              className="toast-item"
              style={{
                borderLeft: isSucc
                  ? '4px solid #21633D'
                  : isErr
                  ? '4px solid #962B34'
                  : isWarn
                  ? '4px solid #C59B27'
                  : '4px solid #2B6CB0',
              }}
            >
              <GlassIcon icon={icon} size="sm" variant={variant} glow />
              <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: isErr
                        ? '#962B34'
                        : isSucc
                        ? '#21633D'
                        : isWarn
                        ? '#7A5A12'
                        : '#2B4A3E',
                      marginBottom: 2,
                    }}
                  >
                    {toast.title}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#333735', lineHeight: 1.4 }}>
                  {toast.message}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8A928D',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                }}
              >
                <AppIcon name="close" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
