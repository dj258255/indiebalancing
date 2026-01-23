'use client';

import { useTranslations } from 'next-intl';
import type { Sheet } from '@/types';

interface SheetHeaderProps {
  sheet: Sheet;
}

export default function SheetHeader({
  sheet,
}: SheetHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-5 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h2
            className="text-base sm:text-lg lg:text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {sheet.name}
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {t('sheet.rowCount', { count: sheet.rows.length })} · {t('sheet.colCount', { count: sheet.columns.length })}
          </p>
        </div>
      </div>
    </div>
  );
}
