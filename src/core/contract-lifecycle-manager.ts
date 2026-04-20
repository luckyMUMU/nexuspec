import path from 'path';
import { promises as fs } from 'fs';
import yaml from 'yaml';
import type {
  ContractMetadata,
  ContractVersionMetadata,
  ContractStatus,
  ContractRef,
} from '../types/index.js';
import { ConfigManager } from './config.js';
import { KnowledgeGraphService } from './knowledge-graph.js';

export class ContractLifecycleManager {
  private configManager: ConfigManager;
  private graphService: KnowledgeGraphService;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.configManager = new ConfigManager(cwd);
    this.graphService = new KnowledgeGraphService(cwd);
  }

  private async getNamespacePath(): Promise<string> {
    const config = await this.configManager.loadConfig();
    return this.configManager.getNamespaceLocalPath(config);
  }

  private getContractDir(service: string, type: string, name: string, namespacePath: string): string {
    return path.join(namespacePath, 'contracts', service, type);
  }

  private getMetadataPath(service: string, type: string, name: string, namespacePath: string): string {
    const contractDir = this.getContractDir(service, type, name, namespacePath);
    return path.join(contractDir, `${name}-metadata.yaml`);
  }

  parseContractRef(ref: string): ContractRef {
    const match = ref.match(/^contract:\/\/([^/]+)\/([^/]+)\/([^:]+):(v\d+)$/);
    if (!match) {
      throw new Error(`Invalid contract ref format: ${ref}. Expected format: contract://<service>/<type>/<name>:<version>`);
    }
    return {
      service: match[1],
      type: match[2] as 'api' | 'events',
      name: match[3],
      version: match[4],
    };
  }

  formatContractRef(service: string, type: string, name: string, version: string): string {
    return `contract://${service}/${type}/${name}:${version}`;
  }

  async getContractMetadata(service: string, type: string, name: string): Promise<ContractMetadata | null> {
    const namespacePath = await this.getNamespacePath();
    const metadataPath = this.getMetadataPath(service, type, name, namespacePath);

    try {
      await fs.access(metadataPath);
      const content = await fs.readFile(metadataPath, 'utf-8');
      return yaml.parse(content) as ContractMetadata;
    } catch {
      return null;
    }
  }

  async saveContractMetadata(metadata: ContractMetadata): Promise<void> {
    const namespacePath = await this.getNamespacePath();
    const metadataPath = this.getMetadataPath(metadata.service, metadata.type, metadata.name, namespacePath);
    const dir = path.dirname(metadataPath);

    await fs.mkdir(dir, { recursive: true });
    const content = yaml.stringify(metadata);
    await fs.writeFile(metadataPath, content, 'utf-8');
  }

  async initializeContractMetadata(
    service: string,
    type: string,
    name: string,
    initialVersion: string = 'v1'
  ): Promise<ContractMetadata> {
    const now = new Date().toISOString();

    const initialVersionMetadata: ContractVersionMetadata = {
      version: initialVersion,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      description: 'Initial contract version',
      backwardCompatible: true,
    };

    const metadata: ContractMetadata = {
      service,
      type: type as 'api' | 'events',
      name,
      versions: [initialVersionMetadata],
      currentVersion: initialVersion,
      latestVersion: initialVersion,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveContractMetadata(metadata);
    return metadata;
  }

  async addContractVersion(
    service: string,
    type: string,
    name: string,
    version: string,
    options?: {
      status?: ContractStatus;
      description?: string;
      backwardCompatible?: boolean;
      breakingChanges?: string[];
      migrationGuide?: string;
    }
  ): Promise<ContractMetadata> {
    let metadata = await this.getContractMetadata(service, type, name);

    if (!metadata) {
      metadata = await this.initializeContractMetadata(service, type, name, version);
    }

    const now = new Date().toISOString();
    const existingVersion = metadata.versions.find((v) => v.version === version);

    if (existingVersion) {
      existingVersion.status = options?.status || existingVersion.status;
      existingVersion.updatedAt = now;
      existingVersion.description = options?.description ?? existingVersion.description;
      existingVersion.backwardCompatible = options?.backwardCompatible ?? existingVersion.backwardCompatible;
      existingVersion.breakingChanges = options?.breakingChanges ?? existingVersion.breakingChanges;
      existingVersion.migrationGuide = options?.migrationGuide ?? existingVersion.migrationGuide;
    } else {
      const newVersion: ContractVersionMetadata = {
        version,
        status: options?.status || 'draft',
        createdAt: now,
        updatedAt: now,
        description: options?.description,
        backwardCompatible: options?.backwardCompatible,
        breakingChanges: options?.breakingChanges,
        migrationGuide: options?.migrationGuide,
      };
      metadata.versions.push(newVersion);
    }

    if (!existingVersion) {
      const versionNum = parseInt(version.replace('v', ''));
      const latestNum = parseInt(metadata.latestVersion.replace('v', ''));
      if (versionNum > latestNum) {
        metadata.latestVersion = version;
      }
    }

    metadata.updatedAt = now;
    await this.saveContractMetadata(metadata);

    return metadata;
  }

  async promoteContract(
    service: string,
    type: string,
    name: string,
    version: string,
    options?: {
      description?: string;
      backwardCompatible?: boolean;
      breakingChanges?: string[];
      autoDeprecateOld?: boolean;
    }
  ): Promise<ContractMetadata> {
    const metadata = await this.getContractMetadata(service, type, name);
    if (!metadata) {
      throw new Error(`Contract not found: ${service}/${type}/${name}`);
    }

    const targetVersion = metadata.versions.find((v) => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for contract ${service}/${type}/${name}`);
    }

    if (targetVersion.status === 'retired') {
      throw new Error(`Cannot promote retired version ${version}`);
    }

    const now = new Date().toISOString();

    if (options?.autoDeprecateOld !== false) {
      const currentVersion = metadata.versions.find((v) => v.version === metadata.currentVersion);
      if (currentVersion && currentVersion.version !== version) {
        currentVersion.status = 'deprecated';
        currentVersion.deprecatedAt = now;
        currentVersion.updatedAt = now;
      }
    }

    targetVersion.status = 'active';
    targetVersion.updatedAt = now;
    if (options?.description) {
      targetVersion.description = options.description;
    }
    if (options?.backwardCompatible !== undefined) {
      targetVersion.backwardCompatible = options.backwardCompatible;
    }
    if (options?.breakingChanges) {
      targetVersion.breakingChanges = options.breakingChanges;
    }

    metadata.currentVersion = version;
    metadata.updatedAt = now;

    await this.saveContractMetadata(metadata);
    await this.graphService.syncFromConfig();

    return metadata;
  }

  async deprecateContract(
    service: string,
    type: string,
    name: string,
    version: string,
    options?: {
      migrationGuide?: string;
    }
  ): Promise<ContractMetadata> {
    const metadata = await this.getContractMetadata(service, type, name);
    if (!metadata) {
      throw new Error(`Contract not found: ${service}/${type}/${name}`);
    }

    const targetVersion = metadata.versions.find((v) => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for contract ${service}/${type}/${name}`);
    }

    if (targetVersion.status === 'retired') {
      throw new Error(`Cannot deprecate retired version ${version}`);
    }

    if (targetVersion.status === 'draft') {
      throw new Error(`Cannot deprecate draft version ${version}`);
    }

    if (metadata.currentVersion === version) {
      const activeVersion = metadata.versions.find(
        (v) => v.status === 'active' && v.version !== version
      );
      if (!activeVersion) {
        throw new Error(`Cannot deprecate current version ${version} - no other active version available`);
      }
      metadata.currentVersion = activeVersion.version;
    }

    const now = new Date().toISOString();
    targetVersion.status = 'deprecated';
    targetVersion.deprecatedAt = now;
    targetVersion.updatedAt = now;
    if (options?.migrationGuide) {
      targetVersion.migrationGuide = options.migrationGuide;
    }

    metadata.updatedAt = now;

    await this.saveContractMetadata(metadata);
    await this.graphService.syncFromConfig();

    return metadata;
  }

  async retireContract(
    service: string,
    type: string,
    name: string,
    version: string,
    options?: {
      force?: boolean;
    }
  ): Promise<ContractMetadata> {
    const metadata = await this.getContractMetadata(service, type, name);
    if (!metadata) {
      throw new Error(`Contract not found: ${service}/${type}/${name}`);
    }

    const targetVersion = metadata.versions.find((v) => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for contract ${service}/${type}/${name}`);
    }

    if (targetVersion.status === 'active' && !options?.force) {
      throw new Error(`Cannot retire active version ${version}. Use --force to override, or deprecate first.`);
    }

    const now = new Date().toISOString();
    targetVersion.status = 'retired';
    targetVersion.retiredAt = now;
    targetVersion.updatedAt = now;

    if (metadata.currentVersion === version) {
      const nextActive = metadata.versions.find(
        (v) => v.status === 'active' || v.status === 'deprecated'
      );
      if (nextActive) {
        metadata.currentVersion = nextActive.version;
        nextActive.status = 'active';
      }
    }

    metadata.updatedAt = now;

    await this.saveContractMetadata(metadata);
    await this.graphService.syncFromConfig();

    return metadata;
  }

  async getVersionStatus(service: string, type: string, name: string, version: string): Promise<ContractStatus | null> {
    const metadata = await this.getContractMetadata(service, type, name);
    if (!metadata) return null;

    const versionMetadata = metadata.versions.find((v) => v.version === version);
    return versionMetadata?.status || null;
  }

  async getContractVersions(service: string, type: string, name: string): Promise<ContractVersionMetadata[]> {
    const metadata = await this.getContractMetadata(service, type, name);
    if (!metadata) return [];
    return metadata.versions;
  }

  async listContracts(service?: string): Promise<Array<{ service: string; type: string; name: string; currentVersion: string; status: ContractStatus }>> {
    const namespacePath = await this.getNamespacePath();
    const contractsDir = path.join(namespacePath, 'contracts');

    const results: Array<{ service: string; type: string; name: string; currentVersion: string; status: ContractStatus }> = [];

    try {
      await fs.access(contractsDir);
      const serviceDirs = await fs.readdir(contractsDir);

      for (const serviceDir of serviceDirs) {
        if (service && serviceDir !== service) continue;

        const servicePath = path.join(contractsDir, serviceDir);
        const stat = await fs.stat(servicePath);
        if (!stat.isDirectory()) continue;

        const typeDirs = await fs.readdir(servicePath);

        for (const typeDir of typeDirs) {
          if (typeDir !== 'api' && typeDir !== 'events') continue;

          const typePath = path.join(servicePath, typeDir);
          const typeStat = await fs.stat(typePath);
          if (!typeStat.isDirectory()) continue;

          const files = await fs.readdir(typePath);
          const metadataFiles = files.filter((f) => f.endsWith('-metadata.yaml'));

          for (const metaFile of metadataFiles) {
            const name = metaFile.replace('-metadata.yaml', '');
            const metadata = await this.getContractMetadata(serviceDir, typeDir, name);

            if (metadata) {
              const currentVersionMeta = metadata.versions.find((v) => v.version === metadata.currentVersion);
              results.push({
                service: serviceDir,
                type: typeDir,
                name,
                currentVersion: metadata.currentVersion,
                status: currentVersionMeta?.status || 'draft',
              });
            }
          }
        }
      }
    } catch {
    }

    return results;
  }

  async canRetireContract(service: string, type: string, name: string, version: string): Promise<{ canRetire: boolean; reasons: string[] }> {
    const metadata = await this.getContractMetadata(service, type, name);
    if (!metadata) {
      return { canRetire: false, reasons: ['Contract not found'] };
    }

    const versionMeta = metadata.versions.find((v) => v.version === version);
    if (!versionMeta) {
      return { canRetire: false, reasons: ['Version not found'] };
    }

    const reasons: string[] = [];

    if (versionMeta.status === 'active') {
      reasons.push('Version is currently active');
    }

    if (versionMeta.status !== 'deprecated') {
      reasons.push('Version should be deprecated before retirement');
    }

    const config = await this.configManager.loadConfig();
    const contractRef = this.formatContractRef(service, type, name, version);

    await this.graphService.syncFromConfig();
    const dependents = await this.findServicesUsingContract(contractRef);

    if (dependents.length > 0) {
      reasons.push(`Still referenced by ${dependents.length} service(s): ${dependents.join(', ')}`);
    }

    return {
      canRetire: reasons.length === 0,
      reasons,
    };
  }

  async findServicesUsingContract(contractRef: string): Promise<string[]> {
    await this.graphService.syncFromConfig();
    const ref = this.parseContractRef(contractRef);
    const dependents: string[] = [];

    const namespacePath = await this.getNamespacePath();
    const contractsDir = path.join(namespacePath, 'contracts');

    try {
      await fs.access(contractsDir);
      const serviceDirs = await fs.readdir(contractsDir);

      for (const serviceDir of serviceDirs) {
        if (serviceDir === ref.service) continue;
        if (serviceDir === 'external') continue;

        const servicePath = path.join(contractsDir, serviceDir);
        const stat = await fs.stat(servicePath);
        if (!stat.isDirectory()) continue;

        const configPath = path.join(namespacePath, '.nxsp', `${serviceDir}-config.yaml`);
        try {
          await fs.access(configPath);
          const content = await fs.readFile(configPath, 'utf-8');
          const serviceConfig = yaml.parse(content) as any;

          if (serviceConfig.depends) {
            for (const dep of Object.values(serviceConfig.depends)) {
              if (dep === contractRef) {
                dependents.push(serviceDir);
                break;
              }
            }
          }
        } catch {
        }
      }
    } catch {
    }

    return dependents;
  }
}
