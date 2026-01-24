'use client';

import { useState } from 'react';
import { X, BarChart3, HelpCircle, FunctionSquare, Shield, TrendingUp, Swords } from 'lucide-react';
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
import type { DraggableState } from '@/hooks';
import { useToolLayoutStore } from '@/stores/toolLayoutStore';
import { useProjectStore } from '@/stores/projectStore';

interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  color: string;
}

interface PanelState {
  show: boolean;
  setShow: (value: boolean) => void;
}

interface FloatingPanelsProps {
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
    // 하단에서 이동해온 패널 도구들
    formulaHelper: PanelState;
    balanceValidator: PanelState;
    difficultyCurve: PanelState;
    simulation: PanelState;
  };
  config: Record<string, PanelConfig>;
}

export default function FloatingPanels({
  panelStates,
  bringToFront,
  createDragHandler,
  createResizeHandler,
  panels,
  config,
}: FloatingPanelsProps) {
  const t = useTranslations();
  const [showChartHelp, setShowChartHelp] = useState(false);
  const [chartHelpHeight, setChartHelpHeight] = useState(100);

  const { toolLocations } = useToolLayoutStore();
  const { cellSelectionMode } = useProjectStore();

  // 사이드바에 있는 도구만 플로팅 패널로 표시
  const isInSidebar = (toolId: string) => toolLocations[toolId as keyof typeof toolLocations] === 'sidebar';

  const getPanelStyle = (panelId: string) => {
    const state = panelStates[panelId];
    if (!state) return {};
    return {
      left: `${state.x}px`,
      top: `${state.y}px`,
      width: `${state.width}px`,
      height: `${state.height}px`,
      zIndex: state.zIndex,
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-primary)',
      boxShadow: '4px 4px 20px rgba(0,0,0,0.15)',
    };
  };

  const ResizeHandles = ({ panelId }: { panelId: string }) => (
    <>
      <div
        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[var(--accent)]"
        onMouseDown={createResizeHandler(panelId, 'e')}
      />
      <div
        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize hover:bg-[var(--accent)]"
        onMouseDown={createResizeHandler(panelId, 's')}
      />
      <div
        className="absolute right-0 bottom-0 w-3 h-3 cursor-nwse-resize rounded-tl"
        style={{ background: 'var(--border-secondary)' }}
        onMouseDown={createResizeHandler(panelId, 'se')}
      />
    </>
  );

  return (
    <>
      {/* Calculator Panel */}
      {panels.calculator.show && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={{
            ...getPanelStyle('calculator'),
            // 셀 선택 모드일 때는 클릭이 통과하도록
            pointerEvents: cellSelectionMode.active ? 'none' : 'auto',
          }}
          onMouseDown={() => bringToFront('calculator')}
        >
          <Calculator
            onClose={() => panels.calculator.setShow(false)}
            isPanel
          />
          <ResizeHandles panelId="calculator" />
        </div>
      )}

      {/* Comparison Panel */}
      {panels.comparison.show && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('comparison')}
          onMouseDown={() => bringToFront('comparison')}
        >
          <ComparisonChart
            onClose={() => panels.comparison.setShow(false)}
            isPanel
          />
          <ResizeHandles panelId="comparison" />
        </div>
      )}

      {/* Growth Curve Chart Panel */}
      {panels.chart.show && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('chart')}
          onMouseDown={() => bringToFront('chart')}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0 relative z-20 cursor-grab active:cursor-grabbing"
            style={{ background: '#22c55e15', borderBottom: '1px solid #22c55e40' }}
            onMouseDown={createDragHandler('chart')}
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
                onClick={() => setShowChartHelp(!showChartHelp)}
                className={`p-1 rounded-lg transition-colors ${
                  showChartHelp ? 'bg-[#22c55e]/20' : 'hover:bg-[var(--bg-hover)]'
                }`}
                style={{
                  border: showChartHelp ? '1px solid #22c55e' : '1px solid var(--border-secondary)',
                }}
              >
                <HelpCircle
                  className="w-4 h-4"
                  style={{ color: showChartHelp ? '#22c55e' : 'var(--text-tertiary)' }}
                />
              </button>
            </div>
            <button
              onClick={() => panels.chart.setShow(false)}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {showChartHelp && (
            <div
              className="shrink-0 animate-slideDown flex flex-col"
              style={{
                height: `${chartHelpHeight + 6}px`,
                minHeight: '66px',
                maxHeight: '400px',
                borderBottom: '1px solid var(--border-primary)',
              }}
            >
              <div
                className="flex-1 px-4 py-3 text-sm overflow-y-auto"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('growthCurve.helpDesc')}
                </p>

                <div className="space-y-2 mb-3">
                  <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #3b82f6' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: '#3b82f6' }}>{t('growthCurve.linearHelp.name')}</span>
                      <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('growthCurve.linearHelp.formula')}</code>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('growthCurve.linearHelp.desc')}</p>
                  </div>

                  <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #ef4444' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: '#ef4444' }}>{t('growthCurve.exponentialHelp.name')}</span>
                      <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('growthCurve.exponentialHelp.formula')}</code>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('growthCurve.exponentialHelp.desc')}</p>
                  </div>

                  <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #22c55e' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: '#22c55e' }}>{t('growthCurve.logarithmicHelp.name')}</span>
                      <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('growthCurve.logarithmicHelp.formula')}</code>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('growthCurve.logarithmicHelp.desc')}</p>
                  </div>

                  <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #f59e0b' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: '#f59e0b' }}>{t('growthCurve.quadraticHelp.name')}</span>
                      <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('growthCurve.quadraticHelp.formula')}</code>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('growthCurve.quadraticHelp.desc')}</p>
                  </div>

                  <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #8b5cf6' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: '#8b5cf6' }}>{t('growthCurve.sCurveHelp.name')}</span>
                      <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('growthCurve.sCurveHelp.formula')}</code>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('growthCurve.sCurveHelp.desc')}</p>
                  </div>
                </div>

                <div className="text-xs p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                  {t('growthCurve.helpTip')}
                </div>
              </div>
              <div
                className="h-1.5 shrink-0 cursor-ns-resize hover:bg-[var(--accent)] transition-colors"
                style={{ background: 'var(--border-secondary)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startH = chartHelpHeight;
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const newHeight = Math.max(60, Math.min(350, startH + moveEvent.clientY - startY));
                    setChartHelpHeight(newHeight);
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

          <div className="flex-1 overflow-y-auto p-4">
            <GrowthCurveChart />
          </div>
          <ResizeHandles panelId="chart" />
        </div>
      )}

      {/* Preset Comparison Panel */}
      {panels.preset.show && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('preset')}
          onMouseDown={() => bringToFront('preset')}
        >
          <PresetComparisonModal
            onClose={() => panels.preset.setShow(false)}
            isPanel
          />
          <ResizeHandles panelId="preset" />
        </div>
      )}

      {/* Imbalance Detector Panel */}
      {panels.imbalance.show && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('imbalance')}
          onMouseDown={() => bringToFront('imbalance')}
        >
          <ImbalanceDetectorPanel
            onClose={() => panels.imbalance.setShow(false)}
          />
          <ResizeHandles panelId="imbalance" />
        </div>
      )}

      {/* Goal Solver Panel */}
      {panels.goal.show && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('goal')}
          onMouseDown={() => bringToFront('goal')}
        >
          <GoalSolverPanel
            onClose={() => panels.goal.setShow(false)}
          />
          <ResizeHandles panelId="goal" />
        </div>
      )}

      {/* Balance Analysis Panel */}
      {panels.balance.show && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('balance')}
          onMouseDown={() => bringToFront('balance')}
        >
          <BalanceAnalysisPanel
            onClose={() => panels.balance.setShow(false)}
          />
          <ResizeHandles panelId="balance" />
        </div>
      )}

      {/* 하단에서 사이드바로 이동한 패널 도구들 - 플로팅 패널로 표시 */}
      {/* Formula Helper Panel (사이드바에 있을 때만) */}
      {panels.formulaHelper.show && isInSidebar('formulaHelper') && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('formulaHelper')}
          onMouseDown={() => bringToFront('formulaHelper')}
        >
          <FormulaHelper
            onClose={() => panels.formulaHelper.setShow(false)}
          />
          <ResizeHandles panelId="formulaHelper" />
        </div>
      )}

      {/* Balance Validator Panel (사이드바에 있을 때만) */}
      {panels.balanceValidator.show && isInSidebar('balanceValidator') && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('balanceValidator')}
          onMouseDown={() => bringToFront('balanceValidator')}
        >
          <BalanceValidator
            onClose={() => panels.balanceValidator.setShow(false)}
          />
          <ResizeHandles panelId="balanceValidator" />
        </div>
      )}

      {/* Difficulty Curve Panel (사이드바에 있을 때만) */}
      {panels.difficultyCurve.show && isInSidebar('difficultyCurve') && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('difficultyCurve')}
          onMouseDown={() => bringToFront('difficultyCurve')}
        >
          <DifficultyCurve
            onClose={() => panels.difficultyCurve.setShow(false)}
          />
          <ResizeHandles panelId="difficultyCurve" />
        </div>
      )}

      {/* Simulation Panel (사이드바에 있을 때만) */}
      {panels.simulation.show && isInSidebar('simulation') && (
        <div
          className="fixed hidden md:flex flex-col rounded-xl overflow-hidden"
          style={getPanelStyle('simulation')}
          onMouseDown={() => bringToFront('simulation')}
        >
          <SimulationPanel
            onClose={() => panels.simulation.setShow(false)}
          />
          <ResizeHandles panelId="simulation" />
        </div>
      )}
    </>
  );
}
