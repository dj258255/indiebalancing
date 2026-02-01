/**
 * 동기화 레이어 타입 정의
 * 로컬/클라우드 모드를 추상화하여 나중에 CRDT로 쉽게 전환 가능
 */

import type { Project } from '@/types';

// 동기화 모드
export type SyncMode = 'local' | 'cloud';

// 동기화 상태
export type SyncStatus =
  | 'disconnected'  // 연결 안됨
  | 'connecting'    // 연결 중
  | 'connected'     // 연결됨
  | 'syncing'       // 동기화 중
  | 'error';        // 오류

// Presence (다른 사용자 상태)
export interface UserPresence {
  odatuserId: string;
  userName: string;
  userColor: string;
  cursor?: {
    sheetId: string;
    rowId?: string;
    columnId?: string;
  };
  selection?: {
    sheetId: string;
    rowIds: string[];
    columnIds: string[];
  };
  lastActive: number;
}

// 동기화 이벤트 타입
export type SyncEventType =
  | 'project:update'
  | 'sheet:update'
  | 'row:update'
  | 'cell:update'
  | 'presence:update'
  | 'user:join'
  | 'user:leave';

// 동기화 이벤트
export interface SyncEvent<T = unknown> {
  type: SyncEventType;
  payload: T;
  userId: string;
  timestamp: number;
}

// 동기화 옵션
export interface SyncOptions {
  serverUrl?: string;       // 클라우드 모드시 서버 URL
  roomId?: string;          // 협업 룸 ID
  userId?: string;          // 현재 사용자 ID
  userName?: string;        // 현재 사용자 이름
  userColor?: string;       // 현재 사용자 색상
  autoReconnect?: boolean;  // 자동 재연결
  reconnectInterval?: number; // 재연결 간격 (ms)
}

// 동기화 Provider 인터페이스
export interface SyncProvider {
  // 상태
  readonly mode: SyncMode;
  readonly status: SyncStatus;
  readonly roomId: string | null;

  // 연결
  connect(options?: SyncOptions): Promise<void>;
  disconnect(): void;

  // 데이터 동기화
  getProjects(): Project[];
  setProjects(projects: Project[]): void;
  updateProject(projectId: string, updates: Partial<Project>): void;

  // 이벤트 리스너
  onStatusChange(callback: (status: SyncStatus) => void): () => void;
  onProjectsChange(callback: (projects: Project[]) => void): () => void;
  onPresenceChange(callback: (users: UserPresence[]) => void): () => void;

  // Presence (클라우드 모드 전용)
  updatePresence(presence: Partial<UserPresence>): void;
  getPresence(): UserPresence[];

  // 유틸리티
  destroy(): void;
}

// Provider 생성 함수 타입
export type CreateSyncProvider = (mode: SyncMode, options?: SyncOptions) => SyncProvider;
