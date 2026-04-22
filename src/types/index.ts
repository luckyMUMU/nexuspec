import { z } from 'zod';

export const GitNexusConfigSchema = z.object({
  url: z.string(),
  apiKey: z.string(),
  spaceKey: z.string().optional(),
  graphId: z.string().optional(),
});

export type GitNexusConfig = z.infer<typeof GitNexusConfigSchema>;

export const CiCdProviderSchema = z.enum(['github_actions', 'gitlab_ci', 'jenkins', 'circleci', 'bitbucket_pipelines', 'custom']);

export type CiCdProvider = z.infer<typeof CiCdProviderSchema>;

export const DeploymentStatusSchema = z.enum(['pending', 'running', 'success', 'failed', 'cancelled', 'skipped']);

export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

export const ContractChangeTypeSchema = z.enum(['breaking', 'compatible', 'patch', 'minor', 'major']);

export type ContractChangeType = z.infer<typeof ContractChangeTypeSchema>;

export const CompatibilityRuleTypeSchema = z.enum([
  'add_optional_field',
  'add_endpoint',
  'deprecate_field',
  'remove_field',
  'change_field_type',
  'change_endpoint_path',
  'add_required_field',
  'add_event',
  'remove_event',
  'change_event_schema',
]);

export type CompatibilityRuleType = z.infer<typeof CompatibilityRuleTypeSchema>;

export const CompatibilityRuleSchema = z.object({
  type: CompatibilityRuleTypeSchema,
  backwardCompatible: z.boolean(),
  breaking: z.boolean(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  autoApprovable: z.boolean(),
});

export type CompatibilityRule = z.infer<typeof CompatibilityRuleSchema>;

export const ReviewSuggestionTypeSchema = z.enum([
  'auto_approve',
  'approve_with_warning',
  'needs_manual_review',
  'reject',
  'suggest_counterproposal',
]);

export type ReviewSuggestionType = z.infer<typeof ReviewSuggestionTypeSchema>;

export const ReviewSuggestionSchema = z.object({
  type: ReviewSuggestionTypeSchema,
  confidence: z.number(),
  reasoning: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high', 'critical']),
    factors: z.array(z.string()),
  }),
  compatibilityCheck: z.object({
    passed: z.boolean(),
    rules: z.array(CompatibilityRuleSchema),
  }),
});

export type ReviewSuggestion = z.infer<typeof ReviewSuggestionSchema>;

export const ReviewResultSchema = z.object({
  proposalId: z.string(),
  suggestion: ReviewSuggestionSchema,
  impactAnalysis: z.any().optional(),
  automated: z.boolean(),
  timestamp: z.string(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;

export const ContractValidationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  strict: z.boolean().default(false),
  failOnBreakingChanges: z.boolean().default(true),
  allowBreakingChanges: z.array(z.string()).optional(),
});

export type ContractValidationConfig = z.infer<typeof ContractValidationConfigSchema>;

export const DeploymentConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoDeployCompatibleChanges: z.boolean().default(true),
  autoDeployPatchChanges: z.boolean().default(true),
  requireApprovalForBreakingChanges: z.boolean().default(true),
  environments: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
    autoDeploy: z.boolean().default(false),
  })).optional(),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

export const CiCdConfigSchema = z.object({
  enabled: z.boolean().default(true),
  provider: CiCdProviderSchema.default('github_actions'),
  contractValidation: ContractValidationConfigSchema.default(() => ({
    enabled: true,
    strict: false,
    failOnBreakingChanges: true,
  })),
  deployment: DeploymentConfigSchema.default(() => ({
    enabled: true,
    autoDeployCompatibleChanges: true,
    autoDeployPatchChanges: true,
    requireApprovalForBreakingChanges: true,
  })),
  notifications: z.object({
    enabled: z.boolean().default(true),
    channels: z.array(z.enum(['slack', 'teams', 'email', 'custom'])).optional(),
  }).optional(),
  git: z.object({
    commitMessagePrefix: z.string().default('[contract]'),
    branchNamingPattern: z.string().default('contract-update/{{service}}/{{version}}'),
    createPullRequest: z.boolean().default(true),
  }).optional(),
});

export type CiCdConfig = z.infer<typeof CiCdConfigSchema>;

export const CompatibilityCheckResultSchema = z.object({
  compatible: z.boolean(),
  changeType: ContractChangeTypeSchema,
  issues: z.array(z.object({
    severity: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    rule: CompatibilityRuleTypeSchema.optional(),
    path: z.string().optional(),
  })),
  summary: z.string(),
});

export type CompatibilityCheckResult = z.infer<typeof CompatibilityCheckResultSchema>;

export const DeploymentTriggerSchema = z.object({
  contractRef: z.string(),
  changeType: ContractChangeTypeSchema,
  compatibilityCheck: CompatibilityCheckResultSchema,
  environment: z.string(),
  timestamp: z.string(),
});

export type DeploymentTrigger = z.infer<typeof DeploymentTriggerSchema>;

export const DeploymentSchema = z.object({
  id: z.string(),
  contractRef: z.string(),
  environment: z.string(),
  status: DeploymentStatusSchema,
  trigger: DeploymentTriggerSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  log: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type Deployment = z.infer<typeof DeploymentSchema>;

export const ContractDiffSchema = z.object({
  oldVersion: z.string(),
  newVersion: z.string(),
  additions: z.array(z.object({
    path: z.string(),
    type: z.string(),
    description: z.string(),
  })),
  removals: z.array(z.object({
    path: z.string(),
    type: z.string(),
    description: z.string(),
  })),
  modifications: z.array(z.object({
    path: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
    description: z.string(),
  })),
});

export type ContractDiff = z.infer<typeof ContractDiffSchema>;

export const PipelineConfigSchema = z.object({
  name: z.string(),
  provider: CiCdProviderSchema,
  configPath: z.string(),
  content: z.string(),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

export const CiCdIntegrationResultSchema = z.object({
  success: z.boolean(),
  compatibilityCheck: CompatibilityCheckResultSchema.optional(),
  deployment: DeploymentSchema.optional(),
  message: z.string(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
});

export type CiCdIntegrationResult = z.infer<typeof CiCdIntegrationResultSchema>;

export const ContractRefSchema = z.object({
  service: z.string(),
  type: z.enum(['api', 'events']),
  name: z.string(),
  version: z.string(),
});

export type ContractRef = z.infer<typeof ContractRefSchema>;

export const ContractStatusSchema = z.enum([
  'draft', 'active', 'deprecated', 'retired'
]);

export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const ContractVersionMetadataSchema = z.object({
  version: z.string(),
  status: ContractStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deprecatedAt: z.string().optional(),
  retiredAt: z.string().optional(),
  description: z.string().optional(),
  backwardCompatible: z.boolean().optional(),
  breakingChanges: z.array(z.string()).optional(),
  migrationGuide: z.string().optional(),
});

export type ContractVersionMetadata = z.infer<typeof ContractVersionMetadataSchema>;

export const ContractMetadataSchema = z.object({
  service: z.string(),
  type: z.enum(['api', 'events']),
  name: z.string(),
  versions: z.array(ContractVersionMetadataSchema),
  currentVersion: z.string(),
  latestVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ContractMetadata = z.infer<typeof ContractMetadataSchema>;

export const ContractMigrationPlanSchema = z.object({
  contractRef: z.string(),
  fromVersion: z.string(),
  toVersion: z.string(),
  fromStatus: ContractStatusSchema,
  toStatus: ContractStatusSchema,
  affectedServices: z.array(z.string()),
  migrationSteps: z.array(z.object({
    step: z.number(),
    description: z.string(),
    action: z.string(),
    completed: z.boolean().optional(),
  })),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  estimatedDuration: z.string().optional(),
  requiresManualReview: z.boolean(),
  migrationType: z.enum(['promote', 'retire', 'deprecate']),
});

export type ContractMigrationPlan = z.infer<typeof ContractMigrationPlanSchema>;

export const MigrationResultSchema = z.object({
  success: z.boolean(),
  contractRef: z.string(),
  fromVersion: z.string(),
  toVersion: z.string(),
  updatedServices: z.array(z.string()),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  timestamp: z.string(),
  durationMs: z.number(),
});

export type MigrationResult = z.infer<typeof MigrationResultSchema>;

export const ProposalStatusSchema = z.enum([
  'draft', 'submitted', 'reviewing', 'accepted', 'rejected', 'counterproposed', 'implementing', 'completed', 'closed'
]);

export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: ProposalStatusSchema,
  initiator: z.object({
    service: z.string(),
    agent: z.string().optional(),
    createdAt: z.string(),
  }),
  targets: z.array(z.object({
    service: z.string(),
    requiredAction: z.string(),
    contract: z.object({
      type: z.string(),
      name: z.string(),
      currentVersion: z.string(),
      proposedVersion: z.string(),
      change: z.string(),
      detail: z.string(),
    }).optional(),
    urgency: z.enum(['normal', 'high', 'critical']).optional(),
    reviewStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  })),
  contractRefs: z.array(z.object({
    ref: z.string(),
    action: z.string(),
    event: z.string().optional(),
  })).optional(),
  breaking: z.boolean().optional(),
  backwardCompatible: z.boolean().optional(),
});

export type Proposal = z.infer<typeof ProposalSchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['service', 'api', 'event', 'contract', 'data_type']),
  name: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum(['depends_on', 'provides', 'consumes', 'references', 'extends', 'produces', 'uses']),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const KnowledgeGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  version: z.string(),
  lastUpdated: z.string(),
});

export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;

export const DependencyNodeSchema = z.object({
  service: z.string(),
  level: z.number(),
  dependencies: z.array(z.string()),
  dependents: z.array(z.string()),
  contractRefs: z.array(ContractRefSchema).optional(),
});

export type DependencyNode = z.infer<typeof DependencyNodeSchema>;

export const ImpactAnalysisResultSchema = z.object({
  targetService: z.string(),
  directDependencies: z.array(DependencyNodeSchema),
  directDependents: z.array(DependencyNodeSchema),
  allAffectedServices: z.array(z.string()),
  dependencyTree: z.any(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string(),
});

export type ImpactAnalysisResult = z.infer<typeof ImpactAnalysisResultSchema>;

export const BaseNxspConfigSchema = z.object({
  service: z.object({
    name: z.string(),
    team: z.string().optional(),
  }),
  namespace: z.object({
    remote: z.string(),
    localPath: z.string().optional(),
  }),
  exposes: z.array(z.object({
    type: z.enum(['api', 'events']),
    path: z.string(),
    name: z.string(),
  })),
  depends: z.record(z.string(), z.string()),
  sharedTypes: z.array(z.string()).optional(),
  gitnexus: GitNexusConfigSchema.optional(),
});

export type BaseNxspConfig = z.infer<typeof BaseNxspConfigSchema>;

export const NxspConfigSchema = BaseNxspConfigSchema.extend({
  cicd: CiCdConfigSchema.optional(),
});

export type NxspConfig = z.infer<typeof NxspConfigSchema>;
