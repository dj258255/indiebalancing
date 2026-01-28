'use client';

import { useState, useMemo } from 'react';
import { X, TrendingUp, GitBranch, Target, AlertTriangle, BarChart2, HelpCircle, Maximize2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';

const PANEL_COLOR = '#6366f1';

// 커스텀 스크롤바 스타일
const customScrollStyle = `
  .custom-tab-scroll::-webkit-scrollbar {
    height: 3px;
  }
  .custom-tab-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-tab-scroll::-webkit-scrollbar-thumb {
    background: var(--border-secondary);
    border-radius: 3px;
  }
  .custom-tab-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
  }
  .custom-tab-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--border-secondary) transparent;
  }
`;
import { useProjectStore } from '@/stores/projectStore';
import type { UnitStats } from '@/lib/simulation/types';
import {
  calculateMatchupMatrix,
  analyzePerfectImbalance,
  analyzePowerCurve,
  analyzeCorrelations,
  detectDeadZones,
  analyzeDiminishingReturns,
  generateBalanceCurve,
  type PerfectImbalanceResult,
  type PowerCurveAnalysis,
  type CorrelationResult,
} from '@/lib/balanceAnalysis';

interface BalanceAnalysisPanelProps {
  onClose: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

type AnalysisTab = 'matchup' | 'power' | 'correlation' | 'deadzone' | 'curve';

export default function BalanceAnalysisPanel({ onClose, showHelp: externalShowHelp, setShowHelp: externalSetShowHelp }: BalanceAnalysisPanelProps) {
  // ESC 키로 패널 닫기
  useEscapeKey(onClose);

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
    const levelCol = columns.find(c => c.name.toLowerCase() === 'level' || c.name.includes('레벨'));

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
      // 비동기로 실행 (UI 블로킹 방지)
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

  const tabs: { id: AnalysisTab; label: string; icon: React.ReactNode; tooltip: string; color: string }[] = [
    { id: 'matchup', label: '상성 분석', icon: <GitBranch className="w-4 h-4" />, tooltip: '가위바위보 상성 관계 분석', color: '#6366f1' },
    { id: 'power', label: '파워 커브', icon: <TrendingUp className="w-4 h-4" />, tooltip: '레벨별 스탯 성장 패턴 분석', color: '#22c55e' },
    { id: 'correlation', label: '상관관계', icon: <BarChart2 className="w-4 h-4" />, tooltip: '스탯 간 상관계수 분석', color: '#3b82f6' },
    { id: 'deadzone', label: '데드존', icon: <AlertTriangle className="w-4 h-4" />, tooltip: '활용되지 않는 스탯 구간 탐지', color: '#f59e0b' },
    { id: 'curve', label: '커브 생성', icon: <Target className="w-4 h-4" />, tooltip: '밸런스 곡선 자동 생성', color: '#8b5cf6' },
  ];

  // 승률 매트릭스 색상 함수 (모달과 공유)
  const getMatrixColor = (rate: number, isSelf: boolean) => {
    if (isSelf) return { bg: 'var(--bg-primary)', text: 'var(--text-tertiary)' };

    // 우세 (부드러운 민트/청록)
    if (rate >= 0.7) return { bg: '#6ec9b8', text: '#1a4a42' }; // 진한 민트
    if (rate >= 0.6) return { bg: '#9edcd0', text: '#1a4a42' }; // 중간 민트
    if (rate >= 0.55) return { bg: '#c8ebe4', text: '#2d635a' }; // 연한 민트
    // 열세 (부드러운 코랄/살구)
    if (rate <= 0.3) return { bg: '#d4908f', text: '#4a2020' }; // 진한 코랄
    if (rate <= 0.4) return { bg: '#e8b8b7', text: '#5c2d2d' }; // 중간 코랄
    if (rate <= 0.45) return { bg: '#f5d9d8', text: '#6b3a3a' }; // 연한 코랄
    return { bg: 'var(--bg-primary)', text: 'var(--text-primary)' }; // 균형 (45-55%)
  };

  return (
    <div className="flex flex-col h-full">
      <style>{customScrollStyle}</style>

      {/* 전체화면 모달 */}
      {showMatrixModal && matchupResult && (() => {
        const unitCount = matchupResult.matrix.units.length;

        return (
          <div
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowMatrixModal(false)}
          >
            <div
              className="glass-panel overflow-hidden flex flex-col w-full sm:w-[90vw] h-[95vh] sm:h-[90vh] rounded-t-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="glass-panel-header flex items-center justify-between px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>승률 매트릭스</h2>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>행 유닛이 열 유닛을 상대로 한 승률</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded" style={{ background: '#e8a9a9' }} />
                      <span>열세</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded" style={{ background: '#d1d5db' }} />
                      <span>균형</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded" style={{ background: '#a8d8c8' }} />
                      <span>우세</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMatrixModal(false)}
                    className="glass-button p-2 rounded-lg"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 모달 내용 - 그리드로 화면 전체 활용 */}
              <div className="flex-1 p-6 overflow-hidden flex items-center justify-center">
                <div
                  className="grid w-full h-full"
                  style={{
                    gridTemplateColumns: `100px repeat(${unitCount}, 1fr)`,
                    gridTemplateRows: `48px repeat(${unitCount}, 1fr)`,
                    gap: '2px',
                  }}
                >
                  {/* 좌상단 vs 셀 */}
                  <div
                    className="flex items-center justify-center rounded-tl-lg"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>vs</span>
                  </div>

                  {/* 헤더 행 */}
                  {matchupResult.matrix.units.map((u, idx) => (
                    <div
                      key={`header-${u}`}
                      className={`flex items-center justify-center ${idx === unitCount - 1 ? 'rounded-tr-lg' : ''}`}
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <span
                        className="text-sm font-medium truncate px-2"
                        style={{ color: 'var(--text-secondary)' }}
                        title={u}
                      >
                        {u}
                      </span>
                    </div>
                  ))}

                  {/* 데이터 행들 */}
                  {matchupResult.matrix.units.map((u, i) => (
                    <>
                      {/* 행 라벨 */}
                      <div
                        key={`label-${u}`}
                        className={`flex items-center px-3 ${i === unitCount - 1 ? 'rounded-bl-lg' : ''}`}
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-secondary)' }}
                          title={u}
                        >
                          {u}
                        </span>
                      </div>

                      {/* 데이터 셀들 */}
                      {matchupResult.matrix.winRates[i].map((rate, j) => {
                        const colors = getMatrixColor(rate, i === j);
                        const isLastRow = i === unitCount - 1;
                        const isLastCol = j === unitCount - 1;

                        return (
                          <div
                            key={`cell-${i}-${j}`}
                            className={`flex items-center justify-center transition-all hover:scale-105 hover:z-10 hover:shadow-lg cursor-default ${isLastRow && isLastCol ? 'rounded-br-lg' : ''}`}
                            style={{
                              background: colors.bg,
                              color: colors.text,
                            }}
                            title={i === j ? '자기 자신' : `${u} vs ${matchupResult.matrix.units[j]}: ${(rate * 100).toFixed(1)}%`}
                          >
                            <span className="text-base font-semibold">
                              {i === j ? '-' : `${(rate * 100).toFixed(0)}%`}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 분석 유형 선택 드롭다운 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="relative flex-1">
          <button
            onClick={() => setShowTabDropdown(!showTabDropdown)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{
              background: `${tabs.find(t => t.id === activeTab)?.color}15`,
              color: tabs.find(t => t.id === activeTab)?.color,
              border: `1px solid ${tabs.find(t => t.id === activeTab)?.color}40`
            }}
          >
            {(() => {
              const currentTab = tabs.find(t => t.id === activeTab);
              return (
                <>
                  <span style={{ color: currentTab?.color }}>{currentTab?.icon}</span>
                  <span className="text-sm font-medium flex-1" style={{ color: currentTab?.color }}>{currentTab?.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{currentTab?.tooltip}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 ml-1", showTabDropdown && "rotate-180")} style={{ color: 'var(--text-tertiary)' }} />
                </>
              );
            })()}
          </button>
          {showTabDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTabDropdown(false)} />
              <div className="absolute left-0 right-0 top-full mt-1 glass-panel rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-1">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowTabDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors"
                        style={{
                          background: isActive ? `${tab.color}15` : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: `${tab.color}20` }}
                        >
                          <span style={{ color: tab.color }}>{tab.icon}</span>
                        </div>
                        <span className="text-sm font-medium" style={{ color: isActive ? tab.color : 'var(--text-primary)' }}>
                          {tab.label}
                        </span>
                        <span className="text-xs flex-1 text-right" style={{ color: 'var(--text-tertiary)' }}>
                          {tab.tooltip}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* 도움말 패널 */}
        {showHelp && (
          <div className="mb-4 glass-card p-3 rounded-lg animate-slideDown">
            <div className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>밸런스 분석 도구</div>
            <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>시트 데이터를 기반으로 심층적인 패턴 분석을 수행합니다.</p>

            <div className="space-y-3">
              {/* 상성 분석 */}
              <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #6366f1' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <GitBranch className="w-4 h-4" style={{ color: '#6366f1' }} />
                  <span className="font-semibold text-sm" style={{ color: '#6366f1' }}>상성 분석</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>유닛 간 1:1 전투 시뮬레이션으로 승률 매트릭스 생성</p>
                <div className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  <div>- 필요 컬럼: name, hp, atk, def, speed</div>
                  <div>- 결과: 승률표, OP/약캐 감지, 가위바위보 순환 탐지</div>
                </div>
              </div>

              {/* 파워 커브 */}
              <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #22c55e' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-4 h-4" style={{ color: '#22c55e' }} />
                  <span className="font-semibold text-sm" style={{ color: '#22c55e' }}>파워 커브</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>레벨별 파워가 어떤 패턴으로 성장하는지 분석</p>
                <div className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  <div>- 필요 컬럼: level + 스탯들</div>
                  <div>- 결과: 선형/지수/로그 타입, 이상치 감지</div>
                </div>
              </div>

              {/* 상관관계 */}
              <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #3b82f6' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <BarChart2 className="w-4 h-4" style={{ color: '#3b82f6' }} />
                  <span className="font-semibold text-sm" style={{ color: '#3b82f6' }}>상관관계</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>스탯 간 상관계수 분석 (HP-DEF 등)</p>
                <div className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  <div>- 필요: 3개 이상 유닛</div>
                  <div>- 결과: 강한 상관(-1~1), 밸런스 의도 확인</div>
                </div>
              </div>

              {/* 데드존 */}
              <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #f59e0b' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />
                  <span className="font-semibold text-sm" style={{ color: '#f59e0b' }}>데드존</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>사용되지 않는 스탯 구간 자동 탐지</p>
                <div className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  <div>- 자동 분석 (버튼 없음)</div>
                  <div>- 결과: 비어있는 구간, 밀집/분산 경고</div>
                </div>
              </div>

              {/* 커브 생성 */}
              <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #8b5cf6' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                  <span className="font-semibold text-sm" style={{ color: '#8b5cf6' }}>커브 생성</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>레벨별 스탯 성장표를 자동 생성</p>
                <div className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  <div>- 입력: 기본스탯, 최대레벨, 성장률, 타입</div>
                  <div>- 결과: 복사해서 시트에 붙여넣기 가능</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matchup' && (
          <div className="space-y-4">
            {/* 탭 설명 */}
            <div className="glass-section p-3 rounded-lg" style={{ borderLeft: `3px solid ${PANEL_COLOR}` }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>상성 분석 (Perfect Imbalance)</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>모든 유닛 조합의 전투를 시뮬레이션하여 상성 관계와 밸런스를 분석합니다. 지배적/약한 유닛과 가위바위보 순환 관계를 탐지합니다.</div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  매치당 시뮬레이션 횟수
                </label>
                <select
                  value={runsPerMatch}
                  onChange={(e) => setRunsPerMatch(Number(e.target.value))}
                  className="glass-select w-full mt-1 px-2 py-1.5 rounded text-sm"
                >
                  <option value={20}>20회 (빠름)</option>
                  <option value={50}>50회 (균형)</option>
                  <option value={100}>100회 (정확)</option>
                </select>
              </div>
              <button
                onClick={runMatchupAnalysis}
                disabled={isAnalyzing || units.length < 2}
                className="glass-button-primary px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: PANEL_COLOR }}
              >
                {isAnalyzing ? '분석 중...' : '분석 실행'}
              </button>
            </div>

            {matchupResult && (
              <div className="space-y-4">
                {/* 밸런스 점수 - 개선된 카드 */}
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        밸런스 점수
                      </span>
                      <span className="glass-badge text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: matchupResult.balanceScore >= 70
                          ? 'rgba(34, 197, 94, 0.15)'
                          : matchupResult.balanceScore >= 40
                            ? 'rgba(251, 191, 36, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color: matchupResult.balanceScore >= 70
                          ? '#16a34a'
                          : matchupResult.balanceScore >= 40
                            ? '#d97706'
                            : '#dc2626'
                      }}>
                        {matchupResult.balanceScore >= 70 ? '양호' : matchupResult.balanceScore >= 40 ? '주의' : '위험'}
                      </span>
                    </div>
                    <div className="flex items-end gap-3">
                      <span
                        className="text-4xl font-bold"
                        style={{
                          color: matchupResult.balanceScore >= 70
                            ? '#16a34a'
                            : matchupResult.balanceScore >= 40
                              ? '#d97706'
                              : '#dc2626'
                        }}
                      >
                        {matchupResult.balanceScore.toFixed(0)}
                      </span>
                      <span className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>/ 100</span>
                    </div>
                    <div className="glass-progress mt-3 h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${matchupResult.balanceScore}%`,
                          background: matchupResult.balanceScore >= 70
                            ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                            : matchupResult.balanceScore >= 40
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : 'linear-gradient(90deg, #ef4444, #f87171)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 지배적/약한 유닛 - 개선된 카드 */}
                {(matchupResult.dominantUnits.length > 0 || matchupResult.weakUnits.length > 0) && (
                  <div className="glass-card rounded-xl overflow-hidden">
                    {matchupResult.dominantUnits.length > 0 && (
                      <div className="p-4" style={{ background: 'rgba(239, 68, 68, 0.05)', borderBottom: matchupResult.weakUnits.length > 0 ? '1px solid var(--border-primary)' : 'none' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                            <AlertTriangle className="w-3 h-3" style={{ color: '#dc2626' }} />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>
                            지배적 유닛 (OP) - 너프 고려
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {matchupResult.dominantUnits.map(u => (
                            <span key={u} className="glass-badge px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {matchupResult.weakUnits.length > 0 && (
                      <div className="p-4" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                            <TrendingUp className="w-3 h-3 rotate-180" style={{ color: '#2563eb' }} />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: '#2563eb' }}>
                            약한 유닛 - 버프 고려
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {matchupResult.weakUnits.map(u => (
                            <span key={u} className="glass-badge px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 가위바위보 순환 - 개선된 카드 */}
                {matchupResult.cycles.length > 0 && (
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="p-4" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                          <GitBranch className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: '#7c3aed' }}>
                            Perfect Imbalance 감지
                          </div>
                          <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            가위바위보처럼 순환하는 상성 관계
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {matchupResult.cycles.slice(0, 5).map((cycle, i) => (
                          <div key={i} className="glass-section flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed' }}>
                              {i + 1}
                            </span>
                            {cycle.map((unit, j) => (
                              <span key={j} className="flex items-center gap-1.5">
                                <span>{unit}</span>
                                {j < cycle.length - 1 && <span style={{ color: '#7c3aed' }}>→</span>}
                              </span>
                            ))}
                            <span style={{ color: '#7c3aed' }}>→ {cycle[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 승률 매트릭스 */}
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      승률 매트릭스
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ background: '#e8a9a9' }} />
                        <span>열세</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ background: '#d1d5db' }} />
                        <span>균형</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ background: '#a8d8c8' }} />
                        <span>우세</span>
                      </div>
                      <button
                        onClick={() => setShowMatrixModal(true)}
                        className="glass-button p-1 rounded"
                        title="전체화면으로 보기"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      {/* 헤더 */}
                      <div className="flex">
                        <div className="w-20 h-10 flex items-center justify-center shrink-0" style={{ background: 'var(--bg-secondary)' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>vs</span>
                        </div>
                        {matchupResult.matrix.units.map((u, idx) => (
                          <div
                            key={u}
                            className="w-14 h-10 flex items-center justify-center shrink-0 border-l"
                            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                          >
                            <span className="text-xs font-medium truncate px-1" style={{ color: 'var(--text-secondary)' }} title={u}>
                              {u.length > 5 ? u.slice(0, 4) + '..' : u}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* 행들 */}
                      {matchupResult.matrix.units.map((u, i) => (
                        <div key={u} className="flex border-t" style={{ borderColor: 'var(--border-primary)' }}>
                          <div className="w-20 h-10 flex items-center px-2 shrink-0" style={{ background: 'var(--bg-secondary)' }}>
                            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }} title={u}>
                              {u.length > 8 ? u.slice(0, 7) + '..' : u}
                            </span>
                          </div>
                          {matchupResult.matrix.winRates[i].map((rate, j) => {
                            const colors = getMatrixColor(rate, i === j);

                            return (
                              <div
                                key={j}
                                className="w-14 h-10 flex items-center justify-center shrink-0 border-l transition-all hover:scale-105 hover:z-10 hover:shadow-lg cursor-default"
                                style={{
                                  background: colors.bg,
                                  color: colors.text,
                                  borderColor: 'var(--border-primary)',
                                }}
                                title={i === j ? '자기 자신' : `${u} vs ${matchupResult.matrix.units[j]}: ${(rate * 100).toFixed(1)}%`}
                              >
                                <span className="text-xs font-medium">
                                  {i === j ? '-' : `${(rate * 100).toFixed(0)}%`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 범례 설명 */}
                  <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                    행 유닛이 열 유닛을 상대로 한 승률입니다. 70% 이상은 강한 카운터 관계를 의미합니다.
                  </div>
                </div>
              </div>
            )}

            {units.length < 2 && (
              <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                최소 2개 이상의 유닛이 필요합니다.
              </div>
            )}
          </div>
        )}

        {activeTab === 'power' && (
          <div className="space-y-4">
            {/* 탭 설명 */}
            <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #22c55e' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>파워 커브 분석</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>레벨별 스탯 성장이 선형/지수/로그 중 어떤 패턴인지 분석합니다. R² 값으로 피팅 정확도를 확인하세요. <strong style={{ color: '#22c55e' }}>level 컬럼 필수</strong></div>
            </div>

            <button
              onClick={runPowerAnalysis}
              disabled={units.length < 2}
              className="glass-button-primary w-full px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#10b981' }}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" />
                파워 커브 분석
              </div>
            </button>

            {powerResult && (
              <div className="space-y-4">
                {/* 커브 타입 카드 */}
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="grid grid-cols-2">
                    <div className="glass-stat p-4 text-center" style={{ borderRight: '1px solid var(--border-primary)' }}>
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>커브 타입</div>
                      <div className="text-xl font-bold" style={{ color: '#10b981' }}>
                        {powerResult.curveType === 'linear' ? '선형' :
                          powerResult.curveType === 'exponential' ? '지수' : '로그'}
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {powerResult.curveType === 'linear' ? '일정한 성장' :
                          powerResult.curveType === 'exponential' ? '후반 급성장' : '초반 급성장'}
                      </div>
                    </div>
                    <div className="glass-stat p-4 text-center">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>피팅 정확도</div>
                      <div className="text-xl font-bold" style={{ color: powerResult.r2 >= 0.9 ? '#16a34a' : powerResult.r2 >= 0.7 ? '#d97706' : '#dc2626' }}>
                        {(powerResult.r2 * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        R² = {powerResult.r2.toFixed(3)}
                      </div>
                    </div>
                  </div>
                  <div className="glass-divider px-4 py-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>수식</div>
                    <div className="glass-section text-xs font-mono px-2 py-1.5 rounded" style={{ color: 'var(--text-secondary)' }}>
                      {powerResult.formula}
                    </div>
                  </div>
                </div>

                {/* 이상치 감지 */}
                {powerResult.outliers.length > 0 && (
                  <div className="glass-card rounded-xl overflow-hidden" style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(251, 191, 36, 0.08)' }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                        <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#d97706' }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#d97706' }}>파워 이상치 감지</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {powerResult.outliers.map((o, i) => (
                        <div key={i} className="glass-section flex items-center justify-between p-2.5 rounded-lg text-xs">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>레벨 {o.level}</span>
                          <div className="flex items-center gap-3">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              실제: <strong>{o.power.toFixed(0)}</strong>
                            </span>
                            <span style={{ color: 'var(--text-tertiary)' }}>
                              예상: {o.expectedPower?.toFixed(0)}
                            </span>
                            <span className="glass-badge px-2 py-0.5 rounded-full font-medium" style={{
                              background: (o.deviation ?? 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                              color: (o.deviation ?? 0) > 0 ? '#dc2626' : '#2563eb'
                            }}>
                              {(o.deviation ?? 0) > 0 ? '+' : ''}{o.deviation?.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 권장사항 */}
                {powerResult.recommendations.length > 0 && (
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="glass-panel-header px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>권장사항</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {powerResult.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            {i + 1}
                          </span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'correlation' && (
          <div className="space-y-4">
            {/* 탭 설명 */}
            <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #3b82f6' }}>
              <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>스탯 상관관계 분석</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                스탯 간의 통계적 연관성을 분석합니다. <strong style={{ color: '#22c55e' }}>+1에 가까우면 양의 상관</strong>(함께 증가), <strong style={{ color: '#ef4444' }}>-1에 가까우면 음의 상관</strong>(반대로 변화)입니다.
              </div>
              <div className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                <strong>사용법:</strong> 분석 버튼을 클릭하면 모든 스탯 쌍의 상관계수를 계산합니다. 강한 상관관계(|r| &gt; 0.7)가 있으면 스탯 설계를 재검토하세요.
              </div>
            </div>

            <button
              onClick={runCorrelationAnalysis}
              disabled={units.length < 3}
              className="glass-button-primary w-full px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#3b82f6' }}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart2 className="w-4 h-4" />
                상관관계 분석
              </div>
            </button>

            {correlationResult && (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="glass-panel-header px-4 py-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>스탯 상관관계</span>
                </div>
                <div>
                  {correlationResult.map((r, i) => {
                    const absCorr = Math.abs(r.correlation);
                    const isPositive = r.correlation > 0;
                    const strengthConfig = {
                      strong: { label: '강함', bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
                      moderate: { label: '중간', bg: 'rgba(251, 191, 36, 0.12)', color: '#d97706' },
                      weak: { label: '약함', bg: 'rgba(156, 163, 175, 0.15)', color: 'var(--text-tertiary)' },
                      none: { label: '없음', bg: 'rgba(156, 163, 175, 0.1)', color: 'var(--text-tertiary)' },
                    };
                    const config = strengthConfig[r.strength];

                    return (
                      <div key={i} className="p-3" style={{ borderBottom: i < correlationResult.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {r.stat1}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>↔</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {r.stat2}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="glass-badge text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: config.bg, color: config.color }}
                            >
                              {config.label}
                            </span>
                            <span
                              className="text-sm font-mono font-bold w-12 text-right"
                              style={{ color: isPositive ? '#16a34a' : '#dc2626' }}
                            >
                              {isPositive ? '+' : ''}{r.correlation.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {/* 상관관계 바 */}
                        <div className="glass-progress h-2 rounded-full overflow-hidden flex">
                          <div className="w-1/2 flex justify-end">
                            {!isPositive && (
                              <div
                                className="h-full rounded-l-full transition-all"
                                style={{
                                  width: `${absCorr * 100}%`,
                                  background: 'linear-gradient(270deg, #f87171, #fca5a5)'
                                }}
                              />
                            )}
                          </div>
                          <div className="w-px" style={{ background: 'var(--border-secondary)' }} />
                          <div className="w-1/2">
                            {isPositive && (
                              <div
                                className="h-full rounded-r-full transition-all"
                                style={{
                                  width: `${absCorr * 100}%`,
                                  background: 'linear-gradient(90deg, #4ade80, #86efac)'
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {units.length < 3 && (
              <div className="glass-card text-center py-8 rounded-xl">
                <BarChart2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  최소 3개 이상의 유닛이 필요합니다
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'deadzone' && (
          <div className="space-y-4">
            {/* 탭 설명 */}
            <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>데드존 탐지</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                활용되지 않는 스탯 구간(데드존)을 탐지합니다. 유닛들이 특정 구간에만 몰려있거나 빈 구간이 있으면 밸런스 문제일 수 있습니다.
              </div>
              <div className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                <strong>사용법:</strong> 각 스탯별로 분포 상태를 자동 분석합니다. 경고가 표시된 스탯은 값 범위를 재조정하거나 중간 구간의 유닛을 추가하세요.
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              {['hp', 'atk', 'def', 'speed'].map((stat, idx) => {
                const deadZones = detectDeadZones(units, stat as keyof UnitStats);
                const hasIssue = deadZones.length > 0;
                const statLabels: Record<string, string> = {
                  hp: 'HP (체력)',
                  atk: 'ATK (공격력)',
                  def: 'DEF (방어력)',
                  speed: 'SPEED (속도)'
                };

                return (
                  <div
                    key={stat}
                    className="p-4"
                    style={{
                      background: hasIssue ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                      borderBottom: idx < 3 ? '1px solid var(--border-primary)' : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {statLabels[stat]}
                        </span>
                      </div>
                      {hasIssue ? (
                        <span className="glass-badge flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                          <AlertTriangle className="w-3 h-3" />
                          {deadZones.length}개 이슈
                        </span>
                      ) : (
                        <span className="glass-badge text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>
                          정상
                        </span>
                      )}
                    </div>
                    {hasIssue ? (
                      <div className="space-y-1.5 mt-2">
                        {deadZones.map((dz, i) => (
                          <div key={i} className="glass-section flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#d97706' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{dz.reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        스탯 분포가 적절합니다
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'curve' && (
          <div className="space-y-4">
            {/* 탭 설명 */}
            <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #8b5cf6' }}>
              <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>밸런스 커브 생성</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                레벨별 스탯 성장 곡선을 자동으로 생성합니다. 선형, 지수, 로그 등 다양한 성장 패턴을 지원합니다.
              </div>
              <div className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                <strong>사용법:</strong> 기본 스탯, 최대 레벨, 성장률을 입력하고 성장 타입을 선택하세요. 생성된 테이블을 복사하여 스프레드시트에 붙여넣을 수 있습니다.
              </div>
            </div>

            <CurveGenerator />
          </div>
        )}
      </div>
    </div>
  );
}

// 밸런스 커브 생성기 컴포넌트
function CurveGenerator() {
  const [baseHp, setBaseHp] = useState(100);
  const [baseAtk, setBaseAtk] = useState(10);
  const [baseDef, setBaseDef] = useState(5);
  const [baseSpeed, setBaseSpeed] = useState(1);
  const [maxLevel, setMaxLevel] = useState(10);
  const [growthRate, setGrowthRate] = useState(0.1);
  const [growthType, setGrowthType] = useState<'linear' | 'exponential' | 'logarithmic'>('linear');
  const [curve, setCurve] = useState<ReturnType<typeof generateBalanceCurve> | null>(null);

  const generate = () => {
    const result = generateBalanceCurve(
      { hp: baseHp, atk: baseAtk, def: baseDef, speed: baseSpeed },
      maxLevel,
      growthType,
      growthRate
    );
    setCurve(result);
  };

  return (
    <div className="space-y-4">
      {/* 기본 스탯 입력 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="glass-panel-header px-4 py-2.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>기본 스탯 (레벨 1)</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>HP</label>
            <input
              type="number"
              value={baseHp}
              onChange={(e) => setBaseHp(Number(e.target.value))}
              className="glass-input w-full mt-1 px-3 py-2 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>ATK</label>
            <input
              type="number"
              value={baseAtk}
              onChange={(e) => setBaseAtk(Number(e.target.value))}
              className="glass-input w-full mt-1 px-3 py-2 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>DEF</label>
            <input
              type="number"
              value={baseDef}
              onChange={(e) => setBaseDef(Number(e.target.value))}
              className="glass-input w-full mt-1 px-3 py-2 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Speed</label>
            <input
              type="number"
              value={baseSpeed}
              onChange={(e) => setBaseSpeed(Number(e.target.value))}
              className="glass-input w-full mt-1 px-3 py-2 rounded-lg text-sm"
              step={0.1}
            />
          </div>
        </div>
      </div>

      {/* 성장 설정 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="glass-panel-header px-4 py-2.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>성장 설정</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>최대 레벨</label>
              <input
                type="number"
                value={maxLevel}
                onChange={(e) => setMaxLevel(Number(e.target.value))}
                className="glass-input w-full mt-1 px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>레벨당 성장률</label>
              <input
                type="number"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                className="glass-input w-full mt-1 px-3 py-2 rounded-lg text-sm"
                step={0.05}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>성장 타입</label>
            <div className="glass-tabs grid grid-cols-3 gap-2 mt-1 p-1 rounded-lg">
              {[
                { value: 'linear', label: '선형', desc: '일정한 성장' },
                { value: 'exponential', label: '지수', desc: '후반 급성장' },
                { value: 'logarithmic', label: '로그', desc: '초반 급성장' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGrowthType(opt.value as typeof growthType)}
                  className="p-2.5 rounded-lg text-center transition-all"
                  style={{
                    background: growthType === opt.value ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                    border: growthType === opt.value ? '1px solid #8b5cf6' : '1px solid transparent',
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color: growthType === opt.value ? '#8b5cf6' : 'var(--text-primary)' }}>
                    {opt.label}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        className="glass-button-primary w-full px-4 py-2.5 rounded-lg text-sm font-medium"
        style={{ background: '#8b5cf6' }}
      >
        <div className="flex items-center justify-center gap-2">
          <Target className="w-4 h-4" />
          커브 생성
        </div>
      </button>

      {curve && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="glass-panel-header px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>생성된 성장표</span>
            <span className="glass-badge text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              {curve.levels.length} 레벨
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="glass-section">
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Lv</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#ef4444' }}>HP</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#f59e0b' }}>ATK</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#3b82f6' }}>DEF</th>
                  <th className="px-3 py-2 text-right font-semibold" style={{ color: '#10b981' }}>SPD</th>
                </tr>
              </thead>
              <tbody>
                {curve.levels.map((level, i) => (
                  <tr key={level} className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{level}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.hp[i]}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.atk[i]}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.def[i]}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{curve.stats.speed[i].toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
