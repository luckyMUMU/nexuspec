"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncContractsCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const simple_git_1 = __importDefault(require("simple-git"));
const syncContractsCommand = new commander_1.Command('sync-contracts')
    .description('同步契约到 Namespace 仓库')
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
        // 确保 Namespace 仓库存在
        if (!await fs_extra_1.default.exists(namespacePath)) {
            console.log('Error: Namespace repository not found. Please clone it first.');
            process.exit(1);
        }
        // 同步暴露的契约
        if (config.exposes && config.exposes.length > 0) {
            for (const expose of config.exposes) {
                const localPath = path_1.default.join(process.cwd(), expose.path);
                const contractPath = path_1.default.join(namespacePath, 'contracts', serviceName, expose.type, 'v1.yaml' // 暂时使用 v1 版本
                );
                // 确保契约目录存在
                await fs_extra_1.default.ensureDir(path_1.default.dirname(contractPath));
                // 复制契约文件
                if (await fs_extra_1.default.exists(localPath)) {
                    if (await fs_extra_1.default.stat(localPath).then(stats => stats.isDirectory())) {
                        // 如果是目录，复制所有文件
                        await fs_extra_1.default.copy(localPath, path_1.default.dirname(contractPath), { overwrite: true });
                    }
                    else {
                        // 如果是文件，直接复制
                        await fs_extra_1.default.copy(localPath, contractPath, { overwrite: true });
                    }
                    console.log(`Synced ${expose.type} contract from ${expose.path}`);
                }
                else {
                    console.log(`Warning: Local contract path ${expose.path} does not exist`);
                }
            }
            // 提交到 Git
            const git = (0, simple_git_1.default)(namespacePath);
            await git.add(['contracts/']);
            await git.commit(`Sync contracts for ${serviceName}`);
            await git.push();
            console.log('✅ Contracts synced successfully to Namespace repository');
        }
        else {
            console.log('No contracts to sync. Please configure exposes in .nxsp/config.yaml');
        }
    }
    catch (error) {
        console.error('Error syncing contracts:', error);
        process.exit(1);
    }
});
exports.syncContractsCommand = syncContractsCommand;
