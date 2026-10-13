import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'warn' | 'warning' | 'danger' | 'success' | 'info' | 'neutral';
  style?: React.CSSProperties;
}

export function Badge({ children, variant = 'warn', style }: BadgeProps): React.ReactElement {
  const normalizedVariant = variant === 'warning' ? 'warn' : variant;
  return <span className={`badge badge-${normalizedVariant}`} style={style}>{children}</span>;
}
