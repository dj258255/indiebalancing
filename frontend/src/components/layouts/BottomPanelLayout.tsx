'use client';

import { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToolLayoutStore, AllToolId } from '@/stores/toolLayoutStore';
import PanelHeader from './PanelHeader';

interface PanelSize {
  width: number;
  height: number;
  left: number;
}

type ResizeDirection = 'horizontal' | 'vertical' | 'both' | 'horizontal-left' | 'both-left';

interface BottomPanelLayoutProps {
  panelId: string;
  children: ReactNode;
  show: boolean;
  defaultIndex?: number;
  className?: string;
  // 헤더 관련 props
  title: string;
  icon: LucideIcon;
  color: string;
  onClose: () => void;
  headerExtra?: ReactNode;
}

const SIDEBAR_WIDTH = 256;
const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 400;
const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 800;
const MIN_LEFT = 50;
const PANEL_GAP = 10;

const getStorageKey = (panelId: string) => `bottom-panel-position-${panelId}`;

const loadSavedPosition = (panelId: string): PanelSize | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(getStorageKey(panelId));
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return null;
};

const savePosition = (panelId: string, size: PanelSize) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(panelId), JSON.stringify(size));
  } catch {
    // ignore
  }
};

export default function BottomPanelLayout({
  panelId,
  children,
  show,
  defaultIndex = 0,
  className,
  title,
  icon,
  color,
  onClose,
  headerExtra,
}: BottomPanelLayoutProps) {
  const { bringToolToFront, getToolZIndex } = useToolLayoutStore();

  const calculateDefaultLeft = useCallback(() => {
    return SIDEBAR_WIDTH + PANEL_GAP + defaultIndex * (DEFAULT_WIDTH + PANEL_GAP);
  }, [defaultIndex]);

  const getInitialSize = useCallback((): PanelSize => {
    const saved = loadSavedPosition(panelId);
    if (saved) {
      if (typeof window !== 'undefined') {
        const maxLeft = window.innerWidth - saved.width - 10;
        const adjustedLeft = Math.max(MIN_LEFT, Math.min(maxLeft, saved.left));
        return { ...saved, left: adjustedLeft };
      }
      return saved;
    }
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      left: calculateDefaultLeft(),
    };
  }, [panelId, calculateDefaultLeft]);

  const [size, setSize] = useState<PanelSize>(getInitialSize);

  useEffect(() => {
    const saved = loadSavedPosition(panelId);
    if (saved) {
      const maxLeft = window.innerWidth - saved.width - 10;
      const adjustedLeft = Math.max(MIN_LEFT, Math.min(maxLeft, saved.left));
      setSize({ ...saved, left: adjustedLeft });
    } else {
      setSize({
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        left: calculateDefaultLeft(),
      });
    }
  }, [panelId, calculateDefaultLeft]);

  const [interaction, setInteraction] = useState<{
    type: 'resize' | 'drag';
    direction?: ResizeDirection;
  } | null>(null);

  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef<PanelSize>({ width: 0, height: 0, left: 0 });

  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    direction: ResizeDirection
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setInteraction({ type: 'resize', direction });
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...size };
  }, [size]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInteraction({ type: 'drag' });
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...size };
    bringToolToFront(panelId as AllToolId);
  }, [size, bringToolToFront, panelId]);

  useEffect(() => {
    if (!interaction) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = startPos.current.y - e.clientY;

      setSize(prev => {
        const newSize = { ...prev };

        if (interaction.type === 'drag') {
          const maxLeft = window.innerWidth - newSize.width - 10;
          newSize.left = Math.max(MIN_LEFT, Math.min(maxLeft, startSize.current.left + deltaX));
        } else if (interaction.direction) {
          if (interaction.direction === 'horizontal' || interaction.direction === 'both') {
            newSize.width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startSize.current.width + deltaX));
          }
          if (interaction.direction === 'horizontal-left' || interaction.direction === 'both-left') {
            const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startSize.current.width - deltaX));
            const widthDelta = newWidth - startSize.current.width;
            newSize.width = newWidth;
            newSize.left = startSize.current.left - widthDelta;
          }
          if (interaction.direction === 'vertical' || interaction.direction === 'both' || interaction.direction === 'both-left') {
            newSize.height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startSize.current.height + deltaY));
          }
        }

        return newSize;
      });
    };

    const handleMouseUp = () => {
      setInteraction(null);
      setSize(currentSize => {
        savePosition(panelId, currentSize);
        return currentSize;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, panelId]);

  if (!show) return null;

  const isDragging = interaction?.type === 'drag';
  const toolZIndex = getToolZIndex(panelId as AllToolId);

  const panelStyle = {
    background: 'var(--bg-primary)',
    borderTop: '1px solid var(--border-primary)',
    borderLeft: '1px solid var(--border-primary)',
    borderRight: '1px solid var(--border-primary)',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    left: `${size.left}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    zIndex: isDragging ? 100 : toolZIndex,
  };

  return (
    <>
      {interaction && (
        <div
          className="fixed inset-0 z-40"
          style={{ cursor: interaction.type === 'drag' ? 'grabbing' : undefined }}
        />
      )}

      <div
        className={cn("fixed bottom-0 z-30 hidden md:flex flex-col overflow-hidden", className)}
        style={panelStyle}
        onMouseDown={() => bringToolToFront(panelId as AllToolId)}
      >
        {/* Resize handles */}
        <div
          className="absolute -top-1 left-4 right-4 h-3 cursor-ns-resize z-40 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'vertical')}
        />
        <div
          className="absolute -top-1 -left-1 w-5 h-5 cursor-nwse-resize z-40 hover:bg-[var(--accent)]/30 rounded-tl-xl transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'both-left')}
        />
        <div
          className="absolute -top-1 -right-1 w-5 h-5 cursor-nesw-resize z-40 hover:bg-[var(--accent)]/30 rounded-tr-xl transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'both')}
        />
        <div
          className="absolute top-4 -left-1 bottom-0 w-2 cursor-ew-resize z-30 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'horizontal-left')}
        />
        <div
          className="absolute top-4 -right-1 bottom-0 w-2 cursor-ew-resize z-30 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'horizontal')}
        />

        {/* 공통 헤더 - 레이아웃에서 제공 */}
        <PanelHeader
          title={title}
          icon={icon}
          color={color}
          onClose={onClose}
          onDragStart={handleDragStart}
          extraContent={headerExtra}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {children}
        </div>
      </div>
    </>
  );
}
