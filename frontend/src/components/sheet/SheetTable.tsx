'use client';

/**
 * SheetTable - 메인 스프레드시트 컴포넌트 (리팩토링 버전)
 *
 * 오픈소스 참고:
 * - x-spreadsheet: https://github.com/myliang/x-spreadsheet
 * - Handsontable: https://handsontable.com/docs/react-data-grid/
 * - TanStack Virtual: https://tanstack.com/virtual/latest
 *
 * 아키텍처:
 * - 모든 상태와 로직은 hooks로 분리
 * - 컴포넌트는 렌더링에만 집중
 * - x-spreadsheet 패턴: Sheet(오케스트레이터) + 개별 모듈 조합
 */

import React, { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Trash2, X, MessageSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import { useTranslations } from 'next-intl';

// 타입
import type { Row, Column, CellValue, CellStyle } from '@/types';
import type { SheetTableProps, CellPosition } from './types';

// Stores
import { useProjectStore } from '@/stores/projectStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useSheetUIStore, DEFAULT_CELL_STYLE } from '@/stores/sheetUIStore';

// Hooks
import {
  useSheetResize,
  useSheetSelection,
  useSheetEditing,
  useSheetDrag,
  useSheetKeyboard,
  useSheetContextMenu,
} from './hooks';

// 컴포넌트
import SheetCell from './SheetCell';
import { CellEditor } from './CellEditor';
import FormulaBar from './FormulaBar';
import FormulaAutocomplete, { type FormulaAutocompleteRef } from './FormulaAutocomplete';
import ActionButtons from './ActionButtons';
import ColumnModal from './ColumnModal';
import CellContextMenu from './CellContextMenu';
import ColumnContextMenu from './ColumnContextMenu';
import RowContextMenu from './RowContextMenu';
import MemoEditModal from './MemoEditModal';
import SheetToolbar from './SheetToolbar';
import { ConfirmDialog } from '@/components/ui';
import DeleteRowDialog from '@/components/ui/DeleteRowDialog';

// Utils
import { cellKey, rafThrottle, formatDisplayValue } from './utils';
import { evaluateFormula } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';

export default function SheetTable({ projectId, sheet, onAddMemo }: SheetTableProps) {
  const t = useTranslations();

  // Store actions
  const {
    updateCell,
    updateCellsStyle,
    addRow,
    insertRow,
    addColumn,
    insertColumn,
    deleteColumn,
    deleteRow,
    updateColumn,
    updateRow,
    cellSelectionMode,
    cancelCellSelection,
    projects,
  } = useProjectStore();

  const { pushState } = useHistoryStore();
  const { zoomLevel, setCurrentCellStyle, columnHeaderFontSize, rowHeaderFontSize, rowHeaderWidth } = useSheetUIStore();

  // Refs
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const inlineAutocompleteRef = useRef<FormulaAutocompleteRef>(null);

  // 현재 프로젝트
  const currentProject = projects.find((p) => p.id === projectId);

  // 수식 계산 (computedRows)
  const computedRows = useMemo(() => {
    const result: Record<string, CellValue>[] = [];

    for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
      const row = sheet.rows[rowIndex];
      const computedRow: Record<string, CellValue> = { ...row.cells };

      for (const column of sheet.columns) {
        const rawValue = row.cells[column.id];

        // 셀 자체에 수식이 있는 경우
        if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
          const evalResult = evaluateFormula(rawValue, {
            sheets: currentProject?.sheets || [],
            currentSheet: sheet,
            currentRow: computedRow,
            currentRowIndex: rowIndex,
            allRows: result,
          });
          computedRow[column.id] = evalResult.error ? `#ERR: ${evalResult.error}` : evalResult.value;
          continue;
        }

        // 셀에 직접 값이 있으면 사용
        if (rawValue !== null && rawValue !== undefined) {
          computedRow[column.id] = rawValue;
          continue;
        }

        // 컬럼 수식 사용
        if (column.type === 'formula' && column.formula) {
          const evalResult = evaluateFormula(column.formula, {
            sheets: currentProject?.sheets || [],
            currentSheet: sheet,
            currentRow: computedRow,
            currentRowIndex: rowIndex,
            allRows: result,
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

  // ========== HOOKS ==========

  // 리사이즈 훅
  const {
    columnWidths,
    rowHeights,
    headerHeight,
    resizingColumn,
    resizingRow,
    resizingHeader,
    tableWidth,
    handleResizeStart,
    handleRowResizeStart,
    handleHeaderResizeStart,
  } = useSheetResize({ projectId, sheet });

  // 선택 훅 (x-spreadsheet의 Selector 패턴 적용)
  const {
    selectedCell,
    selectedCells,
    selector,  // CellRange 기반 선택 객체
    formulaBarValue,
    isDraggingRef,
    dragStartCellRef,
    lastSelectedCellRef,
    setSelectedCell,
    setSelectedCells,
    setFormulaBarValue,
    isRowSelected,
    handleRowSelect,
    handleSelectAll,
    isCellSelected,
    isCellSelectedByIndex,
    isColumnInSelection,
    isRowInSelection,
    selectCell,
    clearSelection,
    selectCellByIndex,
    extendSelection,
    calculateDragSelection,
    copySelectedCells,
    clearSelectedCells,
    pasteToSelectedCells,
    cutSelectedCells,
    selectColumn,
    selectRow,
    selectAllCells,
  } = useSheetSelection({ projectId, sheet, computedRows });

  // 편집 훅
  const {
    editingCell,
    editValue,
    showAutocomplete,
    isFormulaBarFocused,
    validationError,
    inputRef,
    setEditingCell,
    setEditValue,
    setShowAutocomplete,
    setIsFormulaBarFocused,
    startEditing,
    finishEditing,
    finishFormulaBarEditing,
    commitCurrentEditingCell,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = useSheetEditing({
    projectId,
    sheet,
    selectedCell,
    selectedCells,
    formulaBarValue,
    setFormulaBarValue,
    setSelectedCells,
  });

  // 드래그 훅
  const {
    isFillDragging,
    fillPreviewCells,
    fillPreviewCellsSet,
    handleFillHandleMouseDown,
    handleFillDragEnter,
    isMoveDragging,
    moveTargetCell,
    moveStartCellRef,
    isCopyMode,
    handleMoveStart,
    handleMoveDragEnter,
    isCheckboxDragging,
    setIsCheckboxDragging,
    checkboxDragModeRef,
    lastDragRowIndexRef,
  } = useSheetDrag({
    projectId,
    sheet,
    selectedCell,
    selectedCells,
    setSelectedCell,
    setSelectedCells,
    setFormulaBarValue,
    calculateDragSelection,
    tableContainerRef,
    columnWidths,
    rowHeights,
    headerHeight,
  });

  // 키보드 훅
  const {
    handleHiddenInputChange,
    handleHiddenInputCompositionStart,
    handleHiddenInputCompositionEnd,
  } = useSheetKeyboard({
    sheet,
    editingCell,
    selectedCell,
    selectedCells,
    copySelectedCells,
    pasteToSelectedCells,
    clearSelectedCells,
    selectAllCells,
    selectColumn,
    selectRow,
    startEditing,
    setSelectedCells,
    setSelectedCell,
    setEditingCell,
    setEditValue,
    setFormulaBarValue,
    hiddenInputRef,
    selectCellByIndex,
    extendSelection,
    selector,
  });

  // 컨텍스트 메뉴 훅
  const {
    contextMenu,
    columnContextMenu,
    rowContextMenu,
    resizeContextMenu,
    memoModal,
    deleteColumnConfirm,
    deleteRowConfirm,
    setContextMenu,
    setColumnContextMenu,
    setRowContextMenu,
    setResizeContextMenu,
    setMemoModal,
    setDeleteColumnConfirm,
    setDeleteRowConfirm,
    handleContextMenu,
    insertRowAbove,
    insertRowBelow,
    insertColumnLeft,
    insertColumnRight,
    deleteSelectedRows,
    deleteSelectedColumn,
  } = useSheetContextMenu({
    projectId,
    sheet,
    selectedCells,
    setSelectedCell,
    setSelectedCells,
  });

  // ========== 추가 상태 ==========
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editorPosition, setEditorPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // 메모 툴팁 상태
  const [hoveredMemo, setHoveredMemo] = useState<{
    content: string;
    x: number;
    y: number;
  } | null>(null);

  // ========== 계산된 값 ==========

  // 선택된 셀 정보
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

  // 기본 셀 스타일
  const defaultCellStyle = DEFAULT_CELL_STYLE;

  // ========== 핸들러 ==========

  // 에디터 위치 계산 - 실제 셀 DOM 요소의 크기를 직접 사용
  const refreshEditorPosition = useCallback(() => {
    if (!editingCell || !tableContainerRef.current) return null;

    const cellEl = tableContainerRef.current.querySelector(
      `[data-cell-id="${cellKey(editingCell.rowId, editingCell.columnId)}"]`
    ) as HTMLElement | null;

    if (!cellEl) return null;

    const containerRect = tableContainerRef.current.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();
    const scrollLeft = tableContainerRef.current.scrollLeft;
    const scrollTop = tableContainerRef.current.scrollTop;

    // 실제 셀 요소의 크기를 그대로 사용 (border, padding 포함)
    return {
      top: cellRect.top - containerRect.top + scrollTop,
      left: cellRect.left - containerRect.left + scrollLeft,
      width: cellRect.width,
      height: cellRect.height,
    };
  }, [editingCell]);

  // 에디터 위치 업데이트
  useEffect(() => {
    if (!editingCell) {
      setEditorPosition(null);
      return;
    }

    const newPosition = refreshEditorPosition();
    setEditorPosition(newPosition);

    setTimeout(() => {
      if (overlayInputRef.current) {
        overlayInputRef.current.focus();
        const len = overlayInputRef.current.value.length;
        overlayInputRef.current.setSelectionRange(len, len);
      }
    }, 0);
  }, [editingCell, refreshEditorPosition]);

  // 셀 스타일 변경 시 현재 스타일 업데이트
  // 셀에 지정된 스타일이 없으면 기본 스타일(DEFAULT_CELL_STYLE)을 사용
  useEffect(() => {
    if (selectedCell) {
      const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
      const cellStyle = row?.cellStyles?.[selectedCell.columnId] || {};
      // 기본 스타일과 셀 스타일 병합 (셀 스타일이 우선)
      setCurrentCellStyle({ ...DEFAULT_CELL_STYLE, ...cellStyle });
    } else {
      // 선택된 셀이 없을 때도 기본 스타일 표시
      setCurrentCellStyle(DEFAULT_CELL_STYLE);
    }
  }, [selectedCell, sheet.rows, setCurrentCellStyle]);

  // 스타일 변경 핸들러
  const handleStyleChange = useCallback(
    (style: Partial<CellStyle>) => {
      if (selectedCells.length === 0) return;
      pushState(projects, '스타일 변경');
      updateCellsStyle(projectId, sheet.id, selectedCells, style);
    },
    [selectedCells, updateCellsStyle, projectId, sheet.id, pushState, projects]
  );

  // 메모 툴팁 핸들러 - 셀 진입 시 바로 표시, 셀 기준 아래에 위치
  const handleCellMouseEnterForMemo = useCallback(
    (rowId: string, columnId: string, e: React.MouseEvent, memo?: string) => {
      if (memo) {
        // 셀 요소의 위치 가져오기
        const cellElement = (e.target as HTMLElement).closest('[data-cell-id]');
        if (cellElement) {
          const rect = cellElement.getBoundingClientRect();
          setHoveredMemo({
            content: memo,
            x: rect.left,
            y: rect.bottom + 4, // 셀 아래 4px
          });
        }
      }
    },
    []
  );

  const handleCellMouseLeaveForMemo = useCallback(() => {
    setHoveredMemo(null);
  }, []);

  // 체크박스 드래그 핸들러
  const handleRowNumberDragStart = useCallback(
    (row: Row, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const wasSelected = isRowSelected(row.id);
      checkboxDragModeRef.current = wasSelected ? 'deselect' : 'select';

      const rowIndex = sheet.rows.findIndex((r) => r.id === row.id);
      lastDragRowIndexRef.current = rowIndex;

      setIsCheckboxDragging(true);
      handleRowSelect(row);
    },
    [isRowSelected, handleRowSelect, sheet.rows, checkboxDragModeRef, lastDragRowIndexRef, setIsCheckboxDragging]
  );

  const handleCheckboxDragEnterThrottled = useMemo(
    () =>
      rafThrottle((rowId: string) => {
        if (!checkboxDragModeRef.current) return;

        const currentRowIndex = sheet.rows.findIndex((r) => r.id === rowId);
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
        }

        lastDragRowIndexRef.current = currentRowIndex;
      }),
    [sheet.rows, isRowSelected, handleRowSelect, checkboxDragModeRef, lastDragRowIndexRef]
  );

  const handleCheckboxDragEnter = useCallback(
    (row: Row) => {
      if (!isCheckboxDragging) return;
      handleCheckboxDragEnterThrottled(row.id);
    },
    [isCheckboxDragging, handleCheckboxDragEnterThrottled]
  );

  // 셀 마우스다운 핸들러 - x-spreadsheet 패턴: selector.set(ri, ci)
  const handleCellMouseDown = useCallback(
    (rowId: string, columnId: string, e: React.MouseEvent) => {
      // 컨테이너의 clearSelection이 호출되지 않도록 버블링 중단
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.button !== 0) return;

      if (editingCell && (editingCell.rowId !== rowId || editingCell.columnId !== columnId)) {
        commitCurrentEditingCell();
      }

      // x-spreadsheet 패턴: selector.set(ri, ci) - 드래그 시작점 설정
      const ri = sheet.rows.findIndex((r) => r.id === rowId);
      const ci = sheet.columns.findIndex((c) => c.id === columnId);
      if (ri === -1 || ci === -1) return;

      // 같은 셀 클릭 시 선택 해제 (토글) - selector 직접 비교
      // 단일 셀 선택 상태일 때만 토글 (범위 선택 중이 아닐 때)
      if (selector && selector.ri === ri && selector.ci === ci && selector.range.size === 1) {
        clearSelection();
        return;
      }

      isDraggingRef.current = true;
      dragStartCellRef.current = { rowId, columnId };

      // selectCellByIndex로 시작점 설정 (Selector 사용)
      selectCellByIndex(ri, ci);

      const row = sheet.rows[ri];
      const rawValue = row?.cells[columnId];
      setFormulaBarValue(rawValue?.toString() || '');
    },
    [
      sheet.rows,
      sheet.columns,
      selector,
      editingCell,
      commitCurrentEditingCell,
      isDraggingRef,
      dragStartCellRef,
      selectCellByIndex,
      clearSelection,
      setFormulaBarValue,
    ]
  );

  // 셀 마우스엔터 핸들러 (드래그 선택) - x-spreadsheet 패턴: extendSelection 사용
  const handleCellMouseEnterThrottled = useMemo(
    () =>
      rafThrottle((rowId: string, columnId: string) => {
        if (!isDraggingRef.current || !dragStartCellRef.current) return;

        // x-spreadsheet 패턴: selector.setEnd(ri, ci) - 시작점은 유지, 범위만 확장
        const ri = sheet.rows.findIndex((r) => r.id === rowId);
        const ci = sheet.columns.findIndex((c) => c.id === columnId);
        if (ri === -1 || ci === -1) return;

        extendSelection(ri, ci);
      }),
    [isDraggingRef, dragStartCellRef, sheet.rows, sheet.columns, extendSelection]
  );

  const handleCellMouseEnter = useCallback(
    (rowId: string, columnId: string, e: React.MouseEvent, memo?: string) => {
      // 드래그 선택 처리
      handleCellMouseEnterThrottled(rowId, columnId);
      // 메모 툴팁 처리
      handleCellMouseEnterForMemo(rowId, columnId, e, memo);
    },
    [handleCellMouseEnterThrottled, handleCellMouseEnterForMemo]
  );

  // 드래그 종료 - Fortune Sheet 패턴: 드래그 플래그만 해제
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        // 선택 상태는 이미 handleCellMouseEnter에서 업데이트됨
        // 단일 셀 클릭의 경우 handleCellMouseDown에서 이미 설정됨
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDraggingRef]);

  // 컨테이너 마우스다운 (외부 클릭)
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      const container = tableContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const scrollbarWidth = container.offsetWidth - container.clientWidth;
        const scrollbarHeight = container.offsetHeight - container.clientHeight;
        if (e.clientX > rect.right - scrollbarWidth) return;
        if (e.clientY > rect.bottom - scrollbarHeight) return;
      }

      // 테이블 바깥(빈 공간) 클릭 시 선택 해제
      const target = e.target as HTMLElement;
      // 셀(td), 헤더(th) 내부 클릭이 아닌 경우에만 해제
      if (!target.closest('td') && !target.closest('th')) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // ========== TanStack Table ==========
  const columns: ColumnDef<Row>[] = useMemo(() => {
    const cols: ColumnDef<Row>[] = [];

    // 행 번호 컬럼
    cols.push({
      id: 'rowNumber',
      header: () => {
        const allSelected = sheet.rows.length > 0 && sheet.rows.every((row) => isRowSelected(row.id));
        const someSelected = sheet.rows.some((row) => isRowSelected(row.id));
        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onChange={handleSelectAll}
              size="sm"
            />
          </div>
        );
      },
      cell: ({ row }) => {
        const rowIndex = sheet.rows.findIndex((r) => r.id === row.original.id);
        return (
          <div
            className="flex select-none cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            style={{ height: '100%', width: '100%' }}
            onMouseEnter={() => handleCheckboxDragEnter(row.original)}
            onClick={(e) => {
              e.stopPropagation();
              selectRow(row.original.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectRow(row.original.id);
              setRowContextMenu({
                x: e.clientX,
                y: e.clientY,
                row: row.original,
                rowIndex,
              });
            }}
          >
            {/* 체크박스 영역 - 고정 너비, 이벤트 전파 차단 */}
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 32, height: '100%' }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
              onMouseDown={(e) => handleRowNumberDragStart(row.original, e)}
            >
              <Checkbox
                checked={isRowSelected(row.original.id)}
                onChange={() => handleRowSelect(row.original)}
                size="sm"
              />
            </div>
            {/* 구분선 */}
            <div
              className="flex-shrink-0 flex items-center"
              style={{ height: '100%' }}
            >
              <div style={{ width: 1, height: '50%', background: 'var(--border-secondary)' }} />
            </div>
            {/* 행 번호 영역 */}
            <div
              className="flex-1 flex items-center"
              style={{ height: '100%', paddingLeft: 8 }}
            >
              <span
                className="font-medium"
                style={{ color: 'var(--text-tertiary)', fontSize: `${rowHeaderFontSize}px` }}
              >
                {rowIndex + 1}
              </span>
            </div>
          </div>
        );
      },
      size: 80,
    });

    // 데이터 컬럼
    for (const col of sheet.columns) {
      cols.push({
        id: col.id,
        accessorKey: col.id,
        header: col.name,
        cell: ({ row }) => {
          const rowIndex = sheet.rows.findIndex((r) => r.id === row.original.id);
          const computedValue = computedRows[rowIndex]?.[col.id];
          const rawValue = row.original.cells[col.id];
          const displayValue = computedValue ?? rawValue ?? '';
          const cellStyle = row.original.cellStyles?.[col.id];
          const cellMemo = row.original.cellMemos?.[col.id];

          const cellHasFormula = typeof rawValue === 'string' && rawValue.startsWith('=');
          const usesColumnFormula = !!(col.type === 'formula' && col.formula && !rawValue);
          const hasCellOverride = rawValue !== null && rawValue !== undefined && rawValue !== '';

          return null; // SheetCell은 SheetBody에서 렌더링
        },
        size: col.width || 120,
      });
    }

    // 삭제 버튼 컬럼
    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const rowIndex = sheet.rows.findIndex((r) => r.id === row.original.id);
        const hasValue = Object.values(row.original.cells).some(
          (v) => v !== null && v !== undefined && v !== ''
        );
        return (
          <button
            onClick={() => setDeleteRowConfirm({ rowId: row.original.id, rowIndex, hasValue })}
            className="p-1 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        );
      },
      size: 36,
    });

    return cols;
  }, [
    sheet.columns,
    sheet.rows,
    computedRows,
    isRowSelected,
    handleRowSelect,
    handleSelectAll,
    handleRowNumberDragStart,
    handleCheckboxDragEnter,
    setDeleteRowConfirm,
    selectRow,
    setRowContextMenu,
    rowHeaderFontSize,
  ]);

  const table = useReactTable({
    data: sheet.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 행 가상화 - TanStack Virtual 공식 패턴
  // 참고: https://tanstack.com/virtual/latest/docs/examples/react/table
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const row = table.getRowModel().rows[index];
        return rowHeights[row?.original?.id] || 36;
      },
      [rowHeights]
    ),
    // TanStack 공식 예제: measureElement로 실제 DOM 높이 측정
    // Firefox는 getBoundingClientRect 이슈가 있어서 제외
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  });

  // 행 높이 변경 시 가상화 시스템에 알림 - useLayoutEffect 사용 (페인트 전에 실행)
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeights, rowVirtualizer]);

  // ========== RENDER ==========
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 숨겨진 input - IME 입력 처리 */}
      <input
        ref={hiddenInputRef}
        type="text"
        onChange={handleHiddenInputChange}
        onCompositionStart={handleHiddenInputCompositionStart}
        onCompositionEnd={handleHiddenInputCompositionEnd}
        onBlur={() => {
          if (hiddenInputRef.current) {
            hiddenInputRef.current.value = '';
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            const value = e.currentTarget.value;
            if (value && selectedCell && !editingCell) {
              setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
              setEditValue(value);
              setFormulaBarValue(value);
              e.currentTarget.value = '';
            }
          } else if (e.key === 'Escape') {
            e.currentTarget.value = '';
            e.currentTarget.blur();
          }
        }}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        style={{ position: 'fixed', top: -9999, left: -9999 }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* 셀 선택 모드 알림 */}
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
            className="p-1 rounded transition-colors"
            style={{ color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {t('table.selectCellMode')}
          </span>
        </div>
      )}

      {/* 툴바 */}
      <SheetToolbar
        onStyleChange={handleStyleChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddMemo={onAddMemo}
      />

      {/* 수식바 */}
      <FormulaBar
        selectedCell={selectedCell}
        selectedCellInfo={selectedCellInfo}
        formulaBarValue={formulaBarValue}
        isFormulaBarFocused={isFormulaBarFocused}
        editingCell={editingCell}
        validationError={validationError}
        isFormulaCell={(() => {
          if (!selectedCell) return false;
          const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
          const rawValue = row?.cells[selectedCell.columnId];
          // 셀 자체에 수식이 있거나, 컬럼이 수식 타입인 경우
          const cellHasFormula = typeof rawValue === 'string' && rawValue.startsWith('=');
          const column = sheet.columns.find((c) => c.id === selectedCell.columnId);
          const isFormulaColumn = column?.type === 'formula' && !!column.formula;
          return cellHasFormula || isFormulaColumn;
        })()}
        onFormulaBarChange={(value) => {
          setFormulaBarValue(value);
          if (editingCell) setEditValue(value);
        }}
        onFormulaBarFocus={() => setIsFormulaBarFocused(true)}
        onFormulaBarBlur={() => {
          if (!editingCell) finishFormulaBarEditing();
        }}
        onFormulaBarKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            finishFormulaBarEditing();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsFormulaBarFocused(false);
            const row = sheet.rows.find((r) => r.id === selectedCell?.rowId);
            const rawValue = row?.cells[selectedCell?.columnId || ''];
            setFormulaBarValue(rawValue?.toString() || '');
          }
        }}
        onCancelEdit={() => {
          setEditingCell(null);
          setEditorPosition(null);
          setIsFormulaBarFocused(false);
          if (selectedCell) {
            const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
            const rawValue = row?.cells[selectedCell.columnId];
            setFormulaBarValue(rawValue?.toString() || '');
          }
        }}
        onConfirmEdit={() => {
          if (editingCell) finishEditing();
          else if (isFormulaBarFocused) finishFormulaBarEditing();
        }}
        columns={sheet.columns}
        sheets={currentProject?.sheets}
        currentSheetId={sheet.id}
        t={t}
      />

      {/* 테이블 컨테이너 */}
      <div className="flex-1 overflow-hidden relative" ref={tableWrapperRef}>
        <div
          ref={tableContainerRef}
          className={cn('h-full rounded-lg border relative select-none', resizingColumn && 'select-none')}
          style={{
            overflowY: 'auto',
            overflowX: 'auto',
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
          onMouseDown={(e) => {
            setContextMenu(null);
            setColumnContextMenu(null);
            setRowContextMenu(null);
            if (e.button === 2) return;
            handleContainerMouseDown(e);
          }}
        >
          {/* 오버레이 에디터 */}
          {editingCell && editorPosition && (
            <>
              <CellEditor
                ref={overlayInputRef}
                value={editValue}
                onChange={(value) => {
                  setEditValue(value);
                  setFormulaBarValue(value);
                  setShowAutocomplete(value.startsWith('=') && value.length > 1);
                }}
                onKeyDown={(e) => {
                  // 자동완성이 열려있고 아이템이 있을 때 키보드 네비게이션 먼저 처리
                  if (showAutocomplete && inlineAutocompleteRef.current?.hasItems()) {
                    const handled = inlineAutocompleteRef.current.handleKeyDown(e);
                    if (handled) return;
                  }

                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    finishEditing();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditingCell(null);
                    setEditorPosition(null);
                    setEditValue('');
                    setShowAutocomplete(false);
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    finishEditing();
                  }
                }}
                onBlur={(e) => {
                  // 자동완성 클릭 시 blur 무시
                  const relatedTarget = e?.relatedTarget as HTMLElement;
                  if (relatedTarget?.closest('[data-autocomplete]')) {
                    return;
                  }
                  setTimeout(() => {
                    if (document.activeElement !== overlayInputRef.current) {
                      finishEditing();
                    }
                  }, 100);
                }}
                position={editorPosition}
                isFormula={editValue.startsWith('=')}
              />
              {/* 인라인 에디터 자동완성 - 항상 렌더링하되 visible로 표시 제어 */}
              <div
                className="absolute z-[60]"
                style={{
                  top: editorPosition.top + editorPosition.height + 4,
                  left: editorPosition.left,
                }}
              >
                <FormulaAutocomplete
                  ref={inlineAutocompleteRef}
                  value={editValue}
                  columns={sheet.columns}
                  sheets={currentProject?.sheets}
                  currentSheetId={sheet.id}
                  visible={showAutocomplete}
                  onSelect={(newValue) => {
                    setEditValue(newValue);
                    setFormulaBarValue(newValue);
                    setShowAutocomplete(false);
                    overlayInputRef.current?.focus();
                  }}
                />
              </div>
            </>
          )}

          {/* 테이블 */}
          <table
            className="border-collapse table-fixed"
            style={{
              width: tableWidth,
              minWidth: tableWidth,
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'left top',
              contain: 'layout style paint',
            }}
          >
            {/* 헤더 - TanStack Table 패턴: display: flex */}
            <thead
              className={cn('sticky top-0 z-10', resizingHeader && 'select-none')}
              style={{ display: 'block', background: 'var(--bg-tertiary)' }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ display: 'flex', width: tableWidth }}>
                  {headerGroup.headers.map((header) => {
                    const isRowNumber = header.id === 'rowNumber';
                    const isActions = header.id === 'actions';
                    const width = isActions ? 36 : columnWidths[header.id] || (isRowNumber ? 80 : 150);
                    // 선택된 범위에 포함된 열인지 확인 (다중 선택 지원)
                    const isSelectedColumn = !isRowNumber && !isActions && isColumnInSelection(header.id);

                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'text-xs font-bold uppercase tracking-wide relative',
                          isRowNumber ? 'text-center' : 'text-left',
                          !isRowNumber && !isActions && 'cursor-pointer hover:bg-[var(--bg-secondary)]'
                        )}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: isRowNumber ? 'center' : undefined,
                          width,
                          flex: `0 0 ${width}px`,
                          minWidth: isActions ? 36 : 100,
                          // 패딩으로 높이 조절 (내용에 따라 자동 확장)
                          padding: isActions ? '4px' : '8px 12px',
                          color: isSelectedColumn ? 'var(--row-col-highlight-text)' : 'var(--text-secondary)',
                          background: isSelectedColumn ? 'var(--row-col-highlight)' : undefined,
                          fontWeight: isSelectedColumn ? 700 : undefined,
                          // 선택 시에도 높이 변화 없도록 box-shadow 사용 (border 대신)
                          borderBottom: '1px solid var(--border-primary)',
                          boxShadow: isSelectedColumn ? 'inset 0 -2px 0 var(--row-col-highlight-border)' : undefined,
                          borderRight: '1px solid var(--border-primary)',
                        }}
                        onClick={(e) => {
                          // 데이터 열 헤더 클릭 시 해당 열 전체 선택
                          if (!isRowNumber && !isActions) {
                            e.stopPropagation();
                            selectColumn(header.id);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (!isRowNumber && !isActions) {
                            const column = sheet.columns.find((c) => c.id === header.id);
                            if (column) {
                              setColumnContextMenu({ x: e.clientX, y: e.clientY, column });
                            }
                          }
                        }}
                      >
                        {/* 열 헤더 내용: 컬럼명 + exportName */}
                        {header.isPlaceholder ? null : (
                          !isRowNumber && !isActions ? (
                            <div
                              className="flex flex-col items-start min-w-0 w-full"
                              style={{ fontSize: `${columnHeaderFontSize}px`, lineHeight: 1.3 }}
                            >
                              <span
                                className="w-full flex items-center gap-1.5"
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span className="truncate">
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                </span>
                                {/* 수식 컬럼 표시 */}
                                {(() => {
                                  const col = sheet.columns.find((c) => c.id === header.id);
                                  if (col?.type === 'formula' && col.formula) {
                                    return (
                                      <span
                                        className="shrink-0 flex items-center justify-center"
                                        style={{
                                          width: 16,
                                          height: 16,
                                          background: 'var(--primary-purple-light)',
                                          color: 'var(--primary-purple)',
                                          borderRadius: 4,
                                          fontSize: 10,
                                          fontWeight: 600,
                                          fontStyle: 'italic',
                                        }}
                                        title={`수식: ${col.formula}`}
                                      >
                                        ƒ
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </span>
                              {(() => {
                                const col = sheet.columns.find((c) => c.id === header.id);
                                if (col?.exportName) {
                                  // exportName 폰트 크기는 헤더 폰트 크기보다 2px 작게
                                  const exportNameFontSize = Math.max(8, columnHeaderFontSize - 2);
                                  return (
                                    <>
                                      <div
                                        className="w-full"
                                        style={{ height: 1, background: 'var(--border-secondary)', margin: '4px 0' }}
                                      />
                                      <span
                                        className="w-full font-normal lowercase"
                                        style={{
                                          fontSize: `${exportNameFontSize}px`,
                                          color: 'var(--text-tertiary)',
                                          letterSpacing: 0,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {col.exportName}
                                      </span>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )
                        )}

                        {/* 열 너비 조절 핸들 - TanStack Table 패턴 */}
                        {!isActions && (
                          <div
                            className="absolute top-0 -right-[4px] h-full w-[8px] cursor-col-resize group/resizer z-20"
                            onMouseDown={(e) => handleResizeStart(header.id, e)}
                            onDoubleClick={() => {
                              // 더블클릭으로 기본 너비로 리셋
                              const col = sheet.columns.find(c => c.id === header.id);
                              if (col) handleResizeStart(header.id, { clientX: 0, preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent);
                            }}
                          >
                            <div
                              className={cn(
                                'absolute top-1 bottom-1 left-1/2 -translate-x-1/2 w-[3px] rounded-full transition-all',
                                resizingColumn === header.id
                                  ? 'bg-[var(--primary-blue)] opacity-100'
                                  : 'bg-[var(--border-secondary)] opacity-0 group-hover/resizer:opacity-100 group-hover/resizer:bg-[var(--primary-blue)]'
                              )}
                            />
                          </div>
                        )}

                        {/* 헤더 높이 조절 핸들 */}
                        {!isActions && (
                          <div
                            className="absolute -bottom-[4px] left-0 right-0 h-[8px] cursor-row-resize group/hresizer z-20"
                            onMouseDown={handleHeaderResizeStart}
                          >
                            <div
                              className={cn(
                                'absolute left-1 right-1 top-1/2 -translate-y-1/2 h-[3px] rounded-full transition-all',
                                resizingHeader
                                  ? 'bg-[var(--primary-blue)] opacity-100'
                                  : 'bg-[var(--border-secondary)] opacity-0 group-hover/hresizer:opacity-100 group-hover/hresizer:bg-[var(--primary-blue)]'
                              )}
                            />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* 바디 - 가상화, TanStack Table 패턴: display: block + relative */}
            <tbody
              style={{
                display: 'block',
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {table.getRowModel().rows.length === 0 ? (
                <tr style={{ display: 'flex', position: 'absolute', width: tableWidth }}>
                  <td
                    colSpan={columns.length}
                    className="text-center py-12"
                    style={{ color: 'var(--text-tertiary)', width: tableWidth }}
                  >
                    {t('table.noData')}
                  </td>
                </tr>
              ) : (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index];
                  if (!row) return null;

                  const rowData = row.original;
                  const rowHeight = rowHeights[rowData.id] || 36;
                  const rowIndex = virtualRow.index;
                  // 선택된 범위에 포함된 행인지 확인 (다중 선택 지원)
                  const isSelectedRow = isRowInSelection(rowData.id);

                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={(node) => {
                        // TanStack 공식 패턴: measureElement 호출
                        if (node) {
                          rowVirtualizer.measureElement(node);
                        }
                      }}
                      className={cn(resizingRow && 'select-none')}
                      style={{
                        display: 'flex',
                        position: 'absolute',
                        transform: `translateY(${virtualRow.start}px)`,
                        width: tableWidth,
                        background: 'var(--bg-primary)',
                        height: rowHeight,
                        // 테마 전환 성능 최적화: 행 단위로 리플로우 범위 제한
                        contain: 'content',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-primary)')}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isRowNumber = cell.column.id === 'rowNumber';
                        const isActions = cell.column.id === 'actions';
                        const columnId = cell.column.id;
                        const width = isActions ? 36 : columnWidths[columnId] || (isRowNumber ? 80 : 150);

                        // 행 번호/액션 셀
                        if (isRowNumber || isActions) {
                          return (
                            <td
                              key={cell.id}
                              className={cn('text-[14px] relative', isActions && 'px-1', isRowNumber && 'text-center')}
                              style={{
                                display: 'flex',
                                // 행 번호 셀은 stretch로 자식이 전체 높이 차지, 액션 셀은 center
                                alignItems: isRowNumber ? 'stretch' : 'center',
                                justifyContent: isActions ? 'center' : undefined,
                                width,
                                flex: `0 0 ${width}px`,
                                minWidth: isActions ? 36 : 100,
                                height: rowHeight,
                                background: isActions
                                  ? 'var(--bg-secondary)'
                                  : isRowNumber && isSelectedRow
                                    ? 'var(--row-col-highlight)'
                                    : undefined,
                                color: isRowNumber && isSelectedRow ? 'var(--row-col-highlight-text)' : undefined,
                                fontWeight: isRowNumber && isSelectedRow ? 700 : undefined,
                                borderBottom: '1px solid var(--border-primary)',
                                borderRight: '1px solid var(--border-primary)',
                                // 선택 시에도 너비 변화 없도록 box-shadow 사용 (border 대신)
                                boxShadow: isRowNumber && isSelectedRow ? 'inset -2px 0 0 var(--row-col-highlight-border)' : undefined,
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}

                              {/* 행 높이 조절 핸들 */}
                              {isRowNumber && (
                                <div
                                  className={cn(
                                    'absolute left-0 right-0 cursor-row-resize transition-colors z-10',
                                    resizingRow === rowData.id ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                                  )}
                                  style={{ bottom: -3, height: 7 }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    handleRowResizeStart(rowData.id, e);
                                  }}
                                />
                              )}
                            </td>
                          );
                        }

                        // 데이터 셀
                        const column = sheet.columns.find((c) => c.id === columnId);
                        if (!column) {
                          return <td key={cell.id} style={{ width, height: rowHeight }} />;
                        }

                        const cellKeyStr = cellKey(rowData.id, columnId);
                        const isSelected = selectedCell?.rowId === rowData.id && selectedCell?.columnId === columnId;
                        // x-spreadsheet 패턴: CellRange.includes()로 O(1) 확인
                        const colIdx = sheet.columns.findIndex((c) => c.id === columnId);
                        const isMultiSelected = isCellSelectedByIndex(rowIndex, colIdx);
                        const isFillPreview = fillPreviewCellsSet.has(cellKeyStr);
                        const isMoveTarget = moveTargetCell?.rowId === rowData.id && moveTargetCell?.columnId === columnId;
                        const isMoveSource =
                          moveStartCellRef.current?.rowId === rowData.id &&
                          moveStartCellRef.current?.columnId === columnId;
                        const isEditing = editingCell?.rowId === rowData.id && editingCell?.columnId === columnId;

                        const computedValue = computedRows[rowIndex]?.[columnId];
                        const rawValue = rowData.cells[columnId];
                        const displayValue = computedValue ?? rawValue ?? '';

                        const cellStyle = rowData.cellStyles?.[columnId];
                        const cellMemo = rowData.cellMemos?.[columnId];

                        const cellHasFormula = typeof rawValue === 'string' && rawValue.startsWith('=');
                        const usesColumnFormula = !!(column.type === 'formula' && column.formula && !rawValue);
                        const hasCellOverride = rawValue !== null && rawValue !== undefined && rawValue !== '';
                        const isFormulaColumn = column.type === 'formula';

                        // 배경색 계산
                        const getCellBackgroundColor = () => {
                          if (cellStyle?.bgColor) return cellStyle.bgColor;
                          // 수식 컬럼이면 살구색 배경 (수식이 있든 없든)
                          if (isFormulaColumn) {
                            return 'rgba(255, 237, 213, 0.5)';
                          }
                          // 셀 자체에 수식이 있는 경우
                          if (cellHasFormula) {
                            return 'rgba(255, 237, 213, 0.5)';
                          }
                          return 'transparent';
                        };

                        return (
                          <td
                            key={cell.id}
                            className="text-[14px] relative group"
                            style={{
                              width,
                              flex: `0 0 ${width}px`,
                              minWidth: 100,
                              height: rowHeight,
                              padding: 0,
                              borderBottom: '1px solid var(--border-primary)',
                              borderRight: '1px solid var(--border-primary)',
                              // 테마 전환 성능 최적화: 셀 단위로 리플로우 범위 제한
                              contain: 'strict',
                            }}
                          >
                            <SheetCell
                              rowId={rowData.id}
                              columnId={columnId}
                              cellKey={cellKeyStr}
                              value={rawValue}
                              displayValue={formatDisplayValue(displayValue)}
                              cellStyle={cellStyle}
                              cellMemo={cellMemo}
                              isSelected={isSelected}
                              isMultiSelected={isMultiSelected && !isSelected}
                              isFillPreview={isFillPreview}
                              isMoveTarget={isMoveTarget}
                              isMoveSource={isMoveSource}
                              isEditing={isEditing}
                              isLocked={column.locked || rowData.locked || false}
                              cellHasFormula={cellHasFormula}
                              usesColumnFormula={usesColumnFormula}
                              hasCellOverride={hasCellOverride}
                              isFormulaColumn={isFormulaColumn}
                              isCopyMode={isCopyMode}
                              backgroundColor={getCellBackgroundColor()}
                              onMouseDown={handleCellMouseDown}
                              onMouseEnter={handleCellMouseEnter}
                              onMouseLeave={handleCellMouseLeaveForMemo}
                              onDoubleClick={startEditing}
                              onContextMenu={handleContextMenu}
                              onFillHandleMouseDown={handleFillHandleMouseDown}
                              onMemoClick={() => {}}
                              dragToFillText={t('table.dragToFill')}
                              defaultFontSize={defaultCellStyle.fontSize || 13}
                            />

                            {/* 열 너비 조절 핸들 - fill handle(z-10)보다 아래 */}
                            <div
                              className="absolute top-0 -right-[4px] h-full w-[8px] cursor-col-resize group/cellresizer z-[5]"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(columnId, e);
                              }}
                            >
                              <div
                                className={cn(
                                  'absolute top-1 bottom-1 left-1/2 -translate-x-1/2 w-[3px] rounded-full transition-all',
                                  resizingColumn === columnId
                                    ? 'bg-[var(--primary-blue)] opacity-100'
                                    : 'bg-transparent opacity-0 group-hover/cellresizer:opacity-100 group-hover/cellresizer:bg-[var(--primary-blue)]'
                                )}
                              />
                            </div>

                            {/* 행 높이 조절 핸들 - fill handle(z-10)보다 아래 */}
                            <div
                              className="absolute -bottom-[4px] left-0 right-0 h-[8px] cursor-row-resize group/rowresizer z-[5]"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleRowResizeStart(rowData.id, e);
                              }}
                            >
                              <div
                                className={cn(
                                  'absolute left-1 right-1 top-1/2 -translate-y-1/2 h-[3px] rounded-full transition-all',
                                  resizingRow === rowData.id
                                    ? 'bg-[var(--primary-blue)] opacity-100'
                                    : 'bg-transparent opacity-0 group-hover/rowresizer:opacity-100 group-hover/rowresizer:bg-[var(--primary-blue)]'
                                )}
                              />
                            </div>
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
      </div>

      {/* 하단 액션 버튼 */}
      <ActionButtons
        onAddRow={() => addRow(projectId, sheet.id)}
        onAddColumn={() => setShowAddColumn(true)}
        addRowText={t('table.addRow')}
        addColumnText={t('table.addColumn')}
      />

      {/* 모달 & 컨텍스트 메뉴 */}
      {showAddColumn && (
        <ColumnModal
          columns={sheet.columns}
          sheets={currentProject?.sheets}
          currentSheetId={sheet.id}
          mode="add"
          onSave={(data) => {
            addColumn(projectId, sheet.id, data);
            setShowAddColumn(false);
          }}
          onClose={() => setShowAddColumn(false)}
        />
      )}

      {editingColumn && (
        <ColumnModal
          columns={sheet.columns}
          sheets={currentProject?.sheets}
          currentSheetId={sheet.id}
          mode="edit"
          column={editingColumn}
          onSave={(data) => {
            updateColumn(projectId, sheet.id, editingColumn.id, data);
            setEditingColumn(null);
          }}
          onClose={() => setEditingColumn(null)}
        />
      )}

      {contextMenu && (() => {
        const row = sheet.rows.find(r => r.id === contextMenu.rowId);
        const existingMemo = row?.cellMemos?.[contextMenu.columnId];
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
                memo: existingMemo || '',
              });
              setContextMenu(null);
            }}
            onDeleteMemo={existingMemo ? () => {
              const row = sheet.rows.find(r => r.id === contextMenu.rowId);
              if (row) {
                const newMemos = { ...row.cellMemos };
                delete newMemos[contextMenu.columnId];
                updateRow(projectId, sheet.id, contextMenu.rowId, {
                  cellMemos: Object.keys(newMemos).length > 0 ? newMemos : undefined,
                });
              }
              setContextMenu(null);
            } : undefined}
            canPaste={true}
            isMultiSelect={selectedCells.length > 1}
            isRowNumberCell={contextMenu.isRowNumberCell}
            isHeaderCell={contextMenu.isHeaderCell}
            hasMemo={!!existingMemo}
          />
        );
      })()}

      {columnContextMenu && (
        <ColumnContextMenu
          x={columnContextMenu.x}
          y={columnContextMenu.y}
          columnName={columnContextMenu.column.name}
          isLocked={columnContextMenu.column.locked || false}
          isExportExcluded={columnContextMenu.column.exportExcluded || false}
          onClose={() => setColumnContextMenu(null)}
          onToggleLock={() => {
            updateColumn(projectId, sheet.id, columnContextMenu.column.id, {
              locked: !columnContextMenu.column.locked,
            });
            setColumnContextMenu(null);
          }}
          onToggleExportExclude={() => {
            updateColumn(projectId, sheet.id, columnContextMenu.column.id, {
              exportExcluded: !columnContextMenu.column.exportExcluded,
            });
            setColumnContextMenu(null);
          }}
          onEdit={() => {
            setEditingColumn(columnContextMenu.column);
            setColumnContextMenu(null);
          }}
          onDelete={() => {
            setDeleteColumnConfirm({
              columnId: columnContextMenu.column.id,
              columnName: columnContextMenu.column.name,
            });
            setColumnContextMenu(null);
          }}
          onClearValues={() => {
            // Clear all values in this column
            sheet.rows.forEach((row) => {
              updateCell(projectId, sheet.id, row.id, columnContextMenu.column.id, '');
            });
            setColumnContextMenu(null);
          }}
          onInsertLeft={() => {
            const colIdx = sheet.columns.findIndex((c) => c.id === columnContextMenu.column.id);
            if (colIdx !== -1) {
              insertColumn(projectId, sheet.id, { name: `Column ${sheet.columns.length + 1}`, type: 'general' }, colIdx);
            }
            setColumnContextMenu(null);
          }}
          onInsertRight={() => {
            const colIdx = sheet.columns.findIndex((c) => c.id === columnContextMenu.column.id);
            if (colIdx !== -1) {
              insertColumn(projectId, sheet.id, { name: `Column ${sheet.columns.length + 1}`, type: 'general' }, colIdx + 1);
            }
            setColumnContextMenu(null);
          }}
        />
      )}

      {rowContextMenu && (
        <RowContextMenu
          x={rowContextMenu.x}
          y={rowContextMenu.y}
          rowIndex={rowContextMenu.rowIndex}
          isLocked={rowContextMenu.row.locked || false}
          onClose={() => setRowContextMenu(null)}
          onToggleLock={() => {
            updateRow(projectId, sheet.id, rowContextMenu.row.id, { locked: !rowContextMenu.row.locked });
            setRowContextMenu(null);
          }}
          onDelete={() => {
            const hasValue = Object.values(rowContextMenu.row.cells).some(
              (v) => v !== null && v !== undefined && v !== ''
            );
            setDeleteRowConfirm({
              rowId: rowContextMenu.row.id,
              rowIndex: rowContextMenu.rowIndex,
              hasValue,
            });
            setRowContextMenu(null);
          }}
          onClearValues={() => {
            sheet.columns.forEach((col) => {
              updateCell(projectId, sheet.id, rowContextMenu.row.id, col.id, '');
            });
            setRowContextMenu(null);
          }}
          onInsertAbove={() => {
            insertRow(projectId, sheet.id, rowContextMenu.rowIndex);
            setRowContextMenu(null);
          }}
          onInsertBelow={() => {
            insertRow(projectId, sheet.id, rowContextMenu.rowIndex + 1);
            setRowContextMenu(null);
          }}
        />
      )}

      {deleteColumnConfirm && (
        <ConfirmDialog
          isOpen={true}
          title={t('table.deleteColumnConfirmTitle')}
          message={t('table.deleteColumnConfirmMessage', { name: deleteColumnConfirm.columnName })}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          onConfirm={() => {
            deleteColumn(projectId, sheet.id, deleteColumnConfirm.columnId);
            setDeleteColumnConfirm(null);
          }}
          onClose={() => setDeleteColumnConfirm(null)}
          variant="danger"
        />
      )}

      {deleteRowConfirm && (
        <DeleteRowDialog
          isOpen={true}
          rowIndex={deleteRowConfirm.rowIndex}
          onClose={() => setDeleteRowConfirm(null)}
          onClearValues={() => {
            // Clear all values in the row
            const row = sheet.rows[deleteRowConfirm.rowIndex];
            if (row) {
              sheet.columns.forEach((col) => {
                updateCell(projectId, sheet.id, row.id, col.id, '');
              });
            }
            setDeleteRowConfirm(null);
          }}
          onDeleteRow={() => {
            deleteRow(projectId, sheet.id, deleteRowConfirm.rowId);
            setDeleteRowConfirm(null);
            setSelectedCell(null);
            setSelectedCells([]);
          }}
        />
      )}

      {/* 메모 편집 모달 */}
      {memoModal && (
        <MemoEditModal
          isOpen={!!memoModal}
          initialContent={memoModal.memo}
          onSave={(content) => {
            const row = sheet.rows.find(r => r.id === memoModal.rowId);
            if (row) {
              const newMemos = { ...row.cellMemos };
              if (content.trim()) {
                newMemos[memoModal.columnId] = content;
              } else {
                delete newMemos[memoModal.columnId];
              }
              updateRow(projectId, sheet.id, memoModal.rowId, {
                cellMemos: Object.keys(newMemos).length > 0 ? newMemos : undefined,
              });
            }
            setMemoModal(null);
          }}
          onClose={() => setMemoModal(null)}
        />
      )}

      {/* 메모 툴팁 - 포탈로 렌더링 */}
      {hoveredMemo && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none animate-fadeIn"
          style={{
            left: hoveredMemo.x,
            top: hoveredMemo.y,
          }}
        >
          {/* 말풍선 화살표 */}
          <div
            className="absolute -top-2 left-3 w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid rgba(251, 191, 36, 0.85)',
            }}
          />
          {/* 메모 내용 - glass-card 스타일 */}
          <div
            className="relative px-3 py-2 text-sm rounded-lg"
            style={{
              background: 'rgba(254, 243, 199, 0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: 'var(--warning-dark, #92400e)',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              maxWidth: '280px',
              minWidth: '120px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
              <span className="flex-1">{hoveredMemo.content}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
