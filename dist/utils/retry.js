"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = retry;
exports.withTimeout = withTimeout;
/**
 * 重试函数
 * @param fn 要执行的函数
 * @param maxRetries 最大重试次数
 * @param delay 每次重试的延迟时间（毫秒）
 * @param timeout 超时时间（毫秒）
 * @returns 函数执行结果
 */
async function retry(fn, maxRetries = 3, delay = 1000, timeout = 30000) {
    let lastError = new Error('Operation failed');
    for (let i = 0; i < maxRetries; i++) {
        try {
            // 创建一个超时Promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Operation timed out')), timeout);
            });
            // 同时执行原函数和超时Promise
            const result = await Promise.race([fn(), timeoutPromise]);
            return result;
        }
        catch (error) {
            lastError = error;
            console.log(`Attempt ${i + 1} failed: ${lastError.message}`);
            if (i < maxRetries - 1) {
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
/**
 * 带超时的函数执行
 * @param fn 要执行的函数
 * @param timeout 超时时间（毫秒）
 * @returns 函数执行结果
 */
async function withTimeout(fn, timeout = 30000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeout);
    });
    return Promise.race([fn(), timeoutPromise]);
}
