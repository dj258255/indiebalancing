'use client';

import { useEffect, useState, useRef } from 'react';
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
  exportToJSON,
  importFromJSON,
  exportSheetToCSV,
  importSheetFromCSV,
} from '@/lib/storage';
import { downloadFile } from '@/lib/utils';

// Layout components
import { Sidebar, SheetTabs } from '@/components/layout';

// Sheet components
import { SheetTable, StickerLayer } from '@/components/sheet';

// Modal components
import {
  SettingsModal,
  ReferencesModal,
  GameEngineExportModal,
  GameEngineImportModal,
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
  } = usePanelManager({
    panels: ['calculator', 'comparison', 'chart', 'preset', 'imbalance', 'goal', 'balance', 'economy', 'dpsVariance', 'curveFitting', 'formulaHelper', 'balanceValidator', 'difficultyCurve', 'simulation'],
    initialStates: Object.fromEntries(
      Object.entries(PANEL_CONFIG).map(([key, config]) => [
        key,
        { x: config.x, y: config.y, width: config.width, height: config.height, zIndex: config.zIndex },
      ])
    ),
  });

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Modal state
  const [showSettings, setShowSettings] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showGameEngineExport, setShowGameEngineExport] = useState(false);
  const [showGameEngineImport, setShowGameEngineImport] = useState(false);
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
  const isModalOpen = showOnboarding || showReferences || showGameEngineExport || showGameEngineImport;

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

  // Export handlers
  const handleExportJSON = () => {
    const json = exportToJSON(projects);
    downloadFile(json, `indiebalancing-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleExportCSV = () => {
    if (!currentSheet) {
      alert(t('alert.exportSelectSheet'));
      return;
    }
    const csv = exportSheetToCSV(currentSheet);
    const projectName = currentProject?.name || 'project';
    downloadFile(csv, `${projectName}-${currentSheet.name}.csv`, 'text/csv');
  };

  // Import handlers
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = importFromJSON(text);
        setProjects([...projects, ...imported]);
        await saveAllProjects([...projects, ...imported]);
        alert(t('project.importSuccess', { count: imported.length }));
      } catch {
        alert(t('project.importFailed'));
      }
    };
    input.click();
  };

  const handleImportCSV = () => {
    if (!currentProjectId) {
      alert(t('alert.importSelectProject'));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const { columns, rows } = importSheetFromCSV(text);

        if (columns.length === 0) {
          alert(t('project.csvImportEmpty'));
          return;
        }

        // 새 시트 생성
        const sheetName = file.name.replace(/\.csv$/i, '');
        const sheetId = createSheet(currentProjectId, sheetName);

        // 컬럼 추가
        const columnIdMap = new Map<string, string>();
        columns.forEach((col, idx) => {
          const colId = addColumn(currentProjectId, sheetId, {
            name: col.name,
            type: col.type,
            width: col.name.length > 10 ? 150 : 100,
          });
          columnIdMap.set(`col_${idx}`, colId);
        });

        // 행 추가
        for (const rowData of rows) {
          const rowId = addRow(currentProjectId, sheetId);
          for (const [tempId, value] of Object.entries(rowData.cells)) {
            const colId = columnIdMap.get(tempId);
            if (colId && value !== undefined) {
              updateCell(currentProjectId, sheetId, rowId, colId, value as string | number | null);
            }
          }
        }

        alert(t('project.csvImportSuccess', { name: sheetName, cols: columns.length, rows: rows.length }));
      } catch {
        alert(t('project.importFailed'));
      }
    };
    input.click();
  };

  // Sidebar callbacks
  const sidebarCallbacks = {
    onShowChart: () => setShowChart(!showChart),
    onShowHelp: () => setShowOnboarding(true),
    onShowCalculator: () => setShowCalculator(!showCalculator),
    onShowComparison: () => setShowComparison(!showComparison),
    onShowReferences: () => setShowReferences(true),
    onShowPresetComparison: () => setShowPresetComparison(!showPresetComparison),
    onShowGameEngineExport: () => setShowGameEngineExport(true),
    onShowGameEngineImport: () => setShowGameEngineImport(true),
    onShowImbalanceDetector: () => setShowImbalanceDetector(!showImbalanceDetector),
    onShowGoalSolver: () => setShowGoalSolver(!showGoalSolver),
    onShowBalanceAnalysis: () => setShowBalanceAnalysis(!showBalanceAnalysis),
    onShowEconomy: () => setShowEconomy(!showEconomy),
    onShowDpsVariance: () => setShowDpsVariance(!showDpsVariance),
    onShowCurveFitting: () => setShowCurveFitting(!showCurveFitting),
    onShowSettings: () => setShowSettings(true),
    onShowExportModal: () => setShowExportModal(true),
    onShowImportModal: () => setShowImportModal(true),
    // 패널 도구 토글 (하단에서 사이드바로 이동한 경우)
    onToggleFormulaHelper: () => setShowFormulaHelper(!showFormulaHelper),
    onToggleBalanceValidator: () => setShowBalanceValidator(!showBalanceValidator),
    onToggleDifficultyCurve: () => setShowDifficultyCurve(!showDifficultyCurve),
    onToggleSimulation: () => setShowSimulation(!showSimulation),
  };

  // Add memo handler
  const handleAddMemo = () => {
    if (currentProjectId && currentSheetId) {
      addSticker(currentProjectId, currentSheetId, {
        text: '',
        color: '#fef08a',
        x: 10 + Math.random() * 30,
        y: 10 + Math.random() * 30,
        width: 150,
        height: 80,
      });
    }
  };

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
          onShowGameEngineExport: () => {
            setShowGameEngineExport(true);
            setShowMobileSidebar(false);
          },
          onShowGameEngineImport: () => {
            setShowGameEngineImport(true);
            setShowMobileSidebar(false);
          },
        }}
      />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar {...sidebarCallbacks} />
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
      {showGameEngineExport && <GameEngineExportModal onClose={() => setShowGameEngineExport(false)} />}
      {showGameEngineImport && <GameEngineImportModal onClose={() => setShowGameEngineImport(false)} />}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          onExportCode={() => setShowGameEngineExport(true)}
          hasCurrentSheet={!!currentSheet}
        />
      )}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportJSON={handleImportJSON}
          onImportCSV={handleImportCSV}
          onImportCode={() => setShowGameEngineImport(true)}
          hasCurrentProject={!!currentProjectId}
        />
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
        setShow={{
          formulaHelper: (value) => {
            setShowFormulaHelper(value);
            if (value) bringToFront('formulaHelper');
          },
          balanceValidator: (value) => {
            setShowBalanceValidator(value);
            if (value) bringToFront('balanceValidator');
          },
          difficultyCurve: (value) => {
            setShowDifficultyCurve(value);
            if (value) bringToFront('difficultyCurve');
          },
          simulation: (value) => {
            setShowSimulation(value);
            if (value) bringToFront('simulation');
          },
        }}
        onShowCalculator={() => {
          if (showCalculator) {
            setShowCalculator(false);
          } else {
            setShowCalculator(true);
            bringToFront('calculator');
          }
        }}
        onShowComparison={() => {
          if (showComparison) {
            setShowComparison(false);
          } else {
            setShowComparison(true);
            bringToFront('comparison');
          }
        }}
        onShowChart={() => {
          if (showChart) {
            setShowChart(false);
          } else {
            setShowChart(true);
            bringToFront('chart');
          }
        }}
        onShowPresetComparison={() => {
          if (showPresetComparison) {
            setShowPresetComparison(false);
          } else {
            setShowPresetComparison(true);
            bringToFront('preset');
          }
        }}
        onShowImbalanceDetector={() => {
          if (showImbalanceDetector) {
            setShowImbalanceDetector(false);
          } else {
            setShowImbalanceDetector(true);
            bringToFront('imbalance');
          }
        }}
        onShowGoalSolver={() => {
          if (showGoalSolver) {
            setShowGoalSolver(false);
          } else {
            setShowGoalSolver(true);
            bringToFront('goal');
          }
        }}
        onShowBalanceAnalysis={() => {
          if (showBalanceAnalysis) {
            setShowBalanceAnalysis(false);
          } else {
            setShowBalanceAnalysis(true);
            bringToFront('balance');
          }
        }}
        onShowEconomy={() => {
          if (showEconomy) {
            setShowEconomy(false);
          } else {
            setShowEconomy(true);
            bringToFront('economy');
          }
        }}
        onShowDpsVariance={() => {
          if (showDpsVariance) {
            setShowDpsVariance(false);
          } else {
            setShowDpsVariance(true);
            bringToFront('dpsVariance');
          }
        }}
        onShowCurveFitting={() => {
          if (showCurveFitting) {
            setShowCurveFitting(false);
          } else {
            setShowCurveFitting(true);
            bringToFront('curveFitting');
          }
        }}
        isModalOpen={isModalOpen}
      />
    </div>
  );
}
