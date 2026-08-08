import { useState, useEffect, useRef } from 'react';
import type {
  SheetContextMenuState,
  ProjectContextMenuState,
  SheetDeleteConfirmState,
  ProjectDeleteConfirmState,
} from '../types';

export function useContextMenus() {
  // 시트 컨텍스트 메뉴
  const [sheetContextMenu, setSheetContextMenu] = useState<SheetContextMenuState | null>(null);
  const sheetContextMenuRef = useRef<HTMLDivElement>(null);

  // 프로젝트 컨텍스트 메뉴
  const [projectContextMenu, setProjectContextMenu] = useState<ProjectContextMenuState | null>(null);
  const projectContextMenuRef = useRef<HTMLDivElement>(null);

  // 삭제 확인 상태
  const [sheetDeleteConfirm, setSheetDeleteConfirm] = useState<SheetDeleteConfirmState | null>(null);
  const [projectDeleteConfirm, setProjectDeleteConfirm] = useState<ProjectDeleteConfirmState | null>(null);

  // 클래스명 편집 상태
  const [editingClassNameSheetId, setEditingClassNameSheetId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');

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
  }, [sheetContextMenu]);

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
  }, [projectContextMenu]);

  return {
    // 시트 메뉴
    sheetContextMenu,
    setSheetContextMenu,
    sheetContextMenuRef,

    // 프로젝트 메뉴
    projectContextMenu,
    setProjectContextMenu,
    projectContextMenuRef,

    // 삭제 확인
    sheetDeleteConfirm,
    setSheetDeleteConfirm,
    projectDeleteConfirm,
    setProjectDeleteConfirm,

    // 클래스명 편집
    editingClassNameSheetId,
    setEditingClassNameSheetId,
    editClassName,
    setEditClassName,
  };
}
