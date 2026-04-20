import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import simpleGit from 'simple-git';

interface Config {
  service: {
    name: string;
  };
  namespace: {
    local_path: string;
  };
  exposes?: Array<{
    type: string;
    path: string;
    name: string;
  }>;
}

const syncContractsCommand = new Command('sync-contracts')
  .description('同步契约到 Namespace 仓库')
  .action(async () => {
    try {
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

      // 同步暴露的契约
      if (config.exposes && config.exposes.length > 0) {
        for (const expose of config.exposes) {
          const localPath = path.join(process.cwd(), expose.path);
          const contractPath = path.join(
            namespacePath,
            'contracts',
            serviceName,
            expose.type,
            'v1.yaml' // 暂时使用 v1 版本
          );

          // 确保契约目录存在
          await fs.ensureDir(path.dirname(contractPath));

          // 复制契约文件
          if (await fs.exists(localPath)) {
            if (await fs.stat(localPath).then(stats => stats.isDirectory())) {
              // 如果是目录，复制所有文件
              await fs.copy(localPath, path.dirname(contractPath), { overwrite: true });
            } else {
              // 如果是文件，直接复制
              await fs.copy(localPath, contractPath, { overwrite: true });
            }
            console.log(`Synced ${expose.type} contract from ${expose.path}`);
          } else {
            console.log(`Warning: Local contract path ${expose.path} does not exist`);
          }
        }

        // 提交到 Git
        const git = simpleGit(namespacePath);
        await git.add(['contracts/']);
        await git.commit(`Sync contracts for ${serviceName}`);
        await git.push();

        console.log('✅ Contracts synced successfully to Namespace repository');
      } else {
        console.log('No contracts to sync. Please configure exposes in .nxsp/config.yaml');
      }
    } catch (error) {
      console.error('Error syncing contracts:', error);
      process.exit(1);
    }
  });

export { syncContractsCommand };
