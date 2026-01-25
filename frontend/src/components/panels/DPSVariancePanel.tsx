'use client';

import { useState, useMemo } from 'react';
import { BarChart2, Play, RefreshCw, Info, TrendingUp, TrendingDown, Minus, Sword, Shield as ShieldIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  simulateDPSVariance,
  simulateTTKVariance,
  compareBuildsDPS,
  type DPSSimulationConfig,
  type DPSDistribution,
  type TTKDistribution,
  type BuildComparisonResult,
} from '@/lib/dpsVarianceSimulator';

interface DPSVariancePanelProps {
  onClose: () => void;
  isPanel?: boolean;
}

type SimMode = 'dps' | 'ttk' | 'compare';

export default function DPSVariancePanel({ onClose, isPanel }: DPSVariancePanelProps) {
  const t = useTranslations('dpsVariance');
  const tCommon = useTranslations('common');

  // Simulation mode
  const [mode, setMode] = useState<SimMode>('dps');

  // Build A configuration
  const [damage, setDamage] = useState(100);
  const [attackSpeed, setAttackSpeed] = useState(1.0);
  const [critRate, setCritRate] = useState(25);
  const [critDamage, setCritDamage] = useState(2.0);
  const [damageVariance, setDamageVariance] = useState(10);
  const [iterations, setIterations] = useState(1000);
  const [duration, setDuration] = useState(10);

  // TTK specific
  const [targetHP, setTargetHP] = useState(10000);

  // Build B configuration (for compare mode)
  const [damageB, setDamageB] = useState(120);
  const [attackSpeedB, setAttackSpeedB] = useState(0.8);
  const [critRateB, setCritRateB] = useState(15);
  const [critDamageB, setCritDamageB] = useState(2.5);
  const [damageVarianceB, setDamageVarianceB] = useState(10);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [dpsResult, setDpsResult] = useState<DPSDistribution | null>(null);
  const [ttkResult, setTtkResult] = useState<TTKDistribution | null>(null);
  const [compareResult, setCompareResult] = useState<BuildComparisonResult | null>(null);
  const [dpsResultB, setDpsResultB] = useState<DPSDistribution | null>(null);

  const configA: DPSSimulationConfig = useMemo(() => ({
    baseDamage: damage,
    attackSpeed,
    critRate,
    critDamage,
    iterations,
    duration,
    damageVariance,
  }), [damage, attackSpeed, critRate, critDamage, iterations, duration, damageVariance]);

  const configB: DPSSimulationConfig = useMemo(() => ({
    baseDamage: damageB,
    attackSpeed: attackSpeedB,
    critRate: critRateB,
    critDamage: critDamageB,
    iterations,
    duration,
    damageVariance: damageVarianceB,
  }), [damageB, attackSpeedB, critRateB, critDamageB, iterations, duration, damageVarianceB]);

  const runSimulation = () => {
    setIsSimulating(true);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        if (mode === 'dps') {
          const result = simulateDPSVariance(configA);
          setDpsResult(result);
        } else if (mode === 'ttk') {
          const result = simulateTTKVariance({
            targetHP,
            baseDamage: damage,
            attackSpeed,
            critRate,
            critDamage,
            damageVariance,
            iterations,
          });
          setTtkResult(result);
        } else if (mode === 'compare') {
          const resultA = simulateDPSVariance(configA);
          const resultB = simulateDPSVariance(configB);
          const comparison = compareBuildsDPS({
            buildA: configA,
            buildB: configB,
            iterations,
          });
          setDpsResult(resultA);
          setDpsResultB(resultB);
          setCompareResult(comparison);
        }
      } finally {
        setIsSimulating(false);
      }
    }, 50);
  };

  const resetSimulation = () => {
    setDpsResult(null);
    setTtkResult(null);
    setCompareResult(null);
    setDpsResultB(null);
  };

  // Render histogram
  const renderHistogram = (histogram: { min: number; max: number; count: number; percentage: number }[], color: string = '#3b82f6') => {
    const maxPercent = Math.max(...histogram.map(h => h.percentage));

    return (
      <div className="flex items-end gap-0.5 h-32 mt-2">
        {histogram.map((bin, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div
              className="w-full rounded-t transition-all duration-200 hover:opacity-80"
              style={{
                height: `${(bin.percentage / maxPercent) * 100}%`,
                minHeight: bin.count > 0 ? '2px' : '0',
                background: color,
              }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                <div>{bin.min.toFixed(0)} - {bin.max.toFixed(0)}</div>
                <div className="text-[var(--text-secondary)]">{bin.count} ({bin.percentage.toFixed(1)}%)</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render percentile bar
  const renderPercentileBar = (percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number }, min: number, max: number) => {
    const range = max - min;
    const getPos = (val: number) => ((val - min) / range) * 100;

    return (
      <div className="relative h-6 mt-4 mb-2">
        {/* Background bar */}
        <div className="absolute inset-y-2 left-0 right-0 bg-[var(--bg-tertiary)] rounded" />

        {/* IQR (25-75) box */}
        <div
          className="absolute inset-y-1 bg-blue-500/30 rounded"
          style={{
            left: `${getPos(percentiles.p25)}%`,
            right: `${100 - getPos(percentiles.p75)}%`,
          }}
        />

        {/* Whiskers (5-95) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[var(--text-tertiary)]"
          style={{
            left: `${getPos(percentiles.p5)}%`,
            right: `${100 - getPos(percentiles.p25)}%`,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-[var(--text-tertiary)]"
          style={{
            left: `${getPos(percentiles.p75)}%`,
            right: `${100 - getPos(percentiles.p95)}%`,
          }}
        />

        {/* Median line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
          style={{ left: `${getPos(percentiles.p50)}%` }}
        />

        {/* Labels */}
        <div className="absolute -bottom-5 text-[10px] text-[var(--text-tertiary)]" style={{ left: `${getPos(percentiles.p5)}%`, transform: 'translateX(-50%)' }}>
          5%
        </div>
        <div className="absolute -bottom-5 text-[10px] text-[var(--text-tertiary)]" style={{ left: `${getPos(percentiles.p50)}%`, transform: 'translateX(-50%)' }}>
          50%
        </div>
        <div className="absolute -bottom-5 text-[10px] text-[var(--text-tertiary)]" style={{ left: `${getPos(percentiles.p95)}%`, transform: 'translateX(-50%)' }}>
          95%
        </div>
      </div>
    );
  };

  const InputField = ({ label, value, onChange, min, max, step = 1, unit }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
  }) => (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-secondary)] w-20 shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1 px-2 py-1 text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded focus:outline-none focus:border-[var(--accent)]"
      />
      {unit && <span className="text-xs text-[var(--text-tertiary)] w-8">{unit}</span>}
    </div>
  );

  return (
    <div className={cn(
      'flex flex-col h-full',
      isPanel ? 'bg-transparent' : 'bg-[var(--bg-primary)]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-[var(--text-primary)]">{t('title')}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Mode Selector */}
        <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg">
          {(['dps', 'ttk', 'compare'] as SimMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); resetSimulation(); }}
              className={cn(
                'flex-1 px-3 py-1.5 text-sm rounded-md transition-all',
                mode === m
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              )}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>

        {/* Configuration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <Sword className="w-4 h-4 text-red-500" />
            {mode === 'compare' ? t('buildA') : t('config')}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InputField label={t('damage')} value={damage} onChange={setDamage} min={1} max={999999} />
            <InputField label={t('attackSpeed')} value={attackSpeed} onChange={setAttackSpeed} min={0.1} max={10} step={0.1} unit="/s" />
            <InputField label={t('critRate')} value={critRate} onChange={setCritRate} min={0} max={100} unit="%" />
            <InputField label={t('critDamage')} value={critDamage} onChange={setCritDamage} min={1} max={10} step={0.1} unit="x" />
            <InputField label={t('variance')} value={damageVariance} onChange={setDamageVariance} min={0} max={100} unit="%" />
            {mode === 'ttk' && (
              <InputField label={t('targetHP')} value={targetHP} onChange={setTargetHP} min={1} max={9999999} />
            )}
          </div>
        </div>

        {/* Build B Configuration (compare mode only) */}
        {mode === 'compare' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <ShieldIcon className="w-4 h-4 text-blue-500" />
              {t('buildB')}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <InputField label={t('damage')} value={damageB} onChange={setDamageB} min={1} max={999999} />
              <InputField label={t('attackSpeed')} value={attackSpeedB} onChange={setAttackSpeedB} min={0.1} max={10} step={0.1} unit="/s" />
              <InputField label={t('critRate')} value={critRateB} onChange={setCritRateB} min={0} max={100} unit="%" />
              <InputField label={t('critDamage')} value={critDamageB} onChange={setCritDamageB} min={1} max={10} step={0.1} unit="x" />
              <InputField label={t('variance')} value={damageVarianceB} onChange={setDamageVarianceB} min={0} max={100} unit="%" />
            </div>
          </div>
        )}

        {/* Simulation Settings */}
        <div className="flex gap-2">
          <InputField label={t('iterations')} value={iterations} onChange={setIterations} min={100} max={10000} />
          {mode !== 'ttk' && (
            <InputField label={t('duration')} value={duration} onChange={setDuration} min={1} max={60} unit="s" />
          )}
        </div>

        {/* Run Button */}
        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className={cn(
            'w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all',
            isSimulating
              ? 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600'
          )}
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t('simulating')}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {t('runSimulation')}
            </>
          )}
        </button>

        {/* DPS Results */}
        {dpsResult && mode === 'dps' && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-sm font-medium text-[var(--text-primary)]">{t('results')}</div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-[var(--bg-secondary)] rounded text-center">
                <div className="text-xs text-[var(--text-tertiary)]">{t('mean')}</div>
                <div className="text-lg font-bold text-orange-500">{dpsResult.mean.toFixed(1)}</div>
              </div>
              <div className="p-2 bg-[var(--bg-secondary)] rounded text-center">
                <div className="text-xs text-[var(--text-tertiary)]">{t('stdDev')}</div>
                <div className="text-lg font-bold text-blue-500">{dpsResult.stdDev.toFixed(1)}</div>
              </div>
              <div className="p-2 bg-[var(--bg-secondary)] rounded text-center">
                <div className="text-xs text-[var(--text-tertiary)]">{t('cv')}</div>
                <div className="text-lg font-bold text-purple-500">{dpsResult.coefficientOfVariation.toFixed(1)}%</div>
              </div>
            </div>

            {/* Range */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{t('range')}</span>
              <span className="font-medium">
                {dpsResult.min.toFixed(0)} - {dpsResult.max.toFixed(0)} DPS
              </span>
            </div>

            {/* Histogram */}
            <div>
              <div className="text-xs text-[var(--text-tertiary)] mb-1">{t('distribution')}</div>
              {renderHistogram(dpsResult.histogram, '#f97316')}
            </div>

            {/* Percentile Box Plot */}
            <div>
              <div className="text-xs text-[var(--text-tertiary)] mb-1">{t('percentiles')}</div>
              {renderPercentileBar(
                dpsResult.percentiles,
                dpsResult.min,
                dpsResult.max
              )}
            </div>

            {/* Percentile Values */}
            <div className="grid grid-cols-4 gap-1 text-xs mt-6">
              <div className="text-center p-1 bg-[var(--bg-secondary)] rounded">
                <div className="text-[var(--text-tertiary)]">P5</div>
                <div className="font-medium">{dpsResult.percentiles.p5.toFixed(0)}</div>
              </div>
              <div className="text-center p-1 bg-[var(--bg-secondary)] rounded">
                <div className="text-[var(--text-tertiary)]">P25</div>
                <div className="font-medium">{dpsResult.percentiles.p25.toFixed(0)}</div>
              </div>
              <div className="text-center p-1 bg-[var(--bg-secondary)] rounded">
                <div className="text-[var(--text-tertiary)]">P75</div>
                <div className="font-medium">{dpsResult.percentiles.p75.toFixed(0)}</div>
              </div>
              <div className="text-center p-1 bg-[var(--bg-secondary)] rounded">
                <div className="text-[var(--text-tertiary)]">P95</div>
                <div className="font-medium">{dpsResult.percentiles.p95.toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* TTK Results */}
        {ttkResult && mode === 'ttk' && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-sm font-medium text-[var(--text-primary)]">{t('results')}</div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-[var(--bg-secondary)] rounded text-center">
                <div className="text-xs text-[var(--text-tertiary)]">{t('meanTTK')}</div>
                <div className="text-lg font-bold text-orange-500">{ttkResult.mean.toFixed(2)}s</div>
              </div>
              <div className="p-2 bg-[var(--bg-secondary)] rounded text-center">
                <div className="text-xs text-[var(--text-tertiary)]">{t('minTTK')}</div>
                <div className="text-lg font-bold text-green-500">{ttkResult.min.toFixed(2)}s</div>
              </div>
              <div className="p-2 bg-[var(--bg-secondary)] rounded text-center">
                <div className="text-xs text-[var(--text-tertiary)]">{t('maxTTK')}</div>
                <div className="text-lg font-bold text-red-500">{ttkResult.max.toFixed(2)}s</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-[var(--text-tertiary)] mb-1">{t('ttkDistribution')}</div>
              {renderHistogram(ttkResult.histogram, '#22c55e')}
            </div>
          </div>
        )}

        {/* Compare Results */}
        {compareResult && mode === 'compare' && dpsResult && dpsResultB && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-sm font-medium text-[var(--text-primary)]">{t('comparisonResults')}</div>

            {/* Win Rate Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>{t('buildA')}</span>
                <span>{t('buildB')}</span>
              </div>
              <div className="flex h-6 rounded overflow-hidden">
                <div
                  className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${compareResult.buildAWinRate}%` }}
                >
                  {compareResult.buildAWinRate > 15 && `${compareResult.buildAWinRate.toFixed(0)}%`}
                </div>
                <div
                  className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${compareResult.buildBWinRate}%` }}
                >
                  {compareResult.buildBWinRate > 15 && `${compareResult.buildBWinRate.toFixed(0)}%`}
                </div>
              </div>
            </div>

            {/* Stats Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="text-xs text-[var(--text-tertiary)] mb-1">{t('buildA')}</div>
                <div className="text-xl font-bold text-red-500">{dpsResult.mean.toFixed(0)}</div>
                <div className="text-xs text-[var(--text-secondary)]">DPS</div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-xs text-[var(--text-tertiary)] mb-1">{t('buildB')}</div>
                <div className="text-xl font-bold text-blue-500">{dpsResultB.mean.toFixed(0)}</div>
                <div className="text-xs text-[var(--text-secondary)]">DPS</div>
              </div>
            </div>

            {/* Difference */}
            <div className="flex items-center justify-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-lg">
              {compareResult.dpsDifference > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : compareResult.dpsDifference < 0 ? (
                <TrendingDown className="w-5 h-5 text-red-500" />
              ) : (
                <Minus className="w-5 h-5 text-gray-500" />
              )}
              <span className="text-lg font-bold">
                {compareResult.dpsDifference > 0 ? '+' : ''}
                {compareResult.dpsDifferencePercent.toFixed(1)}%
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                ({compareResult.dpsDifference > 0 ? '+' : ''}{compareResult.dpsDifference.toFixed(0)} DPS)
              </span>
            </div>

            {/* Side by side histograms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[var(--text-tertiary)] mb-1">{t('buildA')}</div>
                {renderHistogram(dpsResult.histogram, '#ef4444')}
              </div>
              <div>
                <div className="text-xs text-[var(--text-tertiary)] mb-1">{t('buildB')}</div>
                {renderHistogram(dpsResultB.histogram, '#3b82f6')}
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!dpsResult && !ttkResult && !compareResult && (
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm text-[var(--text-secondary)]">
                {t('description')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
