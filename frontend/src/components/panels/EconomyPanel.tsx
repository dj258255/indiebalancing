'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Coins, Plus, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, RefreshCw, Download,
  ArrowUpCircle, ArrowDownCircle, Info,
  Maximize2, X, Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  simulateEconomy,
  calculateBalanceSuggestions,
  DEFAULT_FAUCETS,
  DEFAULT_SINKS,
  DEFAULT_CONFIG,
  type Faucet,
  type Sink,
  type EconomyConfig
} from '@/lib/economySimulator';
import { useProjectStore } from '@/stores/projectStore';
import { Tooltip as TooltipUI } from '@/components/ui/Tooltip';
import { useEscapeKey } from '@/hooks';

const PANEL_COLOR = '#f59e0b';

interface EconomyPanelProps {
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
  onClose?: () => void;
}

export default function EconomyPanel({ showHelp, setShowHelp, onClose }: EconomyPanelProps) {
  const t = useTranslations('economy');
  useEscapeKey(() => {
    if (onClose) onClose();
  });

  const [faucets, setFaucets] = useState<Faucet[]>(DEFAULT_FAUCETS);
  const [sinks, setSinks] = useState<Sink[]>(DEFAULT_SINKS);
  const [config, setConfig] = useState<EconomyConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'faucets' | 'sinks' | 'config'>('faucets');
  const [fullscreenChart, setFullscreenChart] = useState(false);

  const result = useMemo(() => simulateEconomy(faucets, sinks, config), [faucets, sinks, config]);
  const suggestions = useMemo(() => calculateBalanceSuggestions(faucets, sinks, config), [faucets, sinks, config]);

  const addFaucet = () => {
    setFaucets([...faucets, { id: `faucet_${Date.now()}`, name: t('newFaucet'), ratePerHour: 100, playerPercentage: 0.5 }]);
  };

  const addSink = () => {
    setSinks([...sinks, { id: `sink_${Date.now()}`, name: t('newSink'), costPerUse: 50, usesPerHour: 1, playerPercentage: 0.5, isRequired: false }]);
  };

  const updateFaucet = (id: string, updates: Partial<Faucet>) => {
    setFaucets(faucets.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const updateSink = (id: string, updates: Partial<Sink>) => {
    setSinks(sinks.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleExport = () => {
    const data = { config, faucets, sinks, result, suggestions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `economy-simulation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'good': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-slim">
        {/* Help Content */}
        {showHelp && (
          <div className="mx-4 mt-4 mb-2 glass-card p-4 animate-slideDown shrink-0 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}>
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('helpDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="glass-section p-2" style={{ borderLeft: '3px solid #22c55e' }}>
                <span className="font-semibold text-xs" style={{ color: '#22c55e' }}>{t('faucets')}</span>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('helpFaucet')}</p>
              </div>
              <div className="glass-section p-2" style={{ borderLeft: '3px solid #ef4444' }}>
                <span className="font-semibold text-xs" style={{ color: '#ef4444' }}>{t('sinks')}</span>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('helpSink')}</p>
              </div>
              <div className="glass-section p-2" style={{ borderLeft: `3px solid ${PANEL_COLOR}` }}>
                <span className="font-semibold text-xs" style={{ color: PANEL_COLOR }}>{t('helpBalanceTitle')}</span>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('helpBalance')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header Summary */}
        <div className="p-4 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            <div className="glass-stat">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpCircle className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('totalFaucet')}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{formatNumber(result.totalFaucetPerHour)}/h</div>
            </div>
            <div className="glass-stat">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('totalSink')}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: '#ef4444' }}>{formatNumber(result.totalSinkPerHour)}/h</div>
            </div>
            <div className="glass-stat">
              <div className="flex items-center gap-1.5 mb-1">
                {result.netFlowPerHour >= 0 ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />}
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('netFlow')}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: result.netFlowPerHour >= 0 ? '#f59e0b' : '#3b82f6' }}>{result.netFlowPerHour >= 0 ? '+' : ''}{formatNumber(result.netFlowPerHour)}/h</div>
            </div>
            <div className="glass-stat" style={{ background: `linear-gradient(135deg, ${getSeverityColor(result.pinchPointAnalysis.severity)}15, ${getSeverityColor(result.pinchPointAnalysis.severity)}05)` }}>
              <div className="flex items-center gap-1.5 mb-1">
                {result.pinchPointAnalysis.isHealthy ? <CheckCircle className="w-3.5 h-3.5" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }} /> : <AlertTriangle className="w-3.5 h-3.5" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }} />}
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('balance')}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }}>{(result.faucetSinkRatio * 100).toFixed(0)}%</div>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-3 glass-section p-2" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#f59e0b' }}>
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4">
          <div className="glass-tabs">
            {(['faucets', 'sinks', 'config'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn('glass-tab flex-1 text-center', activeTab === tab && 'active')}
              >
                {tab === 'faucets' && <>{t('faucets')} ({faucets.length})</>}
                {tab === 'sinks' && <>{t('sinks')} ({sinks.length})</>}
                {tab === 'config' && <>{t('settings')}</>}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-4">
          {activeTab === 'faucets' && (
            <div className="flex flex-wrap gap-2">
              {faucets.map(faucet => (
                <div key={faucet.id} className="glass-card p-3 space-y-2 flex-1 min-w-[220px] max-w-[280px]" style={{ borderLeft: '3px solid #22c55e' }}>
                  <div className="flex items-center justify-between">
                    <input type="text" value={faucet.name} onChange={(e) => updateFaucet(faucet.id, { name: e.target.value })} className="text-sm font-semibold bg-transparent border-none outline-none flex-1" style={{ color: 'var(--text-primary)' }} />
                    <button onClick={() => setFaucets(faucets.filter(f => f.id !== faucet.id))} className="p-1 rounded-lg hover:bg-red-500/20"><Trash2 className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <GlassInputField label={t('ratePerHour')} value={faucet.ratePerHour} onChange={(v) => updateFaucet(faucet.id, { ratePerHour: v })} />
                    <GlassInputField label={t('playerPercent')} value={faucet.playerPercentage * 100} onChange={(v) => updateFaucet(faucet.id, { playerPercentage: v / 100 })} min={0} max={100} />
                  </div>
                </div>
              ))}
              <button onClick={addFaucet} className="glass-card flex items-center justify-center gap-2 px-4 py-3 text-xs min-w-[120px]" style={{ color: '#22c55e', borderStyle: 'dashed' }}>
                <Plus className="w-3 h-3" /> {t('addFaucet')}
              </button>
            </div>
          )}

          {activeTab === 'sinks' && (
            <div className="flex flex-wrap gap-2">
              {sinks.map(sink => (
                <div key={sink.id} className="glass-card p-3 space-y-2 flex-1 min-w-[260px] max-w-[320px]" style={{ borderLeft: '3px solid #ef4444' }}>
                  <div className="flex items-center justify-between">
                    <input type="text" value={sink.name} onChange={(e) => updateSink(sink.id, { name: e.target.value })} className="text-sm font-semibold bg-transparent border-none outline-none flex-1" style={{ color: 'var(--text-primary)' }} />
                    <button onClick={() => setSinks(sinks.filter(s => s.id !== sink.id))} className="p-1 rounded-lg hover:bg-red-500/20"><Trash2 className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <GlassInputField label={t('costPerUse')} value={sink.costPerUse} onChange={(v) => updateSink(sink.id, { costPerUse: v })} />
                    <GlassInputField label={t('usesPerHour')} value={sink.usesPerHour} onChange={(v) => updateSink(sink.id, { usesPerHour: v })} step={0.1} />
                    <GlassInputField label={t('playerPercent')} value={sink.playerPercentage * 100} onChange={(v) => updateSink(sink.id, { playerPercentage: v / 100 })} min={0} max={100} />
                    <div className="flex flex-col">
                      <label className="text-[10px] mb-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>{t('required')}</label>
                      <button
                        onClick={() => updateSink(sink.id, { isRequired: !sink.isRequired })}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
                        style={{
                          background: sink.isRequired ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                          border: `1px solid ${sink.isRequired ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-primary)'}`,
                          color: sink.isRequired ? '#ef4444' : 'var(--text-tertiary)'
                        }}
                      >
                        <div className={cn("w-7 h-4 rounded-full relative transition-colors duration-200", sink.isRequired ? "bg-red-500" : "bg-[var(--bg-tertiary)]")} style={{ border: sink.isRequired ? 'none' : '1px solid var(--border-secondary)' }}>
                          <span className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200 shadow-sm", sink.isRequired ? "left-[14px] bg-white" : "left-0.5 bg-[var(--text-tertiary)]")} />
                        </div>
                        <span>{sink.isRequired ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addSink} className="glass-card flex items-center justify-center gap-2 px-4 py-3 text-xs min-w-[120px]" style={{ color: '#ef4444', borderStyle: 'dashed' }}>
                <Plus className="w-3 h-3" /> {t('addSink')}
              </button>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="flex flex-wrap gap-3 items-end">
              <GlassConfigInput label={t('currencyName')} value={config.currencyName} onChange={(v) => setConfig({ ...config, currencyName: String(v) })} type="text" />
              <GlassConfigInput label={t('playerCount')} value={config.playerCount} onChange={(v) => setConfig({ ...config, playerCount: Number(v) })} />
              <GlassConfigInput label={t('initialSupply')} value={config.initialSupply} onChange={(v) => setConfig({ ...config, initialSupply: Number(v) })} />
              <GlassConfigInput label={t('simulationDays')} value={config.simulationDays} onChange={(v) => setConfig({ ...config, simulationDays: Number(v) })} />
              <GlassConfigInput label={`${t('targetInflation')} (%)`} value={config.targetInflationRate * 100} onChange={(v) => setConfig({ ...config, targetInflationRate: Number(v) / 100 })} step={0.1} />
              <button onClick={() => { setFaucets(DEFAULT_FAUCETS); setSinks(DEFAULT_SINKS); setConfig(DEFAULT_CONFIG); }} className="glass-button flex items-center gap-1.5 text-xs">
                <RefreshCw className="w-3 h-3" /> {t('resetDefaults')}
              </button>
              <button onClick={handleExport} className="glass-button-primary flex items-center gap-1.5 text-xs">
                <Download className="w-3 h-3" /> {t('exportResults')}
              </button>
            </div>
          )}

          {/* Supply Chart */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('supplyOverTime')} ({config.simulationDays}{t('days')})</h3>
              <button onClick={() => setFullscreenChart(true)} className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"><Maximize2 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.supplyOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--border-primary)' }} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--border-primary)' }} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', fontSize: '12px' }} formatter={(value: number) => [formatNumber(value), t('supply')]} labelFormatter={(day) => `Day ${day}`} />
                  <Line type="monotone" dataKey="supply" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: '#22c55e' }}><ArrowUpCircle className="w-4 h-4" /> {t('faucetBreakdown')}</h3>
              <div className="space-y-2">
                {result.faucetBreakdown.map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{f.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="glass-progress"><div className="glass-progress-bar" style={{ width: `${f.percentage}%`, background: `hsl(${142 - i * 20}, 70%, 50%)` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-4">
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: '#ef4444' }}><ArrowDownCircle className="w-4 h-4" /> {t('sinkBreakdown')}</h3>
              <div className="space-y-2">
                {result.sinkBreakdown.map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="glass-progress"><div className="glass-progress-bar" style={{ width: `${s.percentage}%`, background: `hsl(${0 + i * 15}, 70%, 50%)` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="glass-card p-4" style={{ background: `linear-gradient(135deg, ${getSeverityColor(result.pinchPointAnalysis.severity)}10, transparent)` }}>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }}><Info className="w-4 h-4" /> {t('recommendations')}</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{result.pinchPointAnalysis.recommendation}</p>
            {suggestions.explanation && <p className="text-xs glass-section p-2" style={{ color: 'var(--text-primary)' }}>{suggestions.explanation}</p>}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="glass-section p-2 text-center">
                <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('inflationRate')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{(result.inflationRate * 100).toFixed(2)}%/{t('day')}</div>
              </div>
              <div className="glass-section p-2 text-center">
                <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('daysToDouble')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.daysToDouble !== null ? `${result.daysToDouble.toFixed(0)}${t('days')}` : '-'}</div>
              </div>
              <div className="glass-section p-2 text-center">
                <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('faucetSinkRatio')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.faucetSinkRatio.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Chart Modal */}
      {fullscreenChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.8)' }} onClick={() => setFullscreenChart(false)}>
          <div className="glass-panel w-full h-full max-w-6xl max-h-[90vh] p-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('supplyOverTime')} ({config.simulationDays}{t('days')})</h2>
              <button onClick={() => setFullscreenChart(false)} className="glass-button !p-2"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.supplyOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={{ stroke: 'var(--border-primary)' }} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={{ stroke: 'var(--border-primary)' }} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', fontSize: '14px' }} formatter={(value: number) => [formatNumber(value), t('supply')]} labelFormatter={(day) => `Day ${day}`} />
                  <Line type="monotone" dataKey="supply" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlassInputField({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  const t = useTranslations('economy');
  const [inputValue, setInputValue] = useState(String(value));
  const [isHovered, setIsHovered] = useState(false);
  const { startCellSelection, cellSelectionMode } = useProjectStore();

  useEffect(() => { setInputValue(String(value)); }, [value]);

  const handleCellSelect = () => {
    startCellSelection(label, (cellValue) => { setInputValue(String(cellValue)); onChange(cellValue); });
  };

  return (
    <div>
      <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => { const v = e.target.value; if (v === '' || /^-?\d*\.?\d*$/.test(v)) { setInputValue(v); const n = parseFloat(v); if (!isNaN(n)) onChange(n); } }}
          onBlur={() => { const n = parseFloat(inputValue); if (isNaN(n) || inputValue === '') { setInputValue(String(min ?? 0)); onChange(min ?? 0); } else { setInputValue(String(n)); } }}
          className="glass-input w-full !py-1.5 pr-7 text-xs"
        />
        {isHovered && !cellSelectionMode.active && (
          <TooltipUI content={t('selectFromCell')} position="top">
            <button onClick={handleCellSelect} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Grid3X3 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /></button>
          </TooltipUI>
        )}
      </div>
    </div>
  );
}

function GlassConfigInput({ label, value, onChange, step = 1, type = 'number' }: { label: string; value: number | string; onChange: (v: number | string) => void; step?: number; type?: 'number' | 'text' }) {
  const t = useTranslations('economy');
  const [inputValue, setInputValue] = useState(String(value));
  const [isHovered, setIsHovered] = useState(false);
  const { startCellSelection, cellSelectionMode } = useProjectStore();
  const isNumeric = type === 'number';

  useEffect(() => { setInputValue(String(value)); }, [value]);

  const handleCellSelect = () => {
    startCellSelection(label, (cellValue) => { setInputValue(String(cellValue)); onChange(isNumeric ? cellValue : String(cellValue)); });
  };

  return (
    <div className="min-w-[140px]">
      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <input
          type="text"
          inputMode={isNumeric ? "decimal" : "text"}
          value={inputValue}
          onChange={(e) => { const v = e.target.value; if (!isNumeric) { setInputValue(v); onChange(v); } else if (v === '' || /^-?\d*\.?\d*$/.test(v)) { setInputValue(v); const n = parseFloat(v); if (!isNaN(n)) onChange(n); } }}
          onBlur={() => { if (isNumeric) { const n = parseFloat(inputValue); if (isNaN(n) || inputValue === '') { setInputValue('0'); onChange(0); } else { setInputValue(String(n)); } } }}
          className="glass-input w-full pr-9 text-sm"
        />
        {isHovered && !cellSelectionMode.active && isNumeric && (
          <TooltipUI content={t('selectFromCell')} position="top">
            <button onClick={handleCellSelect} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><Grid3X3 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>
          </TooltipUI>
        )}
      </div>
    </div>
  );
}
