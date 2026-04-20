"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGraphCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const simple_git_1 = __importDefault(require("simple-git"));
const syncGraphCommand = new commander_1.Command('sync-graph')
    .description('同步依赖图谱到 GitNexus')
    .action(async () => {
    try {
        // 读取配置文件
        const configPath = path_1.default.join(process.cwd(), '.nxsp', 'config.yaml');
        if (!await fs_extra_1.default.exists(configPath)) {
            console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
            process.exit(1);
        }
        const config = js_yaml_1.default.load(await fs_extra_1.default.readFile(configPath, 'utf8'));
        const serviceName = config.service.name;
        const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');
        const gitnexusUrl = config.gitnexus?.url;
        const gitnexusApiKey = config.gitnexus?.api_key;
        // 确保 GitNexus 配置存在
        if (!gitnexusUrl || !gitnexusApiKey) {
            console.log('Error: GitNexus configuration not found. Please run nxsp init with --gitnexus-url and --gitnexus-api-key.');
            process.exit(1);
        }
        // 确保 Namespace 仓库存在
        if (!await fs_extra_1.default.exists(namespacePath)) {
            console.log('Error: Namespace repository not found. Please clone it first.');
            process.exit(1);
        }
        // 构建依赖图谱
        console.log('Building dependency graph...');
        const graphData = await buildGraphData(config, namespacePath);
        // 保存图谱到本地
        const graphDir = path_1.default.join(namespacePath, 'graph');
        if (!await fs_extra_1.default.exists(graphDir)) {
            await fs_extra_1.default.mkdir(graphDir);
        }
        await fs_extra_1.default.writeFile(path_1.default.join(graphDir, 'snapshot.json'), JSON.stringify(graphData, null, 2));
        // 提交到 Git
        const git = (0, simple_git_1.default)(namespacePath);
        await git.add(['graph/']);
        await git.commit(`Update dependency graph`);
        await git.push();
        // 同步到 GitNexus
        console.log('Syncing graph to GitNexus...');
        await syncToGitNexus(graphData, gitnexusUrl, gitnexusApiKey);
        console.log('✅ Graph sync completed successfully');
    }
    catch (error) {
        console.error('Error syncing graph:', error);
        process.exit(1);
    }
});
exports.syncGraphCommand = syncGraphCommand;
async function buildGraphData(config, namespacePath) {
    const nodes = [];
    const edges = [];
    // 添加当前服务节点
    nodes.push({
        id: config.service.name,
        type: 'service',
        name: config.service.name
    });
    // 添加暴露的契约
    if (config.exposes) {
        for (const expose of config.exposes) {
            const contractId = `${config.service.name}/${expose.type}:${expose.name}`;
            nodes.push({
                id: contractId,
                type: 'contract',
                name: contractId
            });
            edges.push({
                source: config.service.name,
                target: contractId,
                type: 'exposes',
                contract: expose.name
            });
        }
    }
    // 添加依赖的契约
    if (config.depends) {
        for (const [name, ref] of Object.entries(config.depends)) {
            // 解析 contract:// 引用
            const match = ref.match(/contract:\/\/(.*?):(v\d+)/);
            if (match) {
                const [, contractPath, version] = match;
                const contractId = `${contractPath}:${version}`;
                // 确定节点类型
                let nodeType = 'contract';
                if (contractPath.startsWith('external/')) {
                    nodeType = 'external';
                }
                // 添加契约节点
                if (!nodes.some(node => node.id === contractId)) {
                    nodes.push({
                        id: contractId,
                        type: nodeType,
                        name: contractPath,
                        version
                    });
                }
                // 添加依赖边
                edges.push({
                    source: config.service.name,
                    target: contractId,
                    type: 'depends_on',
                    contract: name
                });
            }
        }
    }
    // 遍历其他服务的依赖
    const contractsDir = path_1.default.join(namespacePath, 'contracts');
    if (await fs_extra_1.default.exists(contractsDir)) {
        const serviceDirs = await fs_extra_1.default.readdir(contractsDir);
        for (const serviceDir of serviceDirs) {
            if (serviceDir === 'external')
                continue;
            const serviceConfigPath = path_1.default.join(contractsDir, serviceDir, 'config.yaml');
            if (await fs_extra_1.default.exists(serviceConfigPath)) {
                const serviceConfig = js_yaml_1.default.load(await fs_extra_1.default.readFile(serviceConfigPath, 'utf8'));
                if (serviceConfig.depends) {
                    // 添加服务节点
                    if (!nodes.some(node => node.id === serviceDir)) {
                        nodes.push({
                            id: serviceDir,
                            type: 'service',
                            name: serviceDir
                        });
                    }
                    // 添加依赖
                    for (const [name, ref] of Object.entries(serviceConfig.depends)) {
                        const match = ref.match(/contract:\/\/(.*?):(v\d+)/);
                        if (match) {
                            const [, contractPath, version] = match;
                            const contractId = `${contractPath}:${version}`;
                            let nodeType = 'contract';
                            if (contractPath.startsWith('external/')) {
                                nodeType = 'external';
                            }
                            if (!nodes.some(node => node.id === contractId)) {
                                nodes.push({
                                    id: contractId,
                                    type: nodeType,
                                    name: contractPath,
                                    version
                                });
                            }
                            if (!edges.some(edge => edge.source === serviceDir &&
                                edge.target === contractId)) {
                                edges.push({
                                    source: serviceDir,
                                    target: contractId,
                                    type: 'depends_on',
                                    contract: name
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    return { nodes, edges };
}
async function syncToGitNexus(graphData, url, apiKey) {
    try {
        const response = await fetch(`${url}/api/graph/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(graphData)
        });
        if (!response.ok) {
            throw new Error(`GitNexus sync failed: ${await response.text()}`);
        }
        console.log('Graph synced to GitNexus successfully');
    }
    catch (error) {
        console.warn('Warning: Failed to sync to GitNexus, but local sync completed:', error);
    }
}
