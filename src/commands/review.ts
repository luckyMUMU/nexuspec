import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { generateReviewSuggestions, formatSuggestion } from '../utils/intelligent-review';

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

interface RelevantProposal extends Proposal {
  dir: string;
}

const reviewCommand = new Command('review')
  .description('评审跨服务变更提案')
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

      // 查找针对本服务的提案
      const proposalsDir = path.join(namespacePath, 'proposals', 'active');
      if (!await fs.exists(proposalsDir)) {
        console.log('No active proposals found');
        return;
      }

      const proposalDirs = await fs.readdir(proposalsDir);
      const relevantProposals: RelevantProposal[] = [];

      for (const dir of proposalDirs) {
        const proposalPath = path.join(proposalsDir, dir, 'proposal.yaml');
        if (await fs.exists(proposalPath)) {
          const proposal = yaml.load(await fs.readFile(proposalPath, 'utf8')) as Proposal;
          const targets = proposal.targets.filter((target: Target) => target.service === serviceName);
          if (targets.length > 0) {
            relevantProposals.push({ ...proposal, dir });
          }
        }
      }

      if (relevantProposals.length === 0) {
        console.log(`No proposals targeting service ${serviceName}`);
        return;
      }

      console.log(`Found ${relevantProposals.length} proposals targeting ${serviceName}:`);
      console.log('');

      for (const proposal of relevantProposals) {
        console.log(`📋 ${proposal.id}: ${proposal.title}`);
        console.log(`   Status: ${proposal.status}`);
        console.log(`   Initiator: ${proposal.initiator.service}`);
        console.log(`   Created: ${new Date(proposal.initiator.created_at).toLocaleString()}`);
        console.log('   Targets:');
        
        proposal.targets.forEach((target: Target) => {
          if (target.service === serviceName) {
            console.log(`     - ${target.contract.type}: v${target.contract.current_version} → v${target.contract.proposed_version}`);
            console.log(`       Action: ${target.required_action}`);
            console.log(`       Status: ${target.review_status}`);
          }
        });

        console.log('');
      }

      // 生成智能评审建议
      console.log('🤖 智能评审建议:');
      console.log('');
      
      const proposalsForSuggestion = relevantProposals.map(p => ({ proposal: p, dir: p.dir }));
      const suggestions = await generateReviewSuggestions(config, proposalsForSuggestion);
      
      if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
          console.log(formatSuggestion(suggestion));
          console.log('');
        });
      } else {
        console.log('没有找到需要评审的提案');
        console.log('');
      }

      console.log('Use `nxsp accept <id>` to accept a proposal');
      console.log('Use `nxsp reject <id>` to reject a proposal');
    } catch (error) {
      console.error('Error reviewing proposals:', error);
      process.exit(1);
    }
  });

export { reviewCommand };
