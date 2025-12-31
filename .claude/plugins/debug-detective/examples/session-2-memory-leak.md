# Example Session #2: Dashboard Memory Leak

**Scenario:** Production monitoring shows memory growing from 150MB to 2GB over 8 hours, causing application crashes.

## Initial Report

```
Environment: Production
Symptom: Memory usage grows continuously
Timeline: 150MB → 2GB over 8 hours
Impact: Application crashes, requires restart every 8 hours
User Action: Opening analytics dashboard multiple times
```

## Debug Detective Investigation

### Phase 1: Hypothesis Formation (3 minutes)

**Hypothesis Agent activates:**

```typescript
{
  symptom: "Continuous memory growth, correlates with dashboard usage",

  hypotheses: [
    {
      id: "H1",
      statement: "Dashboard components not cleaned up when unmounted",
      confidence: 90,
      reasoning: "Classic React memory leak - event listeners or subscriptions not removed",
      priority: 1
    },
    {
      id: "H2",
      statement: "Chart library retaining references to old data",
      confidence: 75,
      reasoning: "Dashboard uses charts, chart libraries often leak if not properly destroyed",
      priority: 2
    },
    {
      id: "H3",
      statement: "Polling/setInterval not cleared on unmount",
      confidence: 85,
      reasoning: "Dashboards often poll for updates, common leak source",
      priority: 1
    }
  ]
}
```

### Phase 2: Memory Profiling (10 minutes)

**Memory Tracker Agent activates:**

```typescript
const profilingStrategy = {
  step1: "Take baseline heap snapshot",
  step2: "Open and close dashboard 10 times",
  step3: "Force garbage collection",
  step4: "Take second heap snapshot",
  step5: "Compare snapshots"
};

const results = {
  baseline: {
    heapSize: "45 MB",
    objects: {
      "Object": 12500,
      "Array": 3200,
      "Closure": 450,
      "HTMLDivElement": 125
    }
  },

  afterTest: {
    heapSize: "385 MB (+340 MB)",
    objects: {
      "Object": 48000,  // +35500
      "Array": 28000,   // +24800
      "Closure": 1950,  // +1500
      "HTMLDivElement": 125,
      "Detached HTMLCanvasElement": 10  // ← Suspicious!
    }
  },

  afterGC: {
    heapSize: "378 MB (+333 MB)",  // Only 7MB freed!
    note: "Leak confirmed - memory not freed after GC"
  }
};
```

### Phase 3: Retention Path Analysis (5 minutes)

**Memory Tracker Agent** examines what's holding references:

```typescript
const retentionAnalysis = {
  leakedObjects: [
    {
      type: "Detached HTMLCanvasElement",
      count: 10,
      size: "~30 MB each",

      retentionPath: `
        Detached HTMLCanvasElement (300 MB)
        ← chartInstance.canvas  (Chart.js reference)
        ← Closure (useEffect)
        ← Dashboard Component
        ← EventListener (window.resize)
        ← Window
        ← Global

        ANALYSIS:
        - Canvas element was removed from DOM
        - But Chart.js still holds reference
        - Chart instance kept alive by resize event listener
        - Event listener never removed on unmount
      `
    }
  ],

  diagnosis: "Chart instances not destroyed, event listeners not cleaned up"
};
```

### Phase 4: Code Analysis (5 minutes)

**Data Flow Agent** examines dashboard code:

```typescript
const codeAnalysis = {
  file: "components/Dashboard.tsx",

  problematicCode: `
    function Dashboard() {
      const chartRef = useRef<Chart>();

      useEffect(() => {
        // Create chart
        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: chartData
        });

        // Add resize handler
        const handleResize = () => {
          chartRef.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        // ❌ MISSING CLEANUP!
        // Should be:
        // return () => {
        //   window.removeEventListener('resize', handleResize);
        //   chartRef.current?.destroy();
        // };
      }, [chartData]);  // ← Also problematic: chartData in deps

      return <canvas ref={canvasRef} />;
    }
  `,

  issues: [
    {
      issue: "Event listener not removed",
      impact: "Window keeps reference to closure → keeps Component → keeps Chart",
      severity: "critical"
    },
    {
      issue: "Chart instance not destroyed",
      impact: "Canvas element and data retained in memory",
      severity: "critical"
    },
    {
      issue: "chartData in dependency array",
      impact: "Effect runs on every data update, creates new chart without destroying old",
      severity: "high"
    }
  ]
};
```

### Phase 5: Evidence Collection (5 minutes)

**Evidence Collector Agent** verifies the fix:

```typescript
const experiment = {
  hypothesis: "Adding cleanup will prevent memory leak",

  test: {
    procedure: [
      "Add cleanup function to useEffect",
      "Open/close dashboard 10 times",
      "Measure memory"
    ],

    fix: `
      useEffect(() => {
        const ctx = canvasRef.current.getContext('2d');
        const chart = new Chart(ctx, {
          type: 'line',
          data: chartData
        });

        const handleResize = () => {
          chart.resize();
        };
        window.addEventListener('resize', handleResize);

        // ✅ CLEANUP ADDED
        return () => {
          window.removeEventListener('resize', handleResize);
          chart.destroy();  // Destroys chart and frees canvas
        };
      }, []);  // Remove chartData from deps, update chart manually
    `,

    results: {
      before: {
        baseline: "45 MB",
        after10Opens: "385 MB (+340 MB)",
        leakPerOpen: "34 MB",
        hourlyGrowth: "~200 MB/hour"
      },

      after: {
        baseline: "45 MB",
        after10Opens: "52 MB (+7 MB)",
        leakPerOpen: "0.7 MB (acceptable temp memory)",
        hourlyGrowth: "~5 MB/hour (within normal bounds)"
      }
    }
  },

  conclusion: "FIX VERIFIED: Memory leak eliminated"
};
```

### Phase 6: Comprehensive Fix (15 minutes)

**Solution includes additional improvements:**

```typescript
const comprehensiveSolution = {
  changes: [
    {
      file: "components/Dashboard.tsx",
      description: "Add cleanup and optimize chart updates",
      code: `
        function Dashboard() {
          const chartRef = useRef<Chart>();
          const canvasRef = useRef<HTMLCanvasElement>(null);

          useEffect(() => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;

            // Create chart
            const chart = new Chart(ctx, {
              type: 'line',
              data: chartData
            });
            chartRef.current = chart;

            // Resize handler
            const handleResize = () => {
              chart.resize();
            };
            window.addEventListener('resize', handleResize);

            // ✅ Cleanup function
            return () => {
              window.removeEventListener('resize', handleResize);
              chart.destroy();
              chartRef.current = undefined;
            };
          }, []);  // Run only on mount/unmount

          // Separate effect to update chart data
          useEffect(() => {
            if (chartRef.current) {
              chartRef.current.data = chartData;
              chartRef.current.update();
            }
          }, [chartData]);

          return <canvas ref={canvasRef} />;
        }
      `
    }
  ],

  additionalMeasures: [
    {
      name: "Add memory monitoring",
      code: `
        // hooks/useMemoryMonitor.ts
        export function useMemoryMonitor(componentName: string) {
          useEffect(() => {
            const initial = performance.memory?.usedJSHeapSize;

            return () => {
              const final = performance.memory?.usedJSHeapSize;
              const leak = final - initial;

              if (leak > 10_000_000) {  // 10 MB threshold
                console.warn(\`Potential leak in \${componentName}: \${leak / 1_000_000}MB\`);

                // Report to monitoring
                reportMemoryLeak({
                  component: componentName,
                  leak: leak
                });
              }
            };
          }, [componentName]);
        }

        // Usage in Dashboard
        function Dashboard() {
          useMemoryMonitor('Dashboard');
          // ...
        }
      `
    },
    {
      name: "Add ESLint rule",
      code: `
        // .eslintrc.js
        rules: {
          'react-hooks/exhaustive-deps': 'error',

          // Custom rule: warn about useEffect without cleanup
          'require-cleanup-in-effect': 'warn'
        }
      `
    }
  ],

  tests: [
    {
      type: "memory_leak_test",
      code: `
        describe('Dashboard memory leak prevention', () => {
          test('does not leak memory after mount/unmount cycle', async () => {
            const initialMemory = getHeapSize();

            // Mount and unmount 10 times
            for (let i = 0; i < 10; i++) {
              const { unmount } = render(<Dashboard />);
              await waitFor(() => {
                expect(screen.getByRole('img')).toBeInTheDocument();
              });
              unmount();
            }

            // Force GC
            if (global.gc) global.gc();

            const finalMemory = getHeapSize();
            const leak = finalMemory - initialMemory;

            // Allow 10 MB tolerance
            expect(leak).toBeLessThan(10_000_000);
          });

          test('cleans up event listeners on unmount', () => {
            const { unmount } = render(<Dashboard />);

            const listenersBefore = getEventListenerCount(window, 'resize');
            unmount();
            const listenersAfter = getEventListenerCount(window, 'resize');

            expect(listenersAfter).toBe(listenersBefore);
          });

          test('destroys chart instance on unmount', () => {
            const destroySpy = jest.spyOn(Chart.prototype, 'destroy');

            const { unmount } = render(<Dashboard />);
            unmount();

            expect(destroySpy).toHaveBeenCalled();
          });
        });
      `
    }
  ]
};
```

### Results

**Before Debug Detective:**
- Memory leak: **340 MB per 10 opens**
- Production crashes: **Every 8 hours**
- Investigation time: **Not found in 1 week**
- Impact: **High customer dissatisfaction**

**With Debug Detective:**
- Investigation time: **28 minutes**
- Memory leak: **Eliminated (7 MB temp memory)**
- Production stability: **No crashes**
- Tests added: **3 comprehensive tests**
- Prevention: **Memory monitoring + linting**

**Cost Savings:**
- Server restarts eliminated: **Save $2000/month in engineering time**
- Customer satisfaction: **No more dashboard crashes**
- Development velocity: **Pattern documented for team**

---

## Key Insights from Memory Tracker Agent

1. **Detached DOM Elements**: Canvas elements removed from DOM but kept in memory
2. **Retention Path**: Event listeners prevent garbage collection
3. **Chart Library**: Chart.js instances must be explicitly destroyed
4. **Common Pattern**: React + third-party libraries often have cleanup requirements

## Prevention Measures

```typescript
// New team guideline added:
const cleanupChecklist = {
  title: "useEffect Cleanup Checklist",

  rules: [
    "❓ Does this effect add event listeners? → Remove in cleanup",
    "❓ Does this effect create timers/intervals? → Clear in cleanup",
    "❓ Does this effect subscribe to data? → Unsubscribe in cleanup",
    "❓ Does this effect create third-party instances? → Destroy in cleanup",
    "❓ Does this effect modify global state? → Restore in cleanup"
  ],

  examples: {
    eventListener: "window.addEventListener → removeEventListener",
    timer: "setInterval → clearInterval",
    subscription: "subscribe() → unsubscribe()",
    thirdParty: "new Chart() → chart.destroy()",
    observer: "new Observer() → observer.disconnect()"
  }
};
```

**This memory leak would have been nearly impossible to debug manually in production.** The Memory Tracker Agent's retention path analysis immediately identified the exact cause: event listeners keeping chart instances alive.
