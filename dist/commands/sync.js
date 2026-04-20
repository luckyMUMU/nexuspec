"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCommand = void 0;
const commander_1 = require("commander");
const child_process_1 = require("child_process");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const simple_git_1 = __importDefault(require("simple-git"));
const retry_1 = require("../utils/retry");
const error_handler_1 = require("../utils/error-handler");
// 异步执行命令
function execAsync(command) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(stdout + stderr);
            }
        });
    });
}
const syncCommand = new commander_1.Command('sync')
    .description('同步变更（委托给 OpenSpec）')
    .action(async () => {
    try {
        // 委托给 OpenSpec 的 /opsx:sync 命令
        console.log('Syncing using OpenSpec...');
        await (0, retry_1.retry)(async () => {
            const output = await execAsync('openspec /opsx:sync');
            console.log(output);
        }, 3, 2000, 60000); // 最多重试3次，每次延迟2秒，超时60秒
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
        // 检查契约变更
        const contractsDir = path_1.default.join(namespacePath, 'contracts', serviceName);
        if (await fs_extra_1.default.exists(contractsDir)) {
            // 同步契约变更到本地
            console.log('Syncing contract changes...');
            // 提交到 Git
            const git = (0, simple_git_1.default)(namespacePath);
            // 先检查是否有变更，避免不必要的Git操作
            const status = await git.status();
            if (status.files.length > 0) {
                await (0, retry_1.retry)(async () => {
                    await git.add(['contracts/']);
                    await git.commit(`Sync contracts for ${serviceName}`);
                    await git.push();
                }, 3, 2000, 60000); // 最多重试3次，每次延迟2秒，超时60秒
            }
            else {
                console.log('No contract changes to commit');
            }
            console.log('✅ Contract changes synced successfully');
        }
        console.log('✅ Sync completed successfully');
    }
    catch (error) {
        (0, error_handler_1.handleError)(error, 'syncing changes');
    }
});
exports.syncCommand = syncCommand;
