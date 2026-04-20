"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const archiveCommand = new commander_1.Command('archive')
    .description('归档提案（委托给 OpenSpec）')
    .argument('<id>', '提案 ID')
    .action(async (id) => {
    try {
        // 委托给 OpenSpec 的 /opsx:archive 命令
        console.log('Archiving using OpenSpec...');
        const { execSync } = require('child_process');
        execSync('openspec /opsx:archive', { stdio: 'inherit' });
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
        // 移动提案到归档目录
        const activeDir = path_1.default.join(namespacePath, 'proposals', 'active', id);
        const archiveDir = path_1.default.join(namespacePath, 'proposals', 'archive', id);
        if (await fs_extra_1.default.exists(activeDir)) {
            await fs_extra_1.default.ensureDir(path_1.default.join(namespacePath, 'proposals', 'archive'));
            await fs_extra_1.default.move(activeDir, archiveDir);
            // 提交到 Git
            const git = (0, simple_git_1.default)(namespacePath);
            await git.add(['proposals/']);
            await git.commit(`Archive CSP ${id}`);
            await git.push();
            console.log(`✅ Proposal ${id} archived successfully`);
        }
        else {
            console.log(`Error: Proposal ${id} not found in active directory`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Error archiving proposal:', error);
        process.exit(1);
    }
});
exports.archiveCommand = archiveCommand;
