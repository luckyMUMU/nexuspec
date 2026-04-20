import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';

const archiveCommand = new Command('archive')
  .description('归档提案（委托给 OpenSpec）')
  .argument('<id>', '提案 ID')
  .action(async (id) => {
    try {
      // 委托给 OpenSpec 的 /opsx:archive 命令
      console.log('Archiving using OpenSpec...');
      const { execSync } = require('child_process');
      execSync('openspec /opsx:archive', { stdio: 'inherit' });

      // 读取配置文件
      const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
      if (!await fs.exists(configPath)) {
        console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
        process.exit(1);
      }

      const yaml = require('js-yaml');
      const config = yaml.load(await fs.readFile(configPath, 'utf8'));
      const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

      // 确保 Namespace 仓库存在
      if (!await fs.exists(namespacePath)) {
        console.log('Error: Namespace repository not found. Please clone it first.');
        process.exit(1);
      }

      // 移动提案到归档目录
      const activeDir = path.join(namespacePath, 'proposals', 'active', id);
      const archiveDir = path.join(namespacePath, 'proposals', 'archive', id);

      if (await fs.exists(activeDir)) {
        await fs.ensureDir(path.join(namespacePath, 'proposals', 'archive'));
        await fs.move(activeDir, archiveDir);

        // 提交到 Git
        const git = simpleGit(namespacePath);
        await git.add(['proposals/']);
        await git.commit(`Archive CSP ${id}`);
        await git.push();

        console.log(`✅ Proposal ${id} archived successfully`);
      } else {
        console.log(`Error: Proposal ${id} not found in active directory`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error archiving proposal:', error);
      process.exit(1);
    }
  });

export { archiveCommand };
