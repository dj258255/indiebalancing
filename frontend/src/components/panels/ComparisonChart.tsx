'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { X, Trash2, Download, Check, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ComparisonChartProps {
  onClose: () => void;
  isPanel?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
}

interface ComparisonItem {
  id: string;
  name: string;
  color: string;
  values: Record<string, number>;
}

const COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
];

export default function ComparisonChart({ onClose, isPanel = false, onDragStart }: ComparisonChartProps) {
  const { getCurrentProject, getCurrentSheet, selectedRows, clearSelectedRows, deselectRow } = useProjectStore();
  const currentProject = getCurrentProject();
  const currentSheet = getCurrentSheet();

  const [activeTab, setActiveTab] = useState<'radar' | 'bar' | 'histogram'>('radar');
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [helpHeight, setHelpHeight] = useState(120);

  // 숫자 컬럼만 필터링 (general 타입도 숫자일 수 있음)
  const numericColumns = useMemo(() => {
    if (!currentSheet) return [];
    // general과 formula 타입 모두 숫자 데이터를 가질 수 있음
    return currentSheet.columns.filter(
      (col) => col.type === 'general' || col.type === 'formula'
    );
  }, [currentSheet]);

  // 행 데이터 (비교 대상)
  const availableRows = useMemo(() => {
    if (!currentSheet) return [];
    return currentSheet.rows.map((row, index) => {
      // 이름으로 사용할 컬럼 찾기 (우선순위 순)
      const namePatterns = ['이름', 'name', 'Name', '캐릭터', '캐릭터명', '유닛', '아이템', '무기', '스킬'];
      const idPatterns = ['ID', 'id', 'Id'];

      let nameCol = currentSheet.columns.find((c) => namePatterns.includes(c.name));

      // 이름 컬럼이 없으면 첫 번째 일반 컬럼 사용
      if (!nameCol) {
        nameCol = currentSheet.columns.find((c) => c.type === 'general');
      }

      const idCol = currentSheet.columns.find((c) => idPatterns.includes(c.name));

      let name = '';
      if (nameCol && row.cells[nameCol.id]) {
        // 이름이 있으면 시트명 + 행 번호 + 이름
        name = `${currentSheet.name} - ${index + 1}행 (${row.cells[nameCol.id]})`;
      } else if (idCol && row.cells[idCol.id]) {
        // ID만 있으면 시트명 + 행 번호 + ID
        name = `${currentSheet.name} - ${index + 1}행 (${row.cells[idCol.id]})`;
      } else {
        // 아무것도 없으면 "시트명 - N행" 형식
        name = `${currentSheet.name} - ${index + 1}행`;
      }

      return { id: row.id, name, cells: row.cells };
    });
  }, [currentSheet]);

  // 아이템 추가
  const addItem = (rowId: string) => {
    const row = availableRows.find((r) => r.id === rowId);
    if (!row || items.find((i) => i.id === rowId)) return;

    const values: Record<string, number> = {};
    numericColumns.forEach((col) => {
      const val = row.cells[col.id];
      values[col.name] = typeof val === 'number' ? val : 0;
    });

    setItems([
      ...items,
      {
        id: row.id,
        name: row.name,
        color: COLORS[items.length % COLORS.length],
        values,
      },
    ]);
  };

  // 아이템 제거
  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  // 컬럼 토글
  const toggleColumn = (colName: string) => {
    if (selectedColumns.includes(colName)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== colName));
    } else {
      setSelectedColumns([...selectedColumns, colName]);
    }
  };

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (items.length === 0 || selectedColumns.length === 0) return [];

    const maxValues: Record<string, number> = {};
    selectedColumns.forEach((col) => {
      maxValues[col] = Math.max(...items.map((i) => i.values[col] || 0), 1);
    });

    return selectedColumns.map((col) => {
      const point: Record<string, number | string> = { stat: col };
      items.forEach((item) => {
        point[item.name] = ((item.values[col] || 0) / maxValues[col]) * 100;
        point[`${item.name}_raw`] = item.values[col] || 0;
      });
      return point;
    });
  }, [items, selectedColumns]);

  // 바 차트 데이터
  const barData = useMemo(() => {
    if (items.length === 0 || selectedColumns.length === 0) return [];

    return selectedColumns.map((col) => {
      const point: Record<string, number | string> = { stat: col };
      items.forEach((item) => {
        point[item.name] = item.values[col] || 0;
      });
      return point;
    });
  }, [items, selectedColumns]);

  // 히스토그램 데이터
  const [histogramColumn, setHistogramColumn] = useState<string>('');
  const histogramData = useMemo(() => {
    if (!currentSheet || !histogramColumn) return [];

    const col = currentSheet.columns.find((c) => c.name === histogramColumn);
    if (!col) return [];

    const values = currentSheet.rows
      .map((row) => row.cells[col.id])
      .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 10;
    const binSize = (max - min) / binCount || 1;

    const bins: { range: string; count: number; min: number; max: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binSize;
      const binMax = min + (i + 1) * binSize;
      bins.push({
        range: `${binMin.toFixed(0)}-${binMax.toFixed(0)}`,
        min: binMin,
        max: binMax,
        count: 0,
      });
    }

    values.forEach((v) => {
      const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1);
      if (bins[binIndex]) {
        bins[binIndex].count++;
      }
    });

    return bins;
  }, [currentSheet, histogramColumn]);

  if (!currentProject || !currentSheet) {
    return (
      <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
        <div className="card p-8 text-center animate-fadeIn">
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>시트를 선택해주세요</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  // 공통 wrapper 클래스
  const wrapperClass = isPanel
    ? "flex flex-col h-full"
    : "fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4";

  const cardClass = isPanel
    ? "flex flex-col h-full"
    : "card w-full max-w-5xl max-h-[90vh] flex flex-col animate-fadeIn";

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        {/* 헤더 */}
        <div
          className={`flex items-center justify-between shrink-0 ${isPanel ? 'px-4 py-3 relative z-20 cursor-grab active:cursor-grabbing' : 'px-6 py-4 border-b'}`}
          style={{ background: isPanel ? '#3b82f615' : undefined, borderColor: isPanel ? '#3b82f640' : 'var(--border-primary)', borderBottom: isPanel ? '1px solid #3b82f640' : undefined }}
          onMouseDown={(e) => {
            if (isPanel && !(e.target as HTMLElement).closest('button') && onDragStart) {
              onDragStart(e);
            }
          }}
        >
          <div className="flex items-center gap-2">
            {isPanel && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#3b82f6' }}>
                <div className="w-4 h-4 rounded-full bg-white/30" />
              </div>
            )}
            <div>
              <h2 className={isPanel ? 'text-sm font-semibold' : 'text-xl font-semibold'} style={{ color: isPanel ? '#3b82f6' : 'var(--text-primary)' }}>
                {isPanel ? '비교 분석' : '데이터 비교 및 분석'}
              </h2>
              {!isPanel && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {currentSheet.name} 시트의 데이터를 시각화합니다
                </p>
              )}
            </div>
            {isPanel && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`p-1 rounded-lg transition-colors ${showHelp ? 'bg-[#3b82f6]/20' : 'hover:bg-[var(--bg-hover)]'}`}
                style={{ border: showHelp ? '1px solid #3b82f6' : '1px solid var(--border-secondary)' }}
              >
                <HelpCircle className="w-4 h-4" style={{ color: showHelp ? '#3b82f6' : 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isPanel && (
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{
                  background: showHelp ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: showHelp ? 'var(--accent-text)' : 'var(--text-secondary)'
                }}
              >
                <HelpCircle className="w-4 h-4" />
                도움말
                {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            <button
              onClick={onClose}
              className={`rounded-lg transition-colors ${isPanel ? 'p-1.5 hover:bg-black/5 dark:hover:bg-white/5' : 'p-2'}`}
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className={isPanel ? 'w-4 h-4' : 'w-5 h-5'} />
            </button>
          </div>
        </div>

        {/* 패널 모드 도움말 - 탭 위에 표시 */}
        {isPanel && showHelp && (
          <div className="shrink-0 animate-slideDown flex flex-col" style={{ height: `${helpHeight + 6}px`, minHeight: '66px', maxHeight: '306px', borderBottom: '1px solid var(--border-primary)' }}>
            <div
              className="flex-1 px-4 py-3 text-sm overflow-y-auto"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>비교 분석</div>
              <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>캐릭터, 무기, 아이템의 <strong>스탯을 시각적으로 비교</strong>합니다.</p>
              <div className="space-y-1 mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div>레이더: 종합 스탯 비교</div>
                <div>막대: 정확한 수치 비교</div>
                <div>히스토그램: 데이터 분포 확인</div>
              </div>
              <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                시트에서 행 선택 → 모두 추가 → 비교할 열 체크
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

        {/* 모달 모드 도움말 */}
        {!isPanel && showHelp && (
          <div className="px-6 py-4 border-b animate-fadeIn" style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)'
          }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              캐릭터, 무기, 아이템의 스탯을 한눈에 비교하여 밸런스 문제를 발견할 수 있습니다.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--accent)' }}>레이더 차트</div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>여러 스탯을 종합 비교할 때</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--success)' }}>막대 차트</div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>정확한 수치 비교할 때</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--warning)' }}>히스토그램</div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>데이터 분포 확인할 때</p>
              </div>
            </div>

            <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
              사용법: 시트에서 행 선택 → &quot;모두 추가&quot; 클릭 → 비교할 열 체크 → 차트 확인
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex border-b px-4" style={{ borderColor: 'var(--border-primary)' }}>
          {['radar', 'bar', 'histogram'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={cn(
                'px-4 py-3 border-b-2 transition-colors text-sm font-medium',
                activeTab === tab ? 'border-current' : 'border-transparent'
              )}
              style={{
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-tertiary)'
              }}
            >
              {tab === 'radar' && '레이더 차트'}
              {tab === 'bar' && '막대 차트'}
              {tab === 'histogram' && '분포 히스토그램'}
            </button>
          ))}
        </div>

        {/* 시트에서 선택된 데이터 불러오기 */}
        {selectedRows.length > 0 && (activeTab === 'radar' || activeTab === 'bar') && (
          <div className="px-6 py-3 border-b" style={{
            background: 'var(--accent-light)',
            borderColor: 'var(--border-primary)'
          }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-text)' }}>
                <Download className="w-4 h-4" />
                <span className="font-medium">선택된 데이터 ({selectedRows.length}개)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    selectedRows.forEach((row, index) => {
                      if (!items.find((i) => i.id === row.rowId)) {
                        const values: Record<string, number> = {};
                        Object.entries(row.values).forEach(([key, val]) => {
                          if (typeof val === 'number') {
                            values[key] = val;
                          } else {
                            const num = parseFloat(String(val));
                            if (!isNaN(num)) values[key] = num;
                          }
                        });
                        const rowIdx = currentSheet?.rows.findIndex(r => r.id === row.rowId) ?? -1;
                        const itemName = `${currentSheet?.name || '시트'} - ${rowIdx + 1}행`;
                        setItems((prev) => [
                          ...prev,
                          {
                            id: row.rowId,
                            name: itemName,
                            color: COLORS[(prev.length + index) % COLORS.length],
                            values,
                          },
                        ]);
                      }
                    });
                    const numCols = Object.keys(selectedRows[0]?.values || {}).filter((k) => {
                      const val = selectedRows[0]?.values[k];
                      return typeof val === 'number' || !isNaN(parseFloat(String(val)));
                    });
                    if (selectedColumns.length === 0 && numCols.length > 0) {
                      setSelectedColumns(numCols.slice(0, 6));
                    }
                  }}
                  className="px-3 py-1 rounded text-xs transition-colors"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  모두 추가
                </button>
                <button
                  onClick={clearSelectedRows}
                  className="text-xs"
                  style={{ color: 'var(--accent-text)' }}
                >
                  선택 해제
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRows.map((row) => {
                const isAdded = items.some((i) => i.id === row.rowId);
                // 시트명 + 행 번호로 표시
                const rowIndex = currentSheet?.rows.findIndex(r => r.id === row.rowId) ?? -1;
                const displayName = `${currentSheet?.name || '시트'} - ${rowIndex + 1}행`;
                return (
                  <div
                    key={row.rowId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                    style={{
                      background: isAdded ? 'var(--success-light)' : 'var(--bg-primary)',
                      borderColor: 'var(--border-primary)'
                    }}
                  >
                    {isAdded && <Check className="w-3 h-3" style={{ color: 'var(--success)' }} />}
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{displayName}</span>
                    {!isAdded && (
                      <button
                        onClick={() => {
                          const values: Record<string, number> = {};
                          Object.entries(row.values).forEach(([key, val]) => {
                            if (typeof val === 'number') {
                              values[key] = val;
                            } else {
                              const num = parseFloat(String(val));
                              if (!isNaN(num)) values[key] = num;
                            }
                          });
                          setItems((prev) => [
                            ...prev,
                            {
                              id: row.rowId,
                              name: displayName,
                              color: COLORS[prev.length % COLORS.length],
                              values,
                            },
                          ]);
                        }}
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ background: 'var(--accent)', color: 'white' }}
                      >
                        추가
                      </button>
                    )}
                    <button
                      onClick={() => deselectRow(row.rowId)}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex">
          {/* 사이드바 - 레이더/바 차트용 */}
          {(activeTab === 'radar' || activeTab === 'bar') && (
            <div className="w-64 border-r p-4 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
              {/* 비교 대상 선택 */}
              <div className="mb-6">
                <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>비교 대상</h4>
                <select
                  onChange={(e) => addItem(e.target.value)}
                  value=""
                  className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                >
                  <option value="">+ 추가...</option>
                  {availableRows
                    .filter((r) => !items.find((i) => i.id === r.id))
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </select>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded transition-colors hover:text-red-500"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 비교 항목 (컬럼) 선택 */}
              <div>
                <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>비교 항목</h4>
                <div className="space-y-1.5">
                  {numericColumns.map((col) => {
                    const isChecked = selectedColumns.includes(col.name);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2.5 text-sm cursor-pointer py-1 px-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <div
                          className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                          style={{
                            background: isChecked ? 'var(--accent)' : 'var(--bg-primary)',
                            borderColor: isChecked ? 'var(--accent)' : 'var(--border-secondary)',
                          }}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColumn(col.name)}
                          className="sr-only"
                        />
                        <span>{col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 히스토그램 사이드바 */}
          {activeTab === 'histogram' && (
            <div className="w-64 border-r p-4 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
              <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>분석할 열</h4>
              <select
                value={histogramColumn}
                onChange={(e) => setHistogramColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
              >
                <option value="">선택...</option>
                {numericColumns.map((col) => (
                  <option key={col.id} value={col.name}>
                    {col.name}
                  </option>
                ))}
              </select>

              {histogramColumn && histogramData.length > 0 && (
                <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>통계</div>
                  <div className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <div>총 개수: {currentSheet.rows.length}</div>
                    <div>최소: {Math.min(...histogramData.map((d) => d.min)).toFixed(0)}</div>
                    <div>최대: {Math.max(...histogramData.map((d) => d.max)).toFixed(0)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 차트 영역 */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'radar' && (
              <>
                {items.length === 0 || selectedColumns.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                      <p>왼쪽에서 비교할 대상과 항목을 선택하세요</p>
                      <p className="text-sm mt-1">최소 1개 대상, 3개 이상 항목 권장</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border-primary)" />
                        <PolarAngleAxis dataKey="stat" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                        {items.map((item) => (
                          <Radar
                            key={item.id}
                            name={item.name}
                            dataKey={item.name}
                            stroke={item.color}
                            fill={item.color}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend />
                        <Tooltip formatter={(value: number) => [`${value.toFixed(0)}%`]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {activeTab === 'bar' && (
              <>
                {items.length === 0 || selectedColumns.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                      <p>왼쪽에서 비교할 대상과 항목을 선택하세요</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                        <XAxis dataKey="stat" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }} />
                        <Legend />
                        {items.map((item) => (
                          <Bar key={item.id} dataKey={item.name} fill={item.color} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {activeTab === 'histogram' && (
              <>
                {!histogramColumn ? (
                  <div className="h-full flex items-center justify-center">
                    <p style={{ color: 'var(--text-tertiary)' }}>왼쪽에서 분석할 열을 선택하세요</p>
                  </div>
                ) : histogramData.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p style={{ color: 'var(--text-tertiary)' }}>숫자 데이터가 없습니다</p>
                  </div>
                ) : (
                  <div className="h-[500px]">
                    <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>{histogramColumn} 분포</h3>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={histogramData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} label={{ value: '개수', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                        <Tooltip
                          formatter={(value: number) => [`${value}개`, '개수']}
                          labelFormatter={(label) => `구간: ${label}`}
                          contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
                        />
                        <Bar dataKey="count" fill="var(--accent)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
