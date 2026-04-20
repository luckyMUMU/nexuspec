"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadNamespaceData = loadNamespaceData;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
async function loadNamespaceData() {
    try {
        // 读取配置文件
        const configPath = path_1.default.join(process.cwd(), '.nxsp', 'config.yaml');
        if (!await fs_extra_1.default.exists(configPath)) {
            throw new Error('.nxsp/config.yaml not found. Please run nxsp init first.');
        }
        const config = js_yaml_1.default.load(await fs_extra_1.default.readFile(configPath, 'utf8'));
        const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');
        // 确保 Namespace 仓库存在
        if (!await fs_extra_1.default.exists(namespacePath)) {
            throw new Error('Namespace repository not found. Please clone it first.');
        }
        // 加载树状结构
        const tree = await buildTree(namespacePath);
        // 加载 CSP 数据
        const csp = await loadCSPData(namespacePath);
        // 加载依赖数据
        const dependencies = await loadDependencyData(namespacePath);
        return { tree, csp, dependencies };
    }
    catch (error) {
        console.error('Error loading namespace data:', error);
        // 返回模拟数据
        return getMockData();
    }
}
async function buildTree(rootPath) {
    const tree = [];
    // 检查 spec 目录
    const specPath = path_1.default.join(rootPath, 'spec');
    if (await fs_extra_1.default.exists(specPath)) {
        tree.push(await buildTreeNode(specPath, 'spec'));
    }
    // 检查 contracts 目录
    const contractsPath = path_1.default.join(rootPath, 'contracts');
    if (await fs_extra_1.default.exists(contractsPath)) {
        tree.push(await buildTreeNode(contractsPath, 'contracts'));
    }
    // 检查 proposals 目录
    const proposalsPath = path_1.default.join(rootPath, 'proposals');
    if (await fs_extra_1.default.exists(proposalsPath)) {
        tree.push(await buildTreeNode(proposalsPath, 'proposals'));
    }
    return tree;
}
async function buildTreeNode(currentPath, nodeName) {
    const stats = await fs_extra_1.default.stat(currentPath);
    if (stats.isFile()) {
        return {
            name: nodeName,
            type: 'file',
            path: currentPath
        };
    }
    else {
        const node = {
            name: nodeName,
            type: 'directory',
            children: []
        };
        const files = await fs_extra_1.default.readdir(currentPath);
        for (const file of files) {
            const filePath = path_1.default.join(currentPath, file);
            node.children?.push(await buildTreeNode(filePath, file));
        }
        return node;
    }
}
async function loadCSPData(namespacePath) {
    const cspPath = path_1.default.join(namespacePath, 'proposals', 'active');
    const csps = [];
    if (await fs_extra_1.default.exists(cspPath)) {
        const proposals = await fs_extra_1.default.readdir(cspPath);
        for (const proposal of proposals) {
            const proposalPath = path_1.default.join(cspPath, proposal);
            const proposalYamlPath = path_1.default.join(proposalPath, 'proposal.yaml');
            if (await fs_extra_1.default.exists(proposalYamlPath)) {
                try {
                    const cspData = js_yaml_1.default.load(await fs_extra_1.default.readFile(proposalYamlPath, 'utf8'));
                    csps.push(cspData);
                }
                catch (error) {
                    console.error(`Error loading CSP data from ${proposalYamlPath}:`, error);
                }
            }
        }
    }
    return csps.length > 0 ? csps : getMockCSPData();
}
async function loadDependencyData(namespacePath) {
    // 从 graph 目录加载依赖数据
    const graphPath = path_1.default.join(namespacePath, 'graph', 'snapshot.json');
    const dependencies = [];
    if (await fs_extra_1.default.exists(graphPath)) {
        try {
            const graphData = JSON.parse(await fs_extra_1.default.readFile(graphPath, 'utf8'));
            // 假设 graphData 包含依赖关系
            if (graphData.dependencies) {
                return graphData.dependencies;
            }
        }
        catch (error) {
            console.error(`Error loading dependency data from ${graphPath}:`, error);
        }
    }
    return dependencies.length > 0 ? dependencies : getMockDependencyData();
}
function getMockData() {
    return {
        tree: getMockTreeData(),
        csp: getMockCSPData(),
        dependencies: getMockDependencyData()
    };
}
function getMockTreeData() {
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
function getMockCSPData() {
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
function getMockDependencyData() {
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
