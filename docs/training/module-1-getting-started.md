# 模块 1: 入门基础

欢迎来到 NexusSpec 培训的第一个模块！在这个模块中，我们将学习 NexusSpec 的基础知识。

## 学习目标

完成本模块后，你将能够：
- 理解 NexusSpec 的核心价值
- 安装和配置 NexusSpec
- 理解命名空间、服务和契约等核心概念
- 创建你的第一个 NexusSpec 项目

---

## 1. 什么是 NexusSpec？

NexusSpec 是一个分布式规范系统，构建在 OpenSpec 之上，专门解决微服务架构中的跨服务协调问题。

### 核心特性

- **深度 OpenSpec 集成**：充分利用 OpenSpec 1.3 的新功能
- **树状规范模型**：清晰的层次结构
- **跨服务提案系统**：结构化的变更协调流程
- **版本化契约管理**：安全的契约演进机制
- **高性能**：比传统方法快 20% 以上

### 解决的问题

在微服务架构中，当服务 A 需要服务 B 修改其 API 时，通常面临：
- 沟通成本高，容易遗漏
- 没有统一的变更追踪
- 兼容性问题难以发现
- 回滚困难

NexusSpec 通过结构化的提案流程解决这些问题。

---

## 2. 安装 NexusSpec

### 系统要求

- Node.js 20.19.0 或更高版本
- Git
- npm 或 yarn

### 安装步骤

```bash
# 全局安装 NexusSpec CLI
npm install -g @nexus-spec/cli

# 验证安装
nxsp --version
```

如果看到版本号，说明安装成功！

### 安装 OpenSpec

NexusSpec 需要 OpenSpec 才能工作：

```bash
npm install -g @fission-ai/openspec
```

---

## 3. 核心概念

让我们理解 NexusSpec 的几个核心概念：

### 3.1 命名空间 (Namespace)

命名空间是一个中央 Git 仓库，用于：
- 存储共享数据模型
- 管理所有服务的契约
- 跟踪跨服务提案
- 维护依赖关系图谱

### 3.2 服务 (Service)

每个微服务都是一个独立的服务仓库，包含：
- 内部 OpenSpec 规范
- NexusSpec 配置
- 暴露的契约

### 3.3 契约 (Contract)

契约是服务对外公开的接口定义，有两种类型：
- **API 契约**：OpenAPI 规范
- **事件契约**：事件模式定义

契约有四个生命周期状态：
- `draft`：草稿
- `active`：活跃（当前版本）
- `deprecated`：已废弃（仍可使用）
- `retired`：已下线（不可使用）

### 3.4 跨服务提案 (CSP)

当一个服务需要另一个服务修改契约时，通过提案流程进行。

---

## 4. 实战：创建第一个项目

让我们动手创建一个简单的 NexusSpec 项目！

### 步骤 1: 创建命名空间仓库

```bash
# 创建命名空间仓库
mkdir payments-namespace
cd payments-namespace
git init

# 创建基本目录结构
mkdir -p spec/shared contracts proposals/active proposals/archive graph

# 创建 namespace.md
cat > spec/namespace.md << 'EOF'
# Payments Namespace

这是支付服务系统的中央命名空间。
包含以下服务：
- order-service
- payment-service
- loyalty-service
EOF

# 提交
git add .
git commit -m "Initial namespace setup"
```

（对于本培训，我们将使用本地仓库，无需推送到远程）

### 步骤 2: 创建订单服务

```bash
# 在新目录中创建服务
cd ..
mkdir order-service
cd order-service
git init

# 初始化 NexusSpec
nxsp init \
  --namespace ../payments-namespace \
  --service order-service \
  --team payments-team

# 查看创建的配置
cat .nxsp/config.yaml
```

你应该看到类似这样的配置：

```yaml
service:
  name: order-service
  team: payments-team
namespace:
  remote: ../payments-namespace
exposes: []
depends: {}
sharedTypes: []
```

### 步骤 3: 创建第一个契约

让我们创建一个简单的 API 契约：

```bash
# 创建 API 规范目录
mkdir -p src/api

# 创建 OpenAPI 规范
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

### 步骤 4: 暴露契约

编辑 `.nxsp/config.yaml`，添加契约暴露：

```yaml
service:
  name: order-service
  team: payments-team
namespace:
  remote: ../payments-namespace
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
depends: {}
sharedTypes: []
```

### 步骤 5: 同步契约

```bash
# 同步契约到命名空间
nxsp sync-contracts
```

这会将契约同步到命名空间仓库。让我们查看命名空间：

```bash
cd ../payments-namespace
ls -la contracts/order-service/api/
```

你应该看到 `v1.yaml` 文件（第一个版本自动为 v1）。

### 步骤 6: 查看规范树

```bash
cd ../order-service
nxsp tree
```

这会显示命名空间的规范树结构。

---

## 5. 小结

在这个模块中，我们学习了：
- NexusSpec 的核心价值和特性
- 如何安装 NexusSpec
- 核心概念：命名空间、服务、契约、提案
- 创建了第一个 NexusSpec 项目

---

## 6. 练习

尝试以下练习来巩固你的理解：

1. **练习 1**：创建另一个服务 `payment-service`，并初始化 NexusSpec
2. **练习 2**：为 `payment-service` 创建一个简单的 API 契约并暴露它
3. **练习 3**：同步契约到命名空间，然后使用 `nxsp contract list` 查看所有契约

---

## 7. 下一步

完成本模块后，继续学习[模块 2: 契约管理](./module-2-contract-management.md)！

---

*最后更新: 2026-04-20*
