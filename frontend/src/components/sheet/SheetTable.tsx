'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Plus, Trash2, Edit3, Wand2, CheckCircle2, Lock, Unlock, AlertTriangle, Check, X } from 'lucide-react';
import { useProjectStore, type SelectedRowData } from '@/stores/projectStore';
import { evaluateFormula } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';
import type { Sheet, Row, Column, CellValue } from '@/types';
import { validateCellValue } from '@/lib/validation';
import FormulaAutocomplete from './FormulaAutocomplete';
import FormulaHint from './FormulaHint';
import ColumnModal from './ColumnModal';
import { useTranslations } from 'next-intl';

interface SheetTableProps {
  projectId: string;
  sheet: Sheet;
}


export default function SheetTable({ projectId, sheet }: SheetTableProps) {
  const t = useTranslations();
  const { updateCell, addRow, deleteRow, addColumn, deleteColumn, updateColumn, updateRow, toggleRowSelection, selectedRows } = useProjectStore();
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedCells, setSelectedCells] = useState<{ rowId: string; columnId: string }[]>([]);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isFormulaBarFocused, setIsFormulaBarFocused] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditValue, setBulkEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);
  const lastSelectedCellRef = useRef<{ rowId: string; columnId: string } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartCellRef = useRef<{ rowId: string; columnId: string } | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // 채우기 핸들 상태
  const [isFillDragging, setIsFillDragging] = useState(false);
  const [fillPreviewCells, setFillPreviewCells] = useState<{ rowId: string; columnId: string }[]>([]);
  const fillStartCellRef = useRef<{ rowId: string; columnId: string } | null>(null);

  // 셀 이동 드래그 상태
  const [isMoveDragging, setIsMoveDragging] = useState(false);
  const [moveTargetCell, setMoveTargetCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const moveStartCellRef = useRef<{ rowId: string; columnId: string; value: CellValue } | null>(null);

  // 클립보드 데이터 (복사된 셀 정보)
  const [clipboardData, setClipboardData] = useState<{
    cells: { rowId: string; columnId: string; value: CellValue }[];
    bounds: { minRowIdx: number; maxRowIdx: number; minColIdx: number; maxColIdx: number };
  } | null>(null);

  // 체크박스 드래그 선택 상태
  const [isCheckboxDragging, setIsCheckboxDragging] = useState(false);
  const checkboxDragModeRef = useRef<'select' | 'deselect' | null>(null); // 선택 모드인지 해제 모드인지
  const lastDragRowIndexRef = useRef<number | null>(null); // 마지막으로 처리한 행 인덱스 (빠른 드래그 시 건너뛴 행 처리용)

  // 컬럼 너비 초기화
  useEffect(() => {
    const widths: Record<string, number> = { rowNumber: 80 };
    sheet.columns.forEach((col) => {
      widths[col.id] = col.width || 150;
    });
    setColumnWidths(widths);
  }, [sheet.columns]);

  // 테이블 전체 너비 계산
  const tableWidth = useMemo(() => {
    const rowNumberWidth = columnWidths['rowNumber'] || 80;
    const dataColumnsWidth = sheet.columns.reduce((sum, col) => sum + (columnWidths[col.id] || 150), 0);
    const actionsWidth = 36; // 삭제 버튼 컬럼
    return rowNumberWidth + dataColumnsWidth + actionsWidth;
  }, [sheet.columns, columnWidths]);

  // 컬럼 리사이즈 핸들러
  const handleResizeStart = useCallback((columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);

    const startX = e.clientX;
    const startWidth = columnWidths[columnId] || 150;
    let finalWidth = startWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      finalWidth = Math.max(60, startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [columnId]: finalWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 컬럼 너비를 store에 저장 (다음 이벤트 루프에서 실행)
      if (columnId !== 'rowNumber') {
        setTimeout(() => {
          updateColumn(projectId, sheet.id, columnId, { width: finalWidth });
        }, 0);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, projectId, sheet.id, updateColumn]);

  const projects = useProjectStore((state) => state.projects);
  const currentProject = projects.find((p) => p.id === projectId);

  // 행이 선택되었는지 확인
  const isRowSelected = useCallback((rowId: string) => {
    return selectedRows.some((r) => r.rowId === rowId);
  }, [selectedRows]);

  // 행 선택 토글
  const handleRowSelect = useCallback((row: Row) => {
    // 행 이름 찾기 (이름 또는 ID 컬럼에서)
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

    // 값 추출
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

    // 전부 선택되어 있으면 전체 해제, 아니면 전체 선택
    sheet.rows.forEach(row => {
      const currentlySelected = isRowSelected(row.id);
      if (allSelected) {
        // 전체 해제: 선택된 것만 해제
        if (currentlySelected) handleRowSelect(row);
      } else {
        // 전체 선택: 선택 안 된 것만 선택
        if (!currentlySelected) handleRowSelect(row);
      }
    });
  }, [sheet.rows, isRowSelected, handleRowSelect]);

  // 행 번호 영역 드래그 시작 (# 영역 전체)
  const handleRowNumberDragStart = useCallback((row: Row, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const wasSelected = isRowSelected(row.id);
    // 첫 번째 행이 선택되어 있었으면 해제 모드, 아니면 선택 모드
    checkboxDragModeRef.current = wasSelected ? 'deselect' : 'select';

    // 시작 행 인덱스 저장
    const rowIndex = sheet.rows.findIndex(r => r.id === row.id);
    lastDragRowIndexRef.current = rowIndex;

    setIsCheckboxDragging(true);

    // 첫 번째 행 처리
    handleRowSelect(row);
  }, [isRowSelected, handleRowSelect, sheet.rows]);

  // 체크박스 드래그 중 (행 위를 지나갈 때)
  const handleCheckboxDragEnter = useCallback((row: Row) => {
    if (!isCheckboxDragging || !checkboxDragModeRef.current) return;

    const currentRowIndex = sheet.rows.findIndex(r => r.id === row.id);
    if (currentRowIndex === -1) return;

    const lastIndex = lastDragRowIndexRef.current;

    // 빠른 드래그로 건너뛴 행들 모두 처리
    if (lastIndex !== null && lastIndex !== currentRowIndex) {
      const start = Math.min(lastIndex, currentRowIndex);
      const end = Math.max(lastIndex, currentRowIndex);

      for (let i = start; i <= end; i++) {
        const targetRow = sheet.rows[i];
        const targetSelected = isRowSelected(targetRow.id);

        // 모드에 따라 선택/해제
        if (checkboxDragModeRef.current === 'select' && !targetSelected) {
          handleRowSelect(targetRow);
        } else if (checkboxDragModeRef.current === 'deselect' && targetSelected) {
          handleRowSelect(targetRow);
        }
      }
    } else {
      // 단일 행 처리 (첫 진입 또는 같은 행)
      const currentlySelected = isRowSelected(row.id);
      if (checkboxDragModeRef.current === 'select' && !currentlySelected) {
        handleRowSelect(row);
      } else if (checkboxDragModeRef.current === 'deselect' && currentlySelected) {
        handleRowSelect(row);
      }
    }

    lastDragRowIndexRef.current = currentRowIndex;
  }, [isCheckboxDragging, isRowSelected, handleRowSelect, sheet.rows]);

  // 체크박스 드래그 종료 (글로벌 마우스업)
  useEffect(() => {
    if (!isCheckboxDragging) return;

    const handleMouseUp = () => {
      setIsCheckboxDragging(false);
      checkboxDragModeRef.current = null;
      lastDragRowIndexRef.current = null;
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [isCheckboxDragging]);

  // 수식 시작 감지
  useEffect(() => {
    if (editValue.startsWith('=') && editValue.length > 1) {
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, [editValue]);

  // 모든 행의 계산된 값을 저장 (이전행 참조용)
  // 순차적으로 계산하여 이전 행의 결과를 다음 행이 참조할 수 있게 함
  const computedRows = useMemo(() => {
    const result: Record<string, CellValue>[] = [];

    for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
      const row = sheet.rows[rowIndex];
      const computedRow: Record<string, CellValue> = { ...row.cells };

      // 각 컬럼에 대해 값 계산
      // 중요: 같은 행의 이전 컬럼이 이미 계산되었으면 그 결과를 사용하기 위해
      // computedRow를 currentRow로 전달 (수식 컬럼 간 참조 지원)
      for (const column of sheet.columns) {
        const rawValue = row.cells[column.id];

        // 셀 자체에 수식이 있는 경우 (셀 수식 우선)
        if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
          const evalResult = evaluateFormula(rawValue, {
            sheets: currentProject?.sheets || [],
            currentSheet: sheet,
            currentRow: computedRow,  // 이미 계산된 값 포함
            currentRowIndex: rowIndex,
            allRows: result,  // 이전 행들의 계산된 결과
          });
          computedRow[column.id] = evalResult.error ? `#ERR: ${evalResult.error}` : evalResult.value;
          continue;
        }

        // 셀에 직접 값이 있으면 그 값 사용 (오버라이드)
        if (rawValue !== null && rawValue !== undefined) {
          computedRow[column.id] = rawValue;
          continue;
        }

        // 셀이 비어있고 컬럼이 formula 타입이면 컬럼 수식 사용
        if (column.type === 'formula' && column.formula) {
          const evalResult = evaluateFormula(column.formula, {
            sheets: currentProject?.sheets || [],
            currentSheet: sheet,
            currentRow: computedRow,  // 이미 계산된 값 포함
            currentRowIndex: rowIndex,
            allRows: result,  // 이전 행들의 계산된 결과
          });
          computedRow[column.id] = evalResult.error ? `#ERR: ${evalResult.error}` : evalResult.value;
          continue;
        }

        computedRow[column.id] = rawValue;
      }

      result.push(computedRow);
    }

    return result;
  }, [sheet.rows, sheet.columns, currentProject?.sheets, sheet]);

  // 셀 값 계산 (수식 포함) - 이제 computedRows 사용
  const getCellValue = useCallback(
    (row: Row, column: Column): CellValue => {
      const rowIndex = sheet.rows.findIndex(r => r.id === row.id);
      if (rowIndex >= 0 && computedRows[rowIndex]) {
        return computedRows[rowIndex][column.id];
      }
      return row.cells[column.id];
    },
    [sheet.rows, computedRows]
  );

  // 셀이 선택되었는지 확인
  const isCellSelected = useCallback(
    (rowId: string, columnId: string) => {
      return selectedCells.some((c) => c.rowId === rowId && c.columnId === columnId);
    },
    [selectedCells]
  );

  // 셀 선택 (클릭 시) - 다중 선택 지원
  const selectCell = useCallback(
    (rowId: string, columnId: string, e?: React.MouseEvent) => {
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

        const rangeCells: { rowId: string; columnId: string }[] = [];
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
    [sheet.rows, sheet.columns]
  );

  // 셀 편집 시작 (더블클릭 또는 수식바 포커스)
  const startEditing = useCallback(
    (rowId: string, columnId: string) => {
      // 잠금 체크
      const column = sheet.columns.find((c) => c.id === columnId);
      const row = sheet.rows.find((r) => r.id === rowId);

      if (column?.locked || row?.locked) {
        // 잠긴 셀은 편집 불가
        return;
      }

      setEditingCell({ rowId, columnId });
      setSelectedCell({ rowId, columnId });
      // 원본 값 (수식이면 수식 그대로)
      const rawValue = row?.cells[columnId];
      const value = rawValue?.toString() || '';
      setEditValue(value);
      setFormulaBarValue(value);
    },
    [sheet.rows, sheet.columns]
  );

  // 유효성 검사 에러 상태
  const [validationError, setValidationError] = useState<string | null>(null);

  // 셀 편집 완료 (셀 내부 편집에서만 호출)
  const finishEditing = useCallback((valueToSave?: string) => {
    if (!editingCell) return;

    const finalValue = valueToSave !== undefined ? valueToSave : editValue;
    let value: CellValue = finalValue;

    // 수식이 아니면 숫자 변환 시도 (자동 감지)
    if (!finalValue.startsWith('=')) {
      const num = parseFloat(finalValue);
      if (!isNaN(num) && finalValue.trim() !== '') {
        value = num;
      }
    }

    // 유효성 검사
    const column = sheet.columns.find((c) => c.id === editingCell.columnId);
    if (column?.validation && !finalValue.startsWith('=')) {
      const result = validateCellValue(value, column.validation);
      if (!result.isValid) {
        setValidationError(result.error || t('table.invalidValue'));
        // 에러가 있어도 저장은 하되 경고 표시
        setTimeout(() => setValidationError(null), 3000);
      }
    }

    updateCell(projectId, sheet.id, editingCell.rowId, editingCell.columnId, value);
    setEditingCell(null);
    setEditValue('');
    setShowAutocomplete(false);
    // 포뮬라 바 값도 업데이트
    setFormulaBarValue(finalValue);
  }, [editingCell, editValue, projectId, sheet.id, updateCell, sheet.columns]);

  // 수식바에서 편집 완료
  const finishFormulaBarEditing = useCallback(() => {
    if (!selectedCell) return;

    let value: CellValue = formulaBarValue;

    // 수식이 아니면 숫자 변환 시도 (자동 감지)
    if (!formulaBarValue.startsWith('=')) {
      const num = parseFloat(formulaBarValue);
      if (!isNaN(num) && formulaBarValue.trim() !== '') {
        value = num;
      }
    }

    updateCell(projectId, sheet.id, selectedCell.rowId, selectedCell.columnId, value);
    setIsFormulaBarFocused(false);
  }, [selectedCell, formulaBarValue, projectId, sheet.id, updateCell]);

  // 선택된 셀들에 일괄 값 적용
  const applyBulkEdit = useCallback(() => {
    if (selectedCells.length === 0 || !bulkEditValue.trim()) return;

    let value: CellValue = bulkEditValue;

    // 수식이 아니면 숫자 변환 시도
    if (!bulkEditValue.startsWith('=')) {
      const num = parseFloat(bulkEditValue);
      if (!isNaN(num) && bulkEditValue.trim() !== '') {
        value = num;
      }
    }

    // 모든 선택된 셀에 값 적용
    for (const cell of selectedCells) {
      updateCell(projectId, sheet.id, cell.rowId, cell.columnId, value);
    }

    setShowBulkEdit(false);
    setBulkEditValue('');
    setSelectedCells([]);
  }, [selectedCells, bulkEditValue, projectId, sheet.id, updateCell]);

  // 선택된 셀들 지우기
  const clearSelectedCells = useCallback(() => {
    for (const cell of selectedCells) {
      updateCell(projectId, sheet.id, cell.rowId, cell.columnId, '');
    }
    // 수식바 값도 동기화 (선택된 셀이 삭제된 셀 중 하나면 빈 값으로)
    if (selectedCell && selectedCells.some(c => c.rowId === selectedCell.rowId && c.columnId === selectedCell.columnId)) {
      setFormulaBarValue('');
    }
    setSelectedCells([]);
  }, [selectedCells, selectedCell, projectId, sheet.id, updateCell]);

  // 선택된 셀들 복사 (Ctrl+C)
  const copySelectedCells = useCallback(() => {
    if (selectedCells.length === 0) return;

    // 선택된 셀들의 범위 계산
    const rowIndices = selectedCells.map(c => sheet.rows.findIndex(r => r.id === c.rowId));
    const colIndices = selectedCells.map(c => sheet.columns.findIndex(col => col.id === c.columnId));

    const minRowIdx = Math.min(...rowIndices);
    const maxRowIdx = Math.max(...rowIndices);
    const minColIdx = Math.min(...colIndices);
    const maxColIdx = Math.max(...colIndices);

    // 셀 데이터 수집 (원본 값 - 수식 포함)
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

    // 시스템 클립보드에도 텍스트로 복사 (탭/줄바꿈 구분)
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
    navigator.clipboard.writeText(text).catch(() => {
      // 클립보드 접근 실패 시 무시
    });
  }, [selectedCells, sheet.rows, sheet.columns]);

  // 붙여넣기 (Ctrl+V)
  const pasteToSelectedCells = useCallback(async () => {
    if (!selectedCell) return;

    // 시스템 클립보드에서 텍스트 읽기
    let clipboardText = '';
    try {
      clipboardText = await navigator.clipboard.readText();
    } catch {
      // 클립보드 접근 실패
    }

    // 클립보드 텍스트가 있으면 파싱하여 붙여넣기
    if (clipboardText) {
      const rows = clipboardText.split('\n').map(line => line.split('\t'));

      // 선택된 셀 위치
      const startRowIdx = sheet.rows.findIndex(r => r.id === selectedCell.rowId);
      const startColIdx = sheet.columns.findIndex(c => c.id === selectedCell.columnId);

      if (startRowIdx === -1 || startColIdx === -1) return;

      const newSelectedCells: { rowId: string; columnId: string }[] = [];

      // 각 셀에 값 붙여넣기
      for (let ri = 0; ri < rows.length; ri++) {
        const targetRowIdx = startRowIdx + ri;
        if (targetRowIdx >= sheet.rows.length) break;

        const targetRow = sheet.rows[targetRowIdx];

        for (let ci = 0; ci < rows[ri].length; ci++) {
          const targetColIdx = startColIdx + ci;
          if (targetColIdx >= sheet.columns.length) break;

          const targetCol = sheet.columns[targetColIdx];

          // 잠금 체크
          if (targetCol.locked || targetRow.locked) continue;

          let value: CellValue = rows[ri][ci];

          // 수식이 아니면 숫자 변환 시도
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

      // 붙여넣은 셀들 선택
      if (newSelectedCells.length > 0) {
        setSelectedCells(newSelectedCells);
      }
    }
    // 내부 클립보드 데이터 사용 (시스템 클립보드 없을 때 폴백)
    else if (clipboardData) {
      const { bounds } = clipboardData;
      const startRowIdx = sheet.rows.findIndex(r => r.id === selectedCell.rowId);
      const startColIdx = sheet.columns.findIndex(c => c.id === selectedCell.columnId);

      if (startRowIdx === -1 || startColIdx === -1) return;

      const newSelectedCells: { rowId: string; columnId: string }[] = [];

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

        // 잠금 체크
        if (targetCol.locked || targetRow.locked) continue;

        updateCell(projectId, sheet.id, targetRow.id, targetCol.id, cell.value);
        newSelectedCells.push({ rowId: targetRow.id, columnId: targetCol.id });
      }

      if (newSelectedCells.length > 0) {
        setSelectedCells(newSelectedCells);
      }
    }
  }, [selectedCell, clipboardData, sheet.rows, sheet.columns, projectId, sheet.id, updateCell]);

  // 드래그로 범위 선택 계산
  const calculateDragSelection = useCallback(
    (startCell: { rowId: string; columnId: string }, endCell: { rowId: string; columnId: string }) => {
      const startRowIdx = sheet.rows.findIndex((r) => r.id === startCell.rowId);
      const endRowIdx = sheet.rows.findIndex((r) => r.id === endCell.rowId);
      const startColIdx = sheet.columns.findIndex((c) => c.id === startCell.columnId);
      const endColIdx = sheet.columns.findIndex((c) => c.id === endCell.columnId);

      const minRowIdx = Math.min(startRowIdx, endRowIdx);
      const maxRowIdx = Math.max(startRowIdx, endRowIdx);
      const minColIdx = Math.min(startColIdx, endColIdx);
      const maxColIdx = Math.max(startColIdx, endColIdx);

      const rangeCells: { rowId: string; columnId: string }[] = [];
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

  // 드래그 시작
  const handleCellMouseDown = useCallback(
    (rowId: string, columnId: string, e: React.MouseEvent) => {
      // Ctrl/Cmd나 Shift가 눌려있으면 기존 로직 사용
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

      // 왼쪽 마우스 버튼만
      if (e.button !== 0) return;

      isDraggingRef.current = true;
      dragStartCellRef.current = { rowId, columnId };
      setSelectedCell({ rowId, columnId });
      setSelectedCells([{ rowId, columnId }]);
      lastSelectedCellRef.current = { rowId, columnId };

      // 원본 값을 수식 바에 표시
      const row = sheet.rows.find((r) => r.id === rowId);
      const rawValue = row?.cells[columnId];
      setFormulaBarValue(rawValue?.toString() || '');
    },
    [sheet.rows]
  );

  // 드래그 중
  const handleCellMouseEnter = useCallback(
    (rowId: string, columnId: string) => {
      if (!isDraggingRef.current || !dragStartCellRef.current) return;

      const rangeCells = calculateDragSelection(dragStartCellRef.current, { rowId, columnId });
      setSelectedCells(rangeCells);
      setSelectedCell({ rowId, columnId });
    },
    [calculateDragSelection]
  );

  // 드래그 종료 (전역 이벤트)
  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // 수식 내 행 참조 조정 (PREV, ROW 등)
  const adjustFormulaForRow = useCallback((formula: string, sourceRowIdx: number, targetRowIdx: number): string => {
    // PREV() 함수는 그대로 유지 (상대 참조)
    // ROW() 함수도 그대로 유지 (현재 행 반환)
    // 다른 시트 참조 등도 그대로 유지
    // 기본적으로 수식은 그대로 복사됨 (상대 참조 방식)
    return formula;
  }, []);

  // 채우기 핸들 드래그 시작
  const handleFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedCell) return;

    setIsFillDragging(true);
    fillStartCellRef.current = selectedCell;
    setFillPreviewCells([]);
  }, [selectedCell]);

  // 채우기 핸들 드래그 중 (셀 위로 이동 시)
  const handleFillDragEnter = useCallback((rowId: string, columnId: string) => {
    if (!isFillDragging || !fillStartCellRef.current) return;

    const startCell = fillStartCellRef.current;
    const startRowIdx = sheet.rows.findIndex(r => r.id === startCell.rowId);
    const startColIdx = sheet.columns.findIndex(c => c.id === startCell.columnId);
    const endRowIdx = sheet.rows.findIndex(r => r.id === rowId);
    const endColIdx = sheet.columns.findIndex(c => c.id === columnId);

    // 시작 셀은 제외하고 드래그한 범위의 셀들
    const previewCells: { rowId: string; columnId: string }[] = [];

    // 세로 방향 채우기 (같은 열)
    if (startColIdx === endColIdx) {
      const minRow = Math.min(startRowIdx, endRowIdx);
      const maxRow = Math.max(startRowIdx, endRowIdx);
      for (let ri = minRow; ri <= maxRow; ri++) {
        if (ri !== startRowIdx) {
          previewCells.push({
            rowId: sheet.rows[ri].id,
            columnId: startCell.columnId,
          });
        }
      }
    }
    // 가로 방향 채우기 (같은 행)
    else if (startRowIdx === endRowIdx) {
      const minCol = Math.min(startColIdx, endColIdx);
      const maxCol = Math.max(startColIdx, endColIdx);
      for (let ci = minCol; ci <= maxCol; ci++) {
        if (ci !== startColIdx) {
          previewCells.push({
            rowId: startCell.rowId,
            columnId: sheet.columns[ci].id,
          });
        }
      }
    }
    // 대각선/직사각형 채우기
    else {
      const minRow = Math.min(startRowIdx, endRowIdx);
      const maxRow = Math.max(startRowIdx, endRowIdx);
      const minCol = Math.min(startColIdx, endColIdx);
      const maxCol = Math.max(startColIdx, endColIdx);
      for (let ri = minRow; ri <= maxRow; ri++) {
        for (let ci = minCol; ci <= maxCol; ci++) {
          if (ri !== startRowIdx || ci !== startColIdx) {
            previewCells.push({
              rowId: sheet.rows[ri].id,
              columnId: sheet.columns[ci].id,
            });
          }
        }
      }
    }

    setFillPreviewCells(previewCells);
  }, [isFillDragging, sheet.rows, sheet.columns]);

  // 채우기 핸들 드래그 종료 - 값/수식 복사
  const handleFillDragEnd = useCallback(() => {
    if (!isFillDragging || !fillStartCellRef.current || fillPreviewCells.length === 0) {
      setIsFillDragging(false);
      setFillPreviewCells([]);
      fillStartCellRef.current = null;
      return;
    }

    const startCell = fillStartCellRef.current;
    const startRow = sheet.rows.find(r => r.id === startCell.rowId);
    const startRowIdx = sheet.rows.findIndex(r => r.id === startCell.rowId);

    if (!startRow) {
      setIsFillDragging(false);
      setFillPreviewCells([]);
      fillStartCellRef.current = null;
      return;
    }

    // 소스 셀의 원본 값 (수식 포함)
    const sourceValue = startRow.cells[startCell.columnId];

    // 각 대상 셀에 값 복사
    for (const targetCell of fillPreviewCells) {
      const targetRow = sheet.rows.find(r => r.id === targetCell.rowId);
      const targetCol = sheet.columns.find(c => c.id === targetCell.columnId);
      const targetRowIdx = sheet.rows.findIndex(r => r.id === targetCell.rowId);

      if (!targetRow || !targetCol) continue;

      // 잠금 체크
      if (targetCol.locked || targetRow.locked) continue;

      let valueToSet: CellValue = sourceValue;

      // 수식인 경우 행 인덱스에 따라 조정
      if (typeof sourceValue === 'string' && sourceValue.startsWith('=')) {
        valueToSet = adjustFormulaForRow(sourceValue, startRowIdx, targetRowIdx);
      }

      updateCell(projectId, sheet.id, targetCell.rowId, targetCell.columnId, valueToSet);
    }

    // 채우기가 끝나면 채워진 셀들 선택
    setSelectedCells([{ rowId: startCell.rowId, columnId: startCell.columnId }, ...fillPreviewCells]);

    setIsFillDragging(false);
    setFillPreviewCells([]);
    fillStartCellRef.current = null;
  }, [isFillDragging, fillPreviewCells, sheet.rows, sheet.columns, projectId, sheet.id, updateCell, adjustFormulaForRow]);

  // 채우기 드래그 전역 이벤트
  useEffect(() => {
    const handleMouseUp = () => {
      if (isFillDragging) {
        handleFillDragEnd();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isFillDragging, handleFillDragEnd]);

  // 셀 이동 드래그 시작 (선택된 셀에서 다시 마우스다운 후 드래그)
  const handleMoveStart = useCallback((rowId: string, columnId: string, e: React.MouseEvent) => {
    // 채우기 핸들 드래그 중이면 무시
    if (isFillDragging) return;

    const row = sheet.rows.find(r => r.id === rowId);
    const col = sheet.columns.find(c => c.id === columnId);
    if (!row || !col) return;

    // 잠금된 셀이면 이동 불가
    if (col.locked || row.locked) return;

    const value = row.cells[columnId];

    setIsMoveDragging(true);
    moveStartCellRef.current = { rowId, columnId, value };
    setMoveTargetCell(null);
  }, [isFillDragging, sheet.rows, sheet.columns]);

  // 셀 이동 드래그 중 (다른 셀로 이동)
  const handleMoveDragEnter = useCallback((rowId: string, columnId: string) => {
    if (!isMoveDragging || !moveStartCellRef.current) return;

    // 시작 셀과 같으면 대상 없음
    if (rowId === moveStartCellRef.current.rowId && columnId === moveStartCellRef.current.columnId) {
      setMoveTargetCell(null);
      return;
    }

    const targetRow = sheet.rows.find(r => r.id === rowId);
    const targetCol = sheet.columns.find(c => c.id === columnId);

    // 잠금 셀이면 이동 불가
    if (!targetRow || !targetCol || targetCol.locked || targetRow.locked) {
      setMoveTargetCell(null);
      return;
    }

    setMoveTargetCell({ rowId, columnId });
  }, [isMoveDragging, sheet.rows, sheet.columns]);

  // 셀 이동 드래그 완료
  const handleMoveDragEnd = useCallback(() => {
    if (!isMoveDragging || !moveStartCellRef.current) {
      setIsMoveDragging(false);
      setMoveTargetCell(null);
      moveStartCellRef.current = null;
      return;
    }

    if (moveTargetCell) {
      const startCell = moveStartCellRef.current;

      // 시작 셀의 값을 대상 셀로 이동
      updateCell(projectId, sheet.id, moveTargetCell.rowId, moveTargetCell.columnId, startCell.value);

      // 시작 셀은 빈 값으로
      updateCell(projectId, sheet.id, startCell.rowId, startCell.columnId, '');

      // 이동된 셀 선택
      setSelectedCell({ rowId: moveTargetCell.rowId, columnId: moveTargetCell.columnId });
      setSelectedCells([{ rowId: moveTargetCell.rowId, columnId: moveTargetCell.columnId }]);
    }

    setIsMoveDragging(false);
    setMoveTargetCell(null);
    moveStartCellRef.current = null;
  }, [isMoveDragging, moveTargetCell, projectId, sheet.id, updateCell]);

  // 이동 드래그 전역 이벤트
  useEffect(() => {
    const handleMouseUp = () => {
      if (isMoveDragging) {
        handleMoveDragEnd();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isMoveDragging, handleMoveDragEnd]);

  // 전역 키보드 이벤트 (복사, 붙여넣기, 삭제)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // input이나 textarea에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // 편집 모드에서는 무시
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
      // Delete 또는 Backspace: 선택된 셀 내용 삭제
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCells.length > 0) {
          e.preventDefault();
          clearSelectedCells();
        }
      }
      // 일반 문자 입력 시 바로 편집 모드로 진입
      else if (
        selectedCell &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        // 잠긴 셀인지 확인
        const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
        const column = sheet.columns.find((c) => c.id === selectedCell.columnId);
        if (column?.locked || row?.locked) return;

        e.preventDefault();
        // 편집 모드 진입 + 입력한 문자로 시작
        setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
        setEditValue(e.key);
        setFormulaBarValue(e.key);
      }
      // F2: 편집 모드 진입
      else if (e.key === 'F2' && selectedCell) {
        e.preventDefault();
        startEditing(selectedCell.rowId, selectedCell.columnId);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editingCell, selectedCells, selectedCell, copySelectedCells, pasteToSelectedCells, clearSelectedCells, sheet.rows, sheet.columns, startEditing]);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
        setShowAutocomplete(false);
        setIsFormulaBarFocused(false);
        // 원래 값 복원
        if (selectedCell) {
          const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
          const rawValue = row?.cells[selectedCell.columnId];
          setFormulaBarValue(rawValue?.toString() || '');
        }
      } else if (e.key === 'Tab' && showAutocomplete) {
        e.preventDefault();
        // Tab으로 첫 번째 자동완성 선택
      }
    },
    [finishEditing, showAutocomplete, selectedCell, sheet.rows]
  );

  // 수식바 키보드 이벤트
  const handleFormulaBarKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishFormulaBarEditing();
      } else if (e.key === 'Escape') {
        setIsFormulaBarFocused(false);
        // 원래 값 복원
        if (selectedCell) {
          const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
          const rawValue = row?.cells[selectedCell.columnId];
          setFormulaBarValue(rawValue?.toString() || '');
        }
      }
    },
    [finishFormulaBarEditing, selectedCell, sheet.rows]
  );

  // TanStack Table 컬럼 정의
  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const cols: ColumnDef<Row>[] = [
      // 행 선택 + 번호 컬럼
      {
        id: 'rowNumber',
        header: () => {
          const allSelected = sheet.rows.length > 0 && sheet.rows.every(r => isRowSelected(r.id));
          const someSelected = sheet.rows.some(r => isRowSelected(r.id));
          return (
            <button
              onClick={handleSelectAll}
              className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-[var(--bg-hover)] transition-colors rounded"
              title={allSelected ? t('table.deselectAll') : t('table.selectAll')}
            >
              <div
                className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                style={{
                  background: allSelected ? 'var(--primary-blue)' : someSelected ? 'var(--primary-blue-light)' : 'transparent',
                  borderColor: allSelected || someSelected ? 'var(--primary-blue)' : 'var(--border-secondary)',
                }}
              >
                {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
                {!allSelected && someSelected && <div className="w-2 h-0.5 rounded" style={{ background: 'var(--primary-blue)' }} />}
              </div>
            </button>
          );
        },
        cell: ({ row }) => {
          const selected = isRowSelected(row.original.id);
          const rowLocked = row.original.locked;
          return (
            <div
              className="flex items-center text-sm group/row h-full select-none cursor-pointer"
              onMouseDown={(e) => handleRowNumberDragStart(row.original, e)}
              onMouseEnter={() => handleCheckboxDragEnter(row.original)}
            >
              {/* 왼쪽 영역: 체크박스 (가운데 정렬) */}
              <div className="flex-1 flex items-center justify-center">
                <div
                  className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                  style={{
                    background: selected ? 'var(--primary-blue)' : 'transparent',
                    borderColor: selected ? 'var(--primary-blue)' : 'var(--border-secondary)',
                    color: selected ? 'white' : 'transparent'
                  }}
                >
                  {selected && <Check className="w-3 h-3" />}
                </div>
              </div>
              {/* 구분선 */}
              <div className="w-px h-5" style={{ background: 'var(--border-primary)' }} />
              {/* 오른쪽 영역: 숫자/잠금 (호버 시 전환) */}
              <div className="flex-1 flex items-center justify-center relative">
                {/* 숫자 - 호버 시 숨김 (잠금 상태면 항상 숨김) */}
                <span
                  className={`text-center transition-opacity ${rowLocked ? 'opacity-0' : 'group-hover/row:opacity-0'}`}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {row.index + 1}
                </span>
                {/* 잠금 버튼 - 호버 시 표시 (잠금 상태면 항상 표시) */}
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateRow(projectId, sheet.id, row.original.id, { locked: !rowLocked });
                  }}
                  className={`absolute inset-0 flex items-center justify-center transition-opacity ${rowLocked ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}
                  style={{ color: rowLocked ? 'var(--warning)' : 'var(--text-tertiary)' }}
                  title={rowLocked ? t('table.unlockRow') : t('table.lockRow')}
                >
                  {rowLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        },
        size: 100,
      },
    ];

    // 데이터 컬럼들
    for (const col of sheet.columns) {
      cols.push({
        id: col.id,
        accessorFn: (row) => getCellValue(row, col),
        header: () => (
          <div className="group/col flex items-center justify-center relative h-full overflow-hidden">
            {/* 컬럼 이름 + 타입 + 잠금 - 호버 시 숨김 */}
            <div className="flex items-center gap-1 min-w-0 transition-opacity group-hover/col:opacity-0">
              {col.locked && (
                <Lock className="w-3 h-3 shrink-0" style={{ color: 'var(--warning)' }} />
              )}
              <span className="font-medium truncate">{col.name}</span>
              {col.type === 'formula' && (
                <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>ƒ</span>
              )}
              {col.validation && (
                <span title={t('table.validationSet')} className="shrink-0"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--primary-green)' }} /></span>
              )}
            </div>
            {/* 호버 시 버튼 표시 - 같은 위치에 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateColumn(projectId, sheet.id, col.id, { locked: !col.locked });
                }}
                className="p-0.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                style={{ color: col.locked ? 'var(--warning)' : 'var(--text-tertiary)' }}
                title={col.locked ? t('table.unlockColumn') : t('table.lockColumn')}
              >
                {col.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingColumn(col);
                }}
                className="p-0.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-blue)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                title={t('table.editColumn')}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${col.name}" 열을 삭제하시겠습니까?`)) {
                    deleteColumn(projectId, sheet.id, col.id);
                  }
                }}
                className="p-0.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                title={t('table.deleteColumn')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ),
        cell: ({ row, getValue }) => {
          const value = getValue() as CellValue;
          const isEditing =
            editingCell?.rowId === row.original.id && editingCell?.columnId === col.id;
          const isFormulaColumn = col.type === 'formula';
          const cellRawValue = row.original.cells[col.id];
          const cellHasFormula =
            typeof cellRawValue === 'string' &&
            String(cellRawValue).startsWith('=');
          // 셀에 오버라이드 값이 있는지 (formula 컬럼인데 셀에 직접 값이 있음)
          const hasCellOverride = isFormulaColumn && cellRawValue !== null && cellRawValue !== undefined;
          // 컬럼 기본 수식을 사용하는지
          const usesColumnFormula = isFormulaColumn && !hasCellOverride;

          if (isEditing) {
            return (
              <div className="relative">
                <input
                  ref={inputRef}
                  key={`edit-${row.original.id}-${col.id}`}
                  type="text"
                  defaultValue={editValue}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    setFormulaBarValue(target.value);
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLInputElement;
                    // 약간의 딜레이로 자동완성 클릭 가능하게
                    setTimeout(() => {
                      if (!showAutocomplete) {
                        finishEditing(target.value);
                      }
                    }, 150);
                  }}
                  onKeyDown={(e) => {
                    // 한글 조합 중이면 Enter 키 무시 (keyCode 229는 조합 중)
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      finishEditing(target.value);
                    } else if (e.key === 'Escape') {
                      setEditingCell(null);
                      setEditValue('');
                      setShowAutocomplete(false);
                    }
                  }}
                  autoFocus
                  className="w-full px-2 py-1 border rounded outline-none"
                  style={{
                    background: editValue.startsWith('=') ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
                    borderColor: editValue.startsWith('=') ? 'var(--primary-purple)' : 'var(--accent)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder={isFormulaColumn ? t('table.defaultFormula', { formula: col.formula || t('table.noFormula') }) : ''}
                />
                {/* 수식 입력 시 힌트 */}
                {editValue.startsWith('=') && <FormulaHint formula={editValue} />}
                {/* 자동완성 */}
                {showAutocomplete && (
                  <FormulaAutocomplete
                    value={inputRef.current?.value || editValue}
                    columns={sheet.columns}
                    onSelect={(newValue) => {
                      if (inputRef.current) {
                        inputRef.current.value = newValue;
                        inputRef.current.focus();
                      }
                      setFormulaBarValue(newValue);
                    }}
                  />
                )}
              </div>
            );
          }

          // 표시할 값 포맷팅 (긴 숫자는 소수점 제한)
          const displayValue = (() => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'number') {
              // 정수면 그대로, 소수면 최대 4자리까지
              if (Number.isInteger(value)) return value.toLocaleString();
              return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
            }
            return String(value);
          })();

          // 셀에 실제 값이 있는지 확인 (빈 셀인지 체크) - 0은 유효한 값
          const hasValue = value !== null && value !== undefined && value !== '';

          // 잠금 상태 확인
          const isLocked = col.locked || row.original.locked;

          // 셀 배경색 결정 - 값이 있을 때만 색상 표시
          const getCellBackground = () => {
            // 잠금된 셀은 빨간 계열 배경
            if (isLocked) return 'var(--primary-red-light)';
            if (typeof value === 'string' && value.startsWith('#ERR')) return 'var(--error-light)';
            // 값이 있을 때만 수식/오버라이드 색상 표시
            if (hasValue && usesColumnFormula) return 'var(--primary-purple-light)';
            if (hasValue && hasCellOverride && isFormulaColumn) return 'var(--warning-light)';
            if (hasValue && cellHasFormula && !isFormulaColumn) return 'var(--primary-blue-light)';
            return 'transparent';
          };

          // 현재 셀이 선택되었는지 확인 (다중 선택 포함)
          const isSelected = selectedCell?.rowId === row.original.id && selectedCell?.columnId === col.id;
          const isMultiSelected = isCellSelected(row.original.id, col.id);
          // 채우기 미리보기 셀인지 확인
          const isFillPreview = fillPreviewCells.some(
            c => c.rowId === row.original.id && c.columnId === col.id
          );
          // 이동 대상 셀인지 확인
          const isMoveTarget = moveTargetCell?.rowId === row.original.id && moveTargetCell?.columnId === col.id;
          // 이동 시작 셀인지 확인
          const isMoveSource = isMoveDragging && moveStartCellRef.current?.rowId === row.original.id && moveStartCellRef.current?.columnId === col.id;

          return (
            <div
              onMouseDown={(e) => {
                // 더블클릭 중이면 무시 (더블클릭은 onDoubleClick에서 처리)
                if (e.detail >= 2) return;

                // 선택된 셀에서 다시 마우스다운하면 이동 드래그 시작
                if (isSelected && !editingCell) {
                  handleMoveStart(row.original.id, col.id, e);
                } else {
                  handleCellMouseDown(row.original.id, col.id, e);
                }
              }}
              onMouseEnter={() => {
                handleCellMouseEnter(row.original.id, col.id);
                // 채우기 드래그 중일 때도 처리
                if (isFillDragging) {
                  handleFillDragEnter(row.original.id, col.id);
                }
                // 이동 드래그 중일 때 처리
                if (isMoveDragging) {
                  handleMoveDragEnter(row.original.id, col.id);
                }
              }}
              onClick={(e) => {
                // 더블클릭의 첫 번째 클릭도 여기 옴
                if (e.detail === 1 && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                  // Ctrl/Cmd/Shift 클릭만 selectCell 로직 사용
                  selectCell(row.original.id, col.id, e);
                }
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                startEditing(row.original.id, col.id);
              }}
              className={`px-2 py-1 min-h-[32px] relative group overflow-hidden transition-colors select-none ${
                isSelected && !editingCell ? 'cursor-move' : 'cursor-cell'
              } ${isMoveSource ? 'opacity-50' : ''}`}
              style={{
                background: isMoveTarget
                  ? 'var(--accent-light)'
                  : isFillPreview
                    ? 'var(--primary-green-light)'
                    : isMultiSelected && !isSelected
                      ? 'var(--primary-blue-light)'
                      : getCellBackground(),
                color: typeof value === 'string' && value.startsWith('#ERR') ? 'var(--error)' : 'var(--text-primary)',
                outline: isMoveTarget
                  ? '2px solid var(--accent)'
                  : isFillPreview
                    ? '2px dashed var(--primary-green)'
                    : isSelected
                      ? '2px solid var(--primary-blue)'
                      : isMultiSelected
                        ? '1px solid var(--primary-blue)'
                        : 'none',
                outlineOffset: '-2px',
              }}
              title={
                usesColumnFormula ? `열 수식: ${col.formula}\n값: ${value}` :
                cellHasFormula ? `셀 수식: ${cellRawValue}\n값: ${value}` :
                hasCellOverride ? `셀 오버라이드 값: ${value}` :
                typeof value === 'number' ? String(value) : undefined
              }
            >
              <span className="truncate block">{displayValue}</span>
              {/* 잠금 표시 아이콘 */}
              {isLocked && (
                <Lock
                  className="absolute right-1 top-1 w-3 h-3"
                  style={{ color: 'var(--primary-red)' }}
                />
              )}
              {/* 수식 표시 아이콘 */}
              {!isLocked && (cellHasFormula || usesColumnFormula) && (
                <span
                  className="absolute right-1 top-1 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: usesColumnFormula ? 'var(--primary-purple)' : 'var(--primary-blue)' }}
                >
                  ƒ
                </span>
              )}
              {/* 오버라이드 표시 */}
              {!isLocked && hasCellOverride && isFormulaColumn && !cellHasFormula && (
                <span className="absolute right-1 top-1 text-xs opacity-0 group-hover:opacity-100" style={{ color: 'var(--warning)' }}>
                  ✎
                </span>
              )}
              {/* 채우기 핸들 (선택된 셀의 오른쪽 하단) */}
              {isSelected && !isEditing && !isLocked && (
                <div
                  onMouseDown={handleFillHandleMouseDown}
                  className="absolute bottom-0 right-0 w-3 h-3 cursor-crosshair z-10"
                  style={{
                    background: 'var(--primary-blue)',
                    border: '1px solid white',
                  }}
                  title={t('table.dragToFill')}
                />
              )}
            </div>
          );
        },
        size: col.width || 120,
      });
    }

    // 행 삭제 컬럼
    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => deleteRow(projectId, sheet.id, row.original.id)}
          className="p-1 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
      size: 36,
    });

    return cols;
  }, [
    sheet.columns,
    sheet.rows,
    editingCell,
    editValue,
    getCellValue,
    startEditing,
    finishEditing,
    handleKeyDown,
    deleteColumn,
    deleteRow,
    updateColumn,
    updateRow,
    projectId,
    sheet.id,
    showAutocomplete,
    isRowSelected,
    handleRowSelect,
    handleSelectAll,
    handleRowNumberDragStart,
    handleCheckboxDragEnter,
    selectCell,
    selectedCell,
    isCellSelected,
    handleCellMouseDown,
    handleCellMouseEnter,
    isFillDragging,
    fillPreviewCells,
    handleFillHandleMouseDown,
    handleFillDragEnter,
    isMoveDragging,
    moveTargetCell,
    handleMoveStart,
    handleMoveDragEnter,
  ]);

  const table = useReactTable({
    data: sheet.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const verticalScrollTrackRef = useRef<HTMLDivElement>(null);
  const [scrollThumbTop, setScrollThumbTop] = useState(0);
  const [scrollThumbHeight, setScrollThumbHeight] = useState(0);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  // 스크롤 thumb 크기와 위치 계산
  const updateScrollThumb = useCallback(() => {
    if (tableContainerRef.current && verticalScrollTrackRef.current) {
      const container = tableContainerRef.current;
      const track = verticalScrollTrackRef.current;
      const trackHeight = track.clientHeight;
      const contentHeight = container.scrollHeight;
      const viewHeight = container.clientHeight;

      if (contentHeight <= viewHeight) {
        setScrollThumbHeight(0);
        return;
      }

      const thumbHeight = Math.max(30, (viewHeight / contentHeight) * trackHeight);
      const scrollRatio = container.scrollTop / (contentHeight - viewHeight);
      const thumbTop = scrollRatio * (trackHeight - thumbHeight);

      setScrollThumbHeight(thumbHeight);
      setScrollThumbTop(thumbTop);
    }
  }, []);

  // 테이블과 스크롤바 동기화
  const handleTableScroll = useCallback(() => {
    if (tableContainerRef.current && scrollbarRef.current) {
      scrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
    updateScrollThumb();
  }, [updateScrollThumb]);

  const handleScrollbarScroll = useCallback(() => {
    if (tableContainerRef.current && scrollbarRef.current) {
      tableContainerRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
    }
  }, []);

  // 세로 스크롤 드래그 핸들러
  const handleScrollThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingScroll(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = tableContainerRef.current?.scrollTop || 0;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingScroll || !tableContainerRef.current || !verticalScrollTrackRef.current) return;

      const container = tableContainerRef.current;
      const track = verticalScrollTrackRef.current;
      const deltaY = e.clientY - dragStartY.current;
      const trackHeight = track.clientHeight;
      const contentHeight = container.scrollHeight;
      const viewHeight = container.clientHeight;
      const thumbHeight = Math.max(30, (viewHeight / contentHeight) * trackHeight);

      const scrollRatio = deltaY / (trackHeight - thumbHeight);
      const newScrollTop = dragStartScrollTop.current + scrollRatio * (contentHeight - viewHeight);

      container.scrollTop = Math.max(0, Math.min(newScrollTop, contentHeight - viewHeight));
    };

    const handleMouseUp = () => {
      setIsDraggingScroll(false);
    };

    if (isDraggingScroll) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScroll]);

  // 초기 thumb 크기 계산
  useEffect(() => {
    updateScrollThumb();
  }, [updateScrollThumb, sheet.rows.length]);

  // 선택된 셀 정보 가져오기
  const selectedCellInfo = useMemo(() => {
    if (!selectedCell) return null;
    const column = sheet.columns.find((c) => c.id === selectedCell.columnId);
    const rowIndex = sheet.rows.findIndex((r) => r.id === selectedCell.rowId);
    return {
      column,
      rowIndex,
      cellRef: column ? `${column.name}${rowIndex + 1}` : '',
    };
  }, [selectedCell, sheet.columns, sheet.rows]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 수식 입력줄 (Formula Bar) - 반응형 */}
      <div
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border-b mb-2 rounded-lg"
        style={{
          background: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)'
        }}
      >
        {/* 셀 참조 표시 */}
        <div
          className="flex-shrink-0 flex items-center rounded text-xs sm:text-sm font-mono font-medium min-w-[60px] sm:min-w-[80px] overflow-hidden"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)'
          }}
        >
          {selectedCellInfo ? (
            <>
              <span
                className="px-2 sm:px-3 py-1 sm:py-1.5"
                style={{ color: 'var(--accent)' }}
              >
                {selectedCellInfo.column?.name || '-'}
              </span>
              <div className="w-px h-4 sm:h-5" style={{ background: 'var(--border-primary)' }} />
              <span
                className="px-2 sm:px-3 py-1 sm:py-1.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {selectedCellInfo.rowIndex + 1}
              </span>
            </>
          ) : (
            <span className="px-2 sm:px-3 py-1 sm:py-1.5" style={{ color: 'var(--text-tertiary)' }}>-</span>
          )}
        </div>

        {/* 수식/값 타입 표시 - 모바일에서 숨김 */}
        {selectedCell && selectedCellInfo?.column && (
          <div
            className="hidden sm:block flex-shrink-0 px-2 py-1 rounded text-xs font-medium"
            style={{
              background: formulaBarValue.startsWith('=') ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
              color: formulaBarValue.startsWith('=') ? 'var(--primary-purple)' : 'var(--text-tertiary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            {formulaBarValue.startsWith('=') ? 'ƒx' : ''}
          </div>
        )}

        {/* 수식/값 입력창 */}
        <div className="flex-1 relative">
          <input
            ref={formulaBarRef}
            type="text"
            value={formulaBarValue}
            onChange={(e) => {
              setFormulaBarValue(e.target.value);
              if (editingCell) {
                setEditValue(e.target.value);
              }
            }}
            onFocus={() => {
              setIsFormulaBarFocused(true);
            }}
            onBlur={() => {
              // 버튼 클릭 등을 위해 딜레이
              setTimeout(() => {
                setIsFormulaBarFocused(false);
              }, 200);
            }}
            onKeyDown={handleFormulaBarKeyDown}
            placeholder={selectedCell ? t('table.enterValueOrFormula') : t('table.selectCell')}
            disabled={!selectedCell}
            className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-mono rounded transition-colors"
            style={{
              background: isFormulaBarFocused ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              border: isFormulaBarFocused ? '2px solid var(--accent)' : '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              opacity: selectedCell ? 1 : 0.5
            }}
          />
          {/* 자동완성 (수식바용) */}
          {isFormulaBarFocused && formulaBarValue.startsWith('=') && formulaBarValue.length > 1 && (
            <FormulaAutocomplete
              value={formulaBarValue}
              columns={sheet.columns}
              onSelect={(newValue) => {
                setFormulaBarValue(newValue);
                setEditValue(newValue);
                formulaBarRef.current?.focus();
              }}
            />
          )}
        </div>

        {/* 확인/취소 버튼 */}
        {isFormulaBarFocused && selectedCell && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                // 원래 값 복원
                const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
                const rawValue = row?.cells[selectedCell.columnId];
                setFormulaBarValue(rawValue?.toString() || '');
                setIsFormulaBarFocused(false);
                setEditingCell(null);
              }}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--error)' }}
              title={t('table.cancel')}
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={finishFormulaBarEditing}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--success)' }}
              title={t('table.confirm')}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 다중 선택 시 일괄 수정 버튼 */}
        {selectedCells.length > 1 && !isFormulaBarFocused && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)' }}>
              {t('table.selectedCells', { count: selectedCells.length })}
            </span>
            <button
              onClick={() => {
                setShowBulkEdit(true);
                setBulkEditValue('');
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors"
              style={{ background: 'var(--primary-blue)', color: 'white' }}
              title={t('table.applyBulkEdit')}
            >
              <Wand2 className="w-3 h-3" />
              {t('table.bulkEdit')}
            </button>
            <button
              onClick={clearSelectedCells}
              className="p-1 text-xs rounded transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
              title={t('table.clearSelectedCells')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 유효성 검사 에러 토스트 */}
      {validationError && (
        <div
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-sm animate-fadeIn"
          style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid var(--error)' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {validationError}
        </div>
      )}

      {/* 테이블 + 세로스크롤 래퍼 */}
      <div className="flex-1 flex min-h-0">
        {/* 테이블 컨테이너 - 가로 스크롤바는 숨김 */}
        <div
          ref={tableContainerRef}
          className={cn("flex-1 rounded-tl-lg border-t border-l border-b-0 hide-scrollbar", resizingColumn && "select-none")}
          style={{
            overflowY: 'scroll',
            overflowX: 'scroll',
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)'
          }}
          onScroll={handleTableScroll}
        >
        <table className="border-collapse table-fixed" style={{ width: tableWidth, minWidth: tableWidth }}>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-tertiary)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isRowNumber = header.id === 'rowNumber';
                  const isActions = header.id === 'actions';
                  const width = isActions ? 36 : (columnWidths[header.id] || (isRowNumber ? 80 : 150));
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-2 text-xs font-bold uppercase tracking-wide relative",
                        isActions && "px-1",
                        isRowNumber ? "text-center" : "text-left"
                      )}
                      style={{
                        width,
                        minWidth: isActions ? 36 : 60,
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-primary)',
                        borderRight: '1px solid var(--border-primary)'
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {!isActions && (
                        <div
                          className={cn(
                            'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors',
                            resizingColumn === header.id ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                          )}
                          onMouseDown={(e) => handleResizeStart(header.id, e)}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  데이터가 없습니다. 아래 &quot;행 추가&quot; 버튼을 클릭하세요.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors"
                  style={{ background: 'var(--bg-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isRowNumber = cell.column.id === 'rowNumber';
                    const isActions = cell.column.id === 'actions';
                    const width = isActions ? 36 : (columnWidths[cell.column.id] || (isRowNumber ? 80 : 150));
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "text-[15px]",
                          isActions && "px-1",
                          isRowNumber && "text-center"
                        )}
                        style={{
                          width,
                          minWidth: isActions ? 36 : 60,
                          borderBottom: '1px solid var(--border-primary)',
                          borderRight: '1px solid var(--border-primary)'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 커스텀 세로 스크롤바 (테이블 오른쪽) */}
        <div
          ref={verticalScrollTrackRef}
          className="w-3 rounded-tr-lg border-t border-r relative"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)'
          }}
          onClick={(e) => {
            if (!tableContainerRef.current || !verticalScrollTrackRef.current) return;
            const track = verticalScrollTrackRef.current;
            const rect = track.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const container = tableContainerRef.current;
            const contentHeight = container.scrollHeight;
            const viewHeight = container.clientHeight;
            const scrollRatio = clickY / track.clientHeight;
            container.scrollTop = scrollRatio * (contentHeight - viewHeight);
          }}
        >
          {scrollThumbHeight > 0 && (
            <div
              className="absolute left-0.5 right-0.5 rounded cursor-pointer transition-colors hover:bg-[var(--text-tertiary)]"
              style={{
                top: scrollThumbTop,
                height: scrollThumbHeight,
                background: 'var(--border-secondary)',
              }}
              onMouseDown={handleScrollThumbMouseDown}
            />
          )}
        </div>
      </div>

      {/* 고정 가로 스크롤바 */}
      <div
        ref={scrollbarRef}
        className="flex-shrink-0 rounded-b-lg border border-t-0"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          background: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)'
        }}
        onScroll={handleScrollbarScroll}
      >
        <div style={{ width: tableWidth, height: 1 }} />
      </div>

      {/* 하단 액션 버튼 - 반응형 */}
      <div
        className="flex items-center gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 pb-16 sm:pb-12"
        style={{ borderTop: '1px solid var(--border-primary)' }}
      >
        <button
          onClick={() => addRow(projectId, sheet.id)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors"
          style={{
            background: 'var(--primary-green)',
            color: 'white'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-green)'}
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          행 추가
        </button>

        <button
          onClick={() => setShowAddColumn(true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          열 추가
        </button>
      </div>

      {/* 열 추가 모달 */}
      {showAddColumn && (
        <ColumnModal
          columns={sheet.columns}
          mode="add"
          onSave={(data) => {
            addColumn(projectId, sheet.id, {
              name: data.name,
              type: data.type,
              formula: data.formula,
              width: 120,
              validation: data.validation,
              locked: data.locked,
            });
          }}
          onClose={() => setShowAddColumn(false)}
        />
      )}

      {/* 열 편집 모달 */}
      {editingColumn && (
        <ColumnModal
          column={editingColumn}
          columns={sheet.columns}
          mode="edit"
          onSave={(data) => {
            updateColumn(projectId, sheet.id, editingColumn.id, {
              name: data.name,
              type: data.type,
              formula: data.type === 'formula' ? data.formula : undefined,
              validation: data.validation,
              locked: data.locked,
            });
          }}
          onClose={() => setEditingColumn(null)}
        />
      )}

      {/* 일괄 수정 모달 */}
      {showBulkEdit && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="card w-full max-w-md animate-scaleIn">
            <div className="border-b px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between" style={{
              borderColor: 'var(--border-primary)'
            }}>
              <div>
                <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  일괄 수정
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {selectedCells.length}개 셀에 값 또는 수식 적용
                </p>
              </div>
              <button
                onClick={() => setShowBulkEdit(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {t('table.valueOrFormulaToApply')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyBulkEdit()}
                    placeholder={t('table.enterValuePlaceholder')}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    style={{
                      background: bulkEditValue.startsWith('=') ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
                      borderColor: bulkEditValue.startsWith('=') ? 'var(--primary-purple)' : 'var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                    autoFocus
                  />
                  {bulkEditValue.startsWith('=') && bulkEditValue.length > 1 && (
                    <FormulaAutocomplete
                      value={bulkEditValue}
                      columns={sheet.columns}
                      onSelect={(newValue) => setBulkEditValue(newValue)}
                    />
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  수식을 입력하면 각 셀의 행 데이터를 참조합니다
                </p>
              </div>

              {/* 예시 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>예시</p>
                <div className="space-y-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <p><code className="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>100</code> - 모든 셀에 100 입력</p>
                  <p><code className="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>=ATK * 1.5</code> - 각 행의 ATK × 1.5</p>
                  <p><code className="px-1 rounded" style={{ background: 'var(--bg-secondary)' }}>=HP + DEF</code> - 각 행의 HP + DEF</p>
                </div>
              </div>
            </div>
            <div className="border-t px-4 sm:px-5 py-3 sm:py-4 flex justify-end gap-2" style={{
              borderColor: 'var(--border-primary)'
            }}>
              <button
                onClick={() => setShowBulkEdit(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                }}
              >
                취소
              </button>
              <button
                onClick={applyBulkEdit}
                disabled={!bulkEditValue.trim()}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--primary-blue)',
                  color: 'white'
                }}
              >
                <span className="flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5" />
                  적용
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
