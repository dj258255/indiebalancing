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
import { useHistoryStore } from '@/stores/historyStore';
import { evaluateFormula } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';
import type { Sheet, Row, Column, CellValue, CellStyle } from '@/types';
import { validateCellValue } from '@/lib/validation';
import FormulaAutocomplete from './FormulaAutocomplete';
import FormulaHint from './FormulaHint';
import ColumnModal from './ColumnModal';
import CellContextMenu from './CellContextMenu';
import ColumnContextMenu from './ColumnContextMenu';
import RowContextMenu from './RowContextMenu';
import SheetToolbar from './SheetToolbar';
import { useSheetUIStore, DEFAULT_CELL_STYLE } from '@/stores/sheetUIStore';
import { useTranslations } from 'next-intl';

// 셀 키 생성 유틸리티 (Set 조회용)
const cellKey = (rowId: string, columnId: string) => `${rowId}:${columnId}`;

// requestAnimationFrame 기반 throttle (브라우저 렌더링과 동기화)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rafThrottle<T extends (...args: any[]) => void>(fn: T): T {
  let rafId: number | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastArgs: any[] | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    lastArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs) {
          fn(...lastArgs);
        }
      });
    }
  }) as T;
}

interface SheetTableProps {
  projectId: string;
  sheet: Sheet;
  onAddMemo?: () => void;
}


export default function SheetTable({ projectId, sheet, onAddMemo }: SheetTableProps) {
  const t = useTranslations();
  const { updateCell, updateCellsStyle, addRow, insertRow, deleteRow, addColumn, insertColumn, deleteColumn, updateColumn, updateRow, toggleRowSelection, selectedRows, cellSelectionMode, completeCellSelection, cancelCellSelection, projects, loadProjects } = useProjectStore();
  const { pushState, undo: historyUndo, redo: historyRedo, canUndo, canRedo } = useHistoryStore();
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizingRow, setResizingRow] = useState<string | null>(null);
  const [resizingHeader, setResizingHeader] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [headerHeight, setHeaderHeight] = useState(36); // 기본 헤더 높이
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedCells, setSelectedCells] = useState<{ rowId: string; columnId: string }[]>([]);
  // 성능 최적화: O(1) 조회를 위한 Set
  const selectedCellsSet = useMemo(() => new Set(selectedCells.map(c => cellKey(c.rowId, c.columnId))), [selectedCells]);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isFormulaBarFocused, setIsFormulaBarFocused] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditValue, setBulkEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);
  // IME 입력을 위한 숨겨진 input (셀 선택 시 포커스)
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  // IME 조합 상태 추적 (한글 등)
  const isComposingRef = useRef(false);
  const lastSelectedCellRef = useRef<{ rowId: string; columnId: string } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartCellRef = useRef<{ rowId: string; columnId: string } | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // 성능 최적화: 셀 요소 ref 맵 (Selection Overlay용)
  const cellRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // 채우기 핸들 상태
  const [isFillDragging, setIsFillDragging] = useState(false);
  const [fillPreviewCells, setFillPreviewCells] = useState<{ rowId: string; columnId: string }[]>([]);
  // 성능 최적화: O(1) 조회를 위한 Set
  const fillPreviewCellsSet = useMemo(() => new Set(fillPreviewCells.map(c => cellKey(c.rowId, c.columnId))), [fillPreviewCells]);
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

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
    columnId: string;
    isRowNumberCell: boolean;
    isHeaderCell: boolean;
  } | null>(null);

  // 컬럼 헤더 컨텍스트 메뉴 상태
  const [columnContextMenu, setColumnContextMenu] = useState<{
    x: number;
    y: number;
    column: Column;
  } | null>(null);

  // 행 헤더 컨텍스트 메뉴 상태
  const [rowContextMenu, setRowContextMenu] = useState<{
    x: number;
    y: number;
    row: Row;
    rowIndex: number;
  } | null>(null);

  // 메모 모달 상태
  const [memoModal, setMemoModal] = useState<{
    rowId: string;
    columnId: string;
    memo: string;
  } | null>(null);

  // 컬럼 너비 초기화
  useEffect(() => {
    const widths: Record<string, number> = { rowNumber: 80 };
    sheet.columns.forEach((col) => {
      widths[col.id] = col.width || 150;
    });
    setColumnWidths(widths);
  }, [sheet.columns]);

  // 행 높이 초기화
  useEffect(() => {
    const heights: Record<string, number> = {};
    sheet.rows.forEach((row) => {
      heights[row.id] = row.height || 36; // 기본 행 높이 36px
    });
    setRowHeights(heights);
  }, [sheet.rows]);

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

  // 행 리사이즈 핸들러
  const handleRowResizeStart = useCallback((rowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRow(rowId);

    const startY = e.clientY;
    const startHeight = rowHeights[rowId] || 36;
    let finalHeight = startHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientY - startY;
      finalHeight = Math.max(24, Math.min(200, startHeight + diff)); // 최소 24px, 최대 200px
      setRowHeights((prev) => ({ ...prev, [rowId]: finalHeight }));
    };

    const handleMouseUp = () => {
      setResizingRow(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 행 높이를 store에 저장
      setTimeout(() => {
        updateRow(projectId, sheet.id, rowId, { height: finalHeight });
      }, 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [rowHeights, projectId, sheet.id, updateRow]);

  // 헤더 높이 조절 핸들러
  const handleHeaderResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingHeader(true);

    const startY = e.clientY;
    const startHeight = headerHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientY - startY;
      const newHeight = Math.max(28, Math.min(100, startHeight + diff)); // 최소 28px, 최대 100px
      setHeaderHeight(newHeight);
    };

    const handleMouseUp = () => {
      setResizingHeader(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [headerHeight]);

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

  // 체크박스 드래그 중 (행 위를 지나갈 때) - rafThrottle로 성능 최적화
  const handleCheckboxDragEnterThrottled = useMemo(
    () => rafThrottle((rowId: string) => {
      if (!checkboxDragModeRef.current) return;

      const currentRowIndex = sheet.rows.findIndex(r => r.id === rowId);
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
        const targetRow = sheet.rows.find(r => r.id === rowId);
        if (!targetRow) return;
        const currentlySelected = isRowSelected(rowId);
        if (checkboxDragModeRef.current === 'select' && !currentlySelected) {
          handleRowSelect(targetRow);
        } else if (checkboxDragModeRef.current === 'deselect' && currentlySelected) {
          handleRowSelect(targetRow);
        }
      }

      lastDragRowIndexRef.current = currentRowIndex;
    }),
    [sheet.rows, isRowSelected, handleRowSelect]
  );

  // handleCheckboxDragEnter wrapper (isCheckboxDragging 체크 포함)
  const handleCheckboxDragEnter = useCallback((row: Row) => {
    if (!isCheckboxDragging) return;
    handleCheckboxDragEnterThrottled(row.id);
  }, [isCheckboxDragging, handleCheckboxDragEnterThrottled]);

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

  // 수식 시작 감지 (입력 필드 ref 기반으로 변경)
  // editValue가 아닌 inputRef.current.value를 직접 체크하도록 변경됨

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
          // 계산된 값 사용 (수식이 적용된 경우 포함)
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
    [sheet.rows, sheet.columns, cellSelectionMode.active, completeCellSelection, computedRows]
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

    pushState(projects, '셀 편집');
    updateCell(projectId, sheet.id, editingCell.rowId, editingCell.columnId, value);
    setEditingCell(null);
    setEditValue('');
    setShowAutocomplete(false);
    // 포뮬라 바 값도 업데이트
    setFormulaBarValue(finalValue);
  }, [editingCell, editValue, projectId, sheet.id, updateCell, sheet.columns, pushState, projects]);

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

    pushState(projects, '셀 편집');
    updateCell(projectId, sheet.id, selectedCell.rowId, selectedCell.columnId, value);
    setIsFormulaBarFocused(false);
  }, [selectedCell, formulaBarValue, projectId, sheet.id, updateCell, pushState, projects]);

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
    navigator.clipboard?.writeText(text).catch(() => {
      // 클립보드 접근 실패 시 무시
    });
  }, [selectedCells, sheet.rows, sheet.columns]);

  // 붙여넣기 (Ctrl+V)
  const pasteToSelectedCells = useCallback(async () => {
    if (!selectedCell) return;

    // 시스템 클립보드에서 텍스트 읽기
    let clipboardText = '';
    try {
      if (navigator.clipboard) {
        clipboardText = await navigator.clipboard.readText();
      }
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

  // 잘라내기 (복사 후 삭제)
  const cutSelectedCells = useCallback(() => {
    copySelectedCells();
    clearSelectedCells();
  }, [copySelectedCells, clearSelectedCells]);

  // 컨텍스트 메뉴 열기
  const handleContextMenu = useCallback((
    e: React.MouseEvent,
    rowId: string,
    columnId: string,
    isRowNumberCell: boolean = false,
    isHeaderCell: boolean = false
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // 우클릭한 셀이 선택 범위에 포함되지 않으면 해당 셀만 선택
    if (!isRowNumberCell && !isHeaderCell) {
      const isInSelection = selectedCells.some(c => c.rowId === rowId && c.columnId === columnId);
      if (!isInSelection) {
        setSelectedCell({ rowId, columnId });
        setSelectedCells([{ rowId, columnId }]);
      }
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      rowId,
      columnId,
      isRowNumberCell,
      isHeaderCell,
    });
  }, [selectedCells]);

  // 행 삽입 (위)
  const insertRowAbove = useCallback(() => {
    if (!contextMenu) return;
    const rowIdx = sheet.rows.findIndex(r => r.id === contextMenu.rowId);
    if (rowIdx === -1) return;
    insertRow(projectId, sheet.id, rowIdx);
    setContextMenu(null);
  }, [contextMenu, sheet.rows, projectId, sheet.id, insertRow]);

  // 행 삽입 (아래)
  const insertRowBelow = useCallback(() => {
    if (!contextMenu) return;
    const rowIdx = sheet.rows.findIndex(r => r.id === contextMenu.rowId);
    if (rowIdx === -1) return;
    insertRow(projectId, sheet.id, rowIdx + 1);
    setContextMenu(null);
  }, [contextMenu, sheet.rows, projectId, sheet.id, insertRow]);

  // 열 삽입 (왼쪽)
  const insertColumnLeft = useCallback(() => {
    if (!contextMenu) return;
    const colIdx = sheet.columns.findIndex(c => c.id === contextMenu.columnId);
    if (colIdx === -1) return;
    insertColumn(projectId, sheet.id, {
      name: `Column ${sheet.columns.length + 1}`,
      type: 'general',
    }, colIdx);
    setContextMenu(null);
  }, [contextMenu, sheet.columns, projectId, sheet.id, insertColumn]);

  // 열 삽입 (오른쪽)
  const insertColumnRight = useCallback(() => {
    if (!contextMenu) return;
    const colIdx = sheet.columns.findIndex(c => c.id === contextMenu.columnId);
    if (colIdx === -1) return;
    insertColumn(projectId, sheet.id, {
      name: `Column ${sheet.columns.length + 1}`,
      type: 'general',
    }, colIdx + 1);
    setContextMenu(null);
  }, [contextMenu, sheet.columns, projectId, sheet.id, insertColumn]);

  // 선택된 행 삭제
  const deleteSelectedRows = useCallback(() => {
    if (selectedCells.length === 0 && !contextMenu) return;

    // 선택된 모든 고유 행 ID 수집
    const rowIds = new Set<string>();
    if (selectedCells.length > 0) {
      selectedCells.forEach(c => rowIds.add(c.rowId));
    } else if (contextMenu) {
      rowIds.add(contextMenu.rowId);
    }

    // 각 행 삭제
    rowIds.forEach(rowId => {
      deleteRow(projectId, sheet.id, rowId);
    });

    setSelectedCells([]);
    setSelectedCell(null);
    setContextMenu(null);
  }, [selectedCells, contextMenu, projectId, sheet.id, deleteRow]);

  // 열 삭제
  const deleteSelectedColumn = useCallback(() => {
    if (!contextMenu) return;
    deleteColumn(projectId, sheet.id, contextMenu.columnId);
    setSelectedCells([]);
    setSelectedCell(null);
    setContextMenu(null);
  }, [contextMenu, projectId, sheet.id, deleteColumn]);

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

      // 이미 선택된 셀을 다시 클릭하면 선택 해제
      const isCurrentlySelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId;
      if (isCurrentlySelected && selectedCells.length === 1) {
        setSelectedCell(null);
        setSelectedCells([]);
        setFormulaBarValue('');
        return;
      }

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
    [sheet.rows, selectedCell, selectedCells.length]
  );

  // 드래그 중 선택 상태 ref (React 렌더링 우회)
  const pendingSelectionRef = useRef<{ rowId: string; columnId: string }[]>([]);
  const pendingSelectedCellRef = useRef<{ rowId: string; columnId: string } | null>(null);

  // 드래그 중 - requestAnimationFrame + DOM 직접 조작으로 성능 극대화
  const handleCellMouseEnterThrottled = useMemo(
    () => rafThrottle((rowId: string, columnId: string) => {
      if (!isDraggingRef.current || !dragStartCellRef.current) return;

      const rangeCells = calculateDragSelection(dragStartCellRef.current, { rowId, columnId });

      // 드래그 중에는 DOM 직접 조작 (React 렌더링 우회)
      const tableContainer = tableContainerRef.current;
      if (tableContainer) {
        // 이전 선택 클래스 제거
        tableContainer.querySelectorAll('[data-cell-selected="true"]').forEach(el => {
          el.removeAttribute('data-cell-selected');
          (el as HTMLElement).style.background = '';
          (el as HTMLElement).style.outline = '';
        });
        tableContainer.querySelectorAll('[data-cell-multi-selected="true"]').forEach(el => {
          el.removeAttribute('data-cell-multi-selected');
          (el as HTMLElement).style.background = '';
          (el as HTMLElement).style.outline = '';
        });

        // 새 선택 클래스 추가
        rangeCells.forEach(cell => {
          const cellEl = tableContainer.querySelector(`[data-cell-id="${cellKey(cell.rowId, cell.columnId)}"]`) as HTMLElement;
          if (cellEl) {
            const isPrimary = cell.rowId === rowId && cell.columnId === columnId;
            if (isPrimary) {
              cellEl.setAttribute('data-cell-selected', 'true');
              cellEl.style.outline = '2px solid var(--primary-blue)';
            } else {
              cellEl.setAttribute('data-cell-multi-selected', 'true');
              cellEl.style.background = 'var(--primary-blue-light)';
              cellEl.style.outline = '1px solid var(--primary-blue)';
            }
          }
        });
      }

      // ref에 저장 (마우스업 시 React 상태로 동기화)
      pendingSelectionRef.current = rangeCells;
      pendingSelectedCellRef.current = { rowId, columnId };
    }),
    [calculateDragSelection]
  );

  const handleCellMouseEnter = useCallback(
    (rowId: string, columnId: string) => {
      handleCellMouseEnterThrottled(rowId, columnId);
    },
    [handleCellMouseEnterThrottled]
  );

  // 드래그 종료 (전역 이벤트) - React 상태 동기화
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;

        // 드래그 완료 후 ref 값을 React 상태로 동기화
        if (pendingSelectionRef.current.length > 0) {
          setSelectedCells(pendingSelectionRef.current);
          pendingSelectionRef.current = [];
        }
        if (pendingSelectedCellRef.current) {
          setSelectedCell(pendingSelectedCellRef.current);
          // 수식바 값 업데이트
          const row = sheet.rows.find(r => r.id === pendingSelectedCellRef.current?.rowId);
          const rawValue = row?.cells[pendingSelectedCellRef.current?.columnId || ''];
          setFormulaBarValue(rawValue?.toString() || '');
          pendingSelectedCellRef.current = null;
        }
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [sheet.rows]);

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

  // 채우기 핸들 드래그 중 (셀 위로 이동 시) - requestAnimationFrame 적용
  const handleFillDragEnterThrottled = useMemo(
    () => rafThrottle((rowId: string, columnId: string) => {
      if (!fillStartCellRef.current) return;

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
    }),
    [sheet.rows, sheet.columns]
  );

  const handleFillDragEnter = useCallback((rowId: string, columnId: string) => {
    if (!isFillDragging) return;
    handleFillDragEnterThrottled(rowId, columnId);
  }, [isFillDragging, handleFillDragEnterThrottled]);

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

  // 전역 키보드 이벤트 (복사, 붙여넣기, 삭제, F2)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // hiddenInput에서 발생한 경우는 별도 처리
      if (e.target === hiddenInputRef.current) {
        return;
      }

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
        // 잠긴 셀인지 확인
        const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
        const column = sheet.columns.find((c) => c.id === selectedCell.columnId);
        if (column?.locked || row?.locked) return;

        // hiddenInput으로 포커스 이동하여 IME 입력 받기
        if (hiddenInputRef.current) {
          hiddenInputRef.current.value = '';
          hiddenInputRef.current.focus();
          // IME가 아닌 경우 (영문) 직접 값 설정
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
  }, [editingCell, selectedCells, selectedCell, copySelectedCells, pasteToSelectedCells, clearSelectedCells, sheet.rows, sheet.columns, startEditing]);

  // 숨겨진 input 핸들러 (IME 입력 처리)
  const handleHiddenInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // IME 조합 중이 아닐 때만 처리 (영문 등)
    if (!isComposingRef.current && selectedCell && !editingCell) {
      const value = e.target.value;
      if (value) {
        setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
        setEditValue(value);
        setFormulaBarValue(value);
        e.target.value = '';
      }
    }
  }, [selectedCell, editingCell]);

  const handleHiddenInputCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleHiddenInputCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    // 조합 완료 시 편집 모드 진입
    if (selectedCell && !editingCell) {
      const value = e.currentTarget.value;
      if (value) {
        setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
        setEditValue(value);
        setFormulaBarValue(value);
        e.currentTarget.value = '';
      }
    }
  }, [selectedCell, editingCell]);

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
      // 자동완성이 표시 중이면 먼저 자동완성 키보드 핸들러 호출
      const showFormulaBarAutocomplete = isFormulaBarFocused && formulaBarValue.startsWith('=') && formulaBarValue.length > 1;
      if (showFormulaBarAutocomplete) {
        // @ts-expect-error - 전역 함수로 노출된 핸들러
        const handler = window.__formulaAutocompleteKeyHandler;
        if (handler && handler(e)) {
          return; // 자동완성이 이벤트를 소비함
        }
      }

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
    [finishFormulaBarEditing, selectedCell, sheet.rows, isFormulaBarFocused, formulaBarValue]
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
          // 현재 선택된 셀의 행인지 확인 (하이라이트용)
          const isHighlightedRow = selectedCell?.rowId === row.original.id;
          return (
            <div
              className="flex items-center text-sm h-full select-none"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRowContextMenu({ x: e.clientX, y: e.clientY, row: row.original, rowIndex: row.index });
              }}
              onMouseEnter={() => handleCheckboxDragEnter(row.original)}
            >
              {/* 왼쪽 영역: 체크박스 (드래그 선택용) */}
              <div
                className="flex-1 flex items-center justify-center cursor-pointer h-full"
                onMouseDown={(e) => {
                  if (e.button !== 2) {
                    handleRowNumberDragStart(row.original, e);
                  }
                }}
              >
                <div
                  className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                  style={{
                    background: selected ? 'var(--primary-blue)' : 'transparent',
                    borderColor: selected
                      ? 'var(--primary-blue)'
                      : isHighlightedRow
                        ? 'var(--row-col-highlight-border)'
                        : 'var(--border-secondary)',
                    color: selected ? 'white' : 'transparent'
                  }}
                >
                  {selected && <Check className="w-3 h-3" />}
                </div>
              </div>
              {/* 구분선 */}
              <div
                className="w-px h-5"
                style={{
                  background: isHighlightedRow
                    ? 'var(--row-col-highlight-border)'
                    : 'var(--border-primary)'
                }}
              />
              {/* 오른쪽 영역: 숫자 (클릭 시 행 전체 선택, 드래그 중이면 체크박스 드래그 계속) */}
              <div
                className="flex-1 flex items-center justify-center gap-1 cursor-pointer h-full hover:bg-[var(--bg-hover)] transition-colors"
                onMouseEnter={() => {
                  // 체크박스 드래그 중이면 드래그 처리
                  if (isCheckboxDragging) {
                    handleCheckboxDragEnter(row.original);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // 드래그 중이 아닐 때만 행 전체 선택
                  if (isCheckboxDragging) return;
                  // 해당 행의 모든 셀 선택
                  const allCellsInRow = sheet.columns.map(col => ({
                    rowId: row.original.id,
                    columnId: col.id
                  }));
                  setSelectedCells(allCellsInRow);
                  if (allCellsInRow.length > 0) {
                    setSelectedCell(allCellsInRow[0]);
                  }
                }}
              >
                {rowLocked && (
                  <Lock className="w-3 h-3" style={{ color: 'var(--warning)' }} />
                )}
                <span
                  className="text-center"
                  style={{ color: isHighlightedRow ? 'var(--row-col-highlight-text)' : 'var(--text-tertiary)' }}
                >
                  {row.index + 1}
                </span>
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
          <div
            className="flex flex-col items-center justify-center cursor-pointer select-none w-full"
            onClick={() => {
              // 해당 컬럼의 모든 셀 선택
              const allCellsInColumn = sheet.rows.map(row => ({
                rowId: row.id,
                columnId: col.id
              }));
              setSelectedCells(allCellsInColumn);
              if (allCellsInColumn.length > 0) {
                setSelectedCell(allCellsInColumn[0]);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setColumnContextMenu({ x: e.clientX, y: e.clientY, column: col });
            }}
          >
            <div className="flex items-center gap-1">
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
            {col.exportName && (
              <>
                <div
                  className="w-full my-0.5 mx-2"
                  style={{
                    height: '1px',
                    background: 'var(--border-primary)'
                  }}
                />
                <span
                  className="text-[10px] font-mono truncate max-w-full"
                  style={{ color: 'var(--text-tertiary)' }}
                  title={`Export: ${col.exportName}`}
                >
                  {col.exportName}
                </span>
              </>
            )}
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
            // 현재 입력값 기반으로 수식 여부 체크 (ref에서 직접)
            const currentInputValue = inputRef.current?.value ?? editValue;
            const isFormulaInput = currentInputValue.startsWith('=');

            return (
              <div className="relative">
                <input
                  ref={inputRef}
                  key={`edit-${row.original.id}-${col.id}`}
                  type="text"
                  defaultValue={editValue}
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    // 수식 시작 시에만 자동완성 토글 (상태 업데이트 최소화, 즉시 실행)
                    if (val.startsWith('=') && val.length > 1) {
                      if (!showAutocomplete) setShowAutocomplete(true);
                    } else {
                      if (showAutocomplete) setShowAutocomplete(false);
                    }
                    // 수식바 동기화 - IME 조합 중이 아닐 때만
                    if (!isComposingRef.current) {
                      setFormulaBarValue(val);
                    }
                  }}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    // 조합 완료 시 수식바 동기화
                    const val = e.currentTarget.value;
                    setFormulaBarValue(val);
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

                    // 자동완성이 표시 중이면 먼저 자동완성 키보드 핸들러 호출
                    if (showAutocomplete) {
                      // @ts-expect-error - 전역 함수로 노출된 핸들러
                      const handler = window.__formulaAutocompleteKeyHandler;
                      if (handler && handler(e)) {
                        return; // 자동완성이 이벤트를 소비함
                      }
                    }

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
                    background: isFormulaInput ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
                    borderColor: isFormulaInput ? 'var(--primary-purple)' : 'var(--accent)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder={isFormulaColumn ? t('table.defaultFormula', { formula: col.formula || t('table.noFormula') }) : ''}
                />
                {/* 수식 입력 시 힌트 */}
                {isFormulaInput && <FormulaHint formula={currentInputValue} />}
                {/* 자동완성 */}
                {showAutocomplete && (
                  <FormulaAutocomplete
                    value={editValue}
                    columns={sheet.columns}
                    onSelect={(newValue) => {
                      // 오픈소스 패턴: 모든 상태를 동기화
                      setEditValue(newValue);
                      setFormulaBarValue(newValue);
                      // 포커스 유지
                      inputRef.current?.focus();
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

          // 셀 스타일 가져오기
          const cellStyle = row.original.cellStyles?.[col.id];

          // 메모 확인
          const cellMemo = row.original.cellMemos?.[col.id];

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

          // 현재 셀이 선택되었는지 확인 (다중 선택 포함) - O(1) 조회
          const isSelected = selectedCell?.rowId === row.original.id && selectedCell?.columnId === col.id;
          const isMultiSelected = selectedCellsSet.has(cellKey(row.original.id, col.id));
          // 채우기 미리보기 셀인지 확인 - O(1) 조회
          const isFillPreview = fillPreviewCellsSet.has(cellKey(row.original.id, col.id));
          // 이동 대상 셀인지 확인
          const isMoveTarget = moveTargetCell?.rowId === row.original.id && moveTargetCell?.columnId === col.id;
          // 이동 시작 셀인지 확인
          const isMoveSource = isMoveDragging && moveStartCellRef.current?.rowId === row.original.id && moveStartCellRef.current?.columnId === col.id;

          return (
            <div
              data-cell-id={cellKey(row.original.id, col.id)}
              onMouseDown={(e) => {
                // 셀 선택 모드일 때는 즉시 selectCell 호출
                if (cellSelectionMode.active) {
                  selectCell(row.original.id, col.id, e);
                  return;
                }

                // 더블클릭 중이면 무시 (더블클릭은 onDoubleClick에서 처리)
                if (e.detail >= 2) return;

                // 단일 셀 선택 상태에서 같은 셀을 다시 클릭하면 선택 해제
                if (isSelected && !editingCell && selectedCells.length === 1) {
                  setSelectedCell(null);
                  setSelectedCells([]);
                  setFormulaBarValue('');
                  return;
                }

                // 선택된 셀에서 다시 마우스다운하면 이동 드래그 시작 (다중 선택 시)
                if (isSelected && !editingCell && selectedCells.length > 1) {
                  handleMoveStart(row.original.id, col.id, e);
                } else if (!isSelected) {
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
                console.log('[SheetTable onClick] Cell clicked, cellSelectionMode.active:', cellSelectionMode.active);
                // 셀 선택 모드일 때는 일반 클릭으로 셀 선택
                if (cellSelectionMode.active) {
                  console.log('[SheetTable onClick] Calling selectCell');
                  selectCell(row.original.id, col.id, e);
                  return;
                }
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
              onContextMenu={(e) => handleContextMenu(e, row.original.id, col.id)}
              className={`px-2 py-1 min-h-[32px] relative group overflow-hidden select-none ${
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
                willChange: 'background, outline',
              }}
              title={
                usesColumnFormula ? `열 수식: ${col.formula}\n값: ${value}` :
                cellHasFormula ? `셀 수식: ${cellRawValue}\n값: ${value}` :
                hasCellOverride ? `셀 오버라이드 값: ${value}` :
                typeof value === 'number' ? String(value) : undefined
              }
            >
              <span
                className="truncate block"
                style={{
                  fontWeight: cellStyle?.bold ? 700 : undefined,
                  fontStyle: cellStyle?.italic ? 'italic' : undefined,
                  textDecoration: [
                    cellStyle?.underline ? 'underline' : '',
                    cellStyle?.strikethrough ? 'line-through' : '',
                  ].filter(Boolean).join(' ') || undefined,
                  fontSize: `${cellStyle?.fontSize || DEFAULT_CELL_STYLE.fontSize}px`,
                  color: cellStyle?.fontColor || undefined,
                  textAlign: cellStyle?.hAlign || undefined,
                  transform: cellStyle?.textRotation ? `rotate(${cellStyle.textRotation}deg)` : undefined,
                }}
              >
                {displayValue}
              </span>
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
              {/* 메모 표시 (삼각형) */}
              {cellMemo && (
                <div
                  className="absolute top-0 right-0 w-0 h-0 cursor-pointer group/memo"
                  style={{
                    borderLeft: '12px solid transparent',
                    borderTop: '12px solid var(--warning)',
                  }}
                  title={cellMemo}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMemoModal({
                      rowId: row.original.id,
                      columnId: col.id,
                      memo: cellMemo,
                    });
                  }}
                />
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
    selectedCellsSet, // O(1) 조회용 Set
    handleCellMouseDown,
    handleCellMouseEnter,
    isFillDragging,
    fillPreviewCellsSet, // O(1) 조회용 Set
    handleFillHandleMouseDown,
    handleFillDragEnter,
    isMoveDragging,
    moveTargetCell,
    handleMoveStart,
    handleMoveDragEnter,
    t, // 번역 함수 추가
  ]);

  const table = useReactTable({
    data: sheet.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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

  // 줌 레벨 가져오기
  const { zoomLevel, setCurrentCellStyle, pushHistory, undoStack, redoStack } = useSheetUIStore();

  // 히스토리에 현재 상태 저장
  const saveToHistory = useCallback((label: string = '셀 편집') => {
    pushState(projects, label);
  }, [pushState, projects]);

  // Undo 핸들러
  const handleUndo = useCallback(() => {
    const previousState = historyUndo();
    if (previousState) {
      loadProjects(previousState);
    }
  }, [historyUndo, loadProjects]);

  // Redo 핸들러
  const handleRedo = useCallback(() => {
    const nextState = historyRedo();
    if (nextState) {
      loadProjects(nextState);
    }
  }, [historyRedo, loadProjects]);

  // 셀 스타일 변경 핸들러 (선택된 셀들에 스타일 적용)
  const handleStyleChange = useCallback((style: Partial<CellStyle>) => {
    if (selectedCells.length === 0) return;
    saveToHistory('스타일 변경');
    updateCellsStyle(projectId, sheet.id, selectedCells, style);
  }, [selectedCells, updateCellsStyle, projectId, sheet.id, saveToHistory]);

  // 선택된 셀이 변경될 때 현재 스타일 업데이트
  useEffect(() => {
    if (selectedCell) {
      const row = sheet.rows.find(r => r.id === selectedCell.rowId);
      const cellStyle = row?.cellStyles?.[selectedCell.columnId] || {};
      setCurrentCellStyle(cellStyle);
    } else {
      setCurrentCellStyle({});
    }
  }, [selectedCell, sheet.rows, setCurrentCellStyle]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 숨겨진 input - IME 입력 처리 (한글 등) */}
      <input
        ref={hiddenInputRef}
        type="text"
        onChange={handleHiddenInputChange}
        onCompositionStart={handleHiddenInputCompositionStart}
        onCompositionEnd={handleHiddenInputCompositionEnd}
        onBlur={() => {
          // 포커스를 잃으면 값 초기화
          if (hiddenInputRef.current) {
            hiddenInputRef.current.value = '';
          }
          isComposingRef.current = false;
        }}
        onKeyDown={(e) => {
          // Enter로 편집 모드 진입 (값이 있으면)
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            const value = e.currentTarget.value;
            if (value && selectedCell && !editingCell) {
              setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
              setEditValue(value);
              setFormulaBarValue(value);
              e.currentTarget.value = '';
            }
          }
          // Escape로 취소
          else if (e.key === 'Escape') {
            e.currentTarget.value = '';
            e.currentTarget.blur();
          }
        }}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        style={{ position: 'fixed', top: -9999, left: -9999 }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* 셀 선택 모드 알림 바 */}
      {cellSelectionMode.active && (
        <div
          className="flex items-center gap-3 px-4 py-2 mb-2 rounded-lg animate-fadeIn"
          style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent)',
          }}
        >
          <button
            onClick={cancelCellSelection}
            className="p-1 rounded transition-colors hover:bg-red-200"
            style={{
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              {t('sheet.selectCellFor', { field: cellSelectionMode.fieldLabel })}
            </span>
          </div>
        </div>
      )}

      {/* 서식 툴바 (x-spreadsheet 패턴) */}
      <SheetToolbar
        disabled={!selectedCell}
        onStyleChange={handleStyleChange}
        onAddMemo={onAddMemo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

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

        {/* 취소/확인 버튼 - 입력창 왼쪽 */}
        {isFormulaBarFocused && selectedCell && (
          <div
            className="flex items-center gap-0.5 flex-shrink-0 rounded px-1 py-0.5"
            style={{
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-primary)',
            }}
          >
            <button
              onClick={() => {
                // 원래 값 복원
                const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
                const rawValue = row?.cells[selectedCell.columnId];
                setFormulaBarValue(rawValue?.toString() || '');
                setIsFormulaBarFocused(false);
                setEditingCell(null);
              }}
              className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--error)' }}
              title={t('table.cancel')}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-px h-4" style={{ background: 'var(--border-primary)' }} />
            <button
              onClick={finishFormulaBarEditing}
              className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--success)' }}
              title={t('table.confirm')}
            >
              <Check className="w-4 h-4" />
            </button>
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
        <table
          className="border-collapse table-fixed"
          style={{
            width: tableWidth,
            minWidth: tableWidth,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'left top',
          }}
        >
          <thead className={cn("sticky top-0 z-10", resizingHeader && "select-none")} style={{ background: 'var(--bg-tertiary)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} style={{ height: headerHeight }}>
                {headerGroup.headers.map((header) => {
                  const isRowNumber = header.id === 'rowNumber';
                  const isActions = header.id === 'actions';
                  const width = isActions ? 36 : (columnWidths[header.id] || (isRowNumber ? 80 : 150));
                  // 선택된 셀의 열인지 확인 (열 헤더 하이라이트용)
                  const isSelectedColumn = selectedCell?.columnId === header.id;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold uppercase tracking-wide relative",
                        isActions && "px-1",
                        isRowNumber ? "text-center" : "text-left"
                      )}
                      style={{
                        width,
                        minWidth: isActions ? 36 : 60,
                        height: headerHeight,
                        color: isSelectedColumn ? 'var(--row-col-highlight-text)' : 'var(--text-secondary)',
                        background: isSelectedColumn ? 'var(--row-col-highlight)' : undefined,
                        fontWeight: isSelectedColumn ? 700 : undefined,
                        borderBottom: isSelectedColumn
                          ? '2px solid var(--row-col-highlight-border)'
                          : '1px solid var(--border-primary)',
                        borderRight: '1px solid var(--border-primary)'
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {/* 열 너비 조절 핸들 */}
                      {!isActions && (
                        <div
                          className={cn(
                            'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors',
                            resizingColumn === header.id ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                          )}
                          onMouseDown={(e) => handleResizeStart(header.id, e)}
                        />
                      )}
                      {/* 헤더 높이 조절 핸들 - 행 번호 셀에만 표시 */}
                      {isRowNumber && (
                        <div
                          className={cn(
                            'absolute left-0 right-0 bottom-0 h-1 cursor-row-resize transition-colors',
                            resizingHeader ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                          )}
                          onMouseDown={handleHeaderResizeStart}
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
              table.getRowModel().rows.map((row) => {
                const rowHeight = rowHeights[row.original.id] || 36;
                return (
                  <tr
                    key={row.id}
                    className={cn("transition-colors", resizingRow && "select-none")}
                    style={{
                      background: 'var(--bg-primary)',
                      height: rowHeight,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isRowNumber = cell.column.id === 'rowNumber';
                      const isActions = cell.column.id === 'actions';
                      const width = isActions ? 36 : (columnWidths[cell.column.id] || (isRowNumber ? 80 : 150));
                      // 선택된 셀의 행인지 확인 (행 번호 하이라이트용)
                      const isSelectedRow = isRowNumber && selectedCell?.rowId === row.original.id;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "text-[15px] relative",
                            isActions && "px-1",
                            isRowNumber && "text-center"
                          )}
                          style={{
                            width,
                            minWidth: isActions ? 36 : 60,
                            height: rowHeight,
                            background: isSelectedRow ? 'var(--row-col-highlight)' : undefined,
                            color: isSelectedRow ? 'var(--row-col-highlight-text)' : undefined,
                            fontWeight: isSelectedRow ? 700 : undefined,
                            borderBottom: '1px solid var(--border-primary)',
                            borderRight: isSelectedRow
                              ? '2px solid var(--row-col-highlight-border)'
                              : '1px solid var(--border-primary)'
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          {/* 행 높이 조절 핸들 - 행 번호 셀에만 표시 */}
                          {isRowNumber && (
                            <div
                              className={cn(
                                'absolute left-0 right-0 bottom-0 h-1 cursor-row-resize transition-colors',
                                resizingRow === row.original.id ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                              )}
                              onMouseDown={(e) => handleRowResizeStart(row.original.id, e)}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
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
        className="flex items-center gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 pb-16 sm:pb-12 relative"
        style={{ borderTop: '1px solid var(--border-primary)', zIndex: 20 }}
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
              exportName: data.exportName,
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
              exportName: data.exportName,
            });
          }}
          onClose={() => setEditingColumn(null)}
        />
      )}

      {/* 셀 컨텍스트 메뉴 */}
      {contextMenu && (() => {
        const row = sheet.rows.find(r => r.id === contextMenu.rowId);
        const hasMemo = !!(row?.cellMemos?.[contextMenu.columnId]);
        const currentMemo = row?.cellMemos?.[contextMenu.columnId] || '';

        return (
          <CellContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onCopy={copySelectedCells}
            onCut={cutSelectedCells}
            onPaste={pasteToSelectedCells}
            onDelete={clearSelectedCells}
            onInsertRowAbove={insertRowAbove}
            onInsertRowBelow={insertRowBelow}
            onInsertColumnLeft={insertColumnLeft}
            onInsertColumnRight={insertColumnRight}
            onDeleteRow={deleteSelectedRows}
            onDeleteColumn={deleteSelectedColumn}
            onAddMemo={() => {
              setMemoModal({
                rowId: contextMenu.rowId,
                columnId: contextMenu.columnId,
                memo: currentMemo,
              });
              setContextMenu(null);
            }}
            onDeleteMemo={hasMemo ? () => {
              if (row) {
                const newMemos = { ...row.cellMemos };
                delete newMemos[contextMenu.columnId];
                updateRow(projectId, sheet.id, contextMenu.rowId, {
                  cellMemos: Object.keys(newMemos).length > 0 ? newMemos : undefined,
                });
              }
              setContextMenu(null);
            } : undefined}
            canPaste={!!clipboardData || true}
            isMultiSelect={selectedCells.length > 1}
            isRowNumberCell={contextMenu.isRowNumberCell}
            isHeaderCell={contextMenu.isHeaderCell}
            hasMemo={hasMemo}
          />
        );
      })()}

      {/* 컬럼 헤더 컨텍스트 메뉴 */}
      {columnContextMenu && (
        <ColumnContextMenu
          x={columnContextMenu.x}
          y={columnContextMenu.y}
          columnName={columnContextMenu.column.name}
          isLocked={columnContextMenu.column.locked || false}
          onClose={() => setColumnContextMenu(null)}
          onToggleLock={() => {
            updateColumn(projectId, sheet.id, columnContextMenu.column.id, {
              locked: !columnContextMenu.column.locked
            });
          }}
          onEdit={() => {
            setEditingColumn(columnContextMenu.column);
          }}
          onDelete={() => {
            if (confirm(t('table.confirmDeleteColumn', { name: columnContextMenu.column.name }))) {
              deleteColumn(projectId, sheet.id, columnContextMenu.column.id);
            }
          }}
          onInsertLeft={() => {
            const colIdx = sheet.columns.findIndex(c => c.id === columnContextMenu.column.id);
            insertColumn(projectId, sheet.id, {
              name: t('table.newColumn'),
              type: 'general',
            }, colIdx);
          }}
          onInsertRight={() => {
            const colIdx = sheet.columns.findIndex(c => c.id === columnContextMenu.column.id);
            insertColumn(projectId, sheet.id, {
              name: t('table.newColumn'),
              type: 'general',
            }, colIdx + 1);
          }}
        />
      )}

      {/* 행 헤더 컨텍스트 메뉴 */}
      {rowContextMenu && (
        <RowContextMenu
          x={rowContextMenu.x}
          y={rowContextMenu.y}
          rowIndex={rowContextMenu.rowIndex}
          isLocked={rowContextMenu.row.locked || false}
          onClose={() => setRowContextMenu(null)}
          onToggleLock={() => {
            updateRow(projectId, sheet.id, rowContextMenu.row.id, {
              locked: !rowContextMenu.row.locked
            });
          }}
          onDelete={() => {
            deleteRow(projectId, sheet.id, rowContextMenu.row.id);
          }}
          onInsertAbove={() => {
            insertRow(projectId, sheet.id, rowContextMenu.rowIndex);
          }}
          onInsertBelow={() => {
            insertRow(projectId, sheet.id, rowContextMenu.rowIndex + 1);
          }}
        />
      )}

      {/* 메모 모달 */}
      {memoModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="card w-full max-w-md animate-scaleIn">
            <div className="border-b px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between" style={{
              borderColor: 'var(--border-primary)'
            }}>
              <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {memoModal.memo ? t('contextMenu.editMemo') : t('contextMenu.addMemo')}
              </h3>
              <button
                onClick={() => setMemoModal(null)}
                className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {t('memo.content')}
                </label>
                <textarea
                  value={memoModal.memo}
                  onChange={(e) => setMemoModal({ ...memoModal, memo: e.target.value })}
                  placeholder={t('memo.placeholder')}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="border-t px-4 sm:px-5 py-3 sm:py-4 flex justify-end gap-2" style={{
              borderColor: 'var(--border-primary)'
            }}>
              <button
                onClick={() => setMemoModal(null)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  const row = sheet.rows.find(r => r.id === memoModal.rowId);
                  if (row) {
                    const newMemos = { ...row.cellMemos };
                    if (memoModal.memo.trim()) {
                      newMemos[memoModal.columnId] = memoModal.memo.trim();
                    } else {
                      delete newMemos[memoModal.columnId];
                    }
                    updateRow(projectId, sheet.id, memoModal.rowId, {
                      cellMemos: Object.keys(newMemos).length > 0 ? newMemos : undefined,
                    });
                  }
                  setMemoModal(null);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: 'white'
                }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 수정 모달 */}
      {showBulkEdit && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-2 sm:p-4">
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
                    onKeyDown={(e) => {
                      // 자동완성이 표시 중이면 먼저 자동완성 키보드 핸들러 호출
                      const showBulkAutocomplete = bulkEditValue.startsWith('=') && bulkEditValue.length > 1;
                      if (showBulkAutocomplete) {
                        // @ts-expect-error - 전역 함수로 노출된 핸들러
                        const handler = window.__formulaAutocompleteKeyHandler;
                        if (handler && handler(e)) {
                          return; // 자동완성이 이벤트를 소비함
                        }
                      }
                      if (e.key === 'Enter') applyBulkEdit();
                    }}
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
