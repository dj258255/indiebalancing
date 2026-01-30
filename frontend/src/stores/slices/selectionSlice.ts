import { v4 as uuidv4 } from 'uuid';
import type { Sticker } from '@/types';
import type { StateCreator } from 'zustand';
import type { ProjectState, SelectedRowData, CellSelectionMode } from '../projectStore';

export interface SelectionSlice {
  // 상태
  selectedRows: SelectedRowData[];
  cellSelectionMode: CellSelectionMode;

  // 행 선택 액션
  selectRow: (data: SelectedRowData) => void;
  deselectRow: (rowId: string) => void;
  clearSelectedRows: () => void;
  toggleRowSelection: (data: SelectedRowData) => void;

  // 스티커 액션
  addSticker: (projectId: string, sheetId: string, sticker: Omit<Sticker, 'id' | 'createdAt'>) => string;
  updateSticker: (projectId: string, sheetId: string, stickerId: string, updates: Partial<Sticker>) => void;
  deleteSticker: (projectId: string, sheetId: string, stickerId: string) => void;

  // 셀 선택 모드 액션
  startCellSelection: (fieldLabel: string, callback: (value: number, rowId?: string, columnId?: string) => void) => void;
  completeCellSelection: (value: number, rowId?: string, columnId?: string) => void;
  cancelCellSelection: () => void;
}

export const createSelectionSlice: StateCreator<
  ProjectState,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selectedRows: [],
  cellSelectionMode: { active: false, fieldLabel: '', callback: null },

  // 행 선택 액션
  selectRow: (data) => {
    set((state) => {
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

  // 셀 선택 모드 액션
  startCellSelection: (fieldLabel, callback) => {
    set({
      cellSelectionMode: { active: true, fieldLabel, callback }
    });
  },

  completeCellSelection: (value, rowId, columnId) => {
    const { cellSelectionMode } = get();
    if (cellSelectionMode.callback) {
      cellSelectionMode.callback(value, rowId, columnId);
    }
    set({
      cellSelectionMode: { active: false, fieldLabel: '', callback: null }
    });
  },

  cancelCellSelection: () => {
    set({
      cellSelectionMode: { active: false, fieldLabel: '', callback: null }
    });
  },
});
