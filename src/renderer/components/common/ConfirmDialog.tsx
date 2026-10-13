import React, { useEffect } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { GlassIcon } from './GlassIcon';
import { sounds } from '../../lib/sounds';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement | null {
  useEffect(() => {
    if (!isOpen) return;

    sounds.playWarning();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(20, 30, 25, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 24,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <GlassIcon
            icon={isDangerous ? AlertTriangle : HelpCircle}
            size="lg"
            variant={isDangerous ? 'danger' : 'gold'}
            glow
          />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2F4A3E' }}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8A928D',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: '#4A514D', lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            style={{ minWidth: 100 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              if (isDangerous) sounds.playDelete();
              else sounds.playClick();
              onConfirm();
            }}
            style={{ minWidth: 100 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
