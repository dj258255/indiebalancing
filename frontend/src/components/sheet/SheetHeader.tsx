'use client';

/**
 * SheetHeader - 테이블 헤더 컴포넌트
 *
 * x-spreadsheet/Handsontable 패턴 참고:
 * - 컬럼 헤더 렌더링을 별도 컴포넌트로 분리
 * - 리사이즈 핸들 통합
 * - 컬럼 선택 하이라이트
 *
 * 출처:
 * - x-spreadsheet: https://github.com/myliang/x-spreadsheet
 * - Handsontable 헤더 패턴: https://handsontable.com/docs/react-data-grid/
 */

import React, { memo } from 'react';
import { flexRender, type HeaderGroup } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import type { Row, Column } from '@/types';

interface SheetHeaderProps {
  headerGroups: HeaderGroup<Row>[];
  headerHeight: number;
  columnWidths: Record<string, number>;
  selectedColumnId?: string;
  resizingColumn: string | null;
  resizingHeader: boolean;
  onResizeStart: (columnId: string, e: React.MouseEvent) => void;
  onHeaderResizeStart: (e: React.MouseEvent) => void;
  onColumnContextMenu?: (e: React.MouseEvent, column: Column) => void;
  onRowContextMenu?: (e: React.MouseEvent) => void;
  onResizeContextMenu?: (e: React.MouseEvent, type: 'column' | 'header', columnId?: string) => void;
  columns: Column[];
}

const SheetHeader = memo(function SheetHeader({
  headerGroups,
  headerHeight,
  columnWidths,
  selectedColumnId,
  resizingColumn,
  resizingHeader,
  onResizeStart,
  onHeaderResizeStart,
  onColumnContextMenu,
  onRowContextMenu,
  onResizeContextMenu,
  columns,
}: SheetHeaderProps) {
  return (
    <thead
      className={cn('sticky top-0 z-10', resizingHeader && 'select-none')}
      style={{ background: 'var(--bg-tertiary)' }}
    >
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id} style={{ height: headerHeight }}>
          {headerGroup.headers.map((header) => {
            const isRowNumber = header.id === 'rowNumber';
            const isActions = header.id === 'actions';
            const width = isActions ? 36 : (columnWidths[header.id] || (isRowNumber ? 80 : 150));
            const isSelectedColumn = selectedColumnId === header.id;

            return (
              <th
                key={header.id}
                className={cn(
                  'px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-wide relative',
                  isActions && 'px-1',
                  isRowNumber ? 'text-center' : 'text-left'
                )}
                style={{
                  width,
                  minWidth: isActions ? 36 : 100,
                  height: headerHeight,
                  color: isSelectedColumn ? 'var(--row-col-highlight-text)' : 'var(--text-secondary)',
                  background: isSelectedColumn ? 'var(--row-col-highlight)' : undefined,
                  fontWeight: isSelectedColumn ? 700 : undefined,
                  borderBottom: isSelectedColumn
                    ? '2px solid var(--row-col-highlight-border)'
                    : '1px solid var(--border-primary)',
                  borderRight: '1px solid var(--border-primary)',
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}

                {/* 열 너비 조절 핸들 */}
                {!isActions && (
                  <div
                    className={cn(
                      'absolute top-0 bottom-0 cursor-col-resize transition-colors',
                      resizingColumn === header.id ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                    )}
                    style={{ right: -3, width: 7 }}
                    onMouseDown={(e) => onResizeStart(header.id, e)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const column = columns.find((c) => c.id === header.id);
                      if (column && onResizeContextMenu) {
                        onResizeContextMenu(e, 'column', header.id);
                      }
                    }}
                  />
                )}

                {/* 헤더 높이 조절 핸들 */}
                {!isActions && (
                  <div
                    className={cn(
                      'absolute left-0 right-0 cursor-row-resize transition-colors z-10',
                      resizingHeader ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                    )}
                    style={{ bottom: -3, height: 7 }}
                    onMouseDown={onHeaderResizeStart}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isRowNumber) {
                        const column = columns.find((c) => c.id === header.id);
                        if (column && onColumnContextMenu) {
                          onColumnContextMenu(e, column);
                        }
                      } else if (onResizeContextMenu) {
                        onResizeContextMenu(e, 'header');
                      }
                    }}
                  />
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
});

export default SheetHeader;
