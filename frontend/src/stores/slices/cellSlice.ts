import { v4 as uuidv4 } from 'uuid';
import type { Column, Row, CellValue, CellStyle } from '@/types';
import type { StateCreator } from 'zustand';
import type { ProjectState } from '../projectStore';

// 기본 셀 스타일
const DEFAULT_CELL_STYLE: CellStyle = {
  fontSize: 15,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  hAlign: 'center',
  vAlign: 'middle',
  textRotation: 0,
};

export interface CellSlice {
  // 컬럼 액션
  addColumn: (projectId: string, sheetId: string, column: Omit<Column, 'id'>) => string;
  insertColumn: (projectId: string, sheetId: string, column: Omit<Column, 'id'>, atIndex: number) => string;
  updateColumn: (projectId: string, sheetId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (projectId: string, sheetId: string, columnId: string) => void;
  reorderColumns: (projectId: string, sheetId: string, columnIds: string[]) => void;

  // 행 액션
  addRow: (projectId: string, sheetId: string, cells?: Record<string, CellValue>) => string;
  insertRow: (projectId: string, sheetId: string, atIndex: number, cells?: Record<string, CellValue>) => string;
  updateRow: (projectId: string, sheetId: string, rowId: string, updates: Partial<Row>) => void;
  updateCell: (projectId: string, sheetId: string, rowId: string, columnId: string, value: CellValue) => void;
  updateCellStyle: (projectId: string, sheetId: string, rowId: string, columnId: string, style: Partial<CellStyle>) => void;
  updateCellsStyle: (projectId: string, sheetId: string, cells: Array<{rowId: string; columnId: string}>, style: Partial<CellStyle>) => void;
  getCellStyle: (projectId: string, sheetId: string, rowId: string, columnId: string) => CellStyle | undefined;
  deleteRow: (projectId: string, sheetId: string, rowId: string) => void;
  addMultipleRows: (projectId: string, sheetId: string, count: number) => void;
}

export const createCellSlice: StateCreator<
  ProjectState,
  [],
  [],
  CellSlice
> = (set, get) => ({
  // 컬럼 액션
  addColumn: (projectId, sheetId, column) => {
    const id = uuidv4();
    const now = Date.now();

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      columns: [...s.columns, { ...column, id }],
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));

    return id;
  },

  insertColumn: (projectId, sheetId, column, atIndex) => {
    const id = uuidv4();
    const now = Date.now();

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      columns: [
                        ...s.columns.slice(0, atIndex),
                        { ...column, id },
                        ...s.columns.slice(atIndex),
                      ],
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));

    return id;
  },

  updateColumn: (projectId, sheetId, columnId, updates) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      columns: s.columns.map((c) =>
                        c.id === columnId ? { ...c, ...updates } : c
                      ),
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  deleteColumn: (projectId, sheetId, columnId) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      columns: s.columns.filter((c) => c.id !== columnId),
                      rows: s.rows.map((r) => {
                        const newCells = { ...r.cells };
                        delete newCells[columnId];
                        return { ...r, cells: newCells };
                      }),
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  reorderColumns: (projectId, sheetId, columnIds) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const columnMap = new Map(s.columns.map((c) => [c.id, c]));
                const reorderedColumns = columnIds
                  .map((id) => columnMap.get(id))
                  .filter((c): c is Column => c !== undefined);
                return { ...s, columns: reorderedColumns, updatedAt: now };
              }),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  // 행 액션
  addRow: (projectId, sheetId, cells = {}) => {
    const id = uuidv4();
    const now = Date.now();

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: [...s.rows, { id, cells }],
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));

    return id;
  },

  insertRow: (projectId, sheetId, atIndex, cells = {}) => {
    const id = uuidv4();
    const now = Date.now();

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: [
                        ...s.rows.slice(0, atIndex),
                        { id, cells },
                        ...s.rows.slice(atIndex),
                      ],
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));

    return id;
  },

  updateRow: (projectId, sheetId, rowId, updates) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: s.rows.map((r) =>
                        r.id === rowId ? { ...r, ...updates } : r
                      ),
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  updateCell: (projectId, sheetId, rowId, columnId, value) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: s.rows.map((r) =>
                        r.id === rowId
                          ? { ...r, cells: { ...r.cells, [columnId]: value } }
                          : r
                      ),
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  updateCellStyle: (projectId, sheetId, rowId, columnId, style) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: s.rows.map((r) =>
                        r.id === rowId
                          ? {
                              ...r,
                              cellStyles: {
                                ...r.cellStyles,
                                [columnId]: { ...DEFAULT_CELL_STYLE, ...r.cellStyles?.[columnId], ...style },
                              },
                            }
                          : r
                      ),
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  updateCellsStyle: (projectId, sheetId, cells, style) => {
    const now = Date.now();
    const cellMap = new Map<string, Set<string>>();
    cells.forEach(({ rowId, columnId }) => {
      if (!cellMap.has(rowId)) cellMap.set(rowId, new Set());
      cellMap.get(rowId)!.add(columnId);
    });

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: s.rows.map((r) => {
                        const columnIds = cellMap.get(r.id);
                        if (!columnIds) return r;
                        const newCellStyles = { ...r.cellStyles };
                        columnIds.forEach((colId) => {
                          const existingStyle = newCellStyles[colId] || {};
                          newCellStyles[colId] = { ...DEFAULT_CELL_STYLE, ...existingStyle, ...style };
                        });
                        return { ...r, cellStyles: newCellStyles };
                      }),
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  getCellStyle: (projectId, sheetId, rowId, columnId) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return undefined;
    const sheet = project.sheets.find((s) => s.id === sheetId);
    if (!sheet) return undefined;
    const row = sheet.rows.find((r) => r.id === rowId);
    if (!row) return undefined;
    return row.cellStyles?.[columnId];
  },

  deleteRow: (projectId, sheetId, rowId) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: s.rows.filter((r) => r.id !== rowId),
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  addMultipleRows: (projectId, sheetId, count) => {
    const now = Date.now();
    const newRows: Row[] = Array.from({ length: count }, () => ({
      id: uuidv4(),
      cells: {},
    }));

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rows: [...s.rows, ...newRows],
                      updatedAt: now,
                    }
                  : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },
});
