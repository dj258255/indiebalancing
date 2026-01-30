'use client';

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

// 훅과 컴포넌트 임포트
import { useDifficultyCurve } from './difficulty-curve/hooks';
import {
  DifficultyChart,
  FullscreenChart,
  PresetSelector,
  PlaytimeSelector,
  MaxStageSelector,
  WallStageEditor,
  MilestoneEditor,
  HelpPanel,
} from './difficulty-curve/components';

interface DifficultyCurveProps {
  onClose?: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

export default function DifficultyCurve({ onClose, showHelp = false }: DifficultyCurveProps) {
  useEscapeKey(onClose ?? (() => {}), !!onClose);

  const state = useDifficultyCurve();

  const {
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
  } = state;

  return (
    <div className="flex flex-col h-full">
      <style>{hideSpinnerStyle}</style>

      <div className="p-4 space-y-5 overflow-y-auto overflow-x-hidden flex-1 scrollbar-slim">
        {/* 도움말 섹션 */}
        {showHelp && <HelpPanel />}

        {/* 프리셋 선택 */}
        <PresetSelector preset={preset} setPreset={setPreset} />

        {/* 플레이타임 목표 + 예상 진행 시간 */}
        <PlaytimeSelector
          playtime={playtime}
          setPlaytime={setPlaytime}
          onGenerateRecommended={generateRecommendedWalls}
          wallStages={wallStages}
          estimatedDays={estimatedDays}
          maxStage={maxStage}
        />

        {/* 최대 스테이지 */}
        <MaxStageSelector maxStage={maxStage} setMaxStage={setMaxStage} />

        {/* 난이도 곡선 시각화 */}
        <DifficultyChart
          curveData={curveData}
          wallStages={wallStages}
          maxStage={maxStage}
          hoveredStage={hoveredStage}
          setHoveredStage={setHoveredStage}
          hoveredData={hoveredData}
          onShowFullscreen={() => setShowFullscreen(true)}
        />

        {/* 전체화면 모달 */}
        {showFullscreen && (
          <FullscreenChart
            curveData={curveData}
            wallStages={wallStages}
            milestones={milestones}
            maxStage={maxStage}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
            isPanning={isPanning}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            onPanStart={handlePanStart}
            onPanMove={handlePanMove}
            onPanEnd={handlePanEnd}
            onWheel={handleWheel}
            onClose={() => setShowFullscreen(false)}
          />
        )}

        {/* 벽 스테이지 설정 */}
        <WallStageEditor
          wallStages={wallStages}
          maxStage={maxStage}
          onAdd={addWallStage}
          onRemove={removeWallStage}
        />

        {/* 마일스톤 설정 */}
        <MilestoneEditor
          milestones={milestones}
          onUpdate={updateMilestone}
          onUpdateBonus={updateMilestonePowerBonus}
        />
      </div>
    </div>
  );
}
