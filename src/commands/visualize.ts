import { Command } from 'commander';
import path from 'path';
import { execSync } from 'child_process';

const visualizeCommand = new Command('visualize')
  .description('启动 NexusSpec 可视化界面')
  .action(() => {
    try {
      console.log('🚀 启动 NexusSpec 可视化界面...');
      
      // 构建项目
      console.log('🔨 正在构建项目...');
      execSync('npm run build', { stdio: 'inherit' });
      
      // 启动本地服务器
      console.log('🌐 正在启动本地服务器...');
      const serverCommand = `npx http-server ${path.join(__dirname, '..', '..', 'src', 'visualization')} -p 3000 -o`;
      execSync(serverCommand, { stdio: 'inherit' });
    } catch (error) {
      console.error('Error starting visualization:', error);
      process.exit(1);
    }
  });

export { visualizeCommand };