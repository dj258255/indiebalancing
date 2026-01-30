'use client';

import { useMemo, useCallback } from 'react';
import type { Sheet, Row, Column, CellValue, Project } from '@/types';
import { evaluateFormula } from '@/lib/formulaEngine';

interface UseComputedRowsProps {
  sheet: Sheet;
  currentProject?: Project;
}

export function useComputedRows({ sheet, currentProject }: UseComputedRowsProps) {
  // 모든 행의 계산된 값을 저장 (이전행 참조용)
  // 순차적으로 계산하여 이전 행의 결과를 다음 행이 참조할 수 있게 함
  const computedRows = useMemo(() => {
    const result: Record<string, CellValue>[] = [];

    for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
      const row = sheet.rows[rowIndex];
      const computedRow: Record<string, CellValue> = { ...row.cells };

      // 각 컬럼에 대해 값 계산
      for (const column of sheet.columns) {
        const rawValue = row.cells[column.id];

        // 셀 자체에 수식이 있는 경우 (셀 수식 우선)
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

        // 수식 컬럼인 경우, 빈 문자열도 "값 없음"으로 처리하여 컬럼 수식 적용
        // (사용자가 명시적으로 값을 입력한 경우에만 오버라이드로 처리)
        const isEmptyValue = rawValue === null || rawValue === undefined || rawValue === '';

        // 셀에 직접 값이 있으면 그 값 사용 (오버라이드)
        // 단, 수식 컬럼에서 빈 값은 오버라이드로 취급하지 않음
        if (!isEmptyValue) {
          computedRow[column.id] = rawValue;
          continue;
        }

        // 셀이 비어있고 컬럼이 formula 타입이면 컬럼 수식 사용
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
