'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Maximize2, X, Plus, Trash2, Layers, TrendingUp, Settings, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SCALE } from '@/lib/formulaEngine';
import type { CurveType } from '@/types';
import { useEscapeKey } from '@/hooks';
import { cn } from '@/lib/utils';

interface GrowthCurveChartProps {
  initialBase?: number;
  initialRate?: number;
  initialMaxLevel?: number;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
  onClose?: () => void;
}

interface GrowthSegment {
  id: string;
  startLevel: number;
  endLevel: number;
  curveType: CurveType;
  rate: number;
}

type InterpolationType = 'none' | 'linear' | 'smooth';

function hermiteInterpolate(t: number): number {
  return t * t * (3 - 2 * t);
}

const PANEL_COLOR = '#3db88a'; // 소프트 에메랄드

const CURVE_COLORS = {
  linear: '#5a9cf5',
  exponential: '#e86161',
  logarithmic: '#3db88a',
  quadratic: '#e5a440',
  custom: '#9179f2',
  segmented: '#e87aa8',
};

const CURVE_KEYS = ['linear', 'exponential', 'logarithmic', 'quadratic'] as const;

function calculateSegmentedValue(
  baseValue: number,
  level: number,
  segments: GrowthSegment[],
  interpolation: InterpolationType = 'none',
  transitionWidth: number = 3
): number {
  if (segments.length === 0) return baseValue;

  const sortedSegments = [...segments].sort((a, b) => a.startLevel - b.startLevel);

  const segmentValues: { start: number; end: number }[] = [];
  let runningValue = baseValue;

  for (const segment of sortedSegments) {
    const startValue = runningValue;
    const levelsInSegment = segment.endLevel - segment.startLevel + 1;

    for (let l = 1; l <= levelsInSegment; l++) {
      runningValue = SCALE(startValue, l + 1, segment.rate, segment.curveType);
    }

    segmentValues.push({ start: startValue, end: runningValue });
  }

  if (interpolation === 'none') {
    let currentValue = baseValue;
    let prevEndLevel = 0;

    for (let i = 0; i < sortedSegments.length; i++) {
      const segment = sortedSegments[i];
      if (level < segment.startLevel) break;

      const segmentStart = Math.max(segment.startLevel, prevEndLevel + 1);
      const segmentEnd = Math.min(segment.endLevel, level);

      if (segmentStart <= segmentEnd) {
        const levelsInSegment = segmentEnd - segmentStart + 1;
        const startValue = currentValue;

        for (let l = 1; l <= levelsInSegment; l++) {
          currentValue = SCALE(startValue, l + 1, segment.rate, segment.curveType);
        }
      }

      prevEndLevel = segment.endLevel;
    }

    return currentValue;
  }

  let currentValue = baseValue;
  let prevEndLevel = 0;

  for (let i = 0; i < sortedSegments.length; i++) {
    const segment = sortedSegments[i];
    if (level < segment.startLevel) break;

    const segmentStart = Math.max(segment.startLevel, prevEndLevel + 1);
    const segmentEnd = Math.min(segment.endLevel, level);

    if (segmentStart <= segmentEnd) {
      const levelsInSegment = segmentEnd - segmentStart + 1;
      const startValue = currentValue;

      for (let l = 1; l <= levelsInSegment; l++) {
        currentValue = SCALE(startValue, l + 1, segment.rate, segment.curveType);
      }

      if (i < sortedSegments.length - 1 && level >= segment.endLevel - transitionWidth && level <= segment.endLevel) {
        const nextSegment = sortedSegments[i + 1];
        const nextSegmentLevels = Math.min(level, nextSegment.endLevel) - nextSegment.startLevel + 1;

        if (nextSegmentLevels > 0) {
          let nextValue = segmentValues[i].end;
          const nextStartValue = segmentValues[i].end;
          const levelsToCalc = Math.min(transitionWidth, nextSegment.endLevel - nextSegment.startLevel + 1);

          for (let l = 1; l <= levelsToCalc; l++) {
            nextValue = SCALE(nextStartValue, l + 1, nextSegment.rate, nextSegment.curveType);
          }

          const transitionStart = segment.endLevel - transitionWidth;
          const t = Math.max(0, Math.min(1, (level - transitionStart) / (transitionWidth * 2)));
          const blendFactor = interpolation === 'smooth' ? hermiteInterpolate(t) : t;
          const targetValue = segmentValues[i].end + (nextValue - segmentValues[i].end) * (t / 2);
          currentValue = currentValue + (targetValue - currentValue) * blendFactor;
        }
      }
    }

    prevEndLevel = segment.endLevel;
  }

  return currentValue;
}

export default function GrowthCurveChart({
  initialBase = 100,
  initialRate = 1.1,
  initialMaxLevel = 50,
  showHelp = false,
  setShowHelp,
  onClose,
}: GrowthCurveChartProps) {
  useEscapeKey(() => {
    if (onClose) onClose();
  });
  const [base, setBase] = useState(initialBase);
  const [rate, setRate] = useState(initialRate);
  const [maxLevel, setMaxLevel] = useState(initialMaxLevel);
  const [showCurves, setShowCurves] = useState({
    linear: true,
    exponential: true,
    logarithmic: true,
    quadratic: false,
  });
  const [showChartModal, setShowChartModal] = useState(false);

  const [customCurve, setCustomCurve] = useState<CurveType>('linear');
  const [customBase, setCustomBase] = useState(100);
  const [customRate, setCustomRate] = useState(10);
  const [showCustom, setShowCustom] = useState(false);

  const [showSegmented, setShowSegmented] = useState(false);
  const [segments, setSegments] = useState<GrowthSegment[]>([
    { id: '1', startLevel: 1, endLevel: 10, curveType: 'exponential', rate: 1.15 },
    { id: '2', startLevel: 11, endLevel: 30, curveType: 'linear', rate: 10 },
    { id: '3', startLevel: 31, endLevel: 50, curveType: 'logarithmic', rate: 50 },
  ]);

  const [interpolation, setInterpolation] = useState<InterpolationType>('none');
  const [transitionWidth, setTransitionWidth] = useState(3);

  const t = useTranslations('growthCurve');

  const addSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const newStart = lastSegment ? lastSegment.endLevel + 1 : 1;
    const newEnd = Math.min(newStart + 10, maxLevel);

    if (newStart <= maxLevel) {
      setSegments([
        ...segments,
        {
          id: Date.now().toString(),
          startLevel: newStart,
          endLevel: newEnd,
          curveType: 'linear',
          rate: 10,
        },
      ]);
    }
  };

  const removeSegment = (id: string) => {
    setSegments(segments.filter((s) => s.id !== id));
  };

  const updateSegment = (id: string, updates: Partial<GrowthSegment>) => {
    setSegments(
      segments.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const chartData = useMemo(() => {
    const data = [];
    for (let level = 1; level <= maxLevel; level++) {
      const point: Record<string, number> = { level };

      if (showCurves.linear) {
        point.linear = SCALE(base, level, rate * 10, 'linear');
      }
      if (showCurves.exponential) {
        point.exponential = SCALE(base, level, rate, 'exponential');
      }
      if (showCurves.logarithmic) {
        point.logarithmic = SCALE(base, level, rate * 50, 'logarithmic');
      }
      if (showCurves.quadratic) {
        point.quadratic = SCALE(base, level, rate, 'quadratic');
      }
      if (showCustom) {
        point.custom = SCALE(customBase, level, customRate, customCurve);
      }
      if (showSegmented && segments.length > 0) {
        point.segmented = calculateSegmentedValue(base, level, segments, interpolation, transitionWidth);
      }

      data.push(point);
    }
    return data;
  }, [base, rate, maxLevel, showCurves, showCustom, customBase, customRate, customCurve, showSegmented, segments, interpolation, transitionWidth]);

  const [previewLevel, setPreviewLevel] = useState(10);
  const previewValues = useMemo(() => {
    return {
      linear: SCALE(base, previewLevel, rate * 10, 'linear'),
      exponential: SCALE(base, previewLevel, rate, 'exponential'),
      logarithmic: SCALE(base, previewLevel, rate * 50, 'logarithmic'),
      quadratic: SCALE(base, previewLevel, rate, 'quadratic'),
      custom: showCustom ? SCALE(customBase, previewLevel, customRate, customCurve) : null,
      segmented: showSegmented && segments.length > 0 ? calculateSegmentedValue(base, previewLevel, segments, interpolation, transitionWidth) : null,
    };
  }, [base, rate, previewLevel, customBase, customRate, customCurve, showCustom, showSegmented, segments, interpolation, transitionWidth]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-5 overflow-y-auto overflow-x-hidden flex-1 scrollbar-slim">
        {/* 도움말 섹션 */}
        {showHelp && (
          <div className="glass-card p-4 animate-slideDown space-y-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('title')}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('helpDesc')}</p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { key: 'linear', color: CURVE_COLORS.linear },
                { key: 'exponential', color: CURVE_COLORS.exponential },
                { key: 'logarithmic', color: CURVE_COLORS.logarithmic },
                { key: 'quadratic', color: CURVE_COLORS.quadratic },
                { key: 'sCurve', color: CURVE_COLORS.custom },
              ].map(({ key, color }) => (
                <div key={key} className="glass-section p-2.5" style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm" style={{ color }}>{t(`${key}Help.name`)}</span>
                    <code className="text-sm px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                      {t(`${key}Help.formula`)}
                    </code>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t(`${key}Help.desc`)}</p>
                </div>
              ))}
            </div>

            <div className="glass-section p-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('helpTip')}
            </div>
          </div>
        )}

        {/* 설정 패널 */}
        <div className="space-y-5">
          {/* 기본 설정 */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4" style={{ color: PANEL_COLOR }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('basicSettings')}</h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('baseValue')}</label>
                <NumberInput
                  value={base}
                  onChange={setBase}
                  className="glass-input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('rate')}</label>
                <NumberInput
                  value={rate}
                  onChange={setRate}
                  className="glass-input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('maxLevel')}</label>
                <NumberInput
                  value={maxLevel}
                  onChange={setMaxLevel}
                  max={200}
                  className="glass-input w-full text-sm"
                />
              </div>
            </div>
          </div>

          {/* 곡선 선택 */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4" style={{ color: PANEL_COLOR }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('curvesToShow')}</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CURVE_KEYS.map((key) => {
                const color = CURVE_COLORS[key as keyof typeof CURVE_COLORS];
                const isChecked = showCurves[key as keyof typeof showCurves];
                return (
                  <button
                    key={key}
                    onClick={() => setShowCurves((prev) => ({ ...prev, [key]: !prev[key as keyof typeof showCurves] }))}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all',
                      isChecked && 'shadow-sm'
                    )}
                    style={{
                      background: isChecked ? `${color}15` : 'var(--bg-tertiary)',
                      border: `1px solid ${isChecked ? color : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-medium" style={{ color: isChecked ? color : 'var(--text-secondary)' }}>{t(key)}</span>
                    </div>
                    <ToggleSwitch checked={isChecked} color={color} />
                  </button>
                );
              })}
            </div>

            {/* 커스텀 곡선 */}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all',
                showCustom && 'shadow-sm'
              )}
              style={{
                background: showCustom ? `${CURVE_COLORS.custom}15` : 'var(--bg-tertiary)',
                border: `1px solid ${showCustom ? CURVE_COLORS.custom : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CURVE_COLORS.custom }} />
                <span className="font-medium" style={{ color: showCustom ? CURVE_COLORS.custom : 'var(--text-secondary)' }}>{t('customCurve')}</span>
              </div>
              <ToggleSwitch checked={showCustom} color={CURVE_COLORS.custom} />
            </button>

            {/* 커스텀 곡선 설정 */}
            {showCustom && (
              <div className="glass-section p-3 space-y-3 mt-2" style={{ borderLeft: `3px solid ${CURVE_COLORS.custom}` }}>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('curveTypeLabel')}</label>
                  <select
                    value={customCurve}
                    onChange={(e) => setCustomCurve(e.target.value as CurveType)}
                    className="glass-select w-full text-sm"
                  >
                    <option value="linear">{t('linear')}</option>
                    <option value="exponential">{t('exponential')}</option>
                    <option value="logarithmic">{t('logarithmic')}</option>
                    <option value="quadratic">{t('quadratic')}</option>
                    <option value="scurve">{t('sCurve')}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('baseValue')}</label>
                    <NumberInput value={customBase} onChange={setCustomBase} className="glass-input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{t('rate')}</label>
                    <NumberInput value={customRate} onChange={setCustomRate} className="glass-input w-full text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 구간별 성장 곡선 */}
          <div className="glass-card p-4 space-y-3">
            <button
              onClick={() => setShowSegmented(!showSegmented)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all',
                showSegmented && 'shadow-sm'
              )}
              style={{
                background: showSegmented ? `${CURVE_COLORS.segmented}15` : 'var(--bg-tertiary)',
                border: `1px solid ${showSegmented ? CURVE_COLORS.segmented : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: showSegmented ? CURVE_COLORS.segmented : 'var(--text-secondary)' }} />
                <span className="font-medium" style={{ color: showSegmented ? CURVE_COLORS.segmented : 'var(--text-secondary)' }}>{t('segmentedCurve')}</span>
              </div>
              <ToggleSwitch checked={showSegmented} color={CURVE_COLORS.segmented} />
            </button>

            {showSegmented && (
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('segmentSettings')}</span>
                  <button
                    onClick={addSegment}
                    className="glass-button flex items-center gap-1.5 !px-2.5 !py-1 text-sm"
                    style={{ color: CURVE_COLORS.segmented }}
                  >
                    <Plus className="w-3 h-3" />
                    {t('addSegment')}
                  </button>
                </div>

                <div className="space-y-2">
                  {segments.map((segment, idx) => (
                    <div
                      key={segment.id}
                      className="glass-section p-3 space-y-2"
                      style={{ borderLeft: `3px solid ${CURVE_COLORS.segmented}` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: CURVE_COLORS.segmented }}>
                          {t('segment')} {idx + 1}
                        </span>
                        {segments.length > 1 && (
                          <button
                            onClick={() => removeSegment(segment.id)}
                            className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                            style={{ color: '#e86161' }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('startLevel')}</label>
                          <NumberInput
                            value={segment.startLevel}
                            onChange={(v) => updateSegment(segment.id, { startLevel: v })}
                            min={1}
                            max={maxLevel}
                            className="glass-input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('endLevel')}</label>
                          <NumberInput
                            value={segment.endLevel}
                            onChange={(v) => updateSegment(segment.id, { endLevel: v })}
                            min={segment.startLevel}
                            max={maxLevel}
                            className="glass-input w-full text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('curveTypeLabel')}</label>
                          <select
                            value={segment.curveType}
                            onChange={(e) => updateSegment(segment.id, { curveType: e.target.value as CurveType })}
                            className="glass-select w-full text-sm"
                          >
                            <option value="linear">{t('linear')}</option>
                            <option value="exponential">{t('exponential')}</option>
                            <option value="logarithmic">{t('logarithmic')}</option>
                            <option value="quadratic">{t('quadratic')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('rate')}</label>
                          <NumberInput
                            value={segment.rate}
                            onChange={(v) => updateSegment(segment.id, { rate: v })}
                            className="glass-input w-full text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 보간 설정 */}
                <div className="glass-section p-3 space-y-3">
                  <h5 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{t('interpolationSettings')}</h5>

                  <div className="flex gap-1">
                    {(['none', 'linear', 'smooth'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setInterpolation(type)}
                        className={cn(
                          'flex-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                          interpolation === type && 'shadow-sm'
                        )}
                        style={{
                          background: interpolation === type ? `${CURVE_COLORS.segmented}20` : 'var(--bg-tertiary)',
                          color: interpolation === type ? CURVE_COLORS.segmented : 'var(--text-secondary)',
                          border: `1px solid ${interpolation === type ? CURVE_COLORS.segmented : 'transparent'}`,
                        }}
                      >
                        {t(`interpolation_${type}`)}
                      </button>
                    ))}
                  </div>

                  {interpolation !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('transitionWidth')}</label>
                      <NumberInput
                        value={transitionWidth}
                        onChange={setTransitionWidth}
                        min={1}
                        max={10}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="text-sm p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)' }}>
                  {t('segmentedDesc')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 차트 */}
        <div className="glass-card p-4 relative group">
          <button
            onClick={() => setShowChartModal(true)}
            className="absolute top-3 right-3 z-10 glass-button !p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            title={t('enlargeGraph')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                  dataKey="level"
                  label={{ value: t('levelUnit'), position: 'insideBottomRight', offset: -5, fill: 'var(--text-secondary)' }}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <YAxis
                  label={{ value: '값', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  labelFormatter={(label) => `${t('levelUnit')} ${label}`}
                  contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px' }}
                />
                <Legend />
                {showCurves.linear && (
                  <Line type="monotone" dataKey="linear" name={t('linear')} stroke={CURVE_COLORS.linear} dot={false} strokeWidth={2} />
                )}
                {showCurves.exponential && (
                  <Line type="monotone" dataKey="exponential" name={t('exponential')} stroke={CURVE_COLORS.exponential} dot={false} strokeWidth={2} />
                )}
                {showCurves.logarithmic && (
                  <Line type="monotone" dataKey="logarithmic" name={t('logarithmic')} stroke={CURVE_COLORS.logarithmic} dot={false} strokeWidth={2} />
                )}
                {showCurves.quadratic && (
                  <Line type="monotone" dataKey="quadratic" name={t('quadratic')} stroke={CURVE_COLORS.quadratic} dot={false} strokeWidth={2} />
                )}
                {showCustom && (
                  <Line type="monotone" dataKey="custom" name={t('customCurve')} stroke={CURVE_COLORS.custom} dot={false} strokeWidth={2} strokeDasharray="5 5" />
                )}
                {showSegmented && (
                  <Line type="monotone" dataKey="segmented" name={t('segmentedCurve')} stroke={CURVE_COLORS.segmented} dot={false} strokeWidth={2.5} />
                )}
                {showSegmented && segments.map((segment, idx) => (
                  idx > 0 && (
                    <ReferenceLine
                      key={`ref-${segment.id}`}
                      x={segment.startLevel}
                      stroke={CURVE_COLORS.segmented}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 그래프 확대 모달 */}
        {showChartModal && (
          <div
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowChartModal(false)}
          >
            <div
              className="glass-panel w-full max-w-6xl h-[90vh] sm:h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-panel-header">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}
                  >
                    <TrendingUp className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('graphTitle')}</h3>
                </div>
                <button onClick={() => setShowChartModal(false)} className="glass-button !p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-6">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <LineChart data={chartData} margin={{ top: 20, right: 40, left: 30, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis
                      dataKey="level"
                      label={{ value: t('levelUnit'), position: 'insideBottomRight', offset: -10, fill: 'var(--text-secondary)', fontSize: 14 }}
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                    />
                    <YAxis
                      label={{ value: '값', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 14 }}
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip
                      formatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      labelFormatter={(label) => `${t('levelUnit')} ${label}`}
                      contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '12px', fontSize: 14 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 14 }} />
                    {showCurves.linear && (
                      <Line type="monotone" dataKey="linear" name={t('linear')} stroke={CURVE_COLORS.linear} dot={false} strokeWidth={3} />
                    )}
                    {showCurves.exponential && (
                      <Line type="monotone" dataKey="exponential" name={t('exponential')} stroke={CURVE_COLORS.exponential} dot={false} strokeWidth={3} />
                    )}
                    {showCurves.logarithmic && (
                      <Line type="monotone" dataKey="logarithmic" name={t('logarithmic')} stroke={CURVE_COLORS.logarithmic} dot={false} strokeWidth={3} />
                    )}
                    {showCurves.quadratic && (
                      <Line type="monotone" dataKey="quadratic" name={t('quadratic')} stroke={CURVE_COLORS.quadratic} dot={false} strokeWidth={3} />
                    )}
                    {showCustom && (
                      <Line type="monotone" dataKey="custom" name={t('customCurve')} stroke={CURVE_COLORS.custom} dot={false} strokeWidth={3} strokeDasharray="5 5" />
                    )}
                    {showSegmented && (
                      <Line type="monotone" dataKey="segmented" name={t('segmentedCurve')} stroke={CURVE_COLORS.segmented} dot={false} strokeWidth={3} />
                    )}
                    {showSegmented && segments.map((segment, idx) => (
                      idx > 0 && (
                        <ReferenceLine
                          key={`ref-modal-${segment.id}`}
                          x={segment.startLevel}
                          stroke={CURVE_COLORS.segmented}
                          strokeDasharray="3 3"
                          strokeOpacity={0.5}
                        />
                      )
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 레벨별 값 미리보기 */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('levelPreview')}</span>
            <NumberInput
              value={previewLevel}
              onChange={setPreviewLevel}
              max={maxLevel}
              className="glass-input w-20 text-sm text-center"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('levelUnit')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {showCurves.linear && (
              <PreviewCard color={CURVE_COLORS.linear} label={t('linear')} value={previewValues.linear} />
            )}
            {showCurves.exponential && (
              <PreviewCard color={CURVE_COLORS.exponential} label={t('exponential')} value={previewValues.exponential} />
            )}
            {showCurves.logarithmic && (
              <PreviewCard color={CURVE_COLORS.logarithmic} label={t('logarithmic')} value={previewValues.logarithmic} />
            )}
            {showCurves.quadratic && (
              <PreviewCard color={CURVE_COLORS.quadratic} label={t('quadratic')} value={previewValues.quadratic} />
            )}
            {showCustom && previewValues.custom !== null && (
              <PreviewCard color={CURVE_COLORS.custom} label={t('customCurve')} value={previewValues.custom} />
            )}
            {showSegmented && previewValues.segmented !== null && (
              <PreviewCard color={CURVE_COLORS.segmented} label={t('segmentedCurve')} value={previewValues.segmented} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 토글 스위치 컴포넌트
function ToggleSwitch({ checked, color }: { checked: boolean; color: string }) {
  return (
    <div
      className="w-9 h-5 rounded-full relative transition-all"
      style={{ background: checked ? color : 'var(--border-primary)' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? '18px' : '2px' }}
      />
    </div>
  );
}

// 미리보기 카드 컴포넌트
function PreviewCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="glass-section flex items-center justify-between px-3 py-2" style={{ borderLeft: `3px solid ${color}` }}>
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

// 숫자 입력 컴포넌트
function NumberInput({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  return (
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
            let finalNum = num;
            if (max !== undefined) finalNum = Math.min(max, finalNum);
            if (min !== undefined) finalNum = Math.max(min, finalNum);
            onChange(finalNum);
          }
        }
      }}
      onBlur={() => {
        const num = parseFloat(inputValue);
        if (isNaN(num) || inputValue === '') {
          setInputValue(String(min ?? 0));
          onChange(min ?? 0);
        } else {
          let finalNum = num;
          if (max !== undefined) finalNum = Math.min(max, finalNum);
          if (min !== undefined) finalNum = Math.max(min, finalNum);
          setInputValue(String(finalNum));
        }
      }}
      className={className}
    />
  );
}
