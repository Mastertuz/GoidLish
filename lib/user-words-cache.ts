type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const userWordsCache = new Map<string, CacheEntry<unknown>>();

export function getCachedUserWords<T>(userId: string): T | null {
  const entry = userWordsCache.get(userId);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.updatedAt > CACHE_TTL_MS) {
    userWordsCache.delete(userId);
    return null;
  }

  return entry.data as T;
}

export function setCachedUserWords<T>(userId: string, data: T) {
  userWordsCache.set(userId, {
    data,
    updatedAt: Date.now(),
  });
}

export function invalidateCachedUserWords(userId: string) {
  userWordsCache.delete(userId);
}
