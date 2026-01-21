'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function WelcomeScreen() {
  const t = useTranslations();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {t('welcome.title')}
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--text-tertiary)' }}>
          {t('welcome.subtitle')}
        </p>

        <div className="card p-6 text-left mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('features.title')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <FeatureItem
              title={t('features.gameFormula')}
              desc={t('features.gameFormulaDesc')}
            />
            <FeatureItem
              title={t('features.balanceValidator')}
              desc={t('features.balanceValidatorDesc')}
            />
            <FeatureItem
              title={t('features.difficultyCurve')}
              desc={t('features.difficultyCurveDesc')}
            />
            <FeatureItem
              title={t('features.sheetLink')}
              desc={t('features.sheetLinkDesc')}
            />
            <FeatureItem
              title={t('features.growthCurve')}
              desc={t('features.growthCurveDesc')}
            />
            <FeatureItem
              title={t('features.autoSave')}
              desc={t('features.autoSaveDesc')}
            />
          </div>
        </div>

        <div
          className="flex items-center justify-center gap-2 text-sm"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span>{t('welcome.startGuide')}</span>
          <span
            className="font-semibold px-2 py-1 rounded"
            style={{
              background: 'var(--accent-light)',
              color: 'var(--accent)',
            }}
          >
            {t('welcome.startButton')}
          </span>
          <span>{t('welcome.startEnd')}</span>
          <ArrowRight className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
        {title}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {desc}
      </div>
    </div>
  );
}
