'use client';

import { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { availableFunctions, evaluateFormula } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';

export default function FormulaHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const [testFormula, setTestFormula] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedFunction, setCopiedFunction] = useState<string | null>(null);

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
    <div className="card overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>수식 도우미</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
        ) : (
          <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
        )}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 animate-fadeIn">
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

          {/* 사용 가능한 함수 목록 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>사용 가능한 함수</h4>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {availableFunctions.map((func) => (
                <div
                  key={func.name}
                  className="border rounded-lg p-3 transition-colors"
                  style={{
                    borderColor: 'var(--border-primary)',
                    background: 'var(--bg-primary)',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-semibold" style={{ color: 'var(--accent)' }}>{func.name}</code>
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{func.description}</span>
                      </div>
                      <code className="text-xs block mt-1" style={{ color: 'var(--text-tertiary)' }}>{func.syntax}</code>
                    </div>
                    <button
                      onClick={() => handleCopy(func.example, func.name)}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
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
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      {func.example}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 수식 팁 */}
          <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--accent-light)' }}>
            <h4 className="font-medium mb-2" style={{ color: 'var(--accent-text)' }}>수식 팁</h4>
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
      )}
    </div>
  );
}
