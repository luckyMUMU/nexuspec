import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import simpleGit from 'simple-git';
import { cache } from '../utils/cache';
import { retry } from '../utils/retry';
import { handleError, validateParams } from '../utils/error-handler';
import { monitoring } from '../utils/monitoring';

interface Config {
  service: {
    name: string;
  };
  namespace: {
    local_path: string;
  };
}

interface ProposalContent {
  id: string;
  title: string;
  status: string;
  initiator: {
    service: string;
    agent: string;
    created_at: string;
  };
  targets: Array<{
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
  }>;
  contract_refs: Array<{
    ref: string;
    action: string;
  }>;
  breaking: boolean;
  backward_compatible: boolean;
}

const proposeCommand = new Command('propose')
  .description('创建跨服务变更提案')
  .option('--target <service>', '目标服务名称')
  .option('--contract <type:version>', '契约类型和版本，例如 api:v2')
  .action(async (options) => {
    try {
      // 验证参数
      if (!validateParams(options, ['target', 'contract'])) {
        return;
      }

      await monitoring.measureExecutionTime('propose', async () => {
        // 读取配置文件
        const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
        if (!await fs.exists(configPath)) {
          console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
          process.exit(1);
        }

        // 尝试从缓存获取配置
        let config = cache.get('config');
        if (!config) {
          config = yaml.load(await fs.readFile(configPath, 'utf8')) as Config;
          cache.set('config', config);
        }
        const serviceName = config.service.name;
        const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

        // 确保 Namespace 仓库存在
        if (!await fs.exists(namespacePath)) {
          console.log('Error: Namespace repository not found. Please clone it first.');
          process.exit(1);
        }

        // 解析契约信息
        const [contractType, contractVersion] = options.contract.split(':');

        // 创建 CSP 目录
        const proposalsDir = path.join(namespacePath, 'proposals', 'active');
        await fs.ensureDir(proposalsDir);

        // 生成 CSP ID
        const cspId = `CSP-${Date.now().toString().slice(-6)}`;
        const cspDir = path.join(proposalsDir, cspId);
        await fs.mkdir(cspDir);

        // 创建提案文件
        const proposalContent: ProposalContent = {
          id: cspId,
          title: `Change ${options.target} ${contractType} to ${contractVersion}`,
          status: 'submitted',
          initiator: {
            service: serviceName,
            agent: 'nxsp-cli',
            created_at: new Date().toISOString()
          },
          targets: [
            {
              service: options.target,
              required_action: 'new_contract_version',
              contract: {
                type: contractType,
                name: 'default',
                current_version: 'v1', // 假设当前版本是 v1
                proposed_version: contractVersion,
                change: 'add_endpoint',
                detail: 'New endpoint added'
              },
              urgency: 'normal',
              review_status: 'pending'
            }
          ],
          contract_refs: [
            {
              ref: `contract://${options.target}/${contractType}/default:${contractVersion}`,
              action: `upgrade_from_v1`
            }
          ],
          breaking: false,
          backward_compatible: true
        };

        await fs.writeFile(path.join(cspDir, 'proposal.yaml'), yaml.dump(proposalContent));

        // 创建提案描述文件
        const proposalMd = `# ${cspId}: ${proposalContent.title}\n\n## Overview\nThis proposal aims to update the ${contractType} contract of ${options.target} to version ${contractVersion}.\n\n## Changes\n- Add new endpoint\n- Maintain backward compatibility\n`;

        await fs.writeFile(path.join(cspDir, 'proposal.md'), proposalMd);

        // 提交到 Git
        const git = simpleGit(namespacePath);
        
        // 先检查是否有变更，避免不必要的Git操作
        const status = await git.status();
        if (status.files.length > 0) {
          await retry(async () => {
            await git.add(['proposals/active/' + cspId]);
            await git.commit(`Add CSP ${cspId}: ${proposalContent.title}`);
            await git.push();
          }, 3, 2000, 60000); // 最多重试3次，每次延迟2秒，超时60秒
        } else {
          console.log('No changes to commit');
        }

        console.log(`✅ Proposal ${cspId} created successfully`);
        console.log(`Push to Namespace repository completed`);
      });
    } catch (error) {
      handleError(error, 'creating proposal');
    }
  });

export { proposeCommand };
