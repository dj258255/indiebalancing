import { v4 as uuidv4 } from 'uuid';
import type { Project, Sheet, CellValue, CellStyle, Column } from '@/types';
import type { StateCreator } from 'zustand';
import type { ProjectState } from '../projectStore';

export interface ProjectSlice {
  // 상태
  projects: Project[];
  currentProjectId: string | null;
  isLoading: boolean;
  lastSaved: number | null;

  // 액션
  createProject: (name: string, description?: string) => string;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => string;
  reorderProjects: (fromIndex: number, toIndex: number) => void;
  setCurrentProject: (id: string | null) => void;
  loadProjects: (projects: Project[]) => void;
  getCurrentProject: () => Project | null;
  setLastSaved: (timestamp: number) => void;
}

export const createProjectSlice: StateCreator<
  ProjectState,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  projects: [],
  currentProjectId: null,
  isLoading: false,
  lastSaved: null,

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

  duplicateProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return '';

    const newProjectId = uuidv4();
    const now = Date.now();

    // 시트를 복제하면서 컬럼 ID와 행 ID 모두 새로 생성
    const newSheets: Sheet[] = project.sheets.map((sheet) => {
      const newSheetId = uuidv4();

      // 컬럼 ID 매핑 생성
      const columnIdMap: Record<string, string> = {};
      const newColumns = sheet.columns.map((col) => {
        const newColId = uuidv4();
        columnIdMap[col.id] = newColId;
        return { ...col, id: newColId };
      });

      // 행 복제
      const newRows = sheet.rows.map((row) => {
        const newCells: Record<string, CellValue> = {};
        const newCellStyles: Record<string, CellStyle> = {};
        const newCellMemos: Record<string, string> = {};

        Object.entries(row.cells).forEach(([oldColId, value]) => {
          const newColId = columnIdMap[oldColId];
          if (newColId) newCells[newColId] = value;
        });

        if (row.cellStyles) {
          Object.entries(row.cellStyles).forEach(([oldColId, style]) => {
            const newColId = columnIdMap[oldColId];
            if (newColId) newCellStyles[newColId] = style;
          });
        }

        if (row.cellMemos) {
          Object.entries(row.cellMemos).forEach(([oldColId, memo]) => {
            const newColId = columnIdMap[oldColId];
            if (newColId) newCellMemos[newColId] = memo;
          });
        }

        return {
          ...row,
          id: uuidv4(),
          cells: newCells,
          cellStyles: Object.keys(newCellStyles).length > 0 ? newCellStyles : undefined,
          cellMemos: Object.keys(newCellMemos).length > 0 ? newCellMemos : undefined,
        };
      });

      // 스티커 복제
      const newStickers = (sheet.stickers || []).map((sticker) => ({
        ...sticker,
        id: uuidv4(),
        createdAt: now,
      }));

      return {
        ...sheet,
        id: newSheetId,
        columns: newColumns,
        rows: newRows,
        stickers: newStickers,
        createdAt: now,
        updatedAt: now,
      };
    });

    const newProject: Project = {
      id: newProjectId,
      name: `${project.name} (복사본)`,
      description: project.description,
      createdAt: now,
      updatedAt: now,
      sheets: newSheets,
    };

    set((state) => ({
      projects: [...state.projects, newProject],
      currentProjectId: newProjectId,
      currentSheetId: newSheets.length > 0 ? newSheets[0].id : null,
      openSheetTabs: newSheets.length > 0 ? [newSheets[0].id] : [],
    }));

    return newProjectId;
  },

  reorderProjects: (fromIndex, toIndex) => {
    set((state) => {
      const projects = [...state.projects];
      const [removed] = projects.splice(fromIndex, 1);
      projects.splice(toIndex, 0, removed);
      return { projects };
    });
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id, currentSheetId: null });
  },

  loadProjects: (projects) => {
    set({ projects });
  },

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },

  setLastSaved: (timestamp) => {
    set({ lastSaved: timestamp });
  },
});
