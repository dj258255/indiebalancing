'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  X,
  AlertTriangle,
  Clock,
  HelpCircle,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

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

// 플레이타임 목표 (일일 플레이 시간 기준)
// wallInterval: 벽 사이 권장 스테이지 수 (플레이타임에 따라 다름)
// targetDaysPerWall: 벽 하나당 목표 도달 일수
const PLAYTIME_TARGETS = {
  '30min': { name: '30분/일', stagesPerDay: 10, wallInterval: 5, targetDaysPerWall: 1 },
  '1hr': { name: '1시간/일', stagesPerDay: 20, wallInterval: 10, targetDaysPerWall: 1 },
  '2hr': { name: '2시간/일', stagesPerDay: 40, wallInterval: 20, targetDaysPerWall: 1 },
  '4hr': { name: '4시간/일', stagesPerDay: 80, wallInterval: 40, targetDaysPerWall: 1 },
};

// 마일스톤 데이터 타입 (이름 + 파워 보너스)
interface MilestoneData {
  name: string;
  powerBonus: number; // 플레이어 파워 증가율 (예: 30 = +30%)
}

export default function DifficultyCurve({ onClose, showHelp = false, setShowHelp }: DifficultyCurveProps) {
  const t = useTranslations('difficultyCurve');
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

      // 벽 스테이지에서는 적 파워 급상승
      if (isWall) {
        enemyPower *= 1.5;
      }

      // 마일스톤에서 플레이어 파워 보너스 적용
      if (milestone && milestone.powerBonus > 0) {
        playerPower *= (1 + milestone.powerBonus / 100);
      }

      const ratio = playerPower / enemyPower;
      let type: DifficultySegment['type'] = 'normal';
      if (isWall || ratio < 0.8) type = 'wall';  // 벽 스테이지 우선
      else if (ratio > 1.3) type = 'easy';
      else if (milestone) type = 'reward';

      data.push({
        stage,
        playerPower: Math.round(playerPower),
        enemyPower: Math.round(enemyPower),
        type,
        milestone: milestone?.name,
      });

      // 다음 스테이지를 위한 성장
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
      // 스테이지 진행
      totalStages++;

      // 하루 플레이 분량 채우면 다음 날로
      if (totalStages >= targetPlaytime.stagesPerDay) {
        totalStages = 0;
        day++;
      }

      // 벽에서는 추가로 하루 정도 막힌다고 가정 (파밍/강화 시간)
      if (segment.type === 'wall') {
        day += 1;
        totalStages = 0; // 벽 돌파 후 새로운 날 시작
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

  const addWallStage = (stage: number) => {
    if (!wallStages.includes(stage)) {
      setWallStages([...wallStages, stage].sort((a, b) => a - b));
    }
  };

  const removeWallStage = (stage: number) => {
    setWallStages(wallStages.filter(s => s !== stage));
  };

  // 플레이타임 기반 자동 벽 배치
  const generateRecommendedWalls = () => {
    const interval = targetPlaytime.wallInterval;
    const walls: number[] = [];

    // 첫 벽은 초반 적응 구간 이후 (최소 10스테이지)
    const firstWall = Math.max(interval, 10);

    for (let stage = firstWall; stage <= maxStage; stage += interval) {
      walls.push(stage);
    }

    // 마지막 스테이지가 벽 목록에 없으면 추가
    if (!walls.includes(maxStage)) {
      walls.push(maxStage);
    }

    setWallStages(walls);

    // 기본 마일스톤도 자동 생성 (이름 + 파워 보너스)
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

      <div className="p-3 pb-12 space-y-3 overflow-y-auto overflow-x-hidden flex-1">
          {/* 도움말 섹션 */}
          {showHelp && (
            <div className="mb-4 p-3 rounded-lg animate-slideDown" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
              <div className="space-y-3">
                {/* 개요 */}
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${PANEL_COLOR}20` }}>
                    <TrendingUp className="w-3 h-3" style={{ color: PANEL_COLOR }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('helpOverviewDesc')}</p>
                  </div>
                </div>

                {/* 핵심 개념 */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <span className="font-medium" style={{ color: PANEL_COLOR }}>{t('helpWall')}</span>
                    <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('helpWallDesc')}</span>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <span className="font-medium" style={{ color: PANEL_COLOR }}>{t('helpMilestone')}</span>
                    <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('helpMilestoneDesc')}</span>
                  </div>
                </div>

                {/* 사용 방법 */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('helpUsage')}</div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex gap-1.5 items-start">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0" style={{ background: PANEL_COLOR, color: 'white' }}>1</span>
                      <span>{t('helpStep1')}</span>
                    </div>
                    <div className="flex gap-1.5 items-start">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0" style={{ background: PANEL_COLOR, color: 'white' }}>2</span>
                      <span>{t('helpStep2')}</span>
                    </div>
                    <div className="flex gap-1.5 items-start">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0" style={{ background: PANEL_COLOR, color: 'white' }}>3</span>
                      <span>{t('helpStep3')}</span>
                    </div>
                    <div className="flex gap-1.5 items-start">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0" style={{ background: PANEL_COLOR, color: 'white' }}>4</span>
                      <span>{t('helpStep4')}</span>
                    </div>
                  </div>
                </div>

                {/* 그래프 읽는 법 */}
                <div className="space-y-1">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('helpGraph')}</div>
                  <div className="flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
                      <span>{t('player')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
                      <span>{t('enemy')}</span>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('helpGraphDesc')}</p>
                </div>

                {/* 디자인 팁 */}
                <div className="space-y-1">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('helpTips')}</div>
                  <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div>• {t('helpTip1')}</div>
                    <div>• {t('helpTip2')}</div>
                    <div>• {t('helpTip3')}</div>
                    <div>• {t('helpTip4')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 프리셋 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('presetLabel')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CURVE_PRESETS).map(([key]) => (
                <button
                  key={key}
                  onClick={() => setPreset(key as keyof typeof CURVE_PRESETS)}
                  className={cn(
                    'p-2 rounded-lg text-xs border transition-all',
                    preset === key ? 'ring-2' : ''
                  )}
                  style={{
                    borderColor: preset === key ? 'var(--accent)' : 'var(--border-primary)',
                    background: preset === key ? 'var(--accent-light)' : 'var(--bg-primary)',
                  }}
                >
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t(`presets.${key}`)}
                  </div>
                  <div style={{ color: 'var(--text-tertiary)' }}>{t(`presets.${key}Desc`)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 플레이타임 목표 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('playtimeLabel')}
              </label>
              <button
                onClick={generateRecommendedWalls}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Wand2 className="w-3 h-3" />
                {t('autoPlace')}
              </button>
            </div>
            <div className="flex gap-2">
              {Object.entries(PLAYTIME_TARGETS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setPlaytime(key as keyof typeof PLAYTIME_TARGETS)}
                  className={cn(
                    'px-3 py-1.5 rounded text-xs transition-all flex-1',
                    playtime === key ? 'font-medium' : ''
                  )}
                  style={{
                    background: playtime === key ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: playtime === key ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <div>{t(`playtime.${key}`)}</div>
                  <div className="text-[10px] opacity-70">{t('playtime.wallInterval', { interval: value.wallInterval })}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 최대 스테이지 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('maxStage')}: {maxStage}
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={maxStage}
              onChange={(e) => setMaxStage(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 난이도 곡선 시각화 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('curveLabel')}
            </label>
            <div
              className="relative h-40 rounded-lg overflow-hidden"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              {/* 그래프 - 플레이어와 적 바 나란히 표시 */}
              <div className="absolute inset-0 flex items-end px-1">
                {normalizedData.filter((_, i) => i % Math.ceil(maxStage / 100) === 0).map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 flex items-end justify-center gap-[1px] px-[1px]"
                    style={{ height: '100%' }}
                  >
                    {/* 플레이어 파워 (파랑) */}
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        height: `${d.playerHeight}%`,
                        background: '#3b82f6',
                        opacity: 0.85,
                      }}
                    />
                    {/* 적 파워 (빨강) */}
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        height: `${d.enemyHeight}%`,
                        background: d.type === 'wall' ? '#ef4444' : '#f87171',
                        opacity: d.type === 'wall' ? 1 : 0.7,
                      }}
                    />
                  </div>
                ))}
              </div>
              {/* 범례 */}
              <div className="absolute top-2 right-2 flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('player')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('enemy')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 벽 스테이지 설정 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('wallStages')}
            </label>
            <div className="flex flex-wrap gap-2">
              {wallStages.map((stage) => (
                <div
                  key={stage}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--error-light)', color: 'var(--error)' }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{t('stage')} {stage}</span>
                  <button
                    onClick={() => removeWallStage(stage)}
                    className="ml-1 hover:opacity-70"
                  >
                    x
                  </button>
                </div>
              ))}
              <input
                type="number"
                placeholder={`${t('add')}...`}
                className="hide-spinner w-20 px-2 py-1 rounded text-xs"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('milestones')}
              </label>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {t('powerBonusNote')}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(milestones).map(([stage, data]) => (
                <div key={stage} className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-1 rounded shrink-0"
                    style={{ background: 'var(--success-light)', color: 'var(--success)' }}
                  >
                    {stage}
                  </span>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => updateMilestone(Number(stage), e.target.value)}
                    className="flex-1 px-2 py-1 rounded text-xs"
                    style={{ background: 'var(--bg-tertiary)' }}
                    placeholder={t('contentName')}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>+</span>
                    <input
                      type="number"
                      value={data.powerBonus}
                      onChange={(e) => updateMilestonePowerBonus(Number(stage), Number(e.target.value))}
                      className="hide-spinner w-14 px-2 py-1 rounded text-xs text-center"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      min={0}
                      max={200}
                    />
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>%</span>
                  </div>
                  <button
                    onClick={() => updateMilestone(Number(stage), '')}
                    className="text-xs px-1 hover:opacity-70"
                    style={{ color: 'var(--error)' }}
                  >
                    x
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t('stage')}
                  className="hide-spinner w-16 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  id="newMilestoneStage"
                />
                <input
                  type="text"
                  placeholder={`${t('unlockContent')}`}
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  id="newMilestoneText"
                />
                <input
                  type="number"
                  placeholder="%"
                  className="hide-spinner w-14 px-2 py-1 rounded text-xs text-center"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
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
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>

          {/* 예상 도달 시간 */}
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--accent-light)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('estimatedTime')} ({t(`playtime.${playtime}`)} {t('basis')})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {wallStages.map((stage) => (
                <div key={stage}>
                  {t('stage')} {stage}: {t('approxDays', { days: estimatedDays[stage] || 0 })}
                  {milestones[stage] && (
                    <span className="ml-1" style={{ color: 'var(--success)' }}>
                      ({milestones[stage].name} +{milestones[stage].powerBonus}%)
                    </span>
                  )}
                </div>
              ))}
              <div>
                {t('finalStage')}: {t('approxDays', { days: estimatedDays[maxStage] || 0 })}
              </div>
            </div>
          </div>

      </div>
    </div>
  );
}
