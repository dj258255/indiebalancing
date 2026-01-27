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
  defaultIndex: number;
  // 도구별 최적 기본 크기
  defaultWidth?: number;
  defaultHeight?: number;
}

export const TOOL_CONFIGS: Record<AllToolId, ToolConfig> = {
  calculator: {
    icon: Calculator,
    color: '#8b5cf6',
    titleKey: 'sidebar.calculator',
    defaultIndex: 0,
    defaultWidth: 480,
    defaultHeight: 600,
  },
  comparison: {
    icon: PieChart,
    color: '#3b82f6',
    titleKey: 'sidebar.comparison',
    defaultIndex: 1,
    defaultWidth: 680,
    defaultHeight: 600,
  },
  chart: {
    icon: BarChart3,
    color: '#22c55e',
    titleKey: 'growthCurve.title',
    defaultIndex: 2,
    defaultWidth: 580,
    defaultHeight: 550,
  },
  presetComparison: {
    icon: GitCompare,
    color: '#f97316',
    titleKey: 'sidebar.presetComparison',
    defaultIndex: 3,
    defaultWidth: 580,
    defaultHeight: 550,
  },
  imbalanceDetector: {
    icon: AlertTriangle,
    color: '#eab308',
    titleKey: 'sidebar.imbalanceDetector',
    defaultIndex: 4,
    defaultWidth: 520,
    defaultHeight: 600,
  },
  goalSolver: {
    icon: Target,
    color: '#14b8a6',
    titleKey: 'sidebar.goalSolver',
    defaultIndex: 5,
    defaultWidth: 500,
    defaultHeight: 550,
  },
  balanceAnalysis: {
    icon: TrendingUp,
    color: '#ec4899',
    titleKey: 'sidebar.balanceAnalysis',
    defaultIndex: 6,
    defaultWidth: 580,
    defaultHeight: 600,
  },
  economy: {
    icon: Coins,
    color: '#f59e0b',
    titleKey: 'sidebar.economy',
    defaultIndex: 7,
    defaultWidth: 650,
    defaultHeight: 650,
  },
  dpsVariance: {
    icon: BarChart2,
    color: '#f97316',
    titleKey: 'sidebar.dpsVariance',
    defaultIndex: 8,
    defaultWidth: 580,
    defaultHeight: 600,
  },
  curveFitting: {
    icon: PenTool,
    color: '#6366f1',
    titleKey: 'sidebar.curveFitting',
    defaultIndex: 9,
    defaultWidth: 650,
    defaultHeight: 650,
  },
  formulaHelper: {
    icon: FunctionSquare,
    color: '#3b82f6',
    titleKey: 'bottomTabs.formulaHelper',
    defaultIndex: 0, // 하단 패널 첫번째 (왼쪽)
    defaultWidth: 500,
    defaultHeight: 550,
  },
  balanceValidator: {
    icon: Shield,
    color: '#22c55e',
    titleKey: 'bottomTabs.balanceValidator',
    defaultIndex: 1, // 하단 패널 두번째
    defaultWidth: 520,
    defaultHeight: 580,
  },
  difficultyCurve: {
    icon: TrendingUp,
    color: '#8b5cf6',
    titleKey: 'bottomTabs.difficultyCurve',
    defaultIndex: 2, // 하단 패널 세번째
    defaultWidth: 580,
    defaultHeight: 600,
  },
  simulation: {
    icon: Swords,
    color: '#ef4444',
    titleKey: 'bottomTabs.simulation',
    defaultIndex: 3, // 하단 패널 네번째 (오른쪽)
    defaultWidth: 700,
    defaultHeight: 700,
  },
};
