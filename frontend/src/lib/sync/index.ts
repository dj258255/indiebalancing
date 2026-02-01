/**
 * 동기화 레이어 모듈
 */

// 타입
export type {
  SyncMode,
  SyncStatus,
  SyncProvider,
  SyncOptions,
  SyncEvent,
  SyncEventType,
  UserPresence,
  CreateSyncProvider,
} from './types';

// Providers
export { LocalSyncProvider, getLocalSyncProvider } from './LocalSyncProvider';
export { CloudSyncProvider, getCloudSyncProvider } from './CloudSyncProvider';

// Hooks
export {
  useSyncProvider,
  useProjectSyncMode,
  useCollaborators,
  type UseSyncProviderOptions,
  type UseSyncProviderReturn,
} from './useSyncProvider';

export {
  useSyncedProjectStore,
  type UseSyncedProjectStoreOptions,
  type UseSyncedProjectStoreReturn,
} from './useSyncedProjectStore';
