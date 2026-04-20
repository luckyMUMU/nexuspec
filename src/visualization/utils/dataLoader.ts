import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  children?: TreeNode[];
  path?: string;
}

interface CSP {
  id: string;
  title: string;
  status: string;
  initiator: {
    service: string;
    agent: string;
    created_at: string;
  };
  targets: Array<{
    service: string;
    required_action: string;
    contract: {
      type: string;
      name: string;
      current_version: string;
      proposed_version: string;
      change: string;
      detail: string;
    };
    urgency: string;
    review_status: string;
  }>;
}

interface Dependency {
  source: string;
  target: string;
  type: string;
  version: string;
}

interface NamespaceData {
  tree: TreeNode[];
  csp: CSP[];
  dependencies: Dependency[];
}

async function loadNamespaceData(): Promise<NamespaceData> {
  try {
    // 读取配置文件
    const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
    if (!await fs.exists(configPath)) {
      throw new Error('.nxsp/config.yaml not found. Please run nxsp init first.');
    }

    const config = yaml.load(await fs.readFile(configPath, 'utf8')) as any;
    const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

    // 确保 Namespace 仓库存在
    if (!await fs.exists(namespacePath)) {
      throw new Error('Namespace repository not found. Please clone it first.');
    }

    // 加载树状结构
    const tree = await buildTree(namespacePath);

    // 加载 CSP 数据
    const csp = await loadCSPData(namespacePath);

    // 加载依赖数据
    const dependencies = await loadDependencyData(namespacePath);

    return { tree, csp, dependencies };
  } catch (error) {
    console.error('Error loading namespace data:', error);
    // 返回模拟数据
    return getMockData();
  }
}

async function buildTree(rootPath: string): Promise<TreeNode[]> {
  const tree: TreeNode[] = [];

  // 检查 spec 目录
  const specPath = path.join(rootPath, 'spec');
  if (await fs.exists(specPath)) {
    tree.push(await buildTreeNode(specPath, 'spec'));
  }

  // 检查 contracts 目录
  const contractsPath = path.join(rootPath, 'contracts');
  if (await fs.exists(contractsPath)) {
    tree.push(await buildTreeNode(contractsPath, 'contracts'));
  }

  // 检查 proposals 目录
  const proposalsPath = path.join(rootPath, 'proposals');
  if (await fs.exists(proposalsPath)) {
    tree.push(await buildTreeNode(proposalsPath, 'proposals'));
  }

  return tree;
}

async function buildTreeNode(currentPath: string, nodeName: string): Promise<TreeNode> {
  const stats = await fs.stat(currentPath);
  
  if (stats.isFile()) {
    return {
      name: nodeName,
      type: 'file',
      path: currentPath
    };
  } else {
    const node: TreeNode = {
      name: nodeName,
      type: 'directory',
      children: []
    };

    const files = await fs.readdir(currentPath);
    for (const file of files) {
      const filePath = path.join(currentPath, file);
      node.children?.push(await buildTreeNode(filePath, file));
    }

    return node;
  }
}

async function loadCSPData(namespacePath: string): Promise<CSP[]> {
  const cspPath = path.join(namespacePath, 'proposals', 'active');
  const csps: CSP[] = [];

  if (await fs.exists(cspPath)) {
    const proposals = await fs.readdir(cspPath);
    for (const proposal of proposals) {
      const proposalPath = path.join(cspPath, proposal);
      const proposalYamlPath = path.join(proposalPath, 'proposal.yaml');
      
      if (await fs.exists(proposalYamlPath)) {
        try {
          const cspData = yaml.load(await fs.readFile(proposalYamlPath, 'utf8')) as CSP;
          csps.push(cspData);
        } catch (error) {
          console.error(`Error loading CSP data from ${proposalYamlPath}:`, error);
        }
      }
    }
  }

  return csps.length > 0 ? csps : getMockCSPData();
}

async function loadDependencyData(namespacePath: string): Promise<Dependency[]> {
  // 从 graph 目录加载依赖数据
  const graphPath = path.join(namespacePath, 'graph', 'snapshot.json');
  const dependencies: Dependency[] = [];

  if (await fs.exists(graphPath)) {
    try {
      const graphData = JSON.parse(await fs.readFile(graphPath, 'utf8'));
      // 假设 graphData 包含依赖关系
      if (graphData.dependencies) {
        return graphData.dependencies;
      }
    } catch (error) {
      console.error(`Error loading dependency data from ${graphPath}:`, error);
    }
  }

  return dependencies.length > 0 ? dependencies : getMockDependencyData();
}

function getMockData(): NamespaceData {
  return {
    tree: getMockTreeData(),
    csp: getMockCSPData(),
    dependencies: getMockDependencyData()
  };
}

function getMockTreeData(): TreeNode[] {
  return [
    {
      name: 'spec',
      type: 'directory',
      children: [
        {
          name: 'namespace.md',
          type: 'file'
        },
        {
          name: 'shared',
          type: 'directory',
          children: [
            {
              name: 'common-types.yaml',
              type: 'file'
            },
            {
              name: 'error-codes.yaml',
              type: 'file'
            }
          ]
        },
        {
          name: 'policies',
          type: 'directory',
          children: [
            {
              name: 'api-governance.md',
              type: 'file'
            }
          ]
        }
      ]
    },
    {
      name: 'contracts',
      type: 'directory',
      children: [
        {
          name: 'order-service',
          type: 'directory',
          children: [
            {
              name: 'api',
              type: 'directory',
              children: [
                {
                  name: 'v1.yaml',
                  type: 'file'
                }
              ]
            },
            {
              name: 'events',
              type: 'directory',
              children: [
                {
                  name: 'v1.yaml',
                  type: 'file'
                }
              ]
            }
          ]
        },
        {
          name: 'loyalty-service',
          type: 'directory',
          children: [
            {
              name: 'api',
              type: 'directory',
              children: [
                {
                  name: 'v1.yaml',
                  type: 'file'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'proposals',
      type: 'directory',
      children: [
        {
          name: 'active',
          type: 'directory',
          children: [
            {
              name: 'CSP-001-add-loyalty-points',
              type: 'directory',
              children: [
                {
                  name: 'proposal.yaml',
                  type: 'file'
                },
                {
                  name: 'proposal.md',
                  type: 'file'
                }
              ]
            }
          ]
        }
      ]
    }
  ];
}

function getMockCSPData(): CSP[] {
  return [
    {
      id: 'CSP-001',
      title: 'Add Loyalty Points to Order Flow',
      status: 'reviewing',
      initiator: {
        service: 'order-service',
        agent: 'claude-code',
        created_at: '2026-04-06T10:00:00Z'
      },
      targets: [
        {
          service: 'loyalty-service',
          required_action: 'new_contract_version',
          contract: {
            type: 'api',
            name: 'default',
            current_version: 'v1',
            proposed_version: 'v2',
            change: 'add_endpoint',
            detail: 'POST /api/v2/points/credit'
          },
          urgency: 'normal',
          review_status: 'pending'
        }
      ]
    },
    {
      id: 'CSP-002',
      title: 'Update Payment Gateway to v2',
      status: 'accepted',
      initiator: {
        service: 'payment-service',
        agent: 'claude-code',
        created_at: '2026-04-05T14:30:00Z'
      },
      targets: [
        {
          service: 'external',
          required_action: 'new_contract_version',
          contract: {
            type: 'api',
            name: 'payment-gateway',
            current_version: 'v1',
            proposed_version: 'v2',
            change: 'update_endpoint',
            detail: 'POST /v2/charge'
          },
          urgency: 'high',
          review_status: 'accepted'
        }
      ]
    }
  ];
}

function getMockDependencyData(): Dependency[] {
  return [
    {
      source: 'order-service',
      target: 'loyalty-service',
      type: 'api',
      version: 'v1'
    },
    {
      source: 'order-service',
      target: 'payment-service',
      type: 'api',
      version: 'v1'
    },
    {
      source: 'order-service',
      target: 'notification-service',
      type: 'events',
      version: 'v1'
    },
    {
      source: 'payment-service',
      target: 'external/payment-gateway',
      type: 'api',
      version: 'v1'
    },
    {
      source: 'loyalty-service',
      target: 'notification-service',
      type: 'events',
      version: 'v1'
    }
  ];
}

export { loadNamespaceData };