import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Clock } from 'lucide-react';
import { sounds } from '../../lib/sounds';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps): React.ReactElement {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // تنسيق عربي أنيق للوقت والتاريخ
      const dateStr = now.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentTime(`${dateStr} • ${timeStr}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualLock = async () => {
    sounds.playWarning();
    const electron = (window as any).electron;
    await electron?.lockScreen?.();
  };

  return (
    <header
      className="glass-header"
      style={{
        height: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--color-brand-deep)',
            margin: 0,
            letterSpacing: '-0.2px',
          }}
        >
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* ساعة وتاريخ النظام الحية */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-muted)',
            backgroundColor: '#F5F7F5',
            padding: '5px 12px',
            borderRadius: 20,
            border: '1px solid #E4E8E5',
          }}
        >
          <Clock size={13} color="var(--color-primary)" />
          <span>{currentTime}</span>
        </div>

        {/* مؤشر الاتصال المحلي وقاعدة البيانات */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 12px',
            borderRadius: 20,
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid rgba(33, 99, 61, 0.25)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-success-text)',
          }}
        >
          <span className="pulse-indicator" />
          <ShieldCheck size={14} />
          <span>محلي آمن (WAL)</span>
        </div>

        {/* زر قفل الشاشة السريع */}
        <button
          type="button"
          onClick={handleManualLock}
          className="btn btn-secondary"
          style={{
            height: 36,
            padding: '0 14px',
            fontSize: 13,
            gap: 8,
            borderRadius: 8,
          }}
        >
          <Lock size={14} />
          <span>قفل الشاشة</span>
          <span className="kbd-badge kbd-badge-dark">F12</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
