import type { AllToolId } from '@/stores/toolLayoutStore';
import type { Calculator } from 'lucide-react';

// Sidebar Props
export interface SidebarProps {
  onShowChart: () => void;
  onShowHelp: () => void;
  onShowCalculator: () => void;
  onShowComparison: () => void;
  onShowReferences: () => void;
  onShowPresetComparison?: () => void;
  onShowImbalanceDetector?: () => void;
  onShowGoalSolver?: () => void;
  onShowBalanceAnalysis?: () => void;
  onShowEconomy?: () => void;
  onShowDpsVariance?: () => void;
  onShowCurveFitting?: () => void;
  onShowSettings?: () => void;
  onShowExportModal?: () => void;
  onShowImportModal?: () => void;
  // 패널 도구 토글
  onToggleFormulaHelper?: () => void;
  onToggleBalanceValidator?: () => void;
  onToggleDifficultyCurve?: () => void;
  onToggleSimulation?: () => void;
  onToggleEntityDefinition?: () => void;
  // 활성화된 도구 상태
  activeTools?: ActiveToolsState;
}

export interface ActiveToolsState {
  calculator?: boolean;
  comparison?: boolean;
  chart?: boolean;
  presetComparison?: boolean;
  imbalanceDetector?: boolean;
  goalSolver?: boolean;
  balanceAnalysis?: boolean;
  economy?: boolean;
  dpsVariance?: boolean;
  curveFitting?: boolean;
  formulaHelper?: boolean;
  balanceValidator?: boolean;
  difficultyCurve?: boolean;
  simulation?: boolean;
  entityDefinition?: boolean;
}

// 도구 설정 타입
export interface ToolConfig {
  icon: typeof Calculator;
  color: string;
  labelKey: string;
}

// 드래그 상태
export interface ToolDragState {
  draggedToolId: AllToolId | null;
  draggedFromSidebar: boolean;
  dropTargetIndex: number | null;
  isOverSidebar: boolean;
}

// 시트 컨텍스트 메뉴 상태
export interface SheetContextMenuState {
  x: number;
  y: number;
  projectId: string;
  sheetId: string;
  sheetName: string;
  exportClassName?: string;
}

// 프로젝트 컨텍스트 메뉴 상태
export interface ProjectContextMenuState {
  x: number;
  y: number;
  projectId: string;
  projectName: string;
}

// 시트 이동 확인 상태
export interface SheetMoveConfirmState {
  fromProjectId: string;
  toProjectId: string;
  toProjectName: string;
  sheetId: string;
  sheetName: string;
}

// 시트 삭제 확인 상태
export interface SheetDeleteConfirmState {
  projectId: string;
  sheetId: string;
  sheetName: string;
}

// 프로젝트 삭제 확인 상태
export interface ProjectDeleteConfirmState {
  projectId: string;
  projectName: string;
}
