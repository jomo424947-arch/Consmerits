import React, { useRef, useEffect } from 'react';
import { Scan, CornerDownLeft, Sparkles } from 'lucide-react';
import { GlassIcon } from '../../../components/common/GlassIcon';

interface BarcodeInputProps {
  onScan: (barcode: string) => void;
  isLoading?: boolean;
}

export function BarcodeInput({ onScan, isLoading = false }: BarcodeInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // التركيز التلقائي الدائم على حقل المسح السريع
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value.trim();
      if (val) {
        onScan(val);
        e.currentTarget.value = '';
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: '6px 14px',
        border: '1.5px solid #D5DAD6',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <GlassIcon icon={Scan} size="md" variant="brand" glow />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="امسح الباركود بالسكانر أو اكتب الكود واضغط Enter..."
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          style={{
            width: '100%',
            height: 38,
            border: 'none',
            outline: 'none',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-main)',
            fontFamily: 'inherit',
            background: 'transparent',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          className="kbd-badge"
          style={{
            backgroundColor: '#F0F3F1',
            color: 'var(--color-brand-deep)',
            borderColor: '#D0D8D3',
            height: 26,
            padding: '0 8px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <CornerDownLeft size={12} />
          <span>Enter</span>
        </span>
      </div>
    </div>
  );
}

export default BarcodeInput;
