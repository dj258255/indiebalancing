'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DraggableState extends Position, Size {
  zIndex: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  initialSize?: Size;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  bounds?: 'window' | 'parent' | null;
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const {
    initialPosition = { x: 100, y: 100 },
    initialSize = { width: 400, height: 400 },
    minWidth = 300,
    maxWidth = 800,
    minHeight = 250,
    maxHeight = typeof window !== 'undefined' ? window.innerHeight - 50 : 600,
    bounds = 'window',
  } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [size, setSize] = useState<Size>(initialSize);
  const isDragging = useRef(false);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input, select, textarea')) {
        return;
      }

      e.preventDefault();
      isDragging.current = true;

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = position.x;
      const startPosY = position.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;

        let newX = startPosX + moveEvent.clientX - startX;
        let newY = startPosY + moveEvent.clientY - startY;

        if (bounds === 'window') {
          newX = Math.max(0, Math.min(newX, window.innerWidth - size.width));
          newY = Math.max(0, Math.min(newY, window.innerHeight - size.height));
        }

        setPosition({ x: newX, y: newY });
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [position, size, bounds]
  );

  const handleResizeStart = useCallback(
    (direction: 'e' | 's' | 'se') => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = size.width;
      const startHeight = size.height;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const newSize = { ...size };

        if (direction === 'e' || direction === 'se') {
          newSize.width = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
        }

        if (direction === 's' || direction === 'se') {
          newSize.height = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
        }

        setSize(newSize);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [size, minWidth, maxWidth, minHeight, maxHeight]
  );

  return {
    position,
    size,
    setPosition,
    setSize,
    handleDragStart,
    handleResizeStart,
  };
}

interface UsePanelManagerOptions {
  panels: string[];
  initialStates?: Record<string, DraggableState>;
}

export function usePanelManager(options: UsePanelManagerOptions) {
  const { panels, initialStates = {} } = options;

  const defaultState = (index: number): DraggableState => ({
    x: 270 + index * 30,
    y: 16 + index * 30,
    width: 400,
    height: 450,
    zIndex: 30 + index,
  });

  const [panelStates, setPanelStates] = useState<Record<string, DraggableState>>(() => {
    const states: Record<string, DraggableState> = {};
    panels.forEach((panel, index) => {
      states[panel] = initialStates[panel] || defaultState(index);
    });
    return states;
  });

  // panels 배열이 변경되면 새 패널 추가
  useEffect(() => {
    setPanelStates(prev => {
      const newStates = { ...prev };
      let hasChanges = false;
      panels.forEach((panel, index) => {
        if (!newStates[panel]) {
          newStates[panel] = initialStates[panel] || defaultState(index);
          hasChanges = true;
        }
      });
      return hasChanges ? newStates : prev;
    });
  }, [panels, initialStates]);

  const maxZRef = useRef(30 + panels.length);

  const bringToFront = useCallback((panelId: string) => {
    maxZRef.current += 1;
    const newZ = maxZRef.current;
    setPanelStates((prev) => ({
      ...prev,
      [panelId]: { ...prev[panelId], zIndex: newZ },
    }));
  }, []);

  // 패널 위치를 초기 상태로 리셋
  const resetPanelPosition = useCallback((panelId: string) => {
    const index = panels.indexOf(panelId);
    const state = initialStates[panelId] || defaultState(index >= 0 ? index : 0);
    maxZRef.current += 1;
    setPanelStates((prev) => ({
      ...prev,
      [panelId]: { ...state, zIndex: maxZRef.current },
    }));
  }, [panels, initialStates]);

  const updatePanel = useCallback(
    (panelId: string, updates: Partial<DraggableState>) => {
      setPanelStates((prev) => ({
        ...prev,
        [panelId]: { ...prev[panelId], ...updates },
      }));
    },
    []
  );

  const getPanelProps = useCallback(
    (panelId: string) => {
      const state = panelStates[panelId];
      if (!state) return null;

      return {
        style: {
          left: `${state.x}px`,
          top: `${state.y}px`,
          width: `${state.width}px`,
          height: `${state.height}px`,
          zIndex: state.zIndex,
        },
        onMouseDown: () => bringToFront(panelId),
      };
    },
    [panelStates, bringToFront]
  );

  // 현재 드래그 중인 패널 ID 저장
  const draggingPanelRef = useRef<string | null>(null);

  const createDragHandler = useCallback(
    (panelId: string) => (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();

      const state = panelStates[panelId];
      if (!state) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = state.x;
      const startPosY = state.y;

      // 드래그 시작 - panel-drag-start 이벤트에 panelId 전달
      draggingPanelRef.current = panelId;
      window.dispatchEvent(new CustomEvent('panel-drag-start', { detail: { panelId } }));

      const onMouseMove = (moveEvent: MouseEvent) => {
        updatePanel(panelId, {
          x: Math.max(0, startPosX + moveEvent.clientX - startX),
          y: Math.max(0, startPosY + moveEvent.clientY - startY),
        });
      };

      const onMouseUp = () => {
        // 드래그 종료 이벤트
        window.dispatchEvent(new CustomEvent('panel-drag-end', { detail: { panelId } }));
        draggingPanelRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [panelStates, updatePanel]
  );

  // 현재 드래그 중인 패널 ID 가져오기
  const getDraggingPanel = useCallback(() => draggingPanelRef.current, []);

  // 패널별 최소/최대 크기 설정 (toolConfig의 defaultWidth/Height를 최소 크기로 사용)
  const panelSizeLimits: Record<string, { minW: number; maxW: number; minH: number }> = {
    calculator: { minW: 480, maxW: 800, minH: 600 },
    comparison: { minW: 680, maxW: 1200, minH: 600 },
    chart: { minW: 580, maxW: 1000, minH: 550 },
    preset: { minW: 580, maxW: 1000, minH: 550 },
    imbalance: { minW: 520, maxW: 900, minH: 600 },
    goal: { minW: 500, maxW: 850, minH: 550 },
    balance: { minW: 580, maxW: 1000, minH: 600 },
    economy: { minW: 650, maxW: 1100, minH: 650 },
    dpsVariance: { minW: 580, maxW: 1000, minH: 600 },
    curveFitting: { minW: 650, maxW: 1100, minH: 650 },
    formulaHelper: { minW: 500, maxW: 850, minH: 550 },
    balanceValidator: { minW: 520, maxW: 900, minH: 580 },
    difficultyCurve: { minW: 580, maxW: 1000, minH: 600 },
    simulation: { minW: 700, maxW: 1200, minH: 700 },
    default: { minW: 400, maxW: 900, minH: 400 },
  };

  const createResizeHandler = useCallback(
    (panelId: string, direction: 'e' | 's' | 'se') => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const state = panelStates[panelId];
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = state.width;
      const startH = state.height;

      const limits = panelSizeLimits[panelId] || panelSizeLimits.default;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const updates: Partial<DraggableState> = {};

        if (direction === 'e' || direction === 'se') {
          updates.width = Math.min(limits.maxW, Math.max(limits.minW, startW + moveEvent.clientX - startX));
        }

        if (direction === 's' || direction === 'se') {
          updates.height = Math.min(
            window.innerHeight - 50,
            Math.max(limits.minH, startH + moveEvent.clientY - startY)
          );
        }

        updatePanel(panelId, updates);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [panelStates, updatePanel]
  );

  return {
    panelStates,
    bringToFront,
    updatePanel,
    getPanelProps,
    createDragHandler,
    createResizeHandler,
    getDraggingPanel,
    resetPanelPosition,
  };
}
