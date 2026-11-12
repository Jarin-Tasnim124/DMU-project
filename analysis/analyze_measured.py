#!/usr/bin/env python3
"""Paired analysis of the measured browser benchmark.

Reads benchmark/raw-results/measured_benchmark_results.csv (written by
benchmark/run_browser_benchmark.js) and computes every statistic from it.
No value is hard-coded. Only the Python standard library is used.

For each latency condition it reports:
  - mean, sample SD, median and 95th percentile of the navigation time per mode
  - the paired difference (Baseline minus Optimised) with a bootstrap 95% CI
    (10,000 resamples, fixed seed)
  - the Wilcoxon signed-rank test (two-sided, normal approximation with tie
    and continuity correction) and the matched-pairs rank-biserial correlation
  - request counts, cache-hit rate and wasted-prefetch rate with Wilson 95% CIs
  - the results split by scripted interaction

Usage: python analysis/analyze_measured.py [csv_path]
"""

import csv
import math
import os
import random
import statistics
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CSV = os.path.join(ROOT, "benchmark", "raw-results", "measured_benchmark_results.csv")
OUT_MD = os.path.join(ROOT, "analysis", "measured_results_summary.md")
PROFILES = ["Broadband", "Fast 4G", "Throttled 3G"]
BOOTSTRAP_RESAMPLES = 10000
BOOTSTRAP_SEED = 42


def percentile(values, q):
    """Linear-interpolation percentile (q in 0..100)."""
    s = sorted(values)
    if len(s) == 1:
        return s[0]
    pos = (len(s) - 1) * q / 100.0
    lo, hi = math.floor(pos), math.ceil(pos)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


def describe(values):
    return {
        "n": len(values),
        "mean": statistics.mean(values),
        "sd": statistics.stdev(values) if len(values) > 1 else 0.0,
        "median": statistics.median(values),
        "p95": percentile(values, 95),
    }


def bootstrap_ci_mean(values, resamples=BOOTSTRAP_RESAMPLES, seed=BOOTSTRAP_SEED):
    rng = random.Random(seed)
    n = len(values)
    means = sorted(sum(rng.choice(values) for _ in range(n)) / n for _ in range(resamples))
    return percentile(means, 2.5), percentile(means, 97.5)


def normal_sf(z):
    """Upper tail of the standard normal distribution."""
    return 0.5 * math.erfc(z / math.sqrt(2))


def wilcoxon_signed_rank(differences):
    """Two-sided Wilcoxon signed-rank test with the normal approximation.

    Zero differences are dropped. Tied absolute differences get average ranks,
    and the variance is corrected for ties. A continuity correction is applied.
    Returns (n_used, w_plus, w_minus, z, p, rank_biserial_r).
    """
    d = [x for x in differences if x != 0]
    n = len(d)
    if n == 0:
        return 0, 0.0, 0.0, 0.0, 1.0, 0.0

    order = sorted(range(n), key=lambda i: abs(d[i]))
    ranks = [0.0] * n
    tie_term = 0.0
    i = 0
    while i < n:
        j = i
        while j + 1 < n and abs(d[order[j + 1]]) == abs(d[order[i]]):
            j += 1
        avg_rank = (i + j) / 2.0 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = avg_rank
        t = j - i + 1
        tie_term += t ** 3 - t
        i = j + 1

    w_plus = sum(r for r, x in zip(ranks, d) if x > 0)
    w_minus = sum(r for r, x in zip(ranks, d) if x < 0)
    total = n * (n + 1) / 2.0
    mean_w = total / 2.0
    var_w = n * (n + 1) * (2 * n + 1) / 24.0 - tie_term / 48.0

    w = min(w_plus, w_minus)
    if var_w <= 0:
        z, p = 0.0, 1.0
    else:
        z = (w - mean_w + 0.5) / math.sqrt(var_w)
        z = min(z, 0.0)
        p = min(1.0, 2 * normal_sf(abs(z)))

    r = (w_plus - w_minus) / total  # matched-pairs rank-biserial correlation
    return n, w_plus, w_minus, z, p, r


def wilson_ci(successes, n, z=1.959964):
    if n == 0:
        return None
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return max(0.0, centre - half), min(1.0, centre + half)


def fmt_p(p):
    return "< 0.001" if p < 0.001 else f"{p:.3f}"


def fmt_rate(successes, n):
    if n == 0:
        return "n/a"
    lo, hi = wilson_ci(successes, n)
    return f"{100 * successes / n:.1f}% ({successes}/{n}; 95% CI {100 * lo:.1f}% to {100 * hi:.1f}%)"


def load(csv_path):
    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["trial_number"] = int(r["trial_number"])
        r["navigation_latency_ms"] = float(r["navigation_latency_ms"])
        for col in ("cache_hit", "served_by_inflight_prefetch", "product_requests",
                    "prefetch_initiated", "prefetch_consumed", "prefetch_wasted"):
            r[col] = int(r[col])
    return rows


def paired(rows, profile):
    base = {r["trial_number"]: r for r in rows if r["scenario_network"] == profile and r["mode"] == "BASELINE"}
    opt = {r["trial_number"]: r for r in rows if r["scenario_network"] == profile and r["mode"] == "OPTIMIZED"}
    trials = sorted(set(base) & set(opt))
    return [(base[t], opt[t]) for t in trials]


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV
    if not os.path.exists(csv_path):
        print(f"Measured results not found: {csv_path}")
        print('Run "npm run benchmark:browser" first.')
        sys.exit(1)

    rows = load(csv_path)
    out = []
    out.append("# Measured Browser Benchmark: Summary")
    out.append("")
    out.append(f"Source: `benchmark/raw-results/{os.path.basename(csv_path)}` ({len(rows)} measured trials). "
               "Every value below is computed from that file by `analysis/analyze_measured.py`.")
    out.append("")

    # Table 1: navigation time
    out.append("## Navigation time (ms)")
    out.append("")
    out.append("| Network | Mode | n | Mean | SD | Median | 95th pct. |")
    out.append("| :--- | :--- | ---: | ---: | ---: | ---: | ---: |")
    for profile in PROFILES:
        for mode, label in (("BASELINE", "Baseline"), ("OPTIMIZED", "Optimised")):
            vals = [r["navigation_latency_ms"] for r in rows if r["scenario_network"] == profile and r["mode"] == mode]
            if not vals:
                continue
            d = describe(vals)
            out.append(f"| {profile} | {label} | {d['n']} | {d['mean']:.2f} | {d['sd']:.2f} | {d['median']:.2f} | {d['p95']:.2f} |")
    out.append("")

    # Table 2: paired comparison
    out.append("## Paired comparison of navigation time (Baseline minus Optimised)")
    out.append("")
    out.append("| Network | Pairs | Mean difference (ms) | 95% CI (ms) | Median difference (ms) | Reduction in mean | Wilcoxon z | p | Effect size r |")
    out.append("| :--- | ---: | ---: | :---: | ---: | ---: | ---: | ---: | ---: |")
    for profile in PROFILES:
        pairs = paired(rows, profile)
        if not pairs:
            continue
        diffs = [b["navigation_latency_ms"] - o["navigation_latency_ms"] for b, o in pairs]
        base_mean = statistics.mean(b["navigation_latency_ms"] for b, _ in pairs)
        lo, hi = bootstrap_ci_mean(diffs)
        _, _, _, z, p, r = wilcoxon_signed_rank(diffs)
        out.append(f"| {profile} | {len(pairs)} | {statistics.mean(diffs):.2f} | {lo:.2f} to {hi:.2f} | "
                   f"{statistics.median(diffs):.2f} | {100 * statistics.mean(diffs) / base_mean:.1f}% | "
                   f"{z:.2f} | {fmt_p(p)} | {r:.2f} |")
    out.append("")
    out.append(f"Bootstrap: {BOOTSTRAP_RESAMPLES:,} resamples, seed {BOOTSTRAP_SEED}. Wilcoxon signed-rank test: two-sided, "
               "normal approximation with tie and continuity correction. Effect size: matched-pairs rank-biserial correlation.")
    out.append("")

    # Table 3: requests and cache
    out.append("## Requests, cache hits and wasted prefetches")
    out.append("")
    out.append("| Network | Baseline requests | Optimised requests | Extra requests | Cache-hit rate | Served by in-flight prefetch | Wasted-prefetch rate |")
    out.append("| :--- | ---: | ---: | ---: | :--- | ---: | :--- |")
    for profile in PROFILES:
        pairs = paired(rows, profile)
        if not pairs:
            continue
        base_req = sum(b["product_requests"] for b, _ in pairs)
        opt_req = sum(o["product_requests"] for _, o in pairs)
        hits = sum(o["cache_hit"] for _, o in pairs)
        inflight = sum(o["served_by_inflight_prefetch"] for _, o in pairs)
        initiated = sum(o["prefetch_initiated"] for _, o in pairs)
        wasted = sum(o["prefetch_wasted"] for _, o in pairs)
        extra = f"{100 * (opt_req - base_req) / base_req:+.1f}%" if base_req else "n/a"
        out.append(f"| {profile} | {base_req} | {opt_req} | {extra} | {fmt_rate(hits, len(pairs))} | "
                   f"{inflight} | {fmt_rate(wasted, initiated)} |")
    out.append("")
    out.append("Requests are GET requests to `/api/products/:id` seen in the browser network log. "
               "Extra requests = (Optimised - Baseline) / Baseline. Cache-hit rate = cache hits / navigations. "
               "Wasted-prefetch rate = wasted prefetches / prefetches started. Intervals are Wilson 95% intervals.")
    out.append("")

    # Table 4: by scripted interaction (Optimised mode)
    out.append("## Effect of the scripted interaction")
    out.append("")
    out.append("| Network | Interaction | Trials | Baseline mean (ms) | Optimised mean (ms) | Cache hits | In flight | Optimised requests |")
    out.append("| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |")
    for profile in PROFILES:
        pairs = paired(rows, profile)
        interactions = []
        for _, o in pairs:
            if o["interaction"] not in interactions:
                interactions.append(o["interaction"])
        for name in interactions:
            sub = [(b, o) for b, o in pairs if o["interaction"] == name]
            out.append(f"| {profile} | {name} | {len(sub)} | "
                       f"{statistics.mean(b['navigation_latency_ms'] for b, _ in sub):.2f} | "
                       f"{statistics.mean(o['navigation_latency_ms'] for _, o in sub):.2f} | "
                       f"{sum(o['cache_hit'] for _, o in sub)} | "
                       f"{sum(o['served_by_inflight_prefetch'] for _, o in sub)} | "
                       f"{sum(o['product_requests'] for _, o in sub)} |")
    out.append("")

    # Checks used in the test table
    base_rows = [r for r in rows if r["mode"] == "BASELINE"]
    one_request = sum(1 for r in base_rows if r["product_requests"] == 1)
    inflight_rows = [r for r in rows if r["mode"] == "OPTIMIZED" and r["served_by_inflight_prefetch"] == 1]
    inflight_single = sum(1 for r in inflight_rows if r["product_requests"] == 1)
    out.append("## Checks taken from the benchmark")
    out.append("")
    out.append(f"- Baseline trials with exactly one product request: {one_request} of {len(base_rows)}")
    out.append(f"- Navigations served by an in-flight prefetch that sent no second request: {inflight_single} of {len(inflight_rows)}")
    out.append("")

    text = "\n".join(out)
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write(text)
    print(text)
    print(f"Saved: analysis/{os.path.basename(OUT_MD)}")


if __name__ == "__main__":
    main()
