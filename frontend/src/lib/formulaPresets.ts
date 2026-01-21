/**
 * 수식 프리셋 라이브러리
 * 자주 사용되는 게임 밸런싱 수식들
 */

export interface FormulaPreset {
  id: string;
  name: string;
  category: FormulaCategory;
  formula: string;
  description: string;
  example?: string;
  params?: FormulaParam[];
}

export interface FormulaParam {
  name: string;
  description: string;
  defaultValue: string;
}

export type FormulaCategory =
  | 'combat'      // 전투 계산
  | 'growth'      // 성장/레벨업
  | 'economy'     // 재화/경제
  | 'probability' // 확률 계산
  | 'stat'        // 스탯 계산
  | 'utility';    // 유틸리티

// 카테고리별 표시 정보
export const FORMULA_CATEGORIES: Record<FormulaCategory, { name: string; color: string }> = {
  combat: { name: '전투', color: 'var(--primary-red)' },
  growth: { name: '성장', color: 'var(--primary-green)' },
  economy: { name: '경제', color: 'var(--primary-yellow)' },
  probability: { name: '확률', color: 'var(--primary-purple)' },
  stat: { name: '스탯', color: 'var(--primary-blue)' },
  utility: { name: '유틸리티', color: 'var(--text-secondary)' },
};

// 수식 프리셋 목록
export const FORMULA_PRESETS: FormulaPreset[] = [
  // 전투 계산
  {
    id: 'damage_simple',
    name: '기본 데미지',
    category: 'combat',
    formula: '=DAMAGE({ATK}, {DEF})',
    description: '기본 데미지 공식 (ATK - DEF, 최소 1)',
    example: '공격력 100, 방어력 30 → 70 데미지',
    params: [
      { name: 'ATK', description: '공격력', defaultValue: 'B2' },
      { name: 'DEF', description: '방어력', defaultValue: 'C2' },
    ],
  },
  {
    id: 'damage_mmorpg',
    name: 'MMORPG 데미지',
    category: 'combat',
    formula: '={ATK} * (100 / (100 + {DEF}))',
    description: 'MMORPG 스타일 데미지 감소 (방어력 100 = 50% 감소)',
    example: '공격력 100, 방어력 100 → 50 데미지',
    params: [
      { name: 'ATK', description: '공격력', defaultValue: 'B2' },
      { name: 'DEF', description: '방어력', defaultValue: 'C2' },
    ],
  },
  {
    id: 'damage_percent',
    name: '퍼센트 감소 데미지',
    category: 'combat',
    formula: '={ATK} * (1 - MIN(0.9, {DEF} / 200))',
    description: '방어력을 퍼센트 감소로 적용 (최대 90% 감소)',
    example: '공격력 100, 방어력 100 → 50 데미지',
    params: [
      { name: 'ATK', description: '공격력', defaultValue: 'B2' },
      { name: 'DEF', description: '방어력', defaultValue: 'C2' },
    ],
  },
  {
    id: 'dps',
    name: 'DPS (초당 데미지)',
    category: 'combat',
    formula: '=DPS({ATK}, {SPEED})',
    description: '초당 데미지 출력',
    example: '공격력 50, 속도 2 → DPS 100',
    params: [
      { name: 'ATK', description: '공격력', defaultValue: 'B2' },
      { name: 'SPEED', description: '공격 속도', defaultValue: 'E2' },
    ],
  },
  {
    id: 'dps_crit',
    name: 'DPS (크리티컬 포함)',
    category: 'combat',
    formula: '={ATK} * {SPEED} * (1 + {CRIT_RATE} * ({CRIT_DMG} - 1))',
    description: '크리티컬을 포함한 기대 DPS',
    example: '크리율 30%, 크뎀 150% → DPS 15% 증가',
    params: [
      { name: 'ATK', description: '공격력', defaultValue: 'B2' },
      { name: 'SPEED', description: '공격 속도', defaultValue: 'E2' },
      { name: 'CRIT_RATE', description: '크리티컬 확률 (0-1)', defaultValue: 'F2' },
      { name: 'CRIT_DMG', description: '크리티컬 배율', defaultValue: 'G2' },
    ],
  },
  {
    id: 'ttk',
    name: 'TTK (처치 시간)',
    category: 'combat',
    formula: '=TTK({HP}, {DAMAGE}, {SPEED})',
    description: '적을 처치하는 데 걸리는 시간',
    example: 'HP 1000, 데미지 100, 속도 2 → 5초',
    params: [
      { name: 'HP', description: '대상 HP', defaultValue: 'A2' },
      { name: 'DAMAGE', description: '타격당 데미지', defaultValue: 'B2' },
      { name: 'SPEED', description: '공격 속도', defaultValue: 'E2' },
    ],
  },
  {
    id: 'ehp',
    name: 'EHP (유효 체력)',
    category: 'combat',
    formula: '=EHP({HP}, {DEF})',
    description: '방어력을 고려한 유효 체력',
    example: 'HP 1000, 방어력 100 → EHP 2000',
    params: [
      { name: 'HP', description: '체력', defaultValue: 'A2' },
      { name: 'DEF', description: '방어력', defaultValue: 'C2' },
    ],
  },

  // 성장/레벨업
  {
    id: 'exp_linear',
    name: '선형 경험치',
    category: 'growth',
    formula: '={BASE_EXP} + ({LEVEL} - 1) * {INCREMENT}',
    description: '레벨당 일정량 증가하는 경험치',
    example: '기본 100, 증가 50 → 레벨 10에 550',
    params: [
      { name: 'LEVEL', description: '레벨', defaultValue: 'A2' },
      { name: 'BASE_EXP', description: '기본 경험치', defaultValue: '100' },
      { name: 'INCREMENT', description: '레벨당 증가', defaultValue: '50' },
    ],
  },
  {
    id: 'exp_exponential',
    name: '지수 경험치',
    category: 'growth',
    formula: '={BASE_EXP} * POWER({RATE}, {LEVEL} - 1)',
    description: '기하급수적으로 증가하는 경험치',
    example: '기본 100, 배율 1.15 → 레벨 10에 352',
    params: [
      { name: 'LEVEL', description: '레벨', defaultValue: 'A2' },
      { name: 'BASE_EXP', description: '기본 경험치', defaultValue: '100' },
      { name: 'RATE', description: '증가 배율', defaultValue: '1.15' },
    ],
  },
  {
    id: 'stat_growth',
    name: '스탯 성장',
    category: 'growth',
    formula: '=ROUND({BASE_STAT} * POWER({GROWTH_RATE}, {LEVEL} - 1))',
    description: '레벨에 따른 스탯 성장',
    example: '기본 10, 성장률 1.1 → 레벨 10에 23',
    params: [
      { name: 'LEVEL', description: '레벨', defaultValue: 'A2' },
      { name: 'BASE_STAT', description: '기본 스탯', defaultValue: 'B2' },
      { name: 'GROWTH_RATE', description: '성장률', defaultValue: '1.1' },
    ],
  },
  {
    id: 'stat_scurve',
    name: 'S-커브 성장',
    category: 'growth',
    formula: '=SCURVE({LEVEL}, {MAX_LEVEL}, {MIN_STAT}, {MAX_STAT})',
    description: '초반/후반 완만, 중반 급격한 S커브 성장',
    example: '레벨 50/100, 10~100 → 55 스탯',
    params: [
      { name: 'LEVEL', description: '현재 레벨', defaultValue: 'A2' },
      { name: 'MAX_LEVEL', description: '최대 레벨', defaultValue: '100' },
      { name: 'MIN_STAT', description: '최소 스탯', defaultValue: '10' },
      { name: 'MAX_STAT', description: '최대 스탯', defaultValue: '100' },
    ],
  },

  // 경제
  {
    id: 'gold_reward',
    name: '골드 보상',
    category: 'economy',
    formula: '=ROUND({BASE_GOLD} * POWER({RATE}, {STAGE} - 1) * {MULTIPLIER})',
    description: '스테이지에 따른 골드 보상',
    example: '기본 10, 배율 1.2, 스테이지 5 → 20.7',
    params: [
      { name: 'STAGE', description: '스테이지', defaultValue: 'A2' },
      { name: 'BASE_GOLD', description: '기본 골드', defaultValue: '10' },
      { name: 'RATE', description: '증가율', defaultValue: '1.2' },
      { name: 'MULTIPLIER', description: '보너스 배율', defaultValue: '1' },
    ],
  },
  {
    id: 'upgrade_cost',
    name: '업그레이드 비용',
    category: 'economy',
    formula: '=ROUND({BASE_COST} * POWER({RATE}, {CURRENT_LEVEL}))',
    description: '레벨업 비용 (지수 증가)',
    example: '기본 100, 배율 1.5, 레벨 5 → 759',
    params: [
      { name: 'CURRENT_LEVEL', description: '현재 레벨', defaultValue: 'A2' },
      { name: 'BASE_COST', description: '기본 비용', defaultValue: '100' },
      { name: 'RATE', description: '증가율', defaultValue: '1.5' },
    ],
  },
  {
    id: 'inflation_curve',
    name: '인플레이션 곡선',
    category: 'economy',
    formula: '={BASE_VALUE} * (1 + {INFLATION_RATE} * (EXP({PROGRESS} * 3) - 1) / (EXP(3) - 1))',
    description: '후반으로 갈수록 급격히 증가하는 인플레이션',
    params: [
      { name: 'PROGRESS', description: '진행도 (0-1)', defaultValue: 'A2' },
      { name: 'BASE_VALUE', description: '기본값', defaultValue: '100' },
      { name: 'INFLATION_RATE', description: '최대 인플레이션', defaultValue: '10' },
    ],
  },

  // 확률 계산
  {
    id: 'gacha_expected',
    name: '가챠 기대값',
    category: 'probability',
    formula: '=1 / {DROP_RATE}',
    description: '원하는 아이템을 얻기 위한 평균 시도 횟수',
    example: '1% 확률 → 평균 100회 필요',
    params: [
      { name: 'DROP_RATE', description: '드랍 확률 (0-1)', defaultValue: '0.01' },
    ],
  },
  {
    id: 'gacha_pity',
    name: '천장 기대값',
    category: 'probability',
    formula: '=(1 - POWER(1 - {RATE}, {PITY})) / {RATE}',
    description: '천장 시스템이 있는 경우 기대 시도 횟수',
    params: [
      { name: 'RATE', description: '기본 확률', defaultValue: '0.006' },
      { name: 'PITY', description: '천장 횟수', defaultValue: '90' },
    ],
  },
  {
    id: 'crit_avg',
    name: '크리티컬 평균 배율',
    category: 'probability',
    formula: '=1 + {CRIT_RATE} * ({CRIT_DMG} - 1)',
    description: '크리티컬을 포함한 평균 데미지 배율',
    example: '크리율 50%, 크뎀 200% → 평균 1.5배',
    params: [
      { name: 'CRIT_RATE', description: '크리티컬 확률', defaultValue: 'F2' },
      { name: 'CRIT_DMG', description: '크리티컬 배율', defaultValue: 'G2' },
    ],
  },

  // 스탯 계산
  {
    id: 'attack_power',
    name: '최종 공격력',
    category: 'stat',
    formula: '=({BASE_ATK} + {FLAT_BONUS}) * (1 + {PERCENT_BONUS})',
    description: '고정값과 퍼센트 보너스를 적용한 최종 공격력',
    params: [
      { name: 'BASE_ATK', description: '기본 공격력', defaultValue: 'B2' },
      { name: 'FLAT_BONUS', description: '고정 보너스', defaultValue: '0' },
      { name: 'PERCENT_BONUS', description: '퍼센트 보너스', defaultValue: '0' },
    ],
  },
  {
    id: 'defense_reduction',
    name: '방어력 감소율',
    category: 'stat',
    formula: '={DEF} / ({DEF} + {CONSTANT})',
    description: '방어력에 따른 피해 감소율 (수확체감)',
    example: '방어 100, 상수 100 → 50% 감소',
    params: [
      { name: 'DEF', description: '방어력', defaultValue: 'C2' },
      { name: 'CONSTANT', description: '감소 상수', defaultValue: '100' },
    ],
  },
  {
    id: 'stat_efficiency',
    name: '스탯 효율',
    category: 'stat',
    formula: '=({STAT} / {COST}) * 100',
    description: '투자 대비 스탯 효율 (100 = 기준)',
    params: [
      { name: 'STAT', description: '얻는 스탯', defaultValue: 'B2' },
      { name: 'COST', description: '비용', defaultValue: 'C2' },
    ],
  },

  // 유틸리티
  {
    id: 'normalize',
    name: '정규화',
    category: 'utility',
    formula: '=({VALUE} - {MIN}) / ({MAX} - {MIN})',
    description: '값을 0~1 범위로 정규화',
    params: [
      { name: 'VALUE', description: '값', defaultValue: 'A2' },
      { name: 'MIN', description: '최솟값', defaultValue: '0' },
      { name: 'MAX', description: '최댓값', defaultValue: '100' },
    ],
  },
  {
    id: 'lerp',
    name: '선형 보간',
    category: 'utility',
    formula: '={MIN} + ({MAX} - {MIN}) * {T}',
    description: 'Min과 Max 사이를 T(0~1)로 보간',
    params: [
      { name: 'T', description: '보간값 (0-1)', defaultValue: 'A2' },
      { name: 'MIN', description: '최솟값', defaultValue: '0' },
      { name: 'MAX', description: '최댓값', defaultValue: '100' },
    ],
  },
  {
    id: 'clamp',
    name: '범위 제한',
    category: 'utility',
    formula: '=MAX({MIN}, MIN({MAX}, {VALUE}))',
    description: '값을 최소/최대 범위 내로 제한',
    params: [
      { name: 'VALUE', description: '값', defaultValue: 'A2' },
      { name: 'MIN', description: '최솟값', defaultValue: '0' },
      { name: 'MAX', description: '최댓값', defaultValue: '100' },
    ],
  },
  {
    id: 'round_to',
    name: '지정 자릿수 반올림',
    category: 'utility',
    formula: '=ROUND({VALUE} * POWER(10, {DIGITS})) / POWER(10, {DIGITS})',
    description: '소수점 아래 N자리로 반올림',
    params: [
      { name: 'VALUE', description: '값', defaultValue: 'A2' },
      { name: 'DIGITS', description: '소수점 자릿수', defaultValue: '2' },
    ],
  },
];

/**
 * 카테고리별 프리셋 그룹화
 */
export function getPresetsByCategory(): Record<FormulaCategory, FormulaPreset[]> {
  const grouped: Record<FormulaCategory, FormulaPreset[]> = {
    combat: [],
    growth: [],
    economy: [],
    probability: [],
    stat: [],
    utility: [],
  };

  for (const preset of FORMULA_PRESETS) {
    grouped[preset.category].push(preset);
  }

  return grouped;
}

/**
 * 프리셋 검색
 */
export function searchPresets(query: string): FormulaPreset[] {
  const lowerQuery = query.toLowerCase();
  return FORMULA_PRESETS.filter(preset =>
    preset.name.toLowerCase().includes(lowerQuery) ||
    preset.description.toLowerCase().includes(lowerQuery) ||
    preset.formula.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 프리셋 수식에 파라미터 적용
 */
export function applyPresetParams(
  preset: FormulaPreset,
  params: Record<string, string>
): string {
  let formula = preset.formula;

  for (const [key, value] of Object.entries(params)) {
    formula = formula.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return formula;
}
