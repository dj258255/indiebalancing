'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/stores/projectStore';
import { useHistoryStore } from '@/stores/historyStore';
import { usePanelManager, useProjectHistory } from '@/hooks';
import {
  loadProjects,
  saveAllProjects,
  startAutoSave,
  stopAutoSave,
  startAutoBackup,
  stopAutoBackup,
} from '@/lib/storage';

// Layout components
import { Sidebar, SheetTabs } from '@/components/layout';

// Sheet components
import { SheetTable, StickerLayer } from '@/components/sheet';

// Modal components
import {
  SettingsModal,
  ReferencesModal,
  OnboardingGuide,
  useOnboardingStatus,
  ExportModal,
  ImportModal,
} from '@/components/modals';

// Panel components
import {
  Calculator,
  ComparisonChart,
  GrowthCurveChart,
  BalanceAnalysisPanel,
  BalanceValidator,
  ImbalanceDetectorPanel,
  GoalSolverPanel,
  DifficultyCurve,
  SimulationPanel,
  FormulaHelper,
} from '@/components/panels';

// UI components
import { DraggablePanel } from '@/components/ui';

// Sub-components
import LoadingScreen from './components/LoadingScreen';
import WelcomeScreen from './components/WelcomeScreen';
import MobileHeader from './components/MobileHeader';
import MobileSidebar from './components/MobileSidebar';
import SheetHeader from './components/SheetHeader';
import BottomToolbar from './components/BottomToolbar';
import EmptySheetView from './components/EmptySheetView';
import MobilePanels from './components/MobilePanels';
import ToolPanels from './components/ToolPanels';
import SidebarResizer from './components/SidebarResizer';
import TrashDropZone from './components/TrashDropZone';

// Panel configuration
const PANEL_CONFIG = {
  calculator: { x: 270, y: 16, width: 380, height: 480, zIndex: 30, color: '#8b5cf6' },
  comparison: { x: 300, y: 46, width: 400, height: 500, zIndex: 30, color: '#3b82f6' },
  chart: { x: 330, y: 76, width: 420, height: 450, zIndex: 30, color: '#22c55e' },
  preset: { x: 360, y: 106, width: 450, height: 520, zIndex: 30, color: '#f97316' },
  imbalance: { x: 390, y: 136, width: 400, height: 480, zIndex: 30, color: '#eab308' },
  goal: { x: 420, y: 166, width: 380, height: 450, zIndex: 30, color: '#14b8a6' },
  balance: { x: 450, y: 196, width: 420, height: 500, zIndex: 30, color: '#ec4899' },
  economy: { x: 480, y: 226, width: 400, height: 520, zIndex: 30, color: '#f59e0b' },
  dpsVariance: { x: 510, y: 256, width: 420, height: 550, zIndex: 30, color: '#f97316' },
  curveFitting: { x: 540, y: 286, width: 500, height: 600, zIndex: 30, color: '#6366f1' },
  // 하단 패널 도구들 (사이드바로 이동했을 때 플로팅 패널로 표시)
  formulaHelper: { x: 280, y: 56, width: 400, height: 500, zIndex: 30, color: '#3b82f6' },
  balanceValidator: { x: 310, y: 86, width: 420, height: 520, zIndex: 30, color: '#22c55e' },
  difficultyCurve: { x: 340, y: 116, width: 450, height: 480, zIndex: 30, color: '#8b5cf6' },
  simulation: { x: 370, y: 146, width: 480, height: 550, zIndex: 30, color: '#ef4444' },
};

export default function Home() {
  const t = useTranslations();

  // Store
  const {
    projects,
    currentProjectId,
    currentSheetId,
    loadProjects: setProjects,
    setLastSaved,
    createSheet,
    addSticker,
    addColumn,
    addRow,
    updateCell,
  } = useProjectStore();

  // History
  const {
    handleUndo,
    handleRedo,
    handleHistoryJump,
    canUndo,
    canRedo,
    getHistory,
    saveToHistory,
    isUndoRedoAction,
    prevProjectsRef,
  } = useProjectHistory();
  const { pushState } = useHistoryStore();

  // Panel manager
  const {
    panelStates,
    bringToFront,
    createDragHandler,
    createResizeHandler,
    getDraggingPanel,
    resetPanelPosition,
  } = usePanelManager({
    panels: ['calculator', 'comparison', 'chart', 'preset', 'imbalance', 'goal', 'balance', 'economy', 'dpsVariance', 'curveFitting', 'formulaHelper', 'balanceValidator', 'difficultyCurve', 'simulation'],
    initialStates: Object.fromEntries(
      Object.entries(PANEL_CONFIG).map(([key, config]) => [
        key,
        { x: config.x, y: config.y, width: config.width, height: config.height, zIndex: config.zIndex },
      ])
    ),
  });

  // 드래그 중인 패널 ID를 ref로 추적
  const draggingPanelRef = useRef<string | null>(null);

  // 드래그 이벤트 리스너로 패널 ID 추적
  useEffect(() => {
    const handleDragStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ panelId: string }>;
      draggingPanelRef.current = customEvent.detail?.panelId || null;
    };

    const handleDragEnd = () => {
      draggingPanelRef.current = null;
    };

    window.addEventListener('panel-drag-start', handleDragStart);
    window.addEventListener('panel-drag-end', handleDragEnd);

    return () => {
      window.removeEventListener('panel-drag-start', handleDragStart);
      window.removeEventListener('panel-drag-end', handleDragEnd);
    };
  }, []);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Modal state
  const [showSettings, setShowSettings] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { showOnboarding, setShowOnboarding } = useOnboardingStatus();

  // Floating panel state
  const [showCalculator, setShowCalculator] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showPresetComparison, setShowPresetComparison] = useState(false);
  const [showImbalanceDetector, setShowImbalanceDetector] = useState(false);
  const [showGoalSolver, setShowGoalSolver] = useState(false);
  const [showBalanceAnalysis, setShowBalanceAnalysis] = useState(false);
  const [showEconomy, setShowEconomy] = useState(false);
  const [showDpsVariance, setShowDpsVariance] = useState(false);
  const [showCurveFitting, setShowCurveFitting] = useState(false);

  // Bottom panel state
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);
  const [showBalanceValidator, setShowBalanceValidator] = useState(false);
  const [showDifficultyCurve, setShowDifficultyCurve] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  // Refs
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentProject = projects.find((p) => p.id === currentProjectId) || null;
  const currentSheet = currentProject?.sheets.find((s) => s.id === currentSheetId) || null;
  const isModalOpen = showOnboarding || showReferences || showExportModal || showImportModal;

  // Initial data load
  useEffect(() => {
    const init = async () => {
      try {
        const savedProjects = await loadProjects();
        if (savedProjects.length > 0) {
          setProjects(savedProjects);
          pushState(savedProjects, t('history.initialLoad'));
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [setProjects, pushState, t]);

  // Auto save setup
  useEffect(() => {
    if (!isLoading) {
      startAutoSave(
        () => useProjectStore.getState().projects,
        () => setLastSaved(Date.now()),
        30000
      );
      startAutoBackup(
        () => useProjectStore.getState().projects,
        () => console.log('Backup created'),
        300000
      );
      return () => {
        stopAutoSave();
        stopAutoBackup();
      };
    }
  }, [isLoading, setLastSaved]);

  // Save on project change
  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      const timeout = setTimeout(() => {
        saveAllProjects(projects);
        setLastSaved(Date.now());
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [projects, isLoading, setLastSaved]);

  // Save to history on project change
  useEffect(() => {
    if (!isLoading && projects.length > 0 && !isUndoRedoAction.current) {
      const timeout = setTimeout(() => {
        saveToHistory(projects);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [projects, isLoading, saveToHistory, isUndoRedoAction]);

  // History panel outside click
  useEffect(() => {
    if (!showHistoryPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-history-panel]')) {
        setShowHistoryPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHistoryPanel]);

  // Sidebar callbacks - 패널 열 때 위치 초기화
  const sidebarCallbacks = {
    onShowChart: () => {
      if (!showChart) resetPanelPosition('chart');
      setShowChart(!showChart);
    },
    onShowHelp: () => setShowOnboarding(true),
    onShowCalculator: () => {
      if (!showCalculator) resetPanelPosition('calculator');
      setShowCalculator(!showCalculator);
    },
    onShowComparison: () => {
      if (!showComparison) resetPanelPosition('comparison');
      setShowComparison(!showComparison);
    },
    onShowReferences: () => setShowReferences(true),
    onShowPresetComparison: () => {
      if (!showPresetComparison) resetPanelPosition('preset');
      setShowPresetComparison(!showPresetComparison);
    },
    onShowImbalanceDetector: () => {
      if (!showImbalanceDetector) resetPanelPosition('imbalance');
      setShowImbalanceDetector(!showImbalanceDetector);
    },
    onShowGoalSolver: () => {
      if (!showGoalSolver) resetPanelPosition('goal');
      setShowGoalSolver(!showGoalSolver);
    },
    onShowBalanceAnalysis: () => {
      if (!showBalanceAnalysis) resetPanelPosition('balance');
      setShowBalanceAnalysis(!showBalanceAnalysis);
    },
    onShowEconomy: () => {
      if (!showEconomy) resetPanelPosition('economy');
      setShowEconomy(!showEconomy);
    },
    onShowDpsVariance: () => {
      if (!showDpsVariance) resetPanelPosition('dpsVariance');
      setShowDpsVariance(!showDpsVariance);
    },
    onShowCurveFitting: () => {
      if (!showCurveFitting) resetPanelPosition('curveFitting');
      setShowCurveFitting(!showCurveFitting);
    },
    onShowSettings: () => setShowSettings(true),
    onShowExportModal: () => setShowExportModal(true),
    onShowImportModal: () => setShowImportModal(true),
    // 패널 도구 토글 (하단에서 사이드바로 이동한 경우)
    onToggleFormulaHelper: () => {
      if (!showFormulaHelper) resetPanelPosition('formulaHelper');
      setShowFormulaHelper(!showFormulaHelper);
    },
    onToggleBalanceValidator: () => {
      if (!showBalanceValidator) resetPanelPosition('balanceValidator');
      setShowBalanceValidator(!showBalanceValidator);
    },
    onToggleDifficultyCurve: () => {
      if (!showDifficultyCurve) resetPanelPosition('difficultyCurve');
      setShowDifficultyCurve(!showDifficultyCurve);
    },
    onToggleSimulation: () => {
      if (!showSimulation) resetPanelPosition('simulation');
      setShowSimulation(!showSimulation);
    },
  };

  // Add memo handler
  const handleAddMemo = () => {
    if (currentProjectId && currentSheetId) {
      addSticker(currentProjectId, currentSheetId, {
        text: '',
        color: '#fef08a',
        x: 10 + Math.random() * 30,
        y: 10 + Math.random() * 30,
        width: 200,
        height: 120,
      });
    }
  };

  // 드래그 중인 패널 닫기 (쓰레기통에 드롭 시)
  const handleCloseDraggingPanel = useCallback((panelId?: string) => {
    const targetPanelId = panelId || draggingPanelRef.current;
    if (!targetPanelId) return;

    // panelId에 따라 해당 패널 닫기
    const closeMap: Record<string, () => void> = {
      calculator: () => setShowCalculator(false),
      comparison: () => setShowComparison(false),
      chart: () => setShowChart(false),
      preset: () => setShowPresetComparison(false),
      imbalance: () => setShowImbalanceDetector(false),
      goal: () => setShowGoalSolver(false),
      balance: () => setShowBalanceAnalysis(false),
      economy: () => setShowEconomy(false),
      dpsVariance: () => setShowDpsVariance(false),
      curveFitting: () => setShowCurveFitting(false),
      formulaHelper: () => setShowFormulaHelper(false),
      balanceValidator: () => setShowBalanceValidator(false),
      difficultyCurve: () => setShowDifficultyCurve(false),
      simulation: () => setShowSimulation(false),
    };

    const closeHandler = closeMap[targetPanelId];
    if (closeHandler) {
      closeHandler();
    }
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg-secondary)' }}>
      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setShowMobileSidebar(true)} />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)}
        callbacks={{
          ...sidebarCallbacks,
          onShowChart: () => {
            setShowChart(true);
            setShowMobileSidebar(false);
          },
          onShowHelp: () => {
            setShowOnboarding(true);
            setShowMobileSidebar(false);
          },
          onShowCalculator: () => {
            setShowCalculator(true);
            setShowMobileSidebar(false);
          },
          onShowComparison: () => {
            setShowComparison(true);
            setShowMobileSidebar(false);
          },
          onShowReferences: () => {
            setShowReferences(true);
            setShowMobileSidebar(false);
          },
          onShowPresetComparison: () => {
            setShowPresetComparison(true);
            setShowMobileSidebar(false);
          },
        }}
      />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          {...sidebarCallbacks}
          activeTools={{
            calculator: showCalculator,
            comparison: showComparison,
            chart: showChart,
            presetComparison: showPresetComparison,
            imbalanceDetector: showImbalanceDetector,
            goalSolver: showGoalSolver,
            balanceAnalysis: showBalanceAnalysis,
            economy: showEconomy,
            dpsVariance: showDpsVariance,
            curveFitting: showCurveFitting,
            formulaHelper: showFormulaHelper,
            balanceValidator: showBalanceValidator,
            difficultyCurve: showDifficultyCurve,
            simulation: showSimulation,
          }}
        />
      </div>

      {/* Sidebar Resizer */}
      <SidebarResizer />

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0">
        {currentProject ? (
          <>
            <SheetTabs project={currentProject} />

            <div className="flex-1 flex overflow-hidden">
              {currentSheet ? (
                <div
                  ref={sheetContainerRef}
                  className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6 pb-0 min-h-0 overflow-hidden relative"
                >
                  <StickerLayer containerRef={sheetContainerRef} />

                  <SheetHeader
                    sheet={currentSheet}
                  />

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SheetTable projectId={currentProject.id} sheet={currentSheet} onAddMemo={handleAddMemo} />
                  </div>
                </div>
              ) : (
                <EmptySheetView onCreateSheet={() => createSheet(currentProject.id, t('sheet.newSheet'))} />
              )}
            </div>
          </>
        ) : (
          <WelcomeScreen />
        )}
      </div>

      {/* Modals */}
      {showOnboarding && <OnboardingGuide onClose={() => setShowOnboarding(false)} />}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      {showReferences && <ReferencesModal onClose={() => setShowReferences(false)} />}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}

      {/* Tool Panels (Desktop) - 위치에 따라 자동으로 적절한 레이아웃 적용 */}
      <ToolPanels
        panelStates={panelStates}
        bringToFront={bringToFront}
        createDragHandler={createDragHandler}
        createResizeHandler={createResizeHandler}
        panels={{
          calculator: { show: showCalculator, setShow: setShowCalculator },
          comparison: { show: showComparison, setShow: setShowComparison },
          chart: { show: showChart, setShow: setShowChart },
          preset: { show: showPresetComparison, setShow: setShowPresetComparison },
          imbalance: { show: showImbalanceDetector, setShow: setShowImbalanceDetector },
          goal: { show: showGoalSolver, setShow: setShowGoalSolver },
          balance: { show: showBalanceAnalysis, setShow: setShowBalanceAnalysis },
          economy: { show: showEconomy, setShow: setShowEconomy },
          dpsVariance: { show: showDpsVariance, setShow: setShowDpsVariance },
          curveFitting: { show: showCurveFitting, setShow: setShowCurveFitting },
          formulaHelper: { show: showFormulaHelper, setShow: setShowFormulaHelper },
          balanceValidator: { show: showBalanceValidator, setShow: setShowBalanceValidator },
          difficultyCurve: { show: showDifficultyCurve, setShow: setShowDifficultyCurve },
          simulation: { show: showSimulation, setShow: setShowSimulation },
        }}
      />

      {/* Mobile Panels */}
      <MobilePanels
        panels={{
          calculator: { show: showCalculator, setShow: setShowCalculator },
          comparison: { show: showComparison, setShow: setShowComparison },
          chart: { show: showChart, setShow: setShowChart },
          preset: { show: showPresetComparison, setShow: setShowPresetComparison },
        }}
      />

      {/* Bottom Toolbar (항상 표시) */}
      <BottomToolbar
        show={{
          formulaHelper: showFormulaHelper,
          balanceValidator: showBalanceValidator,
          difficultyCurve: showDifficultyCurve,
          simulation: showSimulation,
        }}
        activeTools={{
          calculator: showCalculator,
          comparison: showComparison,
          chart: showChart,
          presetComparison: showPresetComparison,
          imbalanceDetector: showImbalanceDetector,
          goalSolver: showGoalSolver,
          balanceAnalysis: showBalanceAnalysis,
          economy: showEconomy,
          dpsVariance: showDpsVariance,
          curveFitting: showCurveFitting,
        }}
        setShow={{
          formulaHelper: (value) => {
            if (value) resetPanelPosition('formulaHelper');
            setShowFormulaHelper(value);
          },
          balanceValidator: (value) => {
            if (value) resetPanelPosition('balanceValidator');
            setShowBalanceValidator(value);
          },
          difficultyCurve: (value) => {
            if (value) resetPanelPosition('difficultyCurve');
            setShowDifficultyCurve(value);
          },
          simulation: (value) => {
            if (value) resetPanelPosition('simulation');
            setShowSimulation(value);
          },
        }}
        onShowCalculator={() => {
          if (showCalculator) {
            setShowCalculator(false);
          } else {
            resetPanelPosition('calculator');
            setShowCalculator(true);
          }
        }}
        onShowComparison={() => {
          if (showComparison) {
            setShowComparison(false);
          } else {
            resetPanelPosition('comparison');
            setShowComparison(true);
          }
        }}
        onShowChart={() => {
          if (showChart) {
            setShowChart(false);
          } else {
            resetPanelPosition('chart');
            setShowChart(true);
          }
        }}
        onShowPresetComparison={() => {
          if (showPresetComparison) {
            setShowPresetComparison(false);
          } else {
            resetPanelPosition('preset');
            setShowPresetComparison(true);
          }
        }}
        onShowImbalanceDetector={() => {
          if (showImbalanceDetector) {
            setShowImbalanceDetector(false);
          } else {
            resetPanelPosition('imbalance');
            setShowImbalanceDetector(true);
          }
        }}
        onShowGoalSolver={() => {
          if (showGoalSolver) {
            setShowGoalSolver(false);
          } else {
            resetPanelPosition('goal');
            setShowGoalSolver(true);
          }
        }}
        onShowBalanceAnalysis={() => {
          if (showBalanceAnalysis) {
            setShowBalanceAnalysis(false);
          } else {
            resetPanelPosition('balance');
            setShowBalanceAnalysis(true);
          }
        }}
        onShowEconomy={() => {
          if (showEconomy) {
            setShowEconomy(false);
          } else {
            resetPanelPosition('economy');
            setShowEconomy(true);
          }
        }}
        onShowDpsVariance={() => {
          if (showDpsVariance) {
            setShowDpsVariance(false);
          } else {
            resetPanelPosition('dpsVariance');
            setShowDpsVariance(true);
          }
        }}
        onShowCurveFitting={() => {
          if (showCurveFitting) {
            setShowCurveFitting(false);
          } else {
            resetPanelPosition('curveFitting');
            setShowCurveFitting(true);
          }
        }}
        isModalOpen={isModalOpen}
      />

      {/* Trash Drop Zone (드래그로 패널 닫기) */}
      <TrashDropZone onClosePanel={handleCloseDraggingPanel} />
    </div>
  );
}
