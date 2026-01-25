/**
 * React Hook for Game Data SDK
 *
 * Provides easy integration with the GameDataClient in React components.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { characters, items, isConnected, connect, disconnect } = useGameData({
 *     type: 'rest',
 *     endpoint: 'https://api.mygame.com',
 *   });
 *
 *   if (!isConnected) {
 *     return <button onClick={connect}>Connect to Game</button>;
 *   }
 *
 *   return (
 *     <ul>
 *       {characters.map(char => (
 *         <li key={char.id}>{char.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameDataClient,
  ConnectionConfig,
  CharacterData,
  ItemData,
  EconomyData,
  SyncResult,
} from './gameDataClient';

export interface UseGameDataOptions extends ConnectionConfig {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface UseGameDataReturn {
  // Data
  characters: CharacterData[];
  items: ItemData[];
  economy: EconomyData | null;

  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  syncToServer: (data: {
    characters?: CharacterData[];
    items?: ItemData[];
    economy?: EconomyData;
  }) => Promise<SyncResult | null>;

  // Client access for advanced usage
  client: GameDataClient | null;
}

export function useGameData(options: UseGameDataOptions): UseGameDataReturn {
  const clientRef = useRef<GameDataClient | null>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [economy, setEconomy] = useState<EconomyData | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new GameDataClient({
      type: options.type,
      endpoint: options.endpoint,
      apiKey: options.apiKey,
      refreshInterval: options.refreshInterval,
      headers: options.headers,
    });

    // Set up event listeners for real-time updates
    const client = clientRef.current;

    client.on('characters', (event) => {
      setCharacters(event.data as CharacterData[]);
    });

    client.on('items', (event) => {
      setItems(event.data as ItemData[]);
    });

    client.on('economy', (event) => {
      setEconomy(event.data as EconomyData);
    });

    // Auto-connect if specified
    if (options.autoConnect) {
      connect();
    }

    // Cleanup
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [options.endpoint, options.type]);

  // Connect
  const connect = useCallback(async (): Promise<boolean> => {
    if (!clientRef.current) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await clientRef.current.connect();
      setIsConnected(success);

      if (success) {
        // Fetch initial data
        await refresh();
        options.onConnect?.();
      }

      return success;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setIsConnected(false);
      setCharacters([]);
      setItems([]);
      setEconomy(null);
      options.onDisconnect?.();
    }
  }, [options]);

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    if (!clientRef.current || !isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const [chars, itms, eco] = await Promise.all([
        clientRef.current.fetchCharacters(),
        clientRef.current.fetchItems(),
        clientRef.current.fetchEconomyData(),
      ]);

      setCharacters(chars);
      setItems(itms);
      setEconomy(eco);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, options]);

  // Sync to server
  const syncToServer = useCallback(
    async (data: {
      characters?: CharacterData[];
      items?: ItemData[];
      economy?: EconomyData;
    }): Promise<SyncResult | null> => {
      if (!clientRef.current || !isConnected) return null;

      setIsLoading(true);
      setError(null);

      try {
        return await clientRef.current.syncToServer(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, options]
  );

  return {
    characters,
    items,
    economy,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    refresh,
    syncToServer,
    client: clientRef.current,
  };
}

/**
 * Hook for syncing local project data with game server
 */
export function useSyncWithGame(
  client: GameDataClient | null,
  options?: {
    onSyncComplete?: (result: SyncResult) => void;
    onSyncError?: (error: Error) => void;
  }
) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const sync = useCallback(
    async (data: {
      characters?: CharacterData[];
      items?: ItemData[];
      economy?: EconomyData;
    }) => {
      if (!client) return null;

      setIsSyncing(true);

      try {
        const result = await client.syncToServer(data);
        setLastSyncResult(result);
        options?.onSyncComplete?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        options?.onSyncError?.(error);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [client, options]
  );

  return {
    sync,
    isSyncing,
    lastSyncResult,
  };
}

export default useGameData;
