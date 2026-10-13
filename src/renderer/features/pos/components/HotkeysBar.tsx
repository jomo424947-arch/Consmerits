import React from 'react';

interface HotkeyDef {
  key: string;
  label: string;
  color?: string;
}

const posHotkeys: HotkeyDef[] = [
  { key: 'F4', label: 'إتمام الدفع', color: 'var(--color-success)' },
  { key: 'F6', label: 'تعليق الفاتورة', color: 'var(--color-primary)' },
  { key: 'F7', label: 'استرجاع معلق', color: 'var(--color-gold)' },
  { key: 'Esc', label: 'إلغاء الفاتورة', color: 'var(--color-danger)' },
  { key: 'F12', label: 'قفل الشاشة' },
];

export function HotkeysBar(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 14px',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        overflowX: 'auto',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
        اختصارات سريعة:
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {posHotkeys.map((h, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span
              className="kbd-badge"
              style={{
                backgroundColor: '#F0F3F1',
                color: h.color || 'var(--text-main)',
                borderColor: '#D4DDD7',
                padding: '2px 6px',
                fontWeight: 700,
              }}
            >
              {h.key}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HotkeysBar;
