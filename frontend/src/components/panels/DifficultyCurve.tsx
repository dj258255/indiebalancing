'use client';

import { useEscapeKey } from '@/hooks';
import { useTranslations } from 'next-intl';
import { Settings, BarChart3, Wrench } from 'lucide-react';

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
  CurveTypeSelector,
  FlowZoneEditor,
  RestPointEditor,
  DDAEditor,
  HelpPanel,
} from './difficulty-curve/components';

// 섹션 구분선 컴포넌트
function SectionDivider({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        {title}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
    </div>
  );
}

interface DifficultyCurveProps {
  onClose?: () => void;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

export default function DifficultyCurve({ onClose, showHelp = false }: DifficultyCurveProps) {
  useEscapeKey(onClose ?? (() => {}), !!onClose);
  const t = useTranslations('difficultyCurve');

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
    // 곡선 타입
    curveType,
    setCurveType,
    sawtoothPeriod,
    setSawtoothPeriod,
    // 플로우 존
    flowZoneConfig,
    setFlowZoneConfig,
    showFlowZones,
    setShowFlowZones,
    flowZoneStats,
    // 휴식 포인트
    restPoints,
    addRestPoint,
    removeRestPoint,
    updateRestPoint,
    // DDA
    ddaConfig,
    setDDAConfig,
    ddaSimulation,
    simulateWinStreak,
    simulateLossStreak,
    resetDDASimulation,
    // 벽 스테이지 데이터
    wallData,
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
    updateWallStage,
    changeWallType,
    generateRecommendedWalls,
    updateMilestone,
    updateMilestonePowerBonus,
  } = state;

  return (
    <div className="flex flex-col h-full">
      <style>{hideSpinnerStyle}</style>

      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden flex-1 scrollbar-slim">
        {/* 도움말 섹션 */}
        {showHelp && <HelpPanel />}

        {/* ===== 섹션 1: 기본 설정 ===== */}
        <SectionDivider icon={Settings} title={t('sectionBasic')} color="#9179f2" />

        <div className="space-y-4">
          {/* 프리셋 선택 */}
          <PresetSelector preset={preset} setPreset={setPreset} />

          {/* 곡선 타입 선택 */}
          <CurveTypeSelector
            curveType={curveType}
            setCurveType={setCurveType}
            sawtoothPeriod={sawtoothPeriod}
            setSawtoothPeriod={setSawtoothPeriod}
          />

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
        </div>

        {/* ===== 섹션 2: 시각화 ===== */}
        <SectionDivider icon={BarChart3} title={t('sectionVisualization')} color="#5a9cf5" />

        {/* 플로우 존 설정 (차트에 영향) */}
        <FlowZoneEditor
          flowZoneConfig={flowZoneConfig}
          setFlowZoneConfig={setFlowZoneConfig}
          showFlowZones={showFlowZones}
          setShowFlowZones={setShowFlowZones}
          flowZoneStats={flowZoneStats}
        />

        {/* DDA 시뮬레이션 (차트에 영향) */}
        <DDAEditor
          ddaConfig={ddaConfig}
          setDDAConfig={setDDAConfig}
          ddaSimulation={ddaSimulation}
          onSimulateWin={simulateWinStreak}
          onSimulateLoss={simulateLossStreak}
          onResetSimulation={resetDDASimulation}
        />

        {/* 난이도 곡선 시각화 */}
        <DifficultyChart
          curveData={curveData}
          wallStages={wallStages}
          maxStage={maxStage}
          hoveredStage={hoveredStage}
          setHoveredStage={setHoveredStage}
          hoveredData={hoveredData}
          onShowFullscreen={() => setShowFullscreen(true)}
          showFlowZones={showFlowZones}
          restPoints={restPoints}
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
            showFlowZones={showFlowZones}
            restPoints={restPoints}
            flowZoneStats={flowZoneStats}
          />
        )}

        {/* ===== 섹션 3: 스테이지 설계 ===== */}
        <SectionDivider icon={Wrench} title={t('sectionStageDesign')} color="#3db88a" />

        <div className="space-y-4">
          {/* 벽 스테이지 설정 */}
          <WallStageEditor
            wallStages={wallStages}
            wallData={wallData}
            maxStage={maxStage}
            onAdd={addWallStage}
            onRemove={removeWallStage}
            onUpdate={updateWallStage}
            onChangeType={changeWallType}
          />

          {/* 마일스톤 설정 */}
          <MilestoneEditor
            milestones={milestones}
            onUpdate={updateMilestone}
            onUpdateBonus={updateMilestonePowerBonus}
          />

          {/* 휴식 포인트 설정 */}
          <RestPointEditor
            restPoints={restPoints}
            maxStage={maxStage}
            onAdd={addRestPoint}
            onRemove={removeRestPoint}
            onUpdate={updateRestPoint}
          />
        </div>
      </div>
    </div>
  );
}
