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

// mathjs에 커스텀 함수 등록
math.import({
  SCALE,
  DAMAGE,
  DPS,
  TTK,
  EHP,
  DROP_RATE,
  GACHA_PITY,
  COST,
  WAVE_POWER,
  // 추가 함수들
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
}, { override: true });

// 시트 참조 함수를 위한 컨텍스트
interface FormulaContext {
  sheets: Sheet[];
  currentSheet: Sheet;
  currentRow: Record<string, CellValue>;
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

      // 현재 행의 값을 변수로 등록
      const scope: Record<string, CellValue> = {};
      for (const col of context.currentSheet.columns) {
        const value = context.currentRow[col.id];
        if (value !== null && value !== undefined) {
          scope[col.name] = value;
        }
      }

      const result = math.evaluate(expression, scope);
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
    const expression = formula.startsWith('=') ? formula.slice(1) : formula;
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
];

export {
  SCALE, DAMAGE, DPS, TTK, EHP, DROP_RATE, GACHA_PITY, COST, WAVE_POWER,
  CLAMP, LERP, INVERSE_LERP, REMAP, CHANCE, EXPECTED_ATTEMPTS, COMPOUND,
  DIMINISHING, ELEMENT_MULT, STAMINA_REGEN, COMBO_MULT, STAR_RATING, TIER_INDEX,
};
