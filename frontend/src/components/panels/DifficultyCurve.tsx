'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Wand2,
  Zap,
  Target,
  Layers,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useEscapeKey } from '@/hooks';

// number input spinner 숨기는 스타일
const hideSpinnerStyle = `
  .hide-spinner::-webkit-outer-spin-button,
  .hide-spinner::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .hide-spinner[type=number] {
    -moz-appearance: textfield;
  }
`;

const PANEL_COLOR = '#8b5cf6';

interface DifficultyCurveProps {
  onClose?: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

// 난이도 구간 정의
interface DifficultySegment {
  stage: number;
  playerPower: number;
  enemyPower: number;
  ratio: number;
  type: 'easy' | 'normal' | 'wall' | 'reward';
  milestone?: string;
}

// 기본 난이도 곡선 프리셋
const CURVE_PRESETS = {
  casual: {
    name: '캐주얼',
    description: '느린 난이도 상승, 벽 적음',
    playerGrowth: 1.12,
    enemyGrowth: 1.08,
    wallInterval: 50,
  },
  balanced: {
    name: '밸런스',
    description: '적당한 난이도, 10스테이지마다 벽',
    playerGrowth: 1.10,
    enemyGrowth: 1.10,
    wallInterval: 10,
  },
  hardcore: {
    name: '하드코어',
    description: '빠른 난이도 상승, 잦은 벽',
    playerGrowth: 1.08,
    enemyGrowth: 1.12,
    wallInterval: 5,
  },
};

// 플레이타임 목표
const PLAYTIME_TARGETS = {
  '30min': { name: '30분/일', stagesPerDay: 10, wallInterval: 5, targetDaysPerWall: 1 },
  '1hr': { name: '1시간/일', stagesPerDay: 20, wallInterval: 10, targetDaysPerWall: 1 },
  '2hr': { name: '2시간/일', stagesPerDay: 40, wallInterval: 20, targetDaysPerWall: 1 },
  '4hr': { name: '4시간/일', stagesPerDay: 80, wallInterval: 40, targetDaysPerWall: 1 },
};

interface MilestoneData {
  name: string;
  powerBonus: number;
}

export default function DifficultyCurve({ onClose, showHelp = false, setShowHelp }: DifficultyCurveProps) {
  const t = useTranslations('difficultyCurve');
  useEscapeKey(onClose ?? (() => {}), !!onClose);
  const [preset, setPreset] = useState<keyof typeof CURVE_PRESETS>('balanced');
  const [playtime, setPlaytime] = useState<keyof typeof PLAYTIME_TARGETS>('1hr');
  const [maxStage, setMaxStage] = useState(100);
  const [wallStages, setWallStages] = useState<number[]>([10, 30, 50, 100]);
  const [milestones, setMilestones] = useState<Record<number, MilestoneData>>({
    10: { name: '장비 시스템 해금', powerBonus: 30 },
    30: { name: '스킬 시스템 해금', powerBonus: 40 },
    50: { name: '각성 시스템 해금', powerBonus: 50 },
    100: { name: '엔드게임 콘텐츠', powerBonus: 0 },
  });

  // 전체화면 모달 상태
  const [showFullscreen, setShowFullscreen] = useState(false);

  // 줌/팬 상태
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // 줌 핸들러
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.3, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.3, 0.5));
  }, []);

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // 팬 핸들러
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  }, [panOffset]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 휠 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev * 1.1, 5));
    } else {
      setZoomLevel(prev => Math.max(prev / 1.1, 0.5));
    }
  }, []);

  // 비율 바 호버 상태
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);

  const config = CURVE_PRESETS[preset];
  const targetPlaytime = PLAYTIME_TARGETS[playtime];

  // 난이도 곡선 데이터 생성
  const curveData = useMemo(() => {
    const data: DifficultySegment[] = [];
    let playerPower = 100;
    let enemyPower = 100;

    for (let stage = 1; stage <= maxStage; stage++) {
      const isWall = wallStages.includes(stage);
      const milestone = milestones[stage];

      if (isWall) {
        enemyPower *= 1.5;
      }

      if (milestone && milestone.powerBonus > 0) {
        playerPower *= (1 + milestone.powerBonus / 100);
      }

      const ratio = playerPower / enemyPower;
      let type: DifficultySegment['type'] = 'normal';
      if (isWall || ratio < 0.8) type = 'wall';
      else if (ratio > 1.3) type = 'easy';
      else if (milestone) type = 'reward';

      data.push({
        stage,
        playerPower: Math.round(playerPower),
        enemyPower: Math.round(enemyPower),
        ratio: Math.round(ratio * 100) / 100,
        type,
        milestone: milestone?.name,
      });

      playerPower *= config.playerGrowth;
      enemyPower *= config.enemyGrowth;
    }

    return data;
  }, [maxStage, wallStages, milestones, config]);

  // 예상 도달 일수 계산
  const estimatedDays = useMemo(() => {
    const result: Record<number, number> = {};
    let totalStages = 0;
    let day = 0;

    for (const segment of curveData) {
      totalStages++;

      if (totalStages >= targetPlaytime.stagesPerDay) {
        totalStages = 0;
        day++;
      }

      if (segment.type === 'wall') {
        day += 1;
        totalStages = 0;
      }

      result[segment.stage] = day;
    }

    return result;
  }, [curveData, targetPlaytime]);

  // 시각화를 위한 정규화
  const normalizedData = useMemo(() => {
    const maxPower = Math.max(...curveData.map(d => Math.max(d.playerPower, d.enemyPower)));
    return curveData.map(d => ({
      ...d,
      playerHeight: (d.playerPower / maxPower) * 100,
      enemyHeight: (d.enemyPower / maxPower) * 100,
    }));
  }, [curveData]);

  // 호버된 스테이지 데이터
  const hoveredData = hoveredStage !== null ? curveData.find(d => d.stage === hoveredStage) : null;

  const addWallStage = (stage: number) => {
    if (!wallStages.includes(stage)) {
      setWallStages([...wallStages, stage].sort((a, b) => a - b));
    }
  };

  const removeWallStage = (stage: number) => {
    setWallStages(wallStages.filter(s => s !== stage));
  };

  const generateRecommendedWalls = () => {
    const interval = targetPlaytime.wallInterval;
    const walls: number[] = [];
    const firstWall = Math.max(interval, 10);

    for (let stage = firstWall; stage <= maxStage; stage += interval) {
      walls.push(stage);
    }

    if (!walls.includes(maxStage)) {
      walls.push(maxStage);
    }

    setWallStages(walls);

    const newMilestones: Record<number, MilestoneData> = {};
    const milestoneTemplates: { name: string; powerBonus: number }[] = [
      { name: '장비 시스템 해금', powerBonus: 30 },
      { name: '스킬 시스템 해금', powerBonus: 40 },
      { name: '펫 시스템 해금', powerBonus: 25 },
      { name: '각성 시스템 해금', powerBonus: 50 },
      { name: '길드 콘텐츠 해금', powerBonus: 20 },
      { name: 'PvP 콘텐츠 해금', powerBonus: 15 },
      { name: '레이드 콘텐츠 해금', powerBonus: 35 },
      { name: '엔드게임 콘텐츠', powerBonus: 0 },
    ];

    walls.forEach((wall, index) => {
      if (index < milestoneTemplates.length) {
        newMilestones[wall] = milestoneTemplates[index];
      }
    });

    setMilestones(newMilestones);
  };

  const updateMilestone = (stage: number, name: string, powerBonus?: number) => {
    if (name.trim()) {
      const existing = milestones[stage];
      setMilestones({
        ...milestones,
        [stage]: {
          name,
          powerBonus: powerBonus !== undefined ? powerBonus : (existing?.powerBonus ?? 30)
        }
      });
    } else {
      const newMilestones = { ...milestones };
      delete newMilestones[stage];
      setMilestones(newMilestones);
    }
  };

  const updateMilestonePowerBonus = (stage: number, powerBonus: number) => {
    const existing = milestones[stage];
    if (existing) {
      setMilestones({
        ...milestones,
        [stage]: { ...existing, powerBonus }
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <style>{hideSpinnerStyle}</style>

      <div className="p-4 space-y-5 overflow-y-auto overflow-x-hidden flex-1 scrollbar-slim">
        {/* 도움말 섹션 */}
        {showHelp && (
          <div className="glass-card p-4 animate-slideDown space-y-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('helpOverviewDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-section p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                  <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{t('helpWall')}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('helpWallDesc')}</p>
              </div>
              <div className="glass-section p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                  <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{t('helpMilestone')}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('helpMilestoneDesc')}</p>
              </div>
            </div>

            {/* 그래프 수치 설명 */}
            <div className="glass-section p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: PANEL_COLOR }} />
                <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{t('helpGraphTitle')}</span>
              </div>
              <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: '#3b82f6' }} />
                  <span>{t('helpGraphPlayer')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: '#ef4444' }} />
                  <span>{t('helpGraphEnemy')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: '#22c55e' }} />
                  <span>{t('helpGraphRatio')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: PANEL_COLOR }} />
                  <span>{t('helpGraphGrowth')}</span>
                </div>
              </div>
            </div>

            <div className="glass-divider" />

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[1, 2, 3, 4].map(num => (
                <div key={num} className="flex gap-2 items-start">
                  <span
                    className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: `${PANEL_COLOR}20`, color: PANEL_COLOR }}
                  >
                    {num}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{t(`helpStep${num}`)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 프리셋 선택 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" style={{ color: PANEL_COLOR }} />
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('presetLabel')}
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(CURVE_PRESETS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setPreset(key as keyof typeof CURVE_PRESETS)}
                className={cn(
                  'glass-card p-3 text-left transition-all duration-200',
                  preset === key && 'ring-2'
                )}
                style={{
                  // @ts-expect-error CSS ring color custom property
                  '--tw-ring-color': preset === key ? PANEL_COLOR : undefined,
                  background: preset === key ? `${PANEL_COLOR}10` : undefined,
                }}
              >
                <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                  {t(`presets.${key}`)}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {t(`presets.${key}Desc`)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 플레이타임 목표 + 예상 진행 시간 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: PANEL_COLOR }} />
              <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('playtimeLabel')}
              </label>
            </div>
            <button
              onClick={generateRecommendedWalls}
              className="glass-button-primary flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
              style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}dd)` }}
            >
              <Wand2 className="w-3.5 h-3.5" />
              {t('autoPlace')}
            </button>
          </div>
          <div className="glass-tabs">
            {Object.entries(PLAYTIME_TARGETS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setPlaytime(key as keyof typeof PLAYTIME_TARGETS)}
                className={cn('glass-tab flex-1 text-center', playtime === key && 'active')}
              >
                <div className="text-xs font-medium">{t(`playtime.${key}`)}</div>
                <div className="text-[10px] opacity-60 mt-0.5">
                  {t('playtime.wallInterval', { interval: value.wallInterval })}
                </div>
              </button>
            ))}
          </div>

          {/* 예상 진행 시간 - 플레이타임 바로 아래 */}
          <div
            className="glass-section p-3 mt-2"
            style={{ background: `${PANEL_COLOR}08` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('estimatedTime')}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                ({t(`playtime.${playtime}`)} {t('basis')})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {wallStages.slice(0, 4).map((stage) => (
                <div key={stage} className="flex items-center gap-1.5 text-xs">
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('stage')} {stage}:</span>
                  <span className="font-semibold" style={{ color: PANEL_COLOR }}>
                    {t('approxDays', { days: estimatedDays[stage] || 0 })}
                  </span>
                </div>
              ))}
              {wallStages.length > 4 && (
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>+{wallStages.length - 4}</span>
              )}
              <div className="flex items-center gap-1.5 text-xs ml-auto">
                <span style={{ color: 'var(--text-tertiary)' }}>{t('finalStage')}:</span>
                <span className="font-bold" style={{ color: PANEL_COLOR }}>
                  {t('approxDays', { days: estimatedDays[maxStage] || 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 최대 스테이지 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('maxStage')}
            </label>
            <span
              className="glass-badge font-bold"
              style={{ color: PANEL_COLOR }}
            >
              {maxStage}
            </span>
          </div>
          <div className="glass-section p-3">
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={maxStage}
              onChange={(e) => setMaxStage(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${PANEL_COLOR} 0%, ${PANEL_COLOR} ${((maxStage - 50) / 450) * 100}%, var(--bg-tertiary) ${((maxStage - 50) / 450) * 100}%, var(--bg-tertiary) 100%)`,
              }}
            />
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <span>50</span>
              <span>500</span>
            </div>
          </div>
        </div>

        {/* 난이도 곡선 시각화 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: PANEL_COLOR }} />
              <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('curveLabel')}
              </label>
            </div>
          </div>
          <div className="glass-card p-4 relative overflow-hidden group">
            {/* 전체화면 버튼 */}
            <button
              onClick={() => setShowFullscreen(true)}
              className="absolute top-3 right-3 z-20 glass-button !p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('fullscreen')}
            >
              <Maximize2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>

            {/* 그래프 - Recharts */}
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={curveData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-primary)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-primary)' }}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                  />
                  <Tooltip
                    content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: any }) => {
                      if (!active || !payload?.length) return null;
                      const segment = payload[0]?.payload as DifficultySegment | undefined;
                      return (
                        <div style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          padding: '8px 12px',
                          fontSize: 11,
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                            {t('stage')} {label}
                          </div>
                          <div style={{ color: '#3b82f6' }}>{t('player')}: {segment?.playerPower.toLocaleString()}</div>
                          <div style={{ color: '#ef4444' }}>{t('enemy')}: {segment?.enemyPower.toLocaleString()}</div>
                          <div style={{
                            marginTop: 4,
                            paddingTop: 4,
                            borderTop: '1px solid var(--border-primary)',
                            fontWeight: 600,
                            color: segment && segment.ratio >= 1 ? '#22c55e' : '#ef4444'
                          }}>
                            {t('ratio')}: {segment?.ratio.toFixed(2)}x {segment && segment.ratio >= 1 ? '(Clear)' : '(Wall)'}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    formatter={(value) => value === 'playerPower' ? t('player') : t('enemy')}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  {/* 벽 스테이지 표시 */}
                  {wallStages.map((stage) => (
                    <ReferenceLine
                      key={stage}
                      x={stage}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="playerPower"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enemyPower"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 비율 그래프 - 높이로 비율 표현 */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                <span>{t('ratio')} ({t('player')}/{t('enemy')})</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
                    1.3+
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                    1.0-1.3
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#eab308' }} />
                    0.8-1.0
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
                    &lt;0.8
                  </span>
                </div>
              </div>
              {/* 비율 막대 그래프 */}
              <div
                className="relative h-12 rounded-lg"
                style={{ background: 'var(--bg-tertiary)' }}
                onMouseLeave={() => setHoveredStage(null)}
              >
                {/* 기준선 (비율 1.0) */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed z-10 pointer-events-none"
                  style={{ top: '33.3%', borderColor: 'var(--text-tertiary)', opacity: 0.5 }}
                />
                <div
                  className="absolute right-1 text-[9px] z-10 pointer-events-none"
                  style={{ top: '33.3%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
                >
                  1.0
                </div>
                {/* 막대들 */}
                <div className="absolute inset-0 flex items-end rounded-lg overflow-hidden">
                  {curveData.map((d, i) => {
                    const width = 100 / curveData.length;
                    // 비율을 높이로 변환 (0.5~2.0 범위를 0~100%로)
                    const normalizedRatio = Math.min(Math.max(d.ratio, 0.5), 2.0);
                    const height = ((normalizedRatio - 0.5) / 1.5) * 100;

                    // 색상 결정
                    let color: string;
                    if (d.ratio >= 1.3) color = '#22c55e';
                    else if (d.ratio >= 1.0) color = '#3b82f6';
                    else if (d.ratio >= 0.8) color = '#eab308';
                    else color = '#ef4444';

                    const isHovered = hoveredStage === d.stage;

                    return (
                      <div
                        key={i}
                        className="relative cursor-pointer"
                        style={{ width: `${width}%`, height: '100%' }}
                        onMouseEnter={() => setHoveredStage(d.stage)}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 transition-all duration-100"
                          style={{
                            height: `${height}%`,
                            background: color,
                            opacity: isHovered ? 1 : 0.7,
                            marginLeft: curveData.length > 50 ? '0px' : '1px',
                            marginRight: curveData.length > 50 ? '0px' : '1px',
                            borderRadius: curveData.length > 50 ? '0' : '2px 2px 0 0',
                            transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
                            transformOrigin: 'bottom',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* 호버 정보 표시 영역 */}
              <div
                className="flex items-center justify-between text-[10px] h-5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {hoveredData ? (
                  <div className="flex items-center gap-3 w-full">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('stage')} {hoveredData.stage}
                    </span>
                    <span style={{
                      color: hoveredData.ratio >= 1.3 ? '#22c55e' :
                             hoveredData.ratio >= 1.0 ? '#3b82f6' :
                             hoveredData.ratio >= 0.8 ? '#eab308' : '#ef4444',
                      fontWeight: 600
                    }}>
                      {hoveredData.ratio.toFixed(2)}x
                      ({hoveredData.ratio >= 1.3 ? 'Easy' :
                        hoveredData.ratio >= 1.0 ? 'Clear' :
                        hoveredData.ratio >= 0.8 ? 'Hard' : 'Wall'})
                    </span>
                    <span className="ml-auto">
                      {t('player')}: {hoveredData.playerPower.toLocaleString()} / {t('enemy')}: {hoveredData.enemyPower.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <>
                    <span>{t('stage')} 1</span>
                    <span className="text-[9px]">( {t('stage')} 1~{maxStage} )</span>
                    <span>{t('stage')} {maxStage}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 전체화면 모달 */}
        {showFullscreen && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-8" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div
              className="w-full h-[95vh] sm:h-full max-w-6xl sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
              }}
            >
              {/* 모달 헤더 */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${PANEL_COLOR}15` }}
                  >
                    <TrendingUp className="w-5 h-5" style={{ color: PANEL_COLOR }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('curveLabel')}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {t('stage')} 1 ~ {maxStage}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 줌 컨트롤 */}
                  <div className="flex items-center gap-1 glass-section px-2 py-1 rounded-lg">
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <span className="text-xs font-medium px-2 min-w-[50px] text-center" style={{ color: 'var(--text-secondary)' }}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                  <button
                    onClick={handleResetView}
                    className="glass-button !p-2"
                    title="Reset View"
                  >
                    <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={() => {
                      setShowFullscreen(false);
                      handleResetView();
                    }}
                    className="glass-button !p-2"
                  >
                    <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
              </div>

              {/* 차트 영역 */}
              <div
                className="flex-1 p-6 overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ background: 'var(--bg-primary)' }}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                onWheel={handleWheel}
              >
                <div
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={curveData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                      <XAxis
                        dataKey="stage"
                        tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border-secondary)' }}
                        label={{ value: t('stage'), position: 'insideBottom', offset: -10, fontSize: 12, fill: 'var(--text-tertiary)' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border-secondary)' }}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                        label={{ value: 'Power', angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-tertiary)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                          padding: '12px 16px',
                        }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, marginBottom: 8 }}
                        formatter={(value, name) => {
                          const label = name === 'playerPower' ? t('player') : t('enemy');
                          return [typeof value === 'number' ? value.toLocaleString() : value, label];
                        }}
                        labelFormatter={(label) => `${t('stage')} ${label}`}
                        content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: any }) => {
                          if (!active || !payload?.length) return null;
                          const segment = payload[0]?.payload as DifficultySegment | undefined;
                          const ratio = segment ? segment.playerPower / segment.enemyPower : 1;
                          return (
                            <div style={{
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-primary)',
                              borderRadius: '12px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                              padding: '12px 16px',
                            }}>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                                {t('stage')} {label}
                              </div>
                              {segment?.milestone && (
                                <div style={{ fontSize: 11, color: '#10b981', marginBottom: 4 }}>
                                  {segment.milestone}
                                </div>
                              )}
                              {segment?.type === 'wall' && (
                                <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 4 }}>
                                  {t('wallStage')}
                                </div>
                              )}
                              {payload.map((entry: any, idx: number) => (
                                <div key={idx} style={{ fontSize: 12, color: entry.color, marginBottom: 2 }}>
                                  {entry.name === 'playerPower' ? t('player') : t('enemy')}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                                </div>
                              ))}
                              {segment && (
                                <div style={{ fontSize: 11, color: ratio >= 1 ? '#22c55e' : '#ef4444', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-primary)' }}>
                                  {t('player')}/{t('enemy')}: {ratio.toFixed(2)}x
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={40}
                        formatter={(value) => value === 'playerPower' ? t('player') : t('enemy')}
                        wrapperStyle={{ fontSize: 13 }}
                      />
                      {/* 벽 스테이지 표시 */}
                      {wallStages.map((stage) => (
                        <ReferenceLine
                          key={stage}
                          x={stage}
                          stroke="#ef4444"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: `Wall`,
                            position: 'top',
                            fontSize: 10,
                            fill: '#ef4444',
                          }}
                        />
                      ))}
                      {/* 마일스톤 표시 */}
                      {Object.keys(milestones).map((stage) => (
                        <ReferenceLine
                          key={`milestone-${stage}`}
                          x={Number(stage)}
                          stroke="#10b981"
                          strokeDasharray="3 3"
                          strokeWidth={1.5}
                        />
                      ))}
                      <Line
                        type="monotone"
                        dataKey="playerPower"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="enemyPower"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 모달 푸터 - 조작 안내 */}
              <div
                className="px-5 py-3 border-t flex items-center justify-center gap-6 text-xs shrink-0"
                style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" />
                  <span>{t('dragToMove')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{t('scrollToZoom')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 벽 스테이지 설정 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
            <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('wallStages')}
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {wallStages.map((stage) => (
              <div
                key={stage}
                className="glass-badge flex items-center gap-1.5 pr-1"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
              >
                <AlertTriangle className="w-3 h-3" />
                <span className="font-medium">{t('stage')} {stage}</span>
                <button
                  onClick={() => removeWallStage(stage)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
            <input
              type="number"
              placeholder={`${t('add')}...`}
              className="glass-input hide-spinner !w-20 !px-2 !py-1 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = Number((e.target as HTMLInputElement).value);
                  if (value > 0 && value <= maxStage) {
                    addWallStage(value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 마일스톤 설정 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: '#10b981' }} />
              <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('milestones')}
              </label>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {t('powerBonusNote')}
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(milestones).map(([stage, data]) => (
              <div key={stage} className="glass-card p-2.5 flex items-center gap-2">
                <span
                  className="glass-badge shrink-0 font-bold"
                  style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                >
                  {stage}
                </span>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => updateMilestone(Number(stage), e.target.value)}
                  className="glass-input flex-1 !py-1.5 text-xs"
                  placeholder={t('contentName')}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>+</span>
                  <input
                    type="number"
                    value={data.powerBonus}
                    onChange={(e) => updateMilestonePowerBonus(Number(stage), Number(e.target.value))}
                    className="glass-input hide-spinner !w-14 !px-2 !py-1.5 text-xs text-center"
                    min={0}
                    max={200}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>%</span>
                </div>
                <button
                  onClick={() => updateMilestone(Number(stage), '')}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors"
                  style={{ color: '#ef4444' }}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="glass-section p-2.5 flex items-center gap-2">
              <input
                type="number"
                placeholder={t('stage')}
                className="glass-input hide-spinner !w-16 !px-2 !py-1.5 text-xs"
                id="newMilestoneStage"
              />
              <input
                type="text"
                placeholder={`${t('unlockContent')}`}
                className="glass-input flex-1 !py-1.5 text-xs"
                id="newMilestoneText"
              />
              <input
                type="number"
                placeholder="%"
                className="glass-input hide-spinner !w-14 !px-2 !py-1.5 text-xs text-center"
                id="newMilestoneBonus"
                defaultValue={30}
              />
              <button
                onClick={() => {
                  const stageInput = document.getElementById('newMilestoneStage') as HTMLInputElement;
                  const textInput = document.getElementById('newMilestoneText') as HTMLInputElement;
                  const bonusInput = document.getElementById('newMilestoneBonus') as HTMLInputElement;
                  const stage = Number(stageInput.value);
                  if (stage > 0 && textInput.value.trim()) {
                    updateMilestone(stage, textInput.value, Number(bonusInput.value) || 30);
                    stageInput.value = '';
                    textInput.value = '';
                    bonusInput.value = '30';
                  }
                }}
                className="glass-button-primary !px-3 !py-1.5 text-xs"
                style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
