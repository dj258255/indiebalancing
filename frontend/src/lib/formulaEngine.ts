import { create, all, MathJsInstance } from 'mathjs';
import type { Sheet, CellValue, CurveType, FormulaResult } from '@/types';

// mathjs 인스턴스 생성
const math: MathJsInstance = create(all);

// 게임 밸런스 커스텀 함수들

/**
 * SCALE - 레벨 스케일링 함수
 * @param base 기본값
 * @param level 레벨
 * @param rate 성장률
 * @param curveType 곡선 타입 (linear, exponential, logarithmic, quadratic, scurve)
 * @param options 추가 옵션 (S-curve용 max, mid)
 */
function SCALE(
  base: number,
  level: number,
  rate: number,
  curveType: string = 'linear',
  options?: { max?: number; mid?: number }
): number {
  switch (curveType.toLowerCase()) {
    case 'linear':
      return base + level * rate;
    case 'exponential':
      return base * Math.pow(rate, level);
    case 'logarithmic':
      return base + rate * Math.log(Math.max(1, level));
    case 'quadratic':
      return base + rate * level * level;
    case 'scurve':
    case 's-curve': {
      const max = options?.max ?? 100;
      const mid = options?.mid ?? 50;
      return base + max / (1 + Math.exp(-rate * (level - mid)));
    }
    default:
      return base + level * rate;
  }
}

/**
 * DAMAGE - 데미지 계산 (감소율 공식)
 * @param atk 공격력
 * @param def 방어력
 * @param multiplier 배율 (기본 1)
 */
function DAMAGE(atk: number, def: number, multiplier: number = 1): number {
  // 일반적인 감소율 공식: ATK * (100 / (100 + DEF))
  return atk * (100 / (100 + def)) * multiplier;
}

/**
 * DPS - 초당 데미지 계산
 * @param damage 한 번 공격의 데미지
 * @param attackSpeed 초당 공격 횟수
 * @param critRate 크리티컬 확률 (0~1)
 * @param critDamage 크리티컬 데미지 배율 (기본 2)
 */
function DPS(
  damage: number,
  attackSpeed: number,
  critRate: number = 0,
  critDamage: number = 2
): number {
  const effectiveDamage = damage * (1 + critRate * (critDamage - 1));
  return effectiveDamage * attackSpeed;
}

/**
 * TTK - Time To Kill 계산
 * @param targetHP 대상 체력
 * @param damage 한 번 공격의 데미지
 * @param attackSpeed 초당 공격 횟수
 */
function TTK(targetHP: number, damage: number, attackSpeed: number): number {
  if (damage <= 0 || attackSpeed <= 0) return Infinity;
  const hitsNeeded = Math.ceil(targetHP / damage);
  // 마지막 공격은 쿨다운이 없음
  return (hitsNeeded - 1) / attackSpeed;
}

/**
 * EHP - 유효 체력 계산
 * @param hp 체력
 * @param def 방어력
 * @param damageReduction 추가 피해 감소율 (0~1)
 */
function EHP(hp: number, def: number, damageReduction: number = 0): number {
  const defMultiplier = 1 + def / 100;
  const reductionMultiplier = 1 / (1 - Math.min(damageReduction, 0.99));
  return hp * defMultiplier * reductionMultiplier;
}

/**
 * DROP_RATE - 드랍 확률 보정
 * @param baseRate 기본 확률 (0~1)
 * @param luck 행운 스탯
 * @param levelDiff 레벨 차이 (양수면 몬스터가 높음)
 */
function DROP_RATE(baseRate: number, luck: number = 0, levelDiff: number = 0): number {
  // 행운은 확률을 증가시킴 (luck 100 = 2배)
  const luckMultiplier = 1 + luck / 100;
  // 레벨 차이는 확률을 감소시킴 (10레벨 차이 = 50% 감소)
  const levelMultiplier = Math.max(0.1, 1 - levelDiff * 0.05);
  return Math.min(1, baseRate * luckMultiplier * levelMultiplier);
}

/**
 * GACHA_PITY - 가챠 천장 확률 계산
 * @param baseRate 기본 확률 (0~1)
 * @param currentPull 현재 뽑기 횟수
 * @param softPityStart 소프트 천장 시작 횟수
 * @param hardPity 하드 천장 횟수
 */
function GACHA_PITY(
  baseRate: number,
  currentPull: number,
  softPityStart: number = 74,
  hardPity: number = 90
): number {
  if (currentPull >= hardPity) return 1;
  if (currentPull < softPityStart) return baseRate;

  // 소프트 천장: 점진적 확률 증가
  const pullsIntoPity = currentPull - softPityStart;
  const maxPityPulls = hardPity - softPityStart;
  const pityBonus = (1 - baseRate) * (pullsIntoPity / maxPityPulls) * 0.5;
  return Math.min(1, baseRate + pityBonus);
}

/**
 * COST - 강화/업그레이드 비용 계산
 * @param baseCost 기본 비용
 * @param level 현재 레벨
 * @param rate 증가율
 * @param curveType 곡선 타입
 */
function COST(
  baseCost: number,
  level: number,
  rate: number = 1.5,
  curveType: string = 'exponential'
): number {
  return Math.floor(SCALE(baseCost, level, rate, curveType));
}

/**
 * WAVE_POWER - 웨이브/스테이지 적 파워 계산
 * @param basepower 기본 파워
 * @param wave 웨이브 번호
 * @param rate 성장률
 */
function WAVE_POWER(basePower: number, wave: number, rate: number = 1.1): number {
  return basePower * Math.pow(rate, wave - 1);
}

// ============ 추가 함수들 ============

/**
 * CLAMP - 값 범위 제한
 * @param value 값
 * @param min 최소값
 * @param max 최대값
 */
function CLAMP(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * LERP - 선형 보간
 * @param start 시작값
 * @param end 끝값
 * @param t 비율 (0~1)
 */
function LERP(start: number, end: number, t: number): number {
  return start + (end - start) * CLAMP(t, 0, 1);
}

/**
 * INVERSE_LERP - 역 선형 보간 (값이 범위에서 어느 위치인지)
 * @param start 시작값
 * @param end 끝값
 * @param value 값
 */
function INVERSE_LERP(start: number, end: number, value: number): number {
  if (start === end) return 0;
  return CLAMP((value - start) / (end - start), 0, 1);
}

/**
 * REMAP - 값을 한 범위에서 다른 범위로 매핑
 * @param value 값
 * @param inMin 입력 최소
 * @param inMax 입력 최대
 * @param outMin 출력 최소
 * @param outMax 출력 최대
 */
function REMAP(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = INVERSE_LERP(inMin, inMax, value);
  return LERP(outMin, outMax, t);
}

/**
 * CHANCE - 확률 계산 (성공 여부가 아닌 기대값)
 * @param baseChance 기본 확률 (0~1)
 * @param attempts 시도 횟수
 * @returns 최소 1회 성공 확률
 */
function CHANCE(baseChance: number, attempts: number): number {
  return 1 - Math.pow(1 - CLAMP(baseChance, 0, 1), attempts);
}

/**
 * EXPECTED_ATTEMPTS - 기대 시도 횟수
 * @param successRate 성공 확률 (0~1)
 * @returns 1회 성공까지 평균 시도 횟수
 */
function EXPECTED_ATTEMPTS(successRate: number): number {
  if (successRate <= 0) return Infinity;
  if (successRate >= 1) return 1;
  return 1 / successRate;
}

/**
 * COMPOUND - 복리 성장
 * @param principal 원금/기본값
 * @param rate 이율/성장률
 * @param periods 기간
 */
function COMPOUND(principal: number, rate: number, periods: number): number {
  return principal * Math.pow(1 + rate, periods);
}

/**
 * DIMINISHING - 체감 수익 (한계 수익 체감)
 * @param base 기본값
 * @param input 입력값
 * @param softcap 소프트캡 (이후 체감 시작)
 * @param hardcap 하드캡 (최대값)
 */
function DIMINISHING(base: number, input: number, softcap: number, hardcap: number = Infinity): number {
  if (input <= softcap) return base + input;

  const overCap = input - softcap;
  const diminished = softcap + overCap * (1 - overCap / (overCap + softcap));
  const result = base + diminished;

  return hardcap === Infinity ? result : Math.min(result, hardcap);
}

/**
 * ELEMENT_MULT - 속성 상성 배율
 * @param attackElement 공격 속성 인덱스
 * @param defenseElement 방어 속성 인덱스
 * @param strong 강점 배율 (기본 1.5)
 * @param weak 약점 배율 (기본 0.5)
 */
function ELEMENT_MULT(
  attackElement: number,
  defenseElement: number,
  strong: number = 1.5,
  weak: number = 0.5
): number {
  // 간단한 가위바위보 상성 (0>1>2>0)
  const diff = ((attackElement - defenseElement) % 3 + 3) % 3;
  if (diff === 1) return strong; // 상성 우위
  if (diff === 2) return weak;   // 상성 열세
  return 1; // 동일 속성
}

/**
 * STAMINA_REGEN - 스태미나/에너지 재생량
 * @param maxStamina 최대 스태미나
 * @param regenTime 완충 시간 (분)
 * @param elapsed 경과 시간 (분)
 */
function STAMINA_REGEN(maxStamina: number, regenTime: number, elapsed: number): number {
  const regenPerMinute = maxStamina / regenTime;
  return Math.min(maxStamina, regenPerMinute * elapsed);
}

/**
 * COMBO_MULT - 콤보 배율
 * @param comboCount 현재 콤보
 * @param baseMultiplier 기본 배율 (보통 1)
 * @param perComboBonus 콤보당 추가 배율 (보통 0.1)
 * @param maxBonus 최대 보너스 (보통 2.0)
 */
function COMBO_MULT(
  comboCount: number,
  baseMultiplier: number = 1,
  perComboBonus: number = 0.1,
  maxBonus: number = 2.0
): number {
  const bonus = Math.min(comboCount * perComboBonus, maxBonus);
  return baseMultiplier + bonus;
}

/**
 * STAR_RATING - 별점 계산 (비율을 별점으로 변환)
 * @param value 현재 값
 * @param maxValue 최대 값
 * @param maxStars 최대 별 (기본 5)
 */
function STAR_RATING(value: number, maxValue: number, maxStars: number = 5): number {
  if (maxValue <= 0) return 0;
  return Math.round((value / maxValue) * maxStars * 2) / 2; // 0.5 단위
}

/**
 * TIER_INDEX - 티어/등급 인덱스 (값을 티어로 변환)
 * @param value 값
 * @param thresholds 임계값 배열 [bronze, silver, gold, platinum, diamond]
 */
function TIER_INDEX(value: number, ...thresholds: number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1;
  }
  return 0;
}

// 엑셀 호환 함수들
function POWER(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

function ABS(value: number): number {
  return Math.abs(value);
}

function ROUND(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function FLOOR(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

function CEIL(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

function SQRT(value: number): number {
  return Math.sqrt(value);
}

function LOG(value: number, base?: number): number {
  if (base) return Math.log(value) / Math.log(base);
  return Math.log(value);
}

function LOG10(value: number): number {
  return Math.log10(value);
}

function LOG2(value: number): number {
  return Math.log2(value);
}

function EXP(value: number): number {
  return Math.exp(value);
}

function MOD(value: number, divisor: number): number {
  return value % divisor;
}

function SIGN(value: number): number {
  return Math.sign(value);
}

function TRUNC(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.trunc(value * factor) / factor;
}

// 통계 함수들
function SUM(...values: number[]): number {
  return values.flat().reduce((a, b) => a + b, 0);
}

function AVERAGE(...values: number[]): number {
  const flat = values.flat();
  return flat.length > 0 ? SUM(...flat) / flat.length : 0;
}

function MIN(...values: number[]): number {
  return Math.min(...values.flat());
}

function MAX(...values: number[]): number {
  return Math.max(...values.flat());
}

function COUNT(...values: number[]): number {
  return values.flat().filter(v => typeof v === 'number' && !isNaN(v)).length;
}

function MEDIAN(...values: number[]): number {
  const sorted = values.flat().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function STDEV(...values: number[]): number {
  const flat = values.flat();
  const avg = AVERAGE(...flat);
  const squareDiffs = flat.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(AVERAGE(...squareDiffs));
}

function VARIANCE(...values: number[]): number {
  const flat = values.flat();
  const avg = AVERAGE(...flat);
  const squareDiffs = flat.map(v => Math.pow(v - avg, 2));
  return AVERAGE(...squareDiffs);
}

// 삼각함수
function SIN(value: number): number {
  return Math.sin(value);
}

function COS(value: number): number {
  return Math.cos(value);
}

function TAN(value: number): number {
  return Math.tan(value);
}

function ASIN(value: number): number {
  return Math.asin(value);
}

function ACOS(value: number): number {
  return Math.acos(value);
}

function ATAN(value: number): number {
  return Math.atan(value);
}

function ATAN2(y: number, x: number): number {
  return Math.atan2(y, x);
}

function DEGREES(radians: number): number {
  return radians * (180 / Math.PI);
}

function RADIANS(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// 조건/논리 함수
function IF(condition: boolean | number, trueValue: number, falseValue: number): number {
  return condition ? trueValue : falseValue;
}

function AND(...values: (boolean | number)[]): boolean {
  return values.every(v => Boolean(v));
}

function OR(...values: (boolean | number)[]): boolean {
  return values.some(v => Boolean(v));
}

function NOT(value: boolean | number): boolean {
  return !value;
}

// 랜덤 함수 (시드 없음 - 매번 다른 값)
function RAND(): number {
  return Math.random();
}

function RANDBETWEEN(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 상수
const PI = Math.PI;
const E = Math.E;

// mathjs에 커스텀 함수 등록
math.import({
  // 게임 밸런스 함수
  SCALE,
  DAMAGE,
  DPS,
  TTK,
  EHP,
  DROP_RATE,
  GACHA_PITY,
  COST,
  WAVE_POWER,
  // 유틸리티 함수
  CLAMP,
  LERP,
  INVERSE_LERP,
  REMAP,
  CHANCE,
  EXPECTED_ATTEMPTS,
  COMPOUND,
  DIMINISHING,
  ELEMENT_MULT,
  STAMINA_REGEN,
  COMBO_MULT,
  STAR_RATING,
  TIER_INDEX,
  // 엑셀 호환 수학 함수
  POWER,
  ABS,
  ROUND,
  FLOOR,
  CEIL,
  SQRT,
  LOG,
  LOG10,
  LOG2,
  EXP,
  MOD,
  SIGN,
  TRUNC,
  // 통계 함수
  SUM,
  AVERAGE,
  MIN,
  MAX,
  COUNT,
  MEDIAN,
  STDEV,
  VARIANCE,
  // 삼각함수
  SIN,
  COS,
  TAN,
  ASIN,
  ACOS,
  ATAN,
  ATAN2,
  DEGREES,
  RADIANS,
  // 조건/논리 함수
  IF,
  AND,
  OR,
  NOT,
  // 랜덤 함수
  RAND,
  RANDBETWEEN,
  // 상수
  PI,
  E,
}, { override: true });

// 시트 참조 함수를 위한 컨텍스트
interface FormulaContext {
  sheets: Sheet[];
  currentSheet: Sheet;
  currentRow: Record<string, CellValue>;
  currentRowIndex?: number;  // 현재 행 인덱스 (이전행 참조용)
  allRows?: Record<string, CellValue>[];  // 모든 행 데이터 (이전행 참조용)
}

/**
 * REF - 다른 시트 참조 함수
 */
function createREF(context: FormulaContext) {
  return function REF(sheetName: string, rowIdentifier: string | number, columnName: string): CellValue {
    const sheet = context.sheets.find(s => s.name === sheetName);
    if (!sheet) return null;

    const column = sheet.columns.find(c => c.name === columnName);
    if (!column) return null;

    let row;
    if (typeof rowIdentifier === 'number') {
      row = sheet.rows[rowIdentifier];
    } else {
      // ID 컬럼이나 이름 컬럼으로 찾기
      const idColumn = sheet.columns.find(c => c.name === 'ID' || c.name === 'id');
      const nameColumn = sheet.columns.find(c => c.name === '이름' || c.name === 'name');

      row = sheet.rows.find(r => {
        if (idColumn && r.cells[idColumn.id] === rowIdentifier) return true;
        if (nameColumn && r.cells[nameColumn.id] === rowIdentifier) return true;
        return false;
      });
    }

    if (!row) return null;
    return row.cells[column.id] ?? null;
  };
}

/**
 * 시트 참조 (시트명.참조명) 처리
 * 예: 글로벌설정.BASE_HP, 캐릭터스탯.공격력
 *
 * 두 가지 모드 지원:
 * 1. 세로형 설정 시트 (글로벌설정): '변수명' 컬럼에서 참조명을 찾고 '값' 컬럼의 값을 반환
 * 2. 가로형 데이터 시트: 참조명이 컬럼명이면 첫 번째 행의 해당 컬럼 값 반환
 */
function processSheetReferences(
  expression: string,
  sheets: Sheet[],
  scope: Record<string, CellValue>
): { expression: string; scope: Record<string, CellValue> } {
  let convertedExpr = expression;
  let refIndex = 0;

  // 시트명.참조명 패턴 찾기 (한글/영문/숫자/_로 구성된 시트명과 참조명)
  const sheetRefPattern = /([가-힣a-zA-Z_][가-힣a-zA-Z0-9_]*)\.([가-힣a-zA-Z_][가-힣a-zA-Z0-9_()%]*)/g;

  let match;
  const replacements: { original: string; varName: string; value: CellValue }[] = [];

  while ((match = sheetRefPattern.exec(expression)) !== null) {
    const [fullMatch, sheetName, refName] = match;

    // 이전행 참조는 별도로 처리
    if (sheetName === '이전행') continue;

    const sheet = sheets.find(s => s.name === sheetName);
    if (!sheet) {
      replacements.push({ original: fullMatch, varName: `__ref${refIndex}__`, value: 0 });
      refIndex++;
      continue;
    }

    let value: CellValue = 0;

    // 1. 세로형 설정 시트 확인 (변수명/값 구조)
    // '변수명', 'name', 'ID' 등의 컬럼과 '값', 'value' 컬럼이 있는지 확인
    const varNameCol = sheet.columns.find(c =>
      c.name === '변수명' || c.name === 'name' || c.name === 'Name' || c.name === 'ID' || c.name === 'id'
    );
    const valueCol = sheet.columns.find(c =>
      c.name === '값' || c.name === 'value' || c.name === 'Value'
    );

    if (varNameCol && valueCol) {
      // 세로형 설정 시트: 변수명 컬럼에서 refName을 찾아 값 컬럼의 값을 반환
      const row = sheet.rows.find(r => r.cells[varNameCol.id] === refName);
      if (row) {
        const rawValue = row.cells[valueCol.id];
        value = rawValue === null || rawValue === undefined ? 0 : rawValue;
      }
    } else {
      // 2. 가로형 데이터 시트: refName이 컬럼명이면 첫 번째 행의 해당 컬럼 값 반환
      const column = sheet.columns.find(c => c.name === refName);
      if (column && sheet.rows[0]) {
        const rawValue = sheet.rows[0].cells[column.id];
        value = rawValue === null || rawValue === undefined ? 0 : rawValue;
      }
    }

    replacements.push({ original: fullMatch, varName: `__ref${refIndex}__`, value });
    refIndex++;
  }

  // 긴 참조부터 치환 (부분 매칭 방지)
  replacements.sort((a, b) => b.original.length - a.original.length);

  for (const rep of replacements) {
    const escapedOriginal = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    convertedExpr = convertedExpr.replace(new RegExp(escapedOriginal, 'g'), rep.varName);
    scope[rep.varName] = rep.value;
  }

  return { expression: convertedExpr, scope };
}

/**
 * 이전행 참조 (이전행.컬럼명) 처리
 * 예: 이전행.누적EXP, 이전행.레벨
 */
function processPreviousRowReferences(
  expression: string,
  columns: { id: string; name: string }[],
  allRows: Record<string, CellValue>[] | undefined,
  currentRowIndex: number | undefined,
  scope: Record<string, CellValue>
): { expression: string; scope: Record<string, CellValue> } {
  let convertedExpr = expression;
  let prevIndex = 0;

  // 이전행.컬럼명 패턴 찾기
  const prevRowPattern = /이전행\.([가-힣a-zA-Z_][가-힣a-zA-Z0-9_()%]*)/g;

  let match;
  const replacements: { original: string; varName: string; value: CellValue }[] = [];

  while ((match = prevRowPattern.exec(expression)) !== null) {
    const [fullMatch, columnName] = match;

    const column = columns.find(c => c.name === columnName);
    if (!column || currentRowIndex === undefined || !allRows || currentRowIndex <= 0) {
      // 첫 번째 행이거나 컬럼을 못 찾으면 0
      replacements.push({ original: fullMatch, varName: `__prev${prevIndex}__`, value: 0 });
      prevIndex++;
      continue;
    }

    const prevRow = allRows[currentRowIndex - 1];
    if (!prevRow) {
      replacements.push({ original: fullMatch, varName: `__prev${prevIndex}__`, value: 0 });
      prevIndex++;
      continue;
    }

    const rawValue = prevRow[column.id];
    // null/undefined는 0으로 처리
    // 에러 문자열(#ERR:로 시작)도 0으로 처리하여 에러 전파 방지
    let value: CellValue = 0;
    if (rawValue !== null && rawValue !== undefined) {
      if (typeof rawValue === 'string' && rawValue.startsWith('#ERR')) {
        value = 0;  // 에러 값은 0으로 처리
      } else if (typeof rawValue === 'number') {
        value = rawValue;
      } else {
        // 문자열이지만 숫자로 파싱 가능하면 숫자로 변환
        const num = parseFloat(String(rawValue));
        value = isNaN(num) ? 0 : num;
      }
    }

    replacements.push({ original: fullMatch, varName: `__prev${prevIndex}__`, value });
    prevIndex++;
  }

  // 긴 참조부터 치환 (부분 매칭 방지)
  replacements.sort((a, b) => b.original.length - a.original.length);

  for (const rep of replacements) {
    const escapedOriginal = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    convertedExpr = convertedExpr.replace(new RegExp(escapedOriginal, 'g'), rep.varName);
    scope[rep.varName] = rep.value;
  }

  return { expression: convertedExpr, scope };
}

/**
 * 한글 변수명을 영어로 변환
 */
function convertKoreanToScope(
  expression: string,
  columns: { id: string; name: string }[],
  currentRow: Record<string, CellValue>,
  context?: FormulaContext
): { expression: string; scope: Record<string, CellValue> } {
  let scope: Record<string, CellValue> = {};
  let convertedExpr = expression;
  let varIndex = 0;

  // 1. 시트 참조 처리 (시트명.컬럼명)
  if (context?.sheets) {
    const sheetResult = processSheetReferences(convertedExpr, context.sheets, scope);
    convertedExpr = sheetResult.expression;
    scope = sheetResult.scope;
  }

  // 2. 이전행 참조 처리 (이전행.컬럼명)
  const prevResult = processPreviousRowReferences(
    convertedExpr,
    columns,
    context?.allRows,
    context?.currentRowIndex,
    scope
  );
  convertedExpr = prevResult.expression;
  scope = prevResult.scope;

  // 3. 현재 행의 컬럼 변수 처리
  // 긴 이름부터 치환 (부분 매칭 방지)
  const sortedColumns = [...columns].sort((a, b) => b.name.length - a.name.length);

  for (const col of sortedColumns) {
    const rawValue = currentRow[col.id];
    // null/undefined는 0으로 처리 (수식 계산을 위해)
    // 수식 문자열(=로 시작)은 아직 평가되지 않은 것이므로 0으로 처리
    // 에러 문자열(#ERR:로 시작)도 0으로 처리
    let value: CellValue = 0;
    if (rawValue !== null && rawValue !== undefined) {
      if (typeof rawValue === 'string') {
        if (rawValue.startsWith('=') || rawValue.startsWith('#ERR')) {
          value = 0;  // 수식이나 에러는 0으로 처리
        } else {
          // 문자열이지만 숫자로 파싱 가능하면 숫자로
          const num = parseFloat(rawValue);
          value = isNaN(num) ? rawValue : num;
        }
      } else {
        value = rawValue;
      }
    }

    // 한글이 포함된 컬럼명인지 확인
    if (/[가-힣]/.test(col.name)) {
      const varName = `__kor${varIndex++}__`;
      // 수식에서 해당 컬럼명을 변수명으로 치환
      const escapedName = col.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      convertedExpr = convertedExpr.replace(new RegExp(escapedName, 'g'), varName);
      scope[varName] = value;
    } else {
      scope[col.name] = value;
    }
  }

  return { expression: convertedExpr, scope };
}

/**
 * 수식 평가
 */
export function evaluateFormula(
  formula: string,
  context?: FormulaContext
): FormulaResult {
  try {
    // 수식이 =로 시작하면 제거
    const expression = formula.startsWith('=') ? formula.slice(1) : formula;

    // 컨텍스트가 있으면 REF 함수 등록
    if (context) {
      math.import({ REF: createREF(context) }, { override: true });

      // 한글 컬럼명을 영어 변수로 변환하고 scope 생성
      // context를 전달하여 시트참조와 이전행 참조도 처리
      const { expression: convertedExpr, scope } = convertKoreanToScope(
        expression,
        context.currentSheet.columns,
        context.currentRow,
        context
      );

      const result = math.evaluate(convertedExpr, scope);
      return { value: typeof result === 'number' ? result : String(result) };
    }

    const result = math.evaluate(expression);
    return { value: typeof result === 'number' ? result : String(result) };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : '수식 오류',
    };
  }
}

/**
 * 성장 곡선 데이터 생성
 */
export function generateCurveData(
  base: number,
  rate: number,
  curveType: CurveType,
  maxLevel: number = 100,
  options?: { max?: number; mid?: number }
): { level: number; value: number }[] {
  const data = [];
  for (let level = 1; level <= maxLevel; level++) {
    data.push({
      level,
      value: SCALE(base, level, rate, curveType, options),
    });
  }
  return data;
}

/**
 * 여러 곡선 비교 데이터 생성
 */
export function generateMultipleCurveData(
  base: number,
  rate: number,
  maxLevel: number = 100
): { level: number; linear: number; exponential: number; logarithmic: number; quadratic: number }[] {
  const data = [];
  for (let level = 1; level <= maxLevel; level++) {
    data.push({
      level,
      linear: SCALE(base, level, rate, 'linear'),
      exponential: SCALE(base, level, rate, 'exponential'),
      logarithmic: SCALE(base, level, rate * 10, 'logarithmic'),
      quadratic: SCALE(base, level, rate / 10, 'quadratic'),
    });
  }
  return data;
}

/**
 * 수식 검증 (순환 참조 등)
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    let expression = formula.startsWith('=') ? formula.slice(1) : formula;
    // 한글 변수명을 임시 영어 변수로 치환해서 파싱
    let varIndex = 0;
    expression = expression.replace(/[가-힣]+/g, () => `__kor${varIndex++}__`);
    math.parse(expression);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '유효하지 않은 수식',
    };
  }
}

// 사용 가능한 함수 목록
export const availableFunctions = [
  // 기본 전투/밸런스
  {
    name: 'SCALE',
    description: '레벨 스케일링',
    syntax: 'SCALE(base, level, rate, curveType)',
    example: 'SCALE(100, 10, 1.5, "exponential")',
    category: 'combat',
  },
  {
    name: 'DAMAGE',
    description: '데미지 계산 (감소율 공식)',
    syntax: 'DAMAGE(atk, def, multiplier?)',
    example: 'DAMAGE(150, 50)',
    category: 'combat',
  },
  {
    name: 'DPS',
    description: '초당 데미지',
    syntax: 'DPS(damage, attackSpeed, critRate?, critDamage?)',
    example: 'DPS(100, 2, 0.3, 2)',
    category: 'combat',
  },
  {
    name: 'TTK',
    description: 'Time To Kill',
    syntax: 'TTK(targetHP, damage, attackSpeed)',
    example: 'TTK(1000, 100, 2)',
    category: 'combat',
  },
  {
    name: 'EHP',
    description: '유효 체력',
    syntax: 'EHP(hp, def, damageReduction?)',
    example: 'EHP(1000, 50)',
    category: 'combat',
  },

  // 확률/경제
  {
    name: 'DROP_RATE',
    description: '드랍 확률 보정',
    syntax: 'DROP_RATE(baseRate, luck?, levelDiff?)',
    example: 'DROP_RATE(0.1, 50, 5)',
    category: 'economy',
  },
  {
    name: 'GACHA_PITY',
    description: '가챠 천장 확률',
    syntax: 'GACHA_PITY(baseRate, currentPull, softPityStart?, hardPity?)',
    example: 'GACHA_PITY(0.006, 75)',
    category: 'economy',
  },
  {
    name: 'COST',
    description: '강화 비용',
    syntax: 'COST(baseCost, level, rate?, curveType?)',
    example: 'COST(100, 5, 1.5)',
    category: 'economy',
  },
  {
    name: 'CHANCE',
    description: 'N회 시도 시 1회 이상 성공 확률',
    syntax: 'CHANCE(baseChance, attempts)',
    example: 'CHANCE(0.1, 10)',
    category: 'economy',
  },
  {
    name: 'EXPECTED_ATTEMPTS',
    description: '1회 성공까지 평균 시도 횟수',
    syntax: 'EXPECTED_ATTEMPTS(successRate)',
    example: 'EXPECTED_ATTEMPTS(0.01)',
    category: 'economy',
  },
  {
    name: 'COMPOUND',
    description: '복리 성장',
    syntax: 'COMPOUND(principal, rate, periods)',
    example: 'COMPOUND(1000, 0.1, 10)',
    category: 'economy',
  },

  // 스테이지/웨이브
  {
    name: 'WAVE_POWER',
    description: '웨이브 적 파워',
    syntax: 'WAVE_POWER(basePower, wave, rate?)',
    example: 'WAVE_POWER(100, 10, 1.1)',
    category: 'stage',
  },
  {
    name: 'ELEMENT_MULT',
    description: '속성 상성 배율',
    syntax: 'ELEMENT_MULT(atkElement, defElement, strong?, weak?)',
    example: 'ELEMENT_MULT(0, 1, 1.5, 0.5)',
    category: 'stage',
  },
  {
    name: 'COMBO_MULT',
    description: '콤보 배율',
    syntax: 'COMBO_MULT(comboCount, baseMult?, perCombo?, maxBonus?)',
    example: 'COMBO_MULT(10, 1, 0.1, 2)',
    category: 'stage',
  },

  // 유틸리티
  {
    name: 'CLAMP',
    description: '값 범위 제한',
    syntax: 'CLAMP(value, min, max)',
    example: 'CLAMP(150, 0, 100)',
    category: 'util',
  },
  {
    name: 'LERP',
    description: '선형 보간',
    syntax: 'LERP(start, end, t)',
    example: 'LERP(0, 100, 0.5)',
    category: 'util',
  },
  {
    name: 'REMAP',
    description: '값 범위 매핑',
    syntax: 'REMAP(value, inMin, inMax, outMin, outMax)',
    example: 'REMAP(50, 0, 100, 0, 1)',
    category: 'util',
  },
  {
    name: 'DIMINISHING',
    description: '체감 수익 (소프트캡)',
    syntax: 'DIMINISHING(base, input, softcap, hardcap?)',
    example: 'DIMINISHING(0, 150, 100, 200)',
    category: 'util',
  },
  {
    name: 'STAMINA_REGEN',
    description: '스태미나 재생량',
    syntax: 'STAMINA_REGEN(maxStamina, regenTime, elapsed)',
    example: 'STAMINA_REGEN(100, 480, 60)',
    category: 'util',
  },
  {
    name: 'STAR_RATING',
    description: '별점 계산',
    syntax: 'STAR_RATING(value, maxValue, maxStars?)',
    example: 'STAR_RATING(80, 100, 5)',
    category: 'util',
  },
  {
    name: 'TIER_INDEX',
    description: '티어 인덱스',
    syntax: 'TIER_INDEX(value, ...thresholds)',
    example: 'TIER_INDEX(1500, 1000, 1200, 1400, 1600)',
    category: 'util',
  },

  // 참조
  {
    name: 'REF',
    description: '다른 시트 참조',
    syntax: 'REF(sheetName, rowId, columnName)',
    example: 'REF("몬스터", "고블린", "HP")',
    category: 'ref',
  },

  // 수학 함수
  {
    name: 'POWER',
    description: '거듭제곱',
    syntax: 'POWER(base, exponent)',
    example: 'POWER(2, 10)',
    category: 'math',
  },
  {
    name: 'ABS',
    description: '절대값',
    syntax: 'ABS(value)',
    example: 'ABS(-5)',
    category: 'math',
  },
  {
    name: 'SQRT',
    description: '제곱근',
    syntax: 'SQRT(value)',
    example: 'SQRT(16)',
    category: 'math',
  },
  {
    name: 'LOG',
    description: '로그 (밑 지정 가능)',
    syntax: 'LOG(value, base?)',
    example: 'LOG(100, 10)',
    category: 'math',
  },
  {
    name: 'LOG10',
    description: '상용로그 (밑 10)',
    syntax: 'LOG10(value)',
    example: 'LOG10(100)',
    category: 'math',
  },
  {
    name: 'LOG2',
    description: '이진로그 (밑 2)',
    syntax: 'LOG2(value)',
    example: 'LOG2(8)',
    category: 'math',
  },
  {
    name: 'EXP',
    description: 'e의 거듭제곱',
    syntax: 'EXP(value)',
    example: 'EXP(1)',
    category: 'math',
  },
  {
    name: 'ROUND',
    description: '반올림 (소수점 자리 지정 가능)',
    syntax: 'ROUND(value, decimals?)',
    example: 'ROUND(3.14159, 2)',
    category: 'math',
  },
  {
    name: 'FLOOR',
    description: '내림',
    syntax: 'FLOOR(value, decimals?)',
    example: 'FLOOR(3.7)',
    category: 'math',
  },
  {
    name: 'CEIL',
    description: '올림',
    syntax: 'CEIL(value, decimals?)',
    example: 'CEIL(3.2)',
    category: 'math',
  },
  {
    name: 'TRUNC',
    description: '소수점 버림',
    syntax: 'TRUNC(value, decimals?)',
    example: 'TRUNC(3.7)',
    category: 'math',
  },
  {
    name: 'MOD',
    description: '나머지',
    syntax: 'MOD(value, divisor)',
    example: 'MOD(10, 3)',
    category: 'math',
  },
  {
    name: 'SIGN',
    description: '부호 (-1, 0, 1)',
    syntax: 'SIGN(value)',
    example: 'SIGN(-5)',
    category: 'math',
  },

  // 통계 함수
  {
    name: 'SUM',
    description: '합계',
    syntax: 'SUM(a, b, ...)',
    example: 'SUM(10, 20, 30)',
    category: 'stat',
  },
  {
    name: 'AVERAGE',
    description: '평균',
    syntax: 'AVERAGE(a, b, ...)',
    example: 'AVERAGE(10, 20, 30)',
    category: 'stat',
  },
  {
    name: 'MIN',
    description: '최소값',
    syntax: 'MIN(a, b, ...)',
    example: 'MIN(10, 20, 5)',
    category: 'stat',
  },
  {
    name: 'MAX',
    description: '최대값',
    syntax: 'MAX(a, b, ...)',
    example: 'MAX(10, 20, 5)',
    category: 'stat',
  },
  {
    name: 'COUNT',
    description: '개수',
    syntax: 'COUNT(a, b, ...)',
    example: 'COUNT(1, 2, 3)',
    category: 'stat',
  },
  {
    name: 'MEDIAN',
    description: '중앙값',
    syntax: 'MEDIAN(a, b, ...)',
    example: 'MEDIAN(1, 5, 3)',
    category: 'stat',
  },
  {
    name: 'STDEV',
    description: '표준편차',
    syntax: 'STDEV(a, b, ...)',
    example: 'STDEV(10, 20, 30)',
    category: 'stat',
  },
  {
    name: 'VARIANCE',
    description: '분산',
    syntax: 'VARIANCE(a, b, ...)',
    example: 'VARIANCE(10, 20, 30)',
    category: 'stat',
  },

  // 삼각함수
  {
    name: 'SIN',
    description: '사인 (라디안)',
    syntax: 'SIN(radians)',
    example: 'SIN(PI/2)',
    category: 'trig',
  },
  {
    name: 'COS',
    description: '코사인 (라디안)',
    syntax: 'COS(radians)',
    example: 'COS(0)',
    category: 'trig',
  },
  {
    name: 'TAN',
    description: '탄젠트 (라디안)',
    syntax: 'TAN(radians)',
    example: 'TAN(PI/4)',
    category: 'trig',
  },
  {
    name: 'ASIN',
    description: '아크사인',
    syntax: 'ASIN(value)',
    example: 'ASIN(1)',
    category: 'trig',
  },
  {
    name: 'ACOS',
    description: '아크코사인',
    syntax: 'ACOS(value)',
    example: 'ACOS(0)',
    category: 'trig',
  },
  {
    name: 'ATAN',
    description: '아크탄젠트',
    syntax: 'ATAN(value)',
    example: 'ATAN(1)',
    category: 'trig',
  },
  {
    name: 'ATAN2',
    description: '아크탄젠트2 (y, x)',
    syntax: 'ATAN2(y, x)',
    example: 'ATAN2(1, 1)',
    category: 'trig',
  },
  {
    name: 'DEGREES',
    description: '라디안 → 도',
    syntax: 'DEGREES(radians)',
    example: 'DEGREES(PI)',
    category: 'trig',
  },
  {
    name: 'RADIANS',
    description: '도 → 라디안',
    syntax: 'RADIANS(degrees)',
    example: 'RADIANS(180)',
    category: 'trig',
  },

  // 조건/논리 함수
  {
    name: 'IF',
    description: '조건문',
    syntax: 'IF(condition, trueValue, falseValue)',
    example: 'IF(HP > 100, 1, 0)',
    category: 'logic',
  },
  {
    name: 'AND',
    description: '모두 참이면 참',
    syntax: 'AND(a, b, ...)',
    example: 'AND(HP > 0, ATK > 10)',
    category: 'logic',
  },
  {
    name: 'OR',
    description: '하나라도 참이면 참',
    syntax: 'OR(a, b, ...)',
    example: 'OR(HP < 10, DEF < 5)',
    category: 'logic',
  },
  {
    name: 'NOT',
    description: '논리 부정',
    syntax: 'NOT(value)',
    example: 'NOT(0)',
    category: 'logic',
  },

  // 랜덤 함수
  {
    name: 'RAND',
    description: '0~1 랜덤값',
    syntax: 'RAND()',
    example: 'RAND()',
    category: 'util',
  },
  {
    name: 'RANDBETWEEN',
    description: '범위 내 랜덤 정수',
    syntax: 'RANDBETWEEN(min, max)',
    example: 'RANDBETWEEN(1, 100)',
    category: 'util',
  },

  // 상수
  {
    name: 'PI',
    description: '원주율 (π)',
    syntax: 'PI',
    example: 'PI',
    category: 'math',
  },
  {
    name: 'E',
    description: '자연상수 (e)',
    syntax: 'E',
    example: 'E',
    category: 'math',
  },

  // 특수 참조 문법
  {
    name: '시트명.변수명',
    description: '다른 시트 값 참조',
    syntax: '시트명.변수명',
    example: '글로벌설정.BASE_HP',
    category: 'ref',
  },
  {
    name: '이전행.컬럼명',
    description: '이전 행의 값 참조',
    syntax: '이전행.컬럼명',
    example: '이전행.누적EXP',
    category: 'ref',
  },
];

export {
  SCALE, DAMAGE, DPS, TTK, EHP, DROP_RATE, GACHA_PITY, COST, WAVE_POWER,
  CLAMP, LERP, INVERSE_LERP, REMAP, CHANCE, EXPECTED_ATTEMPTS, COMPOUND,
  DIMINISHING, ELEMENT_MULT, STAMINA_REGEN, COMBO_MULT, STAR_RATING, TIER_INDEX,
};
