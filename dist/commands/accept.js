"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const simple_git_1 = __importDefault(require("simple-git"));
const acceptCommand = new commander_1.Command('accept')
    .description('接受跨服务变更提案')
    .argument('<id>', '提案 ID')
    .action(async (id) => {
    try {
        // 读取配置文件
        const configPath = path_1.default.join(process.cwd(), '.nxsp', 'config.yaml');
        if (!await fs_extra_1.default.exists(configPath)) {
            console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
            process.exit(1);
        }
        const config = js_yaml_1.default.load(await fs_extra_1.default.readFile(configPath, 'utf8'));
        const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');
        // 确保 Namespace 仓库存在
        if (!await fs_extra_1.default.exists(namespacePath)) {
            console.log('Error: Namespace repository not found. Please clone it first.');
            process.exit(1);
        }
        // 检查提案是否存在
        const proposalDir = path_1.default.join(namespacePath, 'proposals', 'active', id);
        if (!await fs_extra_1.default.exists(proposalDir)) {
            console.log(`Error: Proposal ${id} not found`);
            process.exit(1);
        }
        // 读取提案文件
        const proposalPath = path_1.default.join(proposalDir, 'proposal.yaml');
        const proposal = js_yaml_1.default.load(await fs_extra_1.default.readFile(proposalPath, 'utf8'));
        // 更新提案状态
        proposal.status = 'accepted';
        proposal.targets.forEach((target) => {
            target.review_status = 'accepted';
        });
        await fs_extra_1.default.writeFile(proposalPath, js_yaml_1.default.dump(proposal));
        // 处理契约版本升级
        for (const target of proposal.targets) {
            const contractPath = path_1.default.join(namespacePath, 'contracts', target.service, target.contract.type, `${target.contract.proposed_version}.yaml`);
            // 确保契约目录存在
            await fs_extra_1.default.ensureDir(path_1.default.dirname(contractPath));
            // 创建新契约版本文件
            const contractContent = {
                version: target.contract.proposed_version,
                status: 'active',
                backward_compatible: true,
                created_at: new Date().toISOString()
            };
            await fs_extra_1.default.writeFile(contractPath, js_yaml_1.default.dump(contractContent));
            // 标记旧版本为 deprecated
            if (target.contract.current_version) {
                const oldContractPath = path_1.default.join(namespacePath, 'contracts', target.service, target.contract.type, `${target.contract.current_version}.yaml`);
                if (await fs_extra_1.default.exists(oldContractPath)) {
                    const oldContract = js_yaml_1.default.load(await fs_extra_1.default.readFile(oldContractPath, 'utf8'));
                    oldContract.status = 'deprecated';
                    await fs_extra_1.default.writeFile(oldContractPath, js_yaml_1.default.dump(oldContract));
                }
            }
        }
        // 提交到 Git
        const git = (0, simple_git_1.default)(namespacePath);
        await git.add([
            `proposals/active/${id}`,
            `contracts/`
        ]);
        await git.commit(`Accept CSP ${id}: ${proposal.title}`);
        await git.push();
        console.log(`✅ Proposal ${id} accepted successfully`);
        console.log('Contract versions updated and pushed to Namespace repository');
    }
    catch (error) {
        console.error('Error accepting proposal:', error);
        process.exit(1);
    }
});
exports.acceptCommand = acceptCommand;
