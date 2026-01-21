import { create } from 'zustand';
import type { Project } from '@/types';

const MAX_HISTORY_SIZE = 50; // 최대 히스토리 개수

// 히스토리 항목 (라벨 포함)
export interface HistoryEntry {
  state: Project[];
  label: string;
  timestamp: number;
}

interface HistoryState {
  // 히스토리 스택
  past: HistoryEntry[];      // 이전 상태들
  future: HistoryEntry[];    // redo를 위한 미래 상태들
  currentIndex: number;      // 현재 위치 (UI 표시용)

  // 액션
  pushState: (projects: Project[], label?: string) => void;  // 새 상태 저장
  undo: () => Project[] | null;              // 실행 취소
  redo: () => Project[] | null;              // 다시 실행
  clear: () => void;                         // 히스토리 초기화
  jumpTo: (index: number) => Project[] | null; // 특정 시점으로 이동

  // 상태 확인
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistory: () => { past: HistoryEntry[]; future: HistoryEntry[]; currentIndex: number };
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  currentIndex: -1,

  pushState: (projects, label = '변경') => {
    set((state) => {
      // 깊은 복사로 스냅샷 저장
      const snapshot = JSON.parse(JSON.stringify(projects));

      // 이전 상태와 동일하면 저장하지 않음
      const lastEntry = state.past[state.past.length - 1];
      if (lastEntry && JSON.stringify(lastEntry.state) === JSON.stringify(snapshot)) {
        return state;
      }

      const entry: HistoryEntry = {
        state: snapshot,
        label,
        timestamp: Date.now(),
      };

      const newPast = [...state.past, entry];

      // 최대 크기 초과 시 오래된 것 제거
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }

      return {
        past: newPast,
        future: [], // 새 액션 시 future 초기화
        currentIndex: newPast.length - 1,
      };
    });
  },

  undo: () => {
    const { past, future } = get();

    if (past.length <= 1) return null; // 최소 1개는 유지 (현재 상태)

    const newPast = [...past];
    const current = newPast.pop()!; // 현재 상태
    const previous = newPast[newPast.length - 1]; // 이전 상태

    set({
      past: newPast,
      future: [current, ...future],
      currentIndex: newPast.length - 1,
    });

    return JSON.parse(JSON.stringify(previous.state));
  },

  redo: () => {
    const { past, future } = get();

    if (future.length === 0) return null;

    const newFuture = [...future];
    const next = newFuture.shift()!;

    set({
      past: [...past, next],
      future: newFuture,
      currentIndex: past.length,
    });

    return JSON.parse(JSON.stringify(next.state));
  },

  jumpTo: (index: number) => {
    const { past, future } = get();
    const allEntries = [...past, ...future];

    if (index < 0 || index >= allEntries.length) return null;

    const currentPastIndex = past.length - 1;

    if (index === currentPastIndex) return null; // 이미 현재 위치

    if (index < currentPastIndex) {
      // 과거로 이동
      const newPast = past.slice(0, index + 1);
      const newFuture = [...past.slice(index + 1), ...future];

      set({
        past: newPast,
        future: newFuture,
        currentIndex: index,
      });

      return JSON.parse(JSON.stringify(newPast[index].state));
    } else {
      // 미래로 이동
      const futureIndex = index - past.length;
      const newPast = [...past, ...future.slice(0, futureIndex + 1)];
      const newFuture = future.slice(futureIndex + 1);

      set({
        past: newPast,
        future: newFuture,
        currentIndex: index,
      });

      return JSON.parse(JSON.stringify(newPast[newPast.length - 1].state));
    }
  },

  clear: () => {
    set({ past: [], future: [], currentIndex: -1 });
  },

  canUndo: () => {
    return get().past.length > 1;
  },

  canRedo: () => {
    return get().future.length > 0;
  },

  getHistory: () => {
    const { past, future, currentIndex } = get();
    return { past, future, currentIndex };
  },
}));
