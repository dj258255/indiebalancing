'use client';

import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
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
  EconomyPanel,
  DPSVariancePanel,
  CurveFittingPanel,
} from '@/components/panels';
import { PresetComparisonModal } from '@/components/modals';
import { ToolPanelRenderer } from '@/components/layouts';
import { TOOL_CONFIGS } from '@/config/toolConfig';
import type { DraggableState } from '@/hooks';

// 도움말 버튼 컴포넌트
function HelpButton({
  showHelp,
  setShowHelp,
  color,
}: {
  showHelp: boolean;
  setShowHelp: (value: boolean) => void;
  color: string;
}) {
  return (
    <button
      onClick={() => setShowHelp(!showHelp)}
      className={`p-1 rounded-lg transition-colors ${
        showHelp ? '' : 'hover:bg-[var(--bg-hover)]'
      }`}
      style={{
        background: showHelp ? `${color}20` : undefined,
        border: showHelp ? `1px solid ${color}` : '1px solid var(--border-secondary)',
      }}
    >
      <HelpCircle
        className="w-4 h-4"
        style={{ color: showHelp ? color : 'var(--text-tertiary)' }}
      />
    </button>
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
    economy: PanelState;
    dpsVariance: PanelState;
    curveFitting: PanelState;
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
  const t = useTranslations();

  // 각 패널별 도움말 상태 (패널 내부에서 관리할 수 있도록)
  const [calculatorHelp, setCalculatorHelp] = useState(false);
  const [comparisonHelp, setComparisonHelp] = useState(false);
  const [chartHelp, setChartHelp] = useState(false);
  const [presetHelp, setPresetHelp] = useState(false);
  const [imbalanceHelp, setImbalanceHelp] = useState(false);
  const [goalHelp, setGoalHelp] = useState(false);
  const [balanceAnalysisHelp, setBalanceAnalysisHelp] = useState(false);
  const [formulaHelperHelp, setFormulaHelperHelp] = useState(false);
  const [balanceValidatorHelp, setBalanceValidatorHelp] = useState(false);
  const [difficultyCurveHelp, setDifficultyCurveHelp] = useState(false);
  const [simulationHelp, setSimulationHelp] = useState(false);
  const [economyHelp, setEconomyHelp] = useState(false);
  const [dpsVarianceHelp, setDpsVarianceHelp] = useState(false);
  const [curveFittingHelp, setCurveFittingHelp] = useState(false);

  // 패널이 닫히면 도움말도 자동으로 닫기
  useEffect(() => { if (!panels.calculator.show) setCalculatorHelp(false); }, [panels.calculator.show]);
  useEffect(() => { if (!panels.comparison.show) setComparisonHelp(false); }, [panels.comparison.show]);
  useEffect(() => { if (!panels.chart.show) setChartHelp(false); }, [panels.chart.show]);
  useEffect(() => { if (!panels.preset.show) setPresetHelp(false); }, [panels.preset.show]);
  useEffect(() => { if (!panels.imbalance.show) setImbalanceHelp(false); }, [panels.imbalance.show]);
  useEffect(() => { if (!panels.goal.show) setGoalHelp(false); }, [panels.goal.show]);
  useEffect(() => { if (!panels.balance.show) setBalanceAnalysisHelp(false); }, [panels.balance.show]);
  useEffect(() => { if (!panels.formulaHelper.show) setFormulaHelperHelp(false); }, [panels.formulaHelper.show]);
  useEffect(() => { if (!panels.balanceValidator.show) setBalanceValidatorHelp(false); }, [panels.balanceValidator.show]);
  useEffect(() => { if (!panels.difficultyCurve.show) setDifficultyCurveHelp(false); }, [panels.difficultyCurve.show]);
  useEffect(() => { if (!panels.simulation.show) setSimulationHelp(false); }, [panels.simulation.show]);
  useEffect(() => { if (!panels.economy.show) setEconomyHelp(false); }, [panels.economy.show]);
  useEffect(() => { if (!panels.dpsVariance.show) setDpsVarianceHelp(false); }, [panels.dpsVariance.show]);
  useEffect(() => { if (!panels.curveFitting.show) setCurveFittingHelp(false); }, [panels.curveFitting.show]);

  return (
    <>
      {/* Calculator */}
      <ToolPanelRenderer
        toolId="calculator"
        panelId="calculator"
        show={panels.calculator.show}
        onClose={() => { panels.calculator.setShow(false); setCalculatorHelp(false); }}
        title={t('sidebar.calculator')}
        description={t(TOOL_CONFIGS.calculator.descriptionKey)}
        icon={TOOL_CONFIGS.calculator.icon}
        color={TOOL_CONFIGS.calculator.color}
        headerExtra={
          <HelpButton
            showHelp={calculatorHelp}
            setShowHelp={setCalculatorHelp}
            color={TOOL_CONFIGS.calculator.color}
          />
        }
        panelState={panelStates.calculator}
        onBringToFront={() => bringToFront('calculator')}
        onDragStart={createDragHandler('calculator')}
        onResizeE={createResizeHandler('calculator', 'e')}
        onResizeS={createResizeHandler('calculator', 's')}
        onResizeSE={createResizeHandler('calculator', 'se')}
        defaultIndex={TOOL_CONFIGS.calculator.defaultIndex}
      >
        <Calculator
          onClose={() => panels.calculator.setShow(false)}
          isPanel
          showHelp={calculatorHelp}
          setShowHelp={setCalculatorHelp}
        />
      </ToolPanelRenderer>

      {/* Comparison */}
      <ToolPanelRenderer
        toolId="comparison"
        panelId="comparison"
        show={panels.comparison.show}
        onClose={() => { panels.comparison.setShow(false); setComparisonHelp(false); }}
        title={t('sidebar.comparison')}
        description={t(TOOL_CONFIGS.comparison.descriptionKey)}
        icon={TOOL_CONFIGS.comparison.icon}
        color={TOOL_CONFIGS.comparison.color}
        headerExtra={
          <HelpButton
            showHelp={comparisonHelp}
            setShowHelp={setComparisonHelp}
            color={TOOL_CONFIGS.comparison.color}
          />
        }
        panelState={panelStates.comparison}
        onBringToFront={() => bringToFront('comparison')}
        onDragStart={createDragHandler('comparison')}
        onResizeE={createResizeHandler('comparison', 'e')}
        onResizeS={createResizeHandler('comparison', 's')}
        onResizeSE={createResizeHandler('comparison', 'se')}
        defaultIndex={TOOL_CONFIGS.comparison.defaultIndex}
      >
        <ComparisonChart
          onClose={() => panels.comparison.setShow(false)}
          isPanel
          showHelp={comparisonHelp}
          setShowHelp={setComparisonHelp}
        />
      </ToolPanelRenderer>

      {/* Growth Curve Chart */}
      <ToolPanelRenderer
        toolId="chart"
        panelId="chart"
        show={panels.chart.show}
        onClose={() => { panels.chart.setShow(false); setChartHelp(false); }}
        title={t('growthCurve.title')}
        description={t(TOOL_CONFIGS.chart.descriptionKey)}
        icon={TOOL_CONFIGS.chart.icon}
        color={TOOL_CONFIGS.chart.color}
        headerExtra={
          <HelpButton
            showHelp={chartHelp}
            setShowHelp={setChartHelp}
            color={TOOL_CONFIGS.chart.color}
          />
        }
        panelState={panelStates.chart}
        onBringToFront={() => bringToFront('chart')}
        onDragStart={createDragHandler('chart')}
        onResizeE={createResizeHandler('chart', 'e')}
        onResizeS={createResizeHandler('chart', 's')}
        onResizeSE={createResizeHandler('chart', 'se')}
        defaultIndex={TOOL_CONFIGS.chart.defaultIndex}
      >
        <GrowthCurveChart showHelp={chartHelp} setShowHelp={setChartHelp} onClose={() => { panels.chart.setShow(false); setChartHelp(false); }} />
      </ToolPanelRenderer>

      {/* Preset Comparison */}
      <ToolPanelRenderer
        toolId="presetComparison"
        panelId="preset"
        show={panels.preset.show}
        onClose={() => { panels.preset.setShow(false); setPresetHelp(false); }}
        title={t('sidebar.presetComparison')}
        description={t(TOOL_CONFIGS.presetComparison.descriptionKey)}
        icon={TOOL_CONFIGS.presetComparison.icon}
        color={TOOL_CONFIGS.presetComparison.color}
        headerExtra={
          <HelpButton
            showHelp={presetHelp}
            setShowHelp={setPresetHelp}
            color={TOOL_CONFIGS.presetComparison.color}
          />
        }
        panelState={panelStates.preset}
        onBringToFront={() => bringToFront('preset')}
        onDragStart={createDragHandler('preset')}
        onResizeE={createResizeHandler('preset', 'e')}
        onResizeS={createResizeHandler('preset', 's')}
        onResizeSE={createResizeHandler('preset', 'se')}
        defaultIndex={TOOL_CONFIGS.presetComparison.defaultIndex}
      >
        <PresetComparisonModal
          onClose={() => panels.preset.setShow(false)}
          isPanel
          showHelp={presetHelp}
          setShowHelp={setPresetHelp}
        />
      </ToolPanelRenderer>

      {/* Imbalance Detector */}
      <ToolPanelRenderer
        toolId="imbalanceDetector"
        panelId="imbalance"
        show={panels.imbalance.show}
        onClose={() => { panels.imbalance.setShow(false); setImbalanceHelp(false); }}
        title={t('sidebar.imbalanceDetector')}
        description={t(TOOL_CONFIGS.imbalanceDetector.descriptionKey)}
        icon={TOOL_CONFIGS.imbalanceDetector.icon}
        color={TOOL_CONFIGS.imbalanceDetector.color}
        headerExtra={
          <HelpButton
            showHelp={imbalanceHelp}
            setShowHelp={setImbalanceHelp}
            color={TOOL_CONFIGS.imbalanceDetector.color}
          />
        }
        panelState={panelStates.imbalance}
        onBringToFront={() => bringToFront('imbalance')}
        onDragStart={createDragHandler('imbalance')}
        onResizeE={createResizeHandler('imbalance', 'e')}
        onResizeS={createResizeHandler('imbalance', 's')}
        onResizeSE={createResizeHandler('imbalance', 'se')}
        defaultIndex={TOOL_CONFIGS.imbalanceDetector.defaultIndex}
      >
        <ImbalanceDetectorPanel
          onClose={() => panels.imbalance.setShow(false)}
          showHelp={imbalanceHelp}
          setShowHelp={setImbalanceHelp}
        />
      </ToolPanelRenderer>

      {/* Goal Solver */}
      <ToolPanelRenderer
        toolId="goalSolver"
        panelId="goal"
        show={panels.goal.show}
        onClose={() => { panels.goal.setShow(false); setGoalHelp(false); }}
        title={t('sidebar.goalSolver')}
        description={t(TOOL_CONFIGS.goalSolver.descriptionKey)}
        icon={TOOL_CONFIGS.goalSolver.icon}
        color={TOOL_CONFIGS.goalSolver.color}
        headerExtra={
          <HelpButton
            showHelp={goalHelp}
            setShowHelp={setGoalHelp}
            color={TOOL_CONFIGS.goalSolver.color}
          />
        }
        panelState={panelStates.goal}
        onBringToFront={() => bringToFront('goal')}
        onDragStart={createDragHandler('goal')}
        onResizeE={createResizeHandler('goal', 'e')}
        onResizeS={createResizeHandler('goal', 's')}
        onResizeSE={createResizeHandler('goal', 'se')}
        defaultIndex={TOOL_CONFIGS.goalSolver.defaultIndex}
      >
        <GoalSolverPanel
          onClose={() => panels.goal.setShow(false)}
          showHelp={goalHelp}
          setShowHelp={setGoalHelp}
        />
      </ToolPanelRenderer>

      {/* Balance Analysis */}
      <ToolPanelRenderer
        toolId="balanceAnalysis"
        panelId="balance"
        show={panels.balance.show}
        onClose={() => { panels.balance.setShow(false); setBalanceAnalysisHelp(false); }}
        title={t('sidebar.balanceAnalysis')}
        description={t(TOOL_CONFIGS.balanceAnalysis.descriptionKey)}
        icon={TOOL_CONFIGS.balanceAnalysis.icon}
        color={TOOL_CONFIGS.balanceAnalysis.color}
        headerExtra={
          <HelpButton
            showHelp={balanceAnalysisHelp}
            setShowHelp={setBalanceAnalysisHelp}
            color={TOOL_CONFIGS.balanceAnalysis.color}
          />
        }
        panelState={panelStates.balance}
        onBringToFront={() => bringToFront('balance')}
        onDragStart={createDragHandler('balance')}
        onResizeE={createResizeHandler('balance', 'e')}
        onResizeS={createResizeHandler('balance', 's')}
        onResizeSE={createResizeHandler('balance', 'se')}
        defaultIndex={TOOL_CONFIGS.balanceAnalysis.defaultIndex}
      >
        <BalanceAnalysisPanel
          onClose={() => panels.balance.setShow(false)}
          showHelp={balanceAnalysisHelp}
          setShowHelp={setBalanceAnalysisHelp}
        />
      </ToolPanelRenderer>

      {/* Economy */}
      <ToolPanelRenderer
        toolId="economy"
        panelId="economy"
        show={panels.economy.show}
        onClose={() => { panels.economy.setShow(false); setEconomyHelp(false); }}
        title={t('sidebar.economy')}
        description={t(TOOL_CONFIGS.economy.descriptionKey)}
        icon={TOOL_CONFIGS.economy.icon}
        color={TOOL_CONFIGS.economy.color}
        headerExtra={
          <HelpButton
            showHelp={economyHelp}
            setShowHelp={setEconomyHelp}
            color={TOOL_CONFIGS.economy.color}
          />
        }
        panelState={panelStates.economy}
        onBringToFront={() => bringToFront('economy')}
        onDragStart={createDragHandler('economy')}
        onResizeE={createResizeHandler('economy', 'e')}
        onResizeS={createResizeHandler('economy', 's')}
        onResizeSE={createResizeHandler('economy', 'se')}
        defaultIndex={TOOL_CONFIGS.economy.defaultIndex}
      >
        <EconomyPanel
          showHelp={economyHelp}
          setShowHelp={setEconomyHelp}
          onClose={() => { panels.economy.setShow(false); setEconomyHelp(false); }}
        />
      </ToolPanelRenderer>

      {/* DPS Variance */}
      <ToolPanelRenderer
        toolId="dpsVariance"
        panelId="dpsVariance"
        show={panels.dpsVariance.show}
        onClose={() => { panels.dpsVariance.setShow(false); setDpsVarianceHelp(false); }}
        title={t('sidebar.dpsVariance')}
        description={t(TOOL_CONFIGS.dpsVariance.descriptionKey)}
        icon={TOOL_CONFIGS.dpsVariance.icon}
        color={TOOL_CONFIGS.dpsVariance.color}
        headerExtra={
          <HelpButton
            showHelp={dpsVarianceHelp}
            setShowHelp={setDpsVarianceHelp}
            color={TOOL_CONFIGS.dpsVariance.color}
          />
        }
        panelState={panelStates.dpsVariance}
        onBringToFront={() => bringToFront('dpsVariance')}
        onDragStart={createDragHandler('dpsVariance')}
        onResizeE={createResizeHandler('dpsVariance', 'e')}
        onResizeS={createResizeHandler('dpsVariance', 's')}
        onResizeSE={createResizeHandler('dpsVariance', 'se')}
        defaultIndex={TOOL_CONFIGS.dpsVariance.defaultIndex}
      >
        <DPSVariancePanel
          onClose={() => panels.dpsVariance.setShow(false)}
          isPanel
          showHelp={dpsVarianceHelp}
          setShowHelp={setDpsVarianceHelp}
        />
      </ToolPanelRenderer>

      {/* Curve Fitting */}
      <ToolPanelRenderer
        toolId="curveFitting"
        panelId="curveFitting"
        show={panels.curveFitting.show}
        onClose={() => { panels.curveFitting.setShow(false); setCurveFittingHelp(false); }}
        title={t('sidebar.curveFitting')}
        description={t(TOOL_CONFIGS.curveFitting.descriptionKey)}
        icon={TOOL_CONFIGS.curveFitting.icon}
        color={TOOL_CONFIGS.curveFitting.color}
        headerExtra={
          <HelpButton
            showHelp={curveFittingHelp}
            setShowHelp={setCurveFittingHelp}
            color={TOOL_CONFIGS.curveFitting.color}
          />
        }
        panelState={panelStates.curveFitting}
        onBringToFront={() => bringToFront('curveFitting')}
        onDragStart={createDragHandler('curveFitting')}
        onResizeE={createResizeHandler('curveFitting', 'e')}
        onResizeS={createResizeHandler('curveFitting', 's')}
        onResizeSE={createResizeHandler('curveFitting', 'se')}
        defaultIndex={TOOL_CONFIGS.curveFitting.defaultIndex}
      >
        <CurveFittingPanel
          onClose={() => panels.curveFitting.setShow(false)}
          showHelp={curveFittingHelp}
          setShowHelp={setCurveFittingHelp}
        />
      </ToolPanelRenderer>

      {/* Formula Helper */}
      <ToolPanelRenderer
        toolId="formulaHelper"
        panelId="formulaHelper"
        show={panels.formulaHelper.show}
        onClose={() => { panels.formulaHelper.setShow(false); setFormulaHelperHelp(false); }}
        title={t('bottomTabs.formulaHelper')}
        description={t(TOOL_CONFIGS.formulaHelper.descriptionKey)}
        icon={TOOL_CONFIGS.formulaHelper.icon}
        color={TOOL_CONFIGS.formulaHelper.color}
        headerExtra={
          <HelpButton
            showHelp={formulaHelperHelp}
            setShowHelp={setFormulaHelperHelp}
            color={TOOL_CONFIGS.formulaHelper.color}
          />
        }
        panelState={panelStates.formulaHelper}
        onBringToFront={() => bringToFront('formulaHelper')}
        onDragStart={createDragHandler('formulaHelper')}
        onResizeE={createResizeHandler('formulaHelper', 'e')}
        onResizeS={createResizeHandler('formulaHelper', 's')}
        onResizeSE={createResizeHandler('formulaHelper', 'se')}
        defaultIndex={TOOL_CONFIGS.formulaHelper.defaultIndex}
      >
        <FormulaHelper
          onClose={() => panels.formulaHelper.setShow(false)}
          showHelp={formulaHelperHelp}
          setShowHelp={setFormulaHelperHelp}
        />
      </ToolPanelRenderer>

      {/* Balance Validator */}
      <ToolPanelRenderer
        toolId="balanceValidator"
        panelId="balanceValidator"
        show={panels.balanceValidator.show}
        onClose={() => { panels.balanceValidator.setShow(false); setBalanceValidatorHelp(false); }}
        title={t('bottomTabs.balanceValidator')}
        description={t(TOOL_CONFIGS.balanceValidator.descriptionKey)}
        icon={TOOL_CONFIGS.balanceValidator.icon}
        color={TOOL_CONFIGS.balanceValidator.color}
        headerExtra={
          <HelpButton
            showHelp={balanceValidatorHelp}
            setShowHelp={setBalanceValidatorHelp}
            color={TOOL_CONFIGS.balanceValidator.color}
          />
        }
        panelState={panelStates.balanceValidator}
        onBringToFront={() => bringToFront('balanceValidator')}
        onDragStart={createDragHandler('balanceValidator')}
        onResizeE={createResizeHandler('balanceValidator', 'e')}
        onResizeS={createResizeHandler('balanceValidator', 's')}
        onResizeSE={createResizeHandler('balanceValidator', 'se')}
        defaultIndex={TOOL_CONFIGS.balanceValidator.defaultIndex}
      >
        <BalanceValidator
          onClose={() => panels.balanceValidator.setShow(false)}
          showHelp={balanceValidatorHelp}
          setShowHelp={setBalanceValidatorHelp}
        />
      </ToolPanelRenderer>

      {/* Difficulty Curve */}
      <ToolPanelRenderer
        toolId="difficultyCurve"
        panelId="difficultyCurve"
        show={panels.difficultyCurve.show}
        onClose={() => { panels.difficultyCurve.setShow(false); setDifficultyCurveHelp(false); }}
        title={t('bottomTabs.difficultyCurve')}
        description={t(TOOL_CONFIGS.difficultyCurve.descriptionKey)}
        icon={TOOL_CONFIGS.difficultyCurve.icon}
        color={TOOL_CONFIGS.difficultyCurve.color}
        headerExtra={
          <HelpButton
            showHelp={difficultyCurveHelp}
            setShowHelp={setDifficultyCurveHelp}
            color={TOOL_CONFIGS.difficultyCurve.color}
          />
        }
        panelState={panelStates.difficultyCurve}
        onBringToFront={() => bringToFront('difficultyCurve')}
        onDragStart={createDragHandler('difficultyCurve')}
        onResizeE={createResizeHandler('difficultyCurve', 'e')}
        onResizeS={createResizeHandler('difficultyCurve', 's')}
        onResizeSE={createResizeHandler('difficultyCurve', 'se')}
        defaultIndex={TOOL_CONFIGS.difficultyCurve.defaultIndex}
      >
        <DifficultyCurve
          onClose={() => panels.difficultyCurve.setShow(false)}
          showHelp={difficultyCurveHelp}
          setShowHelp={setDifficultyCurveHelp}
        />
      </ToolPanelRenderer>

      {/* Simulation */}
      <ToolPanelRenderer
        toolId="simulation"
        panelId="simulation"
        show={panels.simulation.show}
        onClose={() => { panels.simulation.setShow(false); setSimulationHelp(false); }}
        title={t('bottomTabs.simulation')}
        description={t(TOOL_CONFIGS.simulation.descriptionKey)}
        icon={TOOL_CONFIGS.simulation.icon}
        color={TOOL_CONFIGS.simulation.color}
        headerExtra={
          <HelpButton
            showHelp={simulationHelp}
            setShowHelp={setSimulationHelp}
            color={TOOL_CONFIGS.simulation.color}
          />
        }
        panelState={panelStates.simulation}
        onBringToFront={() => bringToFront('simulation')}
        onDragStart={createDragHandler('simulation')}
        onResizeE={createResizeHandler('simulation', 'e')}
        onResizeS={createResizeHandler('simulation', 's')}
        onResizeSE={createResizeHandler('simulation', 'se')}
        defaultIndex={TOOL_CONFIGS.simulation.defaultIndex}
      >
        <SimulationPanel
          onClose={() => panels.simulation.setShow(false)}
          showHelp={simulationHelp}
          setShowHelp={setSimulationHelp}
        />
      </ToolPanelRenderer>
    </>
  );
}
