'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  X,
  AlertTriangle,
  Clock,
  HelpCircle,
  ChevronDown,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DifficultyCurveProps {
  onClose?: () => void;
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

export default function DifficultyCurve({ onClose }: DifficultyCurveProps) {
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
  const [showHelp, setShowHelp] = useState(false);

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
      if (ratio > 1.3) type = 'easy';
      else if (ratio < 0.8) type = 'wall';
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
      if (segment.type === 'wall') {
        // 벽에서는 하루 정도 막힌다고 가정
        day += 1;
      }
      totalStages++;
      if (totalStages >= targetPlaytime.stagesPerDay) {
        totalStages = 0;
        day++;
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
    <div className="card overflow-hidden h-full flex flex-col">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: '#8b5cf6' }}
          >
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            난이도 곡선 설계
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            {wallStages.length}개 벽
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: showHelp ? 'var(--accent)' : 'var(--text-tertiary)' }}
            title="사용법 보기"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 pb-12 space-y-3 overflow-y-auto flex-1">
          {/* 프리셋 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              난이도 프리셋
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CURVE_PRESETS).map(([key, value]) => (
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
                    {value.name}
                  </div>
                  <div style={{ color: 'var(--text-tertiary)' }}>{value.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 플레이타임 목표 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                일일 플레이타임 목표
              </label>
              <button
                onClick={generateRecommendedWalls}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
                style={{ background: 'var(--accent)', color: 'white' }}
                title="플레이타임에 맞는 벽 자동 배치"
              >
                <Wand2 className="w-3 h-3" />
                자동 배치
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
                  <div>{value.name}</div>
                  <div className="text-[10px] opacity-70">벽 간격 {value.wallInterval}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 최대 스테이지 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              최대 스테이지: {maxStage}
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
              난이도 곡선
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
                  <span style={{ color: 'var(--text-secondary)' }}>플레이어</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>적</span>
                </div>
              </div>
            </div>
          </div>

          {/* 벽 스테이지 설정 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              벽 스테이지 (막히는 구간)
            </label>
            <div className="flex flex-wrap gap-2">
              {wallStages.map((stage) => (
                <div
                  key={stage}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--error-light)', color: 'var(--error)' }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>스테이지 {stage}</span>
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
                placeholder="추가..."
                className="w-20 px-2 py-1 rounded text-xs"
                style={{ background: 'var(--bg-tertiary)' }}
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
                콘텐츠 마일스톤
              </label>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                파워 보너스: 해금 시 플레이어 파워 증가율
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
                    placeholder="콘텐츠 이름"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>+</span>
                    <input
                      type="number"
                      value={data.powerBonus}
                      onChange={(e) => updateMilestonePowerBonus(Number(stage), Number(e.target.value))}
                      className="w-12 px-1 py-1 rounded text-xs text-center"
                      style={{ background: 'var(--bg-tertiary)' }}
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
                  placeholder="스테이지"
                  className="w-16 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg-tertiary)' }}
                  id="newMilestoneStage"
                />
                <input
                  type="text"
                  placeholder="해금 콘텐츠..."
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg-tertiary)' }}
                  id="newMilestoneText"
                />
                <input
                  type="number"
                  placeholder="%"
                  className="w-12 px-1 py-1 rounded text-xs text-center"
                  style={{ background: 'var(--bg-tertiary)' }}
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
                  추가
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
                예상 진행 시간 ({targetPlaytime.name} 기준)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {wallStages.map((stage) => (
                <div key={stage}>
                  스테이지 {stage}: 약 {estimatedDays[stage] || 0}일
                  {milestones[stage] && (
                    <span className="ml-1" style={{ color: 'var(--success)' }}>
                      ({milestones[stage].name} +{milestones[stage].powerBonus}%)
                    </span>
                  )}
                </div>
              ))}
              <div>
                최종 스테이지: 약 {estimatedDays[maxStage] || 0}일
              </div>
            </div>
          </div>

          {/* 도움말 */}
          {showHelp && (
            <div
              className="rounded-lg p-4 border space-y-4 animate-fadeIn"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent)' }}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  난이도 곡선 설계 사용법
                </span>
              </div>

              {/* 개요 */}
              <div className="space-y-1">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>개요</div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  난이도 곡선 설계는 게임의 스테이지 진행에 따른 플레이어와 적의 파워 밸런스를
                  시각화하고, 적절한 "벽" 구간과 콘텐츠 해금 시점을 설계하는 도구입니다.
                </p>
              </div>

              {/* 사용 방법 */}
              <div className="space-y-2">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>사용 방법</div>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>1</span>
                    <span><strong>프리셋 선택:</strong> 캐주얼/밸런스/하드코어 중 게임 성격에 맞는 것을 선택합니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>2</span>
                    <span><strong>플레이타임 설정:</strong> 목표하는 일일 플레이 시간을 설정합니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>3</span>
                    <span><strong>벽 스테이지 설정:</strong> 플레이어가 막히게 될 구간을 추가합니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ background: 'var(--accent)', color: 'white' }}>4</span>
                    <span><strong>마일스톤 설정:</strong> 각 스테이지에서 해금되는 콘텐츠를 기록합니다.</span>
                  </div>
                </div>
              </div>

              {/* 프리셋 설명 */}
              <div className="space-y-2">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>프리셋 특성</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>캐주얼</div>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      플레이어 성장 ↑<br/>
                      적 성장 ↓<br/>
                      벽 간격 넓음
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>밸런스</div>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      균등한 성장<br/>
                      적절한 도전감<br/>
                      10스테이지마다 벽
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>하드코어</div>
                    <div style={{ color: 'var(--text-tertiary)' }}>
                      플레이어 성장 ↓<br/>
                      적 성장 ↑<br/>
                      빈번한 벽
                    </div>
                  </div>
                </div>
              </div>

              {/* 그래프 읽는 법 */}
              <div className="space-y-1">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>그래프 읽는 법</div>
                <div className="flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
                    <span>플레이어 파워</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
                    <span>적 파워</span>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  파랑 바가 빨강 바보다 높으면 쉬운 구간, 빨강이 높으면 어려운 구간(벽)입니다.
                </p>
              </div>

              {/* 수식 */}
              <div className="space-y-2">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>사용 수식</div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>파워 성장 (지수 함수)</div>
                    <code className="block px-2 py-1 rounded text-[11px]" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      Power(n) = 100 × growth^(n-1)
                    </code>
                    <div className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      n: 스테이지, growth: 성장률 (캐주얼 1.12, 밸런스 1.10, 하드코어 1.08/1.12)
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>벽 스테이지 적 파워</div>
                    <code className="block px-2 py-1 rounded text-[11px]" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      EnemyPower(wall) = EnemyPower × 1.5
                    </code>
                    <div className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      벽 스테이지에서 적 파워 50% 급상승
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>마일스톤 파워 보너스</div>
                    <code className="block px-2 py-1 rounded text-[11px]" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      PlayerPower(milestone) = PlayerPower × (1 + bonus/100)
                    </code>
                    <div className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      콘텐츠 해금 시 플레이어 파워 증가 (벽 돌파 지원)
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>난이도 판정</div>
                    <code className="block px-2 py-1 rounded text-[11px]" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      Ratio = PlayerPower / EnemyPower
                    </code>
                    <div className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Ratio {'>'} 1.3: 쉬움 | 0.8~1.3: 보통 | {'<'} 0.8: 벽(어려움)
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>예상 도달 일수</div>
                    <code className="block px-2 py-1 rounded text-[11px]" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      Days = (Stage / StagesPerDay) + WallCount
                    </code>
                    <div className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      벽 하나당 +1일 추가 (막히는 시간 가정)
                    </div>
                  </div>
                </div>
              </div>

              {/* 디자인 팁 */}
              <div className="space-y-1">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>난이도 설계 팁</div>
                <ul className="text-xs space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <li>• 벽은 새 콘텐츠 해금 직전에 배치 → 기대감 유발</li>
                  <li>• 초반 10스테이지는 벽 없이 시원하게 진행</li>
                  <li>• 벽에서 막히는 시간은 30분~2시간이 적당</li>
                  <li>• 과금 유도 시점 = 벽 + 편의 기능 해금</li>
                  <li>• 일일 플레이타임 목표를 먼저 정하고 역산 설계</li>
                  <li>• 마일스톤으로 목표 의식 부여 (해금 콘텐츠 예고)</li>
                </ul>
              </div>
            </div>
          )}

          {/* 간단 도움말 (접힌 상태) */}
          {!showHelp && (
            <div
              className="rounded-lg p-3 text-xs border cursor-pointer hover:border-opacity-70 transition-colors"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
              onClick={() => setShowHelp(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>도움말 보기 (사용법, 프리셋, 설계 팁)</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
