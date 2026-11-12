# System Architecture & Technical Specifications

**Project Title:** An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications  
**Proposer:** Jarin Tasnim | **Supervisor:** Fati Tahiru  

---

## 1. Architectural Overview

The system is constructed as a decoupled full-stack web research platform designed to experimentally compare two data-fetching paradigms under identical environmental constraints:
1. **Mode A: Baseline Implementation** (Conventional on-demand data fetching upon user click).
2. **Mode B: Algorithmic Optimization Layer** (Hover-intent predictive prefetching triggered on >100ms pointer dwell, coupled with an in-memory Stale-While-Revalidate caching engine).

```
                      +-------------------------------------------------+
                      |                CLIENT BROWSER                   |
                      |  (Next.js 14 / React Virtual DOM Architecture)  |
                      +-------------------------------------------------+
                                      |                     |
                   [Hover Dwell >100ms]                     [Direct Click]
                                      v                     v
                +----------------------------+      +-------------------------+
                |   Hover-Intent Engine      |      |  Baseline Fetch Engine  |
                |  - Debounce (100ms threshold)     |  - On-Demand Request    |
                |  - Fast-Swipe Cancellation |      |  - No Speculation       |
                +----------------------------+      +-------------------------+
                              |                                  |
                              v                                  |
                +----------------------------+                   |
                |   In-Memory SWR Cache      |                   |
                |  - LRU Key-Value Map       |                   |
                |  - Lifecycle Tagging       |                   |
                |  - Waste Rate Telemetry    |                   |
                +----------------------------+                   |
                              |                                  |
                              +----------------+-----------------+
                                               |
                                               v  (HTTP / JSON REST)
                               +-------------------------------+
                               |     Network Simulation Layer  |
                               |  - Standard Broadband (15ms)  |
                               |  - Fast 4G Mobile (85ms)      |
                               |  - Throttled 3G (380ms)       |
                               +-------------------------------+
                                               |
                                               v
                               +-------------------------------+
                               |      Node.js / Express API    |
                               |  (Deterministic Synthetic DB) |
                               |  5,000 Catalog Items (JSON)   |
                               +-------------------------------+
```

---

## 2. Core Algorithmic Components

### 2.1 Hover-Intent Predictive Prefetcher (`frontend/src/lib/prefetch/hoverIntent.js`)
* **Dwell Threshold ($\tau$):** Parameterized at $\tau = 100\text{ ms}$.
* **Mechanism:**
  1. User hovers pointer over card or anchor element: `onPointerEnter` initiates high-precision timer `setTimeout(callback, 100)`.
  2. If the user moves pointer away before $100\text{ ms}$: `onPointerLeave` executes `clearTimeout()`. This completely cancels speculative prefetch, eliminating unnecessary network bandwidth on rapid cursor swipes.
  3. If dwell time $t \ge 100\text{ ms}$: The intent callback fires, requesting the target resource and injecting it into SWR cache.
  4. Concurrent deduplication ensures duplicate requests for in-flight resources are blocked.

### 2.2 Stale-While-Revalidate (SWR) In-Memory Cache (`frontend/src/lib/cache/swrCache.js`)
* Implements the HTTP RFC 5861 `stale-while-revalidate` logic in client JavaScript memory:
  * **Fresh State:** Age $\le \text{TTL}$ (default 120 seconds). Instant synchronous return ($\text{latency} < 5\text{ ms}$).
  * **Stale State:** $\text{TTL} < \text{Age} \le (\text{TTL} + \text{Grace Period})$. Returns cached data immediately to keep UI responsive, while initiating an asynchronous background HTTP fetch to update cache.
  * **Consumption & Waste Tracking:**
    * When an item is prefetched, it is marked `prefetched = true`, `consumed = false`.
    * When the user clicks the route, `markConsumed()` sets `consumed = true`.
    * If the entry expires or session completes without consumption, it is registered as `wasted`.

---

## 3. REST API Specifications

The backend server is implemented using Node.js and Express.js running on port `5001`.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/products` | `GET` | Paginated product listing. Supports `page`, `limit`, `category`, `search`, `sortBy`, `delay`. |
| `/api/products/:id` | `GET` | Individual product specification by ID, with 4 clustered related products. |
| `/api/categories` | `GET` | List of all available product categories and inventory counts. |
| `/api/telemetry` | `POST` | Ingests client-side experimental navigation timing records. |
| `/api/telemetry` | `GET` | Retrieves aggregated telemetry records. |
| `/api/health` | `GET` | Service uptime and request counter diagnostic endpoint. |

---

## 4. Synthetic Mock Dataset
To eliminate external network volatility, a deterministic dataset containing 5,000 realistic e-commerce products is stored at `backend/src/data/products.json`.
Each record includes deterministic identifiers, pricing, reviews, technical specifications (latency, battery autonomy, wireless protocol), and unique dynamic CSS gradient palettes.
