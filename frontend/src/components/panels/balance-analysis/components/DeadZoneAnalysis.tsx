/**
 * DeadZoneAnalysis - 데드존 탐지 컴포넌트
 */

'use client';

import { AlertTriangle } from 'lucide-react';
import type { UnitStats } from '@/lib/simulation/types';
import { detectDeadZones } from '@/lib/balanceAnalysis';

interface DeadZoneAnalysisProps {
  units: UnitStats[];
}

export function DeadZoneAnalysis({ units }: DeadZoneAnalysisProps) {
  const statLabels: Record<string, string> = {
    hp: 'HP (체력)',
    atk: 'ATK (공격력)',
    def: 'DEF (방어력)',
    speed: 'SPEED (속도)'
  };

  return (
    <div className="space-y-4">
      {/* 탭 설명 */}
      <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #e5a440' }}>
        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>데드존 탐지</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          활용되지 않는 스탯 구간(데드존)을 탐지합니다. 유닛들이 특정 구간에만 몰려있거나 빈 구간이 있으면 밸런스 문제일 수 있습니다.
        </div>
        <div className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
          <strong>사용법:</strong> 각 스탯별로 분포 상태를 자동 분석합니다. 경고가 표시된 스탯은 값 범위를 재조정하거나 중간 구간의 유닛을 추가하세요.
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {['hp', 'atk', 'def', 'speed'].map((stat, idx) => {
          const deadZones = detectDeadZones(units, stat as keyof UnitStats);
          const hasIssue = deadZones.length > 0;

          return (
            <div
              key={stat}
              className="p-4"
              style={{
                background: hasIssue ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                borderBottom: idx < 3 ? '1px solid var(--border-primary)' : 'none'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {statLabels[stat]}
                  </span>
                </div>
                {hasIssue ? (
                  <span className="glass-badge flex items-center gap-1 text-sm px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(229, 164, 64, 0.15)', color: '#e5a440' }}>
                    <AlertTriangle className="w-3 h-3" />
                    {deadZones.length}개 이슈
                  </span>
                ) : (
                  <span className="glass-badge text-sm px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(61, 184, 138, 0.1)', color: '#3db88a' }}>
                    정상
                  </span>
                )}
              </div>
              {hasIssue ? (
                <div className="space-y-1.5 mt-2">
                  {deadZones.map((dz, i) => (
                    <div key={i} className="glass-section flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#e5a440' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{dz.reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  스탯 분포가 적절합니다
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
