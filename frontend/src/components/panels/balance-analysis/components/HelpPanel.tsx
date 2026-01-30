/**
 * HelpPanel - 밸런스 분석 도움말 패널
 */

'use client';

import { GitBranch, TrendingUp, BarChart2, AlertTriangle, Target } from 'lucide-react';

export function HelpPanel() {
  return (
    <div className="mb-4 glass-card p-3 rounded-lg animate-slideDown">
      <div className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>밸런스 분석 도구</div>
      <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>시트 데이터를 기반으로 심층적인 패턴 분석을 수행합니다.</p>

      <div className="space-y-3">
        {/* 상성 분석 */}
        <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #7c7ff2' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <GitBranch className="w-4 h-4" style={{ color: '#7c7ff2' }} />
            <span className="font-semibold text-sm" style={{ color: '#7c7ff2' }}>상성 분석</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>유닛 간 1:1 전투 시뮬레이션으로 승률 매트릭스 생성</p>
          <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
            <div>- 필요 컬럼: name, hp, atk, def, speed</div>
            <div>- 결과: 승률표, OP/약캐 감지, 가위바위보 순환 탐지</div>
          </div>
        </div>

        {/* 파워 커브 */}
        <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #3db88a' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-4 h-4" style={{ color: '#3db88a' }} />
            <span className="font-semibold text-sm" style={{ color: '#3db88a' }}>파워 커브</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>레벨별 파워가 어떤 패턴으로 성장하는지 분석</p>
          <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
            <div>- 필요 컬럼: level + 스탯들</div>
            <div>- 결과: 선형/지수/로그 타입, 이상치 감지</div>
          </div>
        </div>

        {/* 상관관계 */}
        <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #5a9cf5' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart2 className="w-4 h-4" style={{ color: '#5a9cf5' }} />
            <span className="font-semibold text-sm" style={{ color: '#5a9cf5' }}>상관관계</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>스탯 간 상관계수 분석 (HP-DEF 등)</p>
          <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
            <div>- 필요: 3개 이상 유닛</div>
            <div>- 결과: 강한 상관(-1~1), 밸런스 의도 확인</div>
          </div>
        </div>

        {/* 데드존 */}
        <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #e5a440' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4" style={{ color: '#e5a440' }} />
            <span className="font-semibold text-sm" style={{ color: '#e5a440' }}>데드존</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>사용되지 않는 스탯 구간 자동 탐지</p>
          <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
            <div>- 자동 분석 (버튼 없음)</div>
            <div>- 결과: 비어있는 구간, 밀집/분산 경고</div>
          </div>
        </div>

        {/* 커브 생성 */}
        <div className="glass-section p-3 rounded-lg" style={{ borderLeft: '3px solid #9179f2' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-4 h-4" style={{ color: '#9179f2' }} />
            <span className="font-semibold text-sm" style={{ color: '#9179f2' }}>커브 생성</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>레벨별 스탯 성장표를 자동 생성</p>
          <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
            <div>- 입력: 기본스탯, 최대레벨, 성장률, 타입</div>
            <div>- 결과: 복사해서 시트에 붙여넣기 가능</div>
          </div>
        </div>
      </div>
    </div>
  );
}
