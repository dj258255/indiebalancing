/**
 * LocalSyncProvider - 로컬 전용 동기화 Provider
 *
 * 서버 없이 IndexedDB/localStorage에 저장하는 현재 동작을 유지합니다.
 * 클라우드 모드로 전환할 때 이 Provider만 교체하면 됩니다.
 */

import type { Project } from '@/types';
import type {
  SyncProvider,
  SyncMode,
  SyncStatus,
  SyncOptions,
  UserPresence,
} from './types';

export class LocalSyncProvider implements SyncProvider {
  readonly mode: SyncMode = 'local';

  private _status: SyncStatus = 'disconnected';
  private _projects: Project[] = [];

  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private projectsListeners: Set<(projects: Project[]) => void> = new Set();
  private presenceListeners: Set<(users: UserPresence[]) => void> = new Set();

  get status(): SyncStatus {
    return this._status;
  }

  get roomId(): string | null {
    return null; // 로컬 모드에서는 룸이 없음
  }

  // 연결 (로컬 모드에서는 즉시 connected)
  async connect(_options?: SyncOptions): Promise<void> {
    this._status = 'connecting';
    this.notifyStatusChange();

    // 로컬 모드에서는 바로 연결됨
    await new Promise(resolve => setTimeout(resolve, 10)); // 비동기 시뮬레이션

    this._status = 'connected';
    this.notifyStatusChange();
  }

  disconnect(): void {
    this._status = 'disconnected';
    this.notifyStatusChange();
  }

  // 데이터 동기화
  getProjects(): Project[] {
    return this._projects;
  }

  setProjects(projects: Project[]): void {
    this._projects = projects;
    this.notifyProjectsChange();
  }

  updateProject(projectId: string, updates: Partial<Project>): void {
    this._projects = this._projects.map(p =>
      p.id === projectId ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    this.notifyProjectsChange();
  }

  // 이벤트 리스너
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  onProjectsChange(callback: (projects: Project[]) => void): () => void {
    this.projectsListeners.add(callback);
    return () => this.projectsListeners.delete(callback);
  }

  onPresenceChange(callback: (users: UserPresence[]) => void): () => void {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  // Presence (로컬 모드에서는 빈 배열)
  updatePresence(_presence: Partial<UserPresence>): void {
    // 로컬 모드에서는 무시
  }

  getPresence(): UserPresence[] {
    return []; // 로컬 모드에서는 다른 사용자 없음
  }

  // 정리
  destroy(): void {
    this.statusListeners.clear();
    this.projectsListeners.clear();
    this.presenceListeners.clear();
    this._status = 'disconnected';
  }

  // 내부 헬퍼
  private notifyStatusChange(): void {
    this.statusListeners.forEach(cb => cb(this._status));
  }

  private notifyProjectsChange(): void {
    this.projectsListeners.forEach(cb => cb(this._projects));
  }
}

// 싱글톤 인스턴스
let localProviderInstance: LocalSyncProvider | null = null;

export function getLocalSyncProvider(): LocalSyncProvider {
  if (!localProviderInstance) {
    localProviderInstance = new LocalSyncProvider();
  }
  return localProviderInstance;
}
