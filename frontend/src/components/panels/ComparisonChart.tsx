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
import { X, Trash2, Download, Check, HelpCircle, ChevronDown, ChevronUp, PieChart } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ComparisonChartProps {
  onClose: () => void;
  isPanel?: boolean;
  showHelp?: boolean;
  setShowHelp?: (value: boolean) => void;
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

export default function ComparisonChart({ onClose, isPanel = false, showHelp = false, setShowHelp }: ComparisonChartProps) {
  const { getCurrentProject, getCurrentSheet, selectedRows, clearSelectedRows, deselectRow } = useProjectStore();
  const currentProject = getCurrentProject();
  const currentSheet = getCurrentSheet();
  const t = useTranslations('comparisonChart');

  const [activeTab, setActiveTab] = useState<'radar' | 'bar' | 'histogram'>('radar');
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

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

  // 중복 제거된 선택된 컬럼
  const uniqueSelectedColumns = useMemo(() => {
    return [...new Set(selectedColumns)];
  }, [selectedColumns]);

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (items.length === 0 || uniqueSelectedColumns.length === 0) return [];

    const maxValues: Record<string, number> = {};
    uniqueSelectedColumns.forEach((col) => {
      maxValues[col] = Math.max(...items.map((i) => i.values[col] || 0), 1);
    });

    return uniqueSelectedColumns.map((col, index) => {
      const point: Record<string, number | string> = { stat: col, _uniqueKey: `radar-${index}` };
      items.forEach((item) => {
        point[item.name] = ((item.values[col] || 0) / maxValues[col]) * 100;
        point[`${item.name}_raw`] = item.values[col] || 0;
      });
      return point;
    });
  }, [items, uniqueSelectedColumns]);

  // 바 차트 데이터
  const barData = useMemo(() => {
    if (items.length === 0 || uniqueSelectedColumns.length === 0) return [];

    return uniqueSelectedColumns.map((col, index) => {
      const point: Record<string, number | string> = { stat: col, _uniqueKey: `bar-${index}` };
      items.forEach((item) => {
        point[item.name] = item.values[col] || 0;
      });
      return point;
    });
  }, [items, uniqueSelectedColumns]);

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

  // 시트가 없을 때 표시할 빈 상태 컴포넌트
  const EmptyState = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="w-8 h-8 rounded-full" style={{ background: '#3b82f6', opacity: 0.5 }} />
        </div>
        <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('noSheetSelected')}</p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('selectSheetToCompare')}</p>
      </div>
    </div>
  );

  const hasSheet = currentProject && currentSheet;

  // 공통 wrapper 클래스
  const wrapperClass = isPanel
    ? "flex flex-col h-full"
    : "fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-4";

  const cardClass = isPanel
    ? "flex flex-col h-full"
    : "card w-full max-w-5xl max-h-[90vh] flex flex-col animate-fadeIn";

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        {/* 헤더 - 모달일 때만 표시 */}
        {!isPanel && (
          <div
            className="flex items-center justify-between shrink-0 px-6 py-4 border-b"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center gap-2">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t('fullTitle')}
                </h2>
                {hasSheet && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {t('visualizeData', { sheetName: currentSheet.name })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {setShowHelp && (
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    background: showHelp ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: showHelp ? 'var(--accent-text)' : 'var(--text-secondary)'
                  }}
                >
                  <HelpCircle className="w-4 h-4" />
                  {t('help')}
                  {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg transition-colors p-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}


        {/* 모달 모드 도움말 */}
        {!isPanel && showHelp && (
          <div className="px-6 py-4 border-b animate-fadeIn" style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)'
          }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              {t('modalHelpDesc')}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--accent)' }}>{t('tabs.radar')}</div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('radarUseCase')}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--success)' }}>{t('tabs.bar')}</div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('barUseCase')}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--warning)' }}>{t('tabs.histogram')}</div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('histogramUseCase')}</p>
              </div>
            </div>

            <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
              {t('usageGuide')}
            </div>
          </div>
        )}

        {/* 탭 - 시트가 있을 때만 표시 */}
        {hasSheet && (
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
                {tab === 'radar' && t('tabs.radar')}
                {tab === 'bar' && t('tabs.bar')}
                {tab === 'histogram' && t('tabs.histogram')}
              </button>
            ))}
          </div>
        )}

        {/* 시트에서 선택된 데이터 불러오기 */}
        {hasSheet && selectedRows.length > 0 && (activeTab === 'radar' || activeTab === 'bar') && (
          <div className="px-6 py-3 border-b" style={{
            background: 'var(--accent-light)',
            borderColor: 'var(--border-primary)'
          }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-text)' }}>
                <Download className="w-4 h-4" />
                <span className="font-medium">{t('selectedData', { count: selectedRows.length })}</span>
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
                        const itemName = `${currentSheet?.name || t('sheet')} - ${t('rowNum', { num: rowIdx + 1 })}`;
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
                  {t('addAll')}
                </button>
                <button
                  onClick={clearSelectedRows}
                  className="text-xs"
                  style={{ color: 'var(--accent-text)' }}
                >
                  {t('clearSelection')}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRows.map((row) => {
                const isAdded = items.some((i) => i.id === row.rowId);
                // 시트명 + 행 번호로 표시
                const rowIndex = currentSheet?.rows.findIndex(r => r.id === row.rowId) ?? -1;
                const displayName = `${currentSheet?.name || t('sheet')} - ${t('rowNum', { num: rowIndex + 1 })}`;
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
                        {t('add')}
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

        {/* 패널 모드 도움말 - 시트 유무와 관계없이 표시 */}
        {isPanel && showHelp && (
          <div className="mb-4 p-3 rounded-lg animate-slideDown mx-4 mt-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <div className="font-medium mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>{t('title')}</div>
            <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('helpDesc')}</p>
            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #3b82f6' }}>
                <span className="font-medium text-sm" style={{ color: '#3b82f6' }}>{t('radar')}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpRadar')}</p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #22c55e' }}>
                <span className="font-medium text-sm" style={{ color: '#22c55e' }}>{t('bar')}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpBar')}</p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-primary)', borderLeft: '3px solid #f59e0b' }}>
                <span className="font-medium text-sm" style={{ color: '#f59e0b' }}>{t('histogram')}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('helpHistogram')}</p>
              </div>
            </div>
            <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
              {t('helpUsage')}
            </div>
          </div>
        )}

        {/* 시트가 없으면 빈 상태 표시 */}
        {!hasSheet ? (
          <EmptyState />
        ) : (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

          <div className="flex-1 min-h-0 overflow-hidden flex">
          {/* 사이드바 - 레이더/바 차트용 */}
          {(activeTab === 'radar' || activeTab === 'bar') && (
            <div className="w-64 shrink-0 border-r p-4 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
              {/* 비교 대상 선택 */}
              <div className="mb-6">
                <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('compareTarget')}</h4>
                <select
                  onChange={(e) => addItem(e.target.value)}
                  value=""
                  className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                >
                  <option value="">{t('addTarget')}</option>
                  {availableRows
                    .filter((r) => !items.find((i) => i.id === r.id))
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </select>
                {/* 비교 대상 목록 - 그리드 형태로 배치 */}
                <div className={cn(
                  'gap-1.5',
                  items.length <= 2 ? 'space-y-1.5' : 'grid grid-cols-1'
                )}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg group"
                      style={{ background: 'var(--bg-tertiary)', borderLeft: `3px solid ${item.color}` }}
                    >
                      <span
                        className="flex-1 text-xs truncate"
                        style={{ color: 'var(--text-primary)' }}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-0.5 rounded transition-colors opacity-60 hover:opacity-100 hover:text-red-500 shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* 비교 대상 개수 표시 */}
                {items.length > 0 && (
                  <div className="mt-2 text-xs text-center py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                    {t('itemCount', { count: items.length })}
                  </div>
                )}
              </div>

              {/* 비교 항목 (컬럼) 선택 */}
              <div>
                <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('compareItems')}</h4>
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
              <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('columnToAnalyze')}</h4>
              <select
                value={histogramColumn}
                onChange={(e) => setHistogramColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
              >
                <option value="">{t('select')}</option>
                {numericColumns.map((col) => (
                  <option key={col.id} value={col.name}>
                    {col.name}
                  </option>
                ))}
              </select>

              {histogramColumn && histogramData.length > 0 && (
                <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
                  <div className="px-3 py-2 text-xs font-medium" style={{ background: 'var(--accent)', color: 'white' }}>
                    {t('statistics')}
                  </div>
                  <div className="p-3 space-y-2" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('totalCount')}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{currentSheet.rows.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('minimum')}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>{Math.min(...histogramData.map((d) => d.min)).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('maximum')}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--error)' }}>{Math.max(...histogramData.map((d) => d.max)).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 차트 영역 */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col" style={{ minWidth: 0, minHeight: 0 }}>
            {activeTab === 'radar' && (
              <>
                {items.length === 0 || uniqueSelectedColumns.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                      <p>{t('selectTargetAndItems')}</p>
                      <p className="text-sm mt-1">{t('recommendMinimum')}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1" style={{ minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="var(--border-primary)" />
                          <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
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
                          <Tooltip formatter={(value: number) => [`${value.toFixed(0)}%`]} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* 별도 Legend 영역 */}
                    <div className="shrink-0 h-10 flex flex-wrap justify-center items-start gap-x-3 gap-y-1 text-xs overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                          <span className="truncate max-w-[80px]" title={item.name}>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'bar' && (
              <>
                {items.length === 0 || uniqueSelectedColumns.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                      <p>{t('selectTargetAndItems')}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1" style={{ minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                          <XAxis dataKey="stat" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }} />
                          {items.map((item) => (
                            <Bar key={item.id} dataKey={item.name} fill={item.color} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* 별도 Legend 영역 */}
                    <div className="shrink-0 h-10 flex flex-wrap justify-center items-start gap-x-3 gap-y-1 text-xs overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                          <span className="truncate max-w-[80px]" title={item.name}>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'histogram' && (
              <>
                {!histogramColumn ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p style={{ color: 'var(--text-tertiary)' }}>{t('selectColumnToAnalyze')}</p>
                  </div>
                ) : histogramData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p style={{ color: 'var(--text-tertiary)' }}>{t('noNumericData')}</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-medium mb-2 shrink-0" style={{ color: 'var(--text-primary)' }}>{t('distribution', { column: histogramColumn })}</h3>
                    <div className="flex-1" style={{ minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <BarChart data={histogramData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                          <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} angle={-45} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                          <Tooltip
                            formatter={(value: number) => [`${value}${t('count')}`, t('count')]}
                            labelFormatter={(label) => `${t('range')}: ${label}`}
                            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
                          />
                          <Bar dataKey="count" fill="var(--accent)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
