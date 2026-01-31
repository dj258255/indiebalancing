'use client';

import { useMemo, useCallback } from 'react';
import type { Sheet, Row, Column, CellValue, Project } from '@/types';
import { computeSheetRows } from '@/lib/formulaEngine';

interface UseComputedRowsProps {
  sheet: Sheet;
  currentProject?: Project;
}

export function useComputedRows({ sheet, currentProject }: UseComputedRowsProps) {
  // 공통 유틸 함수를 사용하여 계산된 행 데이터 생성
  const computedRows = useMemo(() => {
    return computeSheetRows(sheet, currentProject?.sheets || []);
  }, [sheet, currentProject?.sheets]);

  // 셀 값 계산 (수식 포함) - computedRows 사용
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

  return {
    computedRows,
    getCellValue,
  };
}
