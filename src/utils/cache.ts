class Cache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private maxAge: number = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   */
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回null
   */
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // 检查缓存是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 清除缓存
   * @param key 缓存键，如果不提供则清除所有缓存
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // 检查缓存是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// 导出单例实例
export const cache = new Cache();
