import { useState, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import type { SheetMoveConfirmState } from '../types';

export function useProjectDrag() {
  const { projects, reorderProjects } = useProjectStore();

  // 시트 드래그 상태
  const [draggedSheetIndex, setDraggedSheetIndex] = useState<number | null>(null);
  const [draggedSheetId, setDraggedSheetId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);

  // 프로젝트 드래그 상태
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);
  const [dragOverProjectIndex, setDragOverProjectIndex] = useState<number | null>(null);

  // 시트 이동 확인
  const [sheetMoveConfirm, setSheetMoveConfirm] = useState<SheetMoveConfirmState | null>(null);

  // 프로젝트 드래그 시작
  const handleProjectDragStart = useCallback((e: React.DragEvent, projectIndex: number) => {
    e.dataTransfer.setData('application/x-project-index', String(projectIndex));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedProjectIndex(projectIndex);
  }, []);

  // 프로젝트 드래그 종료
  const handleProjectDragEnd = useCallback(() => {
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
    setDragOverProjectId(null);
  }, []);

  // 프로젝트 드래그 오버
  const handleProjectDragOver = useCallback((e: React.DragEvent, projectIndex: number, projectId: string) => {
    e.preventDefault();
    if (draggedProjectIndex !== null) {
      setDragOverProjectIndex(projectIndex);
    }
    if (draggedSheetId && dragProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  }, [draggedProjectIndex, draggedSheetId, dragProjectId]);

  // 프로젝트 드래그 리브
  const handleProjectDragLeave = useCallback(() => {
    setDragOverProjectIndex(null);
    setDragOverProjectId(null);
  }, []);

  // 프로젝트 드롭
  const handleProjectDrop = useCallback((e: React.DragEvent, projectIndex: number, project: { id: string; name: string }) => {
    e.preventDefault();

    // 프로젝트 순서 변경
    if (draggedProjectIndex !== null && draggedProjectIndex !== projectIndex) {
      reorderProjects(draggedProjectIndex, projectIndex);
    }

    // 시트를 다른 프로젝트로 이동
    if (draggedSheetId && dragProjectId && dragProjectId !== project.id) {
      const fromProject = projects.find(p => p.id === dragProjectId);
      const sheet = fromProject?.sheets.find(s => s.id === draggedSheetId);
      if (sheet) {
        setSheetMoveConfirm({
          fromProjectId: dragProjectId,
          toProjectId: project.id,
          toProjectName: project.name,
          sheetId: draggedSheetId,
          sheetName: sheet.name,
        });
      }
    }

    // 상태 초기화
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
    setDraggedSheetIndex(null);
    setDraggedSheetId(null);
    setDragProjectId(null);
    setDragOverProjectId(null);
  }, [draggedProjectIndex, draggedSheetId, dragProjectId, projects, reorderProjects]);

  // 시트 드래그 시작
  const handleSheetDragStart = useCallback((e: React.DragEvent, index: number, sheetId: string, projectId: string) => {
    setDraggedSheetIndex(index);
    setDraggedSheetId(sheetId);
    setDragProjectId(projectId);
    e.dataTransfer.setData('application/x-sheet-id', sheetId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // 시트 드래그 종료
  const handleSheetDragEnd = useCallback(() => {
    setDraggedSheetIndex(null);
    setDraggedSheetId(null);
    setDragOverIndex(null);
    setDragProjectId(null);
    setDragOverProjectId(null);
  }, []);

  // 시트 드래그 오버
  const handleSheetDragOver = useCallback((e: React.DragEvent, index: number, projectId: string) => {
    e.preventDefault();
    if (dragProjectId === projectId) {
      setDragOverIndex(index);
    }
  }, [dragProjectId]);

  // 시트 드래그 리브
  const handleSheetDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  return {
    // 시트 드래그 상태
    draggedSheetIndex,
    draggedSheetId,
    dragOverIndex,
    dragProjectId,
    dragOverProjectId,

    // 프로젝트 드래그 상태
    draggedProjectIndex,
    dragOverProjectIndex,

    // 시트 이동 확인
    sheetMoveConfirm,
    setSheetMoveConfirm,

    // 프로젝트 핸들러
    handleProjectDragStart,
    handleProjectDragEnd,
    handleProjectDragOver,
    handleProjectDragLeave,
    handleProjectDrop,

    // 시트 핸들러
    handleSheetDragStart,
    handleSheetDragEnd,
    handleSheetDragOver,
    handleSheetDragLeave,
    setDraggedSheetIndex,
    setDraggedSheetId,
    setDragOverIndex,
    setDragProjectId,
  };
}
