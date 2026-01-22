'use client';

import { ReactNode, useState, useCallback, useRef, useEffect, isValidElement, cloneElement } from 'react';
import { cn } from '@/lib/utils';

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
  buttonX?: number; // 버튼의 X 좌표 (패널 중앙을 버튼에 맞춤)
}

const SIDEBAR_WIDTH = 224;
const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 400;
const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 800;
const MIN_LEFT = 50;

// localStorage 키
const getStorageKey = (panelId: string) => `bottom-panel-position-${panelId}`;

// 저장된 위치 불러오기
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

// 위치 저장
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
  buttonX,
}: BottomPanelLayoutProps) {
  const prevShow = useRef(show);
  const hasUserMovedPanel = useRef(false);

  // 버튼 X 좌표가 있으면 패널 중앙을 버튼에 맞춤, 없으면 기본 위치 사용
  const calculateInitialLeft = useCallback(() => {
    if (buttonX !== undefined) {
      // buttonX는 버튼의 왼쪽 좌표이므로, 버튼 너비(약 100px)의 절반을 더해서 버튼 중앙을 구함
      const buttonCenter = buttonX + 50; // 버튼 대략적인 너비의 절반
      let left = buttonCenter - DEFAULT_WIDTH / 2;
      // 화면 밖으로 나가지 않도록 조정
      const maxLeft = window.innerWidth - DEFAULT_WIDTH - 10;
      left = Math.max(MIN_LEFT, Math.min(maxLeft, left));
      return left;
    }
    return SIDEBAR_WIDTH + defaultIndex * DEFAULT_WIDTH;
  }, [buttonX, defaultIndex]);

  // 초기 위치: 저장된 위치 > buttonX 기반 > 기본값
  const getInitialSize = useCallback((): PanelSize => {
    const saved = loadSavedPosition(panelId);
    if (saved) {
      hasUserMovedPanel.current = true;
      return saved;
    }
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      left: calculateInitialLeft(),
    };
  }, [panelId, calculateInitialLeft]);

  const [size, setSize] = useState<PanelSize>(getInitialSize);

  // 컴포넌트 마운트 시 저장된 위치 불러오기
  useEffect(() => {
    const saved = loadSavedPosition(panelId);
    if (saved) {
      hasUserMovedPanel.current = true;
      setSize(saved);
    }
  }, [panelId]);

  // 패널이 닫혔다가 다시 열릴 때: 사용자가 이동한 적 없으면 buttonX 기반으로 위치 설정
  useEffect(() => {
    if (show && !prevShow.current) {
      // 저장된 위치가 있으면 그 위치 사용
      const saved = loadSavedPosition(panelId);
      if (saved) {
        setSize(saved);
      } else if (buttonX !== undefined) {
        // 저장된 위치가 없으면 버튼 기준으로 위치 설정
        setSize(prev => ({
          ...prev,
          left: calculateInitialLeft(),
        }));
      }
    }
    prevShow.current = show;
  }, [show, buttonX, calculateInitialLeft, panelId]);

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
  }, [size]);

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
      // 현재 size를 저장 (클로저 문제로 인해 setSize 콜백 내에서 최신 값을 가져옴)
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
  }, [interaction]);

  if (!show) return null;

  const isDragging = interaction?.type === 'drag';

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
    zIndex: isDragging ? 35 : 30,
  };

  return (
    <>
      {/* Interaction overlay */}
      {interaction && (
        <div
          className="fixed inset-0 z-40"
          style={{ cursor: interaction.type === 'drag' ? 'grabbing' : undefined }}
        />
      )}

      <div
        className={cn("fixed bottom-0 z-30 hidden md:flex flex-col overflow-hidden", className)}
        style={panelStyle}
      >
        {/* Top resize handle - 최상단에 배치 */}
        <div
          className="absolute -top-1 left-4 right-4 h-3 cursor-ns-resize z-40 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'vertical')}
        />

        {/* Top-left corner resize */}
        <div
          className="absolute -top-1 -left-1 w-5 h-5 cursor-nwse-resize z-40 hover:bg-[var(--accent)]/30 rounded-tl-xl transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'both-left')}
        />

        {/* Top-right corner resize */}
        <div
          className="absolute -top-1 -right-1 w-5 h-5 cursor-nesw-resize z-40 hover:bg-[var(--accent)]/30 rounded-tr-xl transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'both')}
        />


        {/* Left resize handle */}
        <div
          className="absolute top-4 -left-1 bottom-0 w-2 cursor-ew-resize z-30 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'horizontal-left')}
        />

        {/* Right resize handle */}
        <div
          className="absolute top-4 -right-1 bottom-0 w-2 cursor-ew-resize z-30 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, 'horizontal')}
        />

        {/* Content - 패널 컴포넌트가 자체 헤더를 가지고 있음 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isValidElement(children)
            ? cloneElement(children as React.ReactElement<{ onDragStart?: (e: React.MouseEvent) => void }>, {
                onDragStart: handleDragStart,
              })
            : children}
        </div>
      </div>
    </>
  );
}
