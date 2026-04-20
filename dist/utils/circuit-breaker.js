"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitState = exports.CircuitBreaker = void 0;
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open"; // 半开状态，允许部分请求
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    constructor(options = {}) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
        this.requests = [];
        this.failureThreshold = options.failureThreshold || 0.5;
        this.resetTimeout = options.resetTimeout || 30000;
        this.windowSize = options.windowSize || 10;
        this.timeout = options.timeout || 10000;
    }
    /**
     * 执行函数，应用断路器模式
     * @param fn 要执行的函数
     * @returns 函数执行结果
     */
    async execute(fn) {
        // 检查断路器状态
        this.checkState();
        if (this.state === CircuitState.OPEN) {
            throw new Error('Circuit breaker is open');
        }
        try {
            // 执行函数，设置超时
            const result = await Promise.race([
                fn(),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timed out')), this.timeout);
                })
            ]);
            // 记录成功
            this.recordSuccess();
            return result;
        }
        catch (error) {
            // 记录失败
            this.recordFailure();
            throw error;
        }
    }
    /**
     * 检查断路器状态
     */
    checkState() {
        const now = Date.now();
        // 清理过期的请求记录
        this.requests = this.requests.filter(request => now - request.timestamp < 60000);
        if (this.state === CircuitState.OPEN) {
            // 检查是否可以切换到半开状态
            if (now - this.lastFailureTime > this.resetTimeout) {
                this.state = CircuitState.HALF_OPEN;
                console.log('Circuit breaker switched to HALF_OPEN state');
            }
        }
        else if (this.state === CircuitState.HALF_OPEN) {
            // 半开状态下，只允许有限的请求通过
            if (this.successCount >= 3) {
                // 足够的成功，切换到闭合状态
                this.reset();
                console.log('Circuit breaker switched to CLOSED state');
            }
            else if (this.failureCount >= 1) {
                // 任何失败，切换回打开状态
                this.state = CircuitState.OPEN;
                this.lastFailureTime = now;
                console.log('Circuit breaker switched to OPEN state');
            }
        }
        else if (this.state === CircuitState.CLOSED) {
            // 检查失败率是否超过阈值
            if (this.requests.length >= this.windowSize) {
                const failureRate = this.requests.filter(r => !r.success).length / this.requests.length;
                if (failureRate >= this.failureThreshold) {
                    this.state = CircuitState.OPEN;
                    this.lastFailureTime = now;
                    console.log('Circuit breaker switched to OPEN state');
                }
            }
        }
    }
    /**
     * 记录成功
     */
    recordSuccess() {
        const now = Date.now();
        this.requests.push({ success: true, timestamp: now });
        this.successCount++;
        this.failureCount = 0;
        // 保持请求记录在窗口大小内
        if (this.requests.length > this.windowSize) {
            this.requests.shift();
        }
    }
    /**
     * 记录失败
     */
    recordFailure() {
        const now = Date.now();
        this.requests.push({ success: false, timestamp: now });
        this.failureCount++;
        this.successCount = 0;
        this.lastFailureTime = now;
        // 保持请求记录在窗口大小内
        if (this.requests.length > this.windowSize) {
            this.requests.shift();
        }
    }
    /**
     * 重置断路器
     */
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.requests = [];
    }
    /**
     * 获取断路器状态
     * @returns 断路器状态
     */
    getState() {
        return this.state;
    }
    /**
     * 获取失败率
     * @returns 失败率
     */
    getFailureRate() {
        if (this.requests.length === 0) {
            return 0;
        }
        return this.requests.filter(r => !r.success).length / this.requests.length;
    }
}
exports.CircuitBreaker = CircuitBreaker;
