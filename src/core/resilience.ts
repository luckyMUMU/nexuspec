export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryOn?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  onStateChange?: (state: CircuitBreakerState) => void;
  fallback?: (...args: any[]) => any;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryOn = () => true,
    onRetry,
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt >= maxAttempts) {
        break;
      }

      if (!retryOn(lastError)) {
        break;
      }

      if (onRetry) {
        onRetry(attempt, lastError, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 30000,
      resetTimeout: options.resetTimeout || 60000,
      onStateChange: options.onStateChange || (() => {}),
      fallback: options.fallback || (() => {
        throw new Error('Circuit breaker is open');
      }),
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.setState('half-open');
      } else {
        if (this.options.fallback) {
          return this.options.fallback() as T;
        }
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.setState('closed');
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.setState('open');
      this.successCount = 0;
    } else if (this.state === 'closed') {
      this.failureCount++;
      if (this.failureCount >= this.options.failureThreshold) {
        this.setState('open');
      }
    }
  }

  private setState(state: CircuitBreakerState): void {
    if (this.state !== state) {
      this.state = state;
      this.options.onStateChange(state);
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  forceClose(): void {
    this.setState('closed');
    this.failureCount = 0;
    this.successCount = 0;
  }

  forceOpen(): void {
    this.setState('open');
    this.lastFailureTime = Date.now();
  }

  reset(): void {
    this.setState('closed');
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

export interface RateLimiterOptions {
  limit: number;
  window: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = {
      limit: options.limit,
      window: options.window,
    };
  }

  tryAcquire(key: string = 'global'): boolean {
    const now = Date.now();
    const windowStart = now - this.options.window;

    let history = this.requests.get(key) || [];
    history = history.filter((timestamp) => timestamp > windowStart);

    if (history.length >= this.options.limit) {
      this.requests.set(key, history);
      return false;
    }

    history.push(now);
    this.requests.set(key, history);
    return true;
  }

  async acquire(key: string = 'global'): Promise<void> {
    while (!this.tryAcquire(key)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  getRemaining(key: string = 'global'): number {
    const now = Date.now();
    const windowStart = now - this.options.window;
    const history = (this.requests.get(key) || []).filter(
      (timestamp) => timestamp > windowStart
    );
    return Math.max(0, this.options.limit - history.length);
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export interface BulkheadOptions {
  maxConcurrent?: number;
  maxQueueSize?: number;
  timeout?: number;
}

export class Bulkhead {
  private active = 0;
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    fn: () => Promise<any>;
  }> = [];
  private options: Required<BulkheadOptions>;

  constructor(options: BulkheadOptions = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent || 10,
      maxQueueSize: options.maxQueueSize || 100,
      timeout: options.timeout || 30000,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.options.maxConcurrent) {
      if (this.queue.length >= this.options.maxQueueSize) {
        throw new Error('Bulkhead queue full');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = this.queue.findIndex((item) => item.resolve === resolve);
          if (index !== -1) {
            this.queue.splice(index, 1);
            reject(new Error('Bulkhead timeout'));
          }
        }, this.options.timeout);

        this.queue.push({
          resolve: (value) => {
            clearTimeout(timeout);
            resolve(value);
          },
          reject: (reason) => {
            clearTimeout(timeout);
            reject(reason);
          },
          fn,
        });
      });
    }

    return this.doExecute(fn);
  }

  private async doExecute<T>(fn: () => Promise<T>): Promise<T> {
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.active >= this.options.maxConcurrent) {
      return;
    }

    const item = this.queue.shift();
    if (item) {
      this.doExecute(item.fn).then(item.resolve).catch(item.reject);
    }
  }

  getActiveCount(): number {
    return this.active;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: () => T | Promise<T>,
  shouldFallback?: (error: Error) => boolean
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (shouldFallback && !shouldFallback(error as Error)) {
      throw error;
    }
    return fallback();
  }
}

export interface TimeoutOptions {
  timeout?: number;
  errorMessage?: string;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const { timeout = 30000, errorMessage = 'Operation timeout' } = options;

  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeout)
    ),
  ]);
}

export function createResilientFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    retry?: RetryOptions;
    circuitBreaker?: CircuitBreakerOptions;
    bulkhead?: BulkheadOptions;
    timeout?: TimeoutOptions;
    fallback?: (...args: Parameters<T>) => ReturnType<T>;
  } = {}
): T {
  let cb: CircuitBreaker | undefined;
  let bulkhead: Bulkhead | undefined;

  if (options.circuitBreaker) {
    cb = new CircuitBreaker(options.circuitBreaker);
  }

  if (options.bulkhead) {
    bulkhead = new Bulkhead(options.bulkhead);
  }

  return (async (...args: Parameters<T>) => {
    const wrappedFn = async () => {
      let result = fn(...args);

      if (options.timeout) {
        result = withTimeout(() => result, options.timeout) as Promise<any>;
      }

      return result;
    };

    try {
      let executor = wrappedFn;

      if (cb) {
        executor = () => cb.execute(wrappedFn);
      }

      if (bulkhead) {
        executor = () => bulkhead.execute(executor);
      }

      if (options.retry) {
        return await retry(executor, options.retry);
      }

      return await executor();
    } catch (error) {
      if (options.fallback) {
        return options.fallback(...args);
      }
      throw error;
    }
  }) as T;
}
