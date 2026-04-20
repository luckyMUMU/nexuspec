import { Command } from 'commander';
import { execSync } from 'child_process';

const applyCommand = new Command('apply')
  .description('应用变更（委托给 OpenSpec）')
  .action(async () => {
    try {
      // 委托给 OpenSpec 的 /opsx:apply 命令
      console.log('Applying changes using OpenSpec...');
      execSync('openspec /opsx:apply', { stdio: 'inherit' });
      console.log('✅ Changes applied successfully');
    } catch (error) {
      console.error('Error applying changes:', error);
      process.exit(1);
    }
  });

export { applyCommand };
