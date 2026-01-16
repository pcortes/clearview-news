import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;
let connected = false;

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number | null {
      if (times > 10) {
        console.warn('[Cache] Max reconnection attempts reached. Redis unavailable.');
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      console.log(`[Cache] Reconnecting to Redis in ${delay}ms (attempt ${times})`);
      return delay;
    },
    lazyConnect: true,
  });

  client.on('connect', () => {
    console.log('[Cache] Connected to Redis');
    connected = true;
  });

  client.on('ready', () => {
    console.log('[Cache] Redis ready');
    connected = true;
  });

  client.on('error', (err: Error) => {
    console.warn('[Cache] Redis error:', err.message);
    connected = false;
  });

  client.on('close', () => {
    console.log('[Cache] Redis connection closed');
    connected = false;
  });

  client.on('reconnecting', () => {
    console.log('[Cache] Reconnecting to Redis...');
  });

  client.on('end', () => {
    console.log('[Cache] Redis connection ended');
    connected = false;
  });

  return client;
}

async function getClient(): Promise<Redis | null> {
  if (!redis) {
    redis = createRedisClient();
    try {
      await redis.connect();
    } catch (err) {
      console.warn('[Cache] Failed to connect to Redis:', (err as Error).message);
      console.warn('[Cache] Running without cache - data will not be persisted');
      connected = false;
      return null;
    }
  }
  return connected ? redis : null;
}

/**
 * Get a value from the cache
 * @param key - The cache key
 * @returns The cached value or null if not found or Redis unavailable
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    const client = await getClient();
    if (!client) {
      return null;
    }
    const value = await client.get(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn('[Cache] Error getting key:', key, (err as Error).message);
    return null;
  }
}

/**
 * Set a value in the cache
 * @param key - The cache key
 * @param value - The value to cache (will be JSON serialized)
 * @param ttlSeconds - Optional TTL in seconds
 */
export async function set(key: string, value: any, ttlSeconds?: number): Promise<void> {
  try {
    const client = await getClient();
    if (!client) {
      return;
    }
    const serialized = JSON.stringify(value);
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  } catch (err) {
    console.warn('[Cache] Error setting key:', key, (err as Error).message);
  }
}

/**
 * Delete a value from the cache
 * @param key - The cache key to delete
 */
async function del(key: string): Promise<void> {
  try {
    const client = await getClient();
    if (!client) {
      return;
    }
    await client.del(key);
  } catch (err) {
    console.warn('[Cache] Error deleting key:', key, (err as Error).message);
  }
}

/**
 * Check if Redis is currently connected
 * @returns true if connected, false otherwise
 */
export function isConnected(): boolean {
  return connected;
}

// Export delete with an alias since 'delete' is a reserved word
export { del as delete };

// Default export for convenience
export default {
  get,
  set,
  delete: del,
  isConnected,
};
