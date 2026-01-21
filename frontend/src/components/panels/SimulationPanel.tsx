'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Play, Settings, BarChart3, Clock, Swords, Heart, Shield, Zap, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { UnitStats, SimulationResult, BattleConfig, DefenseFormulaType, ArmorPenetrationConfig } from '@/lib/simulation/types';
import { runMonteCarloSimulationAsync } from '@/lib/simulation/monteCarloSimulator';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface SimulationPanelProps {
  onClose: () => void;
}

// 히스토그램 컴포넌트
function Histogram({ data, label, color }: { data: number[]; label: string; color: string }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="flex items-end gap-0.5 h-16">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all"
            style={{
              height: max > 0 ? `${(value / max) * 100}%` : '0%',
              background: color,
              minHeight: value > 0 ? '2px' : '0'
            }}
            title={`${value}회`}
          />
        ))}
      </div>
    </div>
  );
}

// 신뢰구간 표시
function ConfidenceBar({ winRate, confidence, color }: {
  winRate: number;
  confidence: { lower: number; upper: number };
  color: string;
}) {
  return (
    <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
      {/* 신뢰구간 범위 */}
      <div
        className="absolute h-full opacity-30"
        style={{
          left: `${confidence.lower * 100}%`,
          width: `${(confidence.upper - confidence.lower) * 100}%`,
          background: color
        }}
      />
      {/* 실제 승률 */}
      <div
        className="absolute h-full"
        style={{
          width: `${winRate * 100}%`,
          background: color
        }}
      />
      {/* 승률 텍스트 */}
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {(winRate * 100).toFixed(1)}%
      </div>
    </div>
  );
}

export default function SimulationPanel({ onClose }: SimulationPanelProps) {
  // ESC 키로 패널 닫기
  useEscapeKey(onClose);

  const { projects, currentProjectId, currentSheetId } = useProjectStore();

  // 현재 시트 데이터
  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentSheet = currentProject?.sheets.find(s => s.id === currentSheetId);

  // 상태
  const [unit1Id, setUnit1Id] = useState<string>('');
  const [unit2Id, setUnit2Id] = useState<string>('');
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

  // 시트에서 유닛 목록 추출
  const units = useMemo(() => {
    if (!currentSheet) return [];

    const sheetName = currentSheet.name;
    // 컬럼에서 필요한 스탯 찾기
    const columns = currentSheet.columns;
    // 이름 컬럼: '이름', 'name' 등 명시적으로 찾기 (폴백 없음)
    const nameCol = columns.find(c =>
      c.name.toLowerCase() === 'name' ||
      c.name === '이름' ||
      c.name.toLowerCase().includes('name') ||
      c.name.includes('이름')
    );
    const hpCol = columns.find(c => c.name.toLowerCase() === 'hp' || c.name.toLowerCase() === 'maxhp' || c.name.includes('체력'));
    const atkCol = columns.find(c => c.name.toLowerCase() === 'atk' || c.name.toLowerCase() === 'attack' || c.name.includes('공격력'));
    const defCol = columns.find(c => c.name.toLowerCase() === 'def' || c.name.toLowerCase() === 'defense' || c.name.includes('방어력'));
    const speedCol = columns.find(c => c.name.toLowerCase() === 'speed' || c.name.includes('속도'));
    const critRateCol = columns.find(c => c.name.toLowerCase().includes('crit') && c.name.toLowerCase().includes('rate') || c.name.includes('치명타율'));
    const critDmgCol = columns.find(c => c.name.toLowerCase().includes('crit') && c.name.toLowerCase().includes('dmg') || c.name.includes('치명타피해'));

    return currentSheet.rows.map((row, index) => {
      // 이름 추출: nameCol이 있으면 그 값, 없으면 시트명 + 행번호
      const rowNumber = index + 1;
      let displayName: string;

      if (nameCol) {
        const rawName = row.cells[nameCol.id];
        if (rawName !== null && rawName !== undefined && String(rawName).trim() !== '') {
          displayName = String(rawName);
        } else {
          displayName = `${sheetName} #${rowNumber}`;
        }
      } else {
        // 이름 컬럼이 없으면 시트명 + 행번호
        displayName = `${sheetName} #${rowNumber}`;
      }

      const hp = hpCol ? Number(row.cells[hpCol.id]) || 100 : 100;
      const atk = atkCol ? Number(row.cells[atkCol.id]) || 10 : 10;
      const def = defCol ? Number(row.cells[defCol.id]) || 0 : 0;
      const speed = speedCol ? Number(row.cells[speedCol.id]) || 1 : 1;
      const critRate = critRateCol ? Number(row.cells[critRateCol.id]) || 0 : 0;
      const critDamage = critDmgCol ? Number(row.cells[critDmgCol.id]) || 1.5 : 1.5;

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
  }, [currentSheet]);

  // 시뮬레이션 실행
  const runSimulation = useCallback(async () => {
    const unit1 = units.find(u => u.id === unit1Id);
    const unit2 = units.find(u => u.id === unit2Id);

    if (!unit1 || !unit2) return;

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      const simulationResult = await runMonteCarloSimulationAsync(
        unit1,
        unit2,
        [],
        [],
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
  }, [unit1Id, unit2Id, units, runs, maxDuration, damageFormula, defenseFormula, useArmorPen, armorPen]);

  const unit1 = units.find(u => u.id === unit1Id);
  const unit2 = units.find(u => u.id === unit2Id);

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>전투 시뮬레이션</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 유닛 선택 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              유닛 1 (공격자)
            </label>
            <select
              value={unit1Id}
              onChange={(e) => setUnit1Id(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">선택...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              유닛 2 (방어자)
            </label>
            <select
              value={unit2Id}
              onChange={(e) => setUnit2Id(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">선택...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 유닛 스탯 미리보기 */}
        {(unit1 || unit2) && (
          <div className="grid grid-cols-2 gap-3">
            {unit1 && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>{unit1.name}</div>
                <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-1"><Heart className="w-3 h-3" /> {unit1.maxHp}</div>
                  <div className="flex items-center gap-1"><Swords className="w-3 h-3" /> {unit1.atk}</div>
                  <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> {unit1.def}</div>
                  <div className="flex items-center gap-1"><Zap className="w-3 h-3" /> {unit1.speed}</div>
                </div>
              </div>
            )}
            {unit2 && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--primary-red)' }}>{unit2.name}</div>
                <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-1"><Heart className="w-3 h-3" /> {unit2.maxHp}</div>
                  <div className="flex items-center gap-1"><Swords className="w-3 h-3" /> {unit2.atk}</div>
                  <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> {unit2.def}</div>
                  <div className="flex items-center gap-1"><Zap className="w-3 h-3" /> {unit2.speed}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 설정 패널 */}
        {showSettings && (
          <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>시뮬레이션 설정</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>반복 횟수</label>
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
                  <option value={1000}>1,000회</option>
                  <option value={5000}>5,000회</option>
                  <option value={10000}>10,000회</option>
                  <option value={50000}>50,000회</option>
                  <option value={100000}>100,000회</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>데미지 공식</label>
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
                  <option value="simple">단순 (ATK - DEF)</option>
                  <option value="mmorpg">MMORPG (ATK × 100/(100+DEF))</option>
                  <option value="percentage">퍼센트 (ATK × (1-DEF/200))</option>
                  <option value="random">랜덤 (ATK × 0.9~1.1 - DEF)</option>
                  <option value="multiplicative">곱셈식 (방어 공식 적용)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>방어 공식</label>
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
                  <option value="subtractive">빼기식 (ATK - DEF)</option>
                  <option value="divisive">나누기식 (DEF/(DEF+100)) - LoL/WoW</option>
                  <option value="multiplicative">곱셈식 (1 - DEF%)</option>
                  <option value="logarithmic">로그식 (수확체감)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>최대 전투 시간 (초)</label>
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
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  방어관통 사용 (Unit1 → Unit2)
                </span>
              </label>

              {useArmorPen && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                      고정 관통 (Lethality)
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
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                      퍼센트 관통 (0~1)
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
          </div>
        )}

        {/* 실행 버튼 */}
        <button
          onClick={runSimulation}
          disabled={!unit1Id || !unit2Id || isRunning}
          className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{
            background: isRunning ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: isRunning ? 'var(--text-secondary)' : 'white'
          }}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              시뮬레이션 중... {progress.toFixed(0)}%
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              시뮬레이션 실행 ({runs.toLocaleString()}회)
            </>
          )}
        </button>

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
            {/* 승률 */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>승률 (95% 신뢰구간)</div>

              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--primary-blue)' }}>{unit1?.name}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {(result.winRateConfidence.unit1.lower * 100).toFixed(1)}% - {(result.winRateConfidence.unit1.upper * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ConfidenceBar
                    winRate={result.unit1WinRate}
                    confidence={result.winRateConfidence.unit1}
                    color="var(--primary-blue)"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--primary-red)' }}>{unit2?.name}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {(result.winRateConfidence.unit2.lower * 100).toFixed(1)}% - {(result.winRateConfidence.unit2.upper * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ConfidenceBar
                    winRate={result.unit2WinRate}
                    confidence={result.winRateConfidence.unit2}
                    color="var(--primary-red)"
                  />
                </div>

                {result.draws > 0 && (
                  <div className="text-xs text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    무승부: {result.draws}회 ({((result.draws / result.totalRuns) * 100).toFixed(1)}%)
                  </div>
                )}
              </div>
            </div>

            {/* TTK (Time To Kill) 통계 */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" style={{ color: 'var(--primary-yellow)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>TTK (Time to Kill)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--primary-blue)' }}>
                    {unit1?.name}가 상대 처치
                  </div>
                  {result.ttkStats?.unit1 && result.ttkStats.unit1.avg > 0 ? (
                    <div className="space-y-1">
                      <div className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>
                        {result.ttkStats.unit1.avg.toFixed(1)}초
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {result.ttkStats.unit1.min.toFixed(1)}s ~ {result.ttkStats.unit1.max.toFixed(1)}s
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>승리 없음</div>
                  )}
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--primary-red)' }}>
                    {unit2?.name}가 상대 처치
                  </div>
                  {result.ttkStats?.unit2 && result.ttkStats.unit2.avg > 0 ? (
                    <div className="space-y-1">
                      <div className="text-lg font-bold" style={{ color: 'var(--primary-red)' }}>
                        {result.ttkStats.unit2.avg.toFixed(1)}초
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {result.ttkStats.unit2.min.toFixed(1)}s ~ {result.ttkStats.unit2.max.toFixed(1)}s
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>승리 없음</div>
                  )}
                </div>
              </div>
            </div>

            {/* DPS 통계 */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>DPS 비교</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--primary-blue)' }}>{unit1?.name}</div>
                  <div className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>
                    {result.unit1AvgDps.toFixed(1)} <span className="text-xs font-normal">실측</span>
                  </div>
                  {result.theoreticalDps && (
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      이론: {result.theoreticalDps.unit1.toFixed(1)}
                      {result.unit1AvgDps < result.theoreticalDps.unit1 * 0.9 && (
                        <span className="ml-1 text-yellow-500">(-{((1 - result.unit1AvgDps / result.theoreticalDps.unit1) * 100).toFixed(0)}%)</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--primary-red)' }}>{unit2?.name}</div>
                  <div className="text-lg font-bold" style={{ color: 'var(--primary-red)' }}>
                    {result.unit2AvgDps.toFixed(1)} <span className="text-xs font-normal">실측</span>
                  </div>
                  {result.theoreticalDps && (
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      이론: {result.theoreticalDps.unit2.toFixed(1)}
                      {result.unit2AvgDps < result.theoreticalDps.unit2 * 0.9 && (
                        <span className="ml-1 text-yellow-500">(-{((1 - result.unit2AvgDps / result.theoreticalDps.unit2) * 100).toFixed(0)}%)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* DPS 비율 바 */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                  <div
                    className="transition-all"
                    style={{
                      width: `${(result.unit1AvgDps / (result.unit1AvgDps + result.unit2AvgDps)) * 100}%`,
                      background: 'var(--primary-blue)'
                    }}
                  />
                  <div
                    className="transition-all"
                    style={{
                      width: `${(result.unit2AvgDps / (result.unit1AvgDps + result.unit2AvgDps)) * 100}%`,
                      background: 'var(--primary-red)'
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{((result.unit1AvgDps / (result.unit1AvgDps + result.unit2AvgDps)) * 100).toFixed(0)}%</span>
                  <span>{((result.unit2AvgDps / (result.unit1AvgDps + result.unit2AvgDps)) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* 통계 요약 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>평균 전투 시간</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.avgDuration.toFixed(1)}초
                </div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>총 시뮬레이션</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.totalRuns.toLocaleString()}회
                </div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>시간 범위</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.minDuration.toFixed(1)}~{result.maxDuration.toFixed(1)}초
                </div>
              </div>
            </div>

            {/* 히스토그램 */}
            <div className="p-4 rounded-lg space-y-4" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>분포 분석</span>
              </div>

              <Histogram
                data={result.durationDistribution}
                label="전투 시간 분포"
                color="var(--accent)"
              />

              <Histogram
                data={result.damageDistribution.unit1}
                label={`${unit1?.name} 총 피해량 분포`}
                color="var(--primary-blue)"
              />

              <Histogram
                data={result.damageDistribution.unit2}
                label={`${unit2?.name} 총 피해량 분포`}
                color="var(--primary-red)"
              />
            </div>

            {/* 상세 통계 토글 */}
            <button
              onClick={() => setShowDetailedStats(!showDetailedStats)}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>상세 통계</span>
              {showDetailedStats ? (
                <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              )}
            </button>

            {showDetailedStats && (
              <div className="p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>{unit1?.name}</div>
                    <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div>승리: {result.unit1Wins}회</div>
                      <div>평균 피해량: {result.unit1AvgDamage.toFixed(0)}</div>
                      <div>평균 생존 HP: {result.unit1AvgSurvivalHp.toFixed(0)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--primary-red)' }}>{unit2?.name}</div>
                    <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div>승리: {result.unit2Wins}회</div>
                      <div>평균 피해량: {result.unit2AvgDamage.toFixed(0)}</div>
                      <div>평균 생존 HP: {result.unit2AvgSurvivalHp.toFixed(0)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    전투 시간 범위: {result.minDuration.toFixed(1)}초 ~ {result.maxDuration.toFixed(1)}초
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
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>샘플 전투 로그</span>
                  </div>
                  <select
                    value={selectedBattleIndex}
                    onChange={(e) => setSelectedBattleIndex(Number(e.target.value))}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {result.sampleBattles.map((_, i) => (
                      <option key={i} value={i}>전투 #{i + 1}</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.sampleBattles[selectedBattleIndex]?.log.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs py-1 px-2 rounded"
                      style={{
                        background: entry.action === 'death' ? 'rgba(255, 0, 0, 0.1)' : 'transparent'
                      }}
                    >
                      <span className="w-12 text-right" style={{ color: 'var(--text-tertiary)' }}>
                        {entry.time.toFixed(1)}s
                      </span>
                      <span
                        className="font-medium"
                        style={{
                          color: entry.actor === unit1?.name ? 'var(--primary-blue)' : 'var(--primary-red)'
                        }}
                      >
                        {entry.actor}
                      </span>
                      {entry.action === 'attack' && (
                        <>
                          <span style={{ color: 'var(--text-tertiary)' }}>→</span>
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
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            ({entry.target} HP: {entry.remainingHp?.toFixed(0)})
                          </span>
                        </>
                      )}
                      {entry.action === 'death' && (
                        <span className="text-red-500">사망</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-xs pt-2 border-t" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                  승자: <span className="font-medium" style={{
                    color: result.sampleBattles[selectedBattleIndex]?.winner === 'unit1'
                      ? 'var(--primary-blue)'
                      : result.sampleBattles[selectedBattleIndex]?.winner === 'unit2'
                        ? 'var(--primary-red)'
                        : 'var(--text-secondary)'
                  }}>
                    {result.sampleBattles[selectedBattleIndex]?.winner === 'unit1'
                      ? unit1?.name
                      : result.sampleBattles[selectedBattleIndex]?.winner === 'unit2'
                        ? unit2?.name
                        : '무승부'}
                  </span>
                  {' '}| 전투 시간: {result.sampleBattles[selectedBattleIndex]?.duration.toFixed(1)}초
                </div>
              </div>
            )}
          </div>
        )}

        {/* 유닛이 없을 때 안내 */}
        {units.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              시트에 유닛 데이터가 없습니다.
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              이름, HP, ATK, DEF, Speed 컬럼이 있는<br />
              시트에서 시뮬레이션을 실행해보세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
