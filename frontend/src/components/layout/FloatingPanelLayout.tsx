'use client';

import { ReactNode } from 'react';
import { LucideIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DraggableState } from '@/hooks';
import PanelHeader from './PanelHeader';

interface FloatingPanelLayoutProps {
  panelId: string;
  children: ReactNode;
  show: boolean;
  panelState: DraggableState;
  onBringToFront: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeE: (e: React.MouseEvent) => void;
  onResizeS: (e: React.MouseEvent) => void;
  onResizeSE: (e: React.MouseEvent) => void;
  // 헤더 관련 props
  title: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  onClose: () => void;
  headerExtra?: ReactNode;
  className?: string;
}

export default function FloatingPanelLayout({
  children,
  show,
  panelState,
  onBringToFront,
  onDragStart,
  onResizeE,
  onResizeS,
  onResizeSE,
  title,
  description,
  icon,
  color,
  onClose,
  headerExtra,
  className,
}: FloatingPanelLayoutProps) {
  if (!show) return null;

  const panelStyle = {
    left: `${panelState.x}px`,
    top: `${panelState.y}px`,
    width: `${panelState.width}px`,
    height: `${panelState.height}px`,
    zIndex: panelState.zIndex,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    boxShadow: '4px 4px 20px rgba(0,0,0,0.15)',
  };

  const Icon = icon;

  return (
    <>
      {/* Desktop: Floating Panel */}
      <div
        className={cn("fixed hidden md:flex flex-col rounded-xl overflow-hidden", className)}
        style={panelStyle}
        onMouseDown={onBringToFront}
      >
        {/* 공통 헤더 - 레이아웃에서 제공 */}
        <PanelHeader
          title={title}
          description={description}
          icon={icon}
          color={color}
          onClose={onClose}
          onDragStart={onDragStart}
          extraContent={headerExtra}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </div>

        {/* Resize Handles */}
        <div
          className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[var(--accent)]"
          onMouseDown={onResizeE}
        />
        <div
          className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize hover:bg-[var(--accent)]"
          onMouseDown={onResizeS}
        />
        <div
          className="absolute right-0 bottom-0 w-3 h-3 cursor-nwse-resize rounded-tl"
          style={{ background: 'var(--border-secondary)' }}
          onMouseDown={onResizeSE}
        />
      </div>

      {/* Mobile: Full Screen Modal */}
      <div
        className="md:hidden fixed inset-0 z-50 flex flex-col"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Mobile Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            {description && (
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                {description}
              </p>
            )}
          </div>
          {headerExtra}
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </div>
      </div>
    </>
  );
}
