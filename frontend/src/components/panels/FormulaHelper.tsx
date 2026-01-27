'use client';

import { useState, useMemo } from 'react';
import { Calculator, Copy, Check, Swords, Coins, Layers, Wrench, Link, Sigma, Triangle, GitBranch, BarChart3, FunctionSquare } from 'lucide-react';
import { availableFunctions, evaluateFormula } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useEscapeKey } from '@/hooks';

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
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
}

const PANEL_COLOR = '#3b82f6';

export default function FormulaHelper({ onClose, showHelp = false, setShowHelp }: FormulaHelperProps) {
  const t = useTranslations();
  useEscapeKey(onClose ?? (() => {}), !!onClose);
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

  // 함수 설명 번역 (특수 문자 포함된 함수명 처리)
  const getFunctionDescription = (funcName: string, fallback: string) => {
    if (funcName.includes('.')) {
      return fallback;
    }
    const key = `formulaHelper.functions.${funcName}`;
    const translated = t(key);
    return translated === key ? fallback : translated;
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
    <div className="flex flex-col h-full">
      <div className="p-3 pb-12 space-y-3 overflow-y-auto overflow-x-hidden flex-1">
        {/* 도움말 섹션 */}
        {showHelp && (
          <div className="mb-4 p-3 rounded-lg animate-slideDown" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <div className="space-y-3">
              {/* 개요 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${PANEL_COLOR}20` }}>
                  <FunctionSquare className="w-3 h-3" style={{ color: PANEL_COLOR }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.helpTitle')}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('formulaHelper.helpDesc')}</p>
                </div>
              </div>

              {/* 사용 방법 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>{t('formulaHelper.helpUsage')}</span>
                  <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('formulaHelper.helpUsageDesc')}</span>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-medium" style={{ color: PANEL_COLOR }}>{t('formulaHelper.helpTest')}</span>
                  <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>{t('formulaHelper.helpTestDesc')}</span>
                </div>
              </div>

              {/* 수식 문법 가이드 */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t('formulaHelper.syntaxGuide')}</div>
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
        )}

        {/* 함수 개수 배지 */}
        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${PANEL_COLOR}20`, color: PANEL_COLOR }}>
            {t('formulaHelper.functionCount', { count: availableFunctions.length })}
          </span>
        </div>

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
          <div className="grid gap-2 pr-1">
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
                        {getFunctionDescription(func.name, func.description)}
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
                  {(func.formula || func.paramHint) && (
                    <div
                      className="mt-2 px-2 py-1.5 rounded text-xs border-l-2 space-y-1 overflow-hidden"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderLeftColor: categoryColor || 'var(--accent)',
                      }}
                    >
                      {func.formula && (
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>{t('formulaHelper.formulaLabel')}</span>
                          <code
                            className="font-mono break-all"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {func.formula}
                          </code>
                        </div>
                      )}
                      {func.paramHint && (
                        <div className="break-words" style={{ color: 'var(--text-tertiary)' }}>
                          {func.paramHint}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
