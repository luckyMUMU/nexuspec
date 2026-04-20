/**
 * 错误处理函数
 * @param error 错误对象
 * @param context 错误上下文
 */
export function handleError(error: any, context: string): void {
  console.error(`Error in ${context}:`);
  
  if (error instanceof Error) {
    console.error(`Error message: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } else {
    console.error(`Error: ${JSON.stringify(error, null, 2)}`);
  }
  
  // 根据错误类型提供不同的提示信息
  if (error.message && error.message.includes('git')) {
    console.error('Git operation failed. Please check your Git configuration and network connection.');
  } else if (error.message && error.message.includes('file not found')) {
    console.error('File not found. Please check the file path and ensure the file exists.');
  } else if (error.message && error.message.includes('timeout')) {
    console.error('Operation timed out. Please check your network connection and try again.');
  }
  
  process.exit(1);
}

/**
 * 验证参数
 * @param params 参数对象
 * @param required 必需的参数列表
 * @returns 是否验证通过
 */
export function validateParams(params: any, required: string[]): boolean {
  for (const param of required) {
    if (!params[param]) {
      console.error(`Error: Missing required parameter ${param}`);
      return false;
    }
  }
  return true;
}
