'use client';

import { useState } from 'react';
import { Grid3X3 } from 'lucide-react';

interface StatInputProps {
  icon: React.ElementType;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCellSelect: () => void;
  color?: string;
}

export function StatInput({
  icon: Icon,
  label,
  value,
  onChange,
  onCellSelect,
  color = 'var(--text-tertiary)'
}: StatInputProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <label className="flex items-center gap-1 text-xs mb-1" style={{ color }}>
        <Icon className="w-3 h-3" /> {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-2 py-1 pr-7 rounded text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
        />
        {isHovered && (
          <button
            onClick={onCellSelect}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            title="셀에서 값 가져오기"
          >
            <Grid3X3 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        )}
      </div>
    </div>
  );
}
