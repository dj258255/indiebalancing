/**
 * Game Data SDK Client
 *
 * This module provides a standardized interface for connecting to game backends
 * and retrieving balance data in real-time. It supports multiple connection types:
 *
 * 1. REST API - Standard HTTP endpoints
 * 2. WebSocket - Real-time bidirectional communication
 * 3. Firebase - Realtime Database integration
 * 4. Custom SDK - Game-specific implementations
 *
 * Usage:
 * ```typescript
 * const client = new GameDataClient({
 *   type: 'rest',
 *   endpoint: 'https://api.mygame.com/balance',
 *   apiKey: 'YOUR_API_KEY'
 * });
 *
 * const characters = await client.fetchCharacters();
 * const items = await client.fetchItems();
 * ```
 */

export type ConnectionType = 'rest' | 'websocket' | 'firebase' | 'custom';

export interface ConnectionConfig {
  type: ConnectionType;
  endpoint: string;
  apiKey?: string;
  refreshInterval?: number; // milliseconds
  headers?: Record<string, string>;
}

export interface CharacterData {
  id: string;
  name: string;
  stats: {
    hp: number;
    atk: number;
    def: number;
    speed: number;
    critRate?: number;
    critDamage?: number;
    [key: string]: number | undefined;
  };
  skills?: SkillData[];
  tier?: string;
  rarity?: string;
}

export interface ItemData {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material';
  stats: Record<string, number>;
  rarity?: string;
  dropRate?: number;
  price?: number;
}

export interface SkillData {
  id: string;
  name: string;
  damage?: number;
  cooldown?: number;
  manaCost?: number;
  effects?: string[];
}

export interface EconomyData {
  currencyName: string;
  faucets: {
    source: string;
    amountPerDay: number;
  }[];
  sinks: {
    destination: string;
    amountPerDay: number;
  }[];
}

export interface SyncResult {
  success: boolean;
  itemsUpdated: number;
  errors: string[];
  timestamp: Date;
}

// Event types for real-time updates
export type DataEventType = 'characters' | 'items' | 'economy' | 'skills' | 'all';

export interface DataEvent {
  type: DataEventType;
  data: CharacterData[] | ItemData[] | EconomyData | SkillData[];
  timestamp: Date;
}

type DataEventHandler = (event: DataEvent) => void;

/**
 * Main SDK Client Class
 */
export class GameDataClient {
  private config: ConnectionConfig;
  private isConnected: boolean = false;
  private listeners: Map<DataEventType, DataEventHandler[]> = new Map();
  private ws: WebSocket | null = null;
  private refreshTimer: number | null = null;

  constructor(config: ConnectionConfig) {
    this.config = {
      refreshInterval: 30000, // Default 30 seconds
      ...config,
    };
  }

  /**
   * Connect to the data source
   */
  async connect(): Promise<boolean> {
    try {
      switch (this.config.type) {
        case 'websocket':
          await this.connectWebSocket();
          break;
        case 'rest':
          await this.testRestConnection();
          break;
        case 'firebase':
          await this.connectFirebase();
          break;
        case 'custom':
          // Custom implementations should override this
          break;
      }

      this.isConnected = true;

      // Start auto-refresh for REST connections
      if (this.config.type === 'rest' && this.config.refreshInterval) {
        this.startAutoRefresh();
      }

      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from the data source
   */
  disconnect(): void {
    this.isConnected = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Fetch all characters from the game
   */
  async fetchCharacters(): Promise<CharacterData[]> {
    if (!this.isConnected) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Placeholder implementation - returns sample data
    return this.mockFetch<CharacterData[]>('characters', [
      {
        id: 'char_001',
        name: 'Warrior',
        stats: { hp: 1000, atk: 150, def: 80, speed: 1.2, critRate: 0.1, critDamage: 1.5 },
        tier: 'A',
      },
      {
        id: 'char_002',
        name: 'Mage',
        stats: { hp: 600, atk: 200, def: 30, speed: 1.0, critRate: 0.2, critDamage: 2.0 },
        tier: 'S',
      },
      {
        id: 'char_003',
        name: 'Tank',
        stats: { hp: 2000, atk: 80, def: 150, speed: 0.8, critRate: 0.05, critDamage: 1.2 },
        tier: 'A',
      },
    ]);
  }

  /**
   * Fetch all items from the game
   */
  async fetchItems(): Promise<ItemData[]> {
    if (!this.isConnected) {
      throw new Error('Not connected. Call connect() first.');
    }

    return this.mockFetch<ItemData[]>('items', [
      {
        id: 'item_001',
        name: 'Iron Sword',
        type: 'weapon',
        stats: { atk: 50 },
        rarity: 'common',
        price: 100,
      },
      {
        id: 'item_002',
        name: 'Steel Armor',
        type: 'armor',
        stats: { def: 40, hp: 100 },
        rarity: 'uncommon',
        price: 250,
      },
    ]);
  }

  /**
   * Fetch economy data
   */
  async fetchEconomyData(): Promise<EconomyData> {
    if (!this.isConnected) {
      throw new Error('Not connected. Call connect() first.');
    }

    return this.mockFetch<EconomyData>('economy', {
      currencyName: 'Gold',
      faucets: [
        { source: 'Quest Rewards', amountPerDay: 5000 },
        { source: 'Daily Login', amountPerDay: 1000 },
        { source: 'Monster Drops', amountPerDay: 3000 },
      ],
      sinks: [
        { destination: 'Equipment Upgrade', amountPerDay: 4000 },
        { destination: 'Shop Purchases', amountPerDay: 2500 },
        { destination: 'Skill Training', amountPerDay: 1500 },
      ],
    });
  }

  /**
   * Subscribe to real-time data updates
   */
  on(eventType: DataEventType, handler: DataEventHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from data updates
   */
  off(eventType: DataEventType, handler: DataEventHandler): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Push local changes back to the game server
   */
  async syncToServer(data: {
    characters?: CharacterData[];
    items?: ItemData[];
    economy?: EconomyData;
  }): Promise<SyncResult> {
    if (!this.isConnected) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Placeholder - actual implementation would POST to the API
    console.log('Syncing data to server:', data);

    return {
      success: true,
      itemsUpdated:
        (data.characters?.length || 0) +
        (data.items?.length || 0) +
        (data.economy ? 1 : 0),
      errors: [],
      timestamp: new Date(),
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; type: ConnectionType; endpoint: string } {
    return {
      connected: this.isConnected,
      type: this.config.type,
      endpoint: this.config.endpoint,
    };
  }

  // Private helper methods

  private async mockFetch<T>(resource: string, defaultData: T): Promise<T> {
    // In production, this would make actual API calls
    // For now, return mock data after a small delay to simulate network
    await new Promise(resolve => setTimeout(resolve, 100));
    return defaultData;
  }

  private async testRestConnection(): Promise<void> {
    // Would normally ping the API endpoint
    console.log(`Testing REST connection to ${this.config.endpoint}`);
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.endpoint);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          resolve();
        };

        this.ws.onerror = (error) => {
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as DataEvent;
            this.emit(data.type, data);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async connectFirebase(): Promise<void> {
    // Firebase implementation placeholder
    console.log('Connecting to Firebase...');
  }

  private startAutoRefresh(): void {
    this.refreshTimer = window.setInterval(async () => {
      try {
        const [characters, items, economy] = await Promise.all([
          this.fetchCharacters(),
          this.fetchItems(),
          this.fetchEconomyData(),
        ]);

        this.emit('characters', { type: 'characters', data: characters, timestamp: new Date() });
        this.emit('items', { type: 'items', data: items, timestamp: new Date() });
        this.emit('economy', { type: 'economy', data: economy, timestamp: new Date() });
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, this.config.refreshInterval);
  }

  private emit(eventType: DataEventType, event: DataEvent): void {
    const handlers = this.listeners.get(eventType) || [];
    const allHandlers = this.listeners.get('all') || [];

    [...handlers, ...allHandlers].forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });
  }
}

/**
 * Create a pre-configured client for common game engines
 */
export function createUnityClient(endpoint: string, apiKey: string): GameDataClient {
  return new GameDataClient({
    type: 'rest',
    endpoint,
    apiKey,
    headers: {
      'X-Unity-Version': '2022.3',
      'Content-Type': 'application/json',
    },
  });
}

export function createUnrealClient(endpoint: string, apiKey: string): GameDataClient {
  return new GameDataClient({
    type: 'rest',
    endpoint,
    apiKey,
    headers: {
      'X-Engine': 'Unreal',
      'Content-Type': 'application/json',
    },
  });
}

export function createGodotClient(endpoint: string): GameDataClient {
  return new GameDataClient({
    type: 'websocket',
    endpoint,
  });
}

/**
 * Utility function to convert sheet data to CharacterData format
 */
export function sheetRowToCharacter(row: Record<string, string | number>): CharacterData {
  return {
    id: String(row['id'] || row['ID'] || `char_${Date.now()}`),
    name: String(row['name'] || row['Name'] || row['이름'] || 'Unknown'),
    stats: {
      hp: Number(row['hp'] || row['HP'] || row['체력'] || 0),
      atk: Number(row['atk'] || row['ATK'] || row['공격력'] || 0),
      def: Number(row['def'] || row['DEF'] || row['방어력'] || 0),
      speed: Number(row['speed'] || row['Speed'] || row['공격속도'] || 1),
      critRate: Number(row['critRate'] || row['크리율'] || 0),
      critDamage: Number(row['critDamage'] || row['크리뎀'] || 2),
    },
    tier: String(row['tier'] || row['Tier'] || row['등급'] || ''),
    rarity: String(row['rarity'] || row['Rarity'] || row['레어도'] || ''),
  };
}

/**
 * Utility function to convert CharacterData to sheet row format
 */
export function characterToSheetRow(character: CharacterData): Record<string, string | number> {
  return {
    id: character.id,
    name: character.name,
    hp: character.stats.hp,
    atk: character.stats.atk,
    def: character.stats.def,
    speed: character.stats.speed,
    critRate: character.stats.critRate || 0,
    critDamage: character.stats.critDamage || 2,
    tier: character.tier || '',
    rarity: character.rarity || '',
  };
}
