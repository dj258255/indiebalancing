'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { useToolLayoutStore, AllToolId } from '@/stores/toolLayoutStore';
import FloatingPanelLayout from './FloatingPanelLayout';
import BottomPanelLayout from './BottomPanelLayout';
import type { DraggableState } from '@/hooks';

interface ToolPanelRendererProps {
  toolId: AllToolId;
  panelId: string;
  children: ReactNode;
  show: boolean;
  onClose: () => void;
  // 헤더 정보 (필수)
  title: string;
  icon: LucideIcon;
  color: string;
  headerExtra?: ReactNode;
  // Floating panel props (sidebar location)
  panelState?: DraggableState;
  onBringToFront?: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onResizeE?: (e: React.MouseEvent) => void;
  onResizeS?: (e: React.MouseEvent) => void;
  onResizeSE?: (e: React.MouseEvent) => void;
  // Bottom panel props
  defaultIndex?: number;
  className?: string;
}

export default function ToolPanelRenderer({
  toolId,
  panelId,
  children,
  show,
  onClose,
  title,
  icon,
  color,
  headerExtra,
  panelState,
  onBringToFront,
  onDragStart,
  onResizeE,
  onResizeS,
  onResizeSE,
  defaultIndex = 0,
  className,
}: ToolPanelRendererProps) {
  const { toolLocations } = useToolLayoutStore();
  const location = toolLocations[toolId];

  if (!show) return null;

  // Sidebar location -> Floating Panel
  if (location === 'sidebar') {
    if (!panelState || !onBringToFront || !onDragStart || !onResizeE || !onResizeS || !onResizeSE) {
      console.warn(`ToolPanelRenderer: Missing floating panel props for ${toolId}`);
      return null;
    }

    return (
      <FloatingPanelLayout
        panelId={panelId}
        show={show}
        panelState={panelState}
        onBringToFront={onBringToFront}
        onDragStart={onDragStart}
        onResizeE={onResizeE}
        onResizeS={onResizeS}
        onResizeSE={onResizeSE}
        title={title}
        icon={icon}
        color={color}
        onClose={onClose}
        headerExtra={headerExtra}
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
      title={title}
      icon={icon}
      color={color}
      onClose={onClose}
      headerExtra={headerExtra}
      className={className}
    >
      {children}
    </BottomPanelLayout>
  );
}
