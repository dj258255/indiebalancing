/**
 * 몬테카를로 시뮬레이션 엔진
 * 대량 반복 실행 및 통계 분석
 */

import type {
  UnitStats,
  Skill,
  BattleConfig,
  BattleResult,
  SimulationResult,
  SimulationOptions,
} from './types';
import { simulateBattle } from './battleEngine';

// 기본 설정
const DEFAULT_OPTIONS: SimulationOptions = {
  runs: 10000,
  config: {
    maxDuration: 300,
    timeStep: 0.1,
    damageFormula: 'simple',
  },
  saveSampleBattles: 10,
};

/**
 * 신뢰 구간 계산 (Wilson score interval)
 */
function calculateConfidenceInterval(
  wins: number,
  total: number,
  confidence: number = 0.95
): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 0 };

  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  const p = wins / total;
  const n = total;

  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);

  return {
    lower: Math.max(0, (center - margin) / denominator),
    upper: Math.min(1, (center + margin) / denominator),
  };
}

/**
 * 히스토그램 생성 (빈 개수 자동 계산)
 */
function createHistogram(data: number[], binCount: number = 20): number[] {
  if (data.length === 0) return [];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binSize = range / binCount;

  const histogram = new Array(binCount).fill(0);

  for (const value of data) {
    const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binSize));
    histogram[binIndex]++;
  }

  return histogram;
}

/**
 * 몬테카를로 시뮬레이션 실행
 */
export function runMonteCarloSimulation(
  unit1: UnitStats,
  unit2: UnitStats,
  skills1: Skill[] = [],
  skills2: Skill[] = [],
  options: Partial<SimulationOptions> = {}
): SimulationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { runs, config, saveSampleBattles, onProgress } = opts;

  // 결과 수집
  let unit1Wins = 0;
  let unit2Wins = 0;
  let draws = 0;

  const durations: number[] = [];
  const unit1Damages: number[] = [];
  const unit2Damages: number[] = [];
  const unit1SurvivalHps: number[] = [];
  const unit2SurvivalHps: number[] = [];
  const unit1TTKs: number[] = [];
  const unit2TTKs: number[] = [];
  const sampleBattles: BattleResult[] = [];

  // 시뮬레이션 실행
  for (let i = 0; i < runs; i++) {
    const result = simulateBattle(unit1, unit2, skills1, skills2, config);

    // 승패 집계
    if (result.winner === 'unit1') {
      unit1Wins++;
      unit1SurvivalHps.push(result.unit1FinalHp);
      unit1TTKs.push(result.duration);
    } else if (result.winner === 'unit2') {
      unit2Wins++;
      unit2SurvivalHps.push(result.unit2FinalHp);
      unit2TTKs.push(result.duration);
    } else {
      draws++;
    }

    // 데이터 수집
    durations.push(result.duration);
    unit1Damages.push(result.unit1TotalDamage);
    unit2Damages.push(result.unit2TotalDamage);

    // 샘플 저장
    if (saveSampleBattles && sampleBattles.length < saveSampleBattles) {
      sampleBattles.push(result);
    }

    // 진행률 콜백
    if (onProgress && i % Math.max(1, Math.floor(runs / 100)) === 0) {
      onProgress((i / runs) * 100);
    }
  }

  // 평균 계산
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const avgDuration = avg(durations);
  const unit1AvgDamage = avg(unit1Damages);
  const unit2AvgDamage = avg(unit2Damages);

  // 이론적 DPS 계산
  const calculateTheoreticalDps = (unit: UnitStats) => {
    const baseDps = unit.atk * unit.speed;
    const critMultiplier = 1 + (unit.critRate || 0) * ((unit.critDamage || 1.5) - 1);
    return baseDps * critMultiplier;
  };

  // 결과 반환
  return {
    totalRuns: runs,
    unit1Wins,
    unit2Wins,
    draws,
    unit1WinRate: unit1Wins / runs,
    unit2WinRate: unit2Wins / runs,

    avgDuration,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),

    unit1AvgDamage,
    unit1AvgDps: avgDuration > 0 ? unit1AvgDamage / avgDuration : 0,
    unit1AvgSurvivalHp: avg(unit1SurvivalHps),

    unit2AvgDamage,
    unit2AvgDps: avgDuration > 0 ? unit2AvgDamage / avgDuration : 0,
    unit2AvgSurvivalHp: avg(unit2SurvivalHps),

    durationDistribution: createHistogram(durations),
    damageDistribution: {
      unit1: createHistogram(unit1Damages),
      unit2: createHistogram(unit2Damages),
    },

    winRateConfidence: {
      unit1: calculateConfidenceInterval(unit1Wins, runs),
      unit2: calculateConfidenceInterval(unit2Wins, runs),
    },

    ttkDistribution: {
      unit1: createHistogram(unit1TTKs),
      unit2: createHistogram(unit2TTKs),
    },

    ttkStats: {
      unit1: {
        avg: avg(unit1TTKs),
        min: unit1TTKs.length > 0 ? Math.min(...unit1TTKs) : 0,
        max: unit1TTKs.length > 0 ? Math.max(...unit1TTKs) : 0,
        median: median(unit1TTKs),
      },
      unit2: {
        avg: avg(unit2TTKs),
        min: unit2TTKs.length > 0 ? Math.min(...unit2TTKs) : 0,
        max: unit2TTKs.length > 0 ? Math.max(...unit2TTKs) : 0,
        median: median(unit2TTKs),
      },
    },

    theoreticalDps: {
      unit1: calculateTheoreticalDps(unit1),
      unit2: calculateTheoreticalDps(unit2),
    },

    sampleBattles,
  };
}

/**
 * Web Worker용 시뮬레이션 (메인 스레드 블로킹 방지)
 */
export async function runMonteCarloSimulationAsync(
  unit1: UnitStats,
  unit2: UnitStats,
  skills1: Skill[] = [],
  skills2: Skill[] = [],
  options: Partial<SimulationOptions> = {}
): Promise<SimulationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { runs, onProgress } = opts;

  // 청크 단위로 실행 (UI 블로킹 방지)
  const chunkSize = 1000;
  const chunks = Math.ceil(runs / chunkSize);

  let unit1Wins = 0;
  let unit2Wins = 0;
  let draws = 0;

  const durations: number[] = [];
  const unit1Damages: number[] = [];
  const unit2Damages: number[] = [];
  const unit1SurvivalHps: number[] = [];
  const unit2SurvivalHps: number[] = [];
  const unit1TTKs: number[] = [];
  const unit2TTKs: number[] = [];
  const sampleBattles: BattleResult[] = [];

  for (let chunk = 0; chunk < chunks; chunk++) {
    const start = chunk * chunkSize;
    const end = Math.min(start + chunkSize, runs);

    // 청크 실행
    for (let i = start; i < end; i++) {
      const result = simulateBattle(unit1, unit2, skills1, skills2, opts.config);

      if (result.winner === 'unit1') {
        unit1Wins++;
        unit1SurvivalHps.push(result.unit1FinalHp);
        unit1TTKs.push(result.duration);
      } else if (result.winner === 'unit2') {
        unit2Wins++;
        unit2SurvivalHps.push(result.unit2FinalHp);
        unit2TTKs.push(result.duration);
      } else {
        draws++;
      }

      durations.push(result.duration);
      unit1Damages.push(result.unit1TotalDamage);
      unit2Damages.push(result.unit2TotalDamage);

      if (opts.saveSampleBattles && sampleBattles.length < opts.saveSampleBattles) {
        sampleBattles.push(result);
      }
    }

    // 진행률 업데이트
    if (onProgress) {
      onProgress((end / runs) * 100);
    }

    // UI 업데이트 기회 제공
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // 통계 계산
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const avgDuration = avg(durations);

  // 이론적 DPS 계산 (스탯 기반)
  const calculateTheoreticalDps = (unit: typeof unit1) => {
    const baseDps = unit.atk * unit.speed;
    const critMultiplier = 1 + (unit.critRate || 0) * ((unit.critDamage || 1.5) - 1);
    return baseDps * critMultiplier;
  };

  return {
    totalRuns: runs,
    unit1Wins,
    unit2Wins,
    draws,
    unit1WinRate: unit1Wins / runs,
    unit2WinRate: unit2Wins / runs,

    avgDuration,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),

    unit1AvgDamage: avg(unit1Damages),
    unit1AvgDps: avgDuration > 0 ? avg(unit1Damages) / avgDuration : 0,
    unit1AvgSurvivalHp: avg(unit1SurvivalHps),

    unit2AvgDamage: avg(unit2Damages),
    unit2AvgDps: avgDuration > 0 ? avg(unit2Damages) / avgDuration : 0,
    unit2AvgSurvivalHp: avg(unit2SurvivalHps),

    durationDistribution: createHistogram(durations),
    damageDistribution: {
      unit1: createHistogram(unit1Damages),
      unit2: createHistogram(unit2Damages),
    },

    winRateConfidence: {
      unit1: calculateConfidenceInterval(unit1Wins, runs),
      unit2: calculateConfidenceInterval(unit2Wins, runs),
    },

    ttkDistribution: {
      unit1: createHistogram(unit1TTKs),
      unit2: createHistogram(unit2TTKs),
    },

    ttkStats: {
      unit1: {
        avg: avg(unit1TTKs),
        min: unit1TTKs.length > 0 ? Math.min(...unit1TTKs) : 0,
        max: unit1TTKs.length > 0 ? Math.max(...unit1TTKs) : 0,
        median: median(unit1TTKs),
      },
      unit2: {
        avg: avg(unit2TTKs),
        min: unit2TTKs.length > 0 ? Math.min(...unit2TTKs) : 0,
        max: unit2TTKs.length > 0 ? Math.max(...unit2TTKs) : 0,
        median: median(unit2TTKs),
      },
    },

    theoreticalDps: {
      unit1: calculateTheoreticalDps(unit1),
      unit2: calculateTheoreticalDps(unit2),
    },

    sampleBattles,
  };
}
