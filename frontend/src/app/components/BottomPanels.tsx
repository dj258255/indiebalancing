'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  FormulaHelper,
  BalanceValidator,
  DifficultyCurve,
  SimulationPanel,
  Calculator,
  ComparisonChart,
  GrowthCurveChart,
  BalanceAnalysisPanel,
  ImbalanceDetectorPanel,
  GoalSolverPanel,
} from '@/components/panels';
import { PresetComparisonModal } from '@/components/modals';
import { useToolLayoutStore, AllToolId } from '@/stores/toolLayoutStore';

interface BottomPanelsProps {
  show: {
    formulaHelper: boolean;
    balanceValidator: boolean;
    difficultyCurve: boolean;
    simulation: boolean;
    // 사이드바에서 이동해온 도구들
    calculator: boolean;
    comparison: boolean;
    chart: boolean;
    presetComparison: boolean;
    imbalanceDetector: boolean;
    goalSolver: boolean;
    balanceAnalysis: boolean;
  };
  setShow: {
    formulaHelper: (value: boolean) => void;
    balanceValidator: (value: boolean) => void;
    difficultyCurve: (value: boolean) => void;
    simulation: (value: boolean) => void;
    // 사이드바에서 이동해온 도구들
    calculator: (value: boolean) => void;
    comparison: (value: boolean) => void;
    chart: (value: boolean) => void;
    presetComparison: (value: boolean) => void;
    imbalanceDetector: (value: boolean) => void;
    goalSolver: (value: boolean) => void;
    balanceAnalysis: (value: boolean) => void;
  };
}

type PanelId = 'formulaHelper' | 'balanceValidator' | 'difficultyCurve' | 'simulation' | 'calculator' | 'comparison' | 'chart' | 'presetComparison' | 'imbalanceDetector' | 'goalSolver' | 'balanceAnalysis';

interface PanelSize {
  width: number;
  height: number;
  left: number; // 절대 위치
}

type InteractionMode =
  | { type: 'resize'; panelId: PanelId; direction: 'horizontal' | 'vertical' | 'both' | 'horizontal-left' | 'both-left' }
  | { type: 'drag'; panelId: PanelId };

const SIDEBAR_WIDTH = 224;
const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 400;

const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 800;
const MIN_LEFT = 50; // 최소 좌측 위치

// 패널별 기본 위치 (순서대로)
const getDefaultPanelSize = (index: number): PanelSize => ({
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  left: SIDEBAR_WIDTH + index * DEFAULT_WIDTH,
});

export default function BottomPanels({ show, setShow }: BottomPanelsProps) {
  const { toolLocations } = useToolLayoutStore();

  // 하단에 있는 도구만 하단 패널로 표시
  const isInBottom = (toolId: AllToolId) => toolLocations[toolId] === 'bottom';

  // 각 패널의 크기 및 위치 상태
  const [panelSizes, setPanelSizes] = useState<Record<PanelId, PanelSize>>({
    formulaHelper: getDefaultPanelSize(0),
    balanceValidator: getDefaultPanelSize(1),
    difficultyCurve: getDefaultPanelSize(2),
    simulation: getDefaultPanelSize(3),
    // 사이드바에서 이동해온 도구들
    calculator: getDefaultPanelSize(4),
    comparison: getDefaultPanelSize(5),
    chart: getDefaultPanelSize(6),
    presetComparison: getDefaultPanelSize(7),
    imbalanceDetector: getDefaultPanelSize(8),
    goalSolver: getDefaultPanelSize(9),
    balanceAnalysis: getDefaultPanelSize(10),
  });

  // 상호작용 상태 (리사이징 또는 드래그)
  const [interaction, setInteraction] = useState<InteractionMode | null>(null);

  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef<PanelSize>({ width: 0, height: 0, left: 0 });

  // 리사이즈 핸들러
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    panelId: PanelId,
    direction: 'horizontal' | 'vertical' | 'both' | 'horizontal-left' | 'both-left'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setInteraction({ type: 'resize', panelId, direction });
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...panelSizes[panelId] };
  }, [panelSizes]);

  // 드래그 핸들러
  const handleDragStart = useCallback((
    e: React.MouseEvent,
    panelId: PanelId
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setInteraction({ type: 'drag', panelId });
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...panelSizes[panelId] };
  }, [panelSizes]);

  useEffect(() => {
    if (!interaction) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = startPos.current.y - e.clientY;

      setPanelSizes(prev => {
        const newSize = { ...prev[interaction.panelId] };

        if (interaction.type === 'drag') {
          // 드래그: left만 변경
          const maxLeft = window.innerWidth - newSize.width - 10;
          newSize.left = Math.max(MIN_LEFT, Math.min(maxLeft, startSize.current.left + deltaX));
        } else {
          // 리사이즈
          if (interaction.direction === 'horizontal' || interaction.direction === 'both') {
            newSize.width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startSize.current.width + deltaX));
          }
          if (interaction.direction === 'horizontal-left' || interaction.direction === 'both-left') {
            const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startSize.current.width - deltaX));
            const widthDelta = newWidth - startSize.current.width;
            newSize.width = newWidth;
            newSize.left = startSize.current.left - widthDelta;
          }
          if (interaction.direction === 'vertical' || interaction.direction === 'both' || interaction.direction === 'both-left') {
            newSize.height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startSize.current.height + deltaY));
          }
        }

        return { ...prev, [interaction.panelId]: newSize };
      });
    };

    const handleMouseUp = () => {
      setInteraction(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction]);

  const panelBaseStyle = {
    background: 'var(--bg-primary)',
    borderTop: '1px solid var(--border-primary)',
    borderLeft: '1px solid var(--border-primary)',
    borderRight: '1px solid var(--border-primary)',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  };

  const renderPanel = (panelId: PanelId, Component: React.ComponentType<{ onClose: () => void }>, onClose: () => void, toolId?: AllToolId) => {
    // toolId가 지정되면 해당 도구가 하단에 있을 때만 표시
    if (toolId && !isInBottom(toolId)) return null;
    if (!show[panelId]) return null;

    const size = panelSizes[panelId];
    const isDragging = interaction?.type === 'drag' && interaction.panelId === panelId;

    return (
      <div
        key={panelId}
        className="fixed bottom-0 z-30 hidden md:flex flex-col"
        style={{
          ...panelBaseStyle,
          left: `${size.left}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          zIndex: isDragging ? 35 : 30,
        }}
      >
        {/* 헤더 드래그 영역 (상단 전체, X 버튼 제외) */}
        <div
          className="absolute top-0 left-0 right-8 h-10 cursor-grab active:cursor-grabbing z-20"
          onMouseDown={(e) => handleDragStart(e, panelId)}
        />

        {/* 상단 리사이즈 핸들 (세로) */}
        <div
          className="absolute -top-1 left-3 right-3 h-2 cursor-ns-resize z-10 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, panelId, 'vertical')}
        />

        {/* 좌측 리사이즈 핸들 (가로) */}
        <div
          className="absolute top-3 -left-1 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, panelId, 'horizontal-left')}
        />

        {/* 우측 리사이즈 핸들 (가로) */}
        <div
          className="absolute top-3 -right-1 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-[var(--accent)]/20 transition-colors"
          onMouseDown={(e) => handleResizeStart(e, panelId, 'horizontal')}
        />

        {/* 좌측 상단 코너 리사이즈 핸들 (대각선) */}
        <div
          className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize z-20 hover:bg-[var(--accent)]/30 rounded-tl-xl transition-colors"
          onMouseDown={(e) => handleResizeStart(e, panelId, 'both-left')}
        />

        {/* 우측 상단 코너 리사이즈 핸들 (대각선) */}
        <div
          className="absolute -top-1 -right-1 w-4 h-4 cursor-nesw-resize z-20 hover:bg-[var(--accent)]/30 rounded-tr-xl transition-colors"
          onMouseDown={(e) => handleResizeStart(e, panelId, 'both')}
        />

        {/* 패널 컨텐츠 */}
        <div className="flex-1 overflow-hidden">
          <Component onClose={onClose} />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 상호작용 중 오버레이 */}
      {interaction && (
        <div
          className="fixed inset-0 z-40"
          style={{ cursor: interaction.type === 'drag' ? 'grabbing' : undefined }}
        />
      )}

      {/* 기본 패널 도구들 (하단에 있을 때만 표시) */}
      {renderPanel('formulaHelper', FormulaHelper, () => setShow.formulaHelper(false), 'formulaHelper')}
      {renderPanel('balanceValidator', BalanceValidator, () => setShow.balanceValidator(false), 'balanceValidator')}
      {renderPanel('difficultyCurve', DifficultyCurve, () => setShow.difficultyCurve(false), 'difficultyCurve')}
      {renderPanel('simulation', SimulationPanel, () => setShow.simulation(false), 'simulation')}

      {/* 사이드바에서 하단으로 이동한 도구들 */}
      {renderPanel('calculator', Calculator as React.ComponentType<{ onClose: () => void }>, () => setShow.calculator(false), 'calculator')}
      {renderPanel('comparison', ComparisonChart as React.ComponentType<{ onClose: () => void }>, () => setShow.comparison(false), 'comparison')}
      {renderPanel('chart', GrowthCurveChart as React.ComponentType<{ onClose: () => void }>, () => setShow.chart(false), 'chart')}
      {renderPanel('presetComparison', PresetComparisonModal as React.ComponentType<{ onClose: () => void }>, () => setShow.presetComparison(false), 'presetComparison')}
      {renderPanel('imbalanceDetector', ImbalanceDetectorPanel as React.ComponentType<{ onClose: () => void }>, () => setShow.imbalanceDetector(false), 'imbalanceDetector')}
      {renderPanel('goalSolver', GoalSolverPanel as React.ComponentType<{ onClose: () => void }>, () => setShow.goalSolver(false), 'goalSolver')}
      {renderPanel('balanceAnalysis', BalanceAnalysisPanel as React.ComponentType<{ onClose: () => void }>, () => setShow.balanceAnalysis(false), 'balanceAnalysis')}
    </>
  );
}
