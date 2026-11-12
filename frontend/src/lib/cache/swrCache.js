// In-Memory Stale-While-Revalidate (SWR) Cache
// Application-level cache for the Optimised mode (Objective 3).
//
// Rules (Chapter Four, Section 4.6):
//   - Entries are keyed by API path (e.g. "API:/products/42").
//   - Fresh for `ttl` (120 s). Between ttl and ttl + grace (60 s) an entry is
//     stale: it is still returned (isStale = true) so the caller can serve it
//     immediately and revalidate in the background.
//   - After ttl + grace an entry has expired and is removed (treated as a miss).
//   - At most `maxEntries` (100) entries are kept. When full, the least
//     recently used entry is evicted.
//   - A prefetched entry that expires or is evicted without being used is
//     counted as a wasted prefetch.
//   - Failed requests are never stored (the client only calls set() on success).

export const DEFAULT_TTL_MS = 120000;
export const DEFAULT_GRACE_MS = 60000;
export const DEFAULT_MAX_ENTRIES = 100;

function emptyMetrics() {
  return {
    hits: 0,
    misses: 0,
    inFlightReuses: 0,
    prefetchesInitiated: 0,
    prefetchesConsumed: 0,
    prefetchesWasted: 0,
    staleHits: 0,
    evictions: 0,
    totalBytesCached: 0
  };
}

export class SWRCache {
  constructor({ ttl = DEFAULT_TTL_MS, grace = DEFAULT_GRACE_MS, maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
    this.cache = new Map(); // insertion order = least recently used first
    this.defaultTTL = ttl;
    this.staleGracePeriod = grace;
    this.maxEntries = maxEntries;
    this.subscribers = new Set();
    this.metrics = emptyMetrics();

    // Periodic sweep of expired entries (browser only)
    if (typeof window !== 'undefined') {
      this.gcInterval = setInterval(() => this.reapExpired(), 15000);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    const snapshot = this.getMetrics();
    this.subscribers.forEach(cb => {
      try { cb(snapshot); } catch (e) { console.error('Cache listener error', e); }
    });
  }

  _state(entry, now = Date.now()) {
    const age = now - entry.timestamp;
    if (age > entry.ttl + this.staleGracePeriod) return 'expired';
    if (age > entry.ttl) return 'stale';
    return 'fresh';
  }

  _remove(key, entry) {
    if (entry.prefetched && !entry.consumed) {
      this.metrics.prefetchesWasted++;
    }
    this.cache.delete(key);
  }

  _touch(key, entry) {
    // Move to the most-recently-used position
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  /**
   * Looks up a key without changing hit/miss counters.
   * Returns { data, isHit, isStale, prefetched } or a miss.
   * When `consume` is true, a hit marks a prefetched entry as consumed and
   * counts as a cache hit; this is what a navigation does.
   */
  get(key, { consume = true } = {}) {
    const entry = this.cache.get(key);

    if (entry && this._state(entry) === 'expired') {
      this._remove(key, entry);
      this.recalculateTotalBytes();
      this.notify();
      return { data: null, isHit: false, isStale: false, prefetched: false };
    }

    if (!entry) {
      return { data: null, isHit: false, isStale: false, prefetched: false };
    }

    const isStale = this._state(entry) === 'stale';
    this._touch(key, entry);

    if (consume) {
      this.metrics.hits++;
      if (isStale) this.metrics.staleHits++;
      if (entry.prefetched && !entry.consumed) {
        entry.consumed = true;
        this.metrics.prefetchesConsumed++;
      }
      this.notify();
    }

    return {
      data: entry.data,
      isHit: true,
      isStale,
      prefetched: entry.prefetched,
      timestamp: entry.timestamp
    };
  }

  recordMiss() {
    this.metrics.misses++;
    this.notify();
  }

  recordInFlightReuse() {
    this.metrics.inFlightReuses++;
    this.notify();
  }

  /**
   * Stores data. Options:
   *   prefetched: entry was fetched speculatively by the prefetcher
   *   consumed:   a navigation already used it (click during an in-flight prefetch)
   *   bytes:      measured response size in bytes
   */
  set(key, data, options = {}) {
    const { prefetched = false, consumed = false, ttl = this.defaultTTL, bytes = 0, fetchDuration = 0 } = options;

    const existing = this.cache.get(key);
    if (existing) {
      // A refresh of an existing key keeps its prefetch accounting
      this.cache.delete(key);
    }

    if (prefetched) {
      this.metrics.prefetchesInitiated++;
      if (consumed) this.metrics.prefetchesConsumed++;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      prefetched: existing ? existing.prefetched || prefetched : prefetched,
      consumed: existing ? existing.consumed || consumed || !existing.prefetched : consumed,
      fetchDuration,
      bytes
    });

    // Least-recently-used eviction
    while (this.cache.size > this.maxEntries) {
      const [oldestKey, oldestEntry] = this.cache.entries().next().value;
      this._remove(oldestKey, oldestEntry);
      this.metrics.evictions++;
    }

    this.recalculateTotalBytes();
    this.notify();
  }

  has(key) {
    const entry = this.cache.get(key);
    return Boolean(entry) && this._state(entry) !== 'expired';
  }

  size() {
    return this.cache.size;
  }

  recalculateTotalBytes() {
    let sum = 0;
    this.cache.forEach(entry => { sum += entry.bytes || 0; });
    this.metrics.totalBytesCached = sum;
  }

  /** Removes expired entries and counts unused prefetches among them as wasted. */
  reapExpired() {
    const now = Date.now();
    let changed = false;
    for (const [key, entry] of [...this.cache.entries()]) {
      if (this._state(entry, now) === 'expired') {
        this._remove(key, entry);
        changed = true;
      }
    }
    if (changed) {
      this.recalculateTotalBytes();
      this.notify();
    }
  }

  getMetrics() {
    const lookups = this.metrics.hits + this.metrics.misses + this.metrics.inFlightReuses;
    const hitRate = lookups > 0 ? parseFloat(((this.metrics.hits / lookups) * 100).toFixed(2)) : 0;

    // Waste = prefetches started but not (yet) used by a navigation
    const unused = Math.max(0, this.metrics.prefetchesInitiated - this.metrics.prefetchesConsumed);
    const wasteRate = this.metrics.prefetchesInitiated > 0
      ? parseFloat(((unused / this.metrics.prefetchesInitiated) * 100).toFixed(2))
      : 0;

    return {
      ...this.metrics,
      totalRequests: lookups,
      hitRate,
      unusedPrefetches: unused,
      wasteRate,
      activeEntriesCount: this.cache.size,
      maxEntries: this.maxEntries
    };
  }

  clear() {
    this.cache.clear();
    this.metrics = emptyMetrics();
    this.notify();
  }
}

// Global singleton instance for the application
export const globalSWRCache = new SWRCache();
export default globalSWRCache;
