/**
 * useBalanceAnalysisState - 밸런스 분석 상태 관리 훅
 */

import { useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import type { UnitStats } from '@/lib/simulation/types';
import {
  calculateMatchupMatrix,
  analyzePerfectImbalance,
  analyzePowerCurve,
  analyzeCorrelations,
  type PerfectImbalanceResult,
  type PowerCurveAnalysis,
  type CorrelationResult,
} from '@/lib/balanceAnalysis';

export type AnalysisTab = 'matchup' | 'power' | 'correlation' | 'deadzone' | 'curve';

export function useBalanceAnalysisState(
  externalShowHelp?: boolean,
  externalSetShowHelp?: (value: boolean) => void
) {
  const { projects, currentProjectId, currentSheetId } = useProjectStore();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('matchup');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchupResult, setMatchupResult] = useState<PerfectImbalanceResult | null>(null);
  const [powerResult, setPowerResult] = useState<PowerCurveAnalysis | null>(null);
  const [correlationResult, setCorrelationResult] = useState<CorrelationResult[] | null>(null);
  const [runsPerMatch, setRunsPerMatch] = useState(50);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [internalShowHelp, setInternalShowHelp] = useState(false);
  const [showTabDropdown, setShowTabDropdown] = useState(false);

  // 외부 상태가 있으면 사용, 없으면 내부 상태 사용
  const showHelp = externalShowHelp !== undefined ? externalShowHelp : internalShowHelp;
  const setShowHelp = externalSetShowHelp || setInternalShowHelp;

  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  // 시트에서 유닛 데이터 추출
  const units = useMemo((): UnitStats[] => {
    if (!currentSheet) return [];

    const columns = currentSheet.columns;
    const nameCol = columns.find(c =>
      c.name.toLowerCase() === 'name' || c.name === '이름'
    );
    const hpCol = columns.find(c => c.name.toLowerCase() === 'hp' || c.name.includes('체력'));
    const atkCol = columns.find(c => c.name.toLowerCase() === 'atk' || c.name.includes('공격력'));
    const defCol = columns.find(c => c.name.toLowerCase() === 'def' || c.name.includes('방어력'));
    const speedCol = columns.find(c => c.name.toLowerCase() === 'speed' || c.name.includes('속도'));

    return currentSheet.rows.map((row, index) => {
      const name = nameCol ? String(row.cells[nameCol.id] || `유닛${index + 1}`) : `유닛${index + 1}`;
      const hp = hpCol ? Number(row.cells[hpCol.id]) || 100 : 100;
      const atk = atkCol ? Number(row.cells[atkCol.id]) || 10 : 10;
      const def = defCol ? Number(row.cells[defCol.id]) || 0 : 0;
      const speed = speedCol ? Number(row.cells[speedCol.id]) || 1 : 1;

      return {
        id: row.id,
        name,
        hp,
        maxHp: hp,
        atk,
        def,
        speed: speed > 0 ? speed : 1,
      };
    }).filter(u => u.maxHp > 0);
  }, [currentSheet]);

  // Perfect Imbalance 분석 실행
  const runMatchupAnalysis = async () => {
    if (units.length < 2) return;

    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      const matrix = calculateMatchupMatrix(units, runsPerMatch);
      const result = analyzePerfectImbalance(matrix);
      setMatchupResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 파워 커브 분석
  const runPowerAnalysis = () => {
    if (!currentSheet) return;

    const columns = currentSheet.columns;
    const levelCol = columns.find(c => c.name.toLowerCase() === 'level' || c.name.includes('레벨'));

    if (!levelCol) {
      alert('레벨 컬럼이 필요합니다.');
      return;
    }

    const data = units.map((u, i) => {
      const row = currentSheet.rows[i];
      const level = levelCol ? Number(row.cells[levelCol.id]) || 1 : 1;
      const power = u.hp * 0.5 + u.atk * 2 + u.def * 1.5 + u.speed * 5;
      return { level, power };
    }).sort((a, b) => a.level - b.level);

    const result = analyzePowerCurve(data);
    setPowerResult(result);
  };

  // 상관관계 분석
  const runCorrelationAnalysis = () => {
    const unitData = units.map(u => ({
      hp: u.maxHp,
      atk: u.atk,
      def: u.def,
      speed: u.speed,
    }));

    const result = analyzeCorrelations(unitData, ['hp', 'atk', 'def', 'speed']);
    setCorrelationResult(result);
  };

  return {
    // 상태
    activeTab,
    setActiveTab,
    isAnalyzing,
    matchupResult,
    powerResult,
    correlationResult,
    runsPerMatch,
    setRunsPerMatch,
    showMatrixModal,
    setShowMatrixModal,
    showHelp,
    setShowHelp,
    showTabDropdown,
    setShowTabDropdown,
    units,
    currentSheet,
    // 액션
    runMatchupAnalysis,
    runPowerAnalysis,
    runCorrelationAnalysis,
  };
}
