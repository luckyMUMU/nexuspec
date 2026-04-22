import { TreeNode, ServiceNode, ServiceEdge, CSPFlowNode, CSPFlowEdge } from './types';

export const specTreeData: TreeNode = {
  id: 'ns-1',
  name: 'payments-namespace',
  type: 'namespace',
  metadata: {
    description: '支付系统命名空间',
  },
  children: [
    {
      id: 'spec-1',
      name: 'spec',
      type: 'shared',
      children: [
        {
          id: 'nsmd-1',
          name: 'namespace.md',
          type: 'policy',
          metadata: {
            description: '命名空间描述文档',
          },
        },
        {
          id: 'shared-1',
          name: 'shared',
          type: 'shared',
          children: [
            {
              id: 'types-1',
              name: 'common-types.yaml',
              type: 'shared',
              metadata: {
                description: '公共数据类型定义',
              },
            },
            {
              id: 'errors-1',
              name: 'error-codes.yaml',
              type: 'shared',
              metadata: {
                description: '统一错误码定义',
              },
            },
          ],
        },
        {
          id: 'policies-1',
          name: 'policies',
          type: 'policy',
          children: [
            {
              id: 'api-gov-1',
              name: 'api-governance.md',
              type: 'policy',
              metadata: {
                description: 'API 治理规范',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'contracts-1',
      name: 'contracts',
      type: 'contract',
      children: [
        {
          id: 'svc-os',
          name: 'order-service',
          type: 'service',
          children: [
            {
              id: 'os-api-v1',
              name: 'api-v1.yaml',
              type: 'contract',
              metadata: {
                version: 'v1',
                status: 'active',
                contractType: 'api',
              },
            },
            {
              id: 'os-events-v1',
              name: 'events-v1.yaml',
              type: 'contract',
              metadata: {
                version: 'v1',
                status: 'active',
                contractType: 'events',
              },
            },
          ],
        },
        {
          id: 'svc-ls',
          name: 'loyalty-service',
          type: 'service',
          children: [
            {
              id: 'ls-api-v1',
              name: 'api-v1.yaml',
              type: 'contract',
              metadata: {
                version: 'v1',
                status: 'active',
                contractType: 'api',
              },
            },
          ],
        },
        {
          id: 'svc-ns',
          name: 'notification-service',
          type: 'service',
          children: [
            {
              id: 'ns-events-v1',
              name: 'events-v1.yaml',
              type: 'contract',
              metadata: {
                version: 'v1',
                status: 'active',
                contractType: 'events',
              },
            },
          ],
        },
        {
          id: 'external-1',
          name: 'external',
          type: 'external',
          children: [
            {
              id: 'ext-pg',
              name: 'payment-gateway',
              type: 'external',
              children: [
                {
                  id: 'pg-api-v1',
                  name: 'api-v1.yaml',
                  type: 'contract',
                  metadata: {
                    version: 'v1',
                    status: 'active',
                    contractType: 'api',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const serviceNodes: ServiceNode[] = [
  {
    id: 'svc-os',
    name: 'order-service',
    type: 'service',
    metadata: {
      team: 'payments-team',
      description: '订单管理服务',
    },
  },
  {
    id: 'svc-ls',
    name: 'loyalty-service',
    type: 'service',
    metadata: {
      team: 'loyalty-team',
      description: '会员积分服务',
    },
  },
  {
    id: 'svc-ns',
    name: 'notification-service',
    type: 'service',
    metadata: {
      team: 'communication-team',
      description: '消息通知服务',
    },
  },
  {
    id: 'svc-ps',
    name: 'payment-service',
    type: 'service',
    metadata: {
      team: 'payments-team',
      description: '支付处理服务',
    },
  },
  {
    id: 'ext-pg',
    name: 'payment-gateway',
    type: 'external',
    metadata: {
      description: '第三方支付网关',
    },
  },
];

export const serviceEdges: ServiceEdge[] = [
  {
    id: 'edge-os-ls',
    source: 'svc-os',
    target: 'svc-ls',
    type: 'depends_on',
    metadata: {
      contractRef: 'contract://loyalty-service/api/default:v1',
    },
  },
  {
    id: 'edge-os-ns',
    source: 'svc-os',
    target: 'svc-ns',
    type: 'depends_on',
    metadata: {
      contractRef: 'contract://notification-service/events/default:v1',
    },
  },
  {
    id: 'edge-os-ps',
    source: 'svc-os',
    target: 'svc-ps',
    type: 'depends_on',
  },
  {
    id: 'edge-ps-pg',
    source: 'svc-ps',
    target: 'ext-pg',
    type: 'depends_on',
    metadata: {
      contractRef: 'contract://external/payment-gateway/api/default:v1',
    },
  },
  {
    id: 'edge-ls-ns',
    source: 'svc-ls',
    target: 'svc-ns',
    type: 'depends_on',
  },
  {
    id: 'edge-ps-ns',
    source: 'svc-ps',
    target: 'svc-ns',
    type: 'depends_on',
  },
];

export const cspFlowNodes: CSPFlowNode[] = [
  {
    id: 'csp-1',
    name: 'CSP-001',
    status: 'submitted',
    metadata: {
      description: '为订单服务添加积分功能',
      initiator: 'order-service',
      targetService: 'loyalty-service',
      contractType: 'api',
      createdAt: '2026-04-20T10:30:00Z',
    },
  },
  {
    id: 'csp-2',
    name: 'CSP-002',
    status: 'accepted',
    metadata: {
      description: '更新支付网关 API 到 v2',
      initiator: 'payment-service',
      targetService: 'external',
      contractType: 'api',
      createdAt: '2026-04-18T14:20:00Z',
    },
  },
  {
    id: 'csp-3',
    name: 'CSP-003',
    status: 'implementing',
    metadata: {
      description: '添加新的通知事件类型',
      initiator: 'order-service',
      targetService: 'notification-service',
      contractType: 'events',
      createdAt: '2026-04-15T09:15:00Z',
    },
  },
];

export const cspFlowEdges: CSPFlowEdge[] = [
  {
    id: 'edge-csp1-step1',
    source: 'csp-1',
    target: 'step-review',
    type: 'transition',
    metadata: {
      action: 'review',
    },
  },
  {
    id: 'edge-csp2-step2',
    source: 'csp-2',
    target: 'step-implement',
    type: 'transition',
    metadata: {
      action: 'implement',
    },
  },
];
