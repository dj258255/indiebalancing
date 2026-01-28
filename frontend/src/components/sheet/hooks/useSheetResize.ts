import { useState, useCallback, useEffect } from 'react';
import type { Sheet } from '@/types';
import { useProjectStore } from '@/stores/projectStore';

interface UseSheetResizeProps {
  projectId: string;
  sheet: Sheet;
}

interface UseSheetResizeReturn {
  // 상태
  columnWidths: Record<string, number>;
  rowHeights: Record<string, number>;
  headerHeight: number;
  resizingColumn: string | null;
  resizingRow: string | null;
  resizingHeader: boolean;
  tableWidth: number;

  // 핸들러
  handleResizeStart: (columnId: string, e: React.MouseEvent) => void;
  handleRowResizeStart: (rowId: string, e: React.MouseEvent) => void;
  handleHeaderResizeStart: (e: React.MouseEvent) => void;
  setColumnWidths: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setRowHeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setHeaderHeight: React.Dispatch<React.SetStateAction<number>>;
}

export function useSheetResize({ projectId, sheet }: UseSheetResizeProps): UseSheetResizeReturn {
  const { updateColumn, updateRow } = useProjectStore();

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [headerHeight, setHeaderHeight] = useState(36);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizingRow, setResizingRow] = useState<string | null>(null);
  const [resizingHeader, setResizingHeader] = useState(false);

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
      heights[row.id] = row.height || 36;
    });
    setRowHeights(heights);
  }, [sheet.rows]);

  // 테이블 전체 너비 계산
  const tableWidth = (() => {
    const rowNumberWidth = columnWidths['rowNumber'] || 80;
    const dataColumnsWidth = sheet.columns.reduce((sum, col) => sum + (columnWidths[col.id] || 150), 0);
    const actionsWidth = 36;
    return rowNumberWidth + dataColumnsWidth + actionsWidth;
  })();

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
      finalHeight = Math.max(24, Math.min(200, startHeight + diff));
      setRowHeights((prev) => ({ ...prev, [rowId]: finalHeight }));
    };

    const handleMouseUp = () => {
      setResizingRow(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

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
      const newHeight = Math.max(28, Math.min(100, startHeight + diff));
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

  return {
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
    setColumnWidths,
    setRowHeights,
    setHeaderHeight,
  };
}
