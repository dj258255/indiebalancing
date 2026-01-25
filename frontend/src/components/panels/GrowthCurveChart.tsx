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
import { Maximize2, X, Plus, Trash2, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SCALE } from '@/lib/formulaEngine';
import type { CurveType } from '@/types';

interface GrowthCurveChartProps {
  initialBase?: number;
  initialRate?: number;
  initialMaxLevel?: number;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

// 구간별 성장 설정
interface GrowthSegment {
  id: string;
  startLevel: number;
  endLevel: number;
  curveType: CurveType;
  rate: number;
}

// 보간 타입
type InterpolationType = 'none' | 'linear' | 'smooth';

// Hermite 스플라인 보간 함수 (부드러운 전환)
function hermiteInterpolate(t: number): number {
  // Smoothstep: 3t² - 2t³
  return t * t * (3 - 2 * t);
}

// Ease-in-out 보간 함수
function easeInOutInterpolate(t: number): number {
  // Smootherstep: 6t⁵ - 15t⁴ + 10t³
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const CURVE_COLORS = {
  linear: '#3b82f6',      // blue
  exponential: '#ef4444', // red
  logarithmic: '#22c55e', // green
  quadratic: '#f59e0b',   // amber
  custom: '#8b5cf6',      // purple
  segmented: '#ec4899',   // pink
};

// Note: CURVE_NAMES will be translated in the component using t()
const CURVE_KEYS = ['linear', 'exponential', 'logarithmic', 'quadratic'] as const;

// 구간별 성장값 계산 함수 (보간 지원)
function calculateSegmentedValue(
  baseValue: number,
  level: number,
  segments: GrowthSegment[],
  interpolation: InterpolationType = 'none',
  transitionWidth: number = 3
): number {
  // 구간이 없으면 기본값 반환
  if (segments.length === 0) return baseValue;

  // 구간을 시작 레벨 순으로 정렬
  const sortedSegments = [...segments].sort((a, b) => a.startLevel - b.startLevel);

  // 각 구간의 시작/끝 값을 미리 계산
  const segmentValues: { start: number; end: number }[] = [];
  let runningValue = baseValue;

  for (const segment of sortedSegments) {
    const startValue = runningValue;
    const levelsInSegment = segment.endLevel - segment.startLevel + 1;

    // 구간 끝까지의 값 계산
    for (let l = 1; l <= levelsInSegment; l++) {
      runningValue = SCALE(startValue, l + 1, segment.rate, segment.curveType);
    }

    segmentValues.push({ start: startValue, end: runningValue });
  }

  // 보간 없이 계산하는 경우
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

  // 보간 적용 계산
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

      // 구간 경계에서 보간 적용
      if (i < sortedSegments.length - 1 && level >= segment.endLevel - transitionWidth && level <= segment.endLevel) {
        const nextSegment = sortedSegments[i + 1];
        const nextSegmentLevels = Math.min(level, nextSegment.endLevel) - nextSegment.startLevel + 1;

        if (nextSegmentLevels > 0) {
          // 다음 구간의 값 계산
          let nextValue = segmentValues[i].end;
          const nextStartValue = segmentValues[i].end;
          const levelsToCalc = Math.min(transitionWidth, nextSegment.endLevel - nextSegment.startLevel + 1);

          for (let l = 1; l <= levelsToCalc; l++) {
            nextValue = SCALE(nextStartValue, l + 1, nextSegment.rate, nextSegment.curveType);
          }

          // 보간 비율 계산
          const transitionStart = segment.endLevel - transitionWidth;
          const t = Math.max(0, Math.min(1, (level - transitionStart) / (transitionWidth * 2)));

          // 보간 함수 선택
          const blendFactor = interpolation === 'smooth' ? hermiteInterpolate(t) : t;

          // 현재 값과 다음 구간 시작 값 사이를 보간
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
}: GrowthCurveChartProps) {
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

  // 구간별 성장 곡선 상태
  const [showSegmented, setShowSegmented] = useState(false);
  const [segments, setSegments] = useState<GrowthSegment[]>([
    { id: '1', startLevel: 1, endLevel: 10, curveType: 'exponential', rate: 1.15 },
    { id: '2', startLevel: 11, endLevel: 30, curveType: 'linear', rate: 10 },
    { id: '3', startLevel: 31, endLevel: 50, curveType: 'logarithmic', rate: 50 },
  ]);

  // 보간 설정
  const [interpolation, setInterpolation] = useState<InterpolationType>('none');
  const [transitionWidth, setTransitionWidth] = useState(3);

  const t = useTranslations('growthCurve');

  // 구간 추가
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

  // 구간 삭제
  const removeSegment = (id: string) => {
    setSegments(segments.filter((s) => s.id !== id));
  };

  // 구간 업데이트
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
      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden flex-1">
        {/* 도움말 섹션 */}
        {showHelp && (
          <div className="p-3 rounded-lg animate-slideDown" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('helpDesc')}
            </p>

            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #3b82f6' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#3b82f6' }}>{t('linearHelp.name')}</span>
                  <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('linearHelp.formula')}</code>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('linearHelp.desc')}</p>
              </div>

              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #ef4444' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#ef4444' }}>{t('exponentialHelp.name')}</span>
                  <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('exponentialHelp.formula')}</code>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('exponentialHelp.desc')}</p>
              </div>

              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #22c55e' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#22c55e' }}>{t('logarithmicHelp.name')}</span>
                  <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('logarithmicHelp.formula')}</code>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('logarithmicHelp.desc')}</p>
              </div>

              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #f59e0b' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#f59e0b' }}>{t('quadraticHelp.name')}</span>
                  <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('quadraticHelp.formula')}</code>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('quadraticHelp.desc')}</p>
              </div>

              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #8b5cf6' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#8b5cf6' }}>{t('sCurveHelp.name')}</span>
                  <code className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>{t('sCurveHelp.formula')}</code>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('sCurveHelp.desc')}</p>
              </div>
            </div>

            <div className="text-xs p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
              {t('helpTip')}
            </div>
          </div>
        )}

        {/* 설정 패널 */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* 기본 설정 */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>{t('basicSettings')}</h4>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('baseValue')}</label>
              <NumberInput
                value={base}
                onChange={setBase}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('rate')}</label>
              <NumberInput
                value={rate}
                onChange={setRate}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('maxLevel')}</label>
              <NumberInput
                value={maxLevel}
                onChange={setMaxLevel}
                max={200}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* 곡선 선택 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>{t('curvesToShow')}</h4>
            {CURVE_KEYS.map((key) => {
              const color = CURVE_COLORS[key as keyof typeof CURVE_COLORS];
              const isChecked = showCurves[key as keyof typeof showCurves];
              return (
                <button
                  key={key}
                  onClick={() => setShowCurves((prev) => ({ ...prev, [key]: !prev[key as keyof typeof showCurves] }))}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: isChecked ? `${color}15` : 'var(--bg-tertiary)',
                    border: `1px solid ${isChecked ? color : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span style={{ color: isChecked ? color : 'var(--text-secondary)' }}>{t(key)}</span>
                  </div>
                  <div
                    className="w-9 h-5 rounded-full relative transition-all"
                    style={{
                      background: isChecked ? color : 'var(--border-primary)',
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{
                        left: isChecked ? '18px' : '2px',
                      }}
                    />
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: showCustom ? `${CURVE_COLORS.custom}15` : 'var(--bg-tertiary)',
                border: `1px solid ${showCustom ? CURVE_COLORS.custom : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CURVE_COLORS.custom }}
                />
                <span style={{ color: showCustom ? CURVE_COLORS.custom : 'var(--text-secondary)' }}>{t('customCurve')}</span>
              </div>
              <div
                className="w-9 h-5 rounded-full relative transition-all"
                style={{
                  background: showCustom ? CURVE_COLORS.custom : 'var(--border-primary)',
                }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{
                    left: showCustom ? '18px' : '2px',
                  }}
                />
              </div>
            </button>
          </div>

          {/* 커스텀 곡선 설정 */}
          {showCustom && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>{t('customCurve')}</h4>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('curveTypeLabel')}</label>
                <select
                  value={customCurve}
                  onChange={(e) => setCustomCurve(e.target.value as CurveType)}
                  className="w-full px-3 py-1.5 rounded-lg text-sm"
                >
                  <option value="linear">{t('linear')}</option>
                  <option value="exponential">{t('exponential')}</option>
                  <option value="logarithmic">{t('logarithmic')}</option>
                  <option value="quadratic">{t('quadratic')}</option>
                  <option value="scurve">{t('sCurve')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('baseValue')}</label>
                <NumberInput
                  value={customBase}
                  onChange={setCustomBase}
                  className="w-full px-3 py-1.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('rate')}</label>
                <NumberInput
                  value={customRate}
                  onChange={setCustomRate}
                  className="w-full px-3 py-1.5 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* 구간별 성장 곡선 토글 */}
          <div className="space-y-2">
            <button
              onClick={() => setShowSegmented(!showSegmented)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: showSegmented ? `${CURVE_COLORS.segmented}15` : 'var(--bg-tertiary)',
                border: `1px solid ${showSegmented ? CURVE_COLORS.segmented : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: showSegmented ? CURVE_COLORS.segmented : 'var(--text-secondary)' }} />
                <span style={{ color: showSegmented ? CURVE_COLORS.segmented : 'var(--text-secondary)' }}>{t('segmentedCurve')}</span>
              </div>
              <div
                className="w-9 h-5 rounded-full relative transition-all"
                style={{
                  background: showSegmented ? CURVE_COLORS.segmented : 'var(--border-primary)',
                }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{
                    left: showSegmented ? '18px' : '2px',
                  }}
                />
              </div>
            </button>
          </div>

          {/* 구간별 설정 */}
          {showSegmented && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>{t('segmentSettings')}</h4>
                <button
                  onClick={addSegment}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
                  style={{ background: `${CURVE_COLORS.segmented}20`, color: CURVE_COLORS.segmented }}
                >
                  <Plus className="w-3 h-3" />
                  {t('addSegment')}
                </button>
              </div>

              <div className="space-y-2">
                {segments.map((segment, idx) => (
                  <div
                    key={segment.id}
                    className="p-3 rounded-lg space-y-2"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: CURVE_COLORS.segmented }}>
                        {t('segment')} {idx + 1}
                      </span>
                      {segments.length > 1 && (
                        <button
                          onClick={() => removeSegment(segment.id)}
                          className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* 레벨 범위 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('startLevel')}</label>
                        <NumberInput
                          value={segment.startLevel}
                          onChange={(v) => updateSegment(segment.id, { startLevel: v })}
                          min={1}
                          max={maxLevel}
                          className="w-full px-2 py-1 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('endLevel')}</label>
                        <NumberInput
                          value={segment.endLevel}
                          onChange={(v) => updateSegment(segment.id, { endLevel: v })}
                          min={segment.startLevel}
                          max={maxLevel}
                          className="w-full px-2 py-1 rounded text-xs"
                        />
                      </div>
                    </div>

                    {/* 곡선 타입 & 성장률 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('curveTypeLabel')}</label>
                        <select
                          value={segment.curveType}
                          onChange={(e) => updateSegment(segment.id, { curveType: e.target.value as CurveType })}
                          className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
                        >
                          <option value="linear">{t('linear')}</option>
                          <option value="exponential">{t('exponential')}</option>
                          <option value="logarithmic">{t('logarithmic')}</option>
                          <option value="quadratic">{t('quadratic')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('rate')}</label>
                        <NumberInput
                          value={segment.rate}
                          onChange={(v) => updateSegment(segment.id, { rate: v })}
                          className="w-full px-2 py-1 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 보간 설정 */}
              <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                <h5 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('interpolationSettings')}</h5>

                {/* 보간 타입 선택 */}
                <div className="grid grid-cols-3 gap-1">
                  {(['none', 'linear', 'smooth'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setInterpolation(type)}
                      className="px-2 py-1.5 rounded text-xs transition-colors"
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

                {/* 전환 구간 너비 (보간 적용 시에만 표시) */}
                {interpolation !== 'none' && (
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('transitionWidth')}</label>
                    <NumberInput
                      value={transitionWidth}
                      onChange={setTransitionWidth}
                      min={1}
                      max={10}
                      className="w-full px-2 py-1 rounded text-xs"
                    />
                  </div>
                )}
              </div>

              {/* 구간 설명 */}
              <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                {t('segmentedDesc')}
              </div>
            </div>
          )}
        </div>

        {/* 차트 */}
        <div className="relative h-[400px] mb-6 group">
          {/* 차트 확대 버튼 */}
          <button
            onClick={() => setShowChartModal(true)}
            className="absolute top-2 right-2 z-10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
            title={t('enlargeGraph')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="level"
                label={{ value: t('levelUnit'), position: 'insideBottomRight', offset: -5, fill: 'var(--text-tertiary)' }}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              />
              <YAxis
                label={{ value: '값', angle: -90, position: 'insideLeft', fill: 'var(--text-tertiary)' }}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                formatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                labelFormatter={(label) => `${t('levelUnit')} ${label}`}
                contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
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
              {/* 구간 구분 참조선 */}
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

        {/* 그래프만 확대 모달 */}
        {showChartModal && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setShowChartModal(false)}
          >
            <div
              className="w-full max-w-6xl h-[80vh] rounded-2xl overflow-hidden flex flex-col"
              style={{ background: 'var(--bg-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('graphTitle')}</h3>
                <button
                  onClick={() => setShowChartModal(false)}
                  className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* 모달 차트 - 꽉 채움 */}
              <div className="flex-1 p-6">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <LineChart data={chartData} margin={{ top: 20, right: 40, left: 30, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis
                      dataKey="level"
                      label={{ value: t('levelUnit'), position: 'insideBottomRight', offset: -10, fill: 'var(--text-tertiary)', fontSize: 14 }}
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                    />
                    <YAxis
                      label={{ value: '값', angle: -90, position: 'insideLeft', fill: 'var(--text-tertiary)', fontSize: 14 }}
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip
                      formatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      labelFormatter={(label) => `${t('levelUnit')} ${label}`}
                      contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', fontSize: 14 }}
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
                    {/* 구간 구분 참조선 */}
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
        <div className="border-t pt-4" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('levelPreview')}</span>
            <NumberInput
              value={previewLevel}
              onChange={setPreviewLevel}
              max={maxLevel}
              className="w-20 px-2 py-1 rounded-lg text-sm"
            />
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('levelUnit')}</span>
          </div>
          <div className="space-y-1.5">
            {showCurves.linear && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm font-medium" style={{ color: '#3b82f6' }}>{t('linear')}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{previewValues.linear.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {showCurves.exponential && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm font-medium" style={{ color: '#ef4444' }}>{t('exponential')}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{previewValues.exponential.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {showCurves.logarithmic && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm font-medium" style={{ color: '#22c55e' }}>{t('logarithmic')}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{previewValues.logarithmic.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {showCurves.quadratic && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>{t('quadratic')}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{previewValues.quadratic.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {showCustom && previewValues.custom !== null && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm font-medium" style={{ color: '#8b5cf6' }}>{t('customCurve')}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{previewValues.custom.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {showSegmented && previewValues.segmented !== null && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm font-medium" style={{ color: '#ec4899' }}>{t('segmentedCurve')}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{previewValues.segmented.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 숫자 입력 헬퍼 컴포넌트 (0 prefix 문제 해결)
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
