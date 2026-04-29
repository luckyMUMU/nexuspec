import type {
  Proposal,
  ReviewSuggestion,
  ReviewResult,
  CompatibilityRule,
  CompatibilityRuleType,
  ReviewSuggestionType,
  ImpactAnalysisResult,
} from '../types/index.js';
import { DependencyAnalyzer } from './dependency-analyzer.js';

export class SmartReviewEngine {
  private dependencyAnalyzer: DependencyAnalyzer;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.dependencyAnalyzer = new DependencyAnalyzer(cwd);
  }

  private getCompatibilityRules(): CompatibilityRule[] {
    return [
      {
        type: 'add_optional_field',
        backwardCompatible: true,
        breaking: false,
        riskLevel: 'low',
        description: '添加可选字段到 API 响应或事件',
        autoApprovable: true,
      },
      {
        type: 'add_endpoint',
        backwardCompatible: true,
        breaking: false,
        riskLevel: 'low',
        description: '添加新的 API 端点',
        autoApprovable: true,
      },
      {
        type: 'add_event',
        backwardCompatible: true,
        breaking: false,
        riskLevel: 'low',
        description: '添加新的事件类型',
        autoApprovable: true,
      },
      {
        type: 'deprecate_field',
        backwardCompatible: true,
        breaking: false,
        riskLevel: 'medium',
        description: '标记字段为已弃用',
        autoApprovable: true,
      },
      {
        type: 'remove_field',
        backwardCompatible: false,
        breaking: true,
        riskLevel: 'high',
        description: '移除 API 或事件中的字段',
        autoApprovable: false,
      },
      {
        type: 'change_field_type',
        backwardCompatible: false,
        breaking: true,
        riskLevel: 'high',
        description: '更改字段的数据类型',
        autoApprovable: false,
      },
      {
        type: 'change_endpoint_path',
        backwardCompatible: false,
        breaking: true,
        riskLevel: 'high',
        description: '更改 API 端点路径',
        autoApprovable: false,
      },
      {
        type: 'add_required_field',
        backwardCompatible: false,
        breaking: true,
        riskLevel: 'critical',
        description: '添加必填字段到请求体',
        autoApprovable: false,
      },
      {
        type: 'remove_event',
        backwardCompatible: false,
        breaking: true,
        riskLevel: 'high',
        description: '移除事件类型',
        autoApprovable: false,
      },
      {
        type: 'change_event_schema',
        backwardCompatible: false,
        breaking: true,
        riskLevel: 'high',
        description: '更改事件数据结构',
        autoApprovable: false,
      },
    ];
  }

  private determineChangeType(changeType?: string): CompatibilityRuleType {
    const changeMapping: Record<string, CompatibilityRuleType> = {
      add_endpoint: 'add_endpoint',
      add_field: 'add_optional_field',
      add_optional_field: 'add_optional_field',
      add_required_field: 'add_required_field',
      remove_field: 'remove_field',
      change_type: 'change_field_type',
      change_field_type: 'change_field_type',
      change_path: 'change_endpoint_path',
      deprecate: 'deprecate_field',
      deprecate_field: 'deprecate_field',
      add_event: 'add_event',
      remove_event: 'remove_event',
      change_event: 'change_event_schema',
    };
    return changeMapping[changeType || ''] || 'add_optional_field';
  }

  private checkCompatibility(proposal: Proposal): {
    passed: boolean;
    rules: CompatibilityRule[];
  } {
    const allRules = this.getCompatibilityRules();
    const applicableRules: CompatibilityRule[] = [];

    for (const target of proposal.targets) {
      if (target.contract?.change) {
        const changeType = this.determineChangeType(target.contract.change);
        const rule = allRules.find((r) => r.type === changeType);
        if (rule) {
          applicableRules.push(rule);
        }
      }
    }

    if (applicableRules.length === 0) {
      const defaultRule = allRules.find((r) => r.type === 'add_optional_field')!;
      applicableRules.push(defaultRule);
    }

    const hasBreakingChanges = applicableRules.some((r) => r.breaking);
    const allAutoApprovable = applicableRules.every((r) => r.autoApprovable);

    return {
      passed: !hasBreakingChanges || (!!proposal.backwardCompatible && !hasBreakingChanges),
      rules: applicableRules,
    };
  }

  private assessRisk(
    proposal: Proposal,
    compatibilityCheck: { passed: boolean; rules: CompatibilityRule[] },
    impactAnalysis?: ImpactAnalysisResult
  ): { level: 'low' | 'medium' | 'high' | 'critical'; factors: string[] } {
    const factors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (proposal.breaking) {
      factors.push('提案标记为破坏性变更');
      riskLevel = 'high';
    }

    const hasBreakingRules = compatibilityCheck.rules.some((r) => r.breaking);
    if (hasBreakingRules) {
      factors.push('兼容性检测发现破坏性变更');
      riskLevel = 'high';
    }

    // Risk level order
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    
    if (impactAnalysis) {
      if (impactAnalysis.directDependents.length > 0) {
        factors.push(`影响 ${impactAnalysis.directDependents.length} 个直接依赖服务`);
      }
      if (impactAnalysis.allAffectedServices.length > 5) {
        factors.push(`影响超过 5 个服务`);
        riskLevel = 'critical';
      } else if (impactAnalysis.allAffectedServices.length > 2 && riskLevel === 'low') {
        riskLevel = 'medium';
      }
      // Compare with impact analysis risk level
      if (order[impactAnalysis.riskLevel] > order[riskLevel]) {
        riskLevel = impactAnalysis.riskLevel;
      }
    }

    // Find highest rule risk
    let highestRuleRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    for (const rule of compatibilityCheck.rules) {
      if (order[rule.riskLevel] > order[highestRuleRisk]) {
        highestRuleRisk = rule.riskLevel;
      }
    }
    
    // Take the highest risk level
    if (order[highestRuleRisk] > order[riskLevel]) {
      riskLevel = highestRuleRisk;
    }

    if (factors.length === 0) {
      factors.push('无明显风险因素');
    }

    return { level: riskLevel, factors };
  }

  private generateSuggestion(
    proposal: Proposal,
    compatibilityCheck: { passed: boolean; rules: CompatibilityRule[] },
    riskAssessment: { level: 'low' | 'medium' | 'high' | 'critical'; factors: string[] }
  ): ReviewSuggestion {
    let type: ReviewSuggestionType = 'needs_manual_review';
    let confidence = 0.5;
    const reasoning: string[] = [];
    const recommendations: string[] = [];

    const allAutoApprovable = compatibilityCheck.rules.every((r) => r.autoApprovable);
    const hasNoBreaking = !compatibilityCheck.rules.some((r) => r.breaking);

    if (allAutoApprovable && hasNoBreaking && riskAssessment.level === 'low') {
      type = 'auto_approve';
      confidence = 0.95;
      reasoning.push('所有变更都是向后兼容的');
      reasoning.push('符合自动批准规则');
      reasoning.push('风险等级为低');
      recommendations.push('可以自动批准此提案');
    } else if (allAutoApprovable && riskAssessment.level === 'medium') {
      type = 'approve_with_warning';
      confidence = 0.8;
      reasoning.push('变更向后兼容，但存在中等风险');
      reasoning.push('建议监控相关服务');
      recommendations.push('批准但建议进行监控');
    } else if (riskAssessment.level === 'critical') {
      type = 'reject';
      confidence = 0.9;
      reasoning.push('风险等级为严重');
      reasoning.push('存在破坏性变更');
      recommendations.push('建议重新设计变更方案');
      recommendations.push('考虑分阶段实施变更');
    } else if (riskAssessment.level === 'high') {
      type = 'needs_manual_review';
      confidence = 0.7;
      reasoning.push('需要人工评审高风险变更');
      recommendations.push('请相关团队进行评审');
      recommendations.push('考虑提供更详细的变更说明');
    }

    if (proposal.backwardCompatible) {
      reasoning.push('提案标记为向后兼容');
    }

    return {
      type,
      confidence,
      reasoning,
      recommendations,
      riskAssessment,
      compatibilityCheck,
    };
  }

  async reviewProposal(proposal: Proposal): Promise<ReviewResult> {
    let impactAnalysis: ImpactAnalysisResult | undefined;

    try {
      for (const target of proposal.targets) {
        impactAnalysis = await this.dependencyAnalyzer.analyzeImpact(target.service, {
          breaking: proposal.breaking,
        });
        break;
      }
    } catch {
    }

    const compatibilityCheck = this.checkCompatibility(proposal);
    const riskAssessment = this.assessRisk(proposal, compatibilityCheck, impactAnalysis);
    const suggestion = this.generateSuggestion(proposal, compatibilityCheck, riskAssessment);

    return {
      proposalId: proposal.id,
      suggestion,
      impactAnalysis,
      automated: true,
      timestamp: new Date().toISOString(),
    };
  }

  async canAutoApprove(proposal: Proposal): Promise<boolean> {
    const reviewResult = await this.reviewProposal(proposal);
    return reviewResult.suggestion.type === 'auto_approve';
  }
}
