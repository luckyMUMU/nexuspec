import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import simpleGit from 'simple-git';

interface Config {
  service: {
    name: string;
  };
  namespace: {
    local_path: string;
  };
  depends?: Record<string, string>;
}

interface ServiceConfig {
  depends: Record<string, string>;
}

interface Contract {
  version: string;
  status: string;
  backward_compatible?: boolean;
  created_at?: string;
}

interface ImpactedService {
  service: string;
  reference: string;
  configPath: string;
}

// 分析依赖该契约的服务
async function analyzeDependencies(namespacePath: string, service: string, contractType: string, oldVersion: string): Promise<ImpactedService[]> {
  const impactedServices: ImpactedService[] = [];
  const contractsDir = path.join(namespacePath, 'contracts');
  
  // 遍历所有服务的依赖
  const serviceDirs = await fs.readdir(contractsDir);
  for (const serviceDir of serviceDirs) {
    if (serviceDir === 'external' || serviceDir === service) continue;

    const serviceConfigPath = path.join(contractsDir, serviceDir, 'config.yaml');
    if (await fs.exists(serviceConfigPath)) {
      const serviceConfig = yaml.load(await fs.readFile(serviceConfigPath, 'utf8')) as ServiceConfig;
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
async function updateServiceDependencies(impactedServices: ImpactedService[], oldVersion: string, newVersion: string): Promise<void> {
  for (const impacted of impactedServices) {
    const serviceConfig = yaml.load(await fs.readFile(impacted.configPath, 'utf8')) as ServiceConfig;
    
    // 更新依赖引用
    for (const [name, ref] of Object.entries(serviceConfig.depends)) {
      if (ref.includes(`:${oldVersion}`)) {
        serviceConfig.depends[name] = ref.replace(`:${oldVersion}`, `:${newVersion}`);
      }
    }
    
    // 写回配置文件
    await fs.writeFile(impacted.configPath, yaml.dump(serviceConfig));
    console.log(`✅ Updated ${impacted.service} to use version ${newVersion}`);
  }
}

const contractCommand = new Command('contract')
  .description('管理契约的版本生命周期');

// promote 子命令
contractCommand
  .command('promote <name>')
  .description('将契约草案提升为 active，旧版本降级为 deprecated，并自动处理依赖更新')
  .option('--version <version>', '契约版本，例如 v2')
  .option('--auto-migrate', '自动迁移依赖该契约的服务', false)
  .action(async (name, options) => {
    try {
      // 读取配置文件
      const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
      if (!await fs.exists(configPath)) {
        console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
        process.exit(1);
      }

      const config = yaml.load(await fs.readFile(configPath, 'utf8')) as Config;
      const serviceName = config.service.name;
      const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

      // 确保 Namespace 仓库存在
      if (!await fs.exists(namespacePath)) {
        console.log('Error: Namespace repository not found. Please clone it first.');
        process.exit(1);
      }

      // 解析契约名称和类型
      const [contractType, contractName] = name.split('/');

      // 找到当前 active 版本
      const contractDir = path.join(namespacePath, 'contracts', serviceName, contractType);
      if (!await fs.exists(contractDir)) {
        console.log(`Error: Contract directory ${contractDir} not found`);
        process.exit(1);
      }

      const contractFiles = await fs.readdir(contractDir);
      let currentActiveVersion = null;

      for (const file of contractFiles) {
        if (file.endsWith('.yaml')) {
          const contractPath = path.join(contractDir, file);
          const contract = yaml.load(await fs.readFile(contractPath, 'utf8')) as Contract;
          if (contract.status === 'active') {
            currentActiveVersion = file.replace('.yaml', '');
            break;
          }
        }
      }

      // 提升新版本为 active
      const newVersionPath = path.join(contractDir, `${options.version}.yaml`);
      if (!await fs.exists(newVersionPath)) {
        console.log(`Error: Contract version ${options.version} not found`);
        process.exit(1);
      }

      const newVersion = yaml.load(await fs.readFile(newVersionPath, 'utf8')) as Contract;
      newVersion.status = 'active';
      await fs.writeFile(newVersionPath, yaml.dump(newVersion));

      // 将旧版本降级为 deprecated
      if (currentActiveVersion) {
        const oldVersionPath = path.join(contractDir, `${currentActiveVersion}.yaml`);
        const oldVersion = yaml.load(await fs.readFile(oldVersionPath, 'utf8')) as Contract;
        oldVersion.status = 'deprecated';
        await fs.writeFile(oldVersionPath, yaml.dump(oldVersion));

        // 自动迁移依赖服务
        if (options.autoMigrate) {
          console.log('\n🔍 Analyzing dependent services...');
          const impactedServices = await analyzeDependencies(
            namespacePath, 
            serviceName, 
            contractType, 
            currentActiveVersion
          );

          if (impactedServices.length > 0) {
            console.log('\n📋 Found dependent services:');
            impactedServices.forEach(service => {
              console.log(`  - ${service.service}: ${service.reference}`);
            });

            console.log('\n🔄 Updating dependencies...');
            await updateServiceDependencies(
              impactedServices, 
              currentActiveVersion, 
              options.version
            );
          } else {
            console.log('\n✅ No dependent services found.');
          }
        }
      }

      // 提交到 Git
      const git = simpleGit(namespacePath);
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
    } catch (error) {
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
      const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
      if (!await fs.exists(configPath)) {
        console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
        process.exit(1);
      }

      const config = yaml.load(await fs.readFile(configPath, 'utf8')) as Config;
      const serviceName = config.service.name;
      const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

      // 确保 Namespace 仓库存在
      if (!await fs.exists(namespacePath)) {
        console.log('Error: Namespace repository not found. Please clone it first.');
        process.exit(1);
      }

      // 解析契约名称和类型
      const [contractType, contractName] = name.split('/');

      // 找到并标记契约为 retired
      const contractPath = path.join(namespacePath, 'contracts', serviceName, contractType, `${options.version}.yaml`);
      if (!await fs.exists(contractPath)) {
        console.log(`Error: Contract version ${options.version} not found`);
        process.exit(1);
      }

      const contract = yaml.load(await fs.readFile(contractPath, 'utf8')) as Contract;
      contract.status = 'retired';
      await fs.writeFile(contractPath, yaml.dump(contract));

      // 提交到 Git
      const git = simpleGit(namespacePath);
      await git.add(['contracts/']);
      await git.commit(`Retire ${contractType} contract version ${options.version}`);
      await git.push();

      console.log(`✅ Contract ${name} version ${options.version} marked as retired`);
    } catch (error) {
      console.error('Error retiring contract:', error);
      process.exit(1);
    }
  });

export { contractCommand };
