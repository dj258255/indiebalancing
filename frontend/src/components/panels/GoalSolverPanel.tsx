'use client';

import { useState } from 'react';
import { X, Target, Calculator, AlertTriangle, Check, Copy, ChevronDown, HelpCircle } from 'lucide-react';
import { solve, SOLVER_FORMULAS, type SolverFormula } from '@/lib/goalSolver';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface GoalSolverPanelProps {
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

// number input spinner 숨기는 스타일
const hideSpinnerStyle = `
  .hide-spinner::-webkit-outer-spin-button,
  .hide-spinner::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .hide-spinner[type=number] {
    -moz-appearance: textfield;
  }
`;

export default function GoalSolverPanel({ onClose, onDragStart }: GoalSolverPanelProps) {
  // ESC 키로 패널 닫기
  useEscapeKey(onClose);

  const [expandedFormulas, setExpandedFormulas] = useState<Set<SolverFormula>>(new Set());
  const [params, setParams] = useState<Record<string, Record<string, string>>>({});
  const [targetValues, setTargetValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, ReturnType<typeof solve>>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpHeight, setHelpHeight] = useState(120);

  // 토글 (펼치기/접기) - 여러 개 동시에 열 수 있음
  const handleToggleFormula = (formulaId: SolverFormula) => {
    setExpandedFormulas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(formulaId)) {
        newSet.delete(formulaId);
      } else {
        newSet.add(formulaId);
        // 파라미터 초기화 (아직 없으면)
        if (!params[formulaId]) {
          const formula = SOLVER_FORMULAS.find(f => f.id === formulaId);
          if (formula) {
            const defaultParams: Record<string, string> = {};
            formula.params.forEach(p => {
              defaultParams[p.key] = String(p.defaultValue);
            });
            setParams(prevParams => ({ ...prevParams, [formulaId]: defaultParams }));
          }
        }
      }
      return newSet;
    });
  };

  // 계산 실행
  const handleCalculate = (formulaId: SolverFormula) => {
    const formula = SOLVER_FORMULAS.find(f => f.id === formulaId);
    if (!formula) return;

    const targetValue = targetValues[formulaId];
    if (!targetValue) return;

    // 퍼센트 입력 처리
    let parsedTarget = parseFloat(targetValue);
    if (formula.targetUnit === '%') {
      parsedTarget = parsedTarget / 100;
    }

    // 파라미터 파싱
    const parsedParams: Record<string, number> = {};
    const formulaParams = params[formulaId] || {};
    for (const param of formula.params) {
      let value = parseFloat(formulaParams[param.key]) || param.defaultValue;
      if (param.unit === '%') {
        value = value / 100;
      }
      parsedParams[param.key] = value;
    }

    const solverResult = solve({
      formula: formulaId,
      params: parsedParams,
      targetValue: parsedTarget,
    });

    setResults(prev => ({ ...prev, [formulaId]: solverResult }));
  };

  // 결과 복사
  const handleCopy = (formulaId: string, value: number | string) => {
    navigator.clipboard.writeText(String(value));
    setCopied(formulaId);
    setTimeout(() => setCopied(null), 2000);
  };

  // 파라미터 업데이트
  const updateParam = (formulaId: SolverFormula, key: string, value: string) => {
    setParams(prev => ({
      ...prev,
      [formulaId]: {
        ...(prev[formulaId] || {}),
        [key]: value
      }
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <style>{hideSpinnerStyle}</style>

      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 relative z-20 cursor-grab active:cursor-grabbing"
        style={{ background: '#14b8a615', borderBottom: '1px solid #14b8a640' }}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest('button') && onDragStart) {
            onDragStart(e);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#14b8a6' }}>
            <Target className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold" style={{ color: '#14b8a6' }}>목표 역산</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1 rounded-lg transition-colors ${showHelp ? 'bg-[#14b8a6]/20' : 'hover:bg-[var(--bg-hover)]'}`}
            style={{ border: showHelp ? '1px solid #14b8a6' : '1px solid var(--border-secondary)' }}
          >
            <HelpCircle className="w-4 h-4" style={{ color: showHelp ? '#14b8a6' : 'var(--text-tertiary)' }} />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 도움말 패널 */}
      {showHelp && (
        <div className="shrink-0 animate-slideDown flex flex-col" style={{ height: `${helpHeight + 6}px`, minHeight: '66px', maxHeight: '306px', borderBottom: '1px solid var(--border-primary)' }}>
          <div
            className="flex-1 px-4 py-3 text-sm overflow-y-auto"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>목표 역산 (역방향 계산기)</div>
            <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>원하는 결과값에서 <strong>필요한 입력값을 역으로 계산</strong>합니다.</p>
            <div className="space-y-1 mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div>예: "3초 처치 → 필요 DPS?"</div>
              <div>예: "50% 피해감소 → 필요 방어력?"</div>
              <div>예: "목표 DPS → 필요 공격력?"</div>
            </div>
            <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
              <strong>vs 수식 도우미:</strong> 수식은 순방향(입력→결과), 역산은 역방향(결과→입력)
            </div>
          </div>
          {/* 리사이저 */}
          <div
            className="h-1.5 shrink-0 cursor-ns-resize hover:bg-[var(--accent)] transition-colors"
            style={{ background: 'var(--border-secondary)' }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startH = helpHeight;
              const onMouseMove = (moveEvent: MouseEvent) => {
                const newHeight = Math.max(60, Math.min(300, startH + moveEvent.clientY - startY));
                setHelpHeight(newHeight);
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />
        </div>
      )}

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          역산 유형 선택
        </label>

        {SOLVER_FORMULAS.map(formula => {
          const isExpanded = expandedFormulas.has(formula.id);
          const formulaParams = params[formula.id] || {};
          const targetValue = targetValues[formula.id] || '';
          const result = results[formula.id];

          return (
            <div key={formula.id} className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              {/* 헤더 (클릭 가능) */}
              <button
                onClick={() => handleToggleFormula(formula.id)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                  isExpanded ? 'border-b' : ''
                }`}
                style={{
                  background: isExpanded ? 'var(--accent-light)' : 'transparent',
                  borderColor: 'var(--border-primary)'
                }}
              >
                <Calculator className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {formula.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {formula.description}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </button>

              {/* 확장된 입력 폼 */}
              {isExpanded && (
                <div className="p-4 space-y-4" style={{ background: 'var(--bg-secondary)' }}>
                  {/* 목표값 입력 */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {formula.targetLabel} {formula.targetUnit && `(${formula.targetUnit})`}
                    </label>
                    <input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValues(prev => ({ ...prev, [formula.id]: e.target.value }))}
                      placeholder="목표값 입력"
                      className="hide-spinner w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  {/* 파라미터 입력 */}
                  {formula.params.map(param => (
                    <div key={param.key}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {param.label} {param.unit && `(${param.unit})`}
                      </label>
                      <input
                        type="number"
                        value={formulaParams[param.key] || ''}
                        onChange={(e) => updateParam(formula.id, param.key, e.target.value)}
                        placeholder={String(param.defaultValue)}
                        className="hide-spinner w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  ))}

                  {/* 계산 버튼 */}
                  <button
                    onClick={() => handleCalculate(formula.id)}
                    disabled={!targetValue}
                    className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    style={{
                      background: 'var(--accent)',
                      color: 'white'
                    }}
                  >
                    <Calculator className="w-4 h-4" />
                    계산하기
                  </button>

                  {/* 결과 표시 - 더 세련된 카드 스타일 */}
                  {result && (
                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${result.success ? 'rgba(20, 184, 166, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                      {result.success && result.value !== undefined ? (
                        <>
                          {/* 결과 헤더 */}
                          <div
                            className="px-4 py-3 flex items-center justify-between"
                            style={{ background: 'rgba(20, 184, 166, 0.08)' }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#14b8a6' }}>
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="text-sm font-semibold" style={{ color: '#14b8a6' }}>계산 완료</span>
                            </div>
                            <button
                              onClick={() => handleCopy(formula.id, result.value!)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                              style={{
                                background: copied === formula.id ? '#14b8a6' : 'var(--bg-primary)',
                                color: copied === formula.id ? 'white' : 'var(--text-secondary)',
                                border: '1px solid var(--border-primary)'
                              }}
                            >
                              {copied === formula.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copied === formula.id ? '복사됨!' : '복사'}
                            </button>
                          </div>

                          {/* 결과값 */}
                          <div className="p-5 text-center" style={{ background: 'var(--bg-primary)' }}>
                            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                              필요한 값
                            </div>
                            <div
                              className="text-4xl font-bold tracking-tight mb-1"
                              style={{ color: '#14b8a6' }}
                            >
                              {typeof result.value === 'number'
                                ? result.value.toLocaleString(undefined, { maximumFractionDigits: 3 })
                                : result.value}
                            </div>
                          </div>

                          {/* 설명 */}
                          <div className="px-4 py-3 space-y-3" style={{ background: 'var(--bg-tertiary)' }}>
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--bg-primary)' }}>
                                <span className="text-xs">📝</span>
                              </div>
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {result.explanation}
                              </p>
                            </div>
                            <div className="px-3 py-2 rounded-lg font-mono text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
                              {result.formula}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                            <AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: '#dc2626' }}>계산 실패</div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {result.explanation}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 경고 메시지 */}
                      {result.warnings && result.warnings.length > 0 && (
                        <div className="px-4 py-3 space-y-2" style={{ background: 'rgba(251, 191, 36, 0.06)', borderTop: '1px solid rgba(251, 191, 36, 0.2)' }}>
                          {result.warnings.map((warning, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#d97706' }} />
                              <span style={{ color: '#92400e' }}>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
