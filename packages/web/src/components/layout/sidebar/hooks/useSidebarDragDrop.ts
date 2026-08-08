/**
 * useSidebarDragDrop - 사이드바 드래그 앤 드롭 로직 훅
 */

import { useEffect, useCallback } from 'react';
import { AllToolId, ToolLocation } from '@/stores/toolLayoutStore';
import type { ToolDragState } from './useSidebarState';

interface UseSidebarDragDropProps {
  dragState: ToolDragState;
  setDragState: React.Dispatch<React.SetStateAction<ToolDragState>>;
  toolsContainerRef: React.RefObject<HTMLDivElement | null>;
  getSidebarTools: () => AllToolId[];
  reorderSidebarTools: (fromIndex: number, toIndex: number) => void;
  moveToolToLocation: (toolId: AllToolId, location: ToolLocation, index?: number) => void;
  isResizingToolsSection: boolean;
  setIsResizingToolsSection: (value: boolean) => void;
  toolsResizeStartY: React.MutableRefObject<number>;
  toolsResizeStartHeight: React.MutableRefObject<number>;
  setToolsSectionHeight: (height: number) => void;
  sheetContextMenu: unknown;
  sheetContextMenuRef: React.RefObject<HTMLDivElement | null>;
  setSheetContextMenu: (value: null) => void;
  projectContextMenu: unknown;
  projectContextMenuRef: React.RefObject<HTMLDivElement | null>;
  setProjectContextMenu: (value: null) => void;
}

export function useSidebarDragDrop({
  dragState,
  setDragState,
  toolsContainerRef,
  getSidebarTools,
  reorderSidebarTools,
  moveToolToLocation,
  isResizingToolsSection,
  setIsResizingToolsSection,
  toolsResizeStartY,
  toolsResizeStartHeight,
  setToolsSectionHeight,
  sheetContextMenu,
  sheetContextMenuRef,
  setSheetContextMenu,
  projectContextMenu,
  projectContextMenuRef,
  setProjectContextMenu,
}: UseSidebarDragDropProps) {
  // 시트 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!sheetContextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (sheetContextMenuRef.current && !sheetContextMenuRef.current.contains(e.target as Node)) {
        setSheetContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sheetContextMenu, sheetContextMenuRef, setSheetContextMenu]);

  // 프로젝트 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!projectContextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (projectContextMenuRef.current && !projectContextMenuRef.current.contains(e.target as Node)) {
        setProjectContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [projectContextMenu, projectContextMenuRef, setProjectContextMenu]);

  // 도구 섹션 리사이즈 이벤트
  useEffect(() => {
    if (!isResizingToolsSection) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = toolsResizeStartY.current - e.clientY;
      const newHeight = Math.max(60, Math.min(600, toolsResizeStartHeight.current + deltaY));
      setToolsSectionHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingToolsSection(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingToolsSection, setIsResizingToolsSection, setToolsSectionHeight, toolsResizeStartHeight, toolsResizeStartY]);

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
  }, [setDragState]);

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
  }, [setDragState]);

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
  }, [getSidebarTools, setDragState, toolsContainerRef]);

  // 도구 섹션 드래그 리브
  const handleToolsSectionDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragState(prev => ({ ...prev, isOverSidebar: false, dropTargetIndex: null }));
  }, [setDragState]);

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
    const sidebarTools = getSidebarTools();

    if (isFromDock) {
      moveToolToLocation(toolId, 'sidebar', dropTargetIndex ?? undefined);
    } else if (draggedFromSidebar) {
      const fromIndex = sidebarTools.indexOf(toolId);
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
  }, [dragState, getSidebarTools, moveToolToLocation, reorderSidebarTools, setDragState]);

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
    handleToolDragStart,
    handleToolsSectionDragOver,
    handleToolsSectionDragLeave,
    handleToolsDrop,
    getToolTransformY,
  };
}
