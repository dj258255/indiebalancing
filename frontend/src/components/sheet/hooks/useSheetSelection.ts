import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Sheet, Row, CellValue } from '@/types';
import { useProjectStore, type SelectedRowData } from '@/stores/projectStore';
import type { CellPosition, ClipboardData } from '../types';
import { cellKey, rafThrottle } from '../utils';

interface UseSheetSelectionProps {
  projectId: string;
  sheet: Sheet;
  computedRows: Record<string, CellValue>[];
}

export function useSheetSelection({ projectId, sheet, computedRows }: UseSheetSelectionProps) {
  const {
    toggleRowSelection,
    selectedRows,
    cellSelectionMode,
    completeCellSelection,
    updateCell,
  } = useProjectStore();

  // 선택 상태
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');

  // 드래그 상태
  const isDraggingRef = useRef(false);
  const dragStartCellRef = useRef<CellPosition | null>(null);
  const lastSelectedCellRef = useRef<CellPosition | null>(null);

  // 클립보드 데이터
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);

  // 성능 최적화: O(1) 조회를 위한 Set
  const selectedCellsSet = useMemo(
    () => new Set(selectedCells.map(c => cellKey(c.rowId, c.columnId))),
    [selectedCells]
  );

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

  // 셀이 선택되었는지 확인 - O(1) 조회
  const isCellSelected = useCallback(
    (rowId: string, columnId: string) => {
      return selectedCellsSet.has(cellKey(rowId, columnId));
    },
    [selectedCellsSet]
  );

  // 셀 선택 (클릭 시) - 다중 선택 지원
  const selectCell = useCallback(
    (rowId: string, columnId: string, e?: React.MouseEvent) => {
      // 계산기 셀 선택 모드 처리
      if (cellSelectionMode.active) {
        const rowIndex = sheet.rows.findIndex((r) => r.id === rowId);
        if (rowIndex >= 0) {
          const computedValue = computedRows[rowIndex]?.[columnId];
          const rawValue = computedValue ?? sheet.rows[rowIndex]?.cells[columnId];
          const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
          if (!isNaN(numValue)) {
            completeCellSelection(numValue);
          }
        }
        return;
      }

      const newCell = { rowId, columnId };

      // Shift+클릭: 범위 선택
      if (e?.shiftKey && lastSelectedCellRef.current) {
        const lastCell = lastSelectedCellRef.current;
        const startRowIdx = sheet.rows.findIndex((r) => r.id === lastCell.rowId);
        const endRowIdx = sheet.rows.findIndex((r) => r.id === rowId);
        const startColIdx = sheet.columns.findIndex((c) => c.id === lastCell.columnId);
        const endColIdx = sheet.columns.findIndex((c) => c.id === columnId);

        const minRowIdx = Math.min(startRowIdx, endRowIdx);
        const maxRowIdx = Math.max(startRowIdx, endRowIdx);
        const minColIdx = Math.min(startColIdx, endColIdx);
        const maxColIdx = Math.max(startColIdx, endColIdx);

        const rangeCells: CellPosition[] = [];
        for (let ri = minRowIdx; ri <= maxRowIdx; ri++) {
          for (let ci = minColIdx; ci <= maxColIdx; ci++) {
            rangeCells.push({
              rowId: sheet.rows[ri].id,
              columnId: sheet.columns[ci].id,
            });
          }
        }
        setSelectedCells(rangeCells);
        setSelectedCell(newCell);
      }
      // Ctrl/Cmd+클릭: 토글 선택
      else if (e?.ctrlKey || e?.metaKey) {
        setSelectedCells((prev) => {
          const exists = prev.some((c) => c.rowId === rowId && c.columnId === columnId);
          if (exists) {
            return prev.filter((c) => !(c.rowId === rowId && c.columnId === columnId));
          }
          return [...prev, newCell];
        });
        setSelectedCell(newCell);
        lastSelectedCellRef.current = newCell;
      }
      // 일반 클릭: 단일 선택
      else {
        setSelectedCell(newCell);
        setSelectedCells([newCell]);
        lastSelectedCellRef.current = newCell;
      }

      // 원본 값을 수식 바에 표시
      const row = sheet.rows.find((r) => r.id === rowId);
      const rawValue = row?.cells[columnId];
      setFormulaBarValue(rawValue?.toString() || '');
    },
    [sheet.rows, sheet.columns, cellSelectionMode.active, completeCellSelection, computedRows]
  );

  // 드래그로 범위 선택 계산
  const calculateDragSelection = useCallback(
    (startCell: CellPosition, endCell: CellPosition) => {
      const startRowIdx = sheet.rows.findIndex((r) => r.id === startCell.rowId);
      const endRowIdx = sheet.rows.findIndex((r) => r.id === endCell.rowId);
      const startColIdx = sheet.columns.findIndex((c) => c.id === startCell.columnId);
      const endColIdx = sheet.columns.findIndex((c) => c.id === endCell.columnId);

      const minRowIdx = Math.min(startRowIdx, endRowIdx);
      const maxRowIdx = Math.max(startRowIdx, endRowIdx);
      const minColIdx = Math.min(startColIdx, endColIdx);
      const maxColIdx = Math.max(startColIdx, endColIdx);

      const rangeCells: CellPosition[] = [];
      for (let ri = minRowIdx; ri <= maxRowIdx; ri++) {
        for (let ci = minColIdx; ci <= maxColIdx; ci++) {
          rangeCells.push({
            rowId: sheet.rows[ri].id,
            columnId: sheet.columns[ci].id,
          });
        }
      }
      return rangeCells;
    },
    [sheet.rows, sheet.columns]
  );

  // 선택된 셀들 복사 (Ctrl+C)
  const copySelectedCells = useCallback(() => {
    if (selectedCells.length === 0) return;

    const rowIndices = selectedCells.map(c => sheet.rows.findIndex(r => r.id === c.rowId));
    const colIndices = selectedCells.map(c => sheet.columns.findIndex(col => col.id === c.columnId));

    const minRowIdx = Math.min(...rowIndices);
    const maxRowIdx = Math.max(...rowIndices);
    const minColIdx = Math.min(...colIndices);
    const maxColIdx = Math.max(...colIndices);

    const cells = selectedCells.map(cell => {
      const row = sheet.rows.find(r => r.id === cell.rowId);
      return {
        rowId: cell.rowId,
        columnId: cell.columnId,
        value: row?.cells[cell.columnId] ?? '',
      };
    });

    setClipboardData({
      cells,
      bounds: { minRowIdx, maxRowIdx, minColIdx, maxColIdx },
    });

    // 시스템 클립보드에도 텍스트로 복사
    const rowCount = maxRowIdx - minRowIdx + 1;
    const colCount = maxColIdx - minColIdx + 1;
    const grid: string[][] = Array(rowCount).fill(null).map(() => Array(colCount).fill(''));

    for (const cell of cells) {
      const rowIdx = sheet.rows.findIndex(r => r.id === cell.rowId) - minRowIdx;
      const colIdx = sheet.columns.findIndex(c => c.id === cell.columnId) - minColIdx;
      if (rowIdx >= 0 && colIdx >= 0) {
        grid[rowIdx][colIdx] = cell.value?.toString() ?? '';
      }
    }

    const text = grid.map(row => row.join('\t')).join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
  }, [selectedCells, sheet.rows, sheet.columns]);

  // 선택된 셀들 지우기
  const clearSelectedCells = useCallback(() => {
    for (const cell of selectedCells) {
      updateCell(projectId, sheet.id, cell.rowId, cell.columnId, '');
    }
    if (selectedCell && selectedCells.some(c => c.rowId === selectedCell.rowId && c.columnId === selectedCell.columnId)) {
      setFormulaBarValue('');
    }
    setSelectedCells([]);
  }, [selectedCells, selectedCell, projectId, sheet.id, updateCell]);

  // 붙여넣기 (Ctrl+V)
  const pasteToSelectedCells = useCallback(async () => {
    if (!selectedCell) return;

    let clipboardText = '';
    try {
      if (navigator.clipboard) {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch {
      // 클립보드 접근 실패
    }

    if (clipboardText) {
      const rows = clipboardText.split('\n').map(line => line.split('\t'));
      const startRowIdx = sheet.rows.findIndex(r => r.id === selectedCell.rowId);
      const startColIdx = sheet.columns.findIndex(c => c.id === selectedCell.columnId);

      if (startRowIdx === -1 || startColIdx === -1) return;

      const newSelectedCells: CellPosition[] = [];

      for (let ri = 0; ri < rows.length; ri++) {
        const targetRowIdx = startRowIdx + ri;
        if (targetRowIdx >= sheet.rows.length) break;

        const targetRow = sheet.rows[targetRowIdx];

        for (let ci = 0; ci < rows[ri].length; ci++) {
          const targetColIdx = startColIdx + ci;
          if (targetColIdx >= sheet.columns.length) break;

          const targetCol = sheet.columns[targetColIdx];
          if (targetCol.locked || targetRow.locked) continue;

          let value: CellValue = rows[ri][ci];
          if (!value.toString().startsWith('=')) {
            const num = parseFloat(value.toString());
            if (!isNaN(num) && value.toString().trim() !== '') {
              value = num;
            }
          }

          updateCell(projectId, sheet.id, targetRow.id, targetCol.id, value);
          newSelectedCells.push({ rowId: targetRow.id, columnId: targetCol.id });
        }
      }

      if (newSelectedCells.length > 0) {
        setSelectedCells(newSelectedCells);
      }
    } else if (clipboardData) {
      const { bounds } = clipboardData;
      const startRowIdx = sheet.rows.findIndex(r => r.id === selectedCell.rowId);
      const startColIdx = sheet.columns.findIndex(c => c.id === selectedCell.columnId);

      if (startRowIdx === -1 || startColIdx === -1) return;

      const newSelectedCells: CellPosition[] = [];

      for (const cell of clipboardData.cells) {
        const srcRowIdx = sheet.rows.findIndex(r => r.id === cell.rowId);
        const srcColIdx = sheet.columns.findIndex(c => c.id === cell.columnId);

        const offsetRow = srcRowIdx - bounds.minRowIdx;
        const offsetCol = srcColIdx - bounds.minColIdx;

        const targetRowIdx = startRowIdx + offsetRow;
        const targetColIdx = startColIdx + offsetCol;

        if (targetRowIdx >= sheet.rows.length || targetColIdx >= sheet.columns.length) continue;

        const targetRow = sheet.rows[targetRowIdx];
        const targetCol = sheet.columns[targetColIdx];

        if (targetCol.locked || targetRow.locked) continue;

        updateCell(projectId, sheet.id, targetRow.id, targetCol.id, cell.value);
        newSelectedCells.push({ rowId: targetRow.id, columnId: targetCol.id });
      }

      if (newSelectedCells.length > 0) {
        setSelectedCells(newSelectedCells);
      }
    }
  }, [selectedCell, clipboardData, sheet.rows, sheet.columns, projectId, sheet.id, updateCell]);

  // 잘라내기
  const cutSelectedCells = useCallback(() => {
    copySelectedCells();
    clearSelectedCells();
  }, [copySelectedCells, clearSelectedCells]);

  return {
    // 상태
    selectedCell,
    selectedCells,
    selectedCellsSet,
    formulaBarValue,
    clipboardData,

    // refs
    isDraggingRef,
    dragStartCellRef,
    lastSelectedCellRef,

    // setters
    setSelectedCell,
    setSelectedCells,
    setFormulaBarValue,

    // 핸들러
    isRowSelected,
    handleRowSelect,
    handleSelectAll,
    isCellSelected,
    selectCell,
    calculateDragSelection,
    copySelectedCells,
    clearSelectedCells,
    pasteToSelectedCells,
    cutSelectedCells,
  };
}
