'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SCALE } from '@/lib/formulaEngine';
import type { CurveType } from '@/types';

interface GrowthCurveChartProps {
  initialBase?: number;
  initialRate?: number;
  initialMaxLevel?: number;
}

const CURVE_COLORS = {
  linear: '#3b82f6',      // blue
  exponential: '#ef4444', // red
  logarithmic: '#22c55e', // green
  quadratic: '#f59e0b',   // amber
  custom: '#8b5cf6',      // purple
};

const CURVE_NAMES: Record<string, string> = {
  linear: '선형 (Linear)',
  exponential: '지수 (Exponential)',
  logarithmic: '로그 (Logarithmic)',
  quadratic: '2차 (Quadratic)',
};

export default function GrowthCurveChart({
  initialBase = 100,
  initialRate = 1.1,
  initialMaxLevel = 50,
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

  const [customCurve, setCustomCurve] = useState<CurveType>('linear');
  const [customBase, setCustomBase] = useState(100);
  const [customRate, setCustomRate] = useState(10);
  const [showCustom, setShowCustom] = useState(false);

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

      data.push(point);
    }
    return data;
  }, [base, rate, maxLevel, showCurves, showCustom, customBase, customRate, customCurve]);

  const [previewLevel, setPreviewLevel] = useState(10);
  const previewValues = useMemo(() => {
    return {
      linear: SCALE(base, previewLevel, rate * 10, 'linear'),
      exponential: SCALE(base, previewLevel, rate, 'exponential'),
      logarithmic: SCALE(base, previewLevel, rate * 50, 'logarithmic'),
      quadratic: SCALE(base, previewLevel, rate, 'quadratic'),
      custom: showCustom ? SCALE(customBase, previewLevel, customRate, customCurve) : null,
    };
  }, [base, rate, previewLevel, customBase, customRate, customCurve, showCustom]);

  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>성장 곡선 차트</h3>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            background: showHelp ? 'var(--accent-light)' : 'var(--bg-tertiary)',
            color: showHelp ? 'var(--accent-text)' : 'var(--text-secondary)'
          }}
        >
          <HelpCircle className="w-4 h-4" />
          도움말
          {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* 도움말 패널 */}
      {showHelp && (
        <div className="mb-6 p-4 rounded-xl animate-fadeIn" style={{ background: 'var(--bg-tertiary)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            레벨업할 때 스탯이 얼마나 증가할지 결정하는 곡선입니다. 성장 느낌이 완전히 달라집니다.
          </p>

          <div className="space-y-2 mb-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #3b82f6' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm" style={{ color: '#3b82f6' }}>선형 (Linear)</span>
                <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>base + (level-1) × rate</code>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>매 레벨 같은 양 증가. 예측 가능하고 직관적. 캐주얼 게임, 초보자 친화적.</p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #ef4444' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm" style={{ color: '#ef4444' }}>지수 (Exponential)</span>
                <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>base × rate^(level-1)</code>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>후반 폭발적 증가. 방치형/클리커 게임, 경험치 테이블, 강화 비용에 적합.</p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #22c55e' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm" style={{ color: '#22c55e' }}>로그 (Logarithmic)</span>
                <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>base + rate × log(level)</code>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>초반 급성장, 후반 둔화. 레벨 격차 줄이기, 캐치업 시스템, 숙련도에 적합.</p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #f59e0b' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm" style={{ color: '#f59e0b' }}>2차 (Quadratic)</span>
                <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>base + rate × level²</code>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>초반 느림, 점점 가속. 지수보다 완만. RPG 스킬 계수, 중후반 파워 스파이크.</p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid var(--accent)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm" style={{ color: 'var(--accent)' }}>S-곡선 (Sigmoid)</span>
                <code className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>base + max/(1+e^(-k×(x-mid)))</code>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>초반/후반 완만, 중반 급성장. 자연스러운 성장감. 레벨 캡이 있는 RPG, 스탯 상한선 설정.</p>
            </div>
          </div>

          <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
            팁: HP/방어력은 선형/로그, 공격력/골드는 지수/2차, 상한선 있는 스탯은 S-곡선 권장
          </div>
        </div>
      )}

      {/* 설정 패널 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 기본 설정 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>기본 설정</h4>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>기본값 (Base)</label>
            <input
              type="number"
              value={base}
              onChange={(e) => setBase(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>성장률 (Rate)</label>
            <input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>최대 레벨</label>
            <input
              type="number"
              value={maxLevel}
              onChange={(e) => setMaxLevel(Math.min(200, Number(e.target.value)))}
              className="w-full px-3 py-1.5 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* 곡선 선택 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>표시할 곡선</h4>
          {Object.entries(CURVE_NAMES).map(([key, name]) => (
            <label key={key} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={showCurves[key as keyof typeof showCurves]}
                onChange={(e) =>
                  setShowCurves((prev) => ({ ...prev, [key]: e.target.checked }))
                }
                className="rounded"
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CURVE_COLORS[key as keyof typeof CURVE_COLORS] }}
              />
              {name}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={showCustom}
              onChange={(e) => setShowCustom(e.target.checked)}
              className="rounded"
            />
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CURVE_COLORS.custom }}
            />
            커스텀 곡선
          </label>
        </div>

        {/* 커스텀 곡선 설정 */}
        {showCustom && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>커스텀 곡선</h4>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>곡선 타입</label>
              <select
                value={customCurve}
                onChange={(e) => setCustomCurve(e.target.value as CurveType)}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
              >
                <option value="linear">선형</option>
                <option value="exponential">지수</option>
                <option value="logarithmic">로그</option>
                <option value="quadratic">2차</option>
                <option value="scurve">S-곡선</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>기본값</label>
              <input
                type="number"
                value={customBase}
                onChange={(e) => setCustomBase(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>성장률</label>
              <input
                type="number"
                step="0.1"
                value={customRate}
                onChange={(e) => setCustomRate(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* 차트 */}
      <div className="h-[400px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis
              dataKey="level"
              label={{ value: '레벨', position: 'insideBottomRight', offset: -5, fill: 'var(--text-tertiary)' }}
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            />
            <YAxis
              label={{ value: '값', angle: -90, position: 'insideLeft', fill: 'var(--text-tertiary)' }}
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              formatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              labelFormatter={(label) => `레벨 ${label}`}
              contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
            />
            <Legend />
            {showCurves.linear && (
              <Line type="monotone" dataKey="linear" name="선형" stroke={CURVE_COLORS.linear} dot={false} strokeWidth={2} />
            )}
            {showCurves.exponential && (
              <Line type="monotone" dataKey="exponential" name="지수" stroke={CURVE_COLORS.exponential} dot={false} strokeWidth={2} />
            )}
            {showCurves.logarithmic && (
              <Line type="monotone" dataKey="logarithmic" name="로그" stroke={CURVE_COLORS.logarithmic} dot={false} strokeWidth={2} />
            )}
            {showCurves.quadratic && (
              <Line type="monotone" dataKey="quadratic" name="2차" stroke={CURVE_COLORS.quadratic} dot={false} strokeWidth={2} />
            )}
            {showCustom && (
              <Line type="monotone" dataKey="custom" name="커스텀" stroke={CURVE_COLORS.custom} dot={false} strokeWidth={2} strokeDasharray="5 5" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 레벨별 값 미리보기 */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>레벨별 값 확인:</span>
          <input
            type="number"
            value={previewLevel}
            onChange={(e) => setPreviewLevel(Math.max(1, Math.min(maxLevel, Number(e.target.value))))}
            className="w-20 px-2 py-1 rounded-lg text-sm"
          />
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>레벨</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          {showCurves.linear && (
            <div className="rounded-lg p-2" style={{ background: '#3b82f620' }}>
              <div className="font-medium" style={{ color: '#3b82f6' }}>선형</div>
              <div className="text-lg" style={{ color: 'var(--text-primary)' }}>{previewValues.linear.toLocaleString()}</div>
            </div>
          )}
          {showCurves.exponential && (
            <div className="rounded-lg p-2" style={{ background: '#ef444420' }}>
              <div className="font-medium" style={{ color: '#ef4444' }}>지수</div>
              <div className="text-lg" style={{ color: 'var(--text-primary)' }}>{previewValues.exponential.toLocaleString()}</div>
            </div>
          )}
          {showCurves.logarithmic && (
            <div className="rounded-lg p-2" style={{ background: '#22c55e20' }}>
              <div className="font-medium" style={{ color: '#22c55e' }}>로그</div>
              <div className="text-lg" style={{ color: 'var(--text-primary)' }}>{previewValues.logarithmic.toLocaleString()}</div>
            </div>
          )}
          {showCurves.quadratic && (
            <div className="rounded-lg p-2" style={{ background: '#f59e0b20' }}>
              <div className="font-medium" style={{ color: '#f59e0b' }}>2차</div>
              <div className="text-lg" style={{ color: 'var(--text-primary)' }}>{previewValues.quadratic.toLocaleString()}</div>
            </div>
          )}
          {showCustom && previewValues.custom !== null && (
            <div className="rounded-lg p-2" style={{ background: '#8b5cf620' }}>
              <div className="font-medium" style={{ color: '#8b5cf6' }}>커스텀</div>
              <div className="text-lg" style={{ color: 'var(--text-primary)' }}>{previewValues.custom.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
