'use client';

import { useState, useMemo } from 'react';
import { X, GitCompare, ArrowRight, Plus, Minus, Edit3, ChevronDown, ChevronUp, Download, Camera, HelpCircle } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { compareSheets, createSnapshot, getChangeColor, formatDiff, type ComparisonResult } from '@/lib/presetComparison';
import type { Sheet } from '@/types';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface PresetComparisonModalProps {
  onClose: () => void;
  isPanel?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
}

export default function PresetComparisonModal({ onClose, isPanel = false, onDragStart }: PresetComparisonModalProps) {
  // ESC 키로 모달 닫기
  useEscapeKey(onClose);

  const { projects, currentProjectId } = useProjectStore();

  const currentProject = projects.find(p => p.id === currentProjectId);
  const sheets = currentProject?.sheets || [];

  // 상태
  const [oldSheetId, setOldSheetId] = useState<string>('');
  const [newSheetId, setNewSheetId] = useState<string>('');
  const [snapshots, setSnapshots] = useState<Sheet[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const [helpHeight, setHelpHeight] = useState(100);

  // 비교 가능한 소스 목록 (시트 + 스냅샷)
  const sources = useMemo(() => [
    ...sheets.map(s => ({ id: s.id, name: s.name, type: 'sheet' as const, data: s })),
    ...snapshots.map(s => ({ id: s.id, name: s.name, type: 'snapshot' as const, data: s })),
  ], [sheets, snapshots]);

  // 스냅샷 생성
  const handleCreateSnapshot = (sheetId: string) => {
    const sheet = sheets.find(s => s.id === sheetId);
    if (sheet) {
      const snapshot = createSnapshot(sheet);
      setSnapshots(prev => [...prev, snapshot]);
    }
  };

  // 비교 실행
  const handleCompare = () => {
    const oldSource = sources.find(s => s.id === oldSheetId);
    const newSource = sources.find(s => s.id === newSheetId);

    if (!oldSource || !newSource) return;

    // 이름 컬럼 찾기: '이름', 'name' 또는 두 번째 컬럼
    const columns = oldSource.data.columns;
    const nameColumnId = columns.find(c =>
      c.name.toLowerCase() === 'name' ||
      c.name === '이름' ||
      c.name.toLowerCase().includes('name') ||
      c.name.includes('이름')
    )?.id || (columns.length >= 2 ? columns[1].id : columns[0]?.id);

    const comparisonResult = compareSheets(oldSource.data, newSource.data, { nameColumnId });
    setResult(comparisonResult);
  };

  // 행 확장/축소 토글
  const toggleRow = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // 결과 내보내기
  const handleExport = () => {
    if (!result) return;

    const data = {
      summary: result.summary,
      columnStats: result.columnStats.map(cs => ({
        column: cs.columnName,
        oldAvg: cs.oldStats.avg.toFixed(2),
        newAvg: cs.newStats.avg.toFixed(2),
        change: formatDiff(cs.avgDiff, cs.avgDiffPercent),
      })),
      changes: result.rowChanges
        .filter(r => r.type !== 'unchanged')
        .map(r => ({
          row: r.rowName,
          type: r.type,
          cells: r.cellChanges
            .filter(c => c.diff !== null || c.oldValue !== c.newValue)
            .map(c => ({
              column: c.columnName,
              old: c.oldValue,
              new: c.newValue,
              change: formatDiff(c.diff, c.diffPercent),
            })),
        })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 공통 wrapper 클래스
  const wrapperClass = isPanel
    ? "flex flex-col h-full"
    : "fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4";

  const cardClass = isPanel
    ? "flex flex-col h-full overflow-hidden"
    : "card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn";

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        {/* 헤더 */}
        <div
          className={`flex items-center justify-between shrink-0 relative z-20 ${isPanel ? 'px-4 py-3 cursor-grab active:cursor-grabbing' : 'px-6 py-4 border-b'}`}
          style={{ background: isPanel ? '#f9731615' : undefined, borderColor: isPanel ? '#f9731640' : 'var(--border-primary)', borderBottom: isPanel ? '1px solid #f9731640' : undefined }}
          onMouseDown={(e) => {
            if (isPanel && !(e.target as HTMLElement).closest('button') && onDragStart) {
              onDragStart(e);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg flex items-center justify-center ${isPanel ? 'w-8 h-8' : 'w-10 h-10'}`} style={{ background: isPanel ? '#f97316' : 'var(--accent-light)' }}>
              <GitCompare className={`${isPanel ? 'w-4 h-4' : 'w-5 h-5'} ${isPanel ? 'text-white' : ''}`} style={{ color: isPanel ? 'white' : 'var(--accent)' }} />
            </div>
            <div>
              <h2 className={isPanel ? 'text-sm font-semibold' : 'text-lg font-semibold'} style={{ color: isPanel ? '#f97316' : 'var(--text-primary)' }}>프리셋 비교</h2>
              {!isPanel && <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>두 시트 또는 스냅샷의 차이를 분석합니다</p>}
            </div>
            {isPanel && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`p-1 rounded-lg transition-colors ${showHelp ? 'bg-[#f97316]/20' : 'hover:bg-[var(--bg-hover)]'}`}
                style={{ border: showHelp ? '1px solid #f97316' : '1px solid var(--border-secondary)' }}
              >
                <HelpCircle className="w-4 h-4" style={{ color: showHelp ? '#f97316' : 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${isPanel ? 'p-1.5' : 'p-2'}`}
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className={isPanel ? 'w-4 h-4' : 'w-5 h-5'} />
          </button>
        </div>

        {/* 도움말 패널 */}
        {isPanel && showHelp && (
          <div className="shrink-0 animate-slideDown flex flex-col" style={{ height: `${helpHeight + 6}px`, minHeight: '66px', maxHeight: '256px', borderBottom: '1px solid #f9731630' }}>
            <div
              className="flex-1 px-4 py-3 overflow-y-auto"
              style={{ background: '#f9731608' }}
            >
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                두 시트 또는 스냅샷의 <strong style={{ color: '#f97316' }}>차이를 비교</strong>합니다.
              </p>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <div>- <strong>스냅샷:</strong> 현재 상태 저장</div>
                <div>- <strong>비교:</strong> 변경된 값, 추가/삭제 확인</div>
                <div>- <strong>내보내기:</strong> JSON으로 결과 저장</div>
              </div>
              <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: '#f9731630', color: 'var(--text-tertiary)' }}>
                <strong>활용:</strong> 밸런스 패치 전후 비교, A/B 테스트
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
                  const newHeight = Math.max(60, Math.min(250, startH + moveEvent.clientY - startY));
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* 비교 대상 선택 - 반응형 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                이전 (Before)
              </label>
              <div className="flex gap-2">
                <select
                  value={oldSheetId}
                  onChange={(e) => setOldSheetId(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm truncate"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">선택...</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.type === 'snapshot' ? '스냅샷' : '시트'}] {s.name}
                    </option>
                  ))}
                </select>
                {oldSheetId && sources.find(s => s.id === oldSheetId)?.type === 'sheet' && (
                  <button
                    onClick={() => handleCreateSnapshot(oldSheetId)}
                    className="px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors shrink-0"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)'
                    }}
                    title="스냅샷 생성"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <ArrowRight className="w-5 h-5 hidden sm:block shrink-0" style={{ color: 'var(--text-tertiary)' }} />

            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                이후 (After)
              </label>
              <div className="flex gap-2">
                <select
                  value={newSheetId}
                  onChange={(e) => setNewSheetId(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm truncate"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">선택...</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.type === 'snapshot' ? '스냅샷' : '시트'}] {s.name}
                    </option>
                  ))}
                </select>
                {newSheetId && sources.find(s => s.id === newSheetId)?.type === 'sheet' && (
                  <button
                    onClick={() => handleCreateSnapshot(newSheetId)}
                    className="px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors shrink-0"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-secondary)'
                    }}
                    title="스냅샷 생성"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 비교 버튼 */}
          <button
            onClick={handleCompare}
            disabled={!oldSheetId || !newSheetId || oldSheetId === newSheetId}
            className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: 'white'
            }}
          >
            <GitCompare className="w-4 h-4" />
            비교 실행
          </button>

          {/* 결과 표시 */}
          {result && (
            <div className="space-y-5">
              {/* 요약 - 반응형 그리드 */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>변경 요약</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  <div className="p-3 sm:p-4 text-center border-r border-b sm:border-b-0" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="text-xl sm:text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {result.summary.totalRows}
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>전체 행</div>
                  </div>
                  <div className="p-3 sm:p-4 text-center border-b sm:border-b-0 sm:border-r" style={{ background: 'rgba(251, 191, 36, 0.05)', borderColor: 'var(--border-primary)' }}>
                    <div className="text-xl sm:text-2xl font-bold mb-1 flex items-center justify-center gap-1.5" style={{ color: '#d97706' }}>
                      <Edit3 className="w-4 h-4" />
                      {result.summary.changedRows}
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>수정됨</div>
                  </div>
                  <div className="p-3 sm:p-4 text-center border-r" style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'var(--border-primary)' }}>
                    <div className="text-xl sm:text-2xl font-bold mb-1 flex items-center justify-center gap-1.5" style={{ color: '#16a34a' }}>
                      <Plus className="w-4 h-4" />
                      {result.summary.addedRows}
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>추가됨</div>
                  </div>
                  <div className="p-3 sm:p-4 text-center" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <div className="text-xl sm:text-2xl font-bold mb-1 flex items-center justify-center gap-1.5" style={{ color: '#dc2626' }}>
                      <Minus className="w-4 h-4" />
                      {result.summary.removedRows}
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>삭제됨</div>
                  </div>
                </div>
              </div>

              {/* 컬럼별 통계 변화 - 더 세련된 바 차트 스타일 */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>컬럼별 평균 변화</div>
                </div>
                <div className="p-4 space-y-3">
                  {result.columnStats
                    .filter(cs => cs.oldStats.count > 0 || cs.newStats.count > 0)
                    .slice(0, 10)
                    .map(cs => {
                      const isPositive = cs.avgDiff >= 0;
                      const barColor = isPositive ? '#4ade80' : '#f87171';
                      const textColor = isPositive ? '#16a34a' : '#dc2626';
                      const bgColor = isPositive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)';

                      return (
                        <div key={cs.columnId} className="group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                              {cs.columnName}
                            </span>
                            <span className="text-sm font-mono font-semibold" style={{ color: cs.avgDiff !== 0 ? textColor : 'var(--text-tertiary)' }}>
                              {formatDiff(cs.avgDiff, cs.avgDiffPercent)}
                            </span>
                          </div>
                          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(2, Math.min(100, Math.abs(cs.avgDiffPercent)))}%`,
                                background: cs.avgDiff !== 0 ? `linear-gradient(90deg, ${barColor}, ${barColor}dd)` : 'var(--border-secondary)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {result.columnStats.filter(cs => cs.oldStats.count > 0 || cs.newStats.count > 0).length === 0 && (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      숫자 컬럼이 없습니다
                    </div>
                  )}
                </div>
              </div>

              {/* 행별 변경 사항 - 더 깔끔한 아코디언 스타일 */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>상세 변경 사항</div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                    <div
                      className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: showUnchanged ? 'var(--accent)' : 'var(--border-secondary)',
                        background: showUnchanged ? 'var(--accent)' : 'transparent',
                      }}
                      onClick={() => setShowUnchanged(!showUnchanged)}
                    >
                      {showUnchanged && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span onClick={() => setShowUnchanged(!showUnchanged)}>변경되지 않은 행 표시</span>
                  </label>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                  {result.rowChanges
                    .filter(r => showUnchanged || r.type !== 'unchanged')
                    .map(row => {
                      const typeConfig = {
                        added: { icon: Plus, color: '#16a34a', bg: 'rgba(34, 197, 94, 0.06)', label: '추가' },
                        removed: { icon: Minus, color: '#dc2626', bg: 'rgba(239, 68, 68, 0.06)', label: '삭제' },
                        modified: { icon: Edit3, color: '#d97706', bg: 'rgba(251, 191, 36, 0.06)', label: '수정' },
                        unchanged: { icon: null, color: 'var(--text-tertiary)', bg: 'transparent', label: '' },
                      };
                      const config = typeConfig[row.type];
                      const IconComponent = config.icon;

                      return (
                        <div key={row.rowId} style={{ background: config.bg }}>
                          <button
                            onClick={() => row.type !== 'unchanged' && toggleRow(row.rowId)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            disabled={row.type === 'unchanged'}
                          >
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: row.type !== 'unchanged' ? `${config.color}18` : 'transparent' }}>
                              {IconComponent && <IconComponent className="w-3.5 h-3.5" style={{ color: config.color }} />}
                            </span>
                            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {row.rowName}
                            </span>
                            {row.type === 'modified' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${config.color}15`, color: config.color }}>
                                {row.cellChanges.filter(c => c.diff !== null || String(c.oldValue) !== String(c.newValue)).length}개 변경
                              </span>
                            )}
                            {row.type !== 'unchanged' && (
                              <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
                                {expandedRows.has(row.rowId)
                                  ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                  : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                }
                              </span>
                            )}
                          </button>

                          {/* 확장된 셀 변경 사항 - 반응형 테이블 스타일 */}
                          {expandedRows.has(row.rowId) && (
                            <div className="px-4 pb-4 pt-1">
                              <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                                {row.cellChanges
                                  .filter(c => c.diff !== null || String(c.oldValue) !== String(c.newValue))
                                  .map((cell, idx, arr) => (
                                    <div
                                      key={cell.columnId}
                                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 px-3 py-2.5 text-sm"
                                      style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border-primary)' : 'none' }}
                                    >
                                      <span className="w-full sm:w-20 font-medium truncate shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                        {cell.columnName}
                                      </span>
                                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 min-w-0">
                                        <span className="px-2 py-0.5 rounded text-xs font-mono truncate max-w-[80px] sm:max-w-none" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
                                          {String(cell.oldValue ?? '-')}
                                        </span>
                                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                                        <span className="px-2 py-0.5 rounded text-xs font-mono truncate max-w-[80px] sm:max-w-none" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>
                                          {String(cell.newValue ?? '-')}
                                        </span>
                                        {cell.diff !== null && (
                                          <span className="text-xs font-mono font-semibold shrink-0 ml-auto" style={{
                                            color: cell.diff >= 0 ? '#16a34a' : '#dc2626'
                                          }}>
                                            {formatDiff(cell.diff, cell.diffPercent)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {result.rowChanges.filter(r => showUnchanged || r.type !== 'unchanged').length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
                        <Edit3 className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        변경 사항이 없습니다
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 시트가 없을 때 */}
          {sheets.length === 0 && (
            <div className="text-center py-12">
              <GitCompare className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                프로젝트에 시트가 없습니다.<br />
                시트를 만들고 비교해보세요.
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        {result && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}
            >
              <Download className="w-4 h-4" />
              결과 내보내기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
