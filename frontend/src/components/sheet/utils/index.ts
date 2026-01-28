import type { CellValue } from '@/types';

// 셀 키 생성 유틸리티 (Set 조회용)
export const cellKey = (rowId: string, columnId: string) => `${rowId}:${columnId}`;

// requestAnimationFrame 기반 throttle (브라우저 렌더링과 동기화)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): T {
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

// 값 파싱 (숫자 변환 시도)
export function parseValue(value: string): CellValue {
  if (value.startsWith('=')) {
    return value; // 수식은 그대로 반환
  }
  const num = parseFloat(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }
  return value;
}

// 표시값 포맷팅
export function formatDisplayValue(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // 정수면 그대로, 소수면 최대 4자리까지
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

// 셀에 값이 있는지 확인
export function hasValue(value: CellValue): boolean {
  return value !== null && value !== undefined && value !== '';
}
