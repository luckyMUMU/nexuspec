import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LRUCache, PerformanceMonitor, getGlobalMonitor, AsyncQueue, batchProcess, hashKey } from '../core/performance-optimizer';
import { retry, CircuitBreaker, RateLimiter, Bulkhead, withFallback, withTimeout } from '../core/resilience';

describe('Performance Optimizer Tests', () => {
  describe('LRUCache', () => {
    it('should set and get values correctly', () => {
      const cache = new LRUCache<string, number>({ maxSize: 10, defaultTTL: 60000 });
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should evict least recently used items', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3, defaultTTL: 60000 });
      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.set('key3', 3);
      cache.set('key4', 4);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return stats', () => {
      const cache = new LRUCache<string, number>();
      cache.set('key1', 1);
      cache.get('key1');
      cache.get('missing');
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track metrics', async () => {
      const monitor = new PerformanceMonitor();
      monitor.startTimer('test');
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = monitor.endTimer('test');
      expect(duration).toBeGreaterThan(0);
      
      const metrics = monitor.getMetrics('test');
      expect(metrics).not.toBeNull();
      expect(metrics?.count).toBe(1);
    });

    it('should track counters', () => {
      const monitor = new PerformanceMonitor();
      monitor.incrementCounter('test', 5);
      expect(monitor.getCounter('test')).toBe(5);
    });
  });

  describe('AsyncQueue', async () => {
    it('should process items in order', async () => {
      const results: number[] = [];
      const queue = new AsyncQueue<number>(async (item) => {
        results.push(item);
      });
      
      queue.addAll([1, 2, 3, 4, 5]);
      await queue.waitForEmpty();
      
      expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle concurrency', async () => {
      const active = { count: 0 };
      const maxActive = { count: 0 };
      const queue = new AsyncQueue<number>(async (item) => {
        active.count++;
        maxActive.count = Math.max(maxActive.count, active.count);
        await new Promise(resolve => setTimeout(resolve, 10));
        active.count--;
      }, { concurrency: 2 });
      
      queue.addAll([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      await queue.waitForEmpty();
      
      expect(maxActive.count).toBeLessThanOrEqual(2);
    });
  });

  describe('batchProcess', async () => {
    it('should process items in batches', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const results = await batchProcess(
        items,
        async (batch) => batch.map(x => x * 2),
        { batchSize: 10 }
      );
      
      expect(results).toEqual(items.map(x => x * 2));
    });
  });

  describe('hashKey', () => {
    it('should generate unique keys for different inputs', () => {
      const key1 = hashKey('test', 123, { foo: 'bar' });
      const key2 = hashKey('test', 456, { foo: 'bar' });
      expect(key1).not.toBe(key2);
    });

    it('should generate same key for same inputs', () => {
      const key1 = hashKey('test', 123, { foo: 'bar' });
      const key2 = hashKey('test', 123, { foo: 'bar' });
      expect(key1).toBe(key2);
    });
  });
});

describe('Resilience Tests', () => {
  describe('retry', async () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const errorProneFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      const result = await retry(errorProneFn, { maxAttempts: 5, initialDelay: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max attempts', async () => {
      let attempts = 0;
      const alwaysFails = async () => {
        attempts++;
        throw new Error('Always fails');
      };
      
      await expect(retry(alwaysFails, { maxAttempts: 3, initialDelay: 10 })).rejects.toThrow('Always fails');
      expect(attempts).toBe(3);
    });
  });

  describe('CircuitBreaker', async () => {
    it('should open circuit after failures', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 });
      const failingFn = async () => {
        throw new Error('Failed');
      };
      
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      
      expect(breaker.getState()).toBe('open');
    });

    it('should use fallback when open', async () => {
      const breaker = new CircuitBreaker({ 
        failureThreshold: 2,
        resetTimeout: 60000,
        fallback: () => 'fallback'
      });
      
      await expect(breaker.execute(async () => { throw new Error() })).rejects.toThrow();
      await expect(breaker.execute(async () => { throw new Error() })).rejects.toThrow();
      
      const result = await breaker.execute(async () => 'should not be called');
      expect(result).toBe('fallback');
    });
  });

  describe('RateLimiter', () => {
    it('should limit requests', () => {
      const limiter = new RateLimiter({ limit: 3, window: 1000 });
      
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it('should report remaining', () => {
      const limiter = new RateLimiter({ limit: 5, window: 1000 });
      limiter.tryAcquire();
      expect(limiter.getRemaining()).toBe(4);
    });
  });

  describe('Bulkhead', async () => {
    it('should limit concurrent execution', async () => {
      const bulkhead = new Bulkhead({ maxConcurrent: 2, maxQueueSize: 10 });
      let active = 0;
      let maxActive = 0;
      
      const testFn = async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 20));
        active--;
      };
      
      const promises = Array.from({ length: 5 }, () => bulkhead.execute(testFn));
      await Promise.all(promises);
      
      expect(maxActive).toBeLessThanOrEqual(2);
    });
  });

  describe('withFallback', async () => {
    it('should use fallback on error', async () => {
      const result = await withFallback(
        async () => { throw new Error('Failed'); },
        () => 'fallback'
      );
      expect(result).toBe('fallback');
    });

    it('should return normal result on success', async () => {
      const result = await withFallback(
        async () => 'success',
        () => 'fallback'
      );
      expect(result).toBe('success');
    });
  });

  describe('withTimeout', async () => {
    it('should timeout after specified time', async () => {
      await expect(withTimeout(
        async () => new Promise(resolve => setTimeout(resolve, 100)),
        { timeout: 50 }
      )).rejects.toThrow('Operation timeout');
    });

    it('should complete before timeout', async () => {
      const result = await withTimeout(
        async () => 'success',
        { timeout: 100 }
      );
      expect(result).toBe('success');
    });
  });
});

describe('Performance Benchmark', () => {
  it('should complete analysis in under 1 second', async () => {
    const monitor = getGlobalMonitor();
    monitor.startTimer('benchmark');
    
    const cache = new LRUCache<string, number>();
    for (let i = 0; i < 10000; i++) {
      cache.set(`key${i}`, i);
    }
    
    for (let i = 0; i < 10000; i++) {
      cache.get(`key${i}`);
    }
    
    const duration = monitor.endTimer('benchmark');
    console.log(`Benchmark completed in ${duration.toFixed(2)}ms`);
    
    expect(duration).toBeLessThan(1000);
  });
});
