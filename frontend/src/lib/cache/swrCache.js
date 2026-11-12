// In-Memory Stale-While-Revalidate (SWR) Cache
// Engineered for Empirical Evaluation of Web Data-Fetching Optimizations

class SWRCache {
  constructor(defaultTTL = 120000, staleGracePeriod = 60000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL; // ms until considered stale
    this.staleGracePeriod = staleGracePeriod; // ms allowed for background revalidation
    this.subscribers = new Set();

    // Empirical metrics store
    this.metrics = {
      hits: 0,
      misses: 0,
      prefetchesInitiated: 0,
      prefetchesConsumed: 0,
      prefetchesWasted: 0,
      staleHitsRevalidated: 0,
      totalBytesCached: 0
    };

    // Garbage collection timer for expired items
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

  /**
   * Retrieves data from cache.
   * Returns: { data, isHit, isStale, prefetched }
   */
  get(key) {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.metrics.misses++;
      this.notify();
      return { data: null, isHit: false, isStale: false, prefetched: false };
    }

    const age = now - entry.timestamp;
    const isStale = age > entry.ttl;
    const isExpired = age > (entry.ttl + this.staleGracePeriod);

    if (isExpired) {
      if (entry.prefetched && !entry.consumed) {
        this.metrics.prefetchesWasted++;
      }
      this.cache.delete(key);
      this.metrics.misses++;
      this.notify();
      return { data: null, isHit: false, isStale: false, prefetched: false };
    }

    // Cache hit
    this.metrics.hits++;
    if (entry.prefetched && !entry.consumed) {
      entry.consumed = true;
      this.metrics.prefetchesConsumed++;
    }

    if (isStale) {
      this.metrics.staleHitsRevalidated++;
    }

    this.notify();

    return {
      data: entry.data,
      isHit: true,
      isStale,
      prefetched: entry.prefetched,
      timestamp: entry.timestamp
    };
  }

  /**
   * Stores data in cache.
   */
  set(key, data, options = {}) {
    const { prefetched = false, ttl = this.defaultTTL, fetchDuration = 0 } = options;
    const now = Date.now();

    const jsonStr = JSON.stringify(data || '');
    const estimatedBytes = jsonStr ? jsonStr.length * 2 : 0; // rough utf-16 estimate

    if (prefetched) {
      this.metrics.prefetchesInitiated++;
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      prefetched,
      consumed: false,
      fetchDuration,
      estimatedBytes
    });

    this.recalculateTotalBytes();
    this.notify();
  }

  /**
   * Mark a prefetched key as consumed when a user actually navigates to it.
   */
  markConsumed(key) {
    const entry = this.cache.get(key);
    if (entry && entry.prefetched && !entry.consumed) {
      entry.consumed = true;
      this.metrics.prefetchesConsumed++;
      this.notify();
      return true;
    }
    return false;
  }

  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age <= (entry.ttl + this.staleGracePeriod);
  }

  recalculateTotalBytes() {
    let sum = 0;
    this.cache.forEach(entry => {
      sum += entry.estimatedBytes || 0;
    });
    this.metrics.totalBytesCached = sum;
  }

  /**
   * Sweeps expired items and records wasted prefetches
   */
  reapExpired() {
    const now = Date.now();
    let changed = false;

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > (entry.ttl + this.staleGracePeriod)) {
        if (entry.prefetched && !entry.consumed) {
          this.metrics.prefetchesWasted++;
          changed = true;
        }
        this.cache.delete(key);
        changed = true;
      }
    });

    if (changed) {
      this.recalculateTotalBytes();
      this.notify();
    }
  }

  getMetrics() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 
      ? parseFloat(((this.metrics.hits / totalRequests) * 100).toFixed(2)) 
      : 0;

    const totalPrefetches = this.metrics.prefetchesInitiated;
    // Waste rate = wasted / initiated (or unconsumed if session still active)
    const wastedOrUnused = Math.max(0, this.metrics.prefetchesWasted + (this.metrics.prefetchesInitiated - this.metrics.prefetchesConsumed - this.metrics.prefetchesWasted));
    const wasteRate = totalPrefetches > 0 
      ? parseFloat(((wastedOrUnused / totalPrefetches) * 100).toFixed(2)) 
      : 0;

    return {
      ...this.metrics,
      totalRequests,
      hitRate,
      wasteRate,
      activeEntriesCount: this.cache.size
    };
  }

  clear() {
    this.cache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      prefetchesInitiated: 0,
      prefetchesConsumed: 0,
      prefetchesWasted: 0,
      staleHitsRevalidated: 0,
      totalBytesCached: 0
    };
    this.notify();
  }
}

// Global singleton instance for the application
export const globalSWRCache = new SWRCache();
export default globalSWRCache;
