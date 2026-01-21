'use client';

import { FileSpreadsheet, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EmptySheetViewProps {
  onCreateSheet: () => void;
}

export default function EmptySheetView({ onCreateSheet }: EmptySheetViewProps) {
  const t = useTranslations();

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-light)' }}
      >
        <FileSpreadsheet className="w-8 h-8" style={{ color: 'var(--accent)' }} />
      </div>
      <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        {t('sheet.noSheets')}
      </p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
        {t('sheet.createSheetDesc')}
      </p>
      <button
        onClick={onCreateSheet}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        <Plus className="w-4 h-4" />
        {t('sheet.createSheet')}
      </button>
    </div>
  );
}
