'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { AllToolId } from '@/stores/toolLayoutStore';
import FloatingPanelLayout from './FloatingPanelLayout';
import type { DraggableState } from '@/hooks';

interface ToolPanelRendererProps {
  toolId: AllToolId;
  panelId: string;
  children: ReactNode;
  show: boolean;
  onClose: () => void;
  // 헤더 정보 (필수)
  title: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  headerExtra?: ReactNode;
  // Floating panel props
  panelState?: DraggableState;
  onBringToFront?: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onResizeE?: (e: React.MouseEvent) => void;
  onResizeS?: (e: React.MouseEvent) => void;
  onResizeSE?: (e: React.MouseEvent) => void;
  // Bottom panel props (deprecated - 호환성을 위해 유지)
  defaultIndex?: number;
  className?: string;
}

export default function ToolPanelRenderer({
  panelId,
  children,
  show,
  onClose,
  title,
  description,
  icon,
  color,
  headerExtra,
  panelState,
  onBringToFront,
  onDragStart,
  onResizeE,
  onResizeS,
  onResizeSE,
  className,
}: ToolPanelRendererProps) {
  if (!show) return null;

  // 항상 Floating Panel로 렌더링 (위치에 관계없이)
  if (!panelState || !onBringToFront || !onDragStart || !onResizeE || !onResizeS || !onResizeSE) {
    console.warn(`ToolPanelRenderer: Missing floating panel props for ${panelId}`);
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
      description={description}
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
