'use client';

import { useTranslations } from 'next-intl';
import { availableFunctions } from '@/lib/formulaEngine';
import type { Column } from '@/types';

interface FormulaAutocompleteProps {
  value: string;
  onSelect: (text: string) => void;
  columns: Column[];
}

export default function FormulaAutocomplete({
  value,
  onSelect,
  columns,
}: FormulaAutocompleteProps) {
  const t = useTranslations();

  const formulaText = value.startsWith('=') ? value.slice(1) : '';
  const lastWord = formulaText.split(/[\s()+\-*/,]/).pop()?.toUpperCase() || '';

  if (!lastWord || lastWord.length < 1) return null;

  const matchingFunctions = availableFunctions.filter((f) =>
    f.name.toUpperCase().startsWith(lastWord)
  );

  const matchingColumns = columns.filter((c) =>
    c.name.toUpperCase().startsWith(lastWord)
  );

  if (matchingFunctions.length === 0 && matchingColumns.length === 0) return null;

  return (
    <div
      className="absolute top-full left-0 mt-1 border rounded-lg shadow-lg z-50 w-72 max-h-48 overflow-y-auto"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
    >
      {matchingFunctions.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            {t('formula.functions')}
          </div>
          {matchingFunctions.slice(0, 5).map((func) => (
            <button
              key={func.name}
              onClick={() => {
                const newValue = value.slice(0, value.length - lastWord.length) + func.name + '(';
                onSelect(newValue);
              }}
              className="w-full text-left px-3 py-2 flex items-start gap-2 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-blue-light)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <code className="font-semibold text-sm" style={{ color: 'var(--primary-blue)' }}>{func.name}</code>
              <span className="text-xs flex-1" style={{ color: 'var(--text-tertiary)' }}>{func.description}</span>
            </button>
          ))}
        </div>
      )}
      {matchingColumns.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            {t('formula.columnRef')}
          </div>
          {matchingColumns.slice(0, 5).map((col) => (
            <button
              key={col.id}
              onClick={() => {
                const newValue = value.slice(0, value.length - lastWord.length) + col.name;
                onSelect(newValue);
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-green-light)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span className="font-medium text-sm" style={{ color: 'var(--primary-green)' }}>{col.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                ({col.type === 'formula' ? t('formula.formulaType') : t('formula.generalType')})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
