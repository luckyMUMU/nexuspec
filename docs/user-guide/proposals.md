# 跨服务提案（CSP）指南

本指南将详细介绍如何使用 NexusSpec 的跨服务提案系统来协调服务之间的契约变更。

## 目录

1. [提案概述](#提案概述)
2. [创建提案](#创建提案)
3. [审查提案](#审查提案)
4. [接受或拒绝提案](#接受或拒绝提案)
5. [执行变更](#执行变更)
6. [归档提案](#归档提案)

---

## 提案概述

跨服务提案（Cross-Service Proposal, CSP）是 NexusSpec 的核心功能之一，它提供了一个结构化的流程来协调服务之间的契约变更。

### 提案生命周期

```
Draft → Submitted → Reviewing → Accepted/Rejected → Implementing → Completed → Closed
```

### 提案类型

- **新契约版本**: 发布新版本的 API 或事件契约
- **契约修改**: 修改现有契约
- **添加端点**: 新增 API 端点
- **添加事件**: 新增事件类型
- **其他变更**: 其他类型的跨服务协调

---

## 创建提案

### 基本用法

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

### 命令选项

| 选项 | 描述 | 必填 |
|------|------|------|
| `--title` | 提案标题 | 是 |
| `--target` | 目标服务名称 | 是 |
| `--contract-type` | 契约类型 (`api` 或 `events`) | 否 |
| `--contract-name` | 契约名称 | 否 |
| `--current-version` | 当前版本 | 否 |
| `--proposed-version` | 提议版本 | 否 |
| `--change-type` | 变更类型 | 否 |
| `--detail` | 变更详情 | 否 |
| `--breaking` | 是否破坏性变更 | 否 |
| `--backward-compatible` | 是否向后兼容 | 否 |

### 完整示例

让我们创建一个完整的提案场景：

```bash
# 1. 在订单服务中创建提案
cd order-service

# 2. 创建提案
nxsp propose \
  --title "Add loyalty points integration to order flow" \
  --target loyalty-service \
  --contract-type api \
  --contract-name default \
  --current-version v1 \
  --proposed-version v2 \
  --change-type add_endpoint \
  --detail "Add POST /api/v2/points/credit endpoint to support order loyalty points" \
  --backward-compatible
```

这将：
1. 在本地创建 OpenSpec 变更
2. 创建提案文件
3. 提交并推送到命名空间仓库

---

## 审查提案

### 查看所有待审查提案

```bash
nxsp review
```

### 查看特定提案详情

```bash
nxsp review --id CSP-ABC123
```

### 运行 AI 自动审查

```bash
nxsp review --id CSP-ABC123 --auto
```

AI 审查将提供：
- 兼容性分析
- 风险评估
- 建议（自动批准、需要人工审查、拒绝）
- 影响分析

### 审查结果示例

```
📋 Proposal: CSP-ABC123
Title: Add loyalty points endpoint
Status: submitted
Initiator: order-service

🤖 AI Review Result:
  Suggestion: AUTO_APPROVE
  Confidence: 95%

💭 Reasoning:
  1. New endpoint added, no breaking changes
  2. Backward compatible
  3. All checks passed

💡 Recommendations:
  1. Accept the proposal
  2. Update dependencies to v2

⚠️ Risk Assessment:
  Level: LOW
  Factors:
    1. No breaking changes
    2. Backward compatible

✅ Compatibility Check:
  Passed: Yes
  Applied Rules:
    1. New endpoints are safe
    2. No fields removed or modified
```

---

## 接受或拒绝提案

### 接受提案

```bash
nxsp accept CSP-ABC123
```

这将：
1. 拉取提案
2. 注入变更到本地
3. 激活契约新版本
4. 推送变更到命名空间仓库

### 拒绝提案

```bash
nxsp reject CSP-ABC123
```

---

## 执行变更

### 应用变更

提案接受后，可以使用 OpenSpec 的工作流来执行变更：

```bash
# 这会委托给 OpenSpec
nxsp apply
```

或者直接使用 OpenSpec 命令：

```bash
openspec instructions apply
```

---

## 归档提案

### 归档已完成的提案

```bash
nxsp archive CSP-ABC123
```

### 归档所有已完成的变更和提案

```bash
nxsp archive
```

---

## 最佳实践

### 提案发起方

1. **清晰描述**: 提供详细的变更描述和理由
2. **向后兼容**: 尽可能保持向后兼容
3. **影响分析**: 提前分析变更对其他服务的影响
4. **沟通**: 在创建提案前与目标团队进行初步沟通

### 提案接收方

1. **及时审查**: 尽快审查提案
2. **利用 AI**: 使用 AI 审查辅助决策
3. **透明沟通**: 如果拒绝，提供清晰的理由
4. **快速反馈**: 及时给出审查结果

### 提案内容

1. **包含 Spec Delta**: 提供详细的规范变更
2. **描述影响**: 说明对依赖服务的影响
3. **迁移指南**: 提供迁移指南（如适用）
4. **测试计划**: 说明如何验证变更

---

## 示例工作流

### 场景：订单服务需要积分服务添加新端点

#### 1. 订单服务创建提案

```bash
cd order-service
nxsp propose \
  --title "Add credit points endpoint" \
  --target loyalty-service \
  --contract-type api \
  --current-version v1 \
  --proposed-version v2 \
  --detail "We need an endpoint to credit points when an order is completed" \
  --backward-compatible
```

#### 2. 积分服务审查提案

```bash
cd loyalty-service
nxsp review --auto
```

#### 3. 积分服务接受提案

```bash
nxsp accept CSP-DEF456
```

#### 4. 积分服务实现变更

```bash
nxsp apply
# 实现新端点...
```

#### 5. 订单服务更新依赖

```bash
cd order-service
# 更新 .nxsp/config.yaml 中的契约引用到 v2
nxsp sync
```

#### 6. 归档提案

```bash
nxsp archive CSP-DEF456
```

---

## 下一步

- 查看 [CI/CD 集成指南](cicd.md) 了解如何自动化提案流程
- 阅读 [CLI 参考](../cli-reference/commands.md) 了解所有提案相关命令

---

*最后更新: 2026-04-20*
