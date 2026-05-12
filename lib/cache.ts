// Short-lived process cache for low-risk read models. It is an optimization only.
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 seconds

export async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

export function invalidateCache(key: string) {
  cache.delete(key);
}

export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// Cache invalidation helpers for common operations
export function invalidateUserCache(userId: string) {
  invalidateCache(`user:${userId}`);
  invalidateCachePrefix(`user:${userId}:`);
  invalidateCache("services");
  invalidateCache("services:stock-counts");
  invalidateCache(`user:wins:${userId}`);
}
