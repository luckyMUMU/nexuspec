interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  components: Record<string, {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
  }>;
  timestamp: number;
}

class Monitoring {
  private metrics: Metric[] = [];
  private metricRetention: number = 60000; // 保留1分钟的指标数据

  /**
   * 记录指标
   * @param name 指标名称
   * @param value 指标值
   * @param tags 标签
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);
    this.cleanupOldMetrics();
  }

  /**
   * 清理旧的指标数据
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    this.metrics = this.metrics.filter(metric => now - metric.timestamp < this.metricRetention);
  }

  /**
   * 获取指标数据
   * @param name 指标名称
   * @param tags 标签过滤
   * @returns 指标数据
   */
  getMetrics(name?: string, tags?: Record<string, string>): Metric[] {
    let filteredMetrics = this.metrics;

    if (name) {
      filteredMetrics = filteredMetrics.filter(metric => metric.name === name);
    }

    if (tags) {
      filteredMetrics = filteredMetrics.filter(metric => {
        if (!metric.tags) return false;
        return Object.entries(tags).every(([key, value]) => metric.tags![key] === value);
      });
    }

    return filteredMetrics;
  }

  /**
   * 检查系统健康状态
   * @returns 健康状态
   */
  async checkHealth(): Promise<HealthStatus> {
    const components: Record<string, {
      status: 'healthy' | 'unhealthy' | 'degraded';
      message?: string;
    }> = {};

    // 检查文件系统
    try {
      // 尝试写入一个临时文件来检查文件系统权限
      const fs = require('fs');
      const path = require('path');
      const tempFile = path.join(__dirname, 'temp-health-check.txt');
      fs.writeFileSync(tempFile, 'health check');
      fs.unlinkSync(tempFile);
      components['filesystem'] = { status: 'healthy' };
    } catch (error) {
      components['filesystem'] = { 
        status: 'unhealthy', 
        message: `File system error: ${(error as Error).message}` 
      };
    }

    // 检查内存使用情况
    try {
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (memoryUsagePercent > 80) {
        components['memory'] = { 
          status: 'degraded', 
          message: `Memory usage high: ${Math.round(memoryUsagePercent)}%` 
        };
      } else {
        components['memory'] = { status: 'healthy' };
      }
    } catch (error) {
      components['memory'] = { 
        status: 'unhealthy', 
        message: `Memory check error: ${(error as Error).message}` 
      };
    }

    // 检查CPU使用情况
    try {
      // 简单的CPU使用检查
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);
      const cpuUsagePercent = (endUsage.user + endUsage.system) / (100 * 1000); // 100ms * 1000μs/ms
      if (cpuUsagePercent > 80) {
        components['cpu'] = { 
          status: 'degraded', 
          message: `CPU usage high: ${Math.round(cpuUsagePercent)}%` 
        };
      } else {
        components['cpu'] = { status: 'healthy' };
      }
    } catch (error) {
      components['cpu'] = { 
        status: 'unhealthy', 
        message: `CPU check error: ${(error as Error).message}` 
      };
    }

    // 确定整体健康状态
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    for (const component of Object.values(components)) {
      if (component.status === 'unhealthy') {
        overallStatus = 'unhealthy';
        break;
      } else if (component.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }

    return {
      status: overallStatus,
      components,
      timestamp: Date.now()
    };
  }

  /**
   * 记录操作执行时间
   * @param name 操作名称
   * @param fn 要执行的函数
   * @param tags 标签
   * @returns 函数执行结果
   */
  async measureExecutionTime<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      this.recordMetric(`${name}_execution_time`, executionTime, tags);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetric(`${name}_execution_time`, executionTime, { ...tags, error: 'true' });
      throw error;
    }
  }
}

// 导出单例实例
export const monitoring = new Monitoring();
