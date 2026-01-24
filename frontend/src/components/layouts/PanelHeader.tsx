'use client';

import { ReactNode } from 'react';
import { X, LucideIcon } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
  color: string;
  onClose?: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  // 추가 콘텐츠 (도움말 버튼, 배지 등)
  extraContent?: ReactNode;
}

export default function PanelHeader({
  title,
  icon: Icon,
  color,
  onClose,
  onDragStart,
  extraContent,
}: PanelHeaderProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    // 버튼, input, select 등 상호작용 요소는 제외
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) {
      return;
    }
    if (onDragStart) {
      onDragStart(e);
    }
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3 relative z-20 cursor-grab active:cursor-grabbing shrink-0"
      style={{
        background: `${color}15`,
        borderBottom: `1px solid ${color}40`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: color }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-sm" style={{ color }}>
          {title}
        </h3>
        {extraContent}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
