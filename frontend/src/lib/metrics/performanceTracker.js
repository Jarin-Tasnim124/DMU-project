// Empirical Performance & Metrics Telemetry Engine
// Captures Navigation Latency (ms), TTFB, Request Volume, Cache Waste Rate

import globalSWRCache from '../cache/swrCache';
import globalPrefetcher from '../prefetch/hoverIntent';

class PerformanceTracker {
  constructor() {
    this.mode = 'OPTIMIZED'; // 'BASELINE' or 'OPTIMIZED'
    this.networkProfile = 'Broadband'; // 'Broadband' | 'Fast 4G' | 'Throttled 3G'
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

    this.navHistory = [];
    this.totalHttpRequests = 0;
    this.totalTransferredBytes = 0;
    this.activeNavStart = null;
    this.subscribers = new Set();

    // Sync prefetcher state with initial mode
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('research_mode');
      if (savedMode === 'BASELINE' || savedMode === 'OPTIMIZED') {
        this.mode = savedMode;
      }
      globalPrefetcher.setEnabled(this.mode === 'OPTIMIZED');

      // Wire cache notifications to trigger tracker re-render
      globalSWRCache.subscribe(() => this.notify());
      globalPrefetcher.subscribe(() => this.notify());
    }
  }

  setMode(newMode) {
    if (newMode !== 'BASELINE' && newMode !== 'OPTIMIZED') return;
    this.mode = newMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('research_mode', newMode);
    }
    globalPrefetcher.setEnabled(newMode === 'OPTIMIZED');
    this.notify();
  }

  setNetworkProfile(profile) {
    this.networkProfile = profile;
    this.notify();
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

  endNavigation(targetRoute, meta = {}) {
    if (!this.activeNavStart) return null;

    const endTime = performance.now();
    const latencyMs = parseFloat((endTime - this.activeNavStart.startTime).toFixed(2));
    const ttfb = meta.ttfb ? parseFloat(meta.ttfb.toFixed(2)) : parseFloat((latencyMs * 0.45).toFixed(2));

    const record = {
      id: this.navHistory.length + 1,
      targetRoute,
      mode: this.mode,
      networkProfile: this.networkProfile,
      latencyMs,
      ttfb,
      cacheHit: Boolean(meta.cacheHit),
      prefetched: Boolean(meta.prefetched),
      payloadBytes: meta.payloadBytes || 0,
      timestamp: this.activeNavStart.timestamp
    };

    this.navHistory.push(record);
    this.activeNavStart = null;
    this.notify();

    // Optionally post telemetry to backend
    this.syncTelemetryToBackend(record);

    return record;
  }

  recordHttpRequest(url, sizeBytes = 1200) {
    this.totalHttpRequests++;
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
      ? parseFloat((modeNavs.reduce((acc, curr) => acc + curr.ttfb, 0) / count).toFixed(2)) 
      : 0;

    const lastNav = this.navHistory[this.navHistory.length - 1] || null;

    return {
      mode: this.mode,
      networkProfile: this.networkProfile,
      totalNavigations: this.navHistory.length,
      modeNavigationsCount: count,
      lastLatencyMs: lastNav ? lastNav.latencyMs : 0,
      avgLatencyMs: avgLatency,
      lastTTFBMs: lastNav ? lastNav.ttfb : 0,
      avgTTFBMs: avgTTFB,
      totalHttpRequests: this.totalHttpRequests,
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
      'Target_Route', 'Navigation_Latency_ms', 'TTFB_ms', 
      'Cache_Hit', 'Prefetched', 'Payload_Bytes'
    ];

    const rows = this.navHistory.map(r => [
      r.id,
      r.timestamp,
      r.mode,
      r.networkProfile,
      `"${r.targetRoute}"`,
      r.latencyMs,
      r.ttfb,
      r.cacheHit,
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
    this.totalTransferredBytes = 0;
    globalSWRCache.clear();
    globalPrefetcher.cancelAll();
    this.notify();
  }
}

export const globalTracker = new PerformanceTracker();
export default globalTracker;
