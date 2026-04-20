"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractCommand = void 0;
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const simple_git_1 = __importDefault(require("simple-git"));
// 分析依赖该契约的服务
async function analyzeDependencies(namespacePath, service, contractType, oldVersion) {
    const impactedServices = [];
    const contractsDir = path_1.default.join(namespacePath, 'contracts');
    // 遍历所有服务的依赖
    const serviceDirs = await fs_extra_1.default.readdir(contractsDir);
    for (const serviceDir of serviceDirs) {
        if (serviceDir === 'external' || serviceDir === service)
            continue;
        const serviceConfigPath = path_1.default.join(contractsDir, serviceDir, 'config.yaml');
        if (await fs_extra_1.default.exists(serviceConfigPath)) {
            const serviceConfig = js_yaml_1.default.load(await fs_extra_1.default.readFile(serviceConfigPath, 'utf8'));
            if (serviceConfig.depends) {
                for (const [name, ref] of Object.entries(serviceConfig.depends)) {
                    if (ref.includes(`${service}/${contractType}:${oldVersion}`)) {
                        impactedServices.push({
                            service: serviceDir,
                            reference: ref,
                            configPath: serviceConfigPath
                        });
                    }
                }
            }
        }
    }
    return impactedServices;
}
// 自动更新服务的依赖引用
async function updateServiceDependencies(impactedServices, oldVersion, newVersion) {
    for (const impacted of impactedServices) {
        const serviceConfig = js_yaml_1.default.load(await fs_extra_1.default.readFile(impacted.configPath, 'utf8'));
        // 更新依赖引用
        for (const [name, ref] of Object.entries(serviceConfig.depends)) {
            if (ref.includes(`:${oldVersion}`)) {
                serviceConfig.depends[name] = ref.replace(`:${oldVersion}`, `:${newVersion}`);
            }
        }
        // 写回配置文件
        await fs_extra_1.default.writeFile(impacted.configPath, js_yaml_1.default.dump(serviceConfig));
        console.log(`✅ Updated ${impacted.service} to use version ${newVersion}`);
    }
}
const contractCommand = new commander_1.Command('contract')
    .description('管理契约的版本生命周期');
exports.contractCommand = contractCommand;
// promote 子命令
contractCommand
    .command('promote <name>')
    .description('将契约草案提升为 active，旧版本降级为 deprecated，并自动处理依赖更新')
    .option('--version <version>', '契约版本，例如 v2')
    .option('--auto-migrate', '自动迁移依赖该契约的服务', false)
    .action(async (name, options) => {
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
        // 解析契约名称和类型
        const [contractType, contractName] = name.split('/');
        // 找到当前 active 版本
        const contractDir = path_1.default.join(namespacePath, 'contracts', serviceName, contractType);
        if (!await fs_extra_1.default.exists(contractDir)) {
            console.log(`Error: Contract directory ${contractDir} not found`);
            process.exit(1);
        }
        const contractFiles = await fs_extra_1.default.readdir(contractDir);
        let currentActiveVersion = null;
        for (const file of contractFiles) {
            if (file.endsWith('.yaml')) {
                const contractPath = path_1.default.join(contractDir, file);
                const contract = js_yaml_1.default.load(await fs_extra_1.default.readFile(contractPath, 'utf8'));
                if (contract.status === 'active') {
                    currentActiveVersion = file.replace('.yaml', '');
                    break;
                }
            }
        }
        // 提升新版本为 active
        const newVersionPath = path_1.default.join(contractDir, `${options.version}.yaml`);
        if (!await fs_extra_1.default.exists(newVersionPath)) {
            console.log(`Error: Contract version ${options.version} not found`);
            process.exit(1);
        }
        const newVersion = js_yaml_1.default.load(await fs_extra_1.default.readFile(newVersionPath, 'utf8'));
        newVersion.status = 'active';
        await fs_extra_1.default.writeFile(newVersionPath, js_yaml_1.default.dump(newVersion));
        // 将旧版本降级为 deprecated
        if (currentActiveVersion) {
            const oldVersionPath = path_1.default.join(contractDir, `${currentActiveVersion}.yaml`);
            const oldVersion = js_yaml_1.default.load(await fs_extra_1.default.readFile(oldVersionPath, 'utf8'));
            oldVersion.status = 'deprecated';
            await fs_extra_1.default.writeFile(oldVersionPath, js_yaml_1.default.dump(oldVersion));
            // 自动迁移依赖服务
            if (options.autoMigrate) {
                console.log('\n🔍 Analyzing dependent services...');
                const impactedServices = await analyzeDependencies(namespacePath, serviceName, contractType, currentActiveVersion);
                if (impactedServices.length > 0) {
                    console.log('\n📋 Found dependent services:');
                    impactedServices.forEach(service => {
                        console.log(`  - ${service.service}: ${service.reference}`);
                    });
                    console.log('\n🔄 Updating dependencies...');
                    await updateServiceDependencies(impactedServices, currentActiveVersion, options.version);
                }
                else {
                    console.log('\n✅ No dependent services found.');
                }
            }
        }
        // 提交到 Git
        const git = (0, simple_git_1.default)(namespacePath);
        await git.add(['contracts/']);
        await git.commit(`Promote ${contractType} contract to ${options.version}`);
        await git.push();
        console.log(`\n✅ Contract ${name} promoted to ${options.version} (active)`);
        if (currentActiveVersion) {
            console.log(`✅ Previous version ${currentActiveVersion} marked as deprecated`);
        }
        if (options.autoMigrate) {
            console.log('\n✅ Automatic dependency migration completed successfully');
        }
    }
    catch (error) {
        console.error('Error promoting contract:', error);
        process.exit(1);
    }
});
// retire 子命令
contractCommand
    .command('retire <name>')
    .description('将契约标记为 retired')
    .option('--version <version>', '契约版本，例如 v1')
    .action(async (name, options) => {
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
        // 解析契约名称和类型
        const [contractType, contractName] = name.split('/');
        // 找到并标记契约为 retired
        const contractPath = path_1.default.join(namespacePath, 'contracts', serviceName, contractType, `${options.version}.yaml`);
        if (!await fs_extra_1.default.exists(contractPath)) {
            console.log(`Error: Contract version ${options.version} not found`);
            process.exit(1);
        }
        const contract = js_yaml_1.default.load(await fs_extra_1.default.readFile(contractPath, 'utf8'));
        contract.status = 'retired';
        await fs_extra_1.default.writeFile(contractPath, js_yaml_1.default.dump(contract));
        // 提交到 Git
        const git = (0, simple_git_1.default)(namespacePath);
        await git.add(['contracts/']);
        await git.commit(`Retire ${contractType} contract version ${options.version}`);
        await git.push();
        console.log(`✅ Contract ${name} version ${options.version} marked as retired`);
    }
    catch (error) {
        console.error('Error retiring contract:', error);
        process.exit(1);
    }
});
