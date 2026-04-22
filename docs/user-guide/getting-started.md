# NexusSpec 入门指南

欢迎使用 NexusSpec！本指南将帮助您快速上手并开始使用这个强大的分布式 Spec 系统。

## 目录

1. [系统要求](#系统要求)
2. [安装](#安装)
3. [快速开始](#快速开始)
4. [核心概念](#核心概念)
5. [下一步](#下一步)

---

## 系统要求

在开始之前，请确保您的系统满足以下要求：

- **Node.js**: 20.19.0 或更高版本
- **Git**: 最新版本
- **操作系统**: Linux, macOS, 或 Windows

## 安装

### 全局安装

```bash
npm install -g @nexus-spec/cli
```

### 验证安装

安装完成后，运行以下命令验证安装：

```bash
nxsp --version
```

如果看到版本号输出，说明安装成功！

---

## 快速开始

让我们通过一个简单的示例来了解 NexusSpec 的基本使用流程。

### 步骤 1: 创建命名空间仓库

首先，我们需要设置一个命名空间仓库来管理所有的规范和契约：

```bash
# 创建一个新的 git 仓库作为命名空间
mkdir payments-namespace
cd payments-namespace
git init

# 创建基本目录结构
mkdir -p spec/shared contracts proposals/active proposals/archive graph

# 创建初始的 namespace.md 文件
cat > spec/namespace.md << 'EOF'
# Payments Namespace

这是支付服务系统的中央命名空间。
EOF

# 提交并推送到远程仓库
git add .
git commit -m "Initial namespace setup"
git remote add origin git@github.com:your-org/payments-namespace.git
git push -u origin main
```

### 步骤 2: 初始化服务

现在，让我们为一个服务初始化 NexusSpec：

```bash
# 创建服务仓库
mkdir order-service
cd order-service
git init

# 初始化 NexusSpec
nxsp init \
  --namespace git@github.com:your-org/payments-namespace.git \
  --service order-service \
  --team payments-team
```

这将创建一个 `.nxsp/config.yaml` 文件来管理您的 NexusSpec 配置。

### 步骤 3: 创建契约

让我们创建并暴露一个 API 契约：

```bash
# 创建 OpenAPI 规范文件
mkdir -p src/api
cat > src/api/openapi.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Order Service API
  version: 1.0.0
paths:
  /orders:
    post:
      summary: 创建订单
      responses:
        '201':
          description: 订单创建成功
  /orders/{id}:
    get:
      summary: 获取订单详情
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 订单详情
EOF
```

现在，更新 `.nxsp/config.yaml` 文件来暴露这个契约：

```yaml
service:
  name: order-service
  team: payments-team
namespace:
  remote: git@github.com:your-org/payments-namespace.git
  localPath: ~/.nxsp/namespaces/payments-namespace
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
depends: {}
sharedTypes: []
```

### 步骤 4: 同步契约

将契约同步到命名空间仓库：

```bash
nxsp sync-contracts
```

### 步骤 5: 创建跨服务提案

假设我们需要修改另一个服务的契约，让我们创建一个提案：

```bash
nxsp propose \
  --title "Add loyalty points to order flow" \
  --target loyalty-service \
  --contract-type api \
  --contract-name default \
  --current-version v1 \
  --proposed-version v2 \
  --change-type add_endpoint \
  --detail "Add POST /api/v2/points/credit endpoint" \
  --backward-compatible
```

### 步骤 6: 审查和接受提案

目标服务团队可以审查和接受提案：

```bash
# 查看待审查提案
nxsp review

# 接受提案
nxsp accept CSP-ABC123
```

---

## 核心概念

### 1. 命名空间（Namespace）

命名空间是一个中央 Git 仓库，用于：
- 存储共享的数据模型和策略
- 管理所有服务的契约
- 跟踪跨服务提案
- 维护依赖关系图谱

### 2. 契约（Contract）

契约是服务对外公开的接口定义，支持两种类型：
- **API 契约**: OpenAPI 规范
- **事件契约**: 事件模式定义

契约有版本号，支持以下生命周期状态：
- `draft`: 草案
- `active`: 活跃（当前版本）
- `deprecated`: 已废弃（仍可使用）
- `retired`: 已下线（不可使用）

### 3. 跨服务提案（CSP）

当一个服务需要另一个服务修改其契约时，通过提案流程进行：
1. 发起方创建提案
2. 目标方审查提案
3. 目标方接受或拒绝提案
4. 执行变更
5. 归档提案

### 4. 契约引用

服务通过 `contract://` URI 引用其他服务的契约：

```
contract://{service}/{type}/{name}:{version}
```

示例：
```yaml
depends:
  loyaltyApi: contract://loyalty-service/api/default:v1
```

---

## 下一步

恭喜！您已经完成了基本设置。接下来可以：

1. 阅读 [CLI 命令参考](../cli-reference/commands.md) 了解所有可用命令
2. 查看 [架构文档](../architecture/overview.md) 深入理解系统设计
3. 探索 [示例代码](../examples/) 了解更多用例
4. 加入我们的 [社区](../community/) 获取支持

---

## 常见问题

### Q: 如何更新已安装的 NexusSpec？

A: 运行以下命令：
```bash
npm update -g @nexus-spec/cli
```

### Q: 命名空间仓库必须是 GitHub 仓库吗？

A: 不是，可以使用任何 Git 托管服务（GitLab, Bitbucket 等）。

### Q: 可以在没有 OpenSpec 的情况下使用 NexusSpec 吗？

A: 不可以，NexusSpec 深度集成了 OpenSpec 1.3，需要先安装 OpenSpec。

---

## 获取帮助

如果您在使用过程中遇到问题，请：
1. 查看 [故障排除指南](troubleshooting.md)
2. 在 [社区论坛](../community/) 提问
3. 提交 [GitHub Issue](https://github.com/nexus-spec/cli/issues)

---

*最后更新: 2026-04-20*
