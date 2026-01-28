import { useCallback, useEffect, useRef } from 'react';
import type { Sheet } from '@/types';
import type { CellPosition } from '../types';

interface UseSheetKeyboardProps {
  sheet: Sheet;
  editingCell: CellPosition | null;
  selectedCell: CellPosition | null;
  selectedCells: CellPosition[];
  copySelectedCells: () => void;
  pasteToSelectedCells: () => void;
  clearSelectedCells: () => void;
  startEditing: (rowId: string, columnId: string) => void;
  setSelectedCells: React.Dispatch<React.SetStateAction<CellPosition[]>>;
  setSelectedCell: (cell: CellPosition | null) => void;
  setEditingCell: (cell: CellPosition | null) => void;
  setEditValue: (value: string) => void;
  setFormulaBarValue: (value: string) => void;
  hiddenInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useSheetKeyboard({
  sheet,
  editingCell,
  selectedCell,
  selectedCells,
  copySelectedCells,
  pasteToSelectedCells,
  clearSelectedCells,
  startEditing,
  setSelectedCells,
  setSelectedCell,
  setEditingCell,
  setEditValue,
  setFormulaBarValue,
  hiddenInputRef,
}: UseSheetKeyboardProps) {
  const isComposingRef = useRef(false);

  // 전역 키보드 이벤트
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target === hiddenInputRef.current) {
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (editingCell) return;

      // Ctrl/Cmd + C: 복사
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedCells.length > 0) {
          e.preventDefault();
          copySelectedCells();
        }
      }
      // Ctrl/Cmd + V: 붙여넣기
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (selectedCell) {
          e.preventDefault();
          pasteToSelectedCells();
        }
      }
      // Ctrl/Cmd + A: 전체 선택/해제 토글
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allCellsCount = sheet.rows.length * sheet.columns.length;
        const allCellsSelected = allCellsCount > 0 && selectedCells.length === allCellsCount;

        if (allCellsSelected) {
          setSelectedCells([]);
          setSelectedCell(null);
        } else {
          const allCells = sheet.rows.flatMap(row =>
            sheet.columns.map(col => ({ rowId: row.id, columnId: col.id }))
          );
          setSelectedCells(allCells);
          if (sheet.rows.length > 0 && sheet.columns.length > 0) {
            setSelectedCell({ rowId: sheet.rows[0].id, columnId: sheet.columns[0].id });
          }
        }
      }
      // Delete 또는 Backspace: 선택된 셀 내용 삭제
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCells.length > 0) {
          e.preventDefault();
          clearSelectedCells();
        }
      }
      // F2: 편집 모드 진입
      else if (e.key === 'F2' && selectedCell) {
        e.preventDefault();
        startEditing(selectedCell.rowId, selectedCell.columnId);
      }
      // 일반 문자 입력 시 hiddenInput으로 포커스 이동
      else if (
        selectedCell &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
        const column = sheet.columns.find((c) => c.id === selectedCell.columnId);
        if (column?.locked || row?.locked) return;

        if (hiddenInputRef.current) {
          hiddenInputRef.current.value = '';
          hiddenInputRef.current.focus();
          if (!e.isComposing && e.keyCode !== 229) {
            hiddenInputRef.current.value = e.key;
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [editingCell, selectedCells, selectedCell, copySelectedCells, pasteToSelectedCells, clearSelectedCells, sheet.rows, sheet.columns, startEditing, setSelectedCells, setSelectedCell, hiddenInputRef]);

  // 숨겨진 input 핸들러 (IME 입력 처리)
  const handleHiddenInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isComposingRef.current && selectedCell && !editingCell) {
      const value = e.target.value;
      if (value) {
        setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
        setEditValue(value);
        setFormulaBarValue(value);
        e.target.value = '';
      }
    }
  }, [selectedCell, editingCell, setEditingCell, setEditValue, setFormulaBarValue]);

  const handleHiddenInputCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleHiddenInputCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    if (selectedCell && !editingCell) {
      const value = e.currentTarget.value;
      if (value) {
        setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
        setEditValue(value);
        setFormulaBarValue(value);
        e.currentTarget.value = '';
      }
    }
  }, [selectedCell, editingCell, setEditingCell, setEditValue, setFormulaBarValue]);

  return {
    isComposingRef,
    handleHiddenInputChange,
    handleHiddenInputCompositionStart,
    handleHiddenInputCompositionEnd,
  };
}
