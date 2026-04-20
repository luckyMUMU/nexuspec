# 基础示例

这个示例展示了 NexusSpec 的基本用法，包括初始化服务、创建契约等。

## 目录结构

```
basic/
├── namespace/          # 命名空间仓库
├── order-service/      # 订单服务
├── payment-service/    # 支付服务
└── setup.sh            # 快速设置脚本
```

## 快速开始

### 方法 1: 使用设置脚本

```bash
# 运行设置脚本
chmod +x setup.sh
./setup.sh
```

### 方法 2: 手动设置

#### 步骤 1: 创建命名空间

```bash
# 创建命名空间仓库
mkdir -p namespace
cd namespace
git init

# 创建基本结构
mkdir -p spec/shared contracts proposals/active proposals/archive graph

# 创建 namespace.md
cat > spec/namespace.md << 'EOF'
# Example Namespace

这是一个示例命名空间，包含订单和支付服务。
EOF

git add .
git commit -m "Initial namespace setup"
cd ..
```

#### 步骤 2: 创建订单服务

```bash
# 创建订单服务
mkdir -p order-service
cd order-service
git init

# 初始化 NexusSpec
nxsp init \
  --namespace ../namespace \
  --service order-service \
  --team example-team

# 创建 API 契约
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                userId:
                  type: string
                amount:
                  type: number
                productId:
                  type: string
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
depends: {}
sharedTypes: []
EOF

# 同步契约
nxsp sync-contracts

git add .
git commit -m "Initial order service setup"
cd ..
```

#### 步骤 3: 创建支付服务

```bash
# 创建支付服务
mkdir -p payment-service
cd payment-service
git init

# 初始化 NexusSpec
nxsp init \
  --namespace ../namespace \
  --service payment-service \
  --team example-team

# 创建 API 契约
mkdir -p src/api
cat > src/api/openapi.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Payment Service API
  version: 1.0.0
paths:
  /payments:
    post:
      summary: 创建支付
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                orderId:
                  type: string
                amount:
                  type: number
                paymentMethod:
                  type: string
      responses:
        '201':
          description: 支付创建成功
  /payments/{id}:
    get:
      summary: 获取支付详情
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 支付详情
EOF

# 更新配置 - 让支付服务依赖订单服务
cat > .nxsp/config.yaml << 'EOF'
service:
  name: payment-service
  team: example-team
namespace:
  remote: ../namespace
exposes:
  - type: api
    path: src/api/openapi.yaml
    name: default
depends:
  orderApi: contract://order-service/api/default:v1
sharedTypes: []
EOF

# 同步契约
nxsp sync-contracts

git add .
git commit -m "Initial payment service setup"
cd ..
```

## 查看契约

```bash
# 查看所有契约
cd order-service
nxsp contract list

# 查看特定契约的版本
nxsp contract versions order-service api default
```

## 查看依赖关系

```bash
# 查看依赖关系图
nxsp dependencies
```

## 小结

这个基础示例展示了：
- 如何创建命名空间仓库
- 如何初始化多个服务
- 如何创建和暴露契约
- 如何引用其他服务的契约
- 如何同步契约到命名空间

---

## 下一步

继续学习[契约管理示例](../contract-management/)！

---

*最后更新: 2026-04-20*
