"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
class Cache {
    constructor() {
        this.cache = new Map();
        this.maxAge = 5 * 60 * 1000; // 5分钟缓存
    }
    /**
     * 设置缓存
     * @param key 缓存键
     * @param data 缓存数据
     */
    set(key, data) {
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
    get(key) {
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
    clear(key) {
        if (key) {
            this.cache.delete(key);
        }
        else {
            this.cache.clear();
        }
    }
    /**
     * 检查缓存是否存在且未过期
     * @param key 缓存键
     * @returns 是否存在且未过期
     */
    has(key) {
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
exports.cache = new Cache();
