"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const cache_1 = require("../utils/cache");
const error_handler_1 = require("../utils/error-handler");
const monitoring_1 = require("../utils/monitoring");
// 验证契约兼容性
async function validateContractCompatibility(oldContractPath, newContractPath) {
    try {
        // 尝试从缓存获取契约内容
        let oldContractContent = cache_1.cache.get(`contract:${oldContractPath}`);
        let newContractContent = cache_1.cache.get(`contract:${newContractPath}`);
        // 如果缓存中没有，则读取文件
        if (!oldContractContent) {
            oldContractContent = await fs_extra_1.default.readFile(oldContractPath, 'utf8');
            cache_1.cache.set(`contract:${oldContractPath}`, oldContractContent);
        }
        if (!newContractContent) {
            newContractContent = await fs_extra_1.default.readFile(newContractPath, 'utf8');
            cache_1.cache.set(`contract:${newContractPath}`, newContractContent);
        }
        const oldContract = js_yaml_1.default.load(oldContractContent);
        const newContract = js_yaml_1.default.load(newContractContent);
        // 简单的兼容性验证逻辑
        // 这里可以根据实际的契约格式实现更复杂的验证
        // 例如，检查新契约是否包含旧契约的所有字段，且类型兼容
        // 示例验证：检查是否添加了新的必需字段
        const oldRequiredFields = oldContract.required || [];
        const newRequiredFields = newContract.required || [];
        // 检查新契约是否包含旧契约的所有必需字段
        for (const field of oldRequiredFields) {
            if (!newRequiredFields.includes(field)) {
                return false;
            }
        }
        // 检查是否移除了任何字段
        const oldFields = Object.keys(oldContract.properties || {});
        const newFields = Object.keys(newContract.properties || {});
        for (const field of oldFields) {
            if (!newFields.includes(field)) {
                return false;
            }
        }
        return true;
    }
    catch (error) {
        console.error('Error validating contract compatibility:', error);
        return false;
    }
}
const validateCommand = new commander_1.Command('validate')
    .description('验证契约兼容性');
exports.validateCommand = validateCommand;
// validate contract 子命令
validateCommand
    .command('contract <name>')
    .description('验证契约版本之间的兼容性')
    .option('--old-version <version>', '旧版本，例如 v1')
    .option('--new-version <version>', '新版本，例如 v2')
    .action(async (name, options) => {
    try {
        await monitoring_1.monitoring.measureExecutionTime('validate_contract', async () => {
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
            // 解析契约名称和类型
            const [contractType, contractName] = name.split('/');
            // 找到契约文件
            const oldContractPath = path_1.default.join(namespacePath, 'contracts', serviceName, contractType, `${options.oldVersion}.yaml`);
            const newContractPath = path_1.default.join(namespacePath, 'contracts', serviceName, contractType, `${options.newVersion}.yaml`);
            if (!await fs_extra_1.default.exists(oldContractPath)) {
                console.log(`Error: Old contract version ${options.oldVersion} not found`);
                process.exit(1);
            }
            if (!await fs_extra_1.default.exists(newContractPath)) {
                console.log(`Error: New contract version ${options.newVersion} not found`);
                process.exit(1);
            }
            // 验证兼容性
            console.log(`🔍 Validating compatibility between ${options.oldVersion} and ${options.newVersion}...`);
            const isCompatible = await validateContractCompatibility(oldContractPath, newContractPath);
            if (isCompatible) {
                console.log('✅ Contract is backward compatible');
                // 更新契约的 backward_compatible 字段
                const newContract = js_yaml_1.default.load(await fs_extra_1.default.readFile(newContractPath, 'utf8'));
                newContract.backward_compatible = true;
                await fs_extra_1.default.writeFile(newContractPath, js_yaml_1.default.dump(newContract));
                console.log('✅ Updated backward_compatible flag in new contract');
            }
            else {
                console.log('❌ Contract is NOT backward compatible');
                // 更新契约的 backward_compatible 字段
                const newContract = js_yaml_1.default.load(await fs_extra_1.default.readFile(newContractPath, 'utf8'));
                newContract.backward_compatible = false;
                await fs_extra_1.default.writeFile(newContractPath, js_yaml_1.default.dump(newContract));
                console.log('✅ Updated backward_compatible flag in new contract');
            }
        });
    }
    catch (error) {
        (0, error_handler_1.handleError)(error, 'validating contract');
    }
});
// validate all 子命令 - 用于 CI/CD 集成
validateCommand
    .command('all')
    .description('验证所有契约的兼容性，用于 CI/CD 集成')
    .action(async () => {
    try {
        await monitoring_1.monitoring.measureExecutionTime('validate_all', async () => {
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
            const serviceContractPath = path_1.default.join(namespacePath, 'contracts', serviceName);
            if (!await fs_extra_1.default.exists(serviceContractPath)) {
                console.log('No contracts found for this service');
                process.exit(0);
            }
            // 遍历所有契约类型
            const contractTypes = await fs_extra_1.default.readdir(serviceContractPath);
            let allCompatible = true;
            // 收集所有验证任务
            const validationTasks = [];
            for (const contractType of contractTypes) {
                const contractTypePath = path_1.default.join(serviceContractPath, contractType);
                if (await fs_extra_1.default.stat(contractTypePath).then(stats => stats.isDirectory())) {
                    // 遍历所有契约版本
                    const contractFiles = await fs_extra_1.default.readdir(contractTypePath);
                    const versions = contractFiles
                        .filter(file => file.endsWith('.yaml'))
                        .map(file => file.replace('.yaml', ''))
                        .sort();
                    // 收集验证任务
                    for (let i = 1; i < versions.length; i++) {
                        const oldVersion = versions[i - 1];
                        const newVersion = versions[i];
                        const oldContractPath = path_1.default.join(contractTypePath, `${oldVersion}.yaml`);
                        const newContractPath = path_1.default.join(contractTypePath, `${newVersion}.yaml`);
                        validationTasks.push(async () => {
                            console.log(`🔍 Validating ${contractType} compatibility between ${oldVersion} and ${newVersion}...`);
                            const isCompatible = await validateContractCompatibility(oldContractPath, newContractPath);
                            if (isCompatible) {
                                console.log(`✅ ${contractType}: ${oldVersion} -> ${newVersion} is backward compatible`);
                                // 更新契约的 backward_compatible 字段
                                const newContract = js_yaml_1.default.load(await fs_extra_1.default.readFile(newContractPath, 'utf8'));
                                newContract.backward_compatible = true;
                                await fs_extra_1.default.writeFile(newContractPath, js_yaml_1.default.dump(newContract));
                                return true;
                            }
                            else {
                                console.log(`❌ ${contractType}: ${oldVersion} -> ${newVersion} is NOT backward compatible`);
                                // 更新契约的 backward_compatible 字段
                                const newContract = js_yaml_1.default.load(await fs_extra_1.default.readFile(newContractPath, 'utf8'));
                                newContract.backward_compatible = false;
                                await fs_extra_1.default.writeFile(newContractPath, js_yaml_1.default.dump(newContract));
                                return false;
                            }
                        });
                    }
                }
            }
            // 并行执行验证任务
            if (validationTasks.length > 0) {
                const results = await Promise.all(validationTasks.map(task => task()));
                allCompatible = results.every(result => result);
            }
            if (allCompatible) {
                console.log('\n✅ All contracts are backward compatible');
                process.exit(0);
            }
            else {
                console.log('\n❌ Some contracts are not backward compatible');
                process.exit(1);
            }
        });
    }
    catch (error) {
        (0, error_handler_1.handleError)(error, 'validating all contracts');
    }
});
