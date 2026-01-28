import { v4 as uuidv4 } from 'uuid';
import type { Sheet, Column, CellValue } from '@/types';
import type { StateCreator } from 'zustand';
import type { ProjectState } from '../projectStore';

export interface SheetSlice {
  // 상태
  currentSheetId: string | null;
  openSheetTabs: string[];

  // 액션
  createSheet: (projectId: string, name: string, exportClassName?: string) => string;
  updateSheet: (projectId: string, sheetId: string, updates: Partial<Pick<Sheet, 'name' | 'exportClassName'>>) => void;
  deleteSheet: (projectId: string, sheetId: string) => void;
  setCurrentSheet: (id: string | null) => void;
  duplicateSheet: (projectId: string, sheetId: string) => string;
  reorderSheets: (projectId: string, fromIndex: number, toIndex: number) => void;
  moveSheetToProject: (fromProjectId: string, toProjectId: string, sheetId: string) => void;
  openSheetTab: (sheetId: string) => void;
  closeSheetTab: (sheetId: string) => void;
  reorderOpenTabs: (fromIndex: number, toIndex: number) => void;
  getCurrentSheet: () => Sheet | null;
  getSheet: (projectId: string, sheetId: string) => Sheet | null;
}

export const createSheetSlice: StateCreator<
  ProjectState,
  [],
  [],
  SheetSlice
> = (set, get) => ({
  currentSheetId: null,
  openSheetTabs: [],

  createSheet: (projectId, name, exportClassName) => {
    const id = uuidv4();
    const now = Date.now();
    const newSheet: Sheet = {
      id,
      name,
      columns: [],
      rows: [],
      exportClassName: exportClassName || undefined,
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

    set((state) => {
      const newOpenTabs = state.openSheetTabs.filter((id) => id !== sheetId);
      return {
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                sheets: p.sheets.filter((s) => s.id !== sheetId),
                updatedAt: now,
              }
            : p
        ),
        openSheetTabs: newOpenTabs,
        currentSheetId: state.currentSheetId === sheetId
          ? (newOpenTabs.length > 0 ? newOpenTabs[newOpenTabs.length - 1] : null)
          : state.currentSheetId,
      };
    });
  },

  setCurrentSheet: (id) => {
    if (id) {
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

    // 컬럼 ID 매핑 생성
    const columnIdMap: Record<string, string> = {};
    newSheet.columns = newSheet.columns.map((col: Column) => {
      const newColId = uuidv4();
      columnIdMap[col.id] = newColId;
      return { ...col, id: newColId };
    });

    // 행에 새 ID 할당하고 셀 데이터의 키도 업데이트
    newSheet.rows = newSheet.rows.map((row: { id: string; cells: Record<string, CellValue> }) => {
      const newCells: Record<string, CellValue> = {};
      Object.entries(row.cells).forEach(([oldColId, value]) => {
        const newColId = columnIdMap[oldColId];
        if (newColId) newCells[newColId] = value;
      });
      return { ...row, id: uuidv4(), cells: newCells };
    });

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

  moveSheetToProject: (fromProjectId, toProjectId, sheetId) => {
    const now = Date.now();
    const state = get();
    const fromProject = state.projects.find((p) => p.id === fromProjectId);
    const sheet = fromProject?.sheets.find((s) => s.id === sheetId);
    if (!sheet) return;

    set((state) => {
      const newOpenTabs = state.openSheetTabs.filter((id) => id !== sheetId);
      return {
        projects: state.projects.map((p) => {
          if (p.id === fromProjectId) {
            return {
              ...p,
              sheets: p.sheets.filter((s) => s.id !== sheetId),
              updatedAt: now,
            };
          }
          if (p.id === toProjectId) {
            return {
              ...p,
              sheets: [...p.sheets, { ...sheet, updatedAt: now }],
              updatedAt: now,
            };
          }
          return p;
        }),
        currentProjectId: toProjectId,
        currentSheetId: sheetId,
        openSheetTabs: [...newOpenTabs, sheetId],
      };
    });
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
});
