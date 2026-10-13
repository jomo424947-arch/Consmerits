import React from 'react';
import { LucideIcon } from 'lucide-react';

export type GlassIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type GlassIconVariant =
  | 'brand'
  | 'primary'
  | 'gold'
  | 'rose'
  | 'danger'
  | 'success'
  | 'neutral'
  | 'info';

export interface GlassIconProps {
  icon: LucideIcon;
  size?: GlassIconSize;
  variant?: GlassIconVariant;
  glow?: boolean;
  active?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  badge?: string | number;
}

const sizeConfig: Record<
  GlassIconSize,
  { box: number; icon: number; radius: number; badgeSize: number }
> = {
  xs: { box: 26, icon: 14, radius: 7, badgeSize: 14 },
  sm: { box: 34, icon: 18, radius: 9, badgeSize: 16 },
  md: { box: 42, icon: 22, radius: 11, badgeSize: 18 },
  lg: { box: 50, icon: 26, radius: 13, badgeSize: 20 },
  xl: { box: 62, icon: 32, radius: 16, badgeSize: 22 },
  '2xl': { box: 76, icon: 40, radius: 20, badgeSize: 24 },
};

const variantConfig: Record<
  GlassIconVariant,
  {
    bg: string;
    border: string;
    iconColor: string;
    glowColor: string;
    activeBg: string;
    activeBorder: string;
  }
> = {
  brand: {
    bg: 'linear-gradient(135deg, rgba(47, 74, 62, 0.18) 0%, rgba(47, 74, 62, 0.08) 100%)',
    border: 'rgba(47, 74, 62, 0.28)',
    iconColor: '#2F4A3E',
    glowColor: 'rgba(47, 74, 62, 0.35)',
    activeBg: 'linear-gradient(135deg, #2F4A3E 0%, #3D5F50 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.4)',
  },
  primary: {
    bg: 'linear-gradient(135deg, rgba(79, 107, 94, 0.16) 0%, rgba(79, 107, 94, 0.06) 100%)',
    border: 'rgba(79, 107, 94, 0.25)',
    iconColor: '#4F6B5E',
    glowColor: 'rgba(79, 107, 94, 0.3)',
    activeBg: 'linear-gradient(135deg, #4F6B5E 0%, #638576 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.4)',
  },
  gold: {
    bg: 'linear-gradient(135deg, rgba(212, 160, 23, 0.18) 0%, rgba(212, 160, 23, 0.06) 100%)',
    border: 'rgba(212, 160, 23, 0.32)',
    iconColor: '#A87910',
    glowColor: 'rgba(212, 160, 23, 0.35)',
    activeBg: 'linear-gradient(135deg, #C59B27 0%, #D8AF3B 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.5)',
  },
  rose: {
    bg: 'linear-gradient(135deg, rgba(192, 92, 126, 0.18) 0%, rgba(192, 92, 126, 0.06) 100%)',
    border: 'rgba(192, 92, 126, 0.3)',
    iconColor: '#B04B70',
    glowColor: 'rgba(192, 92, 126, 0.35)',
    activeBg: 'linear-gradient(135deg, #C05C7E 0%, #D47192 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.4)',
  },
  danger: {
    bg: 'linear-gradient(135deg, rgba(150, 43, 52, 0.16) 0%, rgba(150, 43, 52, 0.06) 100%)',
    border: 'rgba(150, 43, 52, 0.28)',
    iconColor: '#962B34',
    glowColor: 'rgba(150, 43, 52, 0.3)',
    activeBg: 'linear-gradient(135deg, #962B34 0%, #B33944 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.4)',
  },
  success: {
    bg: 'linear-gradient(135deg, rgba(33, 99, 61, 0.16) 0%, rgba(33, 99, 61, 0.06) 100%)',
    border: 'rgba(33, 99, 61, 0.28)',
    iconColor: '#21633D',
    glowColor: 'rgba(33, 99, 61, 0.3)',
    activeBg: 'linear-gradient(135deg, #21633D 0%, #2B7A4D 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.4)',
  },
  neutral: {
    bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(240, 242, 240, 0.5) 100%)',
    border: 'rgba(225, 228, 224, 0.8)',
    iconColor: '#4A514D',
    glowColor: 'rgba(0, 0, 0, 0.08)',
    activeBg: 'linear-gradient(135deg, #4A514D 0%, #606864 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.4)',
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(43, 108, 176, 0.16) 0%, rgba(43, 108, 176, 0.06) 100%)',
    border: 'rgba(43, 108, 176, 0.28)',
    iconColor: '#2B6CB0',
    glowColor: 'rgba(43, 108, 176, 0.3)',
    activeBg: 'linear-gradient(135deg, #2B6CB0 0%, #3B82F6 100%)',
    activeBorder: 'rgba(255, 255, 255, 0.4)',
  },
};

export function GlassIcon({
  icon: IconComponent,
  size = 'md',
  variant = 'brand',
  glow = false,
  active = false,
  interactive = false,
  className = '',
  style = {},
  badge,
}: GlassIconProps): React.ReactElement {
  const cfg = sizeConfig[size];
  const vcfg = variantConfig[variant];

  const currentBg = active ? vcfg.activeBg : vcfg.bg;
  const currentBorder = active ? vcfg.activeBorder : vcfg.border;
  const currentIconColor = active ? '#FFFFFF' : vcfg.iconColor;

  return (
    <div
      className={`glass-icon-wrapper ${interactive ? 'glass-icon-interactive' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: cfg.box,
        height: cfg.box,
        minWidth: cfg.box,
        minHeight: cfg.box,
        borderRadius: cfg.radius,
        background: currentBg,
        border: `1px solid ${currentBorder}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: glow || active
          ? `0 4px 14px ${vcfg.glowColor}, inset 0 1px 1px rgba(255, 255, 255, 0.5)`
          : '0 2px 5px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: interactive ? 'pointer' : 'inherit',
        ...style,
      }}
    >
      {/* طبقة البريق الزجاجي الداخلي */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          borderTopLeftRadius: cfg.radius - 1,
          borderTopRightRadius: cfg.radius - 1,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.02) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* الأيقونة الفعلية */}
      <IconComponent
        size={cfg.icon}
        color={currentIconColor}
        strokeWidth={2.2}
        style={{
          filter: active ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))' : 'none',
          position: 'relative',
          zIndex: 1,
          transition: 'color 0.2s ease, transform 0.2s ease',
        }}
      />

      {/* شارة إشعار صغيرة إذا وجدت */}
      {badge !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            minWidth: cfg.badgeSize,
            height: cfg.badgeSize,
            padding: '0 4px',
            borderRadius: cfg.badgeSize / 2,
            backgroundColor: '#962B34',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(150, 43, 52, 0.4)',
            border: '1.5px solid #FFFFFF',
            zIndex: 2,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export default GlassIcon;
