import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

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

interface GraphNode {
  id: string;
  type: 'service' | 'contract' | 'external';
  name: string;
  version?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'depends_on' | 'exposes';
  contract?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ReviewSuggestion {
  proposalId: string;
  service: string;
  contract: {
    type: string;
    name: string;
    currentVersion: string;
    proposedVersion: string;
  };
  compatibility: 'compatible' | 'breaking' | 'unknown';
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
  confidence: number;
}

async function loadGraphData(namespacePath: string): Promise<GraphData | null> {
  const graphPath = path.join(namespacePath, 'graph', 'snapshot.json');
  if (!await fs.exists(graphPath)) {
    return null;
  }
  
  try {
    const graphData = JSON.parse(await fs.readFile(graphPath, 'utf8'));
    return graphData;
  } catch (error) {
    console.warn('Error loading graph data:', error);
    return null;
  }
}

function analyzeCompatibility(proposal: Proposal, target: Target): 'compatible' | 'breaking' | 'unknown' {
  if (proposal.breaking) {
    return 'breaking';
  }
  
  if (proposal.backward_compatible) {
    return 'compatible';
  }
  
  // 基于变更类型分析兼容性
  const changeType = target.contract.change.toLowerCase();
  if (changeType.includes('add') || changeType.includes('new')) {
    return 'compatible';
  }
  
  if (changeType.includes('remove') || changeType.includes('delete') || changeType.includes('break')) {
    return 'breaking';
  }
  
  return 'unknown';
}

function analyzeImpact(proposal: Proposal, target: Target, graphData: GraphData | null): 'low' | 'medium' | 'high' {
  if (!graphData) {
    return 'medium';
  }
  
  // 分析依赖关系
  const serviceName = target.service;
  const contractId = `${serviceName}/${target.contract.type}:${target.contract.name}`;
  
  // 查找依赖此服务的其他服务
  const dependentServices = new Set<string>();
  graphData.edges.forEach(edge => {
    if (edge.target.includes(serviceName) || edge.target.includes(contractId)) {
      dependentServices.add(edge.source);
    }
  });
  
  if (dependentServices.size === 0) {
    return 'low';
  } else if (dependentServices.size <= 3) {
    return 'medium';
  } else {
    return 'high';
  }
}

function generateSuggestion(proposal: Proposal, target: Target, compatibility: 'compatible' | 'breaking' | 'unknown', impact: 'low' | 'medium' | 'high'): string {
  if (compatibility === 'compatible' && impact === 'low') {
    return '此变更兼容性良好且影响范围小，建议自动批准。';
  } else if (compatibility === 'compatible' && impact === 'medium') {
    return '此变更兼容性良好但影响范围中等，建议快速审核后批准。';
  } else if (compatibility === 'compatible' && impact === 'high') {
    return '此变更兼容性良好但影响范围较大，建议仔细审核后批准。';
  } else if (compatibility === 'breaking' && impact === 'low') {
    return '此变更存在破坏性，但影响范围小，建议审核后谨慎批准。';
  } else if (compatibility === 'breaking' && impact === 'medium') {
    return '此变更存在破坏性且影响范围中等，建议详细审核并评估影响。';
  } else if (compatibility === 'breaking' && impact === 'high') {
    return '此变更存在破坏性且影响范围较大，建议拒绝或要求修改为非破坏性变更。';
  } else {
    return '无法确定变更的兼容性，建议手动审核。';
  }
}

function calculateConfidence(compatibility: 'compatible' | 'breaking' | 'unknown', impact: 'low' | 'medium' | 'high'): number {
  if (compatibility === 'unknown') {
    return 0.5;
  }
  
  if (compatibility === 'compatible' && impact === 'low') {
    return 0.9;
  } else if (compatibility === 'compatible' && impact === 'medium') {
    return 0.8;
  } else if (compatibility === 'compatible' && impact === 'high') {
    return 0.7;
  } else if (compatibility === 'breaking' && impact === 'low') {
    return 0.7;
  } else if (compatibility === 'breaking' && impact === 'medium') {
    return 0.6;
  } else {
    return 0.5;
  }
}

export async function generateReviewSuggestions(config: Config, proposals: Array<{ proposal: Proposal, dir: string }>): Promise<ReviewSuggestion[]> {
  const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');
  const graphData = await loadGraphData(namespacePath);
  const suggestions: ReviewSuggestion[] = [];
  
  for (const { proposal } of proposals) {
    for (const target of proposal.targets) {
      if (target.service === config.service.name) {
        const compatibility = analyzeCompatibility(proposal, target);
        const impact = analyzeImpact(proposal, target, graphData);
        const suggestion = generateSuggestion(proposal, target, compatibility, impact);
        const confidence = calculateConfidence(compatibility, impact);
        
        suggestions.push({
          proposalId: proposal.id,
          service: target.service,
          contract: {
            type: target.contract.type,
            name: target.contract.name,
            currentVersion: target.contract.current_version,
            proposedVersion: target.contract.proposed_version
          },
          compatibility,
          impact,
          suggestion,
          confidence
        });
      }
    }
  }
  
  return suggestions;
}

export function formatSuggestion(suggestion: ReviewSuggestion): string {
  let output = `📋 提案: ${suggestion.proposalId}\n`;
  output += `   契约: ${suggestion.contract.type}: ${suggestion.contract.currentVersion} → ${suggestion.contract.proposedVersion}\n`;
  output += `   兼容性: ${suggestion.compatibility === 'compatible' ? '✅ 兼容' : suggestion.compatibility === 'breaking' ? '❌ 破坏性' : '❓ 未知'}\n`;
  output += `   影响范围: ${suggestion.impact === 'low' ? '低' : suggestion.impact === 'medium' ? '中等' : '高'}\n`;
  output += `   建议: ${suggestion.suggestion}\n`;
  output += `   置信度: ${Math.round(suggestion.confidence * 100)}%\n`;
  return output;
}