import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HoverIntentPrefetcher } from '../src/lib/prefetch/hoverIntent';
import { SWRCache } from '../src/lib/cache/swrCache';

describe('HoverIntentPrefetcher', () => {
  let cache;
  let prefetcher;
  let fetcher;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new SWRCache();
    prefetcher = new HoverIntentPrefetcher({ dwellThreshold: 100, cache });
    fetcher = vi.fn(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('issues no fetch in Baseline mode (prefetcher disabled), even after a 150 ms dwell', async () => {
    prefetcher.setEnabled(false);
    prefetcher.onPointerEnter('k', fetcher);
    await vi.advanceTimersByTimeAsync(150);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('issues exactly one prefetch when the dwell reaches 100 ms, and not before', async () => {
    prefetcher.onPointerEnter('k', fetcher);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetcher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('cancels the timer when the pointer leaves after 40 ms', async () => {
    prefetcher.onPointerEnter('k', fetcher);
    await vi.advanceTimersByTimeAsync(40);
    prefetcher.onPointerLeave('k');
    await vi.advanceTimersByTimeAsync(500);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('skips a key that is already cached', async () => {
    cache.set('k', { v: 1 });
    prefetcher.onPointerEnter('k', fetcher);
    await vi.advanceTimersByTimeAsync(200);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('skips a key that is already in flight', async () => {
    prefetcher.setInFlightChecker(key => key === 'k');
    prefetcher.onPointerEnter('k', fetcher);
    await vi.advanceTimersByTimeAsync(200);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not start a second prefetch while its own prefetch is still loading', async () => {
    let resolve;
    const slow = vi.fn(() => new Promise(r => { resolve = r; }));
    prefetcher.onPointerEnter('k', slow);
    await vi.advanceTimersByTimeAsync(100);
    prefetcher.onPointerLeave('k');
    prefetcher.onPointerEnter('k', slow);
    await vi.advanceTimersByTimeAsync(200);
    expect(slow).toHaveBeenCalledTimes(1);
    resolve();
  });

  it('keeps the dwell threshold between 20 and 1,000 ms', () => {
    prefetcher.setDwellThreshold(5);
    expect(prefetcher.dwellThreshold).toBe(20);
    prefetcher.setDwellThreshold(5000);
    expect(prefetcher.dwellThreshold).toBe(1000);
    prefetcher.setDwellThreshold(150);
    expect(prefetcher.dwellThreshold).toBe(150);
  });

  it('handles a failed prefetch without throwing and allows a later attempt', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('HTTP 500')));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prefetcher.onPointerEnter('k', failing);
    await vi.advanceTimersByTimeAsync(100);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(prefetcher.inFlightRequests.size).toBe(0);
    prefetcher.onPointerEnter('k', fetcher);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
