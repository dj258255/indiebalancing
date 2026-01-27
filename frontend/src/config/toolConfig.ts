import {
  Calculator,
  PieChart,
  BarChart3,
  GitCompare,
  AlertTriangle,
  Target,
  TrendingUp,
  FunctionSquare,
  Shield,
  Swords,
  Coins,
  BarChart2,
  PenTool,
} from 'lucide-react';
import type { AllToolId } from '@/stores/toolLayoutStore';

export interface ToolConfig {
  icon: typeof Calculator;
  color: string;
  titleKey: string;
  descriptionKey: string;
  defaultIndex: number;
  // 도구별 최적 기본 크기
  defaultWidth?: number;
  defaultHeight?: number;
}

export const TOOL_CONFIGS: Record<AllToolId, ToolConfig> = {
  calculator: {
    icon: Calculator,
    color: '#8b5cf6', // 보라 (Violet)
    titleKey: 'sidebar.calculator',
    descriptionKey: 'toolDescriptions.calculator',
    defaultIndex: 0,
    defaultWidth: 480,
    defaultHeight: 600,
  },
  comparison: {
    icon: PieChart,
    color: '#3b82f6', // 파랑 (Blue)
    titleKey: 'sidebar.comparison',
    descriptionKey: 'toolDescriptions.comparison',
    defaultIndex: 1,
    defaultWidth: 680,
    defaultHeight: 600,
  },
  chart: {
    icon: BarChart3,
    color: '#22c55e', // 초록 (Green)
    titleKey: 'growthCurve.title',
    descriptionKey: 'toolDescriptions.chart',
    defaultIndex: 2,
    defaultWidth: 580,
    defaultHeight: 550,
  },
  presetComparison: {
    icon: GitCompare,
    color: '#f97316', // 오렌지 (Orange)
    titleKey: 'sidebar.presetComparison',
    descriptionKey: 'toolDescriptions.presetComparison',
    defaultIndex: 3,
    defaultWidth: 580,
    defaultHeight: 550,
  },
  imbalanceDetector: {
    icon: AlertTriangle,
    color: '#eab308', // 옐로우 (Yellow)
    titleKey: 'sidebar.imbalanceDetector',
    descriptionKey: 'toolDescriptions.imbalanceDetector',
    defaultIndex: 4,
    defaultWidth: 520,
    defaultHeight: 600,
  },
  goalSolver: {
    icon: Target,
    color: '#14b8a6', // 틸 (Teal)
    titleKey: 'sidebar.goalSolver',
    descriptionKey: 'toolDescriptions.goalSolver',
    defaultIndex: 5,
    defaultWidth: 500,
    defaultHeight: 550,
  },
  balanceAnalysis: {
    icon: TrendingUp,
    color: '#ec4899', // 핑크 (Pink)
    titleKey: 'sidebar.balanceAnalysis',
    descriptionKey: 'toolDescriptions.balanceAnalysis',
    defaultIndex: 6,
    defaultWidth: 580,
    defaultHeight: 600,
  },
  economy: {
    icon: Coins,
    color: '#f59e0b', // 앰버 (Amber)
    titleKey: 'sidebar.economy',
    descriptionKey: 'toolDescriptions.economy',
    defaultIndex: 7,
    defaultWidth: 650,
    defaultHeight: 650,
  },
  dpsVariance: {
    icon: BarChart2,
    color: '#ef4444', // 레드 (Red)
    titleKey: 'sidebar.dpsVariance',
    descriptionKey: 'toolDescriptions.dpsVariance',
    defaultIndex: 8,
    defaultWidth: 580,
    defaultHeight: 600,
  },
  curveFitting: {
    icon: PenTool,
    color: '#6366f1', // 인디고 (Indigo)
    titleKey: 'sidebar.curveFitting',
    descriptionKey: 'toolDescriptions.curveFitting',
    defaultIndex: 9,
    defaultWidth: 650,
    defaultHeight: 650,
  },
  formulaHelper: {
    icon: FunctionSquare,
    color: '#0ea5e9', // 스카이 (Sky)
    titleKey: 'bottomTabs.formulaHelper',
    descriptionKey: 'toolDescriptions.formulaHelper',
    defaultIndex: 0,
    defaultWidth: 500,
    defaultHeight: 550,
  },
  balanceValidator: {
    icon: Shield,
    color: '#10b981', // 에메랄드 (Emerald)
    titleKey: 'bottomTabs.balanceValidator',
    descriptionKey: 'toolDescriptions.balanceValidator',
    defaultIndex: 1,
    defaultWidth: 520,
    defaultHeight: 580,
  },
  difficultyCurve: {
    icon: TrendingUp,
    color: '#a855f7', // 퍼플 (Purple)
    titleKey: 'bottomTabs.difficultyCurve',
    descriptionKey: 'toolDescriptions.difficultyCurve',
    defaultIndex: 2,
    defaultWidth: 580,
    defaultHeight: 600,
  },
  simulation: {
    icon: Swords,
    color: '#e11d48', // 로즈 (Rose)
    titleKey: 'bottomTabs.simulation',
    descriptionKey: 'toolDescriptions.simulation',
    defaultIndex: 3,
    defaultWidth: 700,
    defaultHeight: 700,
  },
};
