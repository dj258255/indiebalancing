/**
 * ToolsSection - 도구 섹션 컴포넌트
 */

'use client';

import { GripVertical } from 'lucide-react';
import { AllToolId } from '@/stores/toolLayoutStore';
import { TOOL_CONFIGS } from '@/config/toolConfig';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ToolsSectionProps {
  sidebarTools: AllToolId[];
  activeTools: Record<string, boolean | undefined>;
  toolClickHandlers: Record<string, (() => void) | undefined>;
  selectedRowsCount: number;
  effectiveToolsHeight: number;
  toolsContainerRef: React.RefObject<HTMLDivElement | null>;
  dragState: {
    draggedToolId: AllToolId | null;
    draggedFromSidebar: boolean;
  };
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onToolDragStart: (e: React.DragEvent, toolId: AllToolId) => void;
  getToolTransformY: (index: number, toolId: AllToolId) => number;
}

export function ToolsSection({
  sidebarTools,
  activeTools,
  toolClickHandlers,
  selectedRowsCount,
  effectiveToolsHeight,
  toolsContainerRef,
  dragState,
  onDragOver,
  onDragLeave,
  onDrop,
  onToolDragStart,
  getToolTransformY,
}: ToolsSectionProps) {
  const t = useTranslations();

  return (
    <div
      id="sidebar-tools-section"
      className="p-2 flex flex-col shrink-0"
      style={{ height: `${effectiveToolsHeight}px`, minHeight: '60px', maxHeight: '600px' }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 px-2.5 mb-2 shrink-0">
        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('sidebar.tools')}
        </div>
        <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
      </div>
      <div ref={toolsContainerRef} className="space-y-1 overflow-y-auto flex-1 pr-1 scrollbar-visible">
        {sidebarTools.map((toolId, index) => {
          const config = TOOL_CONFIGS[toolId];
          if (!config) return null;

          const Icon = config.icon;
          const onClick = toolClickHandlers[toolId];
          if (!onClick) return null;

          const isActive = activeTools[toolId];
          const isDragging = dragState.draggedToolId === toolId && dragState.draggedFromSidebar;
          const translateY = getToolTransformY(index, toolId);

          return (
            <div
              key={toolId}
              draggable
              onDragStart={(e) => onToolDragStart(e, toolId)}
              className={cn(
                "group cursor-grab active:cursor-grabbing rounded-lg relative",
                isDragging && "opacity-30 z-50"
              )}
              style={{
                transform: `translateY(${translateY}px)`,
                transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
              }}
            >
              <button
                onClick={onClick}
                className="w-full flex items-center gap-3 px-2.5 py-2.5 text-sm rounded-lg transition-colors duration-150 hover:bg-[var(--bg-hover)] active:scale-[0.98]"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{ background: `${config.color}20` }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: config.color }} />
                </div>
                <span
                  className="flex-1 text-left font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t(config.titleKey)}
                </span>
                {isActive && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200"
                    style={{ background: config.color }}
                  />
                )}
                {(toolId === 'calculator' || toolId === 'comparison') && selectedRowsCount > 0 && (
                  <span
                    className="px-2 py-0.5 text-xs font-bold rounded-md shrink-0"
                    style={{ background: config.color, color: 'white' }}
                  >
                    {selectedRowsCount}
                  </span>
                )}
                <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
