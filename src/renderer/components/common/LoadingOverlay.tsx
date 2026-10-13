import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({
  message = 'جاري التحميل...',
  transparent = false,
}: LoadingOverlayProps): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: transparent ? 'rgba(255, 255, 255, 0.7)' : 'rgba(244, 245, 242, 0.85)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        borderRadius: 'inherit',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '20px 32px',
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 8px 24px rgba(47, 74, 62, 0.08)',
          border: '1px solid #E1E4E0',
        }}
      >
        <Loader2
          size={32}
          color="#4F6B5E"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <span style={{ fontSize: 14, fontWeight: 500, color: '#2F4A3E' }}>{message}</span>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoadingOverlay;
