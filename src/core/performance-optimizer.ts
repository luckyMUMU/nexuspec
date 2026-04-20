export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.size--;
      this.stats.evictions++;
      this.stats.misses++;
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    if (this.cache.size >= this.maxSize) {
      const firstKeyResult = this.cache.keys().next();
      if (!firstKeyResult.done) {
        const firstKey = firstKeyResult.value;
        this.cache.delete(firstKey);
        this.stats.size--;
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
    this.stats.size++;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): void {
    if (this.cache.delete(key)) {
      this.stats.size--;
    }
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getSize(): number {
    return this.cache.size;
  }
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private counters: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();

  startTimer(key: string): void {
    this.startTimes.set(key, performance.now());
  }

  endTimer(key: string): number {
    const startTime = this.startTimes.get(key);
    if (startTime === undefined) {
      throw new Error(`Timer "${key}" not started`);
    }
    const duration = performance.now() - startTime;
    this.recordMetric(key, duration);
    this.startTimes.delete(key);
    return duration;
  }

  recordMetric(key: string, value: number): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    const values = this.metrics.get(key)!;
    values.push(value);
    if (values.length > 1000) {
      values.shift();
    }
  }

  incrementCounter(key: string, amount: number = 1): void {
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + amount);
  }

  getMetrics(key: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(key);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;
    const avg = sum / count;
    const min = sorted[0];
    const max = sorted[count - 1];

    const p50 = sorted[Math.floor(count * 0.5)];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return { count, sum, avg, min, max, p50, p95, p99 };
  }

  getCounter(key: string): number {
    return this.counters.get(key) || 0;
  }

  getAllMetrics(): Record<string, ReturnType<PerformanceMonitor['getMetrics']>> {
    const result: Record<string, any> = {};
    for (const key of this.metrics.keys()) {
      result[key] = this.getMetrics(key);
    }
    return result;
  }

  getAllCounters(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.counters) {
      result[key] = value;
    }
    return result;
  }

  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.startTimes.clear();
  }
}

export class AsyncQueue<T> {
  private queue: T[] = [];
  private processing = false;
  private concurrency: number;
  private processFn: (item: T) => Promise<void>;
  private onError?: (error: Error, item: T) => void;

  constructor(
    processFn: (item: T) => Promise<void>,
    options: { concurrency?: number; onError?: (error: Error, item: T) => void } = {}
  ) {
    this.processFn = processFn;
    this.concurrency = options.concurrency || 4;
    this.onError = options.onError;
  }

  add(item: T): void {
    this.queue.push(item);
    this.process();
  }

  addAll(items: T[]): void {
    this.queue.push(...items);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      let active = 0;
      while (this.queue.length > 0 || active > 0) {
        while (active < this.concurrency && this.queue.length > 0) {
          const item = this.queue.shift()!;
          active++;
          this.processFn(item)
            .catch((error) => {
              if (this.onError) {
                this.onError(error, item);
              }
            })
            .finally(() => {
              active--;
              this.process();
            });
        }
        if (this.queue.length === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      this.processing = false;
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0 && !this.processing;
  }

  async waitForEmpty(): Promise<void> {
    while (!this.isEmpty()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: { batchSize?: number; concurrency?: number } = {}
): Promise<R[]> {
  const batchSize = options.batchSize || 100;
  const concurrency = options.concurrency || 4;
  
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  const results: R[] = [];
  const queue = new AsyncQueue<T[]>(async (batch) => {
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }, { concurrency });

  queue.addAll(batches);
  await queue.waitForEmpty();

  return results;
}

export function hashKey(...args: any[]): string {
  return args.map((arg) => {
    if (typeof arg === 'object' && arg !== null) {
      return JSON.stringify(arg);
    }
    return String(arg);
  }).join(':');
}

const globalMonitor = new PerformanceMonitor();

export function getGlobalMonitor(): PerformanceMonitor {
  return globalMonitor;
}
