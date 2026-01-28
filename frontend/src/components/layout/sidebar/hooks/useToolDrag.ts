import { useState, useCallback, useEffect, useRef } from 'react';
import { useToolLayoutStore, AllToolId } from '@/stores/toolLayoutStore';
import type { ToolDragState } from '../types';

interface UseToolDragProps {
  isMobile: boolean;
}

export function useToolDrag({ isMobile }: UseToolDragProps) {
  const {
    getSidebarTools,
    getAllTools,
    reorderSidebarTools,
    moveToolToLocation,
  } = useToolLayoutStore();

  const toolsContainerRef = useRef<HTMLDivElement>(null);

  const [dragState, setDragState] = useState<ToolDragState>({
    draggedToolId: null,
    draggedFromSidebar: false,
    dropTargetIndex: null,
    isOverSidebar: false,
  });

  // 모바일에서는 모든 도구 표시
  const sidebarTools = isMobile ? getAllTools() : getSidebarTools();

  // 전역 드래그 이벤트 감지
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDragState({
        draggedToolId: null,
        draggedFromSidebar: false,
        dropTargetIndex: null,
        isOverSidebar: false,
      });
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => document.removeEventListener('dragend', handleGlobalDragEnd);
  }, []);

  // 도구 드래그 시작
  const handleToolDragStart = useCallback((e: React.DragEvent, toolId: AllToolId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', toolId);
    e.dataTransfer.setData('application/x-tool-id', toolId);

    setDragState({
      draggedToolId: toolId,
      draggedFromSidebar: true,
      dropTargetIndex: null,
      isOverSidebar: false,
    });
  }, []);

  // 도구 섹션 드래그 오버
  const handleToolsSectionDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!e.dataTransfer.types.includes('application/x-tool-id')) return;

    const isFromDock = e.dataTransfer.types.includes('application/x-from-dock');

    if (toolsContainerRef.current) {
      const rect = toolsContainerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const itemHeight = 48;
      const currentSidebarTools = getSidebarTools();

      let targetIndex = Math.floor(y / itemHeight);
      targetIndex = Math.max(0, Math.min(targetIndex, currentSidebarTools.length));

      setDragState(prev => ({
        ...prev,
        isOverSidebar: true,
        dropTargetIndex: targetIndex,
        draggedFromSidebar: isFromDock ? false : prev.draggedFromSidebar,
      }));
    }
  }, [getSidebarTools]);

  // 도구 섹션 드래그 리브
  const handleToolsSectionDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragState(prev => ({ ...prev, isOverSidebar: false, dropTargetIndex: null }));
  }, []);

  // 도구 드롭 처리
  const handleToolsDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const toolId = e.dataTransfer.getData('text/plain') as AllToolId;
    const isFromDock = e.dataTransfer.types.includes('application/x-from-dock');

    if (!toolId) {
      setDragState({
        draggedToolId: null,
        draggedFromSidebar: false,
        dropTargetIndex: null,
        isOverSidebar: false,
      });
      return;
    }

    const { dropTargetIndex, draggedFromSidebar } = dragState;
    const currentSidebarTools = getSidebarTools();

    if (isFromDock) {
      moveToolToLocation(toolId, 'sidebar', dropTargetIndex ?? undefined);
    } else if (draggedFromSidebar) {
      const fromIndex = currentSidebarTools.indexOf(toolId);
      if (fromIndex !== -1 && dropTargetIndex !== null && fromIndex !== dropTargetIndex) {
        let toIndex = dropTargetIndex;
        if (fromIndex < dropTargetIndex) {
          toIndex = dropTargetIndex - 1;
        }
        reorderSidebarTools(fromIndex, toIndex);
      }
    }

    setDragState({
      draggedToolId: null,
      draggedFromSidebar: false,
      dropTargetIndex: null,
      isOverSidebar: false,
    });
  }, [dragState, getSidebarTools, moveToolToLocation, reorderSidebarTools]);

  // 밀림 효과 계산
  const getToolTransformY = useCallback((index: number, toolId: AllToolId) => {
    const { draggedToolId, draggedFromSidebar, dropTargetIndex, isOverSidebar } = dragState;
    const currentSidebarTools = getSidebarTools();

    if (dropTargetIndex === null) return 0;

    if (draggedFromSidebar && draggedToolId) {
      if (draggedToolId === toolId) return 0;

      const draggedIndex = currentSidebarTools.indexOf(draggedToolId);

      if (draggedIndex < dropTargetIndex) {
        if (index > draggedIndex && index < dropTargetIndex) {
          return -48;
        }
      } else if (draggedIndex > dropTargetIndex) {
        if (index < draggedIndex && index >= dropTargetIndex) {
          return 48;
        }
      }
    } else if (isOverSidebar && !draggedFromSidebar) {
      if (index >= dropTargetIndex) {
        return 48;
      }
    }

    return 0;
  }, [dragState, getSidebarTools]);

  return {
    dragState,
    sidebarTools,
    toolsContainerRef,
    handleToolDragStart,
    handleToolsSectionDragOver,
    handleToolsSectionDragLeave,
    handleToolsDrop,
    getToolTransformY,
  };
}
