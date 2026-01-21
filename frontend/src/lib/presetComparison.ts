/**
 * 프리셋 비교/차이 분석 유틸리티
 */

import type { Sheet, CellValue } from '@/types';

// 비교 결과 타입
export interface ComparisonResult {
  // 전체 요약
  summary: {
    totalRows: number;
    changedRows: number;
    addedRows: number;
    removedRows: number;
    totalColumns: number;
    changedCells: number;
  };

  // 행별 변경 사항
  rowChanges: RowChange[];

  // 열별 통계 변화
  columnStats: ColumnStatChange[];
}

export interface RowChange {
  rowId: string;
  rowName: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  cellChanges: CellChange[];
}

export interface CellChange {
  columnId: string;
  columnName: string;
  oldValue: CellValue;
  newValue: CellValue;
  diff: number | null; // 숫자인 경우 차이값
  diffPercent: number | null; // 숫자인 경우 퍼센트 차이
}

export interface ColumnStatChange {
  columnId: string;
  columnName: string;
  oldStats: ColumnStats;
  newStats: ColumnStats;
  avgDiff: number;
  avgDiffPercent: number;
}

export interface ColumnStats {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
}

/**
 * 두 시트의 컬럼 통계 계산
 */
function calculateColumnStats(sheet: Sheet, columnId: string): ColumnStats {
  const values: number[] = [];

  for (const row of sheet.rows) {
    const value = row.cells[columnId];
    if (typeof value === 'number') {
      values.push(value);
    } else if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        values.push(num);
      }
    }
  }

  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    sum,
    count: values.length,
  };
}

/**
 * 두 시트 비교
 */
export function compareSheets(
  oldSheet: Sheet,
  newSheet: Sheet,
  options: {
    nameColumnId?: string; // 행 이름을 가져올 컬럼
    ignoreColumnIds?: string[]; // 무시할 컬럼
  } = {}
): ComparisonResult {
  const { nameColumnId, ignoreColumnIds = [] } = options;

  // 컬럼 매핑 생성
  const columnMap = new Map<string, { old?: typeof oldSheet.columns[0]; new?: typeof newSheet.columns[0] }>();

  for (const col of oldSheet.columns) {
    if (!ignoreColumnIds.includes(col.id)) {
      columnMap.set(col.id, { old: col });
    }
  }

  for (const col of newSheet.columns) {
    if (!ignoreColumnIds.includes(col.id)) {
      const existing = columnMap.get(col.id) || {};
      columnMap.set(col.id, { ...existing, new: col });
    }
  }

  // 행 매핑 생성
  const oldRowMap = new Map(oldSheet.rows.map(r => [r.id, r]));
  const newRowMap = new Map(newSheet.rows.map(r => [r.id, r]));

  const allRowIds = new Set([...oldRowMap.keys(), ...newRowMap.keys()]);

  const rowChanges: RowChange[] = [];
  let changedCells = 0;

  // 행 번호 매핑 (인덱스 기반)
  const oldRowIndexMap = new Map(oldSheet.rows.map((r, i) => [r.id, i + 1]));
  const newRowIndexMap = new Map(newSheet.rows.map((r, i) => [r.id, i + 1]));

  for (const rowId of allRowIds) {
    const oldRow = oldRowMap.get(rowId);
    const newRow = newRowMap.get(rowId);

    // 행 이름 결정
    let rowName: string;
    if (nameColumnId) {
      const nameValue = newRow?.cells[nameColumnId] ?? oldRow?.cells[nameColumnId];
      if (nameValue !== null && nameValue !== undefined && String(nameValue).trim() !== '') {
        rowName = String(nameValue);
      } else {
        // 이름이 비어있으면 행 번호 사용
        const rowIndex = newRowIndexMap.get(rowId) ?? oldRowIndexMap.get(rowId) ?? 0;
        rowName = `행 ${rowIndex}`;
      }
    } else {
      const rowIndex = newRowIndexMap.get(rowId) ?? oldRowIndexMap.get(rowId) ?? 0;
      rowName = `행 ${rowIndex}`;
    }

    if (!oldRow) {
      // 새로 추가된 행
      rowChanges.push({
        rowId,
        rowName,
        type: 'added',
        cellChanges: Array.from(columnMap.entries()).map(([colId, cols]) => ({
          columnId: colId,
          columnName: cols.new?.name || cols.old?.name || colId,
          oldValue: null,
          newValue: newRow!.cells[colId] ?? null,
          diff: null,
          diffPercent: null,
        })),
      });
    } else if (!newRow) {
      // 삭제된 행
      rowChanges.push({
        rowId,
        rowName,
        type: 'removed',
        cellChanges: Array.from(columnMap.entries()).map(([colId, cols]) => ({
          columnId: colId,
          columnName: cols.new?.name || cols.old?.name || colId,
          oldValue: oldRow.cells[colId] ?? null,
          newValue: null,
          diff: null,
          diffPercent: null,
        })),
      });
    } else {
      // 기존 행 - 셀 비교
      const cellChanges: CellChange[] = [];
      let hasChanges = false;

      for (const [colId, cols] of columnMap.entries()) {
        const oldValue = oldRow.cells[colId] ?? null;
        const newValue = newRow.cells[colId] ?? null;

        let diff: number | null = null;
        let diffPercent: number | null = null;

        // 숫자 비교
        const oldNum = typeof oldValue === 'number' ? oldValue : parseFloat(String(oldValue));
        const newNum = typeof newValue === 'number' ? newValue : parseFloat(String(newValue));

        if (!isNaN(oldNum) && !isNaN(newNum)) {
          diff = newNum - oldNum;
          diffPercent = oldNum !== 0 ? ((newNum - oldNum) / oldNum) * 100 : (newNum !== 0 ? 100 : 0);
        }

        // 값이 다른지 확인
        const isDifferent = String(oldValue) !== String(newValue);

        if (isDifferent) {
          hasChanges = true;
          changedCells++;
        }

        cellChanges.push({
          columnId: colId,
          columnName: cols.new?.name || cols.old?.name || colId,
          oldValue,
          newValue,
          diff: isDifferent ? diff : null,
          diffPercent: isDifferent ? diffPercent : null,
        });
      }

      rowChanges.push({
        rowId,
        rowName,
        type: hasChanges ? 'modified' : 'unchanged',
        cellChanges,
      });
    }
  }

  // 컬럼 통계 변화 계산
  const columnStats: ColumnStatChange[] = [];

  for (const [colId, cols] of columnMap.entries()) {
    const oldStats = calculateColumnStats(oldSheet, colId);
    const newStats = calculateColumnStats(newSheet, colId);

    const avgDiff = newStats.avg - oldStats.avg;
    const avgDiffPercent = oldStats.avg !== 0
      ? ((newStats.avg - oldStats.avg) / oldStats.avg) * 100
      : (newStats.avg !== 0 ? 100 : 0);

    columnStats.push({
      columnId: colId,
      columnName: cols.new?.name || cols.old?.name || colId,
      oldStats,
      newStats,
      avgDiff,
      avgDiffPercent,
    });
  }

  // 요약 계산
  const summary = {
    totalRows: allRowIds.size,
    changedRows: rowChanges.filter(r => r.type === 'modified').length,
    addedRows: rowChanges.filter(r => r.type === 'added').length,
    removedRows: rowChanges.filter(r => r.type === 'removed').length,
    totalColumns: columnMap.size,
    changedCells,
  };

  return {
    summary,
    rowChanges,
    columnStats,
  };
}

/**
 * 스냅샷 생성 (비교용)
 */
export function createSnapshot(sheet: Sheet): Sheet {
  return {
    ...sheet,
    id: `${sheet.id}_snapshot_${Date.now()}`,
    name: `${sheet.name} (스냅샷)`,
    columns: [...sheet.columns],
    rows: sheet.rows.map(r => ({
      ...r,
      cells: { ...r.cells },
    })),
  };
}

/**
 * 변경 사항 하이라이트 색상
 */
export function getChangeColor(type: 'added' | 'removed' | 'modified' | 'unchanged'): string {
  switch (type) {
    case 'added':
      return 'rgba(34, 197, 94, 0.2)'; // green
    case 'removed':
      return 'rgba(239, 68, 68, 0.2)'; // red
    case 'modified':
      return 'rgba(251, 191, 36, 0.2)'; // yellow
    default:
      return 'transparent';
  }
}

/**
 * 차이값 포맷
 */
export function formatDiff(diff: number | null, diffPercent: number | null): string {
  if (diff === null) return '';

  const sign = diff >= 0 ? '+' : '';
  const percentStr = diffPercent !== null ? ` (${sign}${diffPercent.toFixed(1)}%)` : '';

  return `${sign}${diff.toFixed(2)}${percentStr}`;
}
