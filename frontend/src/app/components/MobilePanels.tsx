'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Calculator,
  ComparisonChart,
  GrowthCurveChart,
} from '@/components/panels';
import { PresetComparisonModal } from '@/components/modals';

interface PanelState {
  show: boolean;
  setShow: (value: boolean) => void;
}

interface MobilePanelsProps {
  panels: {
    calculator: PanelState;
    comparison: PanelState;
    chart: PanelState;
    preset: PanelState;
  };
}

export default function MobilePanels({ panels }: MobilePanelsProps) {
  const t = useTranslations();

  return (
    <>
      {/* Calculator Mobile */}
      {panels.calculator.show && (
        <div className="md:hidden">
          <Calculator onClose={() => panels.calculator.setShow(false)} />
        </div>
      )}

      {/* Comparison Mobile */}
      {panels.comparison.show && (
        <div className="md:hidden">
          <ComparisonChart onClose={() => panels.comparison.setShow(false)} />
        </div>
      )}

      {/* Chart Mobile */}
      {panels.chart.show && (
        <div className="md:hidden fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-2">
          <div className="card w-full max-h-[95vh] overflow-y-auto animate-scaleIn">
            <div
              className="sticky top-0 border-b px-4 py-3 flex items-center justify-between"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('growthCurve.title')}
              </h2>
              <button
                onClick={() => panels.chart.setShow(false)}
                className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <GrowthCurveChart />
            </div>
          </div>
        </div>
      )}

      {/* Preset Comparison Mobile */}
      {panels.preset.show && (
        <div className="md:hidden">
          <PresetComparisonModal onClose={() => panels.preset.setShow(false)} />
        </div>
      )}
    </>
  );
}
