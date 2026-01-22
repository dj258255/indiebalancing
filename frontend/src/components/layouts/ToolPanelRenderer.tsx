'use client';

import { ReactNode } from 'react';
import { useToolLayoutStore, AllToolId } from '@/stores/toolLayoutStore';
import FloatingPanelLayout from './FloatingPanelLayout';
import BottomPanelLayout from './BottomPanelLayout';
import type { DraggableState } from '@/hooks';

interface ToolPanelRendererProps {
  toolId: AllToolId;
  panelId: string;
  children: ReactNode;
  show: boolean;
  // For floating panel (sidebar location)
  panelState?: DraggableState;
  onBringToFront?: () => void;
  onResizeE?: (e: React.MouseEvent) => void;
  onResizeS?: (e: React.MouseEvent) => void;
  onResizeSE?: (e: React.MouseEvent) => void;
  // For bottom panel
  defaultIndex?: number;
  buttonX?: number; // 버튼의 X 좌표 (패널 중앙을 버튼에 맞춤)
  className?: string;
}

export default function ToolPanelRenderer({
  toolId,
  panelId,
  children,
  show,
  panelState,
  onBringToFront,
  onResizeE,
  onResizeS,
  onResizeSE,
  defaultIndex = 0,
  buttonX,
  className,
}: ToolPanelRendererProps) {
  const { toolLocations } = useToolLayoutStore();
  const location = toolLocations[toolId];

  if (!show) return null;

  // Sidebar location -> Floating Panel
  if (location === 'sidebar') {
    if (!panelState || !onBringToFront || !onResizeE || !onResizeS || !onResizeSE) {
      console.warn(`ToolPanelRenderer: Missing floating panel props for ${toolId}`);
      return null;
    }

    return (
      <FloatingPanelLayout
        panelId={panelId}
        show={show}
        panelState={panelState}
        onBringToFront={onBringToFront}
        onResizeE={onResizeE}
        onResizeS={onResizeS}
        onResizeSE={onResizeSE}
        className={className}
      >
        {children}
      </FloatingPanelLayout>
    );
  }

  // Bottom location -> Bottom Panel
  return (
    <BottomPanelLayout
      panelId={panelId}
      show={show}
      defaultIndex={defaultIndex}
      buttonX={buttonX}
      className={className}
    >
      {children}
    </BottomPanelLayout>
  );
}
