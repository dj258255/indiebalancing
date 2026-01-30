/**
 * DeadZoneAnalysis - 데드존 탐지 컴포넌트
 */

'use client';

import { AlertTriangle } from 'lucide-react';
import type { UnitStats } from '@/lib/simulation/types';
import { detectDeadZones } from '@/lib/balanceAnalysis';
import type { Column } from '@/types';
import { ColumnMappingConfig, type ColumnMapping } from './ColumnMappingConfig';

const PANEL_COLOR = '#e5a440';

interface DeadZoneAnalysisProps {
  units: UnitStats[];
  columns: Column[];
  columnMapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

export function DeadZoneAnalysis({
  units,
  columns,
  columnMapping,
  onMappingChange,
}: DeadZoneAnalysisProps) {
  const statLabels: Record<string, string> = {
    hp: 'HP (체력)',
    atk: 'ATK (공격력)',
    def: 'DEF (방어력)',
    speed: 'SPEED (속도)'
  };

  return (
    <div className="space-y-4">
      {/* 탭 설명 */}
      <div className="glass-section p-3 rounded-lg" style={{ borderLeft: `3px solid ${PANEL_COLOR}` }}>
        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>데드존 탐지</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          활용되지 않는 스탯 구간(데드존)을 탐지합니다. 유닛들이 특정 구간에만 몰려있거나 빈 구간이 있으면 밸런스 문제일 수 있습니다.
        </div>
      </div>

      {/* 컬럼 매핑 설정 */}
      <ColumnMappingConfig
        mapping={columnMapping}
        onMappingChange={onMappingChange}
        columns={columns}
        fields={[
          { key: 'hp', label: 'HP', description: '체력' },
          { key: 'atk', label: 'ATK', description: '공격력' },
          { key: 'def', label: 'DEF', description: '방어력' },
          { key: 'speed', label: 'Speed', description: '속도' },
        ]}
        title="분석할 스탯 컬럼"
        accentColor={PANEL_COLOR}
      />

      {/* 선택된 스탯만 분석 */}
      {(() => {
        const selectedStats = (['hp', 'atk', 'def', 'speed'] as const).filter(
          stat => columnMapping[stat]
        );

        if (selectedStats.length === 0) {
          return (
            <div className="glass-card text-center py-8 rounded-xl">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                분석할 스탯 컬럼을 선택해주세요
              </p>
            </div>
          );
        }

        return (
          <div className="glass-card rounded-xl overflow-hidden">
            {selectedStats.map((stat, idx) => {
              const deadZones = detectDeadZones(units, stat as keyof UnitStats);
              const hasIssue = deadZones.length > 0;

              return (
                <div
                  key={stat}
                  className="p-4"
                  style={{
                    background: hasIssue ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                    borderBottom: idx < selectedStats.length - 1 ? '1px solid var(--border-primary)' : 'none'
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
        );
      })()}
    </div>
  );
}
