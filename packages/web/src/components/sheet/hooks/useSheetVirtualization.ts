'use client';

/**
 * useSheetVirtualization - 행 가상화 훅
 *
 * TanStack Virtual을 사용하여 대량의 행을 효율적으로 렌더링합니다.
 * 출처: https://tanstack.com/virtual/latest/docs/framework/react/examples/table
 *
 * 최적화 패턴:
 * - 보이는 행만 DOM에 렌더링 (화면 밖 행은 렌더링하지 않음)
 * - overscan으로 스크롤 시 부드러운 경험 제공
 * - 동적 행 높이 지원
 */

import { useCallback, RefObject } from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import type { Row } from '@tanstack/react-table';
import type { Row as SheetRow } from '@/types';

interface UseSheetVirtualizationProps {
  rows: Row<SheetRow>[];
  rowHeights: Record<string, number>;
  containerRef: RefObject<HTMLDivElement | null>;
  overscan?: number;
  defaultRowHeight?: number;
}

interface UseSheetVirtualizationReturn {
  virtualItems: VirtualItem[];
  totalSize: number;
  measureElement: ((node: Element | null) => void) | undefined;
}

export function useSheetVirtualization({
  rows,
  rowHeights,
  containerRef,
  overscan = 10,
  defaultRowHeight = 36,
}: UseSheetVirtualizationProps): UseSheetVirtualizationReturn {
  // 행 높이 추정 함수
  const estimateSize = useCallback(
    (index: number) => {
      const row = rows[index];
      return rowHeights[row?.original?.id] || defaultRowHeight;
    },
    [rows, rowHeights, defaultRowHeight]
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize,
    overscan,
  });

  return {
    virtualItems: rowVirtualizer.getVirtualItems(),
    totalSize: rowVirtualizer.getTotalSize(),
    measureElement: rowVirtualizer.measureElement,
  };
}
