/**
 * useSyncProvider - 동기화 Provider를 React에서 사용하기 위한 훅
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Project } from '@/types';
import type { SyncProvider, SyncMode, SyncStatus, SyncOptions, UserPresence } from './types';
import { LocalSyncProvider } from './LocalSyncProvider';

// Provider 캐시
const providerCache = new Map<string, SyncProvider>();

function createProvider(mode: SyncMode, _options?: SyncOptions): SyncProvider {
  if (mode === 'local') {
    return new LocalSyncProvider();
  }

  // TODO: 클라우드 모드 구현 시 YjsSyncProvider 반환
  // if (mode === 'cloud') {
  //   return new YjsSyncProvider(options);
  // }

  throw new Error(`Unknown sync mode: ${mode}`);
}

function getOrCreateProvider(mode: SyncMode, roomId?: string, options?: SyncOptions): SyncProvider {
  const key = mode === 'cloud' && roomId ? `cloud:${roomId}` : 'local';

  if (!providerCache.has(key)) {
    providerCache.set(key, createProvider(mode, options));
  }

  return providerCache.get(key)!;
}

export interface UseSyncProviderOptions {
  mode?: SyncMode;
  roomId?: string;
  autoConnect?: boolean;
  serverUrl?: string;
  userName?: string;
  userColor?: string;
}

export interface UseSyncProviderReturn {
  // 상태
  provider: SyncProvider;
  status: SyncStatus;
  isConnected: boolean;
  isConnecting: boolean;

  // Presence
  presence: UserPresence[];

  // 액션
  connect: () => Promise<void>;
  disconnect: () => void;

  // 데이터
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;

  // Presence 업데이트
  updateMyPresence: (presence: Partial<UserPresence>) => void;
}

export function useSyncProvider(options: UseSyncProviderOptions = {}): UseSyncProviderReturn {
  const {
    mode = 'local',
    roomId,
    autoConnect = true,
    serverUrl,
    userName,
    userColor,
  } = options;

  // Provider 인스턴스
  const provider = useMemo(
    () => getOrCreateProvider(mode, roomId, { serverUrl, userName, userColor }),
    [mode, roomId, serverUrl, userName, userColor]
  );

  // 상태
  const [status, setStatus] = useState<SyncStatus>(provider.status);
  const [projects, setProjectsState] = useState<Project[]>(provider.getProjects());
  const [presence, setPresence] = useState<UserPresence[]>(provider.getPresence());

  // 이벤트 구독
  useEffect(() => {
    const unsubStatus = provider.onStatusChange(setStatus);
    const unsubProjects = provider.onProjectsChange(setProjectsState);
    const unsubPresence = provider.onPresenceChange(setPresence);

    return () => {
      unsubStatus();
      unsubProjects();
      unsubPresence();
    };
  }, [provider]);

  // 자동 연결
  useEffect(() => {
    if (autoConnect && status === 'disconnected') {
      provider.connect({ serverUrl, roomId, userName, userColor });
    }
  }, [autoConnect, status, provider, serverUrl, roomId, userName, userColor]);

  // 액션
  const connect = useCallback(async () => {
    await provider.connect({ serverUrl, roomId, userName, userColor });
  }, [provider, serverUrl, roomId, userName, userColor]);

  const disconnect = useCallback(() => {
    provider.disconnect();
  }, [provider]);

  const setProjects = useCallback((newProjects: Project[]) => {
    provider.setProjects(newProjects);
  }, [provider]);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    provider.updateProject(projectId, updates);
  }, [provider]);

  const updateMyPresence = useCallback((presenceUpdate: Partial<UserPresence>) => {
    provider.updatePresence(presenceUpdate);
  }, [provider]);

  return {
    provider,
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    presence,
    connect,
    disconnect,
    projects,
    setProjects,
    updateProject,
    updateMyPresence,
  };
}

// 편의 훅: 현재 프로젝트의 동기화 모드 확인
export function useProjectSyncMode(project: Project | null): SyncMode {
  // TODO: Project에 syncMode 필드 추가 후 사용
  // return project?.syncMode ?? 'local';
  return 'local';
}

// 편의 훅: 협업 사용자 목록
export function useCollaborators(roomId?: string): UserPresence[] {
  const { presence } = useSyncProvider({ mode: roomId ? 'cloud' : 'local', roomId });
  return presence;
}
