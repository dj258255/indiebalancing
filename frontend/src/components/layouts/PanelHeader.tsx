'use client';

import { ReactNode, useState, useEffect } from 'react';
import { X, LucideIcon, Move } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
  color: string;
  onClose?: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  // 추가 콘텐츠 (도움말 버튼, 배지 등)
  extraContent?: ReactNode;
}

// 드래그 힌트가 표시되었는지 확인
const DRAG_HINT_KEY = 'powerbalance-drag-hint-shown';

export default function PanelHeader({
  title,
  icon: Icon,
  color,
  onClose,
  onDragStart,
  extraContent,
}: PanelHeaderProps) {
  const [showDragHint, setShowDragHint] = useState(false);

  useEffect(() => {
    // 첫 방문자에게만 힌트 표시
    if (typeof window !== 'undefined') {
      const hintShown = localStorage.getItem(DRAG_HINT_KEY);
      if (!hintShown) {
        setShowDragHint(true);
        // 5초 후 자동 숨김
        const timer = setTimeout(() => {
          setShowDragHint(false);
          localStorage.setItem(DRAG_HINT_KEY, 'true');
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // 버튼, input, select 등 상호작용 요소는 제외
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) {
      return;
    }
    // 힌트 숨기고 저장
    if (showDragHint) {
      setShowDragHint(false);
      localStorage.setItem(DRAG_HINT_KEY, 'true');
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
        {/* 드래그 핸들 아이콘 - 가독성 개선 + 테두리 */}
        <div
          className="flex flex-col gap-[3px] mr-1.5 p-1 rounded border opacity-70 hover:opacity-100 transition-all hover:bg-[var(--bg-hover)]"
          style={{ borderColor: `${color}50` }}
          title="드래그하여 이동"
        >
          <div className="flex gap-[3px]">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          </div>
          <div className="flex gap-[3px]">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          </div>
          <div className="flex gap-[3px]">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          </div>
        </div>
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

      {/* 첫 사용자 드래그 힌트 */}
      {showDragHint && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn z-50"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          <Move className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            헤더를 드래그하여 패널을 이동할 수 있어요
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDragHint(false);
              localStorage.setItem(DRAG_HINT_KEY, 'true');
            }}
            className="text-xs px-1.5 py-0.5 rounded ml-1 hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            확인
          </button>
        </div>
      )}
    </div>
  );
}
