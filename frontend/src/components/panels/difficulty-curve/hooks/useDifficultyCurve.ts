/**
 * useDifficultyCurve - 난이도 커브 상태 관리 훅
 */

import { useState, useMemo, useCallback } from 'react';

// 난이도 구간 정의
export interface DifficultySegment {
  stage: number;
  playerPower: number;
  enemyPower: number;
  ratio: number;
  type: 'easy' | 'normal' | 'wall' | 'reward';
  milestone?: string;
}

export interface MilestoneData {
  name: string;
  powerBonus: number;
}

// 기본 난이도 곡선 프리셋
export const CURVE_PRESETS = {
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
export const PLAYTIME_TARGETS = {
  '30min': { name: '30분/일', stagesPerDay: 10, wallInterval: 5, targetDaysPerWall: 1 },
  '1hr': { name: '1시간/일', stagesPerDay: 20, wallInterval: 10, targetDaysPerWall: 1 },
  '2hr': { name: '2시간/일', stagesPerDay: 40, wallInterval: 20, targetDaysPerWall: 1 },
  '4hr': { name: '4시간/일', stagesPerDay: 80, wallInterval: 40, targetDaysPerWall: 1 },
};

export type PresetKey = keyof typeof CURVE_PRESETS;
export type PlaytimeKey = keyof typeof PLAYTIME_TARGETS;

export function useDifficultyCurve() {
  const [preset, setPreset] = useState<PresetKey>('balanced');
  const [playtime, setPlaytime] = useState<PlaytimeKey>('1hr');
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

  // 비율 바 호버 상태
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);

  const config = CURVE_PRESETS[preset];
  const targetPlaytime = PLAYTIME_TARGETS[playtime];

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

  // 호버된 스테이지 데이터
  const hoveredData = hoveredStage !== null ? curveData.find(d => d.stage === hoveredStage) ?? null : null;

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

  return {
    // 상태
    preset,
    setPreset,
    playtime,
    setPlaytime,
    maxStage,
    setMaxStage,
    wallStages,
    milestones,
    showFullscreen,
    setShowFullscreen,
    zoomLevel,
    panOffset,
    isPanning,
    hoveredStage,
    setHoveredStage,
    curveData,
    estimatedDays,
    hoveredData,
    config,
    targetPlaytime,
    // 액션
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    addWallStage,
    removeWallStage,
    generateRecommendedWalls,
    updateMilestone,
    updateMilestonePowerBonus,
  };
}
