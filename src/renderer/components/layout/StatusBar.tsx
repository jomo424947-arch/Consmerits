import React from 'react';
import { AppIcon } from '../common/AppIcon';

export function StatusBar(): React.ReactElement {
  return (
    <footer
      style={{
        height: 32,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--border-light)',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11.5,
        color: 'var(--text-muted)',
        userSelect: 'none',
        zIndex: 10,
        fontFamily: 'var(--font-family)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* حالة الطابعة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AppIcon name="print" size={14} color="var(--color-primary)" />
          <span>طابعة الإيصالات:</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>جاهزة (80mm)</span>
        </div>

        {/* حالة قارئ الباركود */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AppIcon name="qr_code_scanner" size={14} color="var(--color-primary)" />
          <span>قارئ الباركود:</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>نشط (USB/Laser)</span>
        </div>

        {/* حالة النسخ الاحتياطي */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AppIcon name="cloud_sync" size={14} color="var(--color-brand-deep)" />
          <span>النسخ التلقائي:</span>
          <span style={{ color: 'var(--text-secondary)' }}>مجدول يومياً</span>
        </div>
      </div>
    </footer>
  );
}

export default StatusBar;
