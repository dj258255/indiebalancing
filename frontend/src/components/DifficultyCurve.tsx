'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  X,
  AlertTriangle,
  Clock,
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
const PLAYTIME_TARGETS = {
  '30min': { name: '30분/일', stagesPerDay: 10 },
  '1hr': { name: '1시간/일', stagesPerDay: 20 },
  '2hr': { name: '2시간/일', stagesPerDay: 40 },
  '4hr': { name: '4시간/일', stagesPerDay: 80 },
};

export default function DifficultyCurve({ onClose }: DifficultyCurveProps) {
  const [preset, setPreset] = useState<keyof typeof CURVE_PRESETS>('balanced');
  const [playtime, setPlaytime] = useState<keyof typeof PLAYTIME_TARGETS>('1hr');
  const [maxStage, setMaxStage] = useState(100);
  const [wallStages, setWallStages] = useState<number[]>([10, 30, 50, 100]);
  const [milestones, setMilestones] = useState<Record<number, string>>({
    10: '장비 시스템 해금',
    30: '스킬 시스템 해금',
    50: '각성 시스템 해금',
    100: '엔드게임 콘텐츠',
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
        milestone,
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

  const updateMilestone = (stage: number, text: string) => {
    if (text.trim()) {
      setMilestones({ ...milestones, [stage]: text });
    } else {
      const newMilestones = { ...milestones };
      delete newMilestones[stage];
      setMilestones(newMilestones);
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
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              일일 플레이타임 목표
            </label>
            <div className="flex gap-2">
              {Object.entries(PLAYTIME_TARGETS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setPlaytime(key as keyof typeof PLAYTIME_TARGETS)}
                  className={cn(
                    'px-3 py-1.5 rounded text-xs transition-all',
                    playtime === key ? 'font-medium' : ''
                  )}
                  style={{
                    background: playtime === key ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: playtime === key ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {value.name}
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
              {/* 그래프 */}
              <div className="absolute inset-0 flex items-end">
                {normalizedData.filter((_, i) => i % Math.ceil(maxStage / 100) === 0).map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end gap-0.5 px-[1px]"
                    style={{ height: '100%' }}
                  >
                    {/* 플레이어 파워 (파랑) */}
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${d.playerHeight}%`,
                        background: '#3b82f6',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-end">
                {normalizedData.filter((_, i) => i % Math.ceil(maxStage / 100) === 0).map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end gap-0.5 px-[1px]"
                    style={{ height: '100%' }}
                  >
                    {/* 적 파워 (빨강) */}
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${d.enemyHeight}%`,
                        background: d.type === 'wall' ? '#ef4444' : '#f87171',
                        opacity: d.type === 'wall' ? 1 : 0.5,
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
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              콘텐츠 마일스톤
            </label>
            <div className="space-y-2">
              {Object.entries(milestones).map(([stage, text]) => (
                <div key={stage} className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--success-light)', color: 'var(--success)' }}
                  >
                    {stage}
                  </span>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => updateMilestone(Number(stage), e.target.value)}
                    className="flex-1 px-2 py-1 rounded text-xs"
                    style={{ background: 'var(--bg-tertiary)' }}
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="스테이지"
                  className="w-20 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg-tertiary)' }}
                  id="newMilestoneStage"
                />
                <input
                  type="text"
                  placeholder="해금 콘텐츠..."
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{ background: 'var(--bg-tertiary)' }}
                  id="newMilestoneText"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const stageInput = document.getElementById('newMilestoneStage') as HTMLInputElement;
                      const textInput = e.target as HTMLInputElement;
                      const stage = Number(stageInput.value);
                      if (stage > 0 && textInput.value.trim()) {
                        updateMilestone(stage, textInput.value);
                        stageInput.value = '';
                        textInput.value = '';
                      }
                    }
                  }}
                />
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
                      ({milestones[stage]})
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
          <div
            className="rounded-lg p-3 text-xs border"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
          >
            <div className="font-medium mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{ background: 'var(--accent)', color: 'white' }}>?</span>
              도움말
            </div>
            <ul className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>- 벽은 새 콘텐츠 해금 직전에 배치 (기대감 유발)</li>
              <li>- 초반 10스테이지는 벽 없이 시원하게</li>
              <li>- 벽에서 막히는 시간은 30분~2시간이 적당</li>
              <li>- 과금 유도 시점 = 벽 + 편의 기능</li>
              <li>- 일일 플레이타임 목표를 먼저 정하고 역산</li>
            </ul>
          </div>
      </div>
    </div>
  );
}
