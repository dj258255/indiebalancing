'use client';

import { useState, useMemo } from 'react';
import { Calculator, X, Copy, Check, Swords, Coins, Layers, Wrench, Link, Sigma, Triangle, GitBranch, BarChart3 } from 'lucide-react';
import { availableFunctions, evaluateFormula } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// 카테고리 정의 - 번역 키 사용
const CATEGORY_IDS = ['all', 'combat', 'economy', 'stage', 'util', 'ref', 'math', 'stat', 'trig', 'logic'] as const;
const CATEGORY_ICONS: Record<string, typeof Calculator> = {
  all: Calculator,
  combat: Swords,
  economy: Coins,
  stage: Layers,
  util: Wrench,
  ref: Link,
  math: Sigma,
  stat: BarChart3,
  trig: Triangle,
  logic: GitBranch,
};
const CATEGORY_COLORS: Record<string, string> = {
  all: 'var(--accent)',
  combat: '#ef4444',
  economy: '#f59e0b',
  stage: '#8b5cf6',
  util: '#06b6d4',
  ref: '#10b981',
  math: '#3b82f6',
  stat: '#ec4899',
  trig: '#14b8a6',
  logic: '#a855f7',
};

interface FormulaHelperProps {
  onClose?: () => void;
}

export default function FormulaHelper({ onClose }: FormulaHelperProps) {
  const t = useTranslations();
  const [testFormula, setTestFormula] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedFunction, setCopiedFunction] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 카테고리 번역 키 매핑
  const getCategoryName = (id: string) => {
    const keyMap: Record<string, string> = {
      all: 'formulaHelper.catAll',
      combat: 'formulaHelper.catCombat',
      economy: 'formulaHelper.catEconomy',
      stage: 'formulaHelper.catStage',
      util: 'formulaHelper.catUtil',
      ref: 'formulaHelper.catRef',
      math: 'formulaHelper.catMath',
      stat: 'formulaHelper.catStat',
      trig: 'formulaHelper.catTrig',
      logic: 'formulaHelper.catLogic',
    };
    return t(keyMap[id] || id);
  };

  // 카테고리별 필터링
  const filteredFunctions = useMemo(() => {
    if (selectedCategory === 'all') return availableFunctions;
    return availableFunctions.filter(f => f.category === selectedCategory);
  }, [selectedCategory]);

  // 카테고리별 함수 개수
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: availableFunctions.length };
    availableFunctions.forEach(f => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return counts;
  }, []);

  const handleTest = () => {
    if (!testFormula.trim()) {
      setTestResult(null);
      return;
    }
    const result = evaluateFormula(testFormula);
    if (result.error) {
      setTestResult(`${t('formulaHelper.error')} ${result.error}`);
    } else {
      setTestResult(`${t('formulaHelper.result')} ${result.value}`);
    }
  };

  const handleCopy = (text: string, functionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFunction(functionName);
    setTimeout(() => setCopiedFunction(null), 2000);
  };

  return (
    <div className="card overflow-hidden h-full flex flex-col">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Calculator className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.title')}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {t('formulaHelper.functionCount', { count: availableFunctions.length })}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-3 pb-12 space-y-3 overflow-y-auto flex-1">
          {/* 수식 테스트 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.testFormula')}</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={testFormula}
                onChange={(e) => setTestFormula(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                placeholder={t('formulaHelper.testPlaceholder')}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
              />
              <button
                onClick={handleTest}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {t('formulaHelper.test')}
              </button>
            </div>
            {testResult && (
              <div
                className={cn(
                  'px-3 py-2 rounded-lg text-sm',
                  testResult.startsWith(t('formulaHelper.error'))
                    ? ''
                    : ''
                )}
                style={{
                  background: testResult.startsWith(t('formulaHelper.error')) ? 'var(--error-light)' : 'var(--success-light)',
                  color: testResult.startsWith(t('formulaHelper.error')) ? 'var(--error)' : 'var(--success)',
                }}
              >
                {testResult}
              </div>
            )}
          </div>

          {/* 카테고리 탭 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.category')}</h4>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_IDS.map((catId) => {
                const Icon = CATEGORY_ICONS[catId];
                const color = CATEGORY_COLORS[catId];
                const isSelected = selectedCategory === catId;
                return (
                  <button
                    key={catId}
                    onClick={() => setSelectedCategory(catId)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'
                    )}
                    style={{
                      background: isSelected ? color : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      // @ts-expect-error CSS custom property
                      '--tw-ring-color': color,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{getCategoryName(catId)}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                      }}
                    >
                      {categoryCounts[catId] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 사용 가능한 함수 목록 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('formulaHelper.functionList')}
              </h4>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {t('formulaHelper.showing', { count: filteredFunctions.length })}
              </span>
            </div>
            <div className="grid gap-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredFunctions.map((func) => {
                const categoryColor = CATEGORY_COLORS[func.category];
                const categoryName = getCategoryName(func.category);
                return (
                  <div
                    key={func.name}
                    className="border rounded-lg p-3 transition-colors hover:border-opacity-60"
                    style={{
                      borderColor: 'var(--border-primary)',
                      background: 'var(--bg-primary)',
                      borderLeftWidth: '3px',
                      borderLeftColor: categoryColor || 'var(--border-primary)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-semibold" style={{ color: categoryColor || 'var(--accent)' }}>
                            {func.name}
                          </code>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                          >
                            {categoryName}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {func.description}
                        </p>
                        <code className="text-xs block mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {func.syntax}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopy(func.example, func.name)}
                        className="p-1.5 rounded-lg transition-colors ml-2 flex-shrink-0"
                        style={{
                          color: 'var(--text-tertiary)',
                          background: 'var(--bg-tertiary)',
                        }}
                        title={t('formulaHelper.copyExample')}
                      >
                        {copiedFunction === func.name ? (
                          <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="mt-2">
                      <code
                        className="text-xs px-2 py-1 rounded inline-block"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {func.example}
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 도움말 */}
          <div className="rounded-lg p-3 text-sm border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
            <h4 className="font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{ background: 'var(--accent)', color: 'white' }}>?</span>
              {t('formulaHelper.syntaxGuide')}
            </h4>
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>=</code> {t('formulaHelper.formulaStart')}
              </li>
              <li>
                {t('formulaHelper.basicOps')} <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>+</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>-</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>*</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>/</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>^</code>
              </li>
              <li className="pt-1.5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.sameRowRef')}</span> {t('formulaHelper.useColumnName')}
                <br />
                <code className="px-1 rounded mt-0.5 inline-block" style={{ background: 'var(--bg-primary)' }}>=ATK * 1.5</code>
              </li>
              <li>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.prevRowRef')}</span>
                <br />
                <code className="px-1 rounded mt-0.5 inline-block" style={{ background: 'var(--bg-primary)' }}>=PREV.CumulativeEXP + CurrentEXP</code>
              </li>
              <li className="pt-1.5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.settingsRef')}</span>
                <br />
                <span style={{ color: 'var(--text-tertiary)' }}>{t('formulaHelper.settingsDesc')}</span>
                <br />
                <code className="px-1 rounded mt-0.5 inline-block" style={{ background: 'var(--bg-primary)' }}>=Settings.BASE_HP * HPMultiplier</code>
              </li>
              <li>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.cellRef')}</span>
                <br />
                <code className="px-1 rounded mt-0.5 inline-block" style={{ background: 'var(--bg-primary)' }}>REF(&quot;SheetName&quot;, &quot;RowID&quot;, &quot;ColumnName&quot;)</code>
              </li>
            </ul>
          </div>
      </div>
    </div>
  );
}
