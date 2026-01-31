/**
 * HelpPanel - 엔티티 정의 도움말 패널
 */

'use client';

import { Users, TrendingUp, Settings, Table2, Database, Sliders, FileJson } from 'lucide-react';

const PANEL_COLOR = '#5a9cf5';

export function HelpPanel() {
  return (
    <div className="glass-card p-4 animate-slideDown space-y-4">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}
        >
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>엔티티 정의 패널</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            캐릭터, 몬스터, 아이템 등의 기본 데이터를 기반으로 레벨별 스탯 테이블을 자동 생성합니다.
          </p>
        </div>
      </div>

      {/* 기본 개념 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-section p-3">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-3.5 h-3.5" style={{ color: '#5a9cf5' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>소스 시트</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            엔티티의 기본 정보(ID, 이름, 기본 스탯)가 담긴 시트를 선택합니다.
          </p>
        </div>
        <div className="glass-section p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>스탯 정의</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            각 스탯의 소스 컬럼, 성장 곡선, 성장률을 설정합니다.
          </p>
        </div>
      </div>

      {/* 성장 곡선 타입 */}
      <div className="glass-section p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>성장 곡선 타입</span>
        </div>
        <div className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-start gap-2">
            <span className="font-medium shrink-0" style={{ color: 'var(--text-primary)' }}>선형:</span>
            <span>일정한 비율로 증가 (base + level × rate)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium shrink-0" style={{ color: 'var(--text-primary)' }}>지수:</span>
            <span>레벨이 높을수록 급격히 증가 (base × rate^level)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium shrink-0" style={{ color: 'var(--text-primary)' }}>로그:</span>
            <span>초반에 빠르게, 후반에 완만하게 증가</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium shrink-0" style={{ color: 'var(--text-primary)' }}>이차:</span>
            <span>포물선 형태로 증가 (base + rate × level²)</span>
          </div>
        </div>
      </div>

      {/* 오버라이드 & 보간 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-section p-3">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>오버라이드</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            특정 레벨의 스탯을 수동으로 지정하여 곡선을 미세 조정합니다.
          </p>
        </div>
        <div className="glass-section p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#9179f2' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>보간 방식</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            오버라이드 구간 사이를 선형/부드럽게 연결합니다.
          </p>
        </div>
      </div>

      {/* 출력 형식 */}
      <div className="glass-section p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <FileJson className="w-3.5 h-3.5" style={{ color: '#9179f2' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>출력 결과</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          생성된 레벨 테이블은 새 시트로 저장되며, Unity ScriptableObject + JSON 형식으로 내보낼 수 있습니다.
        </p>
        <div className="text-xs mt-2 p-2 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
          <code>{'{ id, name, level, HP, ATK, DEF, ... }'}</code>
        </div>
      </div>

      <div className="glass-divider" />

      {/* 사용 순서 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          { num: 1, text: '소스 시트 선택' },
          { num: 2, text: 'ID/이름 컬럼 매핑' },
          { num: 3, text: '스탯 정의 설정' },
          { num: 4, text: '엔티티 선택 후 생성' },
        ].map(({ num, text }) => (
          <div key={num} className="flex gap-2 items-start">
            <span
              className="w-5 h-5 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: `${PANEL_COLOR}20`, color: PANEL_COLOR }}
            >
              {num}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
