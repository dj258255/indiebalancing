'use client';

import { useTranslations } from 'next-intl';
import { availableFunctions } from '@/lib/formulaEngine';

interface FormulaHintProps {
  formula: string;
}

export default function FormulaHint({ formula }: FormulaHintProps) {
  const t = useTranslations();

  if (!formula.startsWith('=')) return null;

  const formulaText = formula.slice(1).toUpperCase();

  const funcMatch = formulaText.match(/^([A-Z_]+)\s*\(/);
  if (!funcMatch) {
    return (
      <div className="absolute top-full left-0 mt-1 bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-lg z-50">
        <span className="text-gray-300">{t('formula.hint')}</span>
      </div>
    );
  }

  const funcName = funcMatch[1];
  const func = availableFunctions.find((f) => f.name.toUpperCase() === funcName);

  if (!func) return null;

  return (
    <div className="absolute top-full left-0 mt-1 bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-lg z-50 max-w-sm">
      <div className="font-semibold text-blue-300 mb-1">{func.name}</div>
      <div className="text-gray-300 mb-1">{func.description}</div>
      <code className="text-yellow-300 text-xs">{func.syntax}</code>
    </div>
  );
}
