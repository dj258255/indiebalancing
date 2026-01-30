/**
 * CorrelationAnalysis - 상관관계 분석 컴포넌트
 */

'use client';

import { BarChart2 } from 'lucide-react';
import type { CorrelationResult } from '@/lib/balanceAnalysis';

interface CorrelationAnalysisProps {
  units: { id: string }[];
  correlationResult: CorrelationResult[] | null;
  onRunAnalysis: () => void;
}

export function CorrelationAnalysis({
  units,
  correlationResult,
  onRunAnalysis,
}: CorrelationAnalysisProps) {
  return (
    <div className="space-y-4">
      {/* 탭 설명 */}
      <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #5a9cf5' }}>
        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>스탯 상관관계 분석</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          스탯 간의 통계적 연관성을 분석합니다. <strong style={{ color: '#3db88a' }}>+1에 가까우면 양의 상관</strong>(함께 증가), <strong style={{ color: '#e86161' }}>-1에 가까우면 음의 상관</strong>(반대로 변화)입니다.
        </div>
        <div className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
          <strong>사용법:</strong> 분석 버튼을 클릭하면 모든 스탯 쌍의 상관계수를 계산합니다. 강한 상관관계(|r| &gt; 0.7)가 있으면 스탯 설계를 재검토하세요.
        </div>
      </div>

      <button
        onClick={onRunAnalysis}
        disabled={units.length < 3}
        className="glass-button-primary w-full px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ background: '#5a9cf5' }}
      >
        <div className="flex items-center justify-center gap-2">
          <BarChart2 className="w-4 h-4" />
          상관관계 분석
        </div>
      </button>

      {correlationResult && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="glass-panel-header px-4 py-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>스탯 상관관계</span>
          </div>
          <div>
            {correlationResult.map((r, i) => {
              const absCorr = Math.abs(r.correlation);
              const isPositive = r.correlation > 0;
              const strengthConfig = {
                strong: { label: '강함', bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
                moderate: { label: '중간', bg: 'rgba(251, 191, 36, 0.12)', color: '#d97706' },
                weak: { label: '약함', bg: 'rgba(156, 163, 175, 0.15)', color: 'var(--text-secondary)' },
                none: { label: '없음', bg: 'rgba(156, 163, 175, 0.1)', color: 'var(--text-secondary)' },
              };
              const config = strengthConfig[r.strength];

              return (
                <div key={i} className="p-3" style={{ borderBottom: i < correlationResult.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {r.stat1}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>↔</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {r.stat2}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="glass-badge text-sm px-2 py-0.5 rounded-full font-medium"
                        style={{ background: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                      <span
                        className="text-sm font-mono font-bold w-12 text-right"
                        style={{ color: isPositive ? '#16a34a' : '#dc2626' }}
                      >
                        {isPositive ? '+' : ''}{r.correlation.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {/* 상관관계 바 */}
                  <div className="glass-progress h-2 rounded-full overflow-hidden flex">
                    <div className="w-1/2 flex justify-end">
                      {!isPositive && (
                        <div
                          className="h-full rounded-l-full transition-all"
                          style={{
                            width: `${absCorr * 100}%`,
                            background: 'linear-gradient(270deg, #f87171, #fca5a5)'
                          }}
                        />
                      )}
                    </div>
                    <div className="w-px" style={{ background: 'var(--border-secondary)' }} />
                    <div className="w-1/2">
                      {isPositive && (
                        <div
                          className="h-full rounded-r-full transition-all"
                          style={{
                            width: `${absCorr * 100}%`,
                            background: 'linear-gradient(90deg, #4ade80, #86efac)'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {units.length < 3 && (
        <div className="glass-card text-center py-8 rounded-xl">
          <BarChart2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            최소 3개 이상의 유닛이 필요합니다
          </p>
        </div>
      )}
    </div>
  );
}
