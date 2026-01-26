'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Coins, Plus, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, RefreshCw, Download,
  ArrowUpCircle, ArrowDownCircle, Settings, Info,
  Maximize2, X, Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  simulateEconomy,
  calculateBalanceSuggestions,
  DEFAULT_FAUCETS,
  DEFAULT_SINKS,
  DEFAULT_CONFIG,
  type Faucet,
  type Sink,
  type EconomyConfig,
  type EconomyResult
} from '@/lib/economySimulator';
import { useProjectStore } from '@/stores/projectStore';
import { Tooltip as TooltipUI } from '@/components/ui/Tooltip';

interface EconomyPanelProps {
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

export default function EconomyPanel({ showHelp, setShowHelp }: EconomyPanelProps) {
  const t = useTranslations('economy');

  // State
  const [faucets, setFaucets] = useState<Faucet[]>(DEFAULT_FAUCETS);
  const [sinks, setSinks] = useState<Sink[]>(DEFAULT_SINKS);
  const [config, setConfig] = useState<EconomyConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'faucets' | 'sinks' | 'config'>('faucets');
  const [fullscreenChart, setFullscreenChart] = useState(false);

  // 시뮬레이션 결과
  const result = useMemo(() => {
    return simulateEconomy(faucets, sinks, config);
  }, [faucets, sinks, config]);

  // 균형 제안
  const suggestions = useMemo(() => {
    return calculateBalanceSuggestions(faucets, sinks, config);
  }, [faucets, sinks, config]);

  // Faucet 추가
  const addFaucet = () => {
    const newFaucet: Faucet = {
      id: `faucet_${Date.now()}`,
      name: t('newFaucet'),
      ratePerHour: 100,
      playerPercentage: 0.5
    };
    setFaucets([...faucets, newFaucet]);
  };

  // Sink 추가
  const addSink = () => {
    const newSink: Sink = {
      id: `sink_${Date.now()}`,
      name: t('newSink'),
      costPerUse: 50,
      usesPerHour: 1,
      playerPercentage: 0.5,
      isRequired: false
    };
    setSinks([...sinks, newSink]);
  };

  // Faucet 업데이트
  const updateFaucet = (id: string, updates: Partial<Faucet>) => {
    setFaucets(faucets.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  // Sink 업데이트
  const updateSink = (id: string, updates: Partial<Sink>) => {
    setSinks(sinks.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Export
  const handleExport = () => {
    const data = {
      config,
      faucets,
      sinks,
      result,
      suggestions,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `economy-simulation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 숫자 포맷
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
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      {/* Scrollable Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Help Content */}
        {showHelp && (
          <div className="mx-4 mt-4 mb-2 p-3 rounded-lg animate-slideDown shrink-0" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#f59e0b20' }}>
                  <Coins className="w-3 h-3" style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('helpDesc')}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #22c55e' }}>
                  <span className="font-medium text-sm" style={{ color: '#22c55e' }}>{t('faucets')}</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpFaucet')}</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #ef4444' }}>
                  <span className="font-medium text-sm" style={{ color: '#ef4444' }}>{t('sinks')}</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpSink')}</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #f59e0b' }}>
                  <span className="font-medium text-sm" style={{ color: '#f59e0b' }}>{t('helpBalanceTitle')}</span>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpBalance')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Summary */}
        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="grid grid-cols-4 gap-3">
          {/* Faucet 총량 */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('totalFaucet')}</span>
            </div>
            <div className="text-lg font-bold" style={{ color: '#22c55e' }}>
              {formatNumber(result.totalFaucetPerHour)}/h
            </div>
          </div>

          {/* Sink 총량 */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('totalSink')}</span>
            </div>
            <div className="text-lg font-bold" style={{ color: '#ef4444' }}>
              {formatNumber(result.totalSinkPerHour)}/h
            </div>
          </div>

          {/* 순 유입 */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center gap-2 mb-1">
              {result.netFlowPerHour >= 0
                ? <TrendingUp className="w-4 h-4" style={{ color: '#f59e0b' }} />
                : <TrendingDown className="w-4 h-4" style={{ color: '#3b82f6' }} />
              }
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('netFlow')}</span>
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: result.netFlowPerHour >= 0 ? '#f59e0b' : '#3b82f6' }}
            >
              {result.netFlowPerHour >= 0 ? '+' : ''}{formatNumber(result.netFlowPerHour)}/h
            </div>
          </div>

          {/* 균형 상태 */}
          <div
            className="p-3 rounded-lg"
            style={{
              background: `${getSeverityColor(result.pinchPointAnalysis.severity)}15`,
              border: `1px solid ${getSeverityColor(result.pinchPointAnalysis.severity)}40`
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              {result.pinchPointAnalysis.isHealthy
                ? <CheckCircle className="w-4 h-4" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }} />
                : <AlertTriangle className="w-4 h-4" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }} />
              }
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('balance')}</span>
            </div>
            <div className="text-lg font-bold" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }}>
              {(result.faucetSinkRatio * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        {result.warnings.length > 0 && (
          <div className="mt-3 p-2 rounded-lg text-xs" style={{ background: '#f59e0b15', border: '1px solid #f59e0b40' }}>
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2" style={{ color: '#f59e0b' }}>
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

        {/* Main Content - Vertical Layout */}
        <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
          {/* Top: Input Panel */}
          <div className="border-b shrink-0" style={{ borderColor: 'var(--border-primary)' }}>
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--border-primary)' }}>
            {(['faucets', 'sinks', 'config'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: activeTab === tab ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderBottom: activeTab === tab ? '2px solid var(--primary-blue)' : '2px solid transparent'
                }}
              >
                {tab === 'faucets' && <>{t('faucets')} ({faucets.length})</>}
                {tab === 'sinks' && <>{t('sinks')} ({sinks.length})</>}
                {tab === 'config' && <>{t('settings')}</>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-3">
            {activeTab === 'faucets' && (
              <div className="flex flex-wrap gap-2">
                {faucets.map(faucet => (
                  <div
                    key={faucet.id}
                    className="p-3 rounded-lg space-y-2 w-full sm:w-auto sm:min-w-[240px] sm:flex-1 sm:max-w-[300px]"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid #22c55e30' }}
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={faucet.name}
                        onChange={(e) => updateFaucet(faucet.id, { name: e.target.value })}
                        className="text-sm font-medium bg-transparent border-none outline-none flex-1"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <button
                        onClick={() => setFaucets(faucets.filter(f => f.id !== faucet.id))}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <InputFieldWithCell
                        label={t('ratePerHour')}
                        value={faucet.ratePerHour}
                        onChange={(v) => updateFaucet(faucet.id, { ratePerHour: v })}
                      />
                      <InputFieldWithCell
                        label={t('playerPercent')}
                        value={faucet.playerPercentage * 100}
                        onChange={(v) => updateFaucet(faucet.id, { playerPercentage: v / 100 })}
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={addFaucet}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs transition-colors w-full sm:w-auto sm:min-w-[120px]"
                  style={{ background: '#22c55e20', color: '#22c55e', border: '1px dashed #22c55e40' }}
                >
                  <Plus className="w-3 h-3" /> {t('addFaucet')}
                </button>
              </div>
            )}

            {activeTab === 'sinks' && (
              <div className="flex flex-wrap gap-2">
                {sinks.map(sink => (
                  <div
                    key={sink.id}
                    className="p-3 rounded-lg space-y-2 w-full sm:w-auto sm:min-w-[280px] sm:flex-1 sm:max-w-[340px]"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid #ef444430' }}
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={sink.name}
                        onChange={(e) => updateSink(sink.id, { name: e.target.value })}
                        className="text-sm font-medium bg-transparent border-none outline-none flex-1"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <button
                        onClick={() => setSinks(sinks.filter(s => s.id !== sink.id))}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <InputFieldWithCell
                        label={t('costPerUse')}
                        value={sink.costPerUse}
                        onChange={(v) => updateSink(sink.id, { costPerUse: v })}
                      />
                      <InputFieldWithCell
                        label={t('usesPerHour')}
                        value={sink.usesPerHour}
                        onChange={(v) => updateSink(sink.id, { usesPerHour: v })}
                        step={0.1}
                      />
                      <InputFieldWithCell
                        label={t('playerPercent')}
                        value={sink.playerPercentage * 100}
                        onChange={(v) => updateSink(sink.id, { playerPercentage: v / 100 })}
                        min={0}
                        max={100}
                      />
                      <div className="flex flex-col justify-end">
                        <label className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('required')}</label>
                        <button
                          onClick={() => updateSink(sink.id, { isRequired: !sink.isRequired })}
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors duration-200 flex items-center",
                            sink.isRequired ? "bg-red-500" : "bg-[var(--bg-primary)]"
                          )}
                          style={{ border: sink.isRequired ? 'none' : '1px solid var(--border-primary)' }}
                        >
                          <span
                            className={cn(
                              "absolute w-3.5 h-3.5 rounded-full transition-all duration-200 shadow-sm",
                              sink.isRequired
                                ? "left-[18px] bg-white"
                                : "left-[3px] bg-[var(--text-tertiary)]"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addSink}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs transition-colors w-full sm:w-auto sm:min-w-[120px]"
                  style={{ background: '#ef444420', color: '#ef4444', border: '1px dashed #ef444440' }}
                >
                  <Plus className="w-3 h-3" /> {t('addSink')}
                </button>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="flex flex-wrap gap-3 items-end">
                <div className="w-full sm:w-auto sm:min-w-[180px]">
                  <ConfigInputField
                    label={t('currencyName')}
                    value={config.currencyName}
                    onChange={(v) => setConfig({ ...config, currencyName: String(v) })}
                    type="text"
                  />
                </div>
                <div className="w-full sm:w-auto sm:min-w-[140px]">
                  <ConfigInputField
                    label={t('playerCount')}
                    value={config.playerCount}
                    onChange={(v) => setConfig({ ...config, playerCount: Number(v) })}
                  />
                </div>
                <div className="w-full sm:w-auto sm:min-w-[140px]">
                  <ConfigInputField
                    label={t('initialSupply')}
                    value={config.initialSupply}
                    onChange={(v) => setConfig({ ...config, initialSupply: Number(v) })}
                  />
                </div>
                <div className="w-full sm:w-auto sm:min-w-[120px]">
                  <ConfigInputField
                    label={t('simulationDays')}
                    value={config.simulationDays}
                    onChange={(v) => setConfig({ ...config, simulationDays: Number(v) })}
                  />
                </div>
                <div className="w-full sm:w-auto sm:min-w-[140px]">
                  <ConfigInputField
                    label={`${t('targetInflation')} (%)`}
                    value={config.targetInflationRate * 100}
                    onChange={(v) => setConfig({ ...config, targetInflationRate: Number(v) / 100 })}
                    step={0.1}
                  />
                </div>

                <button
                  onClick={() => {
                    setFaucets(DEFAULT_FAUCETS);
                    setSinks(DEFAULT_SINKS);
                    setConfig(DEFAULT_CONFIG);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs h-[38px]"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <RefreshCw className="w-3 h-3" /> {t('resetDefaults')}
                </button>

                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs h-[38px]"
                  style={{ background: 'var(--primary-blue)', color: 'white' }}
                >
                  <Download className="w-3 h-3" /> {t('exportResults')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Charts and Analysis */}
        <div className="p-4 space-y-4">
          {/* 통화량 변화 그래프 */}
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('supplyOverTime')} ({config.simulationDays}{t('days')})
              </h3>
              <button
                onClick={() => setFullscreenChart(true)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                title="전체화면"
              >
                <Maximize2 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.supplyOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--border-primary)' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--border-primary)' }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatNumber(value), t('supply')]}
                    labelFormatter={(day) => `Day ${day}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="supply"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Faucet/Sink 분포 */}
          <div className="grid grid-cols-2 gap-4">
            {/* Faucet Breakdown */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#22c55e' }}>
                <ArrowUpCircle className="w-4 h-4" /> {t('faucetBreakdown')}
              </h3>
              <div className="space-y-2">
                {result.faucetBreakdown.map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{f.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${f.percentage}%`,
                          background: `hsl(${142 - i * 20}, 70%, 50%)`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sink Breakdown */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#ef4444' }}>
                <ArrowDownCircle className="w-4 h-4" /> {t('sinkBreakdown')}
              </h3>
              <div className="space-y-2">
                {result.sinkBreakdown.map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{s.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.percentage}%`,
                          background: `hsl(${0 + i * 15}, 70%, 50%)`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 균형 제안 */}
          <div
            className="p-4 rounded-lg"
            style={{
              background: `${getSeverityColor(result.pinchPointAnalysis.severity)}10`,
              border: `1px solid ${getSeverityColor(result.pinchPointAnalysis.severity)}30`
            }}
          >
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: getSeverityColor(result.pinchPointAnalysis.severity) }}>
              <Info className="w-4 h-4" /> {t('recommendations')}
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              {result.pinchPointAnalysis.recommendation}
            </p>
            {suggestions.explanation && (
              <p className="text-xs p-2 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {suggestions.explanation}
              </p>
            )}

            {/* 추가 통계 */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('inflationRate')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {(result.inflationRate * 100).toFixed(2)}%/{t('day')}
                </div>
              </div>
              <div className="text-center p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('daysToDouble')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.daysToDouble !== null ? `${result.daysToDouble.toFixed(0)}${t('days')}` : '-'}
                </div>
              </div>
              <div className="text-center p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('faucetSinkRatio')}</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {result.faucetSinkRatio.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Fullscreen Chart Modal */}
      {fullscreenChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setFullscreenChart(false)}
        >
          <div
            className="w-full h-full max-w-6xl max-h-[90vh] rounded-xl p-6 flex flex-col"
            style={{ background: 'var(--bg-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('supplyOverTime')} ({config.simulationDays}{t('days')})
              </h2>
              <button
                onClick={() => setFullscreenChart(false)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.supplyOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-primary)' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-primary)' }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    formatter={(value: number) => [formatNumber(value), t('supply')]}
                    labelFormatter={(day) => `Day ${day}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="supply"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 셀 선택 기능이 있는 입력 필드 컴포넌트
function InputFieldWithCell({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  className = '',
  inputClassName = '',
  labelClassName = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
}) {
  const t = useTranslations('economy');
  const [inputValue, setInputValue] = useState(String(value));
  const [isHovered, setIsHovered] = useState(false);
  const { startCellSelection, cellSelectionMode } = useProjectStore();

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
    <div className={className}>
      <label className={`text-[10px] ${labelClassName}`} style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
              setInputValue(newValue);
              const num = parseFloat(newValue);
              if (!isNaN(num)) {
                onChange(num);
              }
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
          className={`w-full px-2 py-1 pr-7 rounded text-xs ${inputClassName}`}
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
        />
        {isHovered && !cellSelectionMode.active && (
          <TooltipUI content={t('selectFromCell')} position="top">
            <button
              onClick={handleCellSelect}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors hover:bg-[var(--bg-hover)]"
            >
              <Grid3X3 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </TooltipUI>
        )}
      </div>
    </div>
  );
}

// Config 입력 필드 (더 큰 사이즈)
function ConfigInputField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  type = 'number',
}: {
  label: string;
  value: number | string;
  onChange: (v: number | string) => void;
  step?: number;
  min?: number;
  max?: number;
  type?: 'number' | 'text';
}) {
  const t = useTranslations('economy');
  const [inputValue, setInputValue] = useState(String(value));
  const [isHovered, setIsHovered] = useState(false);
  const { startCellSelection, cellSelectionMode } = useProjectStore();

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleCellSelect = () => {
    startCellSelection(label, (cellValue) => {
      setInputValue(String(cellValue));
      onChange(type === 'text' ? String(cellValue) : cellValue);
    });
  };

  const isNumeric = type === 'number';

  return (
    <div>
      <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <input
          type="text"
          inputMode={isNumeric ? "decimal" : "text"}
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            if (!isNumeric) {
              setInputValue(newValue);
              onChange(newValue);
            } else if (newValue === '' || /^-?\d*\.?\d*$/.test(newValue)) {
              setInputValue(newValue);
              const num = parseFloat(newValue);
              if (!isNaN(num)) {
                onChange(num);
              }
            }
          }}
          onBlur={() => {
            if (isNumeric) {
              const num = parseFloat(inputValue);
              if (isNaN(num) || inputValue === '') {
                setInputValue(String(min ?? 0));
                onChange(min ?? 0);
              } else {
                setInputValue(String(num));
              }
            }
          }}
          className="w-full px-3 py-2 pr-9 rounded-lg text-sm"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
        />
        {isHovered && !cellSelectionMode.active && isNumeric && (
          <TooltipUI content={t('selectFromCell')} position="top">
            <button
              onClick={handleCellSelect}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
            >
              <Grid3X3 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </TooltipUI>
        )}
      </div>
    </div>
  );
}
