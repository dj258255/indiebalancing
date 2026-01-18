'use client';

import { useState, useMemo } from 'react';
import { Calculator, X, Copy, Check, Swords, Coins, Layers, Wrench, Link, Sigma, Triangle, GitBranch, BarChart3 } from 'lucide-react';
import { availableFunctions, evaluateFormula } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';

// 카테고리 정의
const CATEGORIES = [
  { id: 'all', name: '전체', icon: Calculator, color: 'var(--accent)' },
  { id: 'combat', name: '전투/밸런스', icon: Swords, color: '#ef4444' },
  { id: 'economy', name: '경제/확률', icon: Coins, color: '#f59e0b' },
  { id: 'stage', name: '스테이지', icon: Layers, color: '#8b5cf6' },
  { id: 'util', name: '유틸리티', icon: Wrench, color: '#06b6d4' },
  { id: 'ref', name: '시트 참조', icon: Link, color: '#10b981' },
  { id: 'math', name: '수학', icon: Sigma, color: '#3b82f6' },
  { id: 'stat', name: '통계', icon: BarChart3, color: '#ec4899' },
  { id: 'trig', name: '삼각함수', icon: Triangle, color: '#14b8a6' },
  { id: 'logic', name: '조건/논리', icon: GitBranch, color: '#a855f7' },
];

interface FormulaHelperProps {
  onClose?: () => void;
}

export default function FormulaHelper({ onClose }: FormulaHelperProps) {
  const [testFormula, setTestFormula] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedFunction, setCopiedFunction] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

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
      setTestResult(`오류: ${result.error}`);
    } else {
      setTestResult(`결과: ${result.value}`);
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
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>수식 도우미</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {availableFunctions.length}개
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
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>수식 테스트</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={testFormula}
                onChange={(e) => setTestFormula(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                placeholder="예: DAMAGE(150, 50)"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
              />
              <button
                onClick={handleTest}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                테스트
              </button>
            </div>
            {testResult && (
              <div
                className={cn(
                  'px-3 py-2 rounded-lg text-sm',
                  testResult.startsWith('오류')
                    ? ''
                    : ''
                )}
                style={{
                  background: testResult.startsWith('오류') ? 'var(--error-light)' : 'var(--success-light)',
                  color: testResult.startsWith('오류') ? 'var(--error)' : 'var(--success)',
                }}
              >
                {testResult}
              </div>
            )}
          </div>

          {/* 카테고리 탭 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>카테고리</h4>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'
                    )}
                    style={{
                      background: isSelected ? cat.color : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      // @ts-expect-error CSS custom property
                      '--tw-ring-color': cat.color,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                      }}
                    >
                      {categoryCounts[cat.id] || 0}
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
                함수 목록
              </h4>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {filteredFunctions.length}개 표시
              </span>
            </div>
            <div className="grid gap-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredFunctions.map((func) => {
                const category = CATEGORIES.find(c => c.id === func.category);
                return (
                  <div
                    key={func.name}
                    className="border rounded-lg p-3 transition-colors hover:border-opacity-60"
                    style={{
                      borderColor: 'var(--border-primary)',
                      background: 'var(--bg-primary)',
                      borderLeftWidth: '3px',
                      borderLeftColor: category?.color || 'var(--border-primary)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-semibold" style={{ color: category?.color || 'var(--accent)' }}>
                            {func.name}
                          </code>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                          >
                            {category?.name}
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
                        title="예제 복사"
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
              도움말
            </h4>
            <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>=</code>로 시작하면 수식으로 인식
              </li>
              <li>
                기본 연산: <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>+</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>-</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>*</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>/</code>{' '}
                <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>^</code>
              </li>
              <li>
                다른 셀 참조: 컬럼 이름 사용 (예: <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>=ATK * 1.5</code>)
              </li>
              <li>
                다른 시트 참조: <code className="px-1 rounded" style={{ background: 'var(--bg-primary)' }}>REF(&quot;시트명&quot;, &quot;행ID&quot;, &quot;컬럼명&quot;)</code>
              </li>
            </ul>
          </div>
      </div>
    </div>
  );
}
