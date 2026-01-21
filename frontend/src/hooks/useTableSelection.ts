'use client';

import { useState, useCallback, useRef } from 'react';
import type { Sheet, Row, Column, CellValue } from '@/types';
import { useProjectStore, type SelectedRowData } from '@/stores/projectStore';

interface UseTableSelectionProps {
  sheet: Sheet;
}

export function useTableSelection({ sheet }: UseTableSelectionProps) {
  const { toggleRowSelection, selectedRows } = useProjectStore();

  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedCells, setSelectedCells] = useState<{ rowId: string; columnId: string }[]>([]);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');

  // 체크박스 드래그 선택 상태
  const [isCheckboxDragging, setIsCheckboxDragging] = useState(false);
  const checkboxDragModeRef = useRef<'select' | 'deselect' | null>(null);
  const lastDragRowIndexRef = useRef<number | null>(null);

  // 행이 선택되었는지 확인
  const isRowSelected = useCallback((rowId: string) => {
    return selectedRows.some((r) => r.rowId === rowId);
  }, [selectedRows]);

  // 행 선택 토글
  const handleRowSelect = useCallback((row: Row) => {
    const nameCol = sheet.columns.find(
      (c) => c.name === '이름' || c.name === 'name' || c.name === 'Name'
    );
    const idCol = sheet.columns.find(
      (c) => c.name === 'ID' || c.name === 'id'
    );
    const rowName = nameCol
      ? String(row.cells[nameCol.id] || '')
      : idCol
      ? String(row.cells[idCol.id] || '')
      : row.id.slice(0, 8);

    const values: Record<string, number | string> = {};
    sheet.columns.forEach((col) => {
      const val = row.cells[col.id];
      if (val !== null && val !== undefined) {
        values[col.name] = typeof val === 'number' ? val : String(val);
      }
    });

    const rowData: SelectedRowData = {
      rowId: row.id,
      sheetId: sheet.id,
      sheetName: sheet.name,
      name: rowName,
      values,
    };

    toggleRowSelection(rowData);
  }, [sheet.columns, sheet.id, sheet.name, toggleRowSelection]);

  // 전체 선택/해제 토글
  const handleSelectAll = useCallback(() => {
    const allSelected = sheet.rows.every(row => isRowSelected(row.id));

    sheet.rows.forEach(row => {
      const currentlySelected = isRowSelected(row.id);
      if (allSelected) {
        if (currentlySelected) handleRowSelect(row);
      } else {
        if (!currentlySelected) handleRowSelect(row);
      }
    });
  }, [sheet.rows, isRowSelected, handleRowSelect]);

  // 행 번호 영역 드래그 시작
  const handleRowNumberDragStart = useCallback((row: Row, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const wasSelected = isRowSelected(row.id);
    checkboxDragModeRef.current = wasSelected ? 'deselect' : 'select';

    const rowIndex = sheet.rows.findIndex(r => r.id === row.id);
    lastDragRowIndexRef.current = rowIndex;

    setIsCheckboxDragging(true);
    handleRowSelect(row);
  }, [isRowSelected, handleRowSelect, sheet.rows]);

  // 체크박스 드래그 중
  const handleCheckboxDragEnter = useCallback((row: Row) => {
    if (!isCheckboxDragging || !checkboxDragModeRef.current) return;

    const currentRowIndex = sheet.rows.findIndex(r => r.id === row.id);
    if (currentRowIndex === -1) return;

    const lastIndex = lastDragRowIndexRef.current;

    if (lastIndex !== null && lastIndex !== currentRowIndex) {
      const start = Math.min(lastIndex, currentRowIndex);
      const end = Math.max(lastIndex, currentRowIndex);

      for (let i = start; i <= end; i++) {
        const targetRow = sheet.rows[i];
        const targetSelected = isRowSelected(targetRow.id);

        if (checkboxDragModeRef.current === 'select' && !targetSelected) {
          handleRowSelect(targetRow);
        } else if (checkboxDragModeRef.current === 'deselect' && targetSelected) {
          handleRowSelect(targetRow);
        }
      }
    } else {
      const currentlySelected = isRowSelected(row.id);
      if (checkboxDragModeRef.current === 'select' && !currentlySelected) {
        handleRowSelect(row);
      } else if (checkboxDragModeRef.current === 'deselect' && currentlySelected) {
        handleRowSelect(row);
      }
    }

    lastDragRowIndexRef.current = currentRowIndex;
  }, [isCheckboxDragging, isRowSelected, handleRowSelect, sheet.rows]);

  // 셀이 선택되었는지 확인
  const isCellSelected = useCallback(
    (rowId: string, columnId: string) => {
      return selectedCells.some((c) => c.rowId === rowId && c.columnId === columnId);
    },
    [selectedCells]
  );

  // 셀 선택 (클릭 시) - 다중 선택 지원
  const selectCell = useCallback(
    (
      rowId: string,
      columnId: string,
      e?: React.MouseEvent,
      rawValue?: CellValue
    ) => {
      const isShift = e?.shiftKey;
      const isCtrl = e?.ctrlKey || e?.metaKey;

      if (isShift && selectedCell) {
        // Shift 클릭: 범위 선택
        const startRowIdx = sheet.rows.findIndex((r) => r.id === selectedCell.rowId);
        const endRowIdx = sheet.rows.findIndex((r) => r.id === rowId);
        const startColIdx = sheet.columns.findIndex((c) => c.id === selectedCell.columnId);
        const endColIdx = sheet.columns.findIndex((c) => c.id === columnId);

        const minRow = Math.min(startRowIdx, endRowIdx);
        const maxRow = Math.max(startRowIdx, endRowIdx);
        const minCol = Math.min(startColIdx, endColIdx);
        const maxCol = Math.max(startColIdx, endColIdx);

        const newSelection: { rowId: string; columnId: string }[] = [];
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            newSelection.push({
              rowId: sheet.rows[r].id,
              columnId: sheet.columns[c].id,
            });
          }
        }
        setSelectedCells(newSelection);
      } else if (isCtrl) {
        // Ctrl 클릭: 토글 추가/제거
        const exists = selectedCells.some((c) => c.rowId === rowId && c.columnId === columnId);
        if (exists) {
          setSelectedCells(selectedCells.filter((c) => !(c.rowId === rowId && c.columnId === columnId)));
        } else {
          setSelectedCells([...selectedCells, { rowId, columnId }]);
        }
        setSelectedCell({ rowId, columnId });
      } else {
        // 일반 클릭: 단일 선택
        setSelectedCell({ rowId, columnId });
        setSelectedCells([{ rowId, columnId }]);
      }

      // 원본 값을 수식 바에 표시
      if (rawValue !== undefined && rawValue !== null) {
        setFormulaBarValue(String(rawValue));
      } else {
        setFormulaBarValue('');
      }
    },
    [selectedCell, selectedCells, sheet.rows, sheet.columns]
  );

  // 드래그로 범위 선택 계산
  const calculateDragSelection = useCallback(
    (startCell: { rowId: string; columnId: string }, endCell: { rowId: string; columnId: string }) => {
      const startRowIdx = sheet.rows.findIndex((r) => r.id === startCell.rowId);
      const endRowIdx = sheet.rows.findIndex((r) => r.id === endCell.rowId);
      const startColIdx = sheet.columns.findIndex((c) => c.id === startCell.columnId);
      const endColIdx = sheet.columns.findIndex((c) => c.id === endCell.columnId);

      const minRow = Math.min(startRowIdx, endRowIdx);
      const maxRow = Math.max(startRowIdx, endRowIdx);
      const minCol = Math.min(startColIdx, endColIdx);
      const maxCol = Math.max(startColIdx, endColIdx);

      const newSelection: { rowId: string; columnId: string }[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.push({
            rowId: sheet.rows[r].id,
            columnId: sheet.columns[c].id,
          });
        }
      }
      return newSelection;
    },
    [sheet.rows, sheet.columns]
  );

  const stopCheckboxDragging = useCallback(() => {
    setIsCheckboxDragging(false);
    checkboxDragModeRef.current = null;
    lastDragRowIndexRef.current = null;
  }, []);

  return {
    // State
    selectedCell,
    setSelectedCell,
    selectedCells,
    setSelectedCells,
    formulaBarValue,
    setFormulaBarValue,
    isCheckboxDragging,

    // Row selection
    isRowSelected,
    handleRowSelect,
    handleSelectAll,
    handleRowNumberDragStart,
    handleCheckboxDragEnter,
    stopCheckboxDragging,

    // Cell selection
    isCellSelected,
    selectCell,
    calculateDragSelection,
  };
}
