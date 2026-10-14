import React from 'react';
import { LucideIcon, PackageOpen } from 'lucide-react';
import { GlassIcon, GlassIconVariant } from './GlassIcon';

export interface EmptyStateProps {
  icon?: LucideIcon | string;
  variant?: GlassIconVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon = PackageOpen,
  variant = 'neutral',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  style = {},
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={`empty-state-container animate-fade-in ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 16,
        border: '1.5px dashed #EAE2E4',
        margin: '16px 0',
        ...style,
      }}
    >
      <GlassIcon icon={icon} size="2xl" variant={variant} glow style={{ marginBottom: 16 }} />
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-brand-deep)', marginBottom: 6 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.5, marginBottom: actionLabel ? 20 : 0 }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAction}
          style={{ height: 40, padding: '0 20px', fontSize: 14 }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
