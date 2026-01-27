'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart2, Play, RefreshCw, Info, TrendingUp, TrendingDown, Minus, Sword, Shield as ShieldIcon, Maximize2, X, Grid3X3, Settings, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { useEscapeKey } from '@/hooks';
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
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

type SimMode = 'dps' | 'ttk' | 'compare';

const PANEL_COLOR = '#f97316';
const MODE_COLORS = {
  dps: '#3b82f6',
  ttk: '#22c55e',
  compare: '#8b5cf6',
};

export default function DPSVariancePanel({ onClose, isPanel, showHelp, setShowHelp }: DPSVariancePanelProps) {
  const t = useTranslations('dpsVariance');
  const tCommon = useTranslations('common');
  useEscapeKey(onClose);

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

  // Build B configuration
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
  const [fullscreenChart, setFullscreenChart] = useState<'dps' | 'ttk' | 'compareA' | 'compareB' | null>(null);

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

  const renderHistogram = (histogram: { min: number; max: number; count: number; percentage: number }[], color: string = '#3b82f6') => {
    const maxPercent = Math.max(...histogram.map(h => h.percentage));
    return (
      <div className="flex items-end gap-0.5 h-28 mt-2">
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
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="glass-card px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{bin.min.toFixed(0)} - {bin.max.toFixed(0)}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{bin.count} ({bin.percentage.toFixed(1)}%)</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPercentileBar = (percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number }, min: number, max: number) => {
    const range = max - min;
    const getPos = (val: number) => ((val - min) / range) * 100;

    return (
      <div className="relative h-6 mt-4 mb-2">
        <div className="absolute inset-y-2 left-0 right-0 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        <div
          className="absolute inset-y-1 rounded"
          style={{
            left: `${getPos(percentiles.p25)}%`,
            right: `${100 - getPos(percentiles.p75)}%`,
            background: `${PANEL_COLOR}30`,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-0.5"
          style={{
            left: `${getPos(percentiles.p5)}%`,
            right: `${100 - getPos(percentiles.p25)}%`,
            background: 'var(--text-tertiary)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-0.5"
          style={{
            left: `${getPos(percentiles.p75)}%`,
            right: `${100 - getPos(percentiles.p95)}%`,
            background: 'var(--text-tertiary)',
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{ left: `${getPos(percentiles.p50)}%`, background: '#f59e0b' }}
        />
        <div className="absolute -bottom-5 text-[10px]" style={{ left: `${getPos(percentiles.p5)}%`, transform: 'translateX(-50%)', color: 'var(--text-tertiary)' }}>5%</div>
        <div className="absolute -bottom-5 text-[10px]" style={{ left: `${getPos(percentiles.p50)}%`, transform: 'translateX(-50%)', color: 'var(--text-tertiary)' }}>50%</div>
        <div className="absolute -bottom-5 text-[10px]" style={{ left: `${getPos(percentiles.p95)}%`, transform: 'translateX(-50%)', color: 'var(--text-tertiary)' }}>95%</div>
      </div>
    );
  };

  const { startCellSelection, cellSelectionMode } = useProjectStore();

  const InputFieldWithCell = ({ label, value, onChange, min, max, step = 1, unit }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
  }) => {
    const [inputValue, setInputValue] = useState(String(value));
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      setInputValue(String(value));
    }, [value]);

    const handleCellSelect = () => {
      startCellSelection(label, (cellValue) => {
        setInputValue(String(cellValue));
        onChange(cellValue);
      });
    };

    return (
      <div className="flex items-center gap-2" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <label className="text-xs w-20 shrink-0 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <div className="flex-1 relative">
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
                setInputValue(newValue);
                const num = parseFloat(newValue);
                if (!isNaN(num)) onChange(num);
              }
            }}
            onBlur={() => {
              const num = parseFloat(inputValue);
              if (isNaN(num) || inputValue === '') {
                setInputValue(String(min ?? 0));
                onChange(min ?? 0);
              } else {
                setInputValue(String(num));
              }
            }}
            className="glass-input w-full text-sm !pr-8"
          />
          {isHovered && !cellSelectionMode.active && (
            <Tooltip content={t('selectFromCell')} position="top">
              <button
                onClick={handleCellSelect}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Grid3X3 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </Tooltip>
          )}
        </div>
        {unit && <span className="text-xs w-8" style={{ color: 'var(--text-tertiary)' }}>{unit}</span>}
      </div>
    );
  };

  const InputFieldSimple = ({ label, value, onChange, min, max, step = 1, unit }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
  }) => {
    const [inputValue, setInputValue] = useState(String(value));

    useEffect(() => {
      setInputValue(String(value));
    }, [value]);

    return (
      <div className="flex items-center gap-2">
        <label className="text-xs w-20 shrink-0 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
              setInputValue(newValue);
              const num = parseFloat(newValue);
              if (!isNaN(num)) onChange(num);
            }
          }}
          onBlur={() => {
            const num = parseFloat(inputValue);
            if (isNaN(num) || inputValue === '') {
              setInputValue(String(min ?? 0));
              onChange(min ?? 0);
            } else {
              setInputValue(String(num));
            }
          }}
          className="glass-input flex-1 text-sm"
        />
        {unit && <span className="text-xs w-8" style={{ color: 'var(--text-tertiary)' }}>{unit}</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 scrollbar-slim">
        {/* Help Content */}
        {showHelp && (
          <div className="glass-card p-4 animate-slideDown space-y-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}
              >
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('helpDesc')}</p>
              </div>
            </div>

            <div className="glass-section p-2.5" style={{ borderLeft: `3px solid #f59e0b` }}>
              <span className="font-medium text-xs" style={{ color: '#f59e0b' }}>{t('helpDiffTitle')}</span>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpDiff')}</p>
            </div>

            <div className="space-y-2">
              {[
                { mode: 'dps', color: MODE_COLORS.dps },
                { mode: 'ttk', color: MODE_COLORS.ttk },
                { mode: 'compare', color: MODE_COLORS.compare },
              ].map(({ mode: m, color }) => (
                <div key={m} className="glass-section p-2.5" style={{ borderLeft: `3px solid ${color}` }}>
                  <span className="font-medium text-xs" style={{ color }}>{t(`mode.${m}`)}</span>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t(`help${m.charAt(0).toUpperCase() + m.slice(1)}`)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="glass-card p-1.5">
          <div className="flex gap-1">
            {(['dps', 'ttk', 'compare'] as SimMode[]).map(m => {
              const isActive = mode === m;
              const color = MODE_COLORS[m];
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); resetSimulation(); }}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm font-medium rounded-xl transition-all',
                    isActive && 'shadow-sm'
                  )}
                  style={{
                    background: isActive ? `${color}15` : 'transparent',
                    color: isActive ? color : 'var(--text-secondary)',
                    border: isActive ? `1px solid ${color}` : '1px solid transparent',
                  }}
                >
                  {t(`mode.${m}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Build A Configuration */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sword className="w-4 h-4" style={{ color: '#ef4444' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'compare' ? t('buildA') : t('config')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InputFieldWithCell label={t('damage')} value={damage} onChange={setDamage} min={1} max={999999} />
            <InputFieldWithCell label={t('attackSpeed')} value={attackSpeed} onChange={setAttackSpeed} min={0.1} max={10} step={0.1} unit="/s" />
            <InputFieldWithCell label={t('critRate')} value={critRate} onChange={setCritRate} min={0} max={100} unit="%" />
            <InputFieldWithCell label={t('critDamage')} value={critDamage} onChange={setCritDamage} min={1} max={10} step={0.1} unit="x" />
            <InputFieldWithCell label={t('variance')} value={damageVariance} onChange={setDamageVariance} min={0} max={100} unit="%" />
            {mode === 'ttk' && (
              <InputFieldWithCell label={t('targetHP')} value={targetHP} onChange={setTargetHP} min={1} max={9999999} />
            )}
          </div>
        </div>

        {/* Build B Configuration */}
        {mode === 'compare' && (
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('buildB')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <InputFieldWithCell label={t('damage')} value={damageB} onChange={setDamageB} min={1} max={999999} />
              <InputFieldWithCell label={t('attackSpeed')} value={attackSpeedB} onChange={setAttackSpeedB} min={0.1} max={10} step={0.1} unit="/s" />
              <InputFieldWithCell label={t('critRate')} value={critRateB} onChange={setCritRateB} min={0} max={100} unit="%" />
              <InputFieldWithCell label={t('critDamage')} value={critDamageB} onChange={setCritDamageB} min={1} max={10} step={0.1} unit="x" />
              <InputFieldWithCell label={t('variance')} value={damageVarianceB} onChange={setDamageVarianceB} min={0} max={100} unit="%" />
            </div>
          </div>
        )}

        {/* Simulation Settings */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" style={{ color: PANEL_COLOR }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('simSettings') || 'Simulation Settings'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InputFieldSimple label={t('iterations')} value={iterations} onChange={setIterations} min={100} max={10000} />
            {mode !== 'ttk' && (
              <InputFieldSimple label={t('duration')} value={duration} onChange={setDuration} min={1} max={60} unit="s" />
            )}
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
            isSimulating ? 'glass-button cursor-not-allowed opacity-50' : ''
          )}
          style={{
            background: isSimulating ? 'var(--bg-tertiary)' : `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}dd)`,
            color: isSimulating ? 'var(--text-tertiary)' : 'white',
            boxShadow: isSimulating ? 'none' : `0 4px 16px ${PANEL_COLOR}40`,
          }}
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
          <div className="glass-card p-4 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: PANEL_COLOR }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('results')}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="glass-stat text-center">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('mean')}</div>
                <div className="text-lg font-bold" style={{ color: PANEL_COLOR }}>{dpsResult.mean.toFixed(1)}</div>
              </div>
              <div className="glass-stat text-center">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('stdDev')}</div>
                <div className="text-lg font-bold" style={{ color: '#3b82f6' }}>{dpsResult.stdDev.toFixed(1)}</div>
              </div>
              <div className="glass-stat text-center">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('cv')}</div>
                <div className="text-lg font-bold" style={{ color: '#8b5cf6' }}>{dpsResult.coefficientOfVariation.toFixed(1)}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>{t('range')}</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {dpsResult.min.toFixed(0)} - {dpsResult.max.toFixed(0)} DPS
              </span>
            </div>

            <div className="glass-section p-3 relative group">
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('distribution')}</div>
              <button
                onClick={() => setFullscreenChart('dps')}
                className="absolute top-2 right-2 glass-button !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title={tCommon('fullscreen')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              {renderHistogram(dpsResult.histogram, PANEL_COLOR)}
            </div>

            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('percentiles')}</div>
              {renderPercentileBar(dpsResult.percentiles, dpsResult.min, dpsResult.max)}
            </div>

            <div className="grid grid-cols-4 gap-1 text-xs mt-6">
              {['p5', 'p25', 'p75', 'p95'].map(p => (
                <div key={p} className="glass-stat text-center !p-1.5">
                  <div style={{ color: 'var(--text-tertiary)' }}>P{p.slice(1)}</div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {dpsResult.percentiles[p as keyof typeof dpsResult.percentiles].toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TTK Results */}
        {ttkResult && mode === 'ttk' && (
          <div className="glass-card p-4 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: MODE_COLORS.ttk }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('results')}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="glass-stat text-center">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('meanTTK')}</div>
                <div className="text-lg font-bold" style={{ color: PANEL_COLOR }}>{ttkResult.mean.toFixed(2)}s</div>
              </div>
              <div className="glass-stat text-center">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('minTTK')}</div>
                <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{ttkResult.min.toFixed(2)}s</div>
              </div>
              <div className="glass-stat text-center">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('maxTTK')}</div>
                <div className="text-lg font-bold" style={{ color: '#ef4444' }}>{ttkResult.max.toFixed(2)}s</div>
              </div>
            </div>

            <div className="glass-section p-3 relative group">
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('ttkDistribution')}</div>
              <button
                onClick={() => setFullscreenChart('ttk')}
                className="absolute top-2 right-2 glass-button !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title={tCommon('fullscreen')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              {renderHistogram(ttkResult.histogram, '#22c55e')}
            </div>
          </div>
        )}

        {/* Compare Results */}
        {compareResult && mode === 'compare' && dpsResult && dpsResultB && (
          <div className="glass-card p-4 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: MODE_COLORS.compare }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('comparisonResults')}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{t('buildA')}</span>
                <span>{t('buildB')}</span>
              </div>
              <div className="flex h-6 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${compareResult.buildAWinRate}%`, background: '#ef4444' }}
                >
                  {compareResult.buildAWinRate > 15 && `${compareResult.buildAWinRate.toFixed(0)}%`}
                </div>
                <div
                  className="flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${compareResult.buildBWinRate}%`, background: '#3b82f6' }}
                >
                  {compareResult.buildBWinRate > 15 && `${compareResult.buildBWinRate.toFixed(0)}%`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-section p-3" style={{ borderLeft: '3px solid #ef4444' }}>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('buildA')}</div>
                <div className="text-xl font-bold" style={{ color: '#ef4444' }}>{dpsResult.mean.toFixed(0)}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>DPS</div>
              </div>
              <div className="glass-section p-3" style={{ borderLeft: '3px solid #3b82f6' }}>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('buildB')}</div>
                <div className="text-xl font-bold" style={{ color: '#3b82f6' }}>{dpsResultB.mean.toFixed(0)}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>DPS</div>
              </div>
            </div>

            <div className="glass-section flex items-center justify-center gap-2 p-3">
              {compareResult.dpsDifference > 0 ? (
                <TrendingUp className="w-5 h-5" style={{ color: '#22c55e' }} />
              ) : compareResult.dpsDifference < 0 ? (
                <TrendingDown className="w-5 h-5" style={{ color: '#ef4444' }} />
              ) : (
                <Minus className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              )}
              <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {compareResult.dpsDifference > 0 ? '+' : ''}
                {compareResult.dpsDifferencePercent.toFixed(1)}%
              </span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                ({compareResult.dpsDifference > 0 ? '+' : ''}{compareResult.dpsDifference.toFixed(0)} DPS)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-section p-3 relative group">
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('buildA')}</div>
                <button
                  onClick={() => setFullscreenChart('compareA')}
                  className="absolute top-2 right-2 glass-button !p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                {renderHistogram(dpsResult.histogram, '#ef4444')}
              </div>
              <div className="glass-section p-3 relative group">
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('buildB')}</div>
                <button
                  onClick={() => setFullscreenChart('compareB')}
                  className="absolute top-2 right-2 glass-button !p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                {renderHistogram(dpsResultB.histogram, '#3b82f6')}
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!dpsResult && !ttkResult && !compareResult && (
          <div className="glass-card p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#3b82f6' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Chart Modal */}
      {fullscreenChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setFullscreenChart(null)}
        >
          <div
            className="glass-panel w-full max-w-4xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-panel-header">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}
                >
                  <BarChart2 className="w-4.5 h-4.5 text-white" />
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {fullscreenChart === 'dps' && t('distribution')}
                  {fullscreenChart === 'ttk' && t('ttkDistribution')}
                  {fullscreenChart === 'compareA' && `${t('buildA')} - ${t('distribution')}`}
                  {fullscreenChart === 'compareB' && `${t('buildB')} - ${t('distribution')}`}
                </h3>
              </div>
              <button onClick={() => setFullscreenChart(null)} className="glass-button !p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 flex flex-col">
              {fullscreenChart === 'dps' && dpsResult && (
                <>
                  <div className="flex-1 flex items-end gap-1 min-h-0">
                    {dpsResult.histogram.map((bin, i) => {
                      const maxPercent = Math.max(...dpsResult.histogram.map(h => h.percentage));
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div
                            className="w-full rounded-t transition-all duration-200 hover:opacity-80"
                            style={{
                              height: `${(bin.percentage / maxPercent) * 100}%`,
                              minHeight: bin.count > 0 ? '4px' : '0',
                              background: PANEL_COLOR,
                            }}
                          />
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="glass-card px-3 py-2 text-sm whitespace-nowrap shadow-lg">
                              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{bin.min.toFixed(0)} - {bin.max.toFixed(0)} DPS</div>
                              <div style={{ color: 'var(--text-secondary)' }}>{bin.count} ({bin.percentage.toFixed(1)}%)</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-2 text-sm">
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('mean')}</div>
                      <div className="font-bold" style={{ color: PANEL_COLOR }}>{dpsResult.mean.toFixed(1)}</div>
                    </div>
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('stdDev')}</div>
                      <div className="font-bold" style={{ color: '#3b82f6' }}>{dpsResult.stdDev.toFixed(1)}</div>
                    </div>
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Min</div>
                      <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{dpsResult.min.toFixed(0)}</div>
                    </div>
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Max</div>
                      <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{dpsResult.max.toFixed(0)}</div>
                    </div>
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('cv')}</div>
                      <div className="font-bold" style={{ color: '#8b5cf6' }}>{dpsResult.coefficientOfVariation.toFixed(1)}%</div>
                    </div>
                  </div>
                </>
              )}

              {fullscreenChart === 'ttk' && ttkResult && (
                <>
                  <div className="flex-1 flex items-end gap-1 min-h-0">
                    {ttkResult.histogram.map((bin, i) => {
                      const maxPercent = Math.max(...ttkResult.histogram.map(h => h.percentage));
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div
                            className="w-full rounded-t transition-all duration-200 hover:opacity-80"
                            style={{
                              height: `${(bin.percentage / maxPercent) * 100}%`,
                              minHeight: bin.count > 0 ? '4px' : '0',
                              background: '#22c55e',
                            }}
                          />
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="glass-card px-3 py-2 text-sm whitespace-nowrap shadow-lg">
                              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{bin.min.toFixed(2)}s - {bin.max.toFixed(2)}s</div>
                              <div style={{ color: 'var(--text-secondary)' }}>{bin.count} ({bin.percentage.toFixed(1)}%)</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('meanTTK')}</div>
                      <div className="font-bold" style={{ color: PANEL_COLOR }}>{ttkResult.mean.toFixed(2)}s</div>
                    </div>
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('minTTK')}</div>
                      <div className="font-bold" style={{ color: '#22c55e' }}>{ttkResult.min.toFixed(2)}s</div>
                    </div>
                    <div className="glass-stat text-center">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('maxTTK')}</div>
                      <div className="font-bold" style={{ color: '#ef4444' }}>{ttkResult.max.toFixed(2)}s</div>
                    </div>
                  </div>
                </>
              )}

              {(fullscreenChart === 'compareA' || fullscreenChart === 'compareB') && (
                <>
                  {(() => {
                    const result = fullscreenChart === 'compareA' ? dpsResult : dpsResultB;
                    const color = fullscreenChart === 'compareA' ? '#ef4444' : '#3b82f6';
                    if (!result) return null;
                    return (
                      <>
                        <div className="flex-1 flex items-end gap-1 min-h-0">
                          {result.histogram.map((bin, i) => {
                            const maxPercent = Math.max(...result.histogram.map(h => h.percentage));
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                <div
                                  className="w-full rounded-t transition-all duration-200 hover:opacity-80"
                                  style={{
                                    height: `${(bin.percentage / maxPercent) * 100}%`,
                                    minHeight: bin.count > 0 ? '4px' : '0',
                                    background: color,
                                  }}
                                />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  <div className="glass-card px-3 py-2 text-sm whitespace-nowrap shadow-lg">
                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{bin.min.toFixed(0)} - {bin.max.toFixed(0)} DPS</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{bin.count} ({bin.percentage.toFixed(1)}%)</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                          <div className="glass-stat text-center">
                            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('mean')}</div>
                            <div className="font-bold" style={{ color }}>{result.mean.toFixed(1)} DPS</div>
                          </div>
                          <div className="glass-stat text-center">
                            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('stdDev')}</div>
                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{result.stdDev.toFixed(1)}</div>
                          </div>
                          <div className="glass-stat text-center">
                            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('cv')}</div>
                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{result.coefficientOfVariation.toFixed(1)}%</div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
