/**
 * Game Data SDK
 *
 * Provides tools for integrating PowerBalance with game backends.
 */

export {
  GameDataClient,
  createUnityClient,
  createUnrealClient,
  createGodotClient,
  sheetRowToCharacter,
  characterToSheetRow,
  type ConnectionType,
  type ConnectionConfig,
  type CharacterData,
  type ItemData,
  type SkillData,
  type EconomyData,
  type SyncResult,
  type DataEvent,
  type DataEventType,
} from './gameDataClient';

export {
  useGameData,
  useSyncWithGame,
  type UseGameDataOptions,
  type UseGameDataReturn,
} from './useGameData';
