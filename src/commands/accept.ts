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
}

interface Target {
  service: string;
  required_action: string;
  contract: {
    type: string;
    name: string;
    current_version: string;
    proposed_version: string;
    change: string;
    detail: string;
  };
  urgency: string;
  review_status: string;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  initiator: {
    service: string;
    agent: string;
    created_at: string;
  };
  targets: Target[];
  contract_refs: Array<{
    ref: string;
    action: string;
  }>;
  breaking: boolean;
  backward_compatible: boolean;
}

interface Contract {
  version: string;
  status: string;
  backward_compatible: boolean;
  created_at: string;
}

const acceptCommand = new Command('accept')
  .description('接受跨服务变更提案')
  .argument('<id>', '提案 ID')
  .action(async (id) => {
    try {
      // 读取配置文件
      const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
      if (!await fs.exists(configPath)) {
        console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
        process.exit(1);
      }

      const config = yaml.load(await fs.readFile(configPath, 'utf8')) as Config;
      const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

      // 确保 Namespace 仓库存在
      if (!await fs.exists(namespacePath)) {
        console.log('Error: Namespace repository not found. Please clone it first.');
        process.exit(1);
      }

      // 检查提案是否存在
      const proposalDir = path.join(namespacePath, 'proposals', 'active', id);
      if (!await fs.exists(proposalDir)) {
        console.log(`Error: Proposal ${id} not found`);
        process.exit(1);
      }

      // 读取提案文件
      const proposalPath = path.join(proposalDir, 'proposal.yaml');
      const proposal = yaml.load(await fs.readFile(proposalPath, 'utf8')) as Proposal;

      // 更新提案状态
      proposal.status = 'accepted';
      proposal.targets.forEach((target: Target) => {
        target.review_status = 'accepted';
      });

      await fs.writeFile(proposalPath, yaml.dump(proposal));

      // 处理契约版本升级
      for (const target of proposal.targets) {
        const contractPath = path.join(
          namespacePath,
          'contracts',
          target.service,
          target.contract.type,
          `${target.contract.proposed_version}.yaml`
        );

        // 确保契约目录存在
        await fs.ensureDir(path.dirname(contractPath));

        // 创建新契约版本文件
        const contractContent: Contract = {
          version: target.contract.proposed_version,
          status: 'active',
          backward_compatible: true,
          created_at: new Date().toISOString()
        };

        await fs.writeFile(contractPath, yaml.dump(contractContent));

        // 标记旧版本为 deprecated
        if (target.contract.current_version) {
          const oldContractPath = path.join(
            namespacePath,
            'contracts',
            target.service,
            target.contract.type,
            `${target.contract.current_version}.yaml`
          );

          if (await fs.exists(oldContractPath)) {
            const oldContract = yaml.load(await fs.readFile(oldContractPath, 'utf8')) as Contract;
            oldContract.status = 'deprecated';
            await fs.writeFile(oldContractPath, yaml.dump(oldContract));
          }
        }
      }

      // 提交到 Git
      const git = simpleGit(namespacePath);
      await git.add([
        `proposals/active/${id}`,
        `contracts/`
      ]);
      await git.commit(`Accept CSP ${id}: ${proposal.title}`);
      await git.push();

      console.log(`✅ Proposal ${id} accepted successfully`);
      console.log('Contract versions updated and pushed to Namespace repository');
    } catch (error) {
      console.error('Error accepting proposal:', error);
      process.exit(1);
    }
  });

export { acceptCommand };
