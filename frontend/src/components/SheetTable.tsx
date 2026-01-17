'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Plus, Trash2, HelpCircle, X, Check } from 'lucide-react';
import { useProjectStore, type SelectedRowData } from '@/stores/projectStore';
import { evaluateFormula, availableFunctions } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';
import type { Sheet, Row, Column, CellValue } from '@/types';

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
    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 w-72 max-h-48 overflow-y-auto">
      {matchingFunctions.length > 0 && (
        <div>
          <div className="px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-500">
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
              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-start gap-2"
            >
              <code className="text-blue-600 font-semibold text-sm">{func.name}</code>
              <span className="text-xs text-gray-500 flex-1">{func.description}</span>
            </button>
          ))}
        </div>
      )}
      {matchingColumns.length > 0 && (
        <div>
          <div className="px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-500">
            컬럼 참조
          </div>
          {matchingColumns.slice(0, 5).map((col) => (
            <button
              key={col.id}
              onClick={() => {
                const newValue = value.slice(0, value.length - lastWord.length) + col.name;
                onSelect(newValue);
              }}
              className="w-full text-left px-3 py-2 hover:bg-green-50 flex items-center gap-2"
            >
              <span className="text-green-600 font-medium text-sm">{col.name}</span>
              <span className="text-xs text-gray-400">
                ({col.type === 'number' ? '숫자' : col.type === 'formula' ? '수식' : '텍스트'})
              </span>
            </button>
          ))}
        </div>
      )}
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
  const { updateCell, addRow, deleteRow, addColumn, deleteColumn, toggleRowSelection, selectedRows } = useProjectStore();
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'formula'>('number');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showQuickHelp, setShowQuickHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // 셀 값 계산 (수식 포함)
  const getCellValue = useCallback(
    (row: Row, column: Column): CellValue => {
      const rawValue = row.cells[column.id];

      if (column.type === 'formula' && column.formula) {
        const result = evaluateFormula(column.formula, {
          sheets: currentProject?.sheets || [],
          currentSheet: sheet,
          currentRow: row.cells,
        });
        return result.error ? `#ERR: ${result.error}` : result.value;
      }

      // 셀 자체에 수식이 있는 경우
      if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
        const result = evaluateFormula(rawValue, {
          sheets: currentProject?.sheets || [],
          currentSheet: sheet,
          currentRow: row.cells,
        });
        return result.error ? `#ERR: ${result.error}` : result.value;
      }

      return rawValue;
    },
    [currentProject?.sheets, sheet]
  );

  // 셀 편집 시작
  const startEditing = useCallback(
    (rowId: string, columnId: string) => {
      setEditingCell({ rowId, columnId });
      // 원본 값 (수식이면 수식 그대로)
      const row = sheet.rows.find((r) => r.id === rowId);
      const rawValue = row?.cells[columnId];
      setEditValue(rawValue?.toString() || '');
    },
    [sheet.rows]
  );

  // 셀 편집 완료
  const finishEditing = useCallback(() => {
    if (!editingCell) return;

    const column = sheet.columns.find((c) => c.id === editingCell.columnId);
    let value: CellValue = editValue;

    // 숫자 컬럼이고 수식이 아니면 숫자로 변환
    if (column?.type === 'number' && !editValue.startsWith('=')) {
      const num = parseFloat(editValue);
      value = isNaN(num) ? null : num;
    }

    updateCell(projectId, sheet.id, editingCell.rowId, editingCell.columnId, value);
    setEditingCell(null);
    setEditValue('');
    setShowAutocomplete(false);
  }, [editingCell, editValue, projectId, sheet.id, sheet.columns, updateCell]);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
        setShowAutocomplete(false);
      } else if (e.key === 'Tab' && showAutocomplete) {
        e.preventDefault();
        // Tab으로 첫 번째 자동완성 선택
      }
    },
    [finishEditing, showAutocomplete]
  );

  // 컬럼 추가
  const handleAddColumn = useCallback(() => {
    if (!newColumnName.trim()) return;
    addColumn(projectId, sheet.id, {
      name: newColumnName,
      type: newColumnType,
      width: 120,
    });
    setNewColumnName('');
    setShowAddColumn(false);
  }, [addColumn, projectId, sheet.id, newColumnName, newColumnType]);

  // TanStack Table 컬럼 정의
  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const cols: ColumnDef<Row>[] = [
      // 행 선택 + 번호 컬럼
      {
        id: 'rowNumber',
        header: () => (
          <span className="text-gray-500 text-xs">#</span>
        ),
        cell: ({ row }) => {
          const selected = isRowSelected(row.original.id);
          return (
            <div className="flex items-center gap-1 text-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowSelect(row.original);
                }}
                className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                  selected
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-gray-300 hover:border-blue-400'
                )}
                title={selected ? '선택 해제' : '차트/계산기에 사용할 행 선택'}
              >
                {selected && <Check className="w-3 h-3" />}
              </button>
              <span className="text-gray-400">{row.index + 1}</span>
            </div>
          );
        },
        size: 60,
      },
    ];

    // 데이터 컬럼들
    for (const col of sheet.columns) {
      cols.push({
        id: col.id,
        accessorFn: (row) => getCellValue(row, col),
        header: () => (
          <div className="flex items-center justify-between group">
            <span className="font-medium">{col.name}</span>
            <span className="text-xs text-gray-400 ml-1">
              {col.type === 'formula' ? 'ƒ' : col.type === 'number' ? '#' : 'T'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`"${col.name}" 컬럼을 삭제하시겠습니까?`)) {
                  deleteColumn(projectId, sheet.id, col.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 ml-2 text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ),
        cell: ({ row, getValue }) => {
          const value = getValue() as CellValue;
          const isEditing =
            editingCell?.rowId === row.original.id && editingCell?.columnId === col.id;
          const isFormula = col.type === 'formula';
          const cellHasFormula =
            typeof row.original.cells[col.id] === 'string' &&
            String(row.original.cells[col.id]).startsWith('=');

          if (isEditing && !isFormula) {
            return (
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    // 약간의 딜레이로 자동완성 클릭 가능하게
                    setTimeout(() => {
                      if (!showAutocomplete) finishEditing();
                    }, 150);
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className={cn(
                    'w-full px-2 py-1 border rounded outline-none bg-white',
                    editValue.startsWith('=') ? 'border-purple-500 bg-purple-50' : 'border-blue-500'
                  )}
                  placeholder={editValue.startsWith('=') ? '수식 입력 중...' : ''}
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

          return (
            <div
              onClick={() =>
                !isFormula && startEditing(row.original.id, col.id)
              }
              className={cn(
                'px-2 py-1 min-h-[32px] cursor-pointer hover:bg-gray-50 relative group',
                isFormula && 'bg-purple-50 cursor-default',
                cellHasFormula && 'bg-blue-50',
                typeof value === 'string' && value.startsWith('#ERR') && 'text-red-500 bg-red-50'
              )}
              title={cellHasFormula ? `수식: ${row.original.cells[col.id]}` : undefined}
            >
              {value !== null && value !== undefined ? String(value) : ''}
              {/* 수식 표시 아이콘 */}
              {cellHasFormula && !isFormula && (
                <span className="absolute right-1 top-1 text-blue-400 text-xs opacity-0 group-hover:opacity-100">
                  ƒ
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
          className="p-1 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      size: 40,
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
  ]);

  const table = useReactTable({
    data: sheet.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* 빠른 도움말 */}
      {showQuickHelp && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">수식 사용법</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  <code className="bg-blue-100 px-1 rounded">=</code> 로 시작하면 수식
                </li>
                <li>
                  컬럼 참조: <code className="bg-blue-100 px-1 rounded">=ATK * 1.5</code>
                </li>
                <li>
                  게임 함수: <code className="bg-blue-100 px-1 rounded">=DAMAGE(100, 50)</code>,{' '}
                  <code className="bg-blue-100 px-1 rounded">=DPS(50, 2, 0.2, 1.5)</code>
                </li>
              </ul>
            </div>
            <button onClick={() => setShowQuickHelp(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-r px-2 py-2 text-left text-sm font-medium text-gray-700"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-400">
                  데이터가 없습니다. 아래 &quot;행 추가&quot; 버튼을 클릭하세요.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-b border-r text-sm"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 하단 액션 버튼 */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
        <button
          onClick={() => addRow(projectId, sheet.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
        >
          <Plus className="w-4 h-4" />
          행 추가
        </button>

        {showAddColumn ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="컬럼 이름"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              className="px-2 py-1 border rounded text-sm w-32"
              autoFocus
            />
            <select
              value={newColumnType}
              onChange={(e) => setNewColumnType(e.target.value as 'text' | 'number' | 'formula')}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="number">숫자</option>
              <option value="text">텍스트</option>
            </select>
            <button
              onClick={handleAddColumn}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              추가
            </button>
            <button
              onClick={() => {
                setShowAddColumn(false);
                setNewColumnName('');
              }}
              className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            <Plus className="w-4 h-4" />
            컬럼 추가
          </button>
        )}

        <button
          onClick={() => setShowQuickHelp(!showQuickHelp)}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-sm rounded ml-auto',
            showQuickHelp ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
          )}
        >
          <HelpCircle className="w-4 h-4" />
          수식 도움말
        </button>
      </div>
    </div>
  );
}
