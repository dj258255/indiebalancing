'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Plus, Trash2, X, Check, Edit3 } from 'lucide-react';
import { useProjectStore, type SelectedRowData } from '@/stores/projectStore';
import { evaluateFormula, availableFunctions } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';
import type { Sheet, Row, Column, CellValue, ColumnType } from '@/types';

interface SheetTableProps {
  projectId: string;
  sheet: Sheet;
}

// 수식 자동완성 컴포넌트
function FormulaAutocomplete({
  value,
  onSelect,
  columns,
}: {
  value: string;
  onSelect: (text: string) => void;
  columns: Column[];
}) {
  // = 다음 텍스트 추출
  const formulaText = value.startsWith('=') ? value.slice(1) : '';
  const lastWord = formulaText.split(/[\s()+\-*/,]/).pop()?.toUpperCase() || '';

  if (!lastWord || lastWord.length < 1) return null;

  // 함수 매칭
  const matchingFunctions = availableFunctions.filter((f) =>
    f.name.toUpperCase().startsWith(lastWord)
  );

  // 컬럼 매칭
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
            함수
          </div>
          {matchingFunctions.slice(0, 5).map((func) => (
            <button
              key={func.name}
              onClick={() => {
                // lastWord를 함수로 교체
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
            컬럼 참조
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
                ({col.type === 'formula' ? '수식' : '일반'})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 컬럼 추가/편집 모달
function ColumnModal({
  column,
  columns,
  onSave,
  onClose,
  mode,
}: {
  column?: Column;
  columns: Column[];
  onSave: (data: { name: string; type: ColumnType; formula?: string }) => void;
  onClose: () => void;
  mode: 'add' | 'edit';
}) {
  const [name, setName] = useState(column?.name || '');
  const [type, setType] = useState<ColumnType>(column?.type || 'general');
  const [formula, setFormula] = useState(column?.formula || '');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 모달 열릴 때 이름 입력에 포커스
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (formula.startsWith('=') && formula.length > 1) {
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, [formula]);

  const handleSave = () => {
    if (!name.trim()) return;

    const data: { name: string; type: ColumnType; formula?: string } = {
      name: name.trim(),
      type,
    };

    if (type === 'formula') {
      data.formula = formula.startsWith('=') ? formula : `=${formula}`;
    }

    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md animate-scaleIn">
        <div className="border-b px-5 py-4 flex items-center justify-between" style={{
          borderColor: 'var(--border-primary)'
        }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {mode === 'add' ? '컬럼 추가' : '컬럼 편집'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* 컬럼 이름 */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              컬럼 이름
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="예: 공격력, HP, 레벨"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* 컬럼 타입 */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              타입
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('general')}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  type === 'general' ? 'ring-2 ring-offset-1' : ''
                }`}
                style={{
                  background: type === 'general' ? 'var(--accent-light)' : 'var(--bg-primary)',
                  borderColor: type === 'general' ? 'var(--accent)' : 'var(--border-primary)',
                  color: type === 'general' ? 'var(--accent)' : 'var(--text-secondary)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'var(--accent)',
                }}
              >
                <div className="font-semibold">일반</div>
                <div className="text-xs mt-0.5 opacity-70">숫자/텍스트 자동 감지</div>
              </button>
              <button
                type="button"
                onClick={() => setType('formula')}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  type === 'formula' ? 'ring-2 ring-offset-1' : ''
                }`}
                style={{
                  background: type === 'formula' ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
                  borderColor: type === 'formula' ? 'var(--primary-purple)' : 'var(--border-primary)',
                  color: type === 'formula' ? 'var(--primary-purple)' : 'var(--text-secondary)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'var(--primary-purple)',
                }}
              >
                <div className="font-semibold">ƒ 수식</div>
                <div className="text-xs mt-0.5 opacity-70">컬럼 전체에 수식 적용</div>
              </button>
            </div>
          </div>

          {/* 수식 입력 (수식 타입일 때만) */}
          {type === 'formula' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                수식
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="=ATK * LEVEL"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--primary-purple)',
                    color: 'var(--text-primary)'
                  }}
                />
                {showAutocomplete && (
                  <FormulaAutocomplete
                    value={formula}
                    columns={columns.filter(c => c.id !== column?.id)}
                    onSelect={(newValue) => {
                      setFormula(newValue);
                      inputRef.current?.focus();
                    }}
                  />
                )}
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                다른 컬럼명을 사용하여 수식을 작성하세요. 예: =ATK * 1.5
              </p>
            </div>
          )}
        </div>
        <div className="border-t px-5 py-4 flex justify-end gap-2" style={{
          borderColor: 'var(--border-primary)'
        }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: 'white'
            }}
          >
            {mode === 'add' ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 수식 입력 도움말
function FormulaHint({ formula }: { formula: string }) {
  if (!formula.startsWith('=')) return null;

  const formulaText = formula.slice(1).toUpperCase();

  // 함수명 추출 (첫 번째 괄호 전까지)
  const funcMatch = formulaText.match(/^([A-Z_]+)\s*\(/);
  if (!funcMatch) {
    return (
      <div className="absolute top-full left-0 mt-1 bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-lg z-50">
        <span className="text-gray-300">= 다음에 함수명 또는 컬럼명을 입력하세요</span>
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

export default function SheetTable({ projectId, sheet }: SheetTableProps) {
  const { updateCell, addRow, deleteRow, addColumn, deleteColumn, updateColumn, toggleRowSelection, selectedRows } = useProjectStore();
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isFormulaBarFocused, setIsFormulaBarFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);

  // 컬럼 너비 초기화
  useEffect(() => {
    const widths: Record<string, number> = { rowNumber: 80 };
    sheet.columns.forEach((col) => {
      widths[col.id] = col.width || 150;
    });
    setColumnWidths(widths);
  }, [sheet.columns]);

  // 테이블 전체 너비 계산
  const tableWidth = useMemo(() => {
    const rowNumberWidth = columnWidths['rowNumber'] || 80;
    const dataColumnsWidth = sheet.columns.reduce((sum, col) => sum + (columnWidths[col.id] || 150), 0);
    const actionsWidth = 36; // 삭제 버튼 컬럼
    return rowNumberWidth + dataColumnsWidth + actionsWidth;
  }, [sheet.columns, columnWidths]);

  // 컬럼 리사이즈 핸들러
  const handleResizeStart = useCallback((columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);

    const startX = e.clientX;
    const startWidth = columnWidths[columnId] || 150;
    let finalWidth = startWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      finalWidth = Math.max(60, startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [columnId]: finalWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 컬럼 너비를 store에 저장 (다음 이벤트 루프에서 실행)
      if (columnId !== 'rowNumber') {
        setTimeout(() => {
          updateColumn(projectId, sheet.id, columnId, { width: finalWidth });
        }, 0);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, projectId, sheet.id, updateColumn]);

  const projects = useProjectStore((state) => state.projects);
  const currentProject = projects.find((p) => p.id === projectId);

  // 행이 선택되었는지 확인
  const isRowSelected = useCallback((rowId: string) => {
    return selectedRows.some((r) => r.rowId === rowId);
  }, [selectedRows]);

  // 행 선택 토글
  const handleRowSelect = useCallback((row: Row) => {
    // 행 이름 찾기 (이름 또는 ID 컬럼에서)
    const nameCol = sheet.columns.find(
      (c) => c.name === '이름' || c.name === 'name' || c.name === 'Name'
    );
    const idCol = sheet.columns.find(
      (c) => c.name === 'ID' || c.name === 'id'
    );
    const rowName = nameCol
      ? String(row.cells[nameCol.id] || '')
      : idCol
      ? String(row.cells[idCol.id] || '')
      : row.id.slice(0, 8);

    // 값 추출
    const values: Record<string, number | string> = {};
    sheet.columns.forEach((col) => {
      const val = row.cells[col.id];
      if (val !== null && val !== undefined) {
        values[col.name] = typeof val === 'number' ? val : String(val);
      }
    });

    const rowData: SelectedRowData = {
      rowId: row.id,
      sheetId: sheet.id,
      sheetName: sheet.name,
      name: rowName,
      values,
    };

    toggleRowSelection(rowData);
  }, [sheet.columns, sheet.id, sheet.name, toggleRowSelection]);

  // 수식 시작 감지
  useEffect(() => {
    if (editValue.startsWith('=') && editValue.length > 1) {
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, [editValue]);

  // 모든 행의 계산된 값을 저장 (이전행 참조용)
  // 순차적으로 계산하여 이전 행의 결과를 다음 행이 참조할 수 있게 함
  const computedRows = useMemo(() => {
    const result: Record<string, CellValue>[] = [];

    for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
      const row = sheet.rows[rowIndex];
      const computedRow: Record<string, CellValue> = { ...row.cells };

      // 각 컬럼에 대해 값 계산
      // 중요: 같은 행의 이전 컬럼이 이미 계산되었으면 그 결과를 사용하기 위해
      // computedRow를 currentRow로 전달 (수식 컬럼 간 참조 지원)
      for (const column of sheet.columns) {
        const rawValue = row.cells[column.id];

        // 셀 자체에 수식이 있는 경우 (셀 수식 우선)
        if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
          const evalResult = evaluateFormula(rawValue, {
            sheets: currentProject?.sheets || [],
            currentSheet: sheet,
            currentRow: computedRow,  // 이미 계산된 값 포함
            currentRowIndex: rowIndex,
            allRows: result,  // 이전 행들의 계산된 결과
          });
          computedRow[column.id] = evalResult.error ? `#ERR: ${evalResult.error}` : evalResult.value;
          continue;
        }

        // 셀에 직접 값이 있으면 그 값 사용 (오버라이드)
        if (rawValue !== null && rawValue !== undefined) {
          computedRow[column.id] = rawValue;
          continue;
        }

        // 셀이 비어있고 컬럼이 formula 타입이면 컬럼 수식 사용
        if (column.type === 'formula' && column.formula) {
          const evalResult = evaluateFormula(column.formula, {
            sheets: currentProject?.sheets || [],
            currentSheet: sheet,
            currentRow: computedRow,  // 이미 계산된 값 포함
            currentRowIndex: rowIndex,
            allRows: result,  // 이전 행들의 계산된 결과
          });
          computedRow[column.id] = evalResult.error ? `#ERR: ${evalResult.error}` : evalResult.value;
          continue;
        }

        computedRow[column.id] = rawValue;
      }

      result.push(computedRow);
    }

    return result;
  }, [sheet.rows, sheet.columns, currentProject?.sheets, sheet]);

  // 셀 값 계산 (수식 포함) - 이제 computedRows 사용
  const getCellValue = useCallback(
    (row: Row, column: Column): CellValue => {
      const rowIndex = sheet.rows.findIndex(r => r.id === row.id);
      if (rowIndex >= 0 && computedRows[rowIndex]) {
        return computedRows[rowIndex][column.id];
      }
      return row.cells[column.id];
    },
    [sheet.rows, computedRows]
  );

  // 셀 선택 (클릭 시) - 편집 모드로 전환하지 않고 선택만
  const selectCell = useCallback(
    (rowId: string, columnId: string) => {
      setSelectedCell({ rowId, columnId });
      // 원본 값을 수식 바에 표시
      const row = sheet.rows.find((r) => r.id === rowId);
      const rawValue = row?.cells[columnId];
      setFormulaBarValue(rawValue?.toString() || '');
    },
    [sheet.rows]
  );

  // 셀 편집 시작 (더블클릭 또는 수식바 포커스)
  const startEditing = useCallback(
    (rowId: string, columnId: string) => {
      setEditingCell({ rowId, columnId });
      setSelectedCell({ rowId, columnId });
      // 원본 값 (수식이면 수식 그대로)
      const row = sheet.rows.find((r) => r.id === rowId);
      const rawValue = row?.cells[columnId];
      const value = rawValue?.toString() || '';
      setEditValue(value);
      setFormulaBarValue(value);
    },
    [sheet.rows]
  );

  // 셀 편집 완료 (셀 내부 편집에서만 호출)
  const finishEditing = useCallback((valueToSave?: string) => {
    if (!editingCell) return;

    const finalValue = valueToSave !== undefined ? valueToSave : editValue;
    let value: CellValue = finalValue;

    // 수식이 아니면 숫자 변환 시도 (자동 감지)
    if (!finalValue.startsWith('=')) {
      const num = parseFloat(finalValue);
      if (!isNaN(num) && finalValue.trim() !== '') {
        value = num;
      }
    }

    updateCell(projectId, sheet.id, editingCell.rowId, editingCell.columnId, value);
    setEditingCell(null);
    setEditValue('');
    setShowAutocomplete(false);
    // 포뮬라 바 값도 업데이트
    setFormulaBarValue(finalValue);
  }, [editingCell, editValue, projectId, sheet.id, updateCell]);

  // 수식바에서 편집 완료
  const finishFormulaBarEditing = useCallback(() => {
    if (!selectedCell) return;

    let value: CellValue = formulaBarValue;

    // 수식이 아니면 숫자 변환 시도 (자동 감지)
    if (!formulaBarValue.startsWith('=')) {
      const num = parseFloat(formulaBarValue);
      if (!isNaN(num) && formulaBarValue.trim() !== '') {
        value = num;
      }
    }

    updateCell(projectId, sheet.id, selectedCell.rowId, selectedCell.columnId, value);
    setIsFormulaBarFocused(false);
  }, [selectedCell, formulaBarValue, projectId, sheet.id, updateCell]);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
        setShowAutocomplete(false);
        setIsFormulaBarFocused(false);
        // 원래 값 복원
        if (selectedCell) {
          const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
          const rawValue = row?.cells[selectedCell.columnId];
          setFormulaBarValue(rawValue?.toString() || '');
        }
      } else if (e.key === 'Tab' && showAutocomplete) {
        e.preventDefault();
        // Tab으로 첫 번째 자동완성 선택
      }
    },
    [finishEditing, showAutocomplete, selectedCell, sheet.rows]
  );

  // 수식바 키보드 이벤트
  const handleFormulaBarKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishFormulaBarEditing();
      } else if (e.key === 'Escape') {
        setIsFormulaBarFocused(false);
        // 원래 값 복원
        if (selectedCell) {
          const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
          const rawValue = row?.cells[selectedCell.columnId];
          setFormulaBarValue(rawValue?.toString() || '');
        }
      }
    },
    [finishFormulaBarEditing, selectedCell, sheet.rows]
  );

  // TanStack Table 컬럼 정의
  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const cols: ColumnDef<Row>[] = [
      // 행 선택 + 번호 컬럼
      {
        id: 'rowNumber',
        header: () => (
          <span style={{ color: 'var(--text-tertiary)' }} className="text-xs">#</span>
        ),
        cell: ({ row }) => {
          const selected = isRowSelected(row.original.id);
          return (
            <div className="flex items-center justify-center text-sm gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowSelect(row.original);
                }}
                className="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                style={{
                  background: selected ? 'var(--primary-blue)' : 'transparent',
                  borderColor: selected ? 'var(--primary-blue)' : 'var(--border-secondary)',
                  color: selected ? 'white' : 'transparent'
                }}
                title={selected ? '선택 해제' : '차트/계산기에 사용할 행 선택'}
              >
                {selected && <Check className="w-3 h-3" />}
              </button>
              <div className="w-px h-5" style={{ background: 'var(--border-primary)' }} />
              <span style={{ color: 'var(--text-tertiary)', minWidth: '20px' }}>{row.index + 1}</span>
            </div>
          );
        },
        size: 80,
      },
    ];

    // 데이터 컬럼들
    for (const col of sheet.columns) {
      cols.push({
        id: col.id,
        accessorFn: (row) => getCellValue(row, col),
        header: () => (
          <div className="relative group">
            {/* 컬럼 헤더: 이름 왼쪽, 타입 오른쪽 */}
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{col.name}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {col.type === 'formula' ? 'ƒ' : ''}
              </span>
            </div>
            {/* 호버 시 아래에 떠있는 버튼들 */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-md shadow-lg border"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingColumn(col);
                  }}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-blue)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  title="컬럼 편집"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`"${col.name}" 컬럼을 삭제하시겠습니까?`)) {
                      deleteColumn(projectId, sheet.id, col.id);
                    }
                  }}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  title="컬럼 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ),
        cell: ({ row, getValue }) => {
          const value = getValue() as CellValue;
          const isEditing =
            editingCell?.rowId === row.original.id && editingCell?.columnId === col.id;
          const isFormulaColumn = col.type === 'formula';
          const cellRawValue = row.original.cells[col.id];
          const cellHasFormula =
            typeof cellRawValue === 'string' &&
            String(cellRawValue).startsWith('=');
          // 셀에 오버라이드 값이 있는지 (formula 컬럼인데 셀에 직접 값이 있음)
          const hasCellOverride = isFormulaColumn && cellRawValue !== null && cellRawValue !== undefined;
          // 컬럼 기본 수식을 사용하는지
          const usesColumnFormula = isFormulaColumn && !hasCellOverride;

          if (isEditing) {
            return (
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setFormulaBarValue(e.target.value);
                  }}
                  onBlur={() => {
                    // 약간의 딜레이로 자동완성 클릭 가능하게
                    setTimeout(() => {
                      if (!showAutocomplete) {
                        finishEditing();
                      }
                    }, 150);
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="w-full px-2 py-1 border rounded outline-none"
                  style={{
                    background: editValue.startsWith('=') ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
                    borderColor: editValue.startsWith('=') ? 'var(--primary-purple)' : 'var(--accent)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder={isFormulaColumn ? `기본 수식: ${col.formula || '없음'}` : (editValue.startsWith('=') ? '수식 입력 중...' : '')}
                />
                {/* 수식 입력 시 힌트 */}
                {editValue.startsWith('=') && <FormulaHint formula={editValue} />}
                {/* 자동완성 */}
                {showAutocomplete && (
                  <FormulaAutocomplete
                    value={editValue}
                    columns={sheet.columns}
                    onSelect={(newValue) => {
                      setEditValue(newValue);
                      inputRef.current?.focus();
                    }}
                  />
                )}
              </div>
            );
          }

          // 표시할 값 포맷팅 (긴 숫자는 소수점 제한)
          const displayValue = (() => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'number') {
              // 정수면 그대로, 소수면 최대 4자리까지
              if (Number.isInteger(value)) return value.toLocaleString();
              return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
            }
            return String(value);
          })();

          // 셀에 실제 값이 있는지 확인 (빈 셀인지 체크) - 0은 유효한 값
          const hasValue = value !== null && value !== undefined && value !== '';

          // 셀 배경색 결정 - 값이 있을 때만 색상 표시
          const getCellBackground = () => {
            if (typeof value === 'string' && value.startsWith('#ERR')) return 'var(--error-light)';
            // 값이 있을 때만 수식/오버라이드 색상 표시
            if (hasValue && usesColumnFormula) return 'var(--primary-purple-light)';
            if (hasValue && hasCellOverride && isFormulaColumn) return 'var(--warning-light)';
            if (hasValue && cellHasFormula && !isFormulaColumn) return 'var(--primary-blue-light)';
            return 'transparent';
          };

          // 현재 셀이 선택되었는지 확인
          const isSelected = selectedCell?.rowId === row.original.id && selectedCell?.columnId === col.id;

          return (
            <div
              onClick={(e) => {
                // 더블클릭의 첫 번째 클릭도 여기 옴
                if (e.detail === 1) {
                  // 싱글 클릭만 처리
                  selectCell(row.original.id, col.id);
                }
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                startEditing(row.original.id, col.id);
              }}
              className="px-2 py-1 min-h-[32px] cursor-pointer relative group overflow-hidden transition-colors"
              style={{
                background: getCellBackground(),
                color: typeof value === 'string' && value.startsWith('#ERR') ? 'var(--error)' : 'var(--text-primary)',
                outline: isSelected ? '2px solid var(--primary-blue)' : 'none',
                outlineOffset: '-2px',
              }}
              onMouseEnter={(e) => {
                if (!isSelected && (!getCellBackground() || getCellBackground() === 'transparent')) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = getCellBackground();
              }}
              title={
                usesColumnFormula ? `컬럼 수식: ${col.formula}\n값: ${value}` :
                cellHasFormula ? `셀 수식: ${cellRawValue}\n값: ${value}` :
                hasCellOverride ? `셀 오버라이드 값: ${value}` :
                typeof value === 'number' ? String(value) : undefined
              }
            >
              <span className="truncate block">{displayValue}</span>
              {/* 수식 표시 아이콘 */}
              {(cellHasFormula || usesColumnFormula) && (
                <span
                  className="absolute right-1 top-1 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: usesColumnFormula ? 'var(--primary-purple)' : 'var(--primary-blue)' }}
                >
                  ƒ
                </span>
              )}
              {/* 오버라이드 표시 */}
              {hasCellOverride && isFormulaColumn && !cellHasFormula && (
                <span className="absolute right-1 top-1 text-xs opacity-0 group-hover:opacity-100" style={{ color: 'var(--warning)' }}>
                  ✎
                </span>
              )}
            </div>
          );
        },
        size: col.width || 120,
      });
    }

    // 행 삭제 컬럼
    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => deleteRow(projectId, sheet.id, row.original.id)}
          className="p-1 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
      size: 36,
    });

    return cols;
  }, [
    sheet.columns,
    editingCell,
    editValue,
    getCellValue,
    startEditing,
    finishEditing,
    handleKeyDown,
    deleteColumn,
    deleteRow,
    projectId,
    sheet.id,
    showAutocomplete,
    isRowSelected,
    handleRowSelect,
    selectCell,
    selectedCell,
  ]);

  const table = useReactTable({
    data: sheet.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const verticalScrollTrackRef = useRef<HTMLDivElement>(null);
  const [scrollThumbTop, setScrollThumbTop] = useState(0);
  const [scrollThumbHeight, setScrollThumbHeight] = useState(0);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  // 스크롤 thumb 크기와 위치 계산
  const updateScrollThumb = useCallback(() => {
    if (tableContainerRef.current && verticalScrollTrackRef.current) {
      const container = tableContainerRef.current;
      const track = verticalScrollTrackRef.current;
      const trackHeight = track.clientHeight;
      const contentHeight = container.scrollHeight;
      const viewHeight = container.clientHeight;

      if (contentHeight <= viewHeight) {
        setScrollThumbHeight(0);
        return;
      }

      const thumbHeight = Math.max(30, (viewHeight / contentHeight) * trackHeight);
      const scrollRatio = container.scrollTop / (contentHeight - viewHeight);
      const thumbTop = scrollRatio * (trackHeight - thumbHeight);

      setScrollThumbHeight(thumbHeight);
      setScrollThumbTop(thumbTop);
    }
  }, []);

  // 테이블과 스크롤바 동기화
  const handleTableScroll = useCallback(() => {
    if (tableContainerRef.current && scrollbarRef.current) {
      scrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
    updateScrollThumb();
  }, [updateScrollThumb]);

  const handleScrollbarScroll = useCallback(() => {
    if (tableContainerRef.current && scrollbarRef.current) {
      tableContainerRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
    }
  }, []);

  // 세로 스크롤 드래그 핸들러
  const handleScrollThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingScroll(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = tableContainerRef.current?.scrollTop || 0;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingScroll || !tableContainerRef.current || !verticalScrollTrackRef.current) return;

      const container = tableContainerRef.current;
      const track = verticalScrollTrackRef.current;
      const deltaY = e.clientY - dragStartY.current;
      const trackHeight = track.clientHeight;
      const contentHeight = container.scrollHeight;
      const viewHeight = container.clientHeight;
      const thumbHeight = Math.max(30, (viewHeight / contentHeight) * trackHeight);

      const scrollRatio = deltaY / (trackHeight - thumbHeight);
      const newScrollTop = dragStartScrollTop.current + scrollRatio * (contentHeight - viewHeight);

      container.scrollTop = Math.max(0, Math.min(newScrollTop, contentHeight - viewHeight));
    };

    const handleMouseUp = () => {
      setIsDraggingScroll(false);
    };

    if (isDraggingScroll) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScroll]);

  // 초기 thumb 크기 계산
  useEffect(() => {
    updateScrollThumb();
  }, [updateScrollThumb, sheet.rows.length]);

  // 선택된 셀 정보 가져오기
  const selectedCellInfo = useMemo(() => {
    if (!selectedCell) return null;
    const column = sheet.columns.find((c) => c.id === selectedCell.columnId);
    const rowIndex = sheet.rows.findIndex((r) => r.id === selectedCell.rowId);
    return {
      column,
      rowIndex,
      cellRef: column ? `${column.name}${rowIndex + 1}` : '',
    };
  }, [selectedCell, sheet.columns, sheet.rows]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 수식 입력줄 (Formula Bar) */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b mb-2 rounded-lg"
        style={{
          background: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)'
        }}
      >
        {/* 셀 참조 표시 */}
        <div
          className="flex-shrink-0 px-3 py-1.5 rounded text-sm font-mono font-medium min-w-[80px] text-center"
          style={{
            background: 'var(--bg-primary)',
            color: selectedCell ? 'var(--accent)' : 'var(--text-tertiary)',
            border: '1px solid var(--border-primary)'
          }}
        >
          {selectedCellInfo?.cellRef || '-'}
        </div>

        {/* 수식/값 타입 표시 */}
        {selectedCell && selectedCellInfo?.column && (
          <div
            className="flex-shrink-0 px-2 py-1 rounded text-xs font-medium"
            style={{
              background: formulaBarValue.startsWith('=') ? 'var(--primary-purple-light)' : 'var(--bg-primary)',
              color: formulaBarValue.startsWith('=') ? 'var(--primary-purple)' : 'var(--text-tertiary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            {formulaBarValue.startsWith('=') ? 'ƒx' : ''}
          </div>
        )}

        {/* 수식/값 입력창 */}
        <div className="flex-1 relative">
          <input
            ref={formulaBarRef}
            type="text"
            value={formulaBarValue}
            onChange={(e) => {
              setFormulaBarValue(e.target.value);
              if (editingCell) {
                setEditValue(e.target.value);
              }
            }}
            onFocus={() => {
              setIsFormulaBarFocused(true);
            }}
            onBlur={() => {
              // 버튼 클릭 등을 위해 딜레이
              setTimeout(() => {
                setIsFormulaBarFocused(false);
              }, 200);
            }}
            onKeyDown={handleFormulaBarKeyDown}
            placeholder={selectedCell ? '값 또는 수식 입력 (=로 시작)' : '셀을 클릭하여 선택하세요'}
            disabled={!selectedCell}
            className="w-full px-3 py-1.5 text-sm font-mono rounded transition-colors"
            style={{
              background: isFormulaBarFocused ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              border: isFormulaBarFocused ? '2px solid var(--accent)' : '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              opacity: selectedCell ? 1 : 0.5
            }}
          />
          {/* 자동완성 (수식바용) */}
          {isFormulaBarFocused && formulaBarValue.startsWith('=') && formulaBarValue.length > 1 && (
            <FormulaAutocomplete
              value={formulaBarValue}
              columns={sheet.columns}
              onSelect={(newValue) => {
                setFormulaBarValue(newValue);
                setEditValue(newValue);
                formulaBarRef.current?.focus();
              }}
            />
          )}
        </div>

        {/* 확인/취소 버튼 */}
        {isFormulaBarFocused && selectedCell && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                // 원래 값 복원
                const row = sheet.rows.find((r) => r.id === selectedCell.rowId);
                const rawValue = row?.cells[selectedCell.columnId];
                setFormulaBarValue(rawValue?.toString() || '');
                setIsFormulaBarFocused(false);
                setEditingCell(null);
              }}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--error)' }}
              title="취소 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={finishFormulaBarEditing}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--success)' }}
              title="확인 (Enter)"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 테이블 + 세로스크롤 래퍼 */}
      <div className="flex-1 flex min-h-0">
        {/* 테이블 컨테이너 - 가로 스크롤바는 숨김 */}
        <div
          ref={tableContainerRef}
          className={cn("flex-1 rounded-tl-lg border-t border-l border-b-0 hide-scrollbar", resizingColumn && "select-none")}
          style={{
            overflowY: 'scroll',
            overflowX: 'scroll',
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)'
          }}
          onScroll={handleTableScroll}
        >
        <table className="border-collapse table-fixed" style={{ width: tableWidth, minWidth: tableWidth }}>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-tertiary)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isRowNumber = header.id === 'rowNumber';
                  const isActions = header.id === 'actions';
                  const width = isActions ? 36 : (columnWidths[header.id] || (isRowNumber ? 80 : 150));
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-2 text-xs font-bold uppercase tracking-wide relative",
                        isActions && "px-1",
                        isRowNumber ? "text-center" : "text-left"
                      )}
                      style={{
                        width,
                        minWidth: isActions ? 36 : 60,
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-primary)',
                        borderRight: '1px solid var(--border-primary)'
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {!isActions && (
                        <div
                          className={cn(
                            'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors',
                            resizingColumn === header.id ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]'
                          )}
                          onMouseDown={(e) => handleResizeStart(header.id, e)}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  데이터가 없습니다. 아래 &quot;행 추가&quot; 버튼을 클릭하세요.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors"
                  style={{ background: 'var(--bg-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isRowNumber = cell.column.id === 'rowNumber';
                    const isActions = cell.column.id === 'actions';
                    const width = isActions ? 36 : (columnWidths[cell.column.id] || (isRowNumber ? 80 : 150));
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "text-[15px]",
                          isActions && "px-1",
                          isRowNumber && "text-center"
                        )}
                        style={{
                          width,
                          minWidth: isActions ? 36 : 60,
                          borderBottom: '1px solid var(--border-primary)',
                          borderRight: '1px solid var(--border-primary)'
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 커스텀 세로 스크롤바 (테이블 오른쪽) */}
        <div
          ref={verticalScrollTrackRef}
          className="w-3 rounded-tr-lg border-t border-r relative"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)'
          }}
          onClick={(e) => {
            if (!tableContainerRef.current || !verticalScrollTrackRef.current) return;
            const track = verticalScrollTrackRef.current;
            const rect = track.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const container = tableContainerRef.current;
            const contentHeight = container.scrollHeight;
            const viewHeight = container.clientHeight;
            const scrollRatio = clickY / track.clientHeight;
            container.scrollTop = scrollRatio * (contentHeight - viewHeight);
          }}
        >
          {scrollThumbHeight > 0 && (
            <div
              className="absolute left-0.5 right-0.5 rounded cursor-pointer transition-colors hover:bg-[var(--text-tertiary)]"
              style={{
                top: scrollThumbTop,
                height: scrollThumbHeight,
                background: 'var(--border-secondary)',
              }}
              onMouseDown={handleScrollThumbMouseDown}
            />
          )}
        </div>
      </div>

      {/* 고정 가로 스크롤바 */}
      <div
        ref={scrollbarRef}
        className="flex-shrink-0 rounded-b-lg border border-t-0"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          background: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)'
        }}
        onScroll={handleScrollbarScroll}
      >
        <div style={{ width: tableWidth, height: 1 }} />
      </div>

      {/* 하단 액션 버튼 */}
      <div
        className="flex items-center gap-2 mt-3 pt-3 pb-12"
        style={{ borderTop: '1px solid var(--border-primary)' }}
      >
        <button
          onClick={() => addRow(projectId, sheet.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors"
          style={{
            background: 'var(--primary-green)',
            color: 'white'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-green)'}
        >
          <Plus className="w-4 h-4" />
          행 추가
        </button>

        <button
          onClick={() => setShowAddColumn(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Plus className="w-4 h-4" />
          컬럼 추가
        </button>
      </div>

      {/* 컬럼 추가 모달 */}
      {showAddColumn && (
        <ColumnModal
          columns={sheet.columns}
          mode="add"
          onSave={(data) => {
            addColumn(projectId, sheet.id, {
              name: data.name,
              type: data.type,
              formula: data.formula,
              width: 120,
            });
          }}
          onClose={() => setShowAddColumn(false)}
        />
      )}

      {/* 컬럼 편집 모달 */}
      {editingColumn && (
        <ColumnModal
          column={editingColumn}
          columns={sheet.columns}
          mode="edit"
          onSave={(data) => {
            updateColumn(projectId, sheet.id, editingColumn.id, {
              name: data.name,
              type: data.type,
              formula: data.type === 'formula' ? data.formula : undefined,
            });
          }}
          onClose={() => setEditingColumn(null)}
        />
      )}
    </div>
  );
}
