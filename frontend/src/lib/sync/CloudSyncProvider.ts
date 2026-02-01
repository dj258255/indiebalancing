/**
 * CloudSyncProvider - 클라우드 백엔드 연동 Provider
 *
 * 자바 백엔드 API와 WebSocket을 통해 실시간 협업 지원
 */

import type { Project } from '@/types';
import type {
  SyncProvider,
  SyncMode,
  SyncStatus,
  SyncOptions,
  UserPresence,
} from './types';

// Operation 타입 (서버와 주고받는 변경사항)
export interface Operation {
  type: string;
  path: string;
  value?: unknown;
  index?: number;
  timestamp: number;
}

// WebSocket 메시지 타입
type WSMessageType =
  | 'JOIN'
  | 'LEAVE'
  | 'OPERATION'
  | 'PRESENCE'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'USERS';

interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
}

export class CloudSyncProvider implements SyncProvider {
  readonly mode: SyncMode = 'cloud';

  private _status: SyncStatus = 'disconnected';
  private _roomId: string | null = null;
  private _options: SyncOptions | null = null;
  private _projects: Project[] = [];
  private _version: number = 0;
  private _presence: UserPresence[] = [];

  // WebSocket
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  // 인증
  private accessToken: string | null = null;

  // 리스너
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private projectsListeners: Set<(projects: Project[]) => void> = new Set();
  private presenceListeners: Set<(users: UserPresence[]) => void> = new Set();

  // Pending operations (오프라인 중 쌓인 변경사항)
  private pendingOperations: Operation[] = [];

  get status(): SyncStatus {
    return this._status;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  /**
   * 인증 토큰 설정
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * 서버 연결
   */
  async connect(options?: SyncOptions): Promise<void> {
    this._options = options ?? null;
    this._roomId = options?.roomId ?? null;

    if (!options?.serverUrl) {
      console.error('CloudSyncProvider: serverUrl is required');
      this._status = 'error';
      this.notifyStatusChange();
      return;
    }

    this._status = 'connecting';
    this.notifyStatusChange();

    try {
      // 1. 프로젝트 데이터 로드 (REST API)
      if (this._roomId) {
        await this.fetchProject(this._roomId);
      }

      // 2. WebSocket 연결
      this.connectWebSocket();

    } catch (error) {
      console.error('CloudSyncProvider: Connection failed', error);
      this._status = 'error';
      this.notifyStatusChange();
    }
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    this.closeWebSocket();
    this._status = 'disconnected';
    this._roomId = null;
    this.reconnectAttempts = 0;
    this.notifyStatusChange();
  }

  /**
   * 프로젝트 목록 반환
   */
  getProjects(): Project[] {
    return this._projects;
  }

  /**
   * 프로젝트 설정 (전체 덮어쓰기)
   */
  setProjects(projects: Project[]): void {
    this._projects = projects;
    this.notifyProjectsChange();

    // 서버에 전체 동기화
    if (this._roomId && this._status === 'connected') {
      this.saveProjectToServer();
    }
  }

  /**
   * 프로젝트 부분 업데이트
   */
  updateProject(projectId: string, updates: Partial<Project>): void {
    const index = this._projects.findIndex(p => p.id === projectId);
    if (index === -1) return;

    this._projects[index] = {
      ...this._projects[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.notifyProjectsChange();

    // Operation 생성 및 전송
    const operation: Operation = {
      type: 'UPDATE_PROJECT',
      path: `projects[${index}]`,
      value: updates,
      timestamp: Date.now(),
    };

    this.sendOperation(operation);
  }

  /**
   * 상태 변경 리스너
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * 프로젝트 변경 리스너
   */
  onProjectsChange(callback: (projects: Project[]) => void): () => void {
    this.projectsListeners.add(callback);
    return () => this.projectsListeners.delete(callback);
  }

  /**
   * Presence 변경 리스너
   */
  onPresenceChange(callback: (users: UserPresence[]) => void): () => void {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  /**
   * 내 Presence 업데이트
   */
  updatePresence(presence: Partial<UserPresence>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WSMessage = {
      type: 'PRESENCE',
      payload: {
        ...presence,
        lastActive: Date.now(),
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * 현재 Presence 목록
   */
  getPresence(): UserPresence[] {
    return this._presence;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.disconnect();
    this.statusListeners.clear();
    this.projectsListeners.clear();
    this.presenceListeners.clear();
    this.pendingOperations = [];
  }

  // ============================================
  // Private Methods - REST API
  // ============================================

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private async fetchProject(projectId: string): Promise<void> {
    const serverUrl = this._options?.serverUrl;
    if (!serverUrl) return;

    const response = await fetch(`${serverUrl}/api/projects/${projectId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.status}`);
    }

    const data = await response.json();
    this._version = data.version ?? 0;

    // data.data에 실제 프로젝트 데이터가 있다고 가정
    if (data.data) {
      const project: Project = {
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: new Date(data.createdAt).getTime(),
        updatedAt: new Date(data.updatedAt).getTime(),
        sheets: data.data.sheets ?? [],
        folders: data.data.folders ?? [],
        syncMode: 'cloud',
        syncRoomId: projectId,
      };
      this._projects = [project];
      this.notifyProjectsChange();
    }
  }

  private async saveProjectToServer(): Promise<void> {
    const serverUrl = this._options?.serverUrl;
    const projectId = this._roomId;
    if (!serverUrl || !projectId) return;

    const project = this._projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      const response = await fetch(`${serverUrl}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: project.name,
          description: project.description,
          data: {
            sheets: project.sheets,
            folders: project.folders,
          },
          baseVersion: this._version,
        }),
      });

      if (response.status === 409) {
        // 버전 충돌 - 서버 데이터로 새로고침
        console.warn('CloudSyncProvider: Version conflict, refreshing...');
        await this.fetchProject(projectId);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to save project: ${response.status}`);
      }

      const data = await response.json();
      this._version = data.version;

    } catch (error) {
      console.error('CloudSyncProvider: Failed to save project', error);
    }
  }

  // ============================================
  // Private Methods - WebSocket
  // ============================================

  private connectWebSocket(): void {
    const serverUrl = this._options?.serverUrl;
    const projectId = this._roomId;
    if (!serverUrl || !projectId) return;

    // HTTP URL을 WebSocket URL로 변환
    const wsUrl = serverUrl.replace(/^http/, 'ws');
    const url = new URL(`${wsUrl}/ws/projects/${projectId}`);

    if (this.accessToken) {
      url.searchParams.set('token', this.accessToken);
    }

    this.ws = new WebSocket(url.toString());

    this.ws.onopen = () => {
      console.log('CloudSyncProvider: WebSocket connected');
      this._status = 'connected';
      this.reconnectAttempts = 0;
      this.notifyStatusChange();

      // Join 메시지 전송
      this.sendJoinMessage();

      // Pending operations 전송
      this.flushPendingOperations();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.handleWSMessage(message);
      } catch (error) {
        console.error('CloudSyncProvider: Failed to parse message', error);
      }
    };

    this.ws.onclose = () => {
      console.log('CloudSyncProvider: WebSocket closed');
      this.ws = null;

      if (this._status !== 'disconnected') {
        this._status = 'connecting';
        this.notifyStatusChange();
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('CloudSyncProvider: WebSocket error', error);
    };
  }

  private closeWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      // Leave 메시지 전송
      if (this.ws.readyState === WebSocket.OPEN) {
        const message: WSMessage = { type: 'LEAVE', payload: {} };
        this.ws.send(JSON.stringify(message));
      }
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('CloudSyncProvider: Max reconnect attempts reached');
      this._status = 'error';
      this.notifyStatusChange();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`CloudSyncProvider: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  private sendJoinMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WSMessage = {
      type: 'JOIN',
      payload: {
        userName: this._options?.userName ?? 'Anonymous',
        userColor: this._options?.userColor ?? '#' + Math.floor(Math.random() * 16777215).toString(16),
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  private handleWSMessage(message: WSMessage): void {
    switch (message.type) {
      case 'USER_JOINED': {
        const user = message.payload as UserPresence;
        this._presence = [...this._presence.filter(u => u.odatuserId !== user.odatuserId), user];
        this.notifyPresenceChange();
        break;
      }

      case 'USER_LEFT': {
        const { userId } = message.payload as { userId: string };
        this._presence = this._presence.filter(u => u.odatuserId !== userId);
        this.notifyPresenceChange();
        break;
      }

      case 'USERS': {
        const { users } = message.payload as { users: UserPresence[] };
        this._presence = users;
        this.notifyPresenceChange();
        break;
      }

      case 'OPERATION': {
        const { version, operations } = message.payload as {
          userId: string;
          version: number;
          operations: Operation[];
        };
        this._version = version;
        this.applyOperations(operations);
        break;
      }

      case 'PRESENCE': {
        const presence = message.payload as UserPresence;
        const index = this._presence.findIndex(u => u.odatuserId === presence.odatuserId);
        if (index >= 0) {
          this._presence[index] = { ...this._presence[index], ...presence };
        } else {
          this._presence.push(presence);
        }
        this.notifyPresenceChange();
        break;
      }
    }
  }

  private sendOperation(operation: Operation): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 오프라인이면 pending에 저장
      this.pendingOperations.push(operation);
      return;
    }

    const message: WSMessage = {
      type: 'OPERATION',
      payload: {
        baseVersion: this._version,
        operations: [operation],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  private flushPendingOperations(): void {
    if (this.pendingOperations.length === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WSMessage = {
      type: 'OPERATION',
      payload: {
        baseVersion: this._version,
        operations: this.pendingOperations,
      },
    };

    this.ws.send(JSON.stringify(message));
    this.pendingOperations = [];
  }

  private applyOperations(operations: Operation[]): void {
    // TODO: 각 operation 타입에 따라 로컬 데이터 업데이트
    // 현재는 단순히 서버에서 전체 데이터를 다시 가져옴
    if (this._roomId) {
      this.fetchProject(this._roomId);
    }
  }

  // ============================================
  // Private Methods - Notifications
  // ============================================

  private notifyStatusChange(): void {
    this.statusListeners.forEach(cb => cb(this._status));
  }

  private notifyProjectsChange(): void {
    this.projectsListeners.forEach(cb => cb(this._projects));
  }

  private notifyPresenceChange(): void {
    this.presenceListeners.forEach(cb => cb(this._presence));
  }
}

// 싱글톤 인스턴스 (선택적)
let cloudProviderInstance: CloudSyncProvider | null = null;

export function getCloudSyncProvider(): CloudSyncProvider {
  if (!cloudProviderInstance) {
    cloudProviderInstance = new CloudSyncProvider();
  }
  return cloudProviderInstance;
}
