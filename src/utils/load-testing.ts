interface LoadTestOptions {
  concurrency: number; // 并发请求数
  duration: number; // 测试持续时间（毫秒）
  delay: number; // 每个请求之间的延迟（毫秒）
  timeout: number; // 请求超时时间（毫秒）
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

interface FaultInjectionOptions {
  type: 'delay' | 'error' | 'timeout'; // 故障类型
  probability: number; // 故障发生的概率（0-1）
  delay?: number; // 延迟时间（毫秒），仅用于delay类型
  errorMessage?: string; // 错误信息，仅用于error类型
  timeout?: number; // 超时时间（毫秒），仅用于timeout类型
}

class LoadTesting {
  /**
   * 执行负载测试
   * @param fn 要测试的函数
   * @param options 测试选项
   * @returns 测试结果
   */
  async runLoadTest<T>(fn: () => Promise<T>, options: LoadTestOptions): Promise<LoadTestResult> {
    const { concurrency, duration, delay, timeout } = options;
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const responseTimes: number[] = [];
    const endTime = Date.now() + duration;

    // 并发执行函数
    const execute = async () => {
      while (Date.now() < endTime) {
        const startTime = Date.now();
        totalRequests++;

        try {
          await Promise.race([
            fn(),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Request timed out')), timeout);
            })
          ]);
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);
          successfulRequests++;
        } catch (error) {
          failedRequests++;
        }

        // 延迟下一个请求
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    // 创建并发任务
    const tasks = [];
    for (let i = 0; i < concurrency; i++) {
      tasks.push(execute());
    }

    // 等待所有任务完成
    await Promise.all(tasks);

    // 计算结果
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    const averageResponseTime = responseTimes.length > 0 ? totalResponseTime / responseTimes.length : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const requestsPerSecond = totalRequests / (duration / 1000);
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      requestsPerSecond,
      errorRate
    };
  }

  /**
   * 注入故障
   * @param fn 要执行的函数
   * @param options 故障注入选项
   * @returns 函数执行结果
   */
  async injectFault<T>(fn: () => Promise<T>, options: FaultInjectionOptions): Promise<T> {
    const { type, probability, delay, errorMessage, timeout } = options;

    // 随机决定是否注入故障
    if (Math.random() < probability) {
      switch (type) {
        case 'delay':
          console.log(`Injecting delay fault: ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay || 1000));
          return fn();
        
        case 'error':
          console.log(`Injecting error fault: ${errorMessage || 'Simulated error'}`);
          throw new Error(errorMessage || 'Simulated error');
        
        case 'timeout':
          console.log(`Injecting timeout fault: ${timeout}ms`);
          await new Promise(resolve => setTimeout(resolve, timeout || 30000));
          throw new Error('Simulated timeout');
        
        default:
          return fn();
      }
    }

    // 正常执行
    return fn();
  }

  /**
   * 执行故障注入测试
   * @param fn 要测试的函数
   * @param faultOptions 故障注入选项
   * @param loadOptions 负载测试选项
   * @returns 测试结果
   */
  async runFaultInjectionTest<T>(
    fn: () => Promise<T>,
    faultOptions: FaultInjectionOptions,
    loadOptions: LoadTestOptions
  ): Promise<LoadTestResult> {
    // 包装函数，注入故障
    const faultInjectedFn = () => this.injectFault(fn, faultOptions);
    // 执行负载测试
    return this.runLoadTest(faultInjectedFn, loadOptions);
  }

  /**
   * 模拟网络故障
   * @param fn 要执行的函数
   * @returns 函数执行结果
   */
  async simulateNetworkFault<T>(fn: () => Promise<T>): Promise<T> {
    return this.injectFault(fn, {
      type: 'error',
      probability: 0.3, // 30%的概率发生网络错误
      errorMessage: 'Network error: Connection refused'
    });
  }

  /**
   * 模拟网络延迟
   * @param fn 要执行的函数
   * @returns 函数执行结果
   */
  async simulateNetworkDelay<T>(fn: () => Promise<T>): Promise<T> {
    return this.injectFault(fn, {
      type: 'delay',
      probability: 0.5, // 50%的概率发生网络延迟
      delay: Math.random() * 2000 + 500 // 500-2500ms的延迟
    });
  }

  /**
   * 模拟服务超时
   * @param fn 要执行的函数
   * @returns 函数执行结果
   */
  async simulateServiceTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return this.injectFault(fn, {
      type: 'timeout',
      probability: 0.2, // 20%的概率发生服务超时
      timeout: 10000 // 10秒超时
    });
  }
}

// 导出单例实例
export const loadTesting = new LoadTesting();
