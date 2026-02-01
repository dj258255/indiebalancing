/**
 * useSyncedProjectStore - projectStore와 SyncProvider를 연결하는 훅
 *
 * 이 훅은 기존 projectStore를 그대로 유지하면서,
 * 클라우드 모드일 때만 SyncProvider와 양방향 동기화를 수행합니다.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import type { Project, ProjectSyncMode } from '@/types';
import { useSyncProvider } from './useSyncProvider';
import type { SyncStatus, UserPresence } from './types';

export interface UseSyncedProjectStoreOptions {
  // 전역 동기화 모드 (개별 프로젝트 설정보다 우선)
  globalSyncMode?: ProjectSyncMode;
  // 클라우드 서버 URL
  serverUrl?: string;
  // 사용자 정보
  userName?: string;
  userColor?: string;
}

export interface UseSyncedProjectStoreReturn {
  // 동기화 상태
  syncStatus: SyncStatus;
  isCloudMode: boolean;
  collaborators: UserPresence[];

  // 클라우드 모드 전환
  enableCloudSync: (roomId: string) => void;
  disableCloudSync: () => void;

  // 현재 프로젝트의 협업 상태
  currentProjectSyncMode: ProjectSyncMode;
  currentProjectRoomId: string | null;

  // Presence 업데이트
  updateMyPresence: (presence: Partial<UserPresence>) => void;
}

export function useSyncedProjectStore(
  options: UseSyncedProjectStoreOptions = {}
): UseSyncedProjectStoreReturn {
  const { globalSyncMode, serverUrl, userName, userColor } = options;

  // Store 상태
  const projects = useProjectStore(state => state.projects);
  const currentProjectId = useProjectStore(state => state.currentProjectId);
  const loadProjects = useProjectStore(state => state.loadProjects);
  const updateProject = useProjectStore(state => state.updateProject);

  // 현재 프로젝트
  const currentProject = projects.find(p => p.id === currentProjectId);
  const projectSyncMode = globalSyncMode ?? currentProject?.syncMode ?? 'local';
  const projectRoomId = currentProject?.syncRoomId ?? null;

  // Sync Provider
  const {
    status: syncStatus,
    presence: collaborators,
    setProjects: syncSetProjects,
    updateMyPresence,
  } = useSyncProvider({
    mode: projectSyncMode,
    roomId: projectRoomId ?? undefined,
    serverUrl,
    userName,
    userColor,
    autoConnect: projectSyncMode === 'cloud' && !!projectRoomId,
  });

  // 중복 동기화 방지를 위한 ref
  const isSyncingRef = useRef(false);
  const lastSyncedRef = useRef<string>('');

  // Store -> SyncProvider 동기화 (로컬 변경 시)
  useEffect(() => {
    if (projectSyncMode !== 'cloud' || isSyncingRef.current) return;

    const projectsHash = JSON.stringify(projects.map(p => ({ id: p.id, updatedAt: p.updatedAt })));
    if (projectsHash === lastSyncedRef.current) return;

    lastSyncedRef.current = projectsHash;
    syncSetProjects(projects);
  }, [projects, projectSyncMode, syncSetProjects]);

  // 클라우드 모드 활성화
  const enableCloudSync = useCallback((roomId: string) => {
    if (!currentProjectId) return;

    updateProject(currentProjectId, {
      syncMode: 'cloud',
      syncRoomId: roomId,
    });
  }, [currentProjectId, updateProject]);

  // 클라우드 모드 비활성화
  const disableCloudSync = useCallback(() => {
    if (!currentProjectId) return;

    updateProject(currentProjectId, {
      syncMode: 'local',
      syncRoomId: undefined,
    });
  }, [currentProjectId, updateProject]);

  return {
    syncStatus,
    isCloudMode: projectSyncMode === 'cloud',
    collaborators,
    enableCloudSync,
    disableCloudSync,
    currentProjectSyncMode: projectSyncMode,
    currentProjectRoomId: projectRoomId,
    updateMyPresence,
  };
}
