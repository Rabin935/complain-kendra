interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TimedCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries = 30,
    private readonly ttlMs = 5 * 60 * 1000,
  ) {}

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T) {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
