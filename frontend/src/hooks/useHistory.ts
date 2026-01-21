'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/types';

export function useProjectHistory() {
  const { pushState, undo, redo, canUndo, canRedo, getHistory, jumpTo } = useHistoryStore();
  const { loadProjects: setProjects, projects } = useProjectStore();
  const isUndoRedoAction = useRef(false);
  const prevProjectsRef = useRef<Project[] | null>(null);

  const handleUndo = useCallback(() => {
    if (!canUndo()) return;
    isUndoRedoAction.current = true;
    const previousState = undo();
    if (previousState) {
      setProjects(previousState);
    }
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 100);
  }, [canUndo, undo, setProjects]);

  const handleRedo = useCallback(() => {
    if (!canRedo()) return;
    isUndoRedoAction.current = true;
    const nextState = redo();
    if (nextState) {
      setProjects(nextState);
    }
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 100);
  }, [canRedo, redo, setProjects]);

  const handleHistoryJump = useCallback(
    (index: number, onComplete?: () => void) => {
      isUndoRedoAction.current = true;
      const state = jumpTo(index);
      if (state) {
        setProjects(state);
      }
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 100);
      onComplete?.();
    },
    [jumpTo, setProjects]
  );

  const detectChangeType = useCallback((prev: Project[] | null, current: Project[]): string => {
    if (!prev) return 'history.initialLoad';
    if (prev.length !== current.length) {
      return prev.length < current.length ? 'history.projectCreate' : 'history.projectDelete';
    }

    for (let i = 0; i < current.length; i++) {
      const prevProj = prev[i];
      const currProj = current[i];

      if (!prevProj || prevProj.id !== currProj.id) continue;

      if (prevProj.sheets.length !== currProj.sheets.length) {
        return prevProj.sheets.length < currProj.sheets.length
          ? 'history.sheetAdd'
          : 'history.sheetDelete';
      }

      for (let j = 0; j < currProj.sheets.length; j++) {
        const prevSheet = prevProj.sheets[j];
        const currSheet = currProj.sheets[j];

        if (!prevSheet || prevSheet.id !== currSheet.id) continue;

        if (prevSheet.name !== currSheet.name) return 'history.sheetRename';

        if (prevSheet.columns.length !== currSheet.columns.length) {
          return prevSheet.columns.length < currSheet.columns.length
            ? 'history.columnAdd'
            : 'history.columnDelete';
        }

        if (prevSheet.rows.length !== currSheet.rows.length) {
          return prevSheet.rows.length < currSheet.rows.length
            ? 'history.rowAdd'
            : 'history.rowDelete';
        }

        for (let k = 0; k < currSheet.rows.length; k++) {
          const prevRow = prevSheet.rows[k];
          const currRow = currSheet.rows[k];
          if (!prevRow || prevRow.id !== currRow.id) continue;

          if (JSON.stringify(prevRow.cells) !== JSON.stringify(currRow.cells)) {
            return 'history.cellEdit';
          }
        }

        for (let k = 0; k < currSheet.columns.length; k++) {
          const prevCol = prevSheet.columns[k];
          const currCol = currSheet.columns[k];
          if (!prevCol || prevCol.id !== currCol.id) continue;

          if (JSON.stringify(prevCol) !== JSON.stringify(currCol)) {
            if (prevCol.name !== currCol.name) return 'history.columnRename';
            if (prevCol.formula !== currCol.formula) return 'history.columnFormula';
            return 'history.columnConfig';
          }
        }

        const prevStickers = prevSheet.stickers || [];
        const currStickers = currSheet.stickers || [];
        if (prevStickers.length !== currStickers.length) {
          return prevStickers.length < currStickers.length
            ? 'history.memoAdd'
            : 'history.memoDelete';
        }
        if (JSON.stringify(prevStickers) !== JSON.stringify(currStickers)) {
          return 'history.memoEdit';
        }
      }

      if (prevProj.name !== currProj.name) return 'history.projectRename';
      if (prevProj.description !== currProj.description) return 'history.projectDesc';
    }

    return 'common.change';
  }, []);

  const saveToHistory = useCallback(
    (projects: Project[]) => {
      if (isUndoRedoAction.current) return;

      const label = detectChangeType(prevProjectsRef.current, projects);
      pushState(projects, label);
      prevProjectsRef.current = JSON.parse(JSON.stringify(projects));
    },
    [detectChangeType, pushState]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    handleUndo,
    handleRedo,
    handleHistoryJump,
    canUndo,
    canRedo,
    getHistory,
    saveToHistory,
    isUndoRedoAction,
    prevProjectsRef,
  };
}
