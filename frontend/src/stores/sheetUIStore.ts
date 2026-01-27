import { create } from 'zustand';
import type { CellStyle } from '@/types';

// 기본 셀 스타일 (스타일이 지정되지 않은 셀의 기본값)
export const DEFAULT_CELL_STYLE: CellStyle = {
  fontSize: 15,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  hAlign: 'center',
  vAlign: 'middle',
  textRotation: 0,
};

// Undo/Redo 히스토리 항목 (x-spreadsheet 패턴)
interface HistoryItem {
  type: 'cell' | 'row' | 'column' | 'sheet';
  data: string; // JSON 직렬화된 데이터
  timestamp: number;
}

interface SheetUIState {
  // 줌
  zoomLevel: number; // 0.5 ~ 2.0 (50% ~ 200%)

  // Undo/Redo 스택 (x-spreadsheet History 패턴)
  undoStack: HistoryItem[];
  redoStack: HistoryItem[];
  maxHistorySize: number;

  // 현재 선택된 셀들의 스타일 (툴바 상태 표시용)
  currentCellStyle: CellStyle;

  // 액션
  setZoom: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Undo/Redo (x-spreadsheet 패턴)
  pushHistory: (type: HistoryItem['type'], data: unknown) => void;
  undo: (getCurrentData: () => unknown, applyData: (data: unknown) => void) => void;
  redo: (getCurrentData: () => unknown, applyData: (data: unknown) => void) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // 셀 스타일
  setCurrentCellStyle: (style: CellStyle) => void;
  updateCurrentCellStyle: (updates: Partial<CellStyle>) => void;
}

// 줌 레벨 스텝
const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const useSheetUIStore = create<SheetUIState>((set, get) => ({
  // 초기 상태
  zoomLevel: 1.0,
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
  currentCellStyle: DEFAULT_CELL_STYLE,

  // 줌 액션
  setZoom: (level) => {
    const clampedLevel = Math.max(0.5, Math.min(2.0, level));
    set({ zoomLevel: clampedLevel });
  },

  zoomIn: () => {
    const { zoomLevel } = get();
    const currentIndex = ZOOM_LEVELS.findIndex((l) => l >= zoomLevel);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    set({ zoomLevel: ZOOM_LEVELS[nextIndex] });
  },

  zoomOut: () => {
    const { zoomLevel } = get();
    const currentIndex = ZOOM_LEVELS.findIndex((l) => l >= zoomLevel);
    const nextIndex = Math.max(currentIndex - 1, 0);
    set({ zoomLevel: ZOOM_LEVELS[nextIndex] });
  },

  // Undo/Redo 액션 (x-spreadsheet History 패턴)
  pushHistory: (type, data) => {
    const { undoStack, maxHistorySize } = get();
    const newItem: HistoryItem = {
      type,
      data: JSON.stringify(data),
      timestamp: Date.now(),
    };

    const newStack = [...undoStack, newItem];
    // 최대 크기 제한
    if (newStack.length > maxHistorySize) {
      newStack.shift();
    }

    set({
      undoStack: newStack,
      redoStack: [], // 새 액션 시 redo 스택 클리어
    });
  },

  undo: (getCurrentData, applyData) => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    // 현재 상태를 redo 스택에 저장
    const currentData = getCurrentData();
    const redoItem: HistoryItem = {
      type: 'sheet',
      data: JSON.stringify(currentData),
      timestamp: Date.now(),
    };

    // undo 스택에서 꺼내서 적용
    const undoItem = undoStack[undoStack.length - 1];
    const previousData = JSON.parse(undoItem.data);
    applyData(previousData);

    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, redoItem],
    });
  },

  redo: (getCurrentData, applyData) => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    // 현재 상태를 undo 스택에 저장
    const currentData = getCurrentData();
    const undoItem: HistoryItem = {
      type: 'sheet',
      data: JSON.stringify(currentData),
      timestamp: Date.now(),
    };

    // redo 스택에서 꺼내서 적용
    const redoItem = redoStack[redoStack.length - 1];
    const nextData = JSON.parse(redoItem.data);
    applyData(nextData);

    set({
      undoStack: [...undoStack, undoItem],
      redoStack: redoStack.slice(0, -1),
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearHistory: () => {
    set({ undoStack: [], redoStack: [] });
  },

  // 셀 스타일 액션
  setCurrentCellStyle: (style) => {
    // 기본값과 병합 (스타일이 없는 셀에도 기본 폰트 사이즈 등 표시)
    set({ currentCellStyle: { ...DEFAULT_CELL_STYLE, ...style } });
  },

  updateCurrentCellStyle: (updates) => {
    set((state) => ({
      currentCellStyle: { ...state.currentCellStyle, ...updates },
    }));
  },
}));
