interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const existing = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > Date.now()) return existing.value;
  const value = await loader();
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return value;
}

export function clearMemoryCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  Array.from(memoryCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  });
}
