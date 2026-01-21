/**
 * 전투 시뮬레이션 타입 정의
 */

// 전투 유닛 기본 스탯
export interface UnitStats {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;        // 공격 속도 (초당 공격 횟수)
  critRate?: number;    // 크리티컬 확률 (0-1)
  critDamage?: number;  // 크리티컬 데미지 배율 (기본 1.5)
  accuracy?: number;    // 명중률 (0-1, 기본 1)
  evasion?: number;     // 회피율 (0-1, 기본 0)
}

// 스킬 정의
export interface Skill {
  id: string;
  name: string;
  damage: number;           // 기본 데미지 또는 배율
  damageType: 'flat' | 'multiplier';  // 고정 데미지 or ATK 배율
  cooldown: number;         // 쿨다운 (초)
  trigger?: SkillTrigger;   // 발동 조건
}

// 스킬 발동 조건
export interface SkillTrigger {
  type: 'hp_below' | 'hp_above' | 'turn' | 'on_hit' | 'on_crit' | 'always';
  value?: number;  // HP% 또는 턴 수
  chance?: number; // 발동 확률 (0-1)
}

// 버프/디버프
export interface Buff {
  id: string;
  name: string;
  stat: keyof UnitStats;
  value: number;
  isPercent: boolean;
  duration: number;  // 지속 시간 (초) 또는 턴
  stackable?: boolean;
  maxStacks?: number;
}

// 시너지 효과
export interface Synergy {
  id: string;
  name: string;
  requiredUnits: string[];  // 필요한 유닛 ID 목록
  effect: Buff[];
}

// 전투 설정
export interface BattleConfig {
  maxDuration: number;      // 최대 전투 시간 (초)
  timeStep: number;         // 시뮬레이션 시간 단위 (초, 기본 0.1)
  damageFormula?: DamageFormulaType;  // 데미지 공식
  defenseFormula?: DefenseFormulaType; // 방어 공식
  allowOverkill?: boolean;  // 오버킬 허용 여부
  armorPenetration?: ArmorPenetrationConfig; // 방어관통 설정
}

// 데미지 공식 타입
export type DamageFormulaType =
  | 'simple'      // ATK - DEF
  | 'mmorpg'      // ATK * (100 / (100 + DEF))
  | 'percentage'  // ATK * (1 - DEF/100)
  | 'random'      // ATK * random(0.9~1.1) - DEF
  | 'multiplicative'; // ATK * DEF_REDUCTION

// 방어 공식 타입
export type DefenseFormulaType =
  | 'subtractive'    // damage = ATK - DEF (빼기식)
  | 'divisive'       // reduction = DEF / (DEF + C) (나누기식, LoL/WoW)
  | 'multiplicative' // damage = ATK * (1 - DEF%) (곱셈식)
  | 'logarithmic';   // reduction = log(DEF) based (로그식)

// 방어관통 설정
export interface ArmorPenetrationConfig {
  flatPenetration?: number;    // 고정 관통 (Lethality)
  percentPenetration?: number; // 퍼센트 관통 (0-1)
  flatReduction?: number;      // 고정 방어 감소
  percentReduction?: number;   // 퍼센트 방어 감소 (0-1)
}

// 전투 로그 엔트리
export interface BattleLogEntry {
  time: number;
  actor: string;
  action: 'attack' | 'skill' | 'buff' | 'debuff' | 'heal' | 'death';
  target?: string;
  damage?: number;
  isCrit?: boolean;
  isMiss?: boolean;
  skillName?: string;
  remainingHp?: number;
}

// 단일 시뮬레이션 결과
export interface BattleResult {
  winner: 'unit1' | 'unit2' | 'draw';
  duration: number;         // 전투 시간 (초)
  unit1FinalHp: number;
  unit2FinalHp: number;
  unit1TotalDamage: number;
  unit2TotalDamage: number;
  unit1Hits: number;
  unit2Hits: number;
  unit1Crits: number;
  unit2Crits: number;
  log: BattleLogEntry[];
}

// 몬테카를로 시뮬레이션 결과
export interface SimulationResult {
  totalRuns: number;
  unit1Wins: number;
  unit2Wins: number;
  draws: number;
  unit1WinRate: number;      // 0-1
  unit2WinRate: number;      // 0-1

  // 통계
  avgDuration: number;
  minDuration: number;
  maxDuration: number;

  // 유닛1 통계
  unit1AvgDamage: number;
  unit1AvgDps: number;
  unit1AvgSurvivalHp: number;  // 승리 시 남은 HP

  // 유닛2 통계
  unit2AvgDamage: number;
  unit2AvgDps: number;
  unit2AvgSurvivalHp: number;

  // 분포 데이터 (히스토그램용)
  durationDistribution: number[];
  damageDistribution: {
    unit1: number[];
    unit2: number[];
  };

  // 신뢰 구간
  winRateConfidence: {
    unit1: { lower: number; upper: number };
    unit2: { lower: number; upper: number };
  };

  // TTK (Time To Kill) 분포
  ttkDistribution: {
    unit1: number[];  // unit1이 unit2를 죽이는 데 걸린 시간
    unit2: number[];  // unit2가 unit1을 죽이는 데 걸린 시간
  };

  // TTK 통계 (평균, 최소, 최대)
  ttkStats: {
    unit1: { avg: number; min: number; max: number; median: number };
    unit2: { avg: number; min: number; max: number; median: number };
  };

  // 이론적 DPS (스탯 기반 계산)
  theoreticalDps: {
    unit1: number;
    unit2: number;
  };

  // 샘플 전투 로그 (분석용)
  sampleBattles: BattleResult[];
}

// 팀 전투 설정
export interface TeamBattleConfig extends BattleConfig {
  teamSize: number;
  targetingMode: 'random' | 'lowest_hp' | 'highest_atk' | 'focused';
  allowSynergies?: boolean;
}

// 팀 전투 결과
export interface TeamBattleResult {
  winner: 'team1' | 'team2' | 'draw';
  duration: number;
  team1Survivors: number;
  team2Survivors: number;
  team1TotalDamage: number;
  team2TotalDamage: number;
  unitResults: {
    unit: UnitStats;
    team: 'team1' | 'team2';
    survived: boolean;
    damageDealt: number;
    damageTaken: number;
    kills: number;
  }[];
}

// 시뮬레이션 옵션
export interface SimulationOptions {
  runs: number;             // 반복 횟수 (기본 10000)
  config: BattleConfig;
  saveSampleBattles?: number;  // 저장할 샘플 전투 수
  onProgress?: (progress: number) => void;  // 진행률 콜백
}
