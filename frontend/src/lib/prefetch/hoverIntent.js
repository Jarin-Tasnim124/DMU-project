// Hover-Intent Predictive Prefetching Engine (Objective 3)
//
// When the pointer (or keyboard focus) rests on a product card for at least the
// dwell threshold (default 100 ms), the product data are prefetched in the
// background. Leaving the card before the threshold cancels the timer, so no
// request is sent. A prefetch that has already been sent is not cancelled; its
// result stays in the cache and is counted as wasted if never used.
//
// Keys that are already cached or already being fetched are skipped.
// Touch input has no hover, so touch navigation falls back to on-demand fetching
// (the ProductCard component does not call the prefetcher for touch pointers).

import globalSWRCache from '../cache/swrCache';

export const DEFAULT_DWELL_MS = 100;

export class HoverIntentPrefetcher {
  constructor({ dwellThreshold = DEFAULT_DWELL_MS, cache = globalSWRCache } = {}) {
    this.dwellThreshold = dwellThreshold;
    this.cache = cache;
    this.inFlightRequests = new Set();
    this.activeTimers = new Map(); // key -> timer
    this.prefetchHistory = [];
    this.listeners = new Set();
    this.enabled = true; // BASELINE disables, OPTIMIZED enables
    this.isInFlightElsewhere = () => false; // set by the API client
  }

  setInFlightChecker(fn) {
    this.isInFlightElsewhere = typeof fn === 'function' ? fn : () => false;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled) this.cancelAll();
    this.notify();
  }

  setDwellThreshold(ms) {
    this.dwellThreshold = Math.max(20, Math.min(1000, Number(ms) || DEFAULT_DWELL_MS));
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = {
      enabled: this.enabled,
      dwellThreshold: this.dwellThreshold,
      activeTimerCount: this.activeTimers.size,
      inFlightCount: this.inFlightRequests.size,
      totalPrefetches: this.prefetchHistory.length
    };
    this.listeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error('Prefetch listener error', e); }
    });
  }

  /**
   * Starts the dwell timer for a key. After `dwellThreshold` ms, `fetcher()` is
   * called; it is responsible for fetching and caching (see client.js).
   */
  onPointerEnter(key, fetcher, onTriggerVisual = null) {
    if (!this.enabled) return;
    if (this.cache.has(key)) return;
    if (this.inFlightRequests.has(key) || this.isInFlightElsewhere(key)) return;

    if (this.activeTimers.has(key)) {
      clearTimeout(this.activeTimers.get(key));
    }

    const startTime = Date.now();

    const timer = setTimeout(async () => {
      this.activeTimers.delete(key);

      // The key may have been fetched by a click while the timer was running
      if (!this.enabled || this.cache.has(key) || this.isInFlightElsewhere(key)) {
        this.notify();
        return;
      }

      this.inFlightRequests.add(key);
      if (typeof onTriggerVisual === 'function') onTriggerVisual(true);
      this.prefetchHistory.push({ key, dwellDuration: Date.now() - startTime, timestamp: Date.now() });
      this.notify();

      try {
        await fetcher();
      } catch (err) {
        console.warn(`[Prefetcher] Failed to prefetch key: ${key}`, err);
      } finally {
        this.inFlightRequests.delete(key);
        this.notify();
      }
    }, this.dwellThreshold);

    this.activeTimers.set(key, timer);
    this.notify();
  }

  /** Cancels the dwell timer if the pointer leaves before the threshold. */
  onPointerLeave(key, onCancelVisual = null) {
    if (this.activeTimers.has(key)) {
      clearTimeout(this.activeTimers.get(key));
      this.activeTimers.delete(key);
      if (typeof onCancelVisual === 'function') onCancelVisual(false);
      this.notify();
    }
  }

  cancelAll() {
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
    this.inFlightRequests.clear();
    this.notify();
  }

  reset() {
    this.cancelAll();
    this.prefetchHistory = [];
    this.notify();
  }

  getHistory() {
    return [...this.prefetchHistory];
  }
}

export const globalPrefetcher = new HoverIntentPrefetcher();
export default globalPrefetcher;
