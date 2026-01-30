/**
 * DifficultyChart - 난이도 곡선 시각화 컴포넌트
 */

'use client';

import { TrendingUp, Maximize2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useTranslations } from 'next-intl';
import type { DifficultySegment } from '../hooks';

const PANEL_COLOR = '#9179f2';

interface DifficultyChartProps {
  curveData: DifficultySegment[];
  wallStages: number[];
  maxStage: number;
  hoveredStage: number | null;
  setHoveredStage: (stage: number | null) => void;
  hoveredData: DifficultySegment | null;
  onShowFullscreen: () => void;
}

export function DifficultyChart({
  curveData,
  wallStages,
  maxStage,
  hoveredStage,
  setHoveredStage,
  hoveredData,
  onShowFullscreen,
}: DifficultyChartProps) {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: PANEL_COLOR }} />
          <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('curveLabel')}
          </label>
        </div>
      </div>
      <div className="glass-card p-4 relative overflow-hidden group">
        {/* 전체화면 버튼 */}
        <button
          onClick={onShowFullscreen}
          className="absolute top-3 right-3 z-20 glass-button !p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          title={t('fullscreen')}
        >
          <Maximize2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>

        {/* 그래프 - Recharts */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={curveData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-primary)' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-primary)' }}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const segment = payload[0]?.payload as DifficultySegment | undefined;
                  return (
                    <div style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '8px 12px',
                      fontSize: 11,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                        {t('stage')} {label}
                      </div>
                      <div style={{ color: '#5a9cf5' }}>{t('player')}: {segment?.playerPower.toLocaleString()}</div>
                      <div style={{ color: '#e86161' }}>{t('enemy')}: {segment?.enemyPower.toLocaleString()}</div>
                      <div style={{
                        marginTop: 4,
                        paddingTop: 4,
                        borderTop: '1px solid var(--border-primary)',
                        fontWeight: 600,
                        color: segment && segment.ratio >= 1 ? '#3db88a' : '#e86161'
                      }}>
                        {t('ratio')}: {segment?.ratio.toFixed(2)}x {segment && segment.ratio >= 1 ? '(Clear)' : '(Wall)'}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                height={30}
                formatter={(value) => value === 'playerPower' ? t('player') : t('enemy')}
                wrapperStyle={{ fontSize: 11 }}
              />
              {/* 벽 스테이지 표시 */}
              {wallStages.map((stage) => (
                <ReferenceLine
                  key={stage}
                  x={stage}
                  stroke="#e86161"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              ))}
              <Line
                type="monotone"
                dataKey="playerPower"
                stroke="#5a9cf5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#5a9cf5' }}
              />
              <Line
                type="monotone"
                dataKey="enemyPower"
                stroke="#e86161"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#e86161' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 비율 그래프 */}
        <RatioChart
          curveData={curveData}
          maxStage={maxStage}
          hoveredStage={hoveredStage}
          setHoveredStage={setHoveredStage}
          hoveredData={hoveredData}
        />
      </div>
    </div>
  );
}

interface RatioChartProps {
  curveData: DifficultySegment[];
  maxStage: number;
  hoveredStage: number | null;
  setHoveredStage: (stage: number | null) => void;
  hoveredData: DifficultySegment | null;
}

function RatioChart({
  curveData,
  maxStage,
  hoveredStage,
  setHoveredStage,
  hoveredData,
}: RatioChartProps) {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span>{t('ratio')} ({t('player')}/{t('enemy')})</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#3db88a' }} />
            1.3+
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#5a9cf5' }} />
            1.0-1.3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#e5a440' }} />
            0.8-1.0
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#e86161' }} />
            &lt;0.8
          </span>
        </div>
      </div>
      {/* 비율 막대 그래프 */}
      <div
        className="relative h-12 rounded-lg"
        style={{ background: 'var(--bg-tertiary)' }}
        onMouseLeave={() => setHoveredStage(null)}
      >
        {/* 기준선 (비율 1.0) */}
        <div
          className="absolute left-0 right-0 border-t border-dashed z-10 pointer-events-none"
          style={{ top: '33.3%', borderColor: 'var(--text-secondary)', opacity: 0.5 }}
        />
        <div
          className="absolute right-1 text-[9px] z-10 pointer-events-none"
          style={{ top: '33.3%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
        >
          1.0
        </div>
        {/* 막대들 */}
        <div className="absolute inset-0 flex items-end rounded-lg overflow-hidden">
          {curveData.map((d, i) => {
            const width = 100 / curveData.length;
            const normalizedRatio = Math.min(Math.max(d.ratio, 0.5), 2.0);
            const height = ((normalizedRatio - 0.5) / 1.5) * 100;

            let color: string;
            if (d.ratio >= 1.3) color = '#3db88a';
            else if (d.ratio >= 1.0) color = '#5a9cf5';
            else if (d.ratio >= 0.8) color = '#e5a440';
            else color = '#e86161';

            const isHovered = hoveredStage === d.stage;

            return (
              <div
                key={i}
                className="relative cursor-pointer"
                style={{ width: `${width}%`, height: '100%' }}
                onMouseEnter={() => setHoveredStage(d.stage)}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all duration-100"
                  style={{
                    height: `${height}%`,
                    background: color,
                    opacity: isHovered ? 1 : 0.7,
                    marginLeft: curveData.length > 50 ? '0px' : '1px',
                    marginRight: curveData.length > 50 ? '0px' : '1px',
                    borderRadius: curveData.length > 50 ? '0' : '2px 2px 0 0',
                    transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
                    transformOrigin: 'bottom',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* 호버 정보 표시 영역 */}
      <div
        className="flex items-center justify-between text-sm h-5"
        style={{ color: 'var(--text-secondary)' }}
      >
        {hoveredData ? (
          <div className="flex items-center gap-3 w-full">
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('stage')} {hoveredData.stage}
            </span>
            <span style={{
              color: hoveredData.ratio >= 1.3 ? '#3db88a' :
                     hoveredData.ratio >= 1.0 ? '#5a9cf5' :
                     hoveredData.ratio >= 0.8 ? '#e5a440' : '#e86161',
              fontWeight: 600
            }}>
              {hoveredData.ratio.toFixed(2)}x
              ({hoveredData.ratio >= 1.3 ? 'Easy' :
                hoveredData.ratio >= 1.0 ? 'Clear' :
                hoveredData.ratio >= 0.8 ? 'Hard' : 'Wall'})
            </span>
            <span className="ml-auto">
              {t('player')}: {hoveredData.playerPower.toLocaleString()} / {t('enemy')}: {hoveredData.enemyPower.toLocaleString()}
            </span>
          </div>
        ) : (
          <>
            <span>{t('stage')} 1</span>
            <span className="text-[9px]">( {t('stage')} 1~{maxStage} )</span>
            <span>{t('stage')} {maxStage}</span>
          </>
        )}
      </div>
    </div>
  );
}
