# NexusSpec CLI 命令参考

本参考文档详细介绍了 NexusSpec CLI 的所有可用命令。

## 目录

1. [基础命令](#基础命令)
2. [提案管理](#提案管理)
3. [契约管理](#契约管理)
4. [依赖分析](#依赖分析)
5. [CI/CD 集成](#cicd-集成)
6. [GitNexus 集成](#gitnexus-集成)
7. [OpenSpec 代理](#openspec-代理)

---

## 基础命令

### nxsp init

初始化 NexusSpec 在当前项目中。

**用法:**
```bash
nxsp init [options]
```

**选项:**
| 选项 | 描述 | 必填 |
|------|------|------|
| `--namespace <url>` | 命名空间 Git 仓库 URL | 是 |
| `--service <name>` | 服务名称 | 是 |
| `--team <name>` | 团队名称 | 否 |

**示例:**
```bash
nxsp init \
  --namespace git@github.com:your-org/your-namespace.git \
  --service order-service \
  --team payments-team
```

### nxsp sync

与命名空间同步（委托给 OpenSpec）。

**用法:**
```bash
nxsp sync
```

### nxsp sync-contracts

将契约同步到命名空间仓库。

**用法:**
```bash
nxsp sync-contracts
```

### nxsp tree

显示命名空间规范树结构。

**用法:**
```bash
nxsp tree
```

### nxsp apply

应用变更（委托给 OpenSpec）。

**用法:**
```bash
nxsp apply
```

### nxsp archive

归档已完成的变更和提案。

**用法:**
```bash
nxsp archive [id] [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--yes` | 跳过确认提示 |
| `--skip-specs` | 跳过规范更新操作 |

**示例:**
```bash
# 归档特定提案
nxsp archive CSP-ABC123

# 归档所有
nxsp archive
```

---

## 提案管理

### nxsp propose

创建跨服务提案（CSP）。

**用法:**
```bash
nxsp propose [options]
```

**选项:**
| 选项 | 描述 | 必填 |
|------|------|------|
| `--title <title>` | 提案标题 | 是 |
| `--target <service>` | 目标服务名称 | 是 |
| `--contract-type <type>` | 契约类型 (`api` 或 `events`) | 否 |
| `--contract-name <name>` | 契约名称 | 否 |
| `--current-version <version>` | 当前契约版本 | 否 |
| `--proposed-version <version>` | 提议契约版本 | 否 |
| `--change-type <type>` | 变更类型 | 否 |
| `--detail <text>` | 变更详情 | 否 |
| `--breaking` | 破坏性变更 | 否 |
| `--backward-compatible` | 向后兼容变更 | 否 |
| `--openspec-schema <schema>` | 使用的 OpenSpec 模式 | 否 |

**示例:**
```bash
nxsp propose \
  --title "Add loyalty points endpoint" \
  --target loyalty-service \
  --contract-type api \
  --contract-name default \
  --current-version v1 \
  --proposed-version v2 \
  --change-type add_endpoint \
  --detail "Add POST /api/v2/points/credit endpoint" \
  --backward-compatible
```

### nxsp review

审查待处理的提案，支持 AI 建议。

**用法:**
```bash
nxsp review [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--id <id>` | 特定提案 ID |
| `--auto` | 运行自动审查并显示建议 |

**示例:**
```bash
# 查看所有待审查提案
nxsp review

# 查看特定提案并运行 AI 审查
nxsp review --id CSP-ABC123 --auto
```

### nxsp accept

接受提案。

**用法:**
```bash
nxsp accept <id>
```

**示例:**
```bash
nxsp accept CSP-ABC123
```

### nxsp reject

拒绝提案。

**用法:**
```bash
nxsp reject <id>
```

**示例:**
```bash
nxsp reject CSP-ABC123
```

---

## 契约管理

### nxsp contract

契约生命周期管理命令组。

#### nxsp contract list

列出所有契约。

**用法:**
```bash
nxsp contract list [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--service <name>` | 按服务名称过滤 |

**示例:**
```bash
# 列出所有契约
nxsp contract list

# 列出特定服务的契约
nxsp contract list --service user-service
```

#### nxsp contract versions

列出契约的所有版本。

**用法:**
```bash
nxsp contract versions <service> <type> <name>
```

**参数:**
| 参数 | 描述 |
|------|------|
| `service` | 服务名称 |
| `type` | 契约类型 (`api` 或 `events`) |
| `name` | 契约名称 |

**示例:**
```bash
nxsp contract versions user-service api default
```

#### nxsp contract add-version

添加新的契约版本。

**用法:**
```bash
nxsp contract add-version <service> <type> <name> <version> [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--status <status>` | 初始状态 (`draft` 或 `active`)，默认 `draft` |
| `--description <text>` | 版本描述 |
| `--backward-compatible` | 标记为向后兼容 |
| `--breaking-changes <list>` | 破坏性变更（逗号分隔） |

**示例:**
```bash
nxsp contract add-version user-service api default v2 \
  --status draft \
  --description "Add new endpoints" \
  --backward-compatible
```

#### nxsp contract promote

提升契约版本为活跃状态。

**用法:**
```bash
nxsp contract promote <service> <type> <name> <version> [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--description <text>` | 提升描述 |
| `--backward-compatible` | 标记为向后兼容 |
| `--breaking-changes <list>` | 破坏性变更（逗号分隔） |
| `--no-auto-deprecate` | 不自动废弃旧版本 |
| `--auto-update-dependents` | 自动更新依赖服务 |
| `--dry-run` | 显示将要执行的操作而不实际执行 |
| `--plan-only` | 仅显示迁移计划，不执行 |

**示例:**
```bash
nxsp contract promote user-service api default v2 \
  --description "Release v2" \
  --backward-compatible
```

#### nxsp contract deprecate

废弃契约版本。

**用法:**
```bash
nxsp contract deprecate <service> <type> <name> <version> [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--migration-guide <text>` | 迁移指南 |
| `--dry-run` | 显示将要执行的操作而不实际执行 |
| `--plan-only` | 仅显示迁移计划，不执行 |

**示例:**
```bash
nxsp contract deprecate user-service api default v1 \
  --migration-guide "Please migrate to v2"
```

#### nxsp contract retire

下线契约版本。

**用法:**
```bash
nxsp contract retire <service> <type> <name> <version> [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--force` | 强制下线，即使仍被引用 |
| `--dry-run` | 显示将要执行的操作而不实际执行 |
| `--plan-only` | 仅显示迁移计划，不执行 |

**示例:**
```bash
nxsp contract retire user-service api default v1
```

#### nxsp contract outdated

查找使用旧版本契约的服务。

**用法:**
```bash
nxsp contract outdated <service> <type> <name>
```

**示例:**
```bash
nxsp contract outdated user-service api default
```

#### nxsp contract history

显示契约的迁移历史。

**用法:**
```bash
nxsp contract history <service> <type> <name>
```

**示例:**
```bash
nxsp contract history user-service api default
```

---

## 依赖分析

### nxsp impact

分析变更的影响，使用知识图谱。

**用法:**
```bash
nxsp impact [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--service <name>` | 要分析的服务名称 |
| `--contract <ref>` | 要分析的契约引用 |
| `--breaking` | 指示这是否是破坏性变更 |
| `--json` | 以 JSON 格式输出结果 |

**示例:**
```bash
# 分析当前服务的影响
nxsp impact

# 分析特定服务的影响
nxsp impact --service order-service

# 以 JSON 格式输出
nxsp impact --json
```

### nxsp dependencies

显示服务依赖关系图。

**用法:**
```bash
nxsp dependencies [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--json` | 以 JSON 格式输出 |

**示例:**
```bash
nxsp dependencies
```

---

## CI/CD 集成

### nxsp cicd

CI/CD 集成命令组，用于契约验证和部署。

#### nxsp cicd init

初始化 CI/CD 配置。

**用法:**
```bash
nxsp cicd init [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--provider <provider>` | CI/CD 提供商，默认 `github_actions` |
| `--no-deploy` | 禁用部署 |
| `--no-validate` | 禁用契约验证 |

**示例:**
```bash
nxsp cicd init --provider github_actions
```

#### nxsp cicd validate

验证契约兼容性。

**用法:**
```bash
nxsp cicd validate [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--old <path>` | 旧契约文件路径 |
| `--new <path>` | 新契约文件路径 |
| `--all` | 验证所有契约 |
| `--strict` | 严格验证模式 |
| `--json` | 以 JSON 格式输出 |

**示例:**
```bash
# 验证两个版本
nxsp cicd validate \
  --old contracts/user-service/api/v1.yaml \
  --new contracts/user-service/api/v2.yaml

# 检查所有契约变更
nxsp cicd validate --all
```

#### nxsp cicd deploy

部署契约。

**用法:**
```bash
nxsp cicd deploy [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--environment <env>` | 目标环境，默认 `production` |
| `--contract <ref>` | 契约引用，默认 `default` |
| `--dry-run` | 显示将要执行的操作而不实际执行 |
| `--json` | 以 JSON 格式输出 |

**示例:**
```bash
nxsp cicd deploy --environment production
```

#### nxsp cicd deployments

列出部署历史。

**用法:**
```bash
nxsp cicd deployments [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--environment <env>` | 按环境过滤 |
| `--status <status>` | 按状态过滤 |
| `--limit <n>` | 限制结果数量，默认 `10` |
| `--json` | 以 JSON 格式输出 |

**示例:**
```bash
nxsp cicd deployments --environment production
```

#### nxsp cicd rollback

回滚部署。

**用法:**
```bash
nxsp cicd rollback <deploymentId> [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--dry-run` | 显示将要执行的操作而不实际执行 |
| `--json` | 以 JSON 格式输出 |

**示例:**
```bash
nxsp cicd rollback abc123def456
```

#### nxsp cicd generate

生成 CI/CD 管道配置。

**用法:**
```bash
nxsp cicd generate [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--provider <provider>` | CI/CD 提供商，默认 `github_actions` |
| `--output <path>` | 输出文件路径 |

**示例:**
```bash
nxsp cicd generate --provider github_actions
```

---

## GitNexus 集成

### nxsp gitnexus

GitNexus 知识图谱配置命令组。

#### nxsp gitnexus configure

配置 GitNexus 连接。

**用法:**
```bash
nxsp gitnexus configure [options]
```

**选项:**
| 选项 | 描述 | 必填 |
|------|------|------|
| `--url <url>` | GitNexus API URL | 是 |
| `--api-key <key>` | GitNexus API 密钥 | 是 |
| `--space-key <key>` | GitNexus 空间密钥 | 否 |
| `--graph-id <id>` | GitNexus 图谱 ID | 否 |

**示例:**
```bash
nxsp gitnexus configure \
  --url https://gitnexus.example.com \
  --api-key your-api-key \
  --space-key my-space
```

#### nxsp gitnexus sync

与 GitNexus 同步知识图谱。

**用法:**
```bash
nxsp gitnexus sync [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--push` | 将本地图谱推送到 GitNexus |
| `--pull` | 从 GitNexus 拉取图谱 |

**示例:**
```bash
# 从 GitNexus 拉取
nxsp gitnexus sync --pull

# 推送到 GitNexus
nxsp gitnexus sync --push
```

#### nxsp gitnexus status

显示 GitNexus 配置和图谱状态。

**用法:**
```bash
nxsp gitnexus status
```

---

## OpenSpec 代理

### nxsp openspec

直接代理 OpenSpec 命令。

**用法:**
```bash
nxsp openspec <command> [args]
```

**示例:**
```bash
nxsp openspec status
nxsp openspec list
```

### OpenSpec 快捷命令

以下是 OpenSpec 命令的快捷方式：

| 命令 | 描述 |
|------|------|
| `nxsp status` | 显示状态 |
| `nxsp list` | 列出项目 |
| `nxsp view` | 查看规范 |
| `nxsp validate` | 验证规范 |
| `nxsp show` | 显示信息 |
| `nxsp schemas` | 列出模式 |
| `nxsp new change <name>` | 创建新变更 |

### nxsp new

创建新项目命令组。

#### nxsp new change

创建新变更（委托给 OpenSpec）。

**用法:**
```bash
nxsp new change <name> [options]
```

**选项:**
| 选项 | 描述 |
|------|------|
| `--description <text>` | 描述 |
| `--schema <name>` | 模式 |

---

## 全局选项

| 选项 | 描述 |
|------|------|
| `-V, --version` | 输出版本号 |
| `-h, --help` | 显示帮助信息 |

---

## 配置文件

NexusSpec 使用 `.nxsp/config.yaml` 配置文件：

```yaml
service:
  name: order-service
  team: payments-team
namespace:
  remote: git@github.com:your-org/your-namespace.git
  localPath: ~/.nxsp/namespaces/your-namespace
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
  - type: events
    path: src/events/schemas.yaml
    name: default
depends:
  userApi: contract://user-service/api/default:v1
  notificationEvents: contract://notification-service/events/default:v1
sharedTypes:
  - common-types
  - error-codes
```

---

*最后更新: 2026-04-20*
