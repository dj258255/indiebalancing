'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { X, Play, Settings, BarChart3, Clock, Swords, Heart, Shield, Zap, ChevronDown, ChevronUp, RefreshCw, HelpCircle, FileSpreadsheet, User, Grid3X3 } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { UnitStats, SimulationResult, BattleConfig, DefenseFormulaType, ArmorPenetrationConfig } from '@/lib/simulation/types';
import { runMonteCarloSimulationAsync } from '@/lib/simulation/monteCarloSimulator';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useTranslations } from 'next-intl';

const PANEL_COLOR = '#ef4444'; // 빨간색 (전투시뮬레이션 테마)

// 셀 선택 가능한 스탯 입력 컴포넌트
function StatInput({
  icon: Icon,
  label,
  value,
  onChange,
  onCellSelect,
  color = 'var(--text-tertiary)'
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCellSelect: () => void;
  color?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <label className="flex items-center gap-1 text-xs mb-1" style={{ color }}>
        <Icon className="w-3 h-3" /> {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-2 py-1 pr-7 rounded text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
        />
        {isHovered && (
          <button
            onClick={onCellSelect}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            title="셀에서 값 가져오기"
          >
            <Grid3X3 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        )}
      </div>
    </div>
  );
}

// 커스텀 유닛 선택 드롭다운
function UnitPicker({
  units,
  onSelect,
  color,
  buttonText
}: {
  units: UnitStats[];
  onSelect: (unit: UnitStats) => void;
  color: string;
  buttonText: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (units.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 whitespace-nowrap"
        style={{
          background: `${color}10`,
          color: color,
          border: `1.5px solid ${color}`,
          boxShadow: `0 1px 3px ${color}20`
        }}
      >
        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 커스텀 툴팁 */}
      {showTooltip && !isOpen && (
        <div
          className="absolute right-0 bottom-full mb-1.5 px-2 py-1 rounded text-xs whitespace-nowrap z-50 pointer-events-none animate-fadeIn"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {buttonText}
          <div
            className="absolute right-3 top-full w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--border-primary)'
            }}
          />
        </div>
      )}

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-56 rounded-lg shadow-xl overflow-hidden z-50 animate-slideDown"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)'
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-tertiary)' }}>
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {buttonText}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {units.map((unit, index) => (
              <button
                key={unit.id}
                onClick={() => {
                  onSelect(unit);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: `${color}20`, color: color }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {unit.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5" style={{ color: '#ef4444' }} />
                      {unit.maxHp}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Swords className="w-2.5 h-2.5" style={{ color: '#f59e0b' }} />
                      {unit.atk}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" style={{ color: '#3b82f6' }} />
                      {unit.def}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SimulationPanelProps {
  onClose: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

// 히스토그램 컴포넌트 (인터랙티브 툴팁 포함)
function Histogram({ data, label, color, unit = '', rangeLabels }: {
  data: number[];
  label: string;
  color: string;
  unit?: string;
  rangeLabels?: { min: number; max: number };
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className="h-20 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>데이터 없음</span>
        </div>
      </div>
    );
  }

  const max = Math.max(...data);
  const total = data.reduce((a, b) => a + b, 0);

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    setHoveredIndex(index);
  };

  // 범위 레이블 계산
  const getRangeLabel = (index: number) => {
    if (!rangeLabels) return `구간 ${index + 1}`;
    const step = (rangeLabels.max - rangeLabels.min) / data.length;
    const start = rangeLabels.min + step * index;
    const end = start + step;
    return `${start.toFixed(1)}${unit} ~ ${end.toFixed(1)}${unit}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {hoveredIndex !== null && (
          <div className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}20`, color }}>
            {data[hoveredIndex].toLocaleString()}회 ({((data[hoveredIndex] / total) * 100).toFixed(1)}%)
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        className="relative flex items-end gap-px h-20 p-1 rounded-lg"
        style={{ background: 'var(--bg-primary)' }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all cursor-pointer relative group"
            style={{
              height: max > 0 ? `${(value / max) * 100}%` : '0%',
              background: color,
              opacity: hoveredIndex === i ? 1 : 0.7,
              minHeight: value > 0 ? '2px' : '0',
              transform: hoveredIndex === i ? 'scaleY(1.05)' : 'scaleY(1)',
              transformOrigin: 'bottom'
            }}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}

        {/* 툴팁 */}
        {hoveredIndex !== null && (
          <div
            className="absolute z-50 px-2 py-1.5 rounded-lg text-xs pointer-events-none whitespace-nowrap"
            style={{
              left: Math.min(tooltipPosition.x, (containerRef.current?.clientWidth || 200) - 120),
              top: Math.max(tooltipPosition.y - 50, 0),
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            <div className="font-medium" style={{ color }}>{getRangeLabel(hoveredIndex)}</div>
            <div style={{ color: 'var(--text-secondary)' }}>
              {data[hoveredIndex].toLocaleString()}회 ({((data[hoveredIndex] / total) * 100).toFixed(1)}%)
            </div>
          </div>
        )}
      </div>
      {/* X축 레이블 */}
      {rangeLabels && (
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>{rangeLabels.min.toFixed(1)}{unit}</span>
          <span>{rangeLabels.max.toFixed(1)}{unit}</span>
        </div>
      )}
    </div>
  );
}

// 신뢰구간 표시 (개선된 버전)
function ConfidenceBar({ winRate, confidence, color, wins, total }: {
  winRate: number;
  confidence: { lower: number; upper: number };
  color: string;
  wins?: number;
  total?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-8 rounded-lg overflow-hidden cursor-pointer" style={{ background: 'var(--bg-primary)' }}>
        {/* 신뢰구간 범위 */}
        <div
          className="absolute h-full transition-opacity"
          style={{
            left: `${confidence.lower * 100}%`,
            width: `${(confidence.upper - confidence.lower) * 100}%`,
            background: `${color}30`,
            opacity: isHovered ? 1 : 0.5
          }}
        />
        {/* 실제 승률 바 */}
        <div
          className="absolute h-full transition-all"
          style={{
            width: `${winRate * 100}%`,
            background: `linear-gradient(90deg, ${color}90, ${color})`,
            boxShadow: isHovered ? `0 0 10px ${color}50` : 'none'
          }}
        />
        {/* 승률 텍스트 */}
        <div
          className="absolute inset-0 flex items-center justify-center text-sm font-bold transition-transform"
          style={{
            color: 'var(--text-primary)',
            textShadow: '0 0 4px var(--bg-primary), 0 0 4px var(--bg-primary), 0 0 8px var(--bg-primary)',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          {(winRate * 100).toFixed(1)}%
        </div>
      </div>

      {/* 호버 시 상세 정보 */}
      {isHovered && wins !== undefined && total !== undefined && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 rounded-lg text-xs z-50 whitespace-nowrap"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <div className="font-medium mb-1" style={{ color }}>{wins.toLocaleString()}승 / {total.toLocaleString()}전</div>
          <div style={{ color: 'var(--text-tertiary)' }}>
            95% 신뢰구간: {(confidence.lower * 100).toFixed(1)}% ~ {(confidence.upper * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
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
  }, [unit1Stats, unit2Stats, runs, maxDuration, damageFormula, defenseFormula, useArmorPen, armorPen]);

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
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{tCommon('help.simulation.desc')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>DPS</span>
                  <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{tCommon('help.simulation.dps')}</span>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>TTK</span>
                  <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{tCommon('help.simulation.ttk')}</span>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>{tCommon('help.simulation.winRate')}</span>
                  <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{tCommon('help.simulation.winRateDesc')}</span>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>{tCommon('help.simulation.monteCarlo')}</span>
                  <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{tCommon('help.simulation.monteCarloDesc')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
                color="#ef4444"
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
                color="#f59e0b"
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
                color="#3b82f6"
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
                color="#8b5cf6"
              />
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
                color="#ef4444"
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
                color="#f59e0b"
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
                color="#3b82f6"
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
                color="#8b5cf6"
              />
            </div>
          </div>
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings')}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('runs')}</label>
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
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('damageFormula')}</label>
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
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('defenseFormula')}</label>
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
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('maxBattleTime')}</label>
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
                  {t('useArmorPen')}
                </span>
              </label>

              {useArmorPen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
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
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
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
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                        {label}
                      </label>
                      <select
                        value={columnMapping[key]}
                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-2 py-1 rounded text-xs"
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
                <div className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
                  {result.totalRuns.toLocaleString()}전
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
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
                  <div className="flex items-center justify-between text-xs mb-2">
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
                    <div className="w-3 h-3 rounded-full" style={{ background: 'var(--text-tertiary)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
                    <div className="text-xs mb-1 font-medium" style={{ color: 'var(--primary-blue)' }}>
                      {unit1Stats.name}
                    </div>
                    {result.ttkStats?.unit1 && result.ttkStats.unit1.avg > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                          {result.ttkStats.unit1.avg.toFixed(1)}s
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          ({result.ttkStats.unit1.min.toFixed(1)}~{result.ttkStats.unit1.max.toFixed(1)}s)
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('noWin')}</span>
                    )}
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-xs mb-1 font-medium" style={{ color: 'var(--primary-red)' }}>
                      {unit2Stats.name}
                    </div>
                    {result.ttkStats?.unit2 && result.ttkStats.unit2.avg > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold" style={{ color: 'var(--primary-red)' }}>
                          {result.ttkStats.unit2.avg.toFixed(1)}s
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          ({result.ttkStats.unit2.min.toFixed(1)}~{result.ttkStats.unit2.max.toFixed(1)}s)
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('noWin')}</span>
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
                    <div className="text-xs mb-1 font-medium" style={{ color: 'var(--primary-blue)' }}>{unit1Stats.name}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                        {result.unit1AvgDps.toFixed(1)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>DPS</span>
                      {result.theoreticalDps && result.unit1AvgDps < result.theoreticalDps.unit1 * 0.9 && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fef3c720', color: '#eab308' }}>
                          -{((1 - result.unit1AvgDps / result.theoreticalDps.unit1) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-xs mb-1 font-medium" style={{ color: 'var(--primary-red)' }}>{unit2Stats.name}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold" style={{ color: 'var(--primary-red)' }}>
                        {result.unit2AvgDps.toFixed(1)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>DPS</span>
                      {result.theoreticalDps && result.unit2AvgDps < result.theoreticalDps.unit2 * 0.9 && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fef3c720', color: '#eab308' }}>
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
                <div className="text-xs mb-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('avgBattleTime')}</div>
                <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                  {result.avgDuration.toFixed(1)}<span className="text-sm font-normal">s</span>
                </div>
              </div>
              <div className="p-3 rounded-xl text-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary))', border: '1px solid var(--border-primary)' }}>
                <div className="text-xs mb-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('totalSimulations')}</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.totalRuns >= 1000 ? `${(result.totalRuns / 1000).toFixed(0)}K` : result.totalRuns}
                </div>
              </div>
              <div className="p-3 rounded-xl text-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary))', border: '1px solid var(--border-primary)' }}>
                <div className="text-xs mb-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('timeRange')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.minDuration.toFixed(1)}~{result.maxDuration.toFixed(1)}<span className="text-xs font-normal">s</span>
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
                <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              )}
            </button>

            {showDetailedStats && (
              <div className="p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>{unit1Stats.name}</div>
                    <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div>{t('wins')}: {result.unit1Wins}</div>
                      <div>{t('avgDamage')}: {result.unit1AvgDamage.toFixed(0)}</div>
                      <div>{t('avgSurvivalHp')}: {result.unit1AvgSurvivalHp.toFixed(0)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>{t('draw')}</div>
                    <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div>{result.draws.toLocaleString()}</div>
                      <div>({((result.draws / result.totalRuns) * 100).toFixed(1)}%)</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2" style={{ color: 'var(--primary-red)' }}>{unit2Stats.name}</div>
                    <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div>{t('wins')}: {result.unit2Wins}</div>
                      <div>{t('avgDamage')}: {result.unit2AvgDamage.toFixed(0)}</div>
                      <div>{t('avgSurvivalHp')}: {result.unit2AvgSurvivalHp.toFixed(0)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
                    className="px-2 py-1 rounded text-xs"
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
                          color: entry.actor === unit1Stats.name ? 'var(--primary-blue)' : 'var(--primary-red)'
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
                        <span className="text-red-500">{t('death')}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-xs pt-2 border-t" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
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
          </div>
        )}

        {/* 유닛이 없을 때 안내 */}
        {units.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('noUnitData')}
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              {t('noUnitDataDesc')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
