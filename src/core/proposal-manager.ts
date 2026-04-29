import path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import yaml from 'yaml';
import type { Proposal, ProposalStatus, NxspConfig, ReviewResult } from '../types/index.js';
import { ConfigManager } from './config.js';
import { SmartReviewEngine } from './smart-review-engine.js';

export class ProposalManager {
  private configManager: ConfigManager;
  private smartReviewEngine: SmartReviewEngine;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.configManager = new ConfigManager(cwd);
    this.smartReviewEngine = new SmartReviewEngine(cwd);
  }

  private async getProposalsDir(): Promise<string> {
    const config = await this.configManager.loadConfig();
    const namespacePath = this.configManager.getNamespaceLocalPath(config);
    return path.join(namespacePath, 'proposals', 'active');
  }

  private async getArchiveDir(): Promise<string> {
    const config = await this.configManager.loadConfig();
    const namespacePath = this.configManager.getNamespaceLocalPath(config);
    return path.join(namespacePath, 'proposals', 'archive');
  }

  generateId(): string {
    return `CSP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  async createProposal(options: {
    title: string;
    targetService: string;
    contractType?: string;
    contractName?: string;
    currentVersion?: string;
    proposedVersion?: string;
    changeType?: string;
    detail?: string;
    breaking?: boolean;
    backwardCompatible?: boolean;
  }): Promise<Proposal> {
    const config = await this.configManager.loadConfig();
    
    const proposal: Proposal = {
      id: this.generateId(),
      title: options.title,
      status: 'draft',
      initiator: {
        service: config.service.name,
        agent: 'nxsp-cli',
        createdAt: new Date().toISOString(),
      },
      targets: [{
        service: options.targetService,
        requiredAction: options.contractType ? 'new_contract_version' : 'review_spec_delta',
        contract: options.contractType ? {
          type: options.contractType,
          name: options.contractName || 'default',
          currentVersion: options.currentVersion || 'v1',
          proposedVersion: options.proposedVersion || 'v2',
          change: options.changeType || 'add_endpoint',
          detail: options.detail || '',
        } : undefined,
        urgency: 'normal',
        reviewStatus: 'pending',
      }],
      breaking: options.breaking,
      backwardCompatible: options.backwardCompatible,
    };

    await this.saveProposal(proposal);
    return proposal;
  }

  async saveProposal(proposal: Proposal): Promise<void> {
    const proposalsDir = await this.getProposalsDir();
    await fs.mkdir(proposalsDir, { recursive: true });
    
    const proposalDir = path.join(proposalsDir, proposal.id);
    await fs.mkdir(proposalDir, { recursive: true });
    
    const proposalPath = path.join(proposalDir, 'proposal.yaml');
    const content = yaml.stringify(proposal);
    await fs.writeFile(proposalPath, content, 'utf-8');

    const proposalMdPath = path.join(proposalDir, 'proposal.md');
    await fs.writeFile(proposalMdPath, `# ${proposal.title}\n\n`, 'utf-8');
  }

  async loadProposal(id: string): Promise<Proposal> {
    const proposalsDir = await this.getProposalsDir();
    const proposalPath = path.join(proposalsDir, id, 'proposal.yaml');
    const content = await fs.readFile(proposalPath, 'utf-8');
    return yaml.parse(content) as Proposal;
  }

  async updateProposalStatus(id: string, status: ProposalStatus): Promise<void> {
    const proposal = await this.loadProposal(id);
    proposal.status = status;
    await this.saveProposal(proposal);
  }

  async listProposals(status?: ProposalStatus): Promise<Proposal[]> {
    const proposalsDir = await this.getProposalsDir();
    
    try {
      const entries = await fs.readdir(proposalsDir, { withFileTypes: true });
      const proposals: Proposal[] = [];
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const proposal = await this.loadProposal(entry.name);
            if (!status || proposal.status === status) {
              proposals.push(proposal);
            }
          } catch {
            // Skip invalid proposals
          }
        }
      }
      
      return proposals;
    } catch {
      return [];
    }
  }

  async acceptProposal(id: string): Promise<void> {
    await this.updateProposalStatus(id, 'accepted');
  }

  async rejectProposal(id: string): Promise<void> {
    await this.updateProposalStatus(id, 'rejected');
  }

  async archiveProposal(id: string): Promise<void> {
    const proposal = await this.loadProposal(id);
    const proposalsDir = await this.getProposalsDir();
    const archiveDir = await this.getArchiveDir();
    
    await fs.mkdir(archiveDir, { recursive: true });
    
    const srcDir = path.join(proposalsDir, id);
    const destDir = path.join(archiveDir, `${new Date().toISOString().slice(0, 10)}-${id}`);
    
    await fs.rename(srcDir, destDir);
  }

  async reviewProposal(id: string): Promise<ReviewResult> {
    const proposal = await this.loadProposal(id);
    const reviewResult = await this.smartReviewEngine.reviewProposal(proposal);
    
    await this.saveReviewResult(id, reviewResult);
    
    if (reviewResult.suggestion.type === 'auto_approve') {
      await this.autoAcceptProposal(id, reviewResult);
    }
    
    return reviewResult;
  }

  private async saveReviewResult(id: string, reviewResult: ReviewResult): Promise<void> {
    const proposalsDir = await this.getProposalsDir();
    const proposalDir = path.join(proposalsDir, id);
    const reviewPath = path.join(proposalDir, 'review-result.yaml');
    const content = yaml.stringify(reviewResult);
    await fs.writeFile(reviewPath, content, 'utf-8');
  }

  async loadReviewResult(id: string): Promise<ReviewResult | null> {
    try {
      const proposalsDir = await this.getProposalsDir();
      const proposalDir = path.join(proposalsDir, id);
      const reviewPath = path.join(proposalDir, 'review-result.yaml');
      const content = await fs.readFile(reviewPath, 'utf-8');
      return yaml.parse(content) as ReviewResult;
    } catch {
      return null;
    }
  }

  private async autoAcceptProposal(id: string, reviewResult: ReviewResult): Promise<void> {
    const proposal = await this.loadProposal(id);
    
    for (const target of proposal.targets) {
      target.reviewStatus = 'approved';
    }
    
    proposal.status = 'accepted';
    await this.saveProposal(proposal);
  }

  async batchReviewProposals(): Promise<{
    reviewed: number;
    autoApproved: number;
    needsReview: number;
  }> {
    const proposals = await this.listProposals();
    let reviewed = 0;
    let autoApproved = 0;
    let needsReview = 0;

    for (const proposal of proposals) {
      if (proposal.status === 'draft' || proposal.status === 'submitted') {
        const reviewResult = await this.reviewProposal(proposal.id);
        reviewed++;
        
        if (reviewResult.suggestion.type === 'auto_approve') {
          autoApproved++;
        } else {
          needsReview++;
        }
      }
    }

    return { reviewed, autoApproved, needsReview };
  }
}
