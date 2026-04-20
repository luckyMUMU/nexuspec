"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const initCommand = new commander_1.Command('init')
    .description('初始化服务的 NexusSpec 配置')
    .option('--namespace <url>', 'Namespace 仓库的 Git URL')
    .option('--gitnexus-url <url>', 'GitNexus 服务的 URL')
    .option('--gitnexus-api-key <key>', 'GitNexus API 密钥')
    .action(async (options) => {
    try {
        // 检查是否已经存在 .nxsp 目录
        const nxspDir = path_1.default.join(process.cwd(), '.nxsp');
        if (await fs_extra_1.default.exists(nxspDir)) {
            console.log('Error: .nxsp directory already exists');
            process.exit(1);
        }
        // 创建 .nxsp 目录
        await fs_extra_1.default.mkdir(nxspDir);
        // 创建 config.yaml 文件
        const configContent = `service:
  name: ${path_1.default.basename(process.cwd())}
  team: default

namespace:
  remote: ${options.namespace || ''}
  local_path: ~/.nxsp/namespaces/${options.namespace ? options.namespace.split('/').pop()?.replace('.git', '') : 'default'}

# GitNexus 连接参数
gitnexus:
  url: ${options.gitnexusUrl || ''}
  api_key: ${options.gitnexusApiKey || ''}

# 本服务暴露的契约（同步到 Namespace）
exposes:
  - type: api
    path: "src/api/openapi.yaml"
    name: default
  - type: events
    path: "src/events/schemas/"
    name: default

# 本服务依赖的契约（从 Namespace 引用）
depends:

# 引用的共享模型
shared_types:
`;
        await fs_extra_1.default.writeFile(path_1.default.join(nxspDir, 'config.yaml'), configContent);
        console.log('✅ NexusSpec initialization completed successfully');
        console.log('Created .nxsp/config.yaml with default configuration');
    }
    catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
});
exports.initCommand = initCommand;
