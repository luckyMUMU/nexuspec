"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualizeCommand = void 0;
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const visualizeCommand = new commander_1.Command('visualize')
    .description('启动 NexusSpec 可视化界面')
    .action(() => {
    try {
        console.log('🚀 启动 NexusSpec 可视化界面...');
        // 构建项目
        console.log('🔨 正在构建项目...');
        (0, child_process_1.execSync)('npm run build', { stdio: 'inherit' });
        // 启动本地服务器
        console.log('🌐 正在启动本地服务器...');
        const serverCommand = `npx http-server ${path_1.default.join(__dirname, '..', '..', 'src', 'visualization')} -p 3000 -o`;
        (0, child_process_1.execSync)(serverCommand, { stdio: 'inherit' });
    }
    catch (error) {
        console.error('Error starting visualization:', error);
        process.exit(1);
    }
});
exports.visualizeCommand = visualizeCommand;
