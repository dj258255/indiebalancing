/**
 * Economy Simulator - Faucet/Sink Balance Calculator
 * Based on game economy design principles from industry best practices
 *
 * References:
 * - Department of Play: https://departmentofplay.net/the-principles-of-building-a-game-economy/
 * - Machinations.io: https://machinations.io/
 * - ThinkingData: Real-time resource monitoring
 */

// Faucet (자원 생성원)
export interface Faucet {
  id: string;
  name: string;
  ratePerHour: number;      // 시간당 생성량
  playerPercentage: number; // 이 활동을 하는 플레이어 비율 (0-1)
  level?: number;           // 레벨에 따른 조정
  notes?: string;
}

// Sink (자원 소모처)
export interface Sink {
  id: string;
  name: string;
  costPerUse: number;       // 1회 사용 비용
  usesPerHour: number;      // 시간당 사용 횟수
  playerPercentage: number; // 이 활동을 하는 플레이어 비율 (0-1)
  isRequired: boolean;      // 필수 소모인지 (수리비 등)
  notes?: string;
}

// 경제 시뮬레이션 설정
export interface EconomyConfig {
  currencyName: string;
  playerCount: number;
  simulationDays: number;
  initialSupply: number;
  targetInflationRate: number; // 목표 인플레이션율 (예: 0.02 = 2%)
}

// 시뮬레이션 결과
export interface EconomyResult {
  // 기본 통계
  totalFaucetPerHour: number;
  totalSinkPerHour: number;
  netFlowPerHour: number;

  // 균형 지표
  faucetSinkRatio: number;      // Faucet/Sink 비율 (1.0이 이상적)
  inflationRate: number;        // 예상 인플레이션율
  daysToDouble: number | null;  // 통화량 2배 되는 데 걸리는 일수

  // 시간별 예측
  supplyOverTime: { day: number; supply: number; inflation: number }[];

  // 핀치 포인트 분석
  pinchPointAnalysis: {
    isHealthy: boolean;
    recommendation: string;
    severity: 'good' | 'warning' | 'critical';
  };

  // 개별 항목 분석
  faucetBreakdown: { name: string; contribution: number; percentage: number }[];
  sinkBreakdown: { name: string; contribution: number; percentage: number }[];

  // 위험 요소
  warnings: string[];
}

/**
 * 경제 시뮬레이션 실행
 */
export function simulateEconomy(
  faucets: Faucet[],
  sinks: Sink[],
  config: EconomyConfig
): EconomyResult {
  const warnings: string[] = [];

  // 시간당 총 Faucet 계산 (플레이어 전체 기준)
  const faucetBreakdown = faucets.map(f => {
    const contribution = f.ratePerHour * f.playerPercentage * config.playerCount;
    return {
      name: f.name,
      contribution,
      percentage: 0 // 나중에 계산
    };
  });

  const totalFaucetPerHour = faucetBreakdown.reduce((sum, f) => sum + f.contribution, 0);

  // Faucet 퍼센티지 계산
  faucetBreakdown.forEach(f => {
    f.percentage = totalFaucetPerHour > 0 ? (f.contribution / totalFaucetPerHour) * 100 : 0;
  });

  // 시간당 총 Sink 계산
  const sinkBreakdown = sinks.map(s => {
    const contribution = s.costPerUse * s.usesPerHour * s.playerPercentage * config.playerCount;
    return {
      name: s.name,
      contribution,
      percentage: 0
    };
  });

  const totalSinkPerHour = sinkBreakdown.reduce((sum, s) => sum + s.contribution, 0);

  // Sink 퍼센티지 계산
  sinkBreakdown.forEach(s => {
    s.percentage = totalSinkPerHour > 0 ? (s.contribution / totalSinkPerHour) * 100 : 0;
  });

  // 순 유입량
  const netFlowPerHour = totalFaucetPerHour - totalSinkPerHour;

  // Faucet/Sink 비율
  const faucetSinkRatio = totalSinkPerHour > 0
    ? totalFaucetPerHour / totalSinkPerHour
    : totalFaucetPerHour > 0 ? Infinity : 1;

  // 인플레이션율 계산 (일간 기준)
  const dailyNetFlow = netFlowPerHour * 24;
  const inflationRate = config.initialSupply > 0
    ? dailyNetFlow / config.initialSupply
    : 0;

  // 통화량 2배 걸리는 일수 (복리 기준)
  let daysToDouble: number | null = null;
  if (inflationRate > 0) {
    daysToDouble = Math.log(2) / Math.log(1 + inflationRate);
  }

  // 시간별 예측
  const supplyOverTime: { day: number; supply: number; inflation: number }[] = [];
  let currentSupply = config.initialSupply;

  for (let day = 0; day <= config.simulationDays; day++) {
    const dailyInflation = currentSupply > 0
      ? (dailyNetFlow / currentSupply) * 100
      : 0;

    supplyOverTime.push({
      day,
      supply: Math.round(currentSupply),
      inflation: dailyInflation
    });

    currentSupply += dailyNetFlow;
    if (currentSupply < 0) currentSupply = 0;
  }

  // 핀치 포인트 분석
  let pinchPointAnalysis: EconomyResult['pinchPointAnalysis'];

  if (faucetSinkRatio >= 0.95 && faucetSinkRatio <= 1.05) {
    pinchPointAnalysis = {
      isHealthy: true,
      recommendation: '균형 잡힌 경제입니다. 현재 설정을 유지하세요.',
      severity: 'good'
    };
  } else if (faucetSinkRatio > 1.05 && faucetSinkRatio <= 1.2) {
    pinchPointAnalysis = {
      isHealthy: true,
      recommendation: '약간의 인플레이션이 있습니다. 장기적으로 Sink를 추가하는 것을 고려하세요.',
      severity: 'warning'
    };
  } else if (faucetSinkRatio > 1.2) {
    pinchPointAnalysis = {
      isHealthy: false,
      recommendation: '심각한 인플레이션 위험! Sink를 대폭 추가하거나 Faucet을 줄여야 합니다.',
      severity: 'critical'
    };
    warnings.push(`높은 인플레이션 위험: Faucet이 Sink보다 ${((faucetSinkRatio - 1) * 100).toFixed(0)}% 많습니다.`);
  } else if (faucetSinkRatio < 0.95 && faucetSinkRatio >= 0.8) {
    pinchPointAnalysis = {
      isHealthy: true,
      recommendation: '약간의 디플레이션이 있습니다. 플레이어가 자원 부족을 느낄 수 있습니다.',
      severity: 'warning'
    };
  } else {
    pinchPointAnalysis = {
      isHealthy: false,
      recommendation: '심각한 디플레이션 위험! 플레이어가 진행에 어려움을 겪을 수 있습니다.',
      severity: 'critical'
    };
    warnings.push(`높은 디플레이션 위험: Sink가 Faucet보다 ${((1 - faucetSinkRatio) * 100).toFixed(0)}% 많습니다.`);
  }

  // 추가 경고
  if (faucets.length === 0) {
    warnings.push('Faucet이 없습니다. 자원 생성원을 추가하세요.');
  }

  if (sinks.length === 0) {
    warnings.push('Sink가 없습니다. 자원 소모처를 추가하세요.');
  }

  const requiredSinks = sinks.filter(s => s.isRequired);
  if (requiredSinks.length === 0 && sinks.length > 0) {
    warnings.push('필수 Sink가 없습니다. 수리비, 세금 등 강제 소모처를 고려하세요.');
  }

  // 목표 인플레이션과 비교
  if (Math.abs(inflationRate - config.targetInflationRate) > 0.01) {
    const direction = inflationRate > config.targetInflationRate ? '높습니다' : '낮습니다';
    warnings.push(`현재 인플레이션율(${(inflationRate * 100).toFixed(2)}%)이 목표(${(config.targetInflationRate * 100).toFixed(2)}%)보다 ${direction}.`);
  }

  return {
    totalFaucetPerHour,
    totalSinkPerHour,
    netFlowPerHour,
    faucetSinkRatio,
    inflationRate,
    daysToDouble,
    supplyOverTime,
    pinchPointAnalysis,
    faucetBreakdown: faucetBreakdown.sort((a, b) => b.contribution - a.contribution),
    sinkBreakdown: sinkBreakdown.sort((a, b) => b.contribution - a.contribution),
    warnings
  };
}

/**
 * 균형을 맞추기 위한 제안 계산
 */
export function calculateBalanceSuggestions(
  faucets: Faucet[],
  sinks: Sink[],
  config: EconomyConfig
): {
  suggestedFaucetMultiplier: number;
  suggestedSinkMultiplier: number;
  suggestedNewSinkRate: number;
  explanation: string;
} {
  const result = simulateEconomy(faucets, sinks, config);

  if (result.faucetSinkRatio >= 0.95 && result.faucetSinkRatio <= 1.05) {
    return {
      suggestedFaucetMultiplier: 1,
      suggestedSinkMultiplier: 1,
      suggestedNewSinkRate: 0,
      explanation: '현재 경제가 균형 상태입니다.'
    };
  }

  if (result.faucetSinkRatio > 1.05) {
    // 인플레이션 - Sink를 늘리거나 Faucet을 줄여야 함
    const targetSink = result.totalFaucetPerHour; // 1:1 균형 목표
    const sinkMultiplier = result.totalSinkPerHour > 0
      ? targetSink / result.totalSinkPerHour
      : 1;
    const faucetMultiplier = result.totalSinkPerHour > 0
      ? result.totalSinkPerHour / result.totalFaucetPerHour
      : 0.5;
    const newSinkNeeded = result.totalFaucetPerHour - result.totalSinkPerHour;

    return {
      suggestedFaucetMultiplier: faucetMultiplier,
      suggestedSinkMultiplier: sinkMultiplier,
      suggestedNewSinkRate: newSinkNeeded,
      explanation: `균형을 위해 Sink를 ${((sinkMultiplier - 1) * 100).toFixed(0)}% 증가시키거나, Faucet을 ${((1 - faucetMultiplier) * 100).toFixed(0)}% 감소시키거나, 시간당 ${newSinkNeeded.toFixed(0)}의 새로운 Sink를 추가하세요.`
    };
  } else {
    // 디플레이션 - Faucet을 늘리거나 Sink를 줄여야 함
    const targetFaucet = result.totalSinkPerHour;
    const faucetMultiplier = result.totalFaucetPerHour > 0
      ? targetFaucet / result.totalFaucetPerHour
      : 2;
    const sinkMultiplier = result.totalFaucetPerHour > 0
      ? result.totalFaucetPerHour / result.totalSinkPerHour
      : 0.5;
    const newFaucetNeeded = result.totalSinkPerHour - result.totalFaucetPerHour;

    return {
      suggestedFaucetMultiplier: faucetMultiplier,
      suggestedSinkMultiplier: sinkMultiplier,
      suggestedNewSinkRate: -newFaucetNeeded, // 음수로 Faucet 필요량 표시
      explanation: `균형을 위해 Faucet을 ${((faucetMultiplier - 1) * 100).toFixed(0)}% 증가시키거나, Sink를 ${((1 - sinkMultiplier) * 100).toFixed(0)}% 감소시키세요.`
    };
  }
}

// 기본 템플릿
export const DEFAULT_FAUCETS: Faucet[] = [
  { id: 'quest', name: '퀘스트 보상', ratePerHour: 1000, playerPercentage: 0.8 },
  { id: 'monster', name: '몬스터 드롭', ratePerHour: 500, playerPercentage: 0.9 },
  { id: 'daily', name: '일일 보상', ratePerHour: 200, playerPercentage: 0.6 },
];

export const DEFAULT_SINKS: Sink[] = [
  { id: 'repair', name: '장비 수리', costPerUse: 50, usesPerHour: 2, playerPercentage: 0.9, isRequired: true },
  { id: 'potion', name: '포션 구매', costPerUse: 30, usesPerHour: 5, playerPercentage: 0.7, isRequired: false },
  { id: 'tax', name: '거래 수수료', costPerUse: 100, usesPerHour: 0.5, playerPercentage: 0.3, isRequired: true },
];

export const DEFAULT_CONFIG: EconomyConfig = {
  currencyName: '골드',
  playerCount: 1000,
  simulationDays: 30,
  initialSupply: 10000000,
  targetInflationRate: 0.02,
};
