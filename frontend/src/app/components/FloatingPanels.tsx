'use client';

import { useState } from 'react';
import { X, BarChart3, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Calculator,
  ComparisonChart,
  GrowthCurveChart,
  BalanceAnalysisPanel,
  ImbalanceDetectorPanel,
  GoalSolverPanel,
} from '@/components/panels';
import { PresetComparisonModal } from '@/components/modals';
import type { DraggableState } from '@/hooks';

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
          style={getPanelStyle('calculator')}
          onMouseDown={() => bringToFront('calculator')}
        >
          <Calculator
            onClose={() => panels.calculator.setShow(false)}
            isPanel
            onDragStart={createDragHandler('calculator')}
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
            onDragStart={createDragHandler('comparison')}
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
                  const startH = chartHelpHeight;
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const newHeight = Math.max(60, Math.min(250, startH + moveEvent.clientY - startY));
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
            onDragStart={createDragHandler('preset')}
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
            onDragStart={createDragHandler('imbalance')}
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
            onDragStart={createDragHandler('goal')}
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
            onDragStart={createDragHandler('balance')}
          />
          <ResizeHandles panelId="balance" />
        </div>
      )}
    </>
  );
}
