// Performance & Metrics Telemetry Engine
// Records, for every product navigation: navigation time (click until the
// product data are available), render time (click until the first animation
// frame after the data are in the page), TTFB (only when a request was made),
// cache hit, in-flight reuse, and the request and prefetch counters.

import globalSWRCache from '../cache/swrCache';
import globalPrefetcher from '../prefetch/hoverIntent';
import { API_BASE } from '../api/apiBase';

const PROFILES = ['Broadband', 'Fast 4G', 'Throttled 3G'];

function round2(n) {
  return parseFloat(n.toFixed(2));
}

function safeStorageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeStorageSet(key, value) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

class PerformanceTracker {
  constructor() {
    this.mode = 'OPTIMIZED'; // 'BASELINE' or 'OPTIMIZED'
    this.networkProfile = 'Broadband'; // 'Broadband' | 'Fast 4G' | 'Throttled 3G'
    this.apiBaseUrl = API_BASE;

    this.navHistory = [];
    this.totalHttpRequests = 0;
    this.productRequests = 0;
    this.totalTransferredBytes = 0;
    this.activeNavStart = null;
    this.subscribers = new Set();
    this.resetHooks = new Set();

    if (typeof window !== 'undefined') {
      const savedMode = safeStorageGet('research_mode');
      if (savedMode === 'BASELINE' || savedMode === 'OPTIMIZED') {
        this.mode = savedMode;
      }
      const savedProfile = safeStorageGet('research_profile');
      if (PROFILES.includes(savedProfile)) {
        this.networkProfile = savedProfile;
      }
      globalPrefetcher.setEnabled(this.mode === 'OPTIMIZED');

      // Wire cache notifications to trigger tracker re-render
      globalSWRCache.subscribe(() => this.notify());
      globalPrefetcher.subscribe(() => this.notify());

      // Small handle used by the automated browser benchmark and checks
      window.__research = {
        setMode: (m) => this.setMode(m),
        setNetworkProfile: (p) => this.setNetworkProfile(p),
        setDwellThreshold: (ms) => globalPrefetcher.setDwellThreshold(ms),
        reset: () => this.resetAll(),
        getLastNavigation: () => this.navHistory[this.navHistory.length - 1] || null,
        getNavigationCount: () => this.navHistory.length,
        getCounters: () => ({ ...globalSWRCache.getMetrics(), prefetchesStarted: globalPrefetcher.getHistory().length, productRequests: this.productRequests, totalHttpRequests: this.totalHttpRequests }),
        getState: () => ({ mode: this.mode, networkProfile: this.networkProfile, dwellThreshold: globalPrefetcher.dwellThreshold, cacheEntries: globalSWRCache.size() }),
        peekCache: (key) => globalSWRCache.get(key, { consume: false })
      };
    }
  }

  setMode(newMode) {
    if (newMode !== 'BASELINE' && newMode !== 'OPTIMIZED') return;
    this.mode = newMode;
    safeStorageSet('research_mode', newMode);
    globalPrefetcher.setEnabled(newMode === 'OPTIMIZED');
    this.notify();
  }

  setNetworkProfile(profile) {
    if (!PROFILES.includes(profile)) return;
    this.networkProfile = profile;
    safeStorageSet('research_profile', profile);
    this.notify();
  }

  onReset(fn) {
    this.resetHooks.add(fn);
    return () => this.resetHooks.delete(fn);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    const data = this.getSummary();
    this.subscribers.forEach(cb => {
      try { cb(data); } catch (e) { console.error('Tracker subscriber error', e); }
    });
  }

  startNavigation(targetRoute) {
    this.activeNavStart = {
      targetRoute,
      startTime: performance.now(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Called when the product data are available to the detail page.
   * meta: { cacheHit, prefetched, servedByInFlight, ttfb (null if no request), payloadBytes }
   */
  endNavigation(targetRoute, meta = {}) {
    if (!this.activeNavStart || this.activeNavStart.targetRoute !== targetRoute) {
      this.activeNavStart = null;
      return null;
    }

    const navStart = this.activeNavStart;
    const latencyMs = round2(performance.now() - navStart.startTime);
    const ttfb = typeof meta.ttfb === 'number' ? round2(meta.ttfb) : null;

    const record = {
      id: this.navHistory.length + 1,
      targetRoute,
      mode: this.mode,
      networkProfile: this.networkProfile,
      latencyMs,
      renderLatencyMs: null,
      ttfb,
      cacheHit: Boolean(meta.cacheHit),
      prefetched: Boolean(meta.prefetched),
      servedByInFlight: Boolean(meta.servedByInFlight),
      payloadBytes: meta.payloadBytes || 0,
      timestamp: navStart.timestamp
    };

    this.navHistory.push(record);
    this.activeNavStart = null;
    this.notify();

    // Render point: the first animation frame after the data are in the page
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        record.renderLatencyMs = round2(performance.now() - navStart.startTime);
        this.notify();
      });
    }

    this.syncTelemetryToBackend(record);
    return record;
  }

  /** Counts a completed API request with its measured response size. */
  recordHttpRequest(url, sizeBytes = 0) {
    this.totalHttpRequests++;
    if (/^\/products\/\d+/.test(url)) this.productRequests++;
    this.totalTransferredBytes += sizeBytes;
    this.notify();
  }

  async syncTelemetryToBackend(record) {
    try {
      if (typeof window !== 'undefined') {
        fetch(`${this.apiBaseUrl}/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        }).catch(() => {});
      }
    } catch (e) {
      // Silently ignore if backend offline
    }
  }

  getSummary() {
    const cacheMetrics = globalSWRCache.getMetrics();
    const modeNavs = this.navHistory.filter(n => n.mode === this.mode);
    const count = modeNavs.length;

    const avgLatency = count > 0 
      ? parseFloat((modeNavs.reduce((acc, curr) => acc + curr.latencyMs, 0) / count).toFixed(2)) 
      : 0;

    const avgTTFB = count > 0 
      ? (() => {
          const withTtfb = modeNavs.filter(n => typeof n.ttfb === 'number');
          return withTtfb.length > 0
            ? parseFloat((withTtfb.reduce((acc, curr) => acc + curr.ttfb, 0) / withTtfb.length).toFixed(2))
            : 0;
        })()
      : 0;

    const lastNav = this.navHistory[this.navHistory.length - 1] || null;

    return {
      mode: this.mode,
      networkProfile: this.networkProfile,
      totalNavigations: this.navHistory.length,
      modeNavigationsCount: count,
      lastLatencyMs: lastNav ? lastNav.latencyMs : 0,
      avgLatencyMs: avgLatency,
      lastTTFBMs: lastNav && typeof lastNav.ttfb === 'number' ? lastNav.ttfb : 0,
      lastServedByInFlight: lastNav ? lastNav.servedByInFlight : false,
      avgTTFBMs: avgTTFB,
      totalHttpRequests: this.totalHttpRequests,
      productRequests: this.productRequests,
      totalTransferredKB: parseFloat((this.totalTransferredBytes / 1024).toFixed(2)),
      cacheHits: cacheMetrics.hits,
      cacheMisses: cacheMetrics.misses,
      cacheHitRate: cacheMetrics.hitRate,
      prefetchesInitiated: cacheMetrics.prefetchesInitiated,
      prefetchesConsumed: cacheMetrics.prefetchesConsumed,
      prefetchesWasted: cacheMetrics.prefetchesWasted,
      wasteRate: cacheMetrics.wasteRate,
      dwellThresholdMs: globalPrefetcher.dwellThreshold,
      activeEntriesCount: cacheMetrics.activeEntriesCount
    };
  }

  exportCSV() {
    if (this.navHistory.length === 0) {
      alert('No experimental navigation runs recorded yet! Please navigate through products first.');
      return;
    }

    const headers = [
      'Run_ID', 'Timestamp', 'Mode', 'Network_Profile', 
      'Target_Route', 'Navigation_Latency_ms', 'Render_Latency_ms', 'TTFB_ms',
      'Cache_Hit', 'Served_By_Inflight', 'Prefetched', 'Payload_Bytes'
    ];

    const rows = this.navHistory.map(r => [
      r.id,
      r.timestamp,
      r.mode,
      r.networkProfile,
      `"${r.targetRoute}"`,
      r.latencyMs,
      r.renderLatencyMs ?? '',
      r.ttfb ?? '',
      r.cacheHit,
      r.servedByInFlight,
      r.prefetched,
      r.payloadBytes
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `empirical_benchmark_${this.mode.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  resetAll() {
    this.navHistory = [];
    this.totalHttpRequests = 0;
    this.productRequests = 0;
    this.totalTransferredBytes = 0;
    this.activeNavStart = null;
    globalSWRCache.clear();
    globalPrefetcher.reset();
    this.resetHooks.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    this.notify();
  }
}

export const globalTracker = new PerformanceTracker();
export default globalTracker;
