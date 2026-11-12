# Empirical Methodology & Benchmarking Protocol

**Project Title:** An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications  
**Proposer:** Jarin Tasnim | **Supervisor:** Fati Tahiru  

---

## 1. Research Paradigm: Design Science & Abductive Logic
This study follows an **abductive research logic** (Domènech et al., 2012) within a Design Science Research framework. Rather than evaluating purely theoretical caching models, the methodology iteratively alternates between:
1. **Architectural Conception:** Designing predictive prefetching algorithms and cache state machines.
2. **Empirical Benchmarking:** Stress-testing implementations under controlled network throttling profiles.
3. **Data-Driven Evaluation:** Measuring trade-offs between latency reduction and network cache waste.

---

## 2. Experimental Variables

### 2.1 Independent Variables
1. **Architectural Fetching Strategy ($M$):**
   * $M_0$: Baseline on-demand data fetching.
   * $M_1$: Algorithmic optimization (Hover dwell $>100\text{ ms}$ + In-memory SWR cache).
2. **Network Emulation Profile ($N$):**
   * $N_1$: **Standard Broadband** ($15\text{ ms RTT}$, $50\text{ Mbps}$).
   * $N_2$: **Fast 4G Mobile** ($85\text{ ms RTT}$, $15\text{ Mbps}$).
   * $N_3$: **Throttled 3G Cellular** ($380\text{ ms RTT}$, $750\text{ kbps}$).
3. **Pointer Dwell Intent Threshold ($\tau$):**
   * Default $\tau = 100\text{ ms}$ (tested across sensitivity intervals $50\text{ ms} - 250\text{ ms}$).

### 2.2 Dependent Variables (Measured Metrics)
1. **Client Navigation Latency ($L_{\text{nav}}$ in milliseconds):**
   The elapsed wall-clock duration from the instant the user triggers navigation (click event) until the target view and payload are fully parsed, bound to React state, and rendered in the DOM.
2. **Time to First Byte ($\text{TTFB}$ in milliseconds):**
   The time required from dispatching the retrieval request until the initial byte arrives at the client runtime.
3. **Total HTTP Request Volume ($V_{\text{req}}$):**
   The cumulative count of network requests dispatched over the wire during the session.
4. **Prefetch Cache Waste Rate ($W_{\text{rate}}$ as a percentage):**
   The proportion of speculative prefetch requests that were retrieved but never consumed by user navigation within the active session TTL:
   $$W_{\text{rate}} = \left( \frac{\text{Wasted Prefetches}}{\text{Total Initiated Prefetches}} \right) \times 100\%$$
5. **Latency Reduction Percentage ($\Delta L$):**
   $$\Delta L = \left( \frac{\bar{L}_{\text{baseline}} - \bar{L}_{\text{optimized}}}{\bar{L}_{\text{baseline}}} \right) \times 100\%$$

---

## 3. Experimental Protocol (180 Controlled Runs)

To achieve high statistical power and satisfy Thesis Objective 4, the testing matrix consists of:
$$\text{Total Runs} = 3 \text{ Network Profiles} \times 2 \text{ Architecture Modes} \times 30 \text{ Repetitions} = 180 \text{ Runs}$$

* **Repetitions ($k = 30$):** Eliminates transient operating system background anomalies, garbage collection pauses, and TCP connection establishment outliers.
* **Statistical Validation:** A two-sample Welch's t-test with unequal variances is conducted for each network profile to ensure $p < 0.001$, proving statistical significance.
