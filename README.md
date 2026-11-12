# An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-REST_API-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-yellow.svg)](LICENSE)

* **Project Proposer:** Jarin Tasnim  
* **Academic Supervisor:** Fati Tahiru  
* **Research Field:** Software Architecture, Web Performance Optimization, Empirical Network Benchmarking  

---

## 📌 Executive Summary

Modern web applications suffer from perceived latency bottlenecks when relying on conventional on-demand data fetching. This research platform provides a repeatable, controlled empirical framework that compares:
* **Mode A (Baseline):** Conventional on-demand REST API data fetching on user click.
* **Mode B (Optimized):** Algorithmic hover-intent predictive prefetching (triggering on a `>100ms` pointer dwell) combined with an in-memory **Stale-While-Revalidate (SWR)** caching layer.

The project evaluates both strategies across **3 simulated network profiles** (Standard Broadband, Fast 4G, and Throttled 3G) over **30 runs per scenario (180 total experimental runs)** to quantify:
1. **Client Navigation Latency (ms)**
2. **Time to First Byte (TTFB)**
3. **Total HTTP Request Volume**
4. **Prefetch Cache Waste Rate (%)**

---

## 🚀 Quick Start Guide (Run on Any Computer)

This project requires **zero paid APIs, zero cloud databases, and zero external subscriptions**. It runs completely locally on Windows, macOS, or Linux.

### Prerequisites
* [Node.js](https://nodejs.org/) (Version 18 or higher)
* [Python 3](https://python.org/) (Optional, for running statistical analysis and generating SVG charts)

---

### Option 1: One-Command Start (Recommended)

#### On macOS / Linux:
```bash
./start.sh
```

#### On Windows:
Double-click `start.bat` or run:
```cmd
start.bat
```

---

### Option 2: Standard NPM Workflow
If you prefer running commands manually:

```bash
# 1. Install all dependencies and seed the 5,000 product mock dataset
npm run setup

# 2. Start both Backend API (Port 5001) and Frontend (Port 3000) concurrently
npm run dev
```

### Accessing the System:
* **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
* **Empirical Benchmark Cockpit:** [http://localhost:3000/benchmark-dashboard](http://localhost:3000/benchmark-dashboard)
* **Backend REST API Health Check:** [http://localhost:5001/api/health](http://localhost:5001/api/health)
* **Catalog API Endpoint:** [http://localhost:5001/api/products](http://localhost:5001/api/products)

---

### Option 3: Docker Compose (Optional)
If your examiner or supervisor prefers containerized execution:
```bash
docker compose up --build
```

---

## 🧪 Automated Benchmarking & Statistical Analysis

To reproduce the exact 180 controlled experimental runs specified in Thesis Objective 4:

```bash
# 1. Execute the 180-run automated benchmark suite across all 3 network profiles
npm run benchmark

# 2. Run statistical evaluation (computes Mean, Std Dev, Welch's t-test, and renders charts)
npm run analyze
```

* **Raw CSV Results:** [`benchmark/raw-results/benchmark_results.csv`](benchmark/raw-results/benchmark_results.csv)
* **Formatted Summary Table:** [`analysis/results_summary_table.md`](analysis/results_summary_table.md)
* **Publication SVG Charts:** [`analysis/charts/latency_comparison.svg`](analysis/charts/latency_comparison.svg)

---

## 📊 Summary of Empirical Results

| Network Profile | Mode | Mean Latency (ms) | Std Dev (ms) | Mean TTFB (ms) | Total Requests | Latency Reduction (%) | Welch t-test |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Broadband** | Baseline | 40.85 | 6.32 | 22.84 | 30 | — | — |
| **Broadband** | Optimized | 22.46 | 17.55 | 11.48 | 40 | **45.02%** | $p < 0.0001$ |
| **Fast 4G** | Baseline | 111.96 | 16.53 | 93.59 | 30 | — | — |
| **Fast 4G** | Optimized | 35.22 | 48.87 | 28.11 | 36 | **68.54%** | $p < 0.0001$ |
| **Throttled 3G** | Baseline | 404.97 | 47.78 | 386.35 | 30 | — | — |
| **Throttled 3G** | Optimized | 170.30 | 208.32 | 161.31 | 34 | **57.95%** | $p < 0.0001$ |

---

## 🏗️ Repository Architecture

```
├── backend/
│   ├── src/
│   │   ├── server.js               # Express REST API Server
│   │   ├── routes/products.js      # Product and telemetry routes
│   │   ├── controllers/productController.js
│   │   └── data/
│   │       ├── generate_dataset.js # Deterministic 5,000 product generator
│   │       └── products.json       # Mock catalog dataset (5.6 MB)
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js           # Root layout & Metadata
│   │   │   ├── page.js             # Catalog view & interactive experiment hero
│   │   │   ├── products/[id]/page.js # Route diagnostic & detailed specs
│   │   │   ├── benchmark-dashboard/page.js # Dedicated evaluation cockpit
│   │   │   └── globals.css         # Modern design tokens, glassmorphism, animations
│   │   ├── components/
│   │   │   ├── Navbar.js           # Header with real-time Mode Switcher
│   │   │   ├── ProductCard.js      # Dwell-intent detection with visual glow
│   │   │   └── MetricsHUD.js       # Live floating performance HUD
│   │   ├── lib/
│   │   │   ├── cache/swrCache.js   # In-memory SWR cache & waste tracker
│   │   │   ├── prefetch/hoverIntent.js # >100ms dwell intent prefetch engine
│   │   │   ├── metrics/performanceTracker.js # Central telemetry engine & CSV exporter
│   │   │   └── api/client.js       # Unified dual-mode API fetcher
│   ├── package.json
│   └── Dockerfile
├── benchmark/
│   ├── run_synthetic_benchmark.js  # 180-run controlled benchmark script
│   └── raw-results/
│       └── benchmark_results.csv   # Raw experimental measurements
├── analysis/
│   ├── analyze_results.py          # Python statistical evaluator & chart builder
│   ├── results_summary_table.md    # Ready-to-use chapter results table
│   └── charts/
│       └── latency_comparison.svg  # Comparative latency chart
├── docs/
│   ├── SYSTEM_ARCHITECTURE.md      # Full architecture specifications
│   ├── METHODOLOGY.md              # Research paradigm, variables, equations
│   └── THESIS_CHAPTERS_GUIDE.md    # Complete chapter-by-chapter dissertation guide
├── start.sh                        # Mac / Linux one-click runner
├── start.bat                       # Windows one-click runner
├── docker-compose.yml              # Container orchestration
└── package.json                    # Root npm scripts
```

---

## 💡 How to Demonstrate the System to Examiners / Supervisors

1. **Start the Application:** Run `./start.sh` (or `npm run dev`).
2. **Observe Baseline Mode:**
   * In the top navbar, click **Mode A: Baseline**.
   * Hover over product cards — notice no prefetch occurs.
   * Click any product card — observe in the floating HUD that latency matches the full simulated network round-trip (e.g. 100ms+ on 4G).
3. **Observe Optimized Mode:**
   * Switch the navbar toggle to **Mode B: Optimized (SWR)**.
   * Hover over any product card for **>100ms** — notice the card pulses cyan indicating intent-based prefetching into SWR cache.
   * Click the card — navigation renders in **sub-5ms**, accompanied by a green diagnostic badge.
4. **Demonstrate Waste Rejection:**
   * Rapidly swipe your cursor across multiple cards (<100ms) — the debounce timer cancels immediately, preventing speculative bandwidth waste!
5. **Inspect Live Benchmark Telemetry:**
   * Visit `/benchmark-dashboard` to view cumulative averages, hit ratios, and click **Export Raw CSV Data** to download the dataset for verification.
