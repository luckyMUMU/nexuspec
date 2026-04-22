# 契约管理指南

本指南将详细介绍如何使用 NexusSpec 管理契约的生命周期。

## 目录

1. [契约概述](#契约概述)
2. [创建和暴露契约](#创建和暴露契约)
3. [契约版本管理](#契约版本管理)
4. [引用契约](#引用契约)
5. [契约兼容性检查](#契约兼容性检查)

---

## 契约概述

契约是服务对外公开的接口定义，确保服务之间的可靠通信。NexusSpec 支持两种类型的契约：

### API 契约
使用 OpenAPI 3.0 规范定义 REST API 接口。

### 事件契约
定义服务发布的事件模式。

---

## 创建和暴露契约

### 1. 创建 API 契约

```yaml
# src/api/openapi.yaml
openapi: 3.0.0
info:
  title: User Service API
  version: 1.0.0
paths:
  /users:
    get:
      summary: 获取用户列表
      responses:
        '200':
          description: 用户列表
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
  /users/{id}:
    get:
      summary: 获取用户详情
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 用户详情
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
```

### 2. 创建事件契约

```yaml
# src/events/schemas.yaml
events:
  user.created:
    summary: 用户创建事件
    payload:
      type: object
      properties:
        userId:
          type: string
        timestamp:
          type: string
          format: date-time
  user.updated:
    summary: 用户更新事件
    payload:
      type: object
      properties:
        userId:
          type: string
        updatedFields:
          type: array
          items:
            type: string
        timestamp:
          type: string
          format: date-time
```

### 3. 在配置中暴露契约

编辑 `.nxsp/config.yaml`：

```yaml
service:
  name: user-service
  team: user-team
namespace:
  remote: git@github.com:your-org/your-namespace.git
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
  - type: events
    path: src/events/schemas.yaml
    name: default
depends: {}
sharedTypes: []
```

### 4. 同步契约

```bash
nxsp sync-contracts
```

---

## 契约版本管理

### 查看契约列表

```bash
nxsp contract list
```

### 查看特定契约的版本

```bash
nxsp contract versions user-service api default
```

### 添加新版本

```bash
nxsp contract add-version user-service api default v2 \
  --status draft \
  --description "Add new endpoints" \
  --backward-compatible
```

### 提升版本为活跃状态

```bash
nxsp contract promote user-service api default v2 \
  --description "Release v2" \
  --backward-compatible
```

这将自动：
1. 将 v2 设置为 `active`
2. 将 v1 设置为 `deprecated`（如果存在）

### 废弃版本

```bash
nxsp contract deprecate user-service api default v1 \
  --migration-guide "Please migrate to v2"
```

### 下线版本

```bash
nxsp contract retire user-service api default v1
```

### 查看迁移历史

```bash
nxsp contract history user-service api default
```

### 查找使用旧版本的服务

```bash
nxsp contract outdated user-service api default
```

---

## 引用契约

### 在配置中引用契约

```yaml
service:
  name: order-service
  team: order-team
namespace:
  remote: git@github.com:your-org/your-namespace.git
exposes: []
depends:
  userApi: contract://user-service/api/default:v1
  notificationEvents: contract://notification-service/events/default:v1
sharedTypes: []
```

### 契约引用格式

```
contract://{service}/{type}/{name}:{version}
```

- `service`: 服务名称
- `type`: 契约类型 (`api` 或 `events`)
- `name`: 契约名称
- `version`: 版本号

---

## 契约兼容性检查

### 验证两个契约版本的兼容性

```bash
nxsp cicd validate \
  --old contracts/user-service/api/v1.yaml \
  --new contracts/user-service/api/v2.yaml
```

### 自动兼容性检查

当你使用 `nxsp contract promote` 时，系统会自动检查兼容性：

- **向后兼容**: 可以自动提升
- **破坏性变更**: 需要人工审批

### 兼容性规则

#### 向后兼容的变更

- 添加新的 API 端点
- 添加新的可选字段
- 添加新的事件类型
- 放宽验证规则

#### 破坏性变更

- 删除或重命名 API 端点
- 删除或重命名字段
- 修改字段类型
- 添加必填字段
- 收紧验证规则

---

## 最佳实践

1. **语义化版本**: 虽然我们使用简单的 `v1`, `v2` 格式，但遵循语义化版本的理念
2. **渐进式迁移**: 先废弃旧版本，等待所有消费者迁移后再下线
3. **文档化变更**: 每个版本变更都应该有清晰的描述
4. **自动化检查**: 在 CI/CD 流程中集成兼容性检查

---

## 下一步

- 查看 [跨服务提案指南](proposals.md) 了解如何发起契约变更
- 阅读 [CLI 参考](../cli-reference/commands.md) 了解所有契约相关命令

---

*最后更新: 2026-04-20*
