# Thesis Structure & Chapter-by-Chapter Writing Guide

**Project Title:** An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications  
**Proposer:** Jarin Tasnim | **Supervisor:** Fati Tahiru  

---

## Chapter 1: Introduction
* **1.1 Background & Motivation:** The growing scale and complexity of Single Page Applications (SPAs) and modern full-stack frameworks (React, Next.js). Explain how round-trip API latencies degrade user retention and interactivity.
* **1.2 Problem Statement:** Conventional client-side applications fetch data reactively *after* user interaction occurs, causing latency spikes and blank loading states. Naive prefetching, however, spams the network with unused requests.
* **1.3 Research Gap:** Limited empirical benchmarks quantifying the trade-off between pointer dwell intent thresholds (>100ms) and cache waste rates across heterogeneous network environments (Broadband vs 4G vs 3G).
* **1.4 Research Aim:** To design, build, and experimentally evaluate an empirical framework comparing on-demand fetching against hover-intent prefetching with in-memory SWR caching.
* **1.5 Research Objectives:** (Include the 5 specific objectives outlined in the proposal).
* **1.6 Structure of Dissertation:** Brief summary of following chapters.

---

## Chapter 2: Literature Review
* **2.1 Web Performance & Human Cognitive Latency:**
  * Miller (1968) and Nielsen (1993) thresholds: Sub-100ms response feels instantaneous to human perception.
  * Modern Core Web Vitals (FCP, LCP, INP, TTFB).
* **2.2 Caching Strategies in Distributed Systems:**
  * HTTP caching specifications (RFC 7234, RFC 5861 `stale-while-revalidate`).
  * In-memory client caches vs browser HTTP caches.
* **2.3 Predictive Prefetching & User Intent Modeling:**
  * Link prefetching (`<link rel="prefetch">`, Quicklink, Guess.js).
  * Pointer dwell intent (>100ms) as a low-cost, high-accuracy predictor of imminent click actions.
* **2.4 Summary & Conceptual Framework:** Why combining hover-intent with SWR caching presents a balanced trade-off.

---

## Chapter 3: Research Methodology & Experimental Design
* **3.1 Design Science Research Paradigm:** Iterative artifact design and quantitative empirical evaluation.
* **3.2 Prototype System Design:** Baseline vs Optimized architecture.
* **3.3 Experimental Variables & Metrics:**
  * Navigation Latency ($ms$), TTFB ($ms$), HTTP Request Volume, Prefetch Waste Rate (%).
* **3.4 Controlled Benchmarking Protocol:**
  * 3 Network profiles: Standard Broadband (15ms RTT), Fast 4G (85ms RTT), Throttled 3G (380ms RTT).
  * 30 runs per scenario = 180 total empirical runs.
* **3.5 Ethical Considerations & Repeatability:** Zero external user tracking; 100% deterministic synthetic mock dataset.

---

## Chapter 4: System Implementation
* **4.1 Architecture Stack:** Next.js (Frontend), Node.js / Express (REST API), in-memory JavaScript SWR cache.
* **4.2 The Hover-Intent Prefetch Engine:**
  * Detail the timer debounce, fast swipe abort mechanism, and visual state feedback.
* **4.3 The In-Memory SWR Cache:**
  * State transitions (Fresh $\to$ Stale $\to$ Expired), LRU eviction, and telemetry logging hooks.
* **4.4 Synthetic Catalog Dataset:** Deterministic 5,000 item product catalog (`products.json`).
* **4.5 Empirical Instrumentation & Cockpit:** The live floating telemetry HUD and CSV export pipeline.

---

## Chapter 5: Empirical Results & Evaluation
* **5.1 Broadband Benchmark Results:**
  * Insert results table from `analysis/results_summary_table.md`.
  * Baseline: $40.85\text{ ms} \pm 6.32\text{ ms}$; Optimized: $22.46\text{ ms} \pm 17.55\text{ ms}$ (**$45.02\%$ latency reduction**).
* **5.2 Fast 4G Mobile Results:**
  * Baseline: $111.96\text{ ms} \pm 16.53\text{ ms}$; Optimized: $35.22\text{ ms} \pm 48.87\text{ ms}$ (**$68.54\%$ latency reduction**).
* **5.3 Throttled 3G Cellular Results:**
  * Baseline: $404.97\text{ ms} \pm 47.78\text{ ms}$; Optimized: $170.30\text{ ms} \pm 208.32\text{ ms}$ (**$57.95\%$ latency reduction**).
* **5.4 Statistical Significance Analysis:**
  * Welch's t-test outcomes ($p < 0.0001$ across all scenarios), verifying rejection of the null hypothesis.
* **5.5 Network Overhead & Cache Waste Analysis:**
  * Quantification of the $+20\%$ to $+30\%$ extra HTTP requests and waste rate trade-off.

---

## Chapter 6: Discussion & Architectural Principles
* **6.1 The "Perceived Zero-Latency" Threshold:** How hover-intent bridges the gap between human motor action and network round-trip time.
* **6.2 Validated Architectural Principles:**
  * *Principle 1:* Speculative prefetching must implement a dwell filter threshold ($\tau \ge 100\text{ ms}$) to prevent cursor sweep flooding.
  * *Principle 2:* Pair prefetching with an SWR cache to enable non-blocking background revalidation.
  * *Principle 3:* Adapt prefetching aggression to network state (conserve data on throttled mobile meters).
* **6.3 Limitations:** Synthetic workload vs real-world diverse user behavior; memory footprint on lower-end devices.

---

## Chapter 7: Conclusion & Future Work
* **7.1 Achievement of Objectives:** Confirmation that all 5 objectives were accomplished.
* **7.2 Summary of Contributions:** A repeatable full-stack testbed, empirical metrics on 180 runs, and verified architectural guidelines.
* **7.3 Future Research:** Integration with machine learning path prediction (Markov chains) and Service Worker persistent offline storage.
