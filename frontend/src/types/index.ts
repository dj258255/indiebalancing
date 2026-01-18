// 프로젝트 타입
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  sheets: Sheet[];
}

// 시트 타입
export interface Sheet {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
  createdAt: number;
  updatedAt: number;
}

// 컬럼 타입 (일반: 자동 감지, 수식: 컬럼 전체 수식)
export type ColumnType = 'general' | 'formula';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
  formula?: string; // type이 'formula'일 때
}

// 행 타입
export interface Row {
  id: string;
  cells: Record<string, CellValue>;
}

// 셀 값 타입
export type CellValue = string | number | null;

// 수식 평가 결과
export interface FormulaResult {
  value: CellValue;
  error?: string;
}

// 성장 곡선 타입
export type CurveType = 'linear' | 'exponential' | 'logarithmic' | 'quadratic' | 'scurve';

export interface CurveParams {
  type: CurveType;
  base: number;
  rate: number;
  maxLevel?: number;
  // S-curve용
  max?: number;
  mid?: number;
  // Quadratic용
  a?: number;
  b?: number;
  c?: number;
}

// 차트 데이터
export interface ChartDataPoint {
  level: number;
  value: number;
  [key: string]: number;
}

// 내보내기 옵션
export interface ExportOptions {
  format: 'json' | 'csv';
  sheets?: string[]; // 특정 시트만 내보내기
  includeFormulas?: boolean;
}

// 저장소 메타데이터
export interface StorageMetadata {
  lastSaved: number;
  lastBackup: number;
  version: string;
}
