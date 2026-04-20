# NexusSpec 架构概览

本文档详细介绍了 NexusSpec 的系统架构、设计原则和核心组件。

## 目录

1. [设计原则](#设计原则)
2. [系统架构](#系统架构)
3. [核心组件](#核心组件)
4. [数据模型](#数据模型)
5. [工作流程](#工作流程)
6. [扩展点](#扩展点)

---

## 设计原则

NexusSpec 的设计遵循以下核心原则：

### 1. 树状规范模型
- 整体规范呈现为树状结构
- 命名空间规范为根节点
- 各服务规范为子树
- 契约为连接边

### 2. 自治性
- 每个服务完全自治
- 自主决定是否接受外部变更
- 保留对自身规范的完全控制权

### 3. 版本化契约
- 所有外部交互通过版本化契约
- 支持渐进式演进
- 明确的生命周期管理

### 4. 零侵入性
- 不修改 OpenSpec 源代码
- 通过包装模式扩展功能
- 服务仓库保持纯净

### 5. Git 优先
- 使用 Git 作为唯一的通信和存储机制
- 无运行时依赖
- 天然的审计和历史记录

---

## 系统架构

### 双仓库模型

NexusSpec 使用双仓库架构：

```
┌─────────────────────────────────────┐
│     服务仓库 (Service Repo)         │
│  ┌───────────────────────────────┐  │
│  │  OpenSpec (内部规范)          │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  NexusSpec Wrapper            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │ Git
              │
              ▼
┌─────────────────────────────────────┐
│  命名空间仓库 (Namespace Repo)      │
│  ┌──────────────┐ ┌─────────────┐  │
│  │  根规范     │ │  契约注册表│  │
│  └──────────────┘ └─────────────┘  │
│  ┌──────────────┐ ┌─────────────┐  │
│  │  提案       │ │  依赖图谱   │  │
│  └──────────────┘ └─────────────┘  │
└─────────────────────────────────────┘
```

### 命名空间仓库结构

```
your-namespace/
├── spec/                           # 根规范
│   ├── namespace.md                # 命名空间描述
│   ├── shared/                     # 共享数据模型
│   │   ├── common-types.yaml
│   │   └── error-codes.yaml
│   └── policies/                   # 策略配置
│       ├── api-governance.md
│       └── review-policies.yaml
├── contracts/                      # 契约注册表
│   ├── service-a/
│   │   ├── api/
│   │   │   ├── v1.yaml             # API 契约 v1 (active)
│   │   │   └── v2.yaml             # API 契约 v2 (draft)
│   │   └── events/
│   │       └── v1.yaml
│   ├── service-b/
│   └── external/                   # 外部系统契约
│       └── payment-gateway/
├── proposals/                      # 跨服务提案
│   ├── active/
│   │   ├── CSP-001/
│   │   │   ├── proposal.yaml
│   │   │   ├── proposal.md
│   │   │   ├── spec-delta.md
│   │   │   └── review/
│   └── archive/
├── graph/                          # 依赖图谱
│   ├── schema.yaml
│   └── snapshot.json
└── config.yaml                     # 命名空间配置
```

### 服务仓库结构

```
your-service/
├── openspec/                       # OpenSpec（保持不变）
│   ├── config.yaml
│   ├── changes/
│   └── specs/
├── .nxsp/                          # NexusSpec 配置
│   └── config.yaml
└── [你的代码...]
```

---

## 核心组件

### 1. OpenSpec 集成层 (OpenSpecIntegration)

负责与 OpenSpec 的深度集成：

```typescript
class OpenSpecIntegration {
  // 初始化 OpenSpec
  async init(): Promise<void>
  
  // 创建新变更
  async newChange(name: string, options: ChangeOptions): Promise<void>
  
  // 运行 OpenSpec 命令
  async runCommand(args: string[]): Promise<void>
  
  // 归档变更
  async archive(id?: string, options?: ArchiveOptions): Promise<void>
  
  // 同步
  async update(): Promise<void>
}
```

### 2. 提案管理器 (ProposalManager)

管理跨服务提案的生命周期：

```typescript
class ProposalManager {
  // 创建提案
  async createProposal(options: ProposalOptions): Promise<Proposal>
  
  // 加载提案
  async loadProposal(id: string): Promise<Proposal>
  
  // 列出提案
  async listProposals(): Promise<Proposal[]>
  
  // 审查提案
  async reviewProposal(id: string): Promise<ReviewResult>
  
  // 批量审查
  async batchReviewProposals(): Promise<BatchReviewResult>
  
  // 接受提案
  async acceptProposal(id: string): Promise<void>
  
  // 拒绝提案
  async rejectProposal(id: string): Promise<void>
  
  // 归档提案
  async archiveProposal(id: string): Promise<void>
}
```

### 3. 契约生命周期管理器 (ContractLifecycleManager)

管理契约的版本生命周期：

```typescript
class ContractLifecycleManager {
  // 列出契约
  async listContracts(service?: string): Promise<Contract[]>
  
  // 获取契约版本
  async getContractVersions(
    service: string,
    type: ContractType,
    name: string
  ): Promise<ContractVersion[]>
  
  // 添加版本
  async addContractVersion(
    service: string,
    type: ContractType,
    name: string,
    version: string,
    options: AddVersionOptions
  ): Promise<void>
  
  // 提升版本
  async promoteVersion(
    service: string,
    type: ContractType,
    name: string,
    version: string,
    options: PromoteOptions
  ): Promise<MigrationResult>
  
  // 废弃版本
  async deprecateVersion(
    service: string,
    type: ContractType,
    name: string,
    version: string,
    options: DeprecateOptions
  ): Promise<MigrationResult>
  
  // 下线版本
  async retireVersion(
    service: string,
    type: ContractType,
    name: string,
    version: string,
    options: RetireOptions
  ): Promise<MigrationResult>
}
```

### 4. 版本迁移工具 (VersionMigrationTool)

处理契约版本迁移的复杂逻辑：

```typescript
class VersionMigrationTool {
  // 创建提升计划
  async createPromotionPlan(
    service: string,
    type: ContractType,
    name: string,
    version: string,
    options: PromotionPlanOptions
  ): Promise<MigrationPlan>
  
  // 创建废弃计划
  async createDeprecationPlan(
    service: string,
    type: ContractType,
    name: string,
    version: string
  ): Promise<MigrationPlan>
  
  // 创建下线计划
  async createRetirementPlan(
    service: string,
    type: ContractType,
    name: string,
    version: string
  ): Promise<MigrationPlan>
  
  // 执行迁移
  async executePromotion(
    plan: MigrationPlan,
    options: ExecuteOptions
  ): Promise<MigrationResult>
  
  // 查找过时引用
  async findOutdatedReferences(
    service: string,
    type: ContractType,
    name: string
  ): Promise<OutdatedReference[]>
  
  // 获取迁移历史
  async getMigrationHistory(
    service: string,
    type: ContractType,
    name: string
  ): Promise<MigrationHistoryEntry[]>
}
```

### 5. 依赖分析器 (DependencyAnalyzer)

分析服务间的依赖关系和变更影响：

```typescript
class DependencyAnalyzer {
  // 分析影响
  async analyzeImpact(
    service: string,
    options: ImpactOptions
  ): Promise<ImpactAnalysisResult>
  
  // 获取完整依赖图
  async getFullDependencyMap(): Promise<DependencyMap>
}
```

### 6. 知识图谱服务 (KnowledgeGraphService)

管理服务间的知识图谱：

```typescript
class KnowledgeGraphService {
  // 连接到 GitNexus
  async connectToGitNexus(config: GitNexusConfig): Promise<boolean>
  
  // 同步到 GitNexus
  async syncToGitNexus(): Promise<boolean>
  
  // 从 GitNexus 同步
  async syncFromGitNexus(): Promise<void>
  
  // 从配置同步
  async syncFromConfig(): Promise<void>
  
  // 加载本地图谱
  async loadLocalGraph(): Promise<KnowledgeGraph | null>
}
```

### 7. CI/CD 集成 (CiCdIntegration)

与 CI/CD 系统集成：

```typescript
class CiCdIntegration {
  // 初始化 CI/CD 配置
  async initCiCdConfig(options: CiCdInitOptions): Promise<void>
  
  // 运行契约验证
  async runContractValidation(
    oldPath: string,
    newPath: string
  ): Promise<ValidationResult>
  
  // 检查契约变更
  async checkForContractChanges(): Promise<ContractChanges>
  
  // 生成管道配置
  async generatePipelineConfig(
    provider: CiCdProvider,
    options: GenerateOptions
  ): Promise<PipelineConfig>
}
```

### 8. 部署管理器 (DeploymentManager)

管理契约部署：

```typescript
class DeploymentManager {
  // 初始化
  async initialize(): Promise<void>
  
  // 执行部署
  async executeDeployment(
    contractRef: string,
    environment: string,
    options: DeploymentOptions
  ): Promise<DeploymentResult>
  
  // 列出部署
  async listDeployments(options: ListDeploymentsOptions): Promise<Deployment[]>
  
  // 回滚部署
  async rollbackDeployment(
    deploymentId: string,
    options: RollbackOptions
  ): Promise<RollbackResult>
}
```

---

## 数据模型

### 提案数据模型

```typescript
interface Proposal {
  id: string
  title: string
  status: ProposalStatus
  initiator: {
    service: string
    agent?: string
    createdAt: string
  }
  targets: ProposalTarget[]
  contractRefs: ContractRefChange[]
  breaking: boolean
  backwardCompatible: boolean
  createdAt: string
  updatedAt: string
}

interface ProposalTarget {
  service: string
  requiredAction: string
  contract?: {
    type: ContractType
    name: string
    currentVersion: string
    proposedVersion: string
    change: string
    detail?: string
  }
  urgency: string
  reviewStatus: ReviewStatus
}
```

### 契约数据模型

```typescript
interface Contract {
  service: string
  type: ContractType
  name: string
  currentVersion: string
  status: ContractStatus
  versions: ContractVersion[]
}

interface ContractVersion {
  version: string
  status: ContractVersionStatus
  description?: string
  backwardCompatible?: boolean
  breakingChanges?: string[]
  createdAt: string
}

type ContractType = 'api' | 'events'
type ContractStatus = 'draft' | 'active' | 'deprecated' | 'retired'
```

### 契约引用格式

```typescript
// contract://{service}/{type}/{name}:{version}
type ContractRef = string

// 示例
const exampleRef: ContractRef = 'contract://user-service/api/default:v1'
```

### 知识图谱数据模型

```typescript
interface KnowledgeGraph {
  version: string
  lastUpdated: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface GraphNode {
  id: string
  type: 'service' | 'contract' | 'external-system'
  label: string
  metadata: Record<string, any>
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'depends-on' | 'exposes' | 'consumes'
  metadata: Record<string, any>
}
```

---

## 工作流程

### 完整提案生命周期

```
1. 发起方创建提案
   ↓
2. 提案提交到命名空间仓库
   ↓
3. 目标方审查提案
   ├─ AI 自动审查
   ├─ 兼容性检查
   └─ 影响分析
   ↓
4. 目标方决定
   ├─ 接受 → 继续
   ├─ 拒绝 → 结束
   └─ 反提案 → 返回步骤 1
   ↓
5. 接受后激活新版本
   ↓
6. 发起方更新引用
   ↓
7. 实施变更
   ↓
8. 归档提案
```

### 契约版本升级流程

```
1. 创建新版本 (draft)
   ↓
2. 通过提案协调
   ↓
3. 提升为 active
   ↓
4. 旧版本自动 deprecated
   ↓
5. 等待所有消费者迁移
   ↓
6. 下线旧版本 (retired)
```

---

## 扩展点

NexusSpec 设计了以下扩展点：

### 1. 自定义审查策略

在 `spec/policies/review-policies.yaml` 中定义：

```yaml
autoAccept:
  rules:
    - match:
        contractAction: new-contract-version
        backwardCompatible: true
      action: auto-accept
```

### 2. 自定义 CI/CD 提供商

实现 `CiCdProvider` 接口来支持新的 CI/CD 平台。

### 3. 自定义知识图谱集成

扩展 `KnowledgeGraphService` 以支持其他图谱系统。

### 4. OpenSpec 钩子

利用 OpenSpec 的钩子系统在关键节点注入 NexusSpec 逻辑。

---

## 性能优化

NexusSpec 包含以下性能优化：

1. **直接 API 集成**：避免子进程开销
2. **缓存配置加载**：减少重复读取
3. **批量同步操作**：减少 Git 操作次数
4. **增量影响分析**：只分析变更的部分
5. **异步审查处理**：支持并行审查多个提案

---

## 安全性考虑

1. **Git 权限管理**：利用 Git 的原生权限控制
2. **契约签名**：支持契约签名验证
3. **审计日志**：完整的变更历史记录
4. **审批流程**：可配置的多级审批

---

*最后更新: 2026-04-20*
