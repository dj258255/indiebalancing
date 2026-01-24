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
} from 'lucide-react';
import type { AllToolId } from '@/stores/toolLayoutStore';

export interface ToolConfig {
  icon: typeof Calculator;
  color: string;
  titleKey: string;
  defaultIndex: number;
}

export const TOOL_CONFIGS: Record<AllToolId, ToolConfig> = {
  calculator: {
    icon: Calculator,
    color: '#8b5cf6',
    titleKey: 'sidebar.calculator',
    defaultIndex: 0,
  },
  comparison: {
    icon: PieChart,
    color: '#3b82f6',
    titleKey: 'sidebar.comparison',
    defaultIndex: 1,
  },
  chart: {
    icon: BarChart3,
    color: '#22c55e',
    titleKey: 'growthCurve.title',
    defaultIndex: 2,
  },
  presetComparison: {
    icon: GitCompare,
    color: '#f97316',
    titleKey: 'sidebar.presetComparison',
    defaultIndex: 3,
  },
  imbalanceDetector: {
    icon: AlertTriangle,
    color: '#eab308',
    titleKey: 'sidebar.imbalanceDetector',
    defaultIndex: 4,
  },
  goalSolver: {
    icon: Target,
    color: '#14b8a6',
    titleKey: 'sidebar.goalSolver',
    defaultIndex: 5,
  },
  balanceAnalysis: {
    icon: TrendingUp,
    color: '#ec4899',
    titleKey: 'sidebar.balanceAnalysis',
    defaultIndex: 6,
  },
  formulaHelper: {
    icon: FunctionSquare,
    color: '#3b82f6',
    titleKey: 'bottomTabs.formulaHelper',
    defaultIndex: 0, // 하단 패널 첫번째 (왼쪽)
  },
  balanceValidator: {
    icon: Shield,
    color: '#22c55e',
    titleKey: 'bottomTabs.balanceValidator',
    defaultIndex: 1, // 하단 패널 두번째
  },
  difficultyCurve: {
    icon: TrendingUp,
    color: '#8b5cf6',
    titleKey: 'bottomTabs.difficultyCurve',
    defaultIndex: 2, // 하단 패널 세번째
  },
  simulation: {
    icon: Swords,
    color: '#ef4444',
    titleKey: 'bottomTabs.simulation',
    defaultIndex: 3, // 하단 패널 네번째 (오른쪽)
  },
};
