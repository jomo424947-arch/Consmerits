import React from 'react';
import { Printer, Scan, Database, HardDriveDownload } from 'lucide-react';

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
        fontSize: 11,
        color: 'var(--text-muted)',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* حالة الطابعة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Printer size={13} color="var(--color-primary)" />
          <span>طابعة الإيصالات:</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>جاهزة (80mm)</span>
        </div>

        {/* حالة قارئ الباركود */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Scan size={13} color="var(--color-primary)" />
          <span>قارئ الباركود:</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>نشط (USB/Laser)</span>
        </div>

        {/* حالة النسخ الاحتياطي */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HardDriveDownload size={13} color="var(--color-brand-deep)" />
          <span>النسخ التلقائي:</span>
          <span style={{ color: 'var(--text-secondary)' }}>مجدول يومياً</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Database size={12} color="var(--color-primary)" />
          <span>محرك البيانات: SQLite v3.45 (WAL Mode)</span>
        </div>
        <span>•</span>
        <span style={{ color: 'var(--color-brand-deep)', fontWeight: 600 }}>
          أوفلاين 100%
        </span>
      </div>
    </footer>
  );
}

export default StatusBar;
