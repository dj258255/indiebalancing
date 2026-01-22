'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { DraggableState } from '@/hooks';

interface FloatingPanelLayoutProps {
  panelId: string;
  children: ReactNode;
  show: boolean;
  panelState: DraggableState;
  onBringToFront: () => void;
  onResizeE: (e: React.MouseEvent) => void;
  onResizeS: (e: React.MouseEvent) => void;
  onResizeSE: (e: React.MouseEvent) => void;
  className?: string;
}

export default function FloatingPanelLayout({
  panelId,
  children,
  show,
  panelState,
  onBringToFront,
  onResizeE,
  onResizeS,
  onResizeSE,
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

  return (
    <div
      className={cn("fixed hidden md:flex flex-col rounded-xl overflow-hidden", className)}
      style={panelStyle}
      onMouseDown={onBringToFront}
    >
      {/* Content - 패널 컴포넌트가 자체 헤더를 가지고 있음 */}
      <div className="flex-1 overflow-hidden flex flex-col">
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
  );
}
