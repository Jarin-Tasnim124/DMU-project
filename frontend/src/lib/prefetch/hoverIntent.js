// Hover-Intent Predictive Prefetching Engine
// Objective 3: Triggering on >100ms pointer dwell to anticipate user navigation

import globalSWRCache from '../cache/swrCache';

class HoverIntentPrefetcher {
  constructor(options = {}) {
    this.dwellThreshold = options.dwellThreshold || 100; // ms
    this.inFlightRequests = new Set();
    this.activeTimers = new Map(); // elementId -> timer
    this.prefetchHistory = []; // records all prefetch triggers
    this.listeners = new Set();
    this.enabled = true; // Controlled by app mode (BASELINE disables this, OPTIMIZED enables)
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled) {
      this.cancelAll();
    }
    this.notify();
  }

  setDwellThreshold(ms) {
    this.dwellThreshold = Math.max(20, Math.min(1000, Number(ms) || 100));
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
   * Pointer enter handler. Starts dwell timer.
   * If pointer stays >= dwellThreshold, executes fetcher function.
   */
  onPointerEnter(key, fetcher, onTriggerVisual = null) {
    if (!this.enabled) return;

    // If already cached and fresh, no need to trigger network prefetch
    if (globalSWRCache.has(key)) {
      return;
    }

    // If already in flight, don't duplicate
    if (this.inFlightRequests.has(key)) {
      return;
    }

    // Clear any lingering timer for this key
    if (this.activeTimers.has(key)) {
      clearTimeout(this.activeTimers.get(key));
    }

    const startTime = performance.now();

    const timer = setTimeout(async () => {
      this.activeTimers.delete(key);
      const dwellDuration = performance.now() - startTime;

      // Trigger prefetch execution
      this.inFlightRequests.add(key);
      if (typeof onTriggerVisual === 'function') {
        onTriggerVisual(true);
      }

      this.prefetchHistory.push({
        key,
        dwellDuration,
        timestamp: Date.now()
      });
      this.notify();

      try {
        const fetchStart = performance.now();
        const data = await fetcher();
        const fetchDuration = performance.now() - fetchStart;

        // Store into SWR cache marked as prefetched
        globalSWRCache.set(key, data, {
          prefetched: true,
          fetchDuration
        });
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

  /**
   * Pointer leave handler. Cancels prefetch if pointer left before dwellThreshold!
   */
  onPointerLeave(key, onCancelVisual = null) {
    if (this.activeTimers.has(key)) {
      clearTimeout(this.activeTimers.get(key));
      this.activeTimers.delete(key);
      if (typeof onCancelVisual === 'function') {
        onCancelVisual(false);
      }
      this.notify();
    }
  }

  cancelAll() {
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
    this.inFlightRequests.clear();
    this.notify();
  }

  getHistory() {
    return [...this.prefetchHistory];
  }
}

export const globalPrefetcher = new HoverIntentPrefetcher();
export default globalPrefetcher;
