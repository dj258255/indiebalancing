'use client';

/**
 * SheetCell - 메모이제이션된 셀 컴포넌트
 *
 * 성능 최적화 패턴:
 * - React.memo로 불필요한 리렌더링 방지
 * - 커스텀 비교 함수로 필요한 props만 비교
 *
 * 출처:
 * - React.memo 공식 문서: https://react.dev/reference/react/memo
 * - Handsontable 렌더링 최적화: https://handsontable.com/docs/javascript-data-grid/row-virtualization/
 */

import React, { memo, useCallback } from 'react';
import { Lock } from 'lucide-react';
import type { CellValue, CellStyle, Column, Row } from '@/types';
import { DEFAULT_CELL_STYLE } from '@/stores/sheetUIStore';

export interface SheetCellProps {
  // 식별자
  rowId: string;
  columnId: string;
  cellKey: string;

  // 데이터
  value: CellValue;
  displayValue: string | number;
  cellStyle?: CellStyle;
  cellMemo?: string;

  // 상태
  isSelected: boolean;
  isMultiSelected: boolean;
  isFillPreview: boolean;
  isMoveTarget: boolean;
  isMoveSource: boolean;
  isEditing: boolean;
  isLocked: boolean;
  cellHasFormula: boolean;
  usesColumnFormula: boolean;
  hasCellOverride: boolean;
  isFormulaColumn: boolean;
  isCopyMode: boolean;

  // 배경색 (계산된 값)
  backgroundColor: string;

  // 이벤트 핸들러
  onMouseDown: (rowId: string, columnId: string, e: React.MouseEvent) => void;
  onMouseEnter: (rowId: string, columnId: string, e: React.MouseEvent, memo?: string) => void;
  onMouseLeave: (rowId: string, columnId: string, memo?: string) => void;
  onDoubleClick: (rowId: string, columnId: string) => void;
  onContextMenu: (e: React.MouseEvent, rowId: string, columnId: string) => void;
  onFillHandleMouseDown: (e: React.MouseEvent) => void;
  onMemoClick: (rowId: string, columnId: string, memo: string) => void;

  // 번역
  dragToFillText: string;

  // 기본 스타일
  defaultFontSize: number;
}

// 커스텀 비교 함수 - 필요한 props만 비교하여 리렌더링 최소화
// 출처: https://react.dev/reference/react/memo#specifying-a-custom-comparison-function
function arePropsEqual(prevProps: SheetCellProps, nextProps: SheetCellProps): boolean {
  // 값 변경
  if (prevProps.value !== nextProps.value) return false;
  if (prevProps.displayValue !== nextProps.displayValue) return false;

  // 선택 상태 변경
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isMultiSelected !== nextProps.isMultiSelected) return false;
  if (prevProps.isFillPreview !== nextProps.isFillPreview) return false;
  if (prevProps.isMoveTarget !== nextProps.isMoveTarget) return false;
  if (prevProps.isMoveSource !== nextProps.isMoveSource) return false;
  if (prevProps.isEditing !== nextProps.isEditing) return false;

  // 스타일 변경
  if (prevProps.backgroundColor !== nextProps.backgroundColor) return false;
  if (prevProps.cellStyle !== nextProps.cellStyle) return false;

  // 상태 플래그 변경
  if (prevProps.isLocked !== nextProps.isLocked) return false;
  if (prevProps.cellHasFormula !== nextProps.cellHasFormula) return false;
  if (prevProps.cellMemo !== nextProps.cellMemo) return false;
  if (prevProps.isCopyMode !== nextProps.isCopyMode) return false;

  return true;
}

const SheetCell = memo(function SheetCell({
  rowId,
  columnId,
  cellKey,
  value,
  displayValue,
  cellStyle,
  cellMemo,
  isSelected,
  isMultiSelected,
  isFillPreview,
  isMoveTarget,
  isMoveSource,
  isEditing,
  isLocked,
  cellHasFormula,
  usesColumnFormula,
  hasCellOverride,
  isFormulaColumn,
  isCopyMode,
  backgroundColor,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick,
  onContextMenu,
  onFillHandleMouseDown,
  onMemoClick,
  dragToFillText,
  defaultFontSize,
}: SheetCellProps) {
  // 이벤트 핸들러 - useCallback으로 안정화
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onMouseDown(rowId, columnId, e);
  }, [onMouseDown, rowId, columnId]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    onMouseEnter(rowId, columnId, e, cellMemo);
  }, [onMouseEnter, rowId, columnId, cellMemo]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave(rowId, columnId, cellMemo);
  }, [onMouseLeave, rowId, columnId, cellMemo]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDoubleClick(rowId, columnId);
  }, [onDoubleClick, rowId, columnId]);

  const handleContextMenuClick = useCallback((e: React.MouseEvent) => {
    onContextMenu(e, rowId, columnId);
  }, [onContextMenu, rowId, columnId]);

  const handleMemoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (cellMemo) {
      onMemoClick(rowId, columnId, cellMemo);
    }
  }, [onMemoClick, rowId, columnId, cellMemo]);

  // outline 스타일 계산
  // isEditing일 때는 CellEditor가 테두리를 그리므로 여기선 숨김
  const getOutline = () => {
    if (isEditing) return 'none';
    if (isMoveTarget) {
      return isCopyMode ? '2px dashed var(--accent)' : '2px solid var(--accent)';
    }
    if (isFillPreview) return '2px dashed var(--primary-green)';
    if (isSelected) return '2px solid var(--primary-blue)';
    if (isMultiSelected) return '1px solid var(--primary-blue)';
    return 'none';
  };

  // 배경색 계산
  const getBackground = () => {
    if (isMoveTarget) return 'var(--accent-light)';
    if (isFillPreview) return 'var(--primary-green-light)';
    if (isMultiSelected && !isSelected) return 'var(--primary-blue-light)';
    return backgroundColor;
  };

  return (
    <div
      data-cell-id={cellKey}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenuClick}
      className={`px-2 sm:px-2 py-1.5 sm:py-1 h-full w-full absolute inset-0 overflow-hidden select-none flex ${
        (cellStyle?.vAlign || DEFAULT_CELL_STYLE.vAlign) === 'top' ? 'items-start' : (cellStyle?.vAlign || DEFAULT_CELL_STYLE.vAlign) === 'bottom' ? 'items-end' : 'items-center'
      } ${isSelected && !isEditing ? 'cursor-move' : 'cursor-cell'} ${isMoveSource && !isCopyMode ? 'opacity-50' : ''}`}
      style={{
        background: getBackground(),
        color: typeof value === 'string' && value.startsWith('#ERR') ? 'var(--error)' : 'var(--text-primary)',
        outline: getOutline(),
        outlineOffset: '-2px',
        // 테마 전환 성능 최적화: contain으로 리플로우 범위 제한
        // https://developer.mozilla.org/en-US/docs/Web/CSS/contain
        contain: 'strict',
      }}
    >
      <span
        className="truncate flex-1 min-w-0"
        style={{
          display: 'block',
          fontWeight: cellStyle?.bold ? 700 : undefined,
          fontStyle: cellStyle?.italic ? 'italic' : undefined,
          textDecoration: [
            cellStyle?.underline ? 'underline' : '',
            cellStyle?.strikethrough ? 'line-through' : '',
          ].filter(Boolean).join(' ') || undefined,
          fontSize: `${cellStyle?.fontSize || defaultFontSize}px`,
          color: cellStyle?.fontColor || undefined,
          textAlign: cellStyle?.hAlign || DEFAULT_CELL_STYLE.hAlign,
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
          className="absolute top-0 right-0 w-0 h-0 cursor-pointer"
          style={{
            borderLeft: '12px solid transparent',
            borderTop: '12px solid var(--warning)',
          }}
          onClick={handleMemoClick}
        />
      )}

      {/* 채우기 핸들 (선택된 셀의 오른쪽 하단) - 편집 중에도 표시 */}
      {isSelected && !isLocked && (
        <div
          onMouseDown={onFillHandleMouseDown}
          className="absolute bottom-0 right-0 w-3 h-3 cursor-crosshair"
          style={{
            background: 'var(--primary-blue)',
            border: '1px solid white',
            // 편집 중에도 CellEditor(z-50) 위에 표시되도록 z-index 높임
            zIndex: isEditing ? 60 : 10,
          }}
          title={dragToFillText}
        />
      )}
    </div>
  );
}, arePropsEqual);

export default SheetCell;
