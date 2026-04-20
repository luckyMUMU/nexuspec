import { Command } from 'commander';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import simpleGit from 'simple-git';
import { retry } from '../utils/retry';
import { handleError } from '../utils/error-handler';

// 异步执行命令
function execAsync(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout + stderr);
      }
    });
  });
}

interface Config {
  service: {
    name: string;
  };
  namespace: {
    local_path: string;
  };
}

const syncCommand = new Command('sync')
  .description('同步变更（委托给 OpenSpec）')
  .action(async () => {
    try {
      // 委托给 OpenSpec 的 /opsx:sync 命令
      console.log('Syncing using OpenSpec...');
      await retry(async () => {
        const output = await execAsync('openspec /opsx:sync');
        console.log(output);
      }, 3, 2000, 60000); // 最多重试3次，每次延迟2秒，超时60秒

      // 读取配置文件
      const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
      if (!await fs.exists(configPath)) {
        console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
        process.exit(1);
      }

      const config = yaml.load(await fs.readFile(configPath, 'utf8')) as Config;
      const serviceName = config.service.name;
      const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

      // 确保 Namespace 仓库存在
      if (!await fs.exists(namespacePath)) {
        console.log('Error: Namespace repository not found. Please clone it first.');
        process.exit(1);
      }

      // 检查契约变更
      const contractsDir = path.join(namespacePath, 'contracts', serviceName);
      if (await fs.exists(contractsDir)) {
        // 同步契约变更到本地
        console.log('Syncing contract changes...');
        
        // 提交到 Git
        const git = simpleGit(namespacePath);
        
        // 先检查是否有变更，避免不必要的Git操作
        const status = await git.status();
        if (status.files.length > 0) {
          await retry(async () => {
            await git.add(['contracts/']);
            await git.commit(`Sync contracts for ${serviceName}`);
            await git.push();
          }, 3, 2000, 60000); // 最多重试3次，每次延迟2秒，超时60秒
        } else {
          console.log('No contract changes to commit');
        }

        console.log('✅ Contract changes synced successfully');
      }

      console.log('✅ Sync completed successfully');
    } catch (error) {
      handleError(error, 'syncing changes');
    }
  });

export { syncCommand };
