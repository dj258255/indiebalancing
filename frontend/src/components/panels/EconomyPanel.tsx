'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Coins, Plus, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, RefreshCw, Download,
  ArrowUpCircle, ArrowDownCircle, Settings, Info,
  Maximize2, X
} from 'lucide-react';
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
      <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden">
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left: Input Panel */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r flex flex-col shrink-0 lg:shrink" style={{ borderColor: 'var(--border-primary)' }}>
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'faucets' && (
              <>
                {faucets.map(faucet => (
                  <div
                    key={faucet.id}
                    className="p-3 rounded-lg space-y-2"
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
                      <div>
                        <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('ratePerHour')}</label>
                        <input
                          type="number"
                          value={faucet.ratePerHour}
                          onChange={(e) => updateFaucet(faucet.id, { ratePerHour: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('playerPercent')}</label>
                        <input
                          type="number"
                          value={faucet.playerPercentage * 100}
                          onChange={(e) => updateFaucet(faucet.id, { playerPercentage: Number(e.target.value) / 100 })}
                          className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addFaucet}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{ background: '#22c55e20', color: '#22c55e', border: '1px dashed #22c55e40' }}
                >
                  <Plus className="w-3 h-3" /> {t('addFaucet')}
                </button>
              </>
            )}

            {activeTab === 'sinks' && (
              <>
                {sinks.map(sink => (
                  <div
                    key={sink.id}
                    className="p-3 rounded-lg space-y-2"
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
                      <div>
                        <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('costPerUse')}</label>
                        <input
                          type="number"
                          value={sink.costPerUse}
                          onChange={(e) => updateSink(sink.id, { costPerUse: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('usesPerHour')}</label>
                        <input
                          type="number"
                          value={sink.usesPerHour}
                          onChange={(e) => updateSink(sink.id, { usesPerHour: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          step={0.1}
                        />
                      </div>
                      <div>
                        <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('playerPercent')}</label>
                        <input
                          type="number"
                          value={sink.playerPercentage * 100}
                          onChange={(e) => updateSink(sink.id, { playerPercentage: Number(e.target.value) / 100 })}
                          className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                          min={0}
                          max={100}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sink.isRequired}
                          onChange={(e) => updateSink(sink.id, { isRequired: e.target.checked })}
                          className="rounded"
                        />
                        <label className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('required')}</label>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addSink}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{ background: '#ef444420', color: '#ef4444', border: '1px dashed #ef444440' }}
                >
                  <Plus className="w-3 h-3" /> {t('addSink')}
                </button>
              </>
            )}

            {activeTab === 'config' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('currencyName')}</label>
                  <input
                    type="text"
                    value={config.currencyName}
                    onChange={(e) => setConfig({ ...config, currencyName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('playerCount')}</label>
                  <input
                    type="number"
                    value={config.playerCount}
                    onChange={(e) => setConfig({ ...config, playerCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('initialSupply')}</label>
                  <input
                    type="number"
                    value={config.initialSupply}
                    onChange={(e) => setConfig({ ...config, initialSupply: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('simulationDays')}</label>
                  <input
                    type="number"
                    value={config.simulationDays}
                    onChange={(e) => setConfig({ ...config, simulationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('targetInflation')} (%)</label>
                  <input
                    type="number"
                    value={config.targetInflationRate * 100}
                    onChange={(e) => setConfig({ ...config, targetInflationRate: Number(e.target.value) / 100 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                    step={0.1}
                  />
                </div>

                <button
                  onClick={() => {
                    setFaucets(DEFAULT_FAUCETS);
                    setSinks(DEFAULT_SINKS);
                    setConfig(DEFAULT_CONFIG);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <RefreshCw className="w-3 h-3" /> {t('resetDefaults')}
                </button>

                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--primary-blue)', color: 'white' }}
                >
                  <Download className="w-3 h-3" /> {t('exportResults')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Charts and Analysis */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
