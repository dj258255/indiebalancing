/**
 * HelpPanel - 난이도 커브 도움말 패널
 */

'use client';

import { TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';

const PANEL_COLOR = '#9179f2';

export function HelpPanel() {
  const t = useTranslations('difficultyCurve');

  return (
    <div className="glass-card p-4 animate-slideDown space-y-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${PANEL_COLOR}, ${PANEL_COLOR}cc)` }}
        >
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpTitle')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('helpOverviewDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-section p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#e86161' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpWall')}</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('helpWallDesc')}</p>
        </div>
        <div className="glass-section p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3.5 h-3.5" style={{ color: '#3db88a' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpMilestone')}</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('helpMilestoneDesc')}</p>
        </div>
      </div>

      {/* 그래프 수치 설명 */}
      <div className="glass-section p-3 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: PANEL_COLOR }} />
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('helpGraphTitle')}</span>
        </div>
        <div className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: '#5a9cf5' }} />
            <span>{t('helpGraphPlayer')}</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: '#e86161' }} />
            <span>{t('helpGraphEnemy')}</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: '#3db88a' }} />
            <span>{t('helpGraphRatio')}</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: PANEL_COLOR }} />
            <span>{t('helpGraphGrowth')}</span>
          </div>
        </div>
      </div>

      <div className="glass-divider" />

      <div className="grid grid-cols-2 gap-2 text-sm">
        {[1, 2, 3, 4].map(num => (
          <div key={num} className="flex gap-2 items-start">
            <span
              className="w-5 h-5 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: `${PANEL_COLOR}20`, color: PANEL_COLOR }}
            >
              {num}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{t(`helpStep${num}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
