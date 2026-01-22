'use client';

import { useState } from 'react';
import { BarChart3, HelpCircle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Calculator,
  ComparisonChart,
  GrowthCurveChart,
  BalanceAnalysisPanel,
  ImbalanceDetectorPanel,
  GoalSolverPanel,
  FormulaHelper,
  BalanceValidator,
  DifficultyCurve,
  SimulationPanel,
} from '@/components/panels';
import { PresetComparisonModal } from '@/components/modals';
import { ToolPanelRenderer } from '@/components/layouts';
import { TOOL_CONFIGS } from '@/config/toolConfig';
import { useToolLayoutStore } from '@/stores/toolLayoutStore';
import type { DraggableState } from '@/hooks';

// GrowthCurveChart는 헤더가 없어서 래퍼 컴포넌트로 감싸기
function GrowthCurveChartWrapper({
  onClose,
  onDragStart,
}: {
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}) {
  const t = useTranslations();
  const [showHelp, setShowHelp] = useState(false);
  const [helpHeight, setHelpHeight] = useState(100);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 cursor-grab active:cursor-grabbing"
        style={{ background: '#22c55e15', borderBottom: '1px solid #22c55e40' }}
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#22c55e' }}
          >
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: '#22c55e' }}>
            {t('growthCurve.title')}
          </h2>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1 rounded-lg transition-colors ${
              showHelp ? 'bg-[#22c55e]/20' : 'hover:bg-[var(--bg-hover)]'
            }`}
            style={{
              border: showHelp ? '1px solid #22c55e' : '1px solid var(--border-secondary)',
            }}
          >
            <HelpCircle
              className="w-4 h-4"
              style={{ color: showHelp ? '#22c55e' : 'var(--text-tertiary)' }}
            />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Help section */}
      {showHelp && (
        <div
          className="shrink-0 animate-slideDown flex flex-col"
          style={{
            height: `${helpHeight + 6}px`,
            minHeight: '66px',
            maxHeight: '256px',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <div
            className="flex-1 px-4 py-3 text-sm overflow-y-auto"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {t('growthCurve.title')}
            </div>
            <p className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('growthCurve.description')}
            </p>
            <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div>- {t('growthCurve.help')}</div>
              <div>- {t('growthCurve.help2')}</div>
              <div>- {t('growthCurve.help3')}</div>
            </div>
          </div>
          <div
            className="h-1.5 shrink-0 cursor-ns-resize hover:bg-[var(--accent)] transition-colors"
            style={{ background: 'var(--border-secondary)' }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startH = helpHeight;
              const onMouseMove = (moveEvent: MouseEvent) => {
                const newHeight = Math.max(60, Math.min(250, startH + moveEvent.clientY - startY));
                setHelpHeight(newHeight);
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <GrowthCurveChart />
      </div>
    </div>
  );
}

interface PanelState {
  show: boolean;
  setShow: (value: boolean) => void;
}

interface ToolPanelsProps {
  panelStates: Record<string, DraggableState>;
  bringToFront: (panelId: string) => void;
  createDragHandler: (panelId: string) => (e: React.MouseEvent) => void;
  createResizeHandler: (panelId: string, direction: 'e' | 's' | 'se') => (e: React.MouseEvent) => void;
  panels: {
    calculator: PanelState;
    comparison: PanelState;
    chart: PanelState;
    preset: PanelState;
    imbalance: PanelState;
    goal: PanelState;
    balance: PanelState;
    formulaHelper: PanelState;
    balanceValidator: PanelState;
    difficultyCurve: PanelState;
    simulation: PanelState;
  };
}

export default function ToolPanels({
  panelStates,
  bringToFront,
  createDragHandler,
  createResizeHandler,
  panels,
}: ToolPanelsProps) {
  const { bottomToolPositions } = useToolLayoutStore();

  // 도구의 버튼 X 좌표 가져오기 (하단 버튼의 위치)
  const getButtonX = (toolId: string): number | undefined => {
    const position = bottomToolPositions[toolId];
    return position?.x;
  };

  return (
    <>
      {/* Calculator */}
      <ToolPanelRenderer
        toolId="calculator"
        panelId="calculator"
        show={panels.calculator.show}
        panelState={panelStates.calculator}
        onBringToFront={() => bringToFront('calculator')}
        onResizeE={createResizeHandler('calculator', 'e')}
        onResizeS={createResizeHandler('calculator', 's')}
        onResizeSE={createResizeHandler('calculator', 'se')}
        defaultIndex={TOOL_CONFIGS.calculator.defaultIndex}
        buttonX={getButtonX('calculator')}
      >
        <Calculator
          onClose={() => panels.calculator.setShow(false)}
          isPanel
          onDragStart={createDragHandler('calculator')}
        />
      </ToolPanelRenderer>

      {/* Comparison */}
      <ToolPanelRenderer
        toolId="comparison"
        panelId="comparison"
        show={panels.comparison.show}
        panelState={panelStates.comparison}
        onBringToFront={() => bringToFront('comparison')}
        onResizeE={createResizeHandler('comparison', 'e')}
        onResizeS={createResizeHandler('comparison', 's')}
        onResizeSE={createResizeHandler('comparison', 'se')}
        defaultIndex={TOOL_CONFIGS.comparison.defaultIndex}
        buttonX={getButtonX('comparison')}
      >
        <ComparisonChart
          onClose={() => panels.comparison.setShow(false)}
          isPanel
          onDragStart={createDragHandler('comparison')}
        />
      </ToolPanelRenderer>

      {/* Growth Curve Chart - 헤더가 없는 컴포넌트라 래퍼로 감싸기 */}
      <ToolPanelRenderer
        toolId="chart"
        panelId="chart"
        show={panels.chart.show}
        panelState={panelStates.chart}
        onBringToFront={() => bringToFront('chart')}
        onResizeE={createResizeHandler('chart', 'e')}
        onResizeS={createResizeHandler('chart', 's')}
        onResizeSE={createResizeHandler('chart', 'se')}
        defaultIndex={TOOL_CONFIGS.chart.defaultIndex}
        buttonX={getButtonX('chart')}
      >
        <GrowthCurveChartWrapper
          onClose={() => panels.chart.setShow(false)}
          onDragStart={createDragHandler('chart')}
        />
      </ToolPanelRenderer>

      {/* Preset Comparison */}
      <ToolPanelRenderer
        toolId="presetComparison"
        panelId="preset"
        show={panels.preset.show}
        panelState={panelStates.preset}
        onBringToFront={() => bringToFront('preset')}
        onResizeE={createResizeHandler('preset', 'e')}
        onResizeS={createResizeHandler('preset', 's')}
        onResizeSE={createResizeHandler('preset', 'se')}
        defaultIndex={TOOL_CONFIGS.presetComparison.defaultIndex}
        buttonX={getButtonX('presetComparison')}
      >
        <PresetComparisonModal
          onClose={() => panels.preset.setShow(false)}
          isPanel
          onDragStart={createDragHandler('preset')}
        />
      </ToolPanelRenderer>

      {/* Imbalance Detector */}
      <ToolPanelRenderer
        toolId="imbalanceDetector"
        panelId="imbalance"
        show={panels.imbalance.show}
        panelState={panelStates.imbalance}
        onBringToFront={() => bringToFront('imbalance')}
        onResizeE={createResizeHandler('imbalance', 'e')}
        onResizeS={createResizeHandler('imbalance', 's')}
        onResizeSE={createResizeHandler('imbalance', 'se')}
        defaultIndex={TOOL_CONFIGS.imbalanceDetector.defaultIndex}
        buttonX={getButtonX('imbalanceDetector')}
      >
        <ImbalanceDetectorPanel
          onClose={() => panels.imbalance.setShow(false)}
          onDragStart={createDragHandler('imbalance')}
        />
      </ToolPanelRenderer>

      {/* Goal Solver */}
      <ToolPanelRenderer
        toolId="goalSolver"
        panelId="goal"
        show={panels.goal.show}
        panelState={panelStates.goal}
        onBringToFront={() => bringToFront('goal')}
        onResizeE={createResizeHandler('goal', 'e')}
        onResizeS={createResizeHandler('goal', 's')}
        onResizeSE={createResizeHandler('goal', 'se')}
        defaultIndex={TOOL_CONFIGS.goalSolver.defaultIndex}
        buttonX={getButtonX('goalSolver')}
      >
        <GoalSolverPanel
          onClose={() => panels.goal.setShow(false)}
          onDragStart={createDragHandler('goal')}
        />
      </ToolPanelRenderer>

      {/* Balance Analysis */}
      <ToolPanelRenderer
        toolId="balanceAnalysis"
        panelId="balance"
        show={panels.balance.show}
        panelState={panelStates.balance}
        onBringToFront={() => bringToFront('balance')}
        onResizeE={createResizeHandler('balance', 'e')}
        onResizeS={createResizeHandler('balance', 's')}
        onResizeSE={createResizeHandler('balance', 'se')}
        defaultIndex={TOOL_CONFIGS.balanceAnalysis.defaultIndex}
        buttonX={getButtonX('balanceAnalysis')}
      >
        <BalanceAnalysisPanel
          onClose={() => panels.balance.setShow(false)}
          onDragStart={createDragHandler('balance')}
        />
      </ToolPanelRenderer>

      {/* Formula Helper */}
      <ToolPanelRenderer
        toolId="formulaHelper"
        panelId="formulaHelper"
        show={panels.formulaHelper.show}
        panelState={panelStates.formulaHelper}
        onBringToFront={() => bringToFront('formulaHelper')}
        onResizeE={createResizeHandler('formulaHelper', 'e')}
        onResizeS={createResizeHandler('formulaHelper', 's')}
        onResizeSE={createResizeHandler('formulaHelper', 'se')}
        defaultIndex={TOOL_CONFIGS.formulaHelper.defaultIndex}
        buttonX={getButtonX('formulaHelper')}
      >
        <FormulaHelper onClose={() => panels.formulaHelper.setShow(false)} />
      </ToolPanelRenderer>

      {/* Balance Validator */}
      <ToolPanelRenderer
        toolId="balanceValidator"
        panelId="balanceValidator"
        show={panels.balanceValidator.show}
        panelState={panelStates.balanceValidator}
        onBringToFront={() => bringToFront('balanceValidator')}
        onResizeE={createResizeHandler('balanceValidator', 'e')}
        onResizeS={createResizeHandler('balanceValidator', 's')}
        onResizeSE={createResizeHandler('balanceValidator', 'se')}
        defaultIndex={TOOL_CONFIGS.balanceValidator.defaultIndex}
        buttonX={getButtonX('balanceValidator')}
      >
        <BalanceValidator onClose={() => panels.balanceValidator.setShow(false)} />
      </ToolPanelRenderer>

      {/* Difficulty Curve */}
      <ToolPanelRenderer
        toolId="difficultyCurve"
        panelId="difficultyCurve"
        show={panels.difficultyCurve.show}
        panelState={panelStates.difficultyCurve}
        onBringToFront={() => bringToFront('difficultyCurve')}
        onResizeE={createResizeHandler('difficultyCurve', 'e')}
        onResizeS={createResizeHandler('difficultyCurve', 's')}
        onResizeSE={createResizeHandler('difficultyCurve', 'se')}
        defaultIndex={TOOL_CONFIGS.difficultyCurve.defaultIndex}
        buttonX={getButtonX('difficultyCurve')}
      >
        <DifficultyCurve onClose={() => panels.difficultyCurve.setShow(false)} />
      </ToolPanelRenderer>

      {/* Simulation */}
      <ToolPanelRenderer
        toolId="simulation"
        panelId="simulation"
        show={panels.simulation.show}
        panelState={panelStates.simulation}
        onBringToFront={() => bringToFront('simulation')}
        onResizeE={createResizeHandler('simulation', 'e')}
        onResizeS={createResizeHandler('simulation', 's')}
        onResizeSE={createResizeHandler('simulation', 'se')}
        defaultIndex={TOOL_CONFIGS.simulation.defaultIndex}
        buttonX={getButtonX('simulation')}
      >
        <SimulationPanel onClose={() => panels.simulation.setShow(false)} />
      </ToolPanelRenderer>
    </>
  );
}
