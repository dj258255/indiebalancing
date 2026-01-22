import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Sheet, Column, Row, CellValue, ColumnType, Sticker } from '@/types';

// 선택된 행 데이터 타입
export interface SelectedRowData {
  rowId: string;
  sheetId: string;
  sheetName: string;
  name: string;
  values: Record<string, number | string>;
}

interface ProjectState {
  // 상태
  projects: Project[];
  currentProjectId: string | null;
  currentSheetId: string | null;
  openSheetTabs: string[];  // 열린 시트 탭 목록
  isLoading: boolean;
  lastSaved: number | null;
  selectedRows: SelectedRowData[];  // 선택된 행들

  // 프로젝트 액션
  createProject: (name: string, description?: string) => string;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  loadProjects: (projects: Project[]) => void;

  // 시트 액션
  createSheet: (projectId: string, name: string) => string;
  updateSheet: (projectId: string, sheetId: string, updates: Partial<Pick<Sheet, 'name'>>) => void;
  deleteSheet: (projectId: string, sheetId: string) => void;
  setCurrentSheet: (id: string | null) => void;
  duplicateSheet: (projectId: string, sheetId: string) => string;
  reorderSheets: (projectId: string, fromIndex: number, toIndex: number) => void;
  openSheetTab: (sheetId: string) => void;
  closeSheetTab: (sheetId: string) => void;
  reorderOpenTabs: (fromIndex: number, toIndex: number) => void;

  // 컬럼 액션
  addColumn: (projectId: string, sheetId: string, column: Omit<Column, 'id'>) => string;
  updateColumn: (projectId: string, sheetId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (projectId: string, sheetId: string, columnId: string) => void;
  reorderColumns: (projectId: string, sheetId: string, columnIds: string[]) => void;

  // 행 액션
  addRow: (projectId: string, sheetId: string, cells?: Record<string, CellValue>) => string;
  updateRow: (projectId: string, sheetId: string, rowId: string, updates: Partial<Row>) => void;
  updateCell: (projectId: string, sheetId: string, rowId: string, columnId: string, value: CellValue) => void;
  deleteRow: (projectId: string, sheetId: string, rowId: string) => void;
  addMultipleRows: (projectId: string, sheetId: string, count: number) => void;

  // 유틸리티
  getCurrentProject: () => Project | null;
  getCurrentSheet: () => Sheet | null;
  getSheet: (projectId: string, sheetId: string) => Sheet | null;
  setLastSaved: (timestamp: number) => void;

  // 행 선택 액션
  selectRow: (data: SelectedRowData) => void;
  deselectRow: (rowId: string) => void;
  clearSelectedRows: () => void;
  toggleRowSelection: (data: SelectedRowData) => void;

  // 스티커 액션
  addSticker: (projectId: string, sheetId: string, sticker: Omit<Sticker, 'id' | 'createdAt'>) => string;
  updateSticker: (projectId: string, sheetId: string, stickerId: string, updates: Partial<Sticker>) => void;
  deleteSticker: (projectId: string, sheetId: string, stickerId: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // 초기 상태
  projects: [],
  currentProjectId: null,
  currentSheetId: null,
  openSheetTabs: [],
  isLoading: false,
  lastSaved: null,
  selectedRows: [],

  // 프로젝트 액션
  createProject: (name, description) => {
    const id = uuidv4();
    const now = Date.now();
    const newProject: Project = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      sheets: [],
    };

    set((state) => ({
      projects: [...state.projects, newProject],
      currentProjectId: id,
    }));

    return id;
  },

  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
    }));
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      currentSheetId: state.currentProjectId === id ? null : state.currentSheetId,
    }));
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id, currentSheetId: null });
  },

  loadProjects: (projects) => {
    set({ projects });
  },

  // 시트 액션
  createSheet: (projectId, name) => {
    const id = uuidv4();
    const now = Date.now();
    const newSheet: Sheet = {
      id,
      name,
      columns: [
        { id: uuidv4(), name: 'ID', type: 'general' as ColumnType, width: 80 },
        { id: uuidv4(), name: '이름', type: 'general' as ColumnType, width: 150 },
      ],
      rows: [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, sheets: [...p.sheets, newSheet], updatedAt: now }
          : p
      ),
      currentSheetId: id,
      openSheetTabs: [...state.openSheetTabs, id],
    }));

    return id;
  },

  updateSheet: (projectId, sheetId, updates) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId ? { ...s, ...updates, updatedAt: now } : s
              ),
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  deleteSheet: (projectId, sheetId) => {
    const now = Date.now();
    const project = get().projects.find((p) => p.id === projectId);

    // 마지막 시트를 삭제하는 경우 새 빈 시트 생성
    const isLastSheet = project?.sheets.length === 1;
    const newSheetId = isLastSheet ? uuidv4() : null;
    const newSheet: Sheet | null = isLastSheet ? {
      id: newSheetId!,
      name: '시트 1',
      columns: [],
      rows: [],
      stickers: [],
      createdAt: now,
      updatedAt: now,
    } : null;

    set((state) => {
      const newOpenTabs = state.openSheetTabs.filter((id) => id !== sheetId);
      return {
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                sheets: isLastSheet && newSheet
                  ? [newSheet]
                  : p.sheets.filter((s) => s.id !== sheetId),
                updatedAt: now,
              }
            : p
        ),
        openSheetTabs: isLastSheet && newSheetId
          ? [...newOpenTabs, newSheetId]
          : newOpenTabs,
        currentSheetId: state.currentSheetId === sheetId
          ? (isLastSheet ? newSheetId : (newOpenTabs.length > 0 ? newOpenTabs[newOpenTabs.length - 1] : null))
          : state.currentSheetId,
      };
    });
  },

  setCurrentSheet: (id) => {
    if (id) {
      // 시트를 선택하면 자동으로 탭 열기
      set((state) => ({
        currentSheetId: id,
        openSheetTabs: state.openSheetTabs.includes(id)
          ? state.openSheetTabs
          : [...state.openSheetTabs, id],
      }));
    } else {
      set({ currentSheetId: id });
    }
  },

  openSheetTab: (sheetId) => {
    set((state) => ({
      openSheetTabs: state.openSheetTabs.includes(sheetId)
        ? state.openSheetTabs
        : [...state.openSheetTabs, sheetId],
      currentSheetId: sheetId,
    }));
  },

  closeSheetTab: (sheetId) => {
    set((state) => {
      const newTabs = state.openSheetTabs.filter((id) => id !== sheetId);
      const needNewSelection = state.currentSheetId === sheetId;
      return {
        openSheetTabs: newTabs,
        currentSheetId: needNewSelection
          ? (newTabs.length > 0 ? newTabs[newTabs.length - 1] : null)
          : state.currentSheetId,
      };
    });
  },

  reorderOpenTabs: (fromIndex, toIndex) => {
    set((state) => {
      const tabs = [...state.openSheetTabs];
      const [removed] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, removed);
      return { openSheetTabs: tabs };
    });
  },

  duplicateSheet: (projectId, sheetId) => {
    const project = get().projects.find((p) => p.id === projectId);
    const sheet = project?.sheets.find((s) => s.id === sheetId);
    if (!sheet) return '';

    const newId = uuidv4();
    const now = Date.now();
    const newSheet: Sheet = {
      ...JSON.parse(JSON.stringify(sheet)),
      id: newId,
      name: `${sheet.name} (복사본)`,
      createdAt: now,
      updatedAt: now,
    };

    // 새로운 ID 할당
    newSheet.columns = newSheet.columns.map((col: Column) => ({ ...col, id: uuidv4() }));
    newSheet.rows = newSheet.rows.map((row: Row) => ({ ...row, id: uuidv4() }));

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, sheets: [...p.sheets, newSheet], updatedAt: now }
          : p
      ),
      openSheetTabs: [...state.openSheetTabs, newId],
      currentSheetId: newId,
    }));

    return newId;
  },

  reorderSheets: (projectId, fromIndex, toIndex) => {
    const now = Date.now();
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const sheets = [...p.sheets];
        const [removed] = sheets.splice(fromIndex, 1);
        sheets.splice(toIndex, 0, removed);
        return { ...p, sheets, updatedAt: now };
      }),
    }));
  },

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

  // 유틸리티
  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },

  getCurrentSheet: () => {
    const { projects, currentProjectId, currentSheetId } = get();
    const project = projects.find((p) => p.id === currentProjectId);
    return project?.sheets.find((s) => s.id === currentSheetId) || null;
  },

  getSheet: (projectId, sheetId) => {
    const { projects } = get();
    const project = projects.find((p) => p.id === projectId);
    return project?.sheets.find((s) => s.id === sheetId) || null;
  },

  setLastSaved: (timestamp) => {
    set({ lastSaved: timestamp });
  },

  // 행 선택 액션
  selectRow: (data) => {
    set((state) => {
      // 이미 선택된 행이면 무시
      if (state.selectedRows.some((r) => r.rowId === data.rowId)) {
        return state;
      }
      return { selectedRows: [...state.selectedRows, data] };
    });
  },

  deselectRow: (rowId) => {
    set((state) => ({
      selectedRows: state.selectedRows.filter((r) => r.rowId !== rowId),
    }));
  },

  clearSelectedRows: () => {
    set({ selectedRows: [] });
  },

  toggleRowSelection: (data) => {
    set((state) => {
      const isSelected = state.selectedRows.some((r) => r.rowId === data.rowId);
      if (isSelected) {
        return { selectedRows: state.selectedRows.filter((r) => r.rowId !== data.rowId) };
      }
      return { selectedRows: [...state.selectedRows, data] };
    });
  },

  // 스티커 액션
  addSticker: (projectId, sheetId, sticker) => {
    const id = uuidv4();
    const now = Date.now();
    const newSticker = { ...sticker, id, createdAt: now };

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      stickers: [...(s.stickers || []), newSticker],
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

  updateSticker: (projectId, sheetId, stickerId, updates) => {
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
                      stickers: (s.stickers || []).map((st) =>
                        st.id === stickerId ? { ...st, ...updates } : st
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

  deleteSticker: (projectId, sheetId, stickerId) => {
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
                      stickers: (s.stickers || []).filter((st) => st.id !== stickerId),
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
}));
