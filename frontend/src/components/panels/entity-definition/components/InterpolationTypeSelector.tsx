'use client';

import type { InterpolationType } from '@/types';

interface InterpolationTypeSelectorProps {
  value: InterpolationType;
  onChange: (value: InterpolationType) => void;
}

const INTERPOLATION_TYPES: { value: InterpolationType; label: string; description: string }[] = [
  { value: 'linear', label: '선형', description: '일정한 비율로 보간' },
  { value: 'step', label: '스텝', description: '50% 지점에서 급격히 전환' },
  { value: 'ease-in-out', label: '이지', description: '부드러운 S-커브 보간' },
];

export default function InterpolationTypeSelector({ value, onChange }: InterpolationTypeSelectorProps) {
  const isSelected = (type: InterpolationType) => value === type;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
        오버라이드 보간 방식
      </div>
      <div className="flex gap-2">
        {INTERPOLATION_TYPES.map((type) => {
          const selected = isSelected(type.value);
          return (
            <button
              key={type.value}
              onClick={() => onChange(type.value)}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border"
              style={{
                background: selected ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: selected ? 'white' : 'var(--text-primary)',
                borderColor: selected ? 'var(--accent)' : 'var(--border-primary)',
              }}
              title={type.description}
            >
              {type.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {INTERPOLATION_TYPES.find(t => t.value === value)?.description}
      </p>
    </div>
  );
}
