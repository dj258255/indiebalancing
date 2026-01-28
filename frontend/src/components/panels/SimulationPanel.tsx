'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Play, Settings, BarChart3, Clock, Swords, Heart, Shield, Zap, ChevronDown, ChevronUp, RefreshCw, User, Grid3X3, Download, TrendingUp } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { UnitStats, SimulationResult, BattleConfig, DefenseFormulaType, ArmorPenetrationConfig, TeamBattleConfig, Skill } from '@/lib/simulation/types';
import { runMonteCarloSimulationAsync } from '@/lib/simulation/monteCarloSimulator';
import { runTeamMonteCarloSimulation } from '@/lib/simulation/battleEngine';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useTranslations } from 'next-intl';

// 분리된 컴포넌트들
import { StatInput, UnitPicker, TeamUnitModal, Histogram, HpTimelineGraph, ConfidenceBar, SkillEditor } from './simulation/components';
import { PANEL_COLOR } from './simulation/constants';


interface SimulationPanelProps {
  onClose: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

export default function SimulationPanel({ onClose, showHelp = false, setShowHelp }: SimulationPanelProps) {
  const t = useTranslations('simulation');
  const tCommon = useTranslations();
  // ESC 키로 패널 닫기
  useEscapeKey(onClose);

  const { projects, currentProjectId, currentSheetId, startCellSelection } = useProjectStore();

  // 현재 시트 데이터
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  // 기본 유닛 스탯
  const defaultStats: UnitStats = {
    id: '',
    name: '',
    hp: 100,
    maxHp: 100,
    atk: 10,
    def: 0,
    speed: 1,
    critRate: 0,
    critDamage: 1.5,
    accuracy: 1,
    evasion: 0
  };

  // 상태 - 직접 편집 가능한 유닛 스탯
  const [unit1Stats, setUnit1Stats] = useState<UnitStats>({ ...defaultStats, id: 'unit1', name: '유닛 A' });
  const [unit2Stats, setUnit2Stats] = useState<UnitStats>({ ...defaultStats, id: 'unit2', name: '유닛 B' });
  const [unit1Skills, setUnit1Skills] = useState<Skill[]>([]);
  const [unit2Skills, setUnit2Skills] = useState<Skill[]>([]);
  const [showUnit1Skills, setShowUnit1Skills] = useState(false);
  const [showUnit2Skills, setShowUnit2Skills] = useState(false);
  const [runs, setRuns] = useState(10000);
  const [damageFormula, setDamageFormula] = useState<BattleConfig['damageFormula']>('simple');
  const [defenseFormula, setDefenseFormula] = useState<DefenseFormulaType>('subtractive');
  const [maxDuration, setMaxDuration] = useState(300);
  const [useArmorPen, setUseArmorPen] = useState(false);
  const [armorPen, setArmorPen] = useState<ArmorPenetrationConfig>({
    flatPenetration: 0,
    percentPenetration: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [selectedBattleIndex, setSelectedBattleIndex] = useState(0);

  // 전투 모드 (1v1 vs Team)
  const [battleMode, setBattleMode] = useState<'1v1' | 'team'>('1v1');

  // 팀 전투 상태
  const [team1Units, setTeam1Units] = useState<UnitStats[]>([]);
  const [team2Units, setTeam2Units] = useState<UnitStats[]>([]);
  const [targetingMode, setTargetingMode] = useState<TeamBattleConfig['targetingMode']>('random');
  const [teamResult, setTeamResult] = useState<{
    totalRuns: number;
    team1Wins: number;
    team2Wins: number;
    draws: number;
    team1WinRate: number;
    team2WinRate: number;
    avgDuration: number;
    avgTeam1Survivors: number;
    avgTeam2Survivors: number;
  } | null>(null);

  // 팀 유닛 편집 모달 상태
  const [teamUnitModal, setTeamUnitModal] = useState<{
    isOpen: boolean;
    teamNumber: 1 | 2;
    editUnit: UnitStats | null;
  }>({ isOpen: false, teamNumber: 1, editUnit: null });

  // 컬럼 매핑 상태
  const [columnMapping, setColumnMapping] = useState<{
    name: string;
    hp: string;
    atk: string;
    def: string;
    speed: string;
    critRate: string;
    critDamage: string;
  }>({
    name: '',
    hp: '',
    atk: '',
    def: '',
    speed: '',
    critRate: '',
    critDamage: '',
  });

  // 자동 컬럼 감지 (폴백용)
  const autoDetectedColumns = useMemo(() => {
    if (!currentSheet) return { name: '', hp: '', atk: '', def: '', speed: '', critRate: '', critDamage: '' };

    const columns = currentSheet.columns;
    const findCol = (patterns: string[]) => {
      const col = columns.find(c =>
        patterns.some(p => c.name.toLowerCase() === p.toLowerCase() || c.name.includes(p))
      );
      return col?.id || '';
    };

    return {
      name: findCol(['name', '이름']),
      hp: findCol(['hp', 'maxhp', '체력', 'HP']),
      atk: findCol(['atk', 'attack', '공격력', 'damage', '데미지', 'ATK']),
      def: findCol(['def', 'defense', '방어력', 'DEF']),
      speed: findCol(['speed', '속도', 'spd']),
      critRate: findCol(['critrate', 'crit_rate', '치명타율', '크리티컬']),
      critDamage: findCol(['critdmg', 'crit_damage', '치명타피해', '크리티컬데미지']),
    };
  }, [currentSheet]);

  // 실제 사용할 매핑 (사용자 설정 > 자동 감지)
  const effectiveMapping = useMemo(() => ({
    name: columnMapping.name || autoDetectedColumns.name,
    hp: columnMapping.hp || autoDetectedColumns.hp,
    atk: columnMapping.atk || autoDetectedColumns.atk,
    def: columnMapping.def || autoDetectedColumns.def,
    speed: columnMapping.speed || autoDetectedColumns.speed,
    critRate: columnMapping.critRate || autoDetectedColumns.critRate,
    critDamage: columnMapping.critDamage || autoDetectedColumns.critDamage,
  }), [columnMapping, autoDetectedColumns]);

  // 시트에서 유닛 목록 추출
  const units = useMemo(() => {
    if (!currentSheet) return [];

    const sheetName = currentSheet.name;

    return currentSheet.rows.map((row, index) => {
      const rowNumber = index + 1;
      let displayName: string;

      if (effectiveMapping.name) {
        const rawName = row.cells[effectiveMapping.name];
        if (rawName !== null && rawName !== undefined && String(rawName).trim() !== '') {
          displayName = String(rawName);
        } else {
          displayName = `${sheetName} #${rowNumber}`;
        }
      } else {
        displayName = `${sheetName} #${rowNumber}`;
      }

      const hp = effectiveMapping.hp ? Number(row.cells[effectiveMapping.hp]) || 100 : 100;
      const atk = effectiveMapping.atk ? Number(row.cells[effectiveMapping.atk]) || 10 : 10;
      const def = effectiveMapping.def ? Number(row.cells[effectiveMapping.def]) || 0 : 0;
      const speed = effectiveMapping.speed ? Number(row.cells[effectiveMapping.speed]) || 1 : 1;
      const critRate = effectiveMapping.critRate ? Number(row.cells[effectiveMapping.critRate]) || 0 : 0;
      const critDamage = effectiveMapping.critDamage ? Number(row.cells[effectiveMapping.critDamage]) || 1.5 : 1.5;

      return {
        id: row.id,
        name: displayName,
        hp,
        maxHp: hp,
        atk,
        def,
        speed: speed > 0 ? speed : 1,
        critRate: critRate > 1 ? critRate / 100 : critRate,
        critDamage,
        accuracy: 1,
        evasion: 0
      } as UnitStats;
    }).filter(u => u.name && u.maxHp > 0);
  }, [currentSheet, effectiveMapping]);

  // 시트에서 유닛 불러오기 핸들러
  const loadFromSheet = (unitNumber: 1 | 2, sheetUnit: UnitStats) => {
    if (unitNumber === 1) {
      setUnit1Stats({ ...sheetUnit });
    } else {
      setUnit2Stats({ ...sheetUnit });
    }
  };

  // 결과 내보내기
  const exportResults = useCallback((format: 'json' | 'csv') => {
    if (!result) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `simulation_${unit1Stats.name}_vs_${unit2Stats.name}_${timestamp}`;

    if (format === 'json') {
      const exportData = {
        meta: {
          exportedAt: new Date().toISOString(),
          unit1: unit1Stats,
          unit2: unit2Stats,
          config: {
            runs,
            maxDuration,
            damageFormula,
            defenseFormula,
            armorPenetration: useArmorPen ? armorPen : undefined,
          }
        },
        summary: {
          totalRuns: result.totalRuns,
          unit1Wins: result.unit1Wins,
          unit2Wins: result.unit2Wins,
          draws: result.draws,
          unit1WinRate: result.unit1WinRate,
          unit2WinRate: result.unit2WinRate,
        },
        statistics: {
          avgDuration: result.avgDuration,
          minDuration: result.minDuration,
          maxDuration: result.maxDuration,
          unit1: {
            avgDamage: result.unit1AvgDamage,
            avgDps: result.unit1AvgDps,
            avgSurvivalHp: result.unit1AvgSurvivalHp,
            ttkStats: result.ttkStats?.unit1,
          },
          unit2: {
            avgDamage: result.unit2AvgDamage,
            avgDps: result.unit2AvgDps,
            avgSurvivalHp: result.unit2AvgSurvivalHp,
            ttkStats: result.ttkStats?.unit2,
          },
        },
        critStats: result.critStats,
        reversalAnalysis: result.reversalAnalysis,
        winRateConfidence: result.winRateConfidence,
        theoreticalDps: result.theoreticalDps,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV 형식
      const rows = [
        ['Metric', 'Unit 1', 'Unit 2', 'Notes'],
        ['Name', unit1Stats.name, unit2Stats.name, ''],
        ['Total Runs', result.totalRuns.toString(), '', ''],
        ['Wins', result.unit1Wins.toString(), result.unit2Wins.toString(), `Draws: ${result.draws}`],
        ['Win Rate', `${(result.unit1WinRate * 100).toFixed(2)}%`, `${(result.unit2WinRate * 100).toFixed(2)}%`, ''],
        ['Avg Duration', `${result.avgDuration.toFixed(2)}s`, '', `Range: ${result.minDuration.toFixed(1)}-${result.maxDuration.toFixed(1)}s`],
        ['Avg Damage', result.unit1AvgDamage.toFixed(0), result.unit2AvgDamage.toFixed(0), ''],
        ['Avg DPS', result.unit1AvgDps.toFixed(2), result.unit2AvgDps.toFixed(2), ''],
        ['Avg Survival HP', result.unit1AvgSurvivalHp.toFixed(0), result.unit2AvgSurvivalHp.toFixed(0), 'When winning'],
      ];

      if (result.ttkStats) {
        rows.push(['TTK Avg', `${result.ttkStats.unit1.avg.toFixed(2)}s`, `${result.ttkStats.unit2.avg.toFixed(2)}s`, 'Time to Kill']);
      }

      if (result.critStats) {
        rows.push(['Total Crits', result.critStats.unit1.totalCrits.toString(), result.critStats.unit2.totalCrits.toString(), '']);
        rows.push(['Actual Crit Rate', `${(result.critStats.unit1.avgCritRate * 100).toFixed(2)}%`, `${(result.critStats.unit2.avgCritRate * 100).toFixed(2)}%`, '']);
      }

      if (result.reversalAnalysis) {
        rows.push(['Reversals', result.reversalAnalysis.unit1Reversals.toString(), result.reversalAnalysis.unit2Reversals.toString(), '']);
        rows.push(['Crit Reversals', result.reversalAnalysis.critCausedReversals.toString(), '', 'Total']);
        rows.push(['Close Matches', result.reversalAnalysis.closeMatches.toString(), '', 'HP <= 10%']);
      }

      const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [result, unit1Stats, unit2Stats, runs, maxDuration, damageFormula, defenseFormula, useArmorPen, armorPen]);

  // 시뮬레이션 실행
  const runSimulation = useCallback(async () => {
    // 유효성 검사
    if (!unit1Stats.name || !unit2Stats.name || unit1Stats.maxHp <= 0 || unit2Stats.maxHp <= 0) {
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      const simulationResult = await runMonteCarloSimulationAsync(
        unit1Stats,
        unit2Stats,
        unit1Skills,
        unit2Skills,
        {
          runs,
          config: {
            maxDuration,
            timeStep: 0.1,
            damageFormula,
            defenseFormula,
            armorPenetration: useArmorPen ? armorPen : undefined,
          },
          saveSampleBattles: 10,
          onProgress: setProgress
        }
      );

      setResult(simulationResult);
      setSelectedBattleIndex(0);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  }, [unit1Stats, unit2Stats, unit1Skills, unit2Skills, runs, maxDuration, damageFormula, defenseFormula, useArmorPen, armorPen]);

  // 팀 전투 시뮬레이션 실행
  const runTeamSimulation = useCallback(() => {
    if (team1Units.length === 0 || team2Units.length === 0) return;

    setIsRunning(true);
    setProgress(0);
    setTeamResult(null);

    // setTimeout으로 UI 업데이트 허용
    setTimeout(() => {
      try {
        const teamSimResult = runTeamMonteCarloSimulation(
          team1Units,
          team2Units,
          runs,
          {
            maxDuration,
            timeStep: 0.1,
            damageFormula,
            defenseFormula,
            armorPenetration: useArmorPen ? armorPen : undefined,
            teamSize: Math.max(team1Units.length, team2Units.length),
            targetingMode,
          }
        );

        setTeamResult(teamSimResult);
      } catch (error) {
        console.error('Team simulation failed:', error);
      } finally {
        setIsRunning(false);
        setProgress(100);
      }
    }, 10);
  }, [team1Units, team2Units, runs, maxDuration, damageFormula, defenseFormula, useArmorPen, armorPen, targetingMode]);

  // 팀에 유닛 추가
  const addToTeam = (team: 1 | 2, unit: UnitStats) => {
    if (team === 1) {
      if (!team1Units.find(u => u.id === unit.id)) {
        setTeam1Units(prev => [...prev, unit]);
      }
    } else {
      if (!team2Units.find(u => u.id === unit.id)) {
        setTeam2Units(prev => [...prev, unit]);
      }
    }
  };

  // 팀에서 유닛 제거
  const removeFromTeam = (team: 1 | 2, unitId: string) => {
    if (team === 1) {
      setTeam1Units(prev => prev.filter(u => u.id !== unitId));
    } else {
      setTeam2Units(prev => prev.filter(u => u.id !== unitId));
    }
  };

  // 팀 유닛 업데이트 (편집)
  const updateTeamUnit = (team: 1 | 2, unit: UnitStats) => {
    if (team === 1) {
      setTeam1Units(prev => {
        const existingIndex = prev.findIndex(u => u.id === unit.id);
        if (existingIndex >= 0) {
          // 기존 유닛 업데이트
          const updated = [...prev];
          updated[existingIndex] = unit;
          return updated;
        } else {
          // 새 유닛 추가
          return [...prev, unit];
        }
      });
    } else {
      setTeam2Units(prev => {
        const existingIndex = prev.findIndex(u => u.id === unit.id);
        if (existingIndex >= 0) {
          // 기존 유닛 업데이트
          const updated = [...prev];
          updated[existingIndex] = unit;
          return updated;
        } else {
          // 새 유닛 추가
          return [...prev, unit];
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 내용 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {/* 도움말 섹션 */}
        {showHelp && (
          <div className="mb-4 p-3 rounded-lg animate-slideDown" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${PANEL_COLOR}20` }}>
                  <Swords className="w-3 h-3" style={{ color: PANEL_COLOR }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{tCommon('help.simulation.title')}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{tCommon('help.simulation.desc')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>DPS</span>
                  <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>{tCommon('help.simulation.dps')}</span>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>TTK</span>
                  <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>{tCommon('help.simulation.ttk')}</span>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>{tCommon('help.simulation.winRate')}</span>
                  <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>{tCommon('help.simulation.winRateDesc')}</span>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>{tCommon('help.simulation.monteCarlo')}</span>
                  <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>{tCommon('help.simulation.monteCarloDesc')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 모드 선택 탭 */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <button
            onClick={() => setBattleMode('1v1')}
            className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: battleMode === '1v1' ? 'var(--bg-primary)' : 'transparent',
              color: battleMode === '1v1' ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: battleMode === '1v1' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <User className="w-4 h-4" />
            {t('mode1v1')}
          </button>
          <button
            onClick={() => setBattleMode('team')}
            className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: battleMode === 'team' ? 'var(--bg-primary)' : 'transparent',
              color: battleMode === 'team' ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: battleMode === 'team' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Grid3X3 className="w-4 h-4" />
            {t('modeTeam')}
          </button>
        </div>

        {/* 1v1 모드 UI */}
        {battleMode === '1v1' && (
          <>
        {/* 유닛 스탯 입력 - 반응형 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* 유닛 A */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--primary-blue)' }}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={unit1Stats.name}
                onChange={(e) => setUnit1Stats(prev => ({ ...prev, name: e.target.value }))}
                className="text-sm font-medium bg-transparent border-none outline-none flex-1 min-w-0"
                style={{ color: 'var(--primary-blue)' }}
                placeholder="유닛 A"
              />
              <UnitPicker
                units={units}
                onSelect={(unit) => loadFromSheet(1, unit)}
                color="var(--primary-blue)"
                buttonText={t('loadFromSheet')}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              <StatInput
                icon={Heart}
                label="HP"
                value={unit1Stats.maxHp}
                onChange={(v) => setUnit1Stats(prev => ({ ...prev, maxHp: v, hp: v }))}
                onCellSelect={() => startCellSelection('HP (유닛 A)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit1Stats(prev => ({ ...prev, maxHp: num, hp: num }));
                })}
                color="#e86161"
              />
              <StatInput
                icon={Swords}
                label="ATK"
                value={unit1Stats.atk}
                onChange={(v) => setUnit1Stats(prev => ({ ...prev, atk: v }))}
                onCellSelect={() => startCellSelection('ATK (유닛 A)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit1Stats(prev => ({ ...prev, atk: num }));
                })}
                color="#e5a440"
              />
              <StatInput
                icon={Shield}
                label="DEF"
                value={unit1Stats.def}
                onChange={(v) => setUnit1Stats(prev => ({ ...prev, def: v }))}
                onCellSelect={() => startCellSelection('DEF (유닛 A)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit1Stats(prev => ({ ...prev, def: num }));
                })}
                color="#5a9cf5"
              />
              <StatInput
                icon={Zap}
                label="SPD"
                value={unit1Stats.speed}
                onChange={(v) => setUnit1Stats(prev => ({ ...prev, speed: v }))}
                onCellSelect={() => startCellSelection('SPD (유닛 A)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit1Stats(prev => ({ ...prev, speed: num }));
                })}
                color="#9179f2"
              />
            </div>
            {/* 스킬 섹션 */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
              <button
                onClick={() => setShowUnit1Skills(!showUnit1Skills)}
                className="w-full flex items-center justify-between text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="flex items-center gap-2">
                  {t('skills')}
                  {unit1Skills.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-sm" style={{ background: 'var(--primary-blue)20', color: 'var(--primary-blue)' }}>
                      {unit1Skills.length}
                    </span>
                  )}
                </span>
                {showUnit1Skills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showUnit1Skills && (
                <div className="mt-2">
                  <SkillEditor
                    skills={unit1Skills}
                    onSkillsChange={setUnit1Skills}
                    color="var(--primary-blue)"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 유닛 B */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--primary-red)' }}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={unit2Stats.name}
                onChange={(e) => setUnit2Stats(prev => ({ ...prev, name: e.target.value }))}
                className="text-sm font-medium bg-transparent border-none outline-none flex-1 min-w-0"
                style={{ color: 'var(--primary-red)' }}
                placeholder="유닛 B"
              />
              <UnitPicker
                units={units}
                onSelect={(unit) => loadFromSheet(2, unit)}
                color="var(--primary-red)"
                buttonText={t('loadFromSheet')}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              <StatInput
                icon={Heart}
                label="HP"
                value={unit2Stats.maxHp}
                onChange={(v) => setUnit2Stats(prev => ({ ...prev, maxHp: v, hp: v }))}
                onCellSelect={() => startCellSelection('HP (유닛 B)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit2Stats(prev => ({ ...prev, maxHp: num, hp: num }));
                })}
                color="#e86161"
              />
              <StatInput
                icon={Swords}
                label="ATK"
                value={unit2Stats.atk}
                onChange={(v) => setUnit2Stats(prev => ({ ...prev, atk: v }))}
                onCellSelect={() => startCellSelection('ATK (유닛 B)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit2Stats(prev => ({ ...prev, atk: num }));
                })}
                color="#e5a440"
              />
              <StatInput
                icon={Shield}
                label="DEF"
                value={unit2Stats.def}
                onChange={(v) => setUnit2Stats(prev => ({ ...prev, def: v }))}
                onCellSelect={() => startCellSelection('DEF (유닛 B)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit2Stats(prev => ({ ...prev, def: num }));
                })}
                color="#5a9cf5"
              />
              <StatInput
                icon={Zap}
                label="SPD"
                value={unit2Stats.speed}
                onChange={(v) => setUnit2Stats(prev => ({ ...prev, speed: v }))}
                onCellSelect={() => startCellSelection('SPD (유닛 B)', (value) => {
                  const num = Number(value);
                  if (!isNaN(num)) setUnit2Stats(prev => ({ ...prev, speed: num }));
                })}
                color="#9179f2"
              />
            </div>
            {/* 스킬 섹션 */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
              <button
                onClick={() => setShowUnit2Skills(!showUnit2Skills)}
                className="w-full flex items-center justify-between text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="flex items-center gap-2">
                  {t('skills')}
                  {unit2Skills.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-sm" style={{ background: 'var(--primary-red)20', color: 'var(--primary-red)' }}>
                      {unit2Skills.length}
                    </span>
                  )}
                </span>
                {showUnit2Skills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showUnit2Skills && (
                <div className="mt-2">
                  <SkillEditor
                    skills={unit2Skills}
                    onSkillsChange={setUnit2Skills}
                    color="var(--primary-red)"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings')}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('runs')}</label>
                <select
                  value={runs}
                  onChange={(e) => setRuns(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value={1000}>{t('iterations.1000')}</option>
                  <option value={5000}>{t('iterations.5000')}</option>
                  <option value={10000}>{t('iterations.10000')}</option>
                  <option value={50000}>{t('iterations.50000')}</option>
                  <option value={100000}>{t('iterations.100000')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('damageFormula')}</label>
                <select
                  value={damageFormula}
                  onChange={(e) => setDamageFormula(e.target.value as BattleConfig['damageFormula'])}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="simple">{t('formulas.simple')}</option>
                  <option value="mmorpg">{t('formulas.mmorpg')}</option>
                  <option value="percentage">{t('formulas.percentage')}</option>
                  <option value="random">{t('formulas.random')}</option>
                  <option value="multiplicative">{t('formulas.multiplicative')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('defenseFormula')}</label>
                <select
                  value={defenseFormula}
                  onChange={(e) => setDefenseFormula(e.target.value as DefenseFormulaType)}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="subtractive">{t('defFormulas.subtractive')}</option>
                  <option value="divisive">{t('defFormulas.divisive')}</option>
                  <option value="multiplicative">{t('defFormulas.multiplicative')}</option>
                  <option value="logarithmic">{t('defFormulas.logarithmic')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('maxBattleTime')}</label>
                <input
                  type="number"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* 방어관통 설정 */}
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={useArmorPen}
                  onChange={(e) => setUseArmorPen(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('useArmorPen')}
                </span>
              </label>

              {useArmorPen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {t('flatPen')}
                    </label>
                    <input
                      type="number"
                      value={armorPen.flatPenetration || 0}
                      onChange={(e) => setArmorPen(prev => ({ ...prev, flatPenetration: Number(e.target.value) }))}
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)'
                      }}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {t('percentPen')}
                    </label>
                    <input
                      type="number"
                      value={armorPen.percentPenetration || 0}
                      onChange={(e) => setArmorPen(prev => ({ ...prev, percentPenetration: Number(e.target.value) }))}
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)'
                      }}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 컬럼 매핑 설정 */}
            {currentSheet && (
              <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('columnMapping')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'name' as const, label: t('colName') },
                    { key: 'hp' as const, label: 'HP' },
                    { key: 'atk' as const, label: 'ATK' },
                    { key: 'def' as const, label: 'DEF' },
                    { key: 'speed' as const, label: 'Speed' },
                    { key: 'critRate' as const, label: t('colCritRate') },
                    { key: 'critDamage' as const, label: t('colCritDmg') },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {label}
                      </label>
                      <select
                        value={columnMapping[key]}
                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="">{t('autoDetect')}</option>
                        {currentSheet.columns.map(col => (
                          <option key={col.id} value={col.id}>
                            {col.name}
                            {autoDetectedColumns[key] === col.id ? ` (${t('detected')})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 실행 버튼 + 횟수 선택 */}
        <div className="flex gap-2">
          <button
            onClick={runSimulation}
            disabled={!unit1Stats.name || !unit2Stats.name || unit1Stats.maxHp <= 0 || unit2Stats.maxHp <= 0 || isRunning}
            className="flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            style={{
              background: isRunning ? 'var(--bg-tertiary)' : 'var(--accent)',
              color: isRunning ? 'var(--text-secondary)' : 'white'
            }}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('running')} {progress.toFixed(0)}%
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {t('runSimulation')}
              </>
            )}
          </button>
          <select
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
            disabled={isRunning}
            className="px-3 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value={1000}>1K</option>
            <option value={5000}>5K</option>
            <option value={10000}>10K</option>
            <option value={50000}>50K</option>
            <option value={100000}>100K</option>
          </select>
        </div>

        {/* 진행률 바 */}
        {isRunning && (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: 'var(--accent)'
              }}
            />
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <div className="space-y-4">
            {/* 승률 - 개선된 디자인 */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('winRate')}</div>
                <div className="text-sm px-2 py-1 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                  {result.totalRuns.toLocaleString()}전
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium" style={{ color: 'var(--primary-blue)' }}>{unit1Stats.name}</span>
                    <span className="px-2 py-0.5 rounded" style={{ background: 'var(--primary-blue)15', color: 'var(--primary-blue)' }}>
                      {result.unit1Wins.toLocaleString()}승
                    </span>
                  </div>
                  <ConfidenceBar
                    winRate={result.unit1WinRate}
                    confidence={result.winRateConfidence.unit1}
                    color="var(--primary-blue)"
                    wins={result.unit1Wins}
                    total={result.totalRuns}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium" style={{ color: 'var(--primary-red)' }}>{unit2Stats.name}</span>
                    <span className="px-2 py-0.5 rounded" style={{ background: 'var(--primary-red)15', color: 'var(--primary-red)' }}>
                      {result.unit2Wins.toLocaleString()}승
                    </span>
                  </div>
                  <ConfidenceBar
                    winRate={result.unit2WinRate}
                    confidence={result.winRateConfidence.unit2}
                    color="var(--primary-red)"
                    wins={result.unit2Wins}
                    total={result.totalRuns}
                  />
                </div>

                {result.draws > 0 && (
                  <div className="flex items-center justify-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: 'var(--text-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {t('draw')}: {result.draws.toLocaleString()} ({((result.draws / result.totalRuns) * 100).toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* TTK & DPS 통계 - 병합된 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* TTK 카드 */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-yellow)20' }}>
                    <Clock className="w-4 h-4" style={{ color: 'var(--primary-yellow)' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('ttk')}</span>
                </div>
                <div className="space-y-3">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-sm mb-1 font-medium" style={{ color: 'var(--primary-blue)' }}>
                      {unit1Stats.name}
                    </div>
                    {result.ttkStats?.unit1 && result.ttkStats.unit1.avg > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                          {result.ttkStats.unit1.avg.toFixed(1)}s
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          ({result.ttkStats.unit1.min.toFixed(1)}~{result.ttkStats.unit1.max.toFixed(1)}s)
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('noWin')}</span>
                    )}
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-sm mb-1 font-medium" style={{ color: 'var(--primary-red)' }}>
                      {unit2Stats.name}
                    </div>
                    {result.ttkStats?.unit2 && result.ttkStats.unit2.avg > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold" style={{ color: 'var(--primary-red)' }}>
                          {result.ttkStats.unit2.avg.toFixed(1)}s
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          ({result.ttkStats.unit2.min.toFixed(1)}~{result.ttkStats.unit2.max.toFixed(1)}s)
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('noWin')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* DPS 카드 */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)20' }}>
                    <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('dpsComparison')}</span>
                </div>
                <div className="space-y-3">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-sm mb-1 font-medium" style={{ color: 'var(--primary-blue)' }}>{unit1Stats.name}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                        {result.unit1AvgDps.toFixed(1)}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>DPS</span>
                      {result.theoreticalDps && result.unit1AvgDps < result.theoreticalDps.unit1 * 0.9 && (
                        <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: '#fef3c720', color: '#eab308' }}>
                          -{((1 - result.unit1AvgDps / result.theoreticalDps.unit1) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-sm mb-1 font-medium" style={{ color: 'var(--primary-red)' }}>{unit2Stats.name}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold" style={{ color: 'var(--primary-red)' }}>
                        {result.unit2AvgDps.toFixed(1)}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>DPS</span>
                      {result.theoreticalDps && result.unit2AvgDps < result.theoreticalDps.unit2 * 0.9 && (
                        <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: '#fef3c720', color: '#eab308' }}>
                          -{((1 - result.unit2AvgDps / result.theoreticalDps.unit2) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 통계 요약 - 개선된 카드 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl text-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary))', border: '1px solid var(--border-primary)' }}>
                <div className="text-sm mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('avgBattleTime')}</div>
                <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                  {result.avgDuration.toFixed(1)}<span className="text-sm font-normal">s</span>
                </div>
              </div>
              <div className="p-3 rounded-xl text-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary))', border: '1px solid var(--border-primary)' }}>
                <div className="text-sm mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('totalSimulations')}</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.totalRuns >= 1000 ? `${(result.totalRuns / 1000).toFixed(0)}K` : result.totalRuns}
                </div>
              </div>
              <div className="p-3 rounded-xl text-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary))', border: '1px solid var(--border-primary)' }}>
                <div className="text-sm mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('timeRange')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.minDuration.toFixed(1)}~{result.maxDuration.toFixed(1)}<span className="text-sm font-normal">s</span>
                </div>
              </div>
            </div>

            {/* 히스토그램 */}
            <div className="p-4 rounded-lg space-y-5" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('distribution')}</span>
              </div>

              <Histogram
                data={result.durationDistribution}
                label={t('battleTimeDist')}
                color="var(--accent)"
                unit="s"
                rangeLabels={{ min: result.minDuration, max: result.maxDuration }}
              />

              <Histogram
                data={result.damageDistribution.unit1}
                label={t('totalDamageDist', { name: unit1Stats.name || '' })}
                color="var(--primary-blue)"
              />

              <Histogram
                data={result.damageDistribution.unit2}
                label={t('totalDamageDist', { name: unit2Stats.name || '' })}
                color="var(--primary-red)"
              />
            </div>

            {/* 상세 통계 토글 */}
            <button
              onClick={() => setShowDetailedStats(!showDetailedStats)}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('detailedStats')}</span>
              {showDetailedStats ? (
                <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>

            {showDetailedStats && (
              <div className="p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>{unit1Stats.name}</div>
                    <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div>{t('wins')}: {result.unit1Wins}</div>
                      <div>{t('avgDamage')}: {result.unit1AvgDamage.toFixed(0)}</div>
                      <div>{t('avgSurvivalHp')}: {result.unit1AvgSurvivalHp.toFixed(0)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('draw')}</div>
                    <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div>{result.draws.toLocaleString()}</div>
                      <div>({((result.draws / result.totalRuns) * 100).toFixed(1)}%)</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--primary-red)' }}>{unit2Stats.name}</div>
                    <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div>{t('wins')}: {result.unit2Wins}</div>
                      <div>{t('avgDamage')}: {result.unit2AvgDamage.toFixed(0)}</div>
                      <div>{t('avgSurvivalHp')}: {result.unit2AvgSurvivalHp.toFixed(0)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('battleTimeRange')}: {result.minDuration.toFixed(1)}s ~ {result.maxDuration.toFixed(1)}s
                  </div>
                </div>
              </div>
            )}

            {/* 샘플 전투 로그 */}
            {result.sampleBattles.length > 0 && (
              <div className="p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('sampleBattleLog')}</span>
                  </div>
                  <select
                    value={selectedBattleIndex}
                    onChange={(e) => setSelectedBattleIndex(Number(e.target.value))}
                    className="px-2 py-1 rounded text-sm"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {result.sampleBattles.map((_, i) => (
                      <option key={i} value={i}>{t('battle')} #{i + 1}</option>
                    ))}
                  </select>
                </div>

                {/* HP 타임라인 그래프 */}
                {result.sampleBattles[selectedBattleIndex]?.log && (
                  <div className="pt-2">
                    <div className="text-sm mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('hpTimeline')}</div>
                    <HpTimelineGraph
                      log={result.sampleBattles[selectedBattleIndex].log}
                      unit1Name={unit1Stats.name}
                      unit2Name={unit2Stats.name}
                      unit1MaxHp={unit1Stats.maxHp}
                      unit2MaxHp={unit2Stats.maxHp}
                    />
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.sampleBattles[selectedBattleIndex]?.log.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm py-1 px-2 rounded"
                      style={{
                        background: entry.action === 'death' ? 'rgba(255, 0, 0, 0.1)' : 'transparent'
                      }}
                    >
                      <span className="w-12 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {entry.time.toFixed(1)}s
                      </span>
                      <span
                        className="font-medium"
                        style={{
                          color: entry.actor === unit1Stats.name ? 'var(--primary-blue)' : 'var(--primary-red)'
                        }}
                      >
                        {entry.actor}
                      </span>
                      {entry.action === 'attack' && (
                        <>
                          <span style={{ color: 'var(--text-secondary)' }}>→</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {entry.isMiss ? (
                              <span className="text-yellow-500">MISS</span>
                            ) : (
                              <>
                                {entry.damage}
                                {entry.isCrit && <span className="text-orange-500 ml-1">CRIT!</span>}
                              </>
                            )}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            ({entry.target} HP: {entry.remainingHp?.toFixed(0)})
                          </span>
                        </>
                      )}
                      {entry.action === 'death' && (
                        <span className="text-red-500">{t('death')}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-sm pt-2 border-t" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                  {t('winner')}: <span className="font-medium" style={{
                    color: result.sampleBattles[selectedBattleIndex]?.winner === 'unit1'
                      ? 'var(--primary-blue)'
                      : result.sampleBattles[selectedBattleIndex]?.winner === 'unit2'
                        ? 'var(--primary-red)'
                        : 'var(--text-secondary)'
                  }}>
                    {result.sampleBattles[selectedBattleIndex]?.winner === 'unit1'
                      ? unit1Stats.name
                      : result.sampleBattles[selectedBattleIndex]?.winner === 'unit2'
                        ? unit2Stats.name
                        : t('draw')}
                  </span>
                  {' '}| {t('battleTime')}: {result.sampleBattles[selectedBattleIndex]?.duration.toFixed(1)}s
                </div>
              </div>
            )}

            {/* 치명타/역전 분석 */}
            {result.critStats && result.reversalAnalysis && (
              <div className="p-4 rounded-xl space-y-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: '#e5a440' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('critAnalysis')}</span>
                </div>

                {/* 치명타 통계 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-sm font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>{unit1Stats.name}</div>
                    <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex justify-between">
                        <span>{t('totalCrits')}</span>
                        <span className="font-medium" style={{ color: '#e5a440' }}>{result.critStats.unit1.totalCrits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('totalHits')}</span>
                        <span>{result.critStats.unit1.totalHits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('actualCritRate')}</span>
                        <span className="font-medium" style={{ color: result.critStats.unit1.avgCritRate > (unit1Stats.critRate || 0) ? '#3db88a' : 'var(--text-secondary)' }}>
                          {(result.critStats.unit1.avgCritRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-sm font-medium mb-2" style={{ color: 'var(--primary-red)' }}>{unit2Stats.name}</div>
                    <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex justify-between">
                        <span>{t('totalCrits')}</span>
                        <span className="font-medium" style={{ color: '#e5a440' }}>{result.critStats.unit2.totalCrits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('totalHits')}</span>
                        <span>{result.critStats.unit2.totalHits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('actualCritRate')}</span>
                        <span className="font-medium" style={{ color: result.critStats.unit2.avgCritRate > (unit2Stats.critRate || 0) ? '#3db88a' : 'var(--text-secondary)' }}>
                          {(result.critStats.unit2.avgCritRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 역전 분석 */}
                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{t('reversalAnalysis')}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-primary)' }}>
                      <div className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>{result.reversalAnalysis.unit1Reversals}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{unit1Stats.name} {t('reversalWins')}</div>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-primary)' }}>
                      <div className="text-lg font-bold" style={{ color: 'var(--primary-red)' }}>{result.reversalAnalysis.unit2Reversals}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{unit2Stats.name} {t('reversalWins')}</div>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-primary)' }}>
                      <div className="text-lg font-bold" style={{ color: '#e5a440' }}>{result.reversalAnalysis.critCausedReversals}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('critReversals')}</div>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-primary)' }}>
                      <div className="text-lg font-bold" style={{ color: '#9179f2' }}>{result.reversalAnalysis.closeMatches}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('closeMatches')}</div>
                    </div>
                  </div>
                  {(result.reversalAnalysis.unit1Reversals > 0 || result.reversalAnalysis.unit2Reversals > 0) && (
                    <div className="mt-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                      {t('reversalRate')}: {(((result.reversalAnalysis.unit1Reversals + result.reversalAnalysis.unit2Reversals) / result.totalRuns) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 결과 내보내기 */}
            <div className="flex gap-2">
              <button
                onClick={() => exportResults('json')}
                className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-80"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Download className="w-4 h-4" />
                {t('exportJson')}
              </button>
              <button
                onClick={() => exportResults('csv')}
                className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-80"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Download className="w-4 h-4" />
                {t('exportCsv')}
              </button>
            </div>
          </div>
        )}

        {/* 유닛이 없을 때 안내 (1v1 모드) */}
        {battleMode === '1v1' && units.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('noUnitData')}
            </div>
            <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              {t('noUnitDataDesc')}
            </div>
          </div>
        )}
          </>
        )}

        {/* 팀 전투 모드 UI */}
        {battleMode === 'team' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Team 1 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--primary-blue)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium" style={{ color: 'var(--primary-blue)' }}>Team 1</div>
                    <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: 'var(--primary-blue)20', color: 'var(--primary-blue)' }}>
                      {team1Units.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTeamUnitModal({ isOpen: true, teamNumber: 1, editUnit: null })}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{ background: 'var(--primary-blue)15', color: 'var(--primary-blue)', border: '1.5px solid var(--primary-blue)' }}
                    >
                      <User className="w-3 h-3" />
                      {t('newUnit')}
                    </button>
                    {units.length > 0 && (
                      <UnitPicker
                        units={units.filter(u => !team1Units.find(t => t.id === u.id))}
                        onSelect={(unit) => addToTeam(1, { ...unit, id: `team1_${Date.now()}_${unit.id}` })}
                        color="var(--primary-blue)"
                        buttonText={t('loadFromSheet')}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {team1Units.map((unit, i) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:ring-1 hover:ring-[var(--primary-blue)] transition-all"
                      style={{ background: 'var(--bg-primary)' }}
                      onClick={() => setTeamUnitModal({ isOpen: true, teamNumber: 1, editUnit: unit })}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: 'var(--primary-blue)20', color: 'var(--primary-blue)' }}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{unit.name}</div>
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <span>HP:{unit.maxHp}</span>
                            <span>ATK:{unit.atk}</span>
                            <span>DEF:{unit.def}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromTeam(1, unit.id); }}
                        className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    </div>
                  ))}
                  {team1Units.length === 0 && (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {t('clickNewUnitOrSheet')}
                    </div>
                  )}
                </div>
              </div>

              {/* Team 2 */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '2px solid var(--primary-red)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium" style={{ color: 'var(--primary-red)' }}>Team 2</div>
                    <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: 'var(--primary-red)20', color: 'var(--primary-red)' }}>
                      {team2Units.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTeamUnitModal({ isOpen: true, teamNumber: 2, editUnit: null })}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                      style={{ background: 'var(--primary-red)15', color: 'var(--primary-red)', border: '1.5px solid var(--primary-red)' }}
                    >
                      <User className="w-3 h-3" />
                      {t('newUnit')}
                    </button>
                    {units.length > 0 && (
                      <UnitPicker
                        units={units.filter(u => !team2Units.find(t => t.id === u.id))}
                        onSelect={(unit) => addToTeam(2, { ...unit, id: `team2_${Date.now()}_${unit.id}` })}
                        color="var(--primary-red)"
                        buttonText={t('loadFromSheet')}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {team2Units.map((unit, i) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:ring-1 hover:ring-[var(--primary-red)] transition-all"
                      style={{ background: 'var(--bg-primary)' }}
                      onClick={() => setTeamUnitModal({ isOpen: true, teamNumber: 2, editUnit: unit })}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold" style={{ background: 'var(--primary-red)20', color: 'var(--primary-red)' }}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{unit.name}</div>
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <span>HP:{unit.maxHp}</span>
                            <span>ATK:{unit.atk}</span>
                            <span>DEF:{unit.def}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromTeam(2, unit.id); }}
                        className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    </div>
                  ))}
                  {team2Units.length === 0 && (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {t('clickNewUnitOrSheet')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 타겟팅 모드 선택 */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('targetingMode')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['random', 'lowest_hp', 'highest_atk', 'focused'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setTargetingMode(mode)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: targetingMode === mode ? 'var(--accent)' : 'var(--bg-primary)',
                      color: targetingMode === mode ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {t(`targeting.${mode}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 팀 전투 실행 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={runTeamSimulation}
                disabled={team1Units.length === 0 || team2Units.length === 0 || isRunning}
                className="flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{
                  background: isRunning ? 'var(--bg-tertiary)' : 'var(--accent)',
                  color: isRunning ? 'var(--text-secondary)' : 'white'
                }}
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('running')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {t('runTeamSimulation')}
                  </>
                )}
              </button>
              <select
                value={runs}
                onChange={(e) => setRuns(Number(e.target.value))}
                disabled={isRunning}
                className="px-3 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1K</option>
                <option value={5000}>5K</option>
              </select>
            </div>

            {/* 팀 전투 결과 */}
            {teamResult && (
              <div className="space-y-4">
                {/* 승률 */}
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('teamWinRate')}</div>
                    <div className="text-sm px-2 py-1 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      {teamResult.totalRuns.toLocaleString()}전
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium" style={{ color: 'var(--primary-blue)' }}>Team 1 ({team1Units.length}명)</span>
                        <span className="px-2 py-0.5 rounded" style={{ background: 'var(--primary-blue)15', color: 'var(--primary-blue)' }}>
                          {teamResult.team1Wins.toLocaleString()}승
                        </span>
                      </div>
                      <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                        <div
                          className="absolute h-full transition-all"
                          style={{
                            width: `${teamResult.team1WinRate * 100}%`,
                            background: 'var(--primary-blue)'
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-primary)', textShadow: '0 0 4px var(--bg-primary)' }}>
                          {(teamResult.team1WinRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium" style={{ color: 'var(--primary-red)' }}>Team 2 ({team2Units.length}명)</span>
                        <span className="px-2 py-0.5 rounded" style={{ background: 'var(--primary-red)15', color: 'var(--primary-red)' }}>
                          {teamResult.team2Wins.toLocaleString()}승
                        </span>
                      </div>
                      <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                        <div
                          className="absolute h-full transition-all"
                          style={{
                            width: `${teamResult.team2WinRate * 100}%`,
                            background: 'var(--primary-red)'
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-primary)', textShadow: '0 0 4px var(--bg-primary)' }}>
                          {(teamResult.team2WinRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {teamResult.draws > 0 && (
                      <div className="flex items-center justify-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {t('draw')}: {teamResult.draws.toLocaleString()} ({((teamResult.draws / teamResult.totalRuns) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 통계 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                    <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('avgBattleTime')}</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                      {teamResult.avgDuration.toFixed(1)}s
                    </div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                    <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('avgSurvivors')} (T1)</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                      {teamResult.avgTeam1Survivors.toFixed(1)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                    <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{t('avgSurvivors')} (T2)</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--primary-red)' }}>
                      {teamResult.avgTeam2Survivors.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 유닛이 없을 때 안내 (팀 모드) - 직접 추가 가능하므로 숨김 */}
          </>
        )}
      </div>

      {/* 팀 유닛 편집 모달 */}
      <TeamUnitModal
        isOpen={teamUnitModal.isOpen}
        onClose={() => setTeamUnitModal({ isOpen: false, teamNumber: 1, editUnit: null })}
        onSave={(unit) => updateTeamUnit(teamUnitModal.teamNumber, unit)}
        unit={teamUnitModal.editUnit}
        teamNumber={teamUnitModal.teamNumber}
        units={units}
        onLoadFromSheet={(unit) => {
          setTeamUnitModal(prev => ({
            ...prev,
            editUnit: { ...unit, id: `team${prev.teamNumber}_${Date.now()}` }
          }));
        }}
      />
    </div>
  );
}
