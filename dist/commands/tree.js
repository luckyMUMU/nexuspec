"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.treeCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const treeCommand = new commander_1.Command('tree')
    .description('展示当前 Namespace 的 spec 树状结构')
    .action(async () => {
    try {
        // 读取配置文件
        const configPath = path_1.default.join(process.cwd(), '.nxsp', 'config.yaml');
        if (!await fs_extra_1.default.exists(configPath)) {
            console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
            process.exit(1);
        }
        const yaml = require('js-yaml');
        const config = yaml.load(await fs_extra_1.default.readFile(configPath, 'utf8'));
        const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');
        // 确保 Namespace 仓库存在
        if (!await fs_extra_1.default.exists(namespacePath)) {
            console.log('Error: Namespace repository not found. Please clone it first.');
            process.exit(1);
        }
        // 构建树状结构
        console.log('🌳 NexusSpec Tree Structure');
        console.log('==========================');
        console.log('');
        // 显示根 spec
        const rootSpecPath = path_1.default.join(namespacePath, 'spec');
        if (await fs_extra_1.default.exists(rootSpecPath)) {
            console.log('📁 spec/ (Namespace Root)');
            await displayDirectory(rootSpecPath, 2);
        }
        // 显示契约
        const contractsPath = path_1.default.join(namespacePath, 'contracts');
        if (await fs_extra_1.default.exists(contractsPath)) {
            console.log('');
            console.log('📁 contracts/ (Versioned Contracts)');
            await displayDirectory(contractsPath, 2);
        }
        // 显示提案
        const proposalsPath = path_1.default.join(namespacePath, 'proposals');
        if (await fs_extra_1.default.exists(proposalsPath)) {
            console.log('');
            console.log('📁 proposals/ (Cross-Service Proposals)');
            await displayDirectory(proposalsPath, 2);
        }
        console.log('');
        console.log('✅ Tree structure displayed successfully');
    }
    catch (error) {
        console.error('Error displaying tree structure:', error);
        process.exit(1);
    }
});
exports.treeCommand = treeCommand;
// 辅助函数：递归显示目录结构
async function displayDirectory(dirPath, indent) {
    const files = await fs_extra_1.default.readdir(dirPath);
    for (const file of files) {
        const fullPath = path_1.default.join(dirPath, file);
        const stats = await fs_extra_1.default.stat(fullPath);
        const indentStr = ' '.repeat(indent);
        if (stats.isDirectory()) {
            console.log(`${indentStr}📁 ${file}/`);
            await displayDirectory(fullPath, indent + 2);
        }
        else {
            console.log(`${indentStr}📄 ${file}`);
        }
    }
}
