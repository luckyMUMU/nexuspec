# 跨服务提案工作流示例

这个示例展示了完整的跨服务提案（CSP）流程，从创建提案到归档提案的全过程。

## 场景说明

在这个示例中：
- **订单服务** (order-service) 需要积分服务添加新的 API 端点
- **积分服务** (loyalty-service) 是目标服务，需要接受并实现提案
- 我们将模拟完整的提案流程

## 前置条件

假设你已经按照[基础示例](../basic/)设置好了环境，包括：
- 命名空间仓库
- 订单服务
- 我们需要创建积分服务

## 步骤 1: 创建积分服务

```bash
# 创建积分服务
mkdir -p loyalty-service
cd loyalty-service
git init

# 初始化 NexusSpec
nxsp init \
  --namespace ../namespace \
  --service loyalty-service \
  --team example-team

# 创建 API 契约 (v1)
mkdir -p src/api
cat > src/api/openapi.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Loyalty Service API
  version: 1.0.0
paths:
  /points/{userId}:
    get:
      summary: 获取用户积分余额
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 积分余额
EOF

# 更新配置
cat > .nxsp/config.yaml << 'EOF'
service:
  name: loyalty-service
  team: example-team
namespace:
  remote: ../namespace
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
depends: {}
sharedTypes: []
EOF

# 同步契约
nxsp sync-contracts

git add .
git commit -m "Initial loyalty service setup"
cd ..
```

## 步骤 2: 订单服务创建提案

现在，假设订单服务需要积分服务添加一个新的端点来为订单增加积分。

```bash
cd order-service

# 创建提案
nxsp propose \
  --title "Add points credit endpoint for orders" \
  --target loyalty-service \
  --contract-type api \
  --contract-name default \
  --current-version v1 \
  --proposed-version v2 \
  --change-type add-endpoint \
  --detail "Add POST /api/v2/points/credit endpoint to support crediting points when an order is completed" \
  --backward-compatible
```

这会创建一个跨服务提案。

## 步骤 3: 积分服务审查提案

```bash
cd ../loyalty-service

# 查看待审查的提案
nxsp review

# 运行 AI 自动审查
nxsp review --auto
```

AI 会分析提案的兼容性、风险等。

## 步骤 4: 积分服务接受提案

假设提案没问题，积分服务接受提案：

```bash
# 接受提案 (替换为实际的提案 ID)
nxsp accept CSP-XXXXXX
```

这会：
- 拉取提案
- 激活新版本 (v2)
- 将 v1 标记为 deprecated
- 同步到命名空间

## 步骤 5: 积分服务实现 v2 契约

让我们更新积分服务的 API 契约为 v2：

```bash
# 创建 v2 版本的 API 契约
cat > src/api/openapi.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Loyalty Service API
  version: 2.0.0
paths:
  /points/{userId}:
    get:
      summary: 获取用户积分余额
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 积分余额
  /points/credit:
    post:
      summary: 为用户增加积分
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                userId:
                  type: string
                points:
                  type: integer
                orderId:
                  type: string
                reason:
                  type: string
      responses:
        '201':
          description: 积分增加成功
EOF

# 同步契约 (这会创建 v2 版本)
nxsp sync-contracts

# 提升 v2 为 active
nxsp contract promote loyalty-service api default v2 \
  --description "Add points credit endpoint for order integration" \
  --backward-compatible
```

## 步骤 6: 订单服务更新依赖

现在订单服务可以更新它的依赖到 v2：

```bash
cd ../order-service

# 更新配置
cat > .nxsp/config.yaml << 'EOF'
service:
  name: order-service
  team: example-team
namespace:
  remote: ../namespace
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
depends:
  loyaltyApi: contract://loyalty-service/api/default:v2
sharedTypes: []
EOF

# 同步
nxsp sync-contracts
```

## 步骤 7: 归档提案

当所有工作完成后，归档提案：

```bash
# 在订单服务或积分服务中都可以
nxsp archive CSP-XXXXXX
```

## 提案生命周期回顾

1. **Draft** → 创建提案
2. **Submitted** → 推送到命名空间
3. **Reviewing** → 目标方审查
4. **Accepted** → 接受提案
5. **Implementing** → 实现变更
6. **Completed** → 完成
7. **Closed** → 归档

## 查看提案历史

```bash
# 查看契约的迁移历史
nxsp contract history loyalty-service api default
```

## 影响分析

```bash
# 分析变更的影响
nxsp impact --service loyalty-service --breaking false
```

## 小结

这个示例展示了：
- 如何创建跨服务提案
- 如何审查提案
- 如何接受和实施提案
- 如何升级契约版本
- 如何更新依赖
- 如何归档提案

---

## 下一步

继续学习[CI/CD 集成示例](../cicd-integration/)！

---

*最后更新: 2026-04-20*
