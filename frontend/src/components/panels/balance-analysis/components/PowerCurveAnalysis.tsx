/**
 * PowerCurveAnalysis - 파워 커브 분석 컴포넌트
 */

'use client';

import { TrendingUp, AlertTriangle } from 'lucide-react';
import type { PowerCurveAnalysis as PowerCurveResult } from '@/lib/balanceAnalysis';

interface PowerCurveAnalysisProps {
  units: { id: string }[];
  powerResult: PowerCurveResult | null;
  onRunAnalysis: () => void;
}

export function PowerCurveAnalysis({
  units,
  powerResult,
  onRunAnalysis,
}: PowerCurveAnalysisProps) {
  return (
    <div className="space-y-4">
      {/* 탭 설명 */}
      <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #3db88a' }}>
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>파워 커브 분석</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>레벨별 스탯 성장이 선형/지수/로그 중 어떤 패턴인지 분석합니다. R² 값으로 피팅 정확도를 확인하세요. <strong style={{ color: '#3db88a' }}>level 컬럼 필수</strong></div>
      </div>

      <button
        onClick={onRunAnalysis}
        disabled={units.length < 2}
        className="glass-button-primary w-full px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ background: '#3db88a' }}
      >
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" />
          파워 커브 분석
        </div>
      </button>

      {powerResult && (
        <div className="space-y-4">
          {/* 커브 타입 카드 */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="grid grid-cols-2">
              <div className="glass-stat p-4 text-center" style={{ borderRight: '1px solid var(--border-primary)' }}>
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>커브 타입</div>
                <div className="text-xl font-bold" style={{ color: '#3db88a' }}>
                  {powerResult.curveType === 'linear' ? '선형' :
                    powerResult.curveType === 'exponential' ? '지수' : '로그'}
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {powerResult.curveType === 'linear' ? '일정한 성장' :
                    powerResult.curveType === 'exponential' ? '후반 급성장' : '초반 급성장'}
                </div>
              </div>
              <div className="glass-stat p-4 text-center">
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>피팅 정확도</div>
                <div className="text-xl font-bold" style={{ color: powerResult.r2 >= 0.9 ? '#16a34a' : powerResult.r2 >= 0.7 ? '#d97706' : '#dc2626' }}>
                  {(powerResult.r2 * 100).toFixed(1)}%
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  R² = {powerResult.r2.toFixed(3)}
                </div>
              </div>
            </div>
            <div className="glass-divider px-4 py-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>수식</div>
              <div className="glass-section text-sm font-mono px-2 py-1.5 rounded" style={{ color: 'var(--text-secondary)' }}>
                {powerResult.formula}
              </div>
            </div>
          </div>

          {/* 이상치 감지 */}
          {powerResult.outliers.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden" style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(251, 191, 36, 0.08)' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#d97706' }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: '#d97706' }}>파워 이상치 감지</span>
              </div>
              <div className="p-4 space-y-2">
                {powerResult.outliers.map((o, i) => (
                  <div key={i} className="glass-section flex items-center justify-between p-2.5 rounded-lg text-sm">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>레벨 {o.level}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ color: 'var(--text-secondary)' }}>
                        실제: <strong>{o.power.toFixed(0)}</strong>
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        예상: {o.expectedPower?.toFixed(0)}
                      </span>
                      <span className="glass-badge px-2 py-0.5 rounded-full font-medium" style={{
                        background: (o.deviation ?? 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: (o.deviation ?? 0) > 0 ? '#dc2626' : '#2563eb'
                      }}>
                        {(o.deviation ?? 0) > 0 ? '+' : ''}{o.deviation?.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 권장사항 */}
          {powerResult.recommendations.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="glass-panel-header px-4 py-3">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>권장사항</span>
              </div>
              <div className="p-4 space-y-2">
                {powerResult.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-sm font-medium" style={{ background: 'rgba(61, 184, 138, 0.15)', color: '#3db88a' }}>
                      {i + 1}
                    </span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
