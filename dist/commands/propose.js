"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const simple_git_1 = __importDefault(require("simple-git"));
const cache_1 = require("../utils/cache");
const retry_1 = require("../utils/retry");
const error_handler_1 = require("../utils/error-handler");
const monitoring_1 = require("../utils/monitoring");
const proposeCommand = new commander_1.Command('propose')
    .description('创建跨服务变更提案')
    .option('--target <service>', '目标服务名称')
    .option('--contract <type:version>', '契约类型和版本，例如 api:v2')
    .action(async (options) => {
    try {
        // 验证参数
        if (!(0, error_handler_1.validateParams)(options, ['target', 'contract'])) {
            return;
        }
        await monitoring_1.monitoring.measureExecutionTime('propose', async () => {
            // 读取配置文件
            const configPath = path_1.default.join(process.cwd(), '.nxsp', 'config.yaml');
            if (!await fs_extra_1.default.exists(configPath)) {
                console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
                process.exit(1);
            }
            // 尝试从缓存获取配置
            let config = cache_1.cache.get('config');
            if (!config) {
                config = js_yaml_1.default.load(await fs_extra_1.default.readFile(configPath, 'utf8'));
                cache_1.cache.set('config', config);
            }
            const serviceName = config.service.name;
            const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');
            // 确保 Namespace 仓库存在
            if (!await fs_extra_1.default.exists(namespacePath)) {
                console.log('Error: Namespace repository not found. Please clone it first.');
                process.exit(1);
            }
            // 解析契约信息
            const [contractType, contractVersion] = options.contract.split(':');
            // 创建 CSP 目录
            const proposalsDir = path_1.default.join(namespacePath, 'proposals', 'active');
            await fs_extra_1.default.ensureDir(proposalsDir);
            // 生成 CSP ID
            const cspId = `CSP-${Date.now().toString().slice(-6)}`;
            const cspDir = path_1.default.join(proposalsDir, cspId);
            await fs_extra_1.default.mkdir(cspDir);
            // 创建提案文件
            const proposalContent = {
                id: cspId,
                title: `Change ${options.target} ${contractType} to ${contractVersion}`,
                status: 'submitted',
                initiator: {
                    service: serviceName,
                    agent: 'nxsp-cli',
                    created_at: new Date().toISOString()
                },
                targets: [
                    {
                        service: options.target,
                        required_action: 'new_contract_version',
                        contract: {
                            type: contractType,
                            name: 'default',
                            current_version: 'v1', // 假设当前版本是 v1
                            proposed_version: contractVersion,
                            change: 'add_endpoint',
                            detail: 'New endpoint added'
                        },
                        urgency: 'normal',
                        review_status: 'pending'
                    }
                ],
                contract_refs: [
                    {
                        ref: `contract://${options.target}/${contractType}/default:${contractVersion}`,
                        action: `upgrade_from_v1`
                    }
                ],
                breaking: false,
                backward_compatible: true
            };
            await fs_extra_1.default.writeFile(path_1.default.join(cspDir, 'proposal.yaml'), js_yaml_1.default.dump(proposalContent));
            // 创建提案描述文件
            const proposalMd = `# ${cspId}: ${proposalContent.title}\n\n## Overview\nThis proposal aims to update the ${contractType} contract of ${options.target} to version ${contractVersion}.\n\n## Changes\n- Add new endpoint\n- Maintain backward compatibility\n`;
            await fs_extra_1.default.writeFile(path_1.default.join(cspDir, 'proposal.md'), proposalMd);
            // 提交到 Git
            const git = (0, simple_git_1.default)(namespacePath);
            // 先检查是否有变更，避免不必要的Git操作
            const status = await git.status();
            if (status.files.length > 0) {
                await (0, retry_1.retry)(async () => {
                    await git.add(['proposals/active/' + cspId]);
                    await git.commit(`Add CSP ${cspId}: ${proposalContent.title}`);
                    await git.push();
                }, 3, 2000, 60000); // 最多重试3次，每次延迟2秒，超时60秒
            }
            else {
                console.log('No changes to commit');
            }
            console.log(`✅ Proposal ${cspId} created successfully`);
            console.log(`Push to Namespace repository completed`);
        });
    }
    catch (error) {
        (0, error_handler_1.handleError)(error, 'creating proposal');
    }
});
exports.proposeCommand = proposeCommand;
