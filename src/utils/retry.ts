/**
 * 重试函数
 * @param fn 要执行的函数
 * @param maxRetries 最大重试次数
 * @param delay 每次重试的延迟时间（毫秒）
 * @param timeout 超时时间（毫秒）
 * @returns 函数执行结果
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  timeout: number = 30000
): Promise<T> {
  let lastError: Error = new Error('Operation failed');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 创建一个超时Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeout);
      });
      
      // 同时执行原函数和超时Promise
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error as Error;
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
export async function withTimeout<T>(fn: () => Promise<T>, timeout: number = 30000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeout);
  });
  
  return Promise.race([fn(), timeoutPromise]);
}
