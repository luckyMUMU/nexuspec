"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const intelligent_review_1 = require("../utils/intelligent-review");
const reviewCommand = new commander_1.Command('review')
    .description('评审跨服务变更提案')
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
        // 查找针对本服务的提案
        const proposalsDir = path_1.default.join(namespacePath, 'proposals', 'active');
        if (!await fs_extra_1.default.exists(proposalsDir)) {
            console.log('No active proposals found');
            return;
        }
        const proposalDirs = await fs_extra_1.default.readdir(proposalsDir);
        const relevantProposals = [];
        for (const dir of proposalDirs) {
            const proposalPath = path_1.default.join(proposalsDir, dir, 'proposal.yaml');
            if (await fs_extra_1.default.exists(proposalPath)) {
                const proposal = js_yaml_1.default.load(await fs_extra_1.default.readFile(proposalPath, 'utf8'));
                const targets = proposal.targets.filter((target) => target.service === serviceName);
                if (targets.length > 0) {
                    relevantProposals.push({ ...proposal, dir });
                }
            }
        }
        if (relevantProposals.length === 0) {
            console.log(`No proposals targeting service ${serviceName}`);
            return;
        }
        console.log(`Found ${relevantProposals.length} proposals targeting ${serviceName}:`);
        console.log('');
        for (const proposal of relevantProposals) {
            console.log(`📋 ${proposal.id}: ${proposal.title}`);
            console.log(`   Status: ${proposal.status}`);
            console.log(`   Initiator: ${proposal.initiator.service}`);
            console.log(`   Created: ${new Date(proposal.initiator.created_at).toLocaleString()}`);
            console.log('   Targets:');
            proposal.targets.forEach((target) => {
                if (target.service === serviceName) {
                    console.log(`     - ${target.contract.type}: v${target.contract.current_version} → v${target.contract.proposed_version}`);
                    console.log(`       Action: ${target.required_action}`);
                    console.log(`       Status: ${target.review_status}`);
                }
            });
            console.log('');
        }
        // 生成智能评审建议
        console.log('🤖 智能评审建议:');
        console.log('');
        const proposalsForSuggestion = relevantProposals.map(p => ({ proposal: p, dir: p.dir }));
        const suggestions = await (0, intelligent_review_1.generateReviewSuggestions)(config, proposalsForSuggestion);
        if (suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                console.log((0, intelligent_review_1.formatSuggestion)(suggestion));
                console.log('');
            });
        }
        else {
            console.log('没有找到需要评审的提案');
            console.log('');
        }
        console.log('Use `nxsp accept <id>` to accept a proposal');
        console.log('Use `nxsp reject <id>` to reject a proposal');
    }
    catch (error) {
        console.error('Error reviewing proposals:', error);
        process.exit(1);
    }
});
exports.reviewCommand = reviewCommand;
