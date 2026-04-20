"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCommand = void 0;
const commander_1 = require("commander");
const child_process_1 = require("child_process");
const applyCommand = new commander_1.Command('apply')
    .description('应用变更（委托给 OpenSpec）')
    .action(async () => {
    try {
        // 委托给 OpenSpec 的 /opsx:apply 命令
        console.log('Applying changes using OpenSpec...');
        (0, child_process_1.execSync)('openspec /opsx:apply', { stdio: 'inherit' });
        console.log('✅ Changes applied successfully');
    }
    catch (error) {
        console.error('Error applying changes:', error);
        process.exit(1);
    }
});
exports.applyCommand = applyCommand;
