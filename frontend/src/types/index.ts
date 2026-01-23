// 프로젝트 타입
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  sheets: Sheet[];
}

// 스티커 타입
export interface Sticker {
  id: string;
  text: string;
  color: string;  // 배경색
  x: number;      // 위치 X (퍼센트)
  y: number;      // 위치 Y (퍼센트)
  width: number;  // 너비 (px)
  height: number; // 높이 (px)
  fontSize?: number;
  createdAt: number;
}

// 시트 타입
export interface Sheet {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
  stickers?: Sticker[];  // 스티커 목록
  createdAt: number;
  updatedAt: number;
}

// 컬럼 타입 (일반: 자동 감지, 수식: 컬럼 전체 수식)
export type ColumnType = 'general' | 'formula';

// 데이터 타입 (유효성 검사용)
export type DataType = 'any' | 'number' | 'integer' | 'text';

// 유효성 검사 설정
export interface ValidationConfig {
  dataType?: DataType;      // 데이터 타입 제한
  min?: number;             // 최솟값
  max?: number;             // 최댓값
  required?: boolean;       // 필수 입력
  allowedValues?: string[]; // 허용된 값 목록 (enum)
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
  formula?: string;         // type이 'formula'일 때
  validation?: ValidationConfig;  // 유효성 검사 설정
  locked?: boolean;         // 잠금 여부
}

// 행 타입
export interface Row {
  id: string;
  cells: Record<string, CellValue>;
  cellStyles?: Record<string, CellStyle>;  // 셀별 스타일 (columnId -> CellStyle)
  locked?: boolean;  // 행 잠금 여부
}

// 셀 값 타입
export type CellValue = string | number | null;

// 셀 포맷팅 (Fortune-Sheet/Luckysheet 패턴)
export interface CellStyle {
  bold?: boolean;           // bl: bold
  italic?: boolean;         // it: italic
  underline?: boolean;      // un: underline
  strikethrough?: boolean;  // cl: strikethrough
  fontSize?: number;        // fs: font size (10-36)
  fontColor?: string;       // fc: font color (hex)
  bgColor?: string;         // bg: background color (hex)
  hAlign?: 'left' | 'center' | 'right';  // ht: horizontal align
  vAlign?: 'top' | 'middle' | 'bottom';  // vt: vertical align
  textRotation?: number;    // tr: 0, 45, 90, -45, -90, vertical
}

// 셀 데이터 (값 + 스타일)
export interface CellData {
  value: CellValue;
  style?: CellStyle;
}

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
