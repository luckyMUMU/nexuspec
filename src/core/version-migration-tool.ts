import path from 'path';
import { promises as fs } from 'fs';
import yaml from 'yaml';
import type {
  ContractMigrationPlan,
  MigrationResult,
  ContractRef,
  NxspConfig,
} from '../types/index.js';
import { ContractLifecycleManager } from './contract-lifecycle-manager.js';
import { ConfigManager } from './config.js';
import { DependencyAnalyzer } from './dependency-analyzer.js';

export class VersionMigrationTool {
  private lifecycleManager: ContractLifecycleManager;
  private configManager: ConfigManager;
  private dependencyAnalyzer: DependencyAnalyzer;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.lifecycleManager = new ContractLifecycleManager(cwd);
    this.configManager = new ConfigManager(cwd);
    this.dependencyAnalyzer = new DependencyAnalyzer(cwd);
  }

  async createPromotionPlan(
    service: string,
    type: string,
    name: string,
    version: string,
    options?: {
      autoDeprecateOld?: boolean;
      autoUpdateDependents?: boolean;
    }
  ): Promise<ContractMigrationPlan> {
    const metadata = await this.lifecycleManager.getContractMetadata(service, type, name);
    if (!metadata) {
      throw new Error(`Contract not found: ${service}/${type}/${name}`);
    }

    const contractRef = this.lifecycleManager.formatContractRef(service, type, name, version);
    const affectedServices = await this.lifecycleManager.findServicesUsingContract(contractRef);

    const currentVersionMeta = metadata.versions.find((v) => v.version === metadata.currentVersion);
    const targetVersionMeta = metadata.versions.find((v) => v.version === version);

    if (!targetVersionMeta) {
      throw new Error(`Version ${version} not found`);
    }

    const migrationSteps = this.buildPromotionSteps(
      service,
      type,
      name,
      metadata.currentVersion,
      version,
      options
    );

    const riskLevel = this.calculateRiskLevel(
      affectedServices.length,
      targetVersionMeta.breakingChanges?.length || 0,
      !targetVersionMeta.backwardCompatible
    );

    return {
      contractRef,
      fromVersion: metadata.currentVersion,
      toVersion: version,
      fromStatus: currentVersionMeta?.status || 'active',
      toStatus: 'active',
      affectedServices,
      migrationSteps,
      riskLevel,
      requiresManualReview: riskLevel === 'high' || riskLevel === 'critical',
      migrationType: 'promote',
    };
  }

  async createRetirementPlan(
    service: string,
    type: string,
    name: string,
    version: string
  ): Promise<ContractMigrationPlan> {
    const metadata = await this.lifecycleManager.getContractMetadata(service, type, name);
    if (!metadata) {
      throw new Error(`Contract not found: ${service}/${type}/${name}`);
    }

    const contractRef = this.lifecycleManager.formatContractRef(service, type, name, version);
    const affectedServices = await this.lifecycleManager.findServicesUsingContract(contractRef);

    const versionMeta = metadata.versions.find((v) => v.version === version);

    if (!versionMeta) {
      throw new Error(`Version ${version} not found`);
    }

    const migrationSteps = this.buildRetirementSteps(
      service,
      type,
      name,
      version,
      metadata
    );

    const riskLevel = this.calculateRiskLevel(
      affectedServices.length,
      0,
      versionMeta.status === 'active'
    );

    return {
      contractRef,
      fromVersion: version,
      toVersion: version,
      fromStatus: versionMeta.status,
      toStatus: 'retired',
      affectedServices,
      migrationSteps,
      riskLevel,
      requiresManualReview: affectedServices.length > 0 || riskLevel !== 'low',
      migrationType: 'retire',
    };
  }

  async createDeprecationPlan(
    service: string,
    type: string,
    name: string,
    version: string
  ): Promise<ContractMigrationPlan> {
    const metadata = await this.lifecycleManager.getContractMetadata(service, type, name);
    if (!metadata) {
      throw new Error(`Contract not found: ${service}/${type}/${name}`);
    }

    const contractRef = this.lifecycleManager.formatContractRef(service, type, name, version);
    const affectedServices = await this.lifecycleManager.findServicesUsingContract(contractRef);

    const versionMeta = metadata.versions.find((v) => v.version === version);

    if (!versionMeta) {
      throw new Error(`Version ${version} not found`);
    }

    const migrationSteps = this.buildDeprecationSteps(
      service,
      type,
      name,
      version,
      metadata
    );

    const riskLevel = this.calculateRiskLevel(
      affectedServices.length,
      0,
      metadata.currentVersion === version
    );

    return {
      contractRef,
      fromVersion: version,
      toVersion: version,
      fromStatus: versionMeta.status,
      toStatus: 'deprecated',
      affectedServices,
      migrationSteps,
      riskLevel,
      requiresManualReview: metadata.currentVersion === version,
      migrationType: 'deprecate',
    };
  }

  private buildPromotionSteps(
    service: string,
    type: string,
    name: string,
    fromVersion: string,
    toVersion: string,
    options?: {
      autoDeprecateOld?: boolean;
      autoUpdateDependents?: boolean;
    }
  ): Array<{ step: number; description: string; action: string }> {
    const steps: Array<{ step: number; description: string; action: string }> = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      description: `Validate contract ${service}/${type}/${name} version ${toVersion}`,
      action: 'validate',
    });

    if (options?.autoDeprecateOld !== false && fromVersion !== toVersion) {
      steps.push({
        step: stepNum++,
        description: `Deprecate old version ${fromVersion}`,
        action: 'deprecate-old',
      });
    }

    steps.push({
      step: stepNum++,
      description: `Promote version ${toVersion} to active`,
      action: 'promote',
    });

    if (options?.autoUpdateDependents !== false) {
      steps.push({
        step: stepNum++,
        description: 'Update dependent services to use new version',
        action: 'update-dependents',
      });
    }

    steps.push({
      step: stepNum++,
      description: 'Update knowledge graph',
      action: 'update-graph',
    });

    return steps;
  }

  private buildRetirementSteps(
    service: string,
    type: string,
    name: string,
    version: string,
    metadata: any
  ): Array<{ step: number; description: string; action: string }> {
    const steps: Array<{ step: number; description: string; action: string }> = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      description: `Check if version ${version} can be retired`,
      action: 'validate-retirement',
    });

    const versionMeta = metadata.versions.find((v: any) => v.version === version);
    if (versionMeta?.status !== 'deprecated') {
      steps.push({
        step: stepNum++,
        description: `Deprecate version ${version} first`,
        action: 'deprecate-first',
      });
    }

    steps.push({
      step: stepNum++,
      description: `Notify dependent services about retirement`,
      action: 'notify-dependents',
    });

    steps.push({
      step: stepNum++,
      description: `Retire version ${version}`,
      action: 'retire',
    });

    steps.push({
      step: stepNum++,
      description: 'Update knowledge graph',
      action: 'update-graph',
    });

    return steps;
  }

  private buildDeprecationSteps(
    service: string,
    type: string,
    name: string,
    version: string,
    metadata: any
  ): Array<{ step: number; description: string; action: string }> {
    const steps: Array<{ step: number; description: string; action: string }> = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      description: `Validate deprecation of version ${version}`,
      action: 'validate-deprecation',
    });

    if (metadata.currentVersion === version) {
      const nextActive = metadata.versions.find(
        (v: any) => v.status === 'active' && v.version !== version
      );
      if (nextActive) {
        steps.push({
          step: stepNum++,
          description: `Set version ${nextActive.version} as active`,
          action: 'set-new-active',
        });
      }
    }

    steps.push({
      step: stepNum++,
      description: `Deprecate version ${version}`,
      action: 'deprecate',
    });

    steps.push({
      step: stepNum++,
      description: 'Notify dependent services',
      action: 'notify-dependents',
    });

    steps.push({
      step: stepNum++,
      description: 'Update knowledge graph',
      action: 'update-graph',
    });

    return steps;
  }

  private calculateRiskLevel(
    affectedServicesCount: number,
    breakingChangesCount: number,
    isBreaking: boolean
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (isBreaking && affectedServicesCount > 3) {
      return 'critical';
    }
    if (isBreaking && affectedServicesCount > 0) {
      return 'high';
    }
    if (breakingChangesCount > 2) {
      return 'high';
    }
    if (affectedServicesCount > 2) {
      return 'medium';
    }
    return 'low';
  }

  async executePromotion(
    plan: ContractMigrationPlan,
    options?: {
      dryRun?: boolean;
      autoUpdateDependents?: boolean;
    }
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const updatedServices: string[] = [];

    const ref = this.lifecycleManager.parseContractRef(plan.contractRef);

    try {
      for (const step of plan.migrationSteps) {
        if (step.action === 'validate') {
          const metadata = await this.lifecycleManager.getContractMetadata(
            ref.service,
            ref.type,
            ref.name
          );
          if (!metadata) {
            errors.push('Contract not found during validation');
            break;
          }
        } else if (step.action === 'deprecate-old') {
          if (!options?.dryRun) {
            try {
              await this.lifecycleManager.deprecateContract(
                ref.service,
                ref.type,
                ref.name,
                plan.fromVersion
              );
            } catch (e) {
              warnings.push(`Could not deprecate old version: ${(e as Error).message}`);
            }
          }
        } else if (step.action === 'promote') {
          if (!options?.dryRun) {
            await this.lifecycleManager.promoteContract(
              ref.service,
              ref.type,
              ref.name,
              plan.toVersion,
              { autoDeprecateOld: false }
            );
          }
        } else if (step.action === 'update-dependents' && options?.autoUpdateDependents) {
          if (!options?.dryRun) {
            const result = await this.updateDependentsToVersion(
              ref.service,
              ref.type,
              ref.name,
              plan.toVersion,
              plan.affectedServices
            );
            updatedServices.push(...result.updated);
            if (result.errors.length > 0) {
              errors.push(...result.errors);
            }
          }
        }
        step.completed = true;
      }
    } catch (e) {
      errors.push((e as Error).message);
    }

    return {
      success: errors.length === 0,
      contractRef: plan.contractRef,
      fromVersion: plan.fromVersion,
      toVersion: plan.toVersion,
      updatedServices,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  async executeRetirement(
    plan: ContractMigrationPlan,
    options?: {
      dryRun?: boolean;
      force?: boolean;
    }
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const updatedServices: string[] = [];

    const ref = this.lifecycleManager.parseContractRef(plan.contractRef);

    try {
      for (const step of plan.migrationSteps) {
        if (step.action === 'validate-retirement') {
          const check = await this.lifecycleManager.canRetireContract(
            ref.service,
            ref.type,
            ref.name,
            plan.fromVersion
          );
          if (!check.canRetire && !options?.force) {
            errors.push(...check.reasons);
            break;
          }
        } else if (step.action === 'deprecate-first') {
          if (!options?.dryRun && !options?.force) {
            try {
              await this.lifecycleManager.deprecateContract(
                ref.service,
                ref.type,
                ref.name,
                plan.fromVersion
              );
            } catch (e) {
              warnings.push(`Could not deprecate: ${(e as Error).message}`);
            }
          }
        } else if (step.action === 'retire') {
          if (!options?.dryRun) {
            await this.lifecycleManager.retireContract(
              ref.service,
              ref.type,
              ref.name,
              plan.fromVersion,
              { force: options?.force }
            );
          }
        }
        step.completed = true;
      }
    } catch (e) {
      errors.push((e as Error).message);
    }

    return {
      success: errors.length === 0,
      contractRef: plan.contractRef,
      fromVersion: plan.fromVersion,
      toVersion: plan.toVersion,
      updatedServices,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  async executeDeprecation(
    plan: ContractMigrationPlan,
    options?: {
      dryRun?: boolean;
    }
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const updatedServices: string[] = [];

    const ref = this.lifecycleManager.parseContractRef(plan.contractRef);

    try {
      for (const step of plan.migrationSteps) {
        if (step.action === 'validate-deprecation') {
        } else if (step.action === 'set-new-active') {
          const metadata = await this.lifecycleManager.getContractMetadata(
            ref.service,
            ref.type,
            ref.name
          );
          if (metadata) {
            const nextActive = metadata.versions.find(
              (v) => v.status === 'active' && v.version !== plan.fromVersion
            );
            if (nextActive && !options?.dryRun) {
              await this.lifecycleManager.promoteContract(
                ref.service,
                ref.type,
                ref.name,
                nextActive.version
              );
            }
          }
        } else if (step.action === 'deprecate') {
          if (!options?.dryRun) {
            await this.lifecycleManager.deprecateContract(
              ref.service,
              ref.type,
              ref.name,
              plan.fromVersion
            );
          }
        }
        step.completed = true;
      }
    } catch (e) {
      errors.push((e as Error).message);
    }

    return {
      success: errors.length === 0,
      contractRef: plan.contractRef,
      fromVersion: plan.fromVersion,
      toVersion: plan.toVersion,
      updatedServices,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  async updateDependentsToVersion(
    service: string,
    type: string,
    name: string,
    newVersion: string,
    affectedServices: string[]
  ): Promise<{ updated: string[]; errors: string[] }> {
    const updated: string[] = [];
    const errors: string[] = [];
    const namespacePath = await this.configManager.getNamespaceLocalPath(
      await this.configManager.loadConfig()
    );

    for (const dependentService of affectedServices) {
      try {
        const configPath = path.join(namespacePath, '.nxsp', `${dependentService}-config.yaml`);
        await fs.access(configPath);

        const content = await fs.readFile(configPath, 'utf-8');
        const config = yaml.parse(content) as NxspConfig;

        let updatedRef = false;
        if (config.depends) {
          for (const [key, ref] of Object.entries(config.depends)) {
            try {
              const parsedRef = this.lifecycleManager.parseContractRef(ref);
              if (
                parsedRef.service === service &&
                parsedRef.type === type &&
                parsedRef.name === name
              ) {
                const newRef = this.lifecycleManager.formatContractRef(
                  service,
                  type,
                  name,
                  newVersion
                );
                config.depends[key] = newRef;
                updatedRef = true;
              }
            } catch {
            }
          }
        }

        if (updatedRef) {
          await fs.writeFile(configPath, yaml.stringify(config), 'utf-8');
          updated.push(dependentService);
        }
      } catch (e) {
        errors.push(`Failed to update ${dependentService}: ${(e as Error).message}`);
      }
    }

    return { updated, errors };
  }

  async findOutdatedReferences(
    service: string,
    type: string,
    name: string
  ): Promise<Array<{ service: string; currentVersion: string; latestVersion: string }>> {
    const metadata = await this.lifecycleManager.getContractMetadata(service, type, name);
    if (!metadata) return [];

    const results: Array<{ service: string; currentVersion: string; latestVersion: string }> = [];

    for (const versionMeta of metadata.versions) {
      if (versionMeta.version !== metadata.latestVersion) {
        const ref = this.lifecycleManager.formatContractRef(
          service,
          type,
          name,
          versionMeta.version
        );
        const dependents = await this.lifecycleManager.findServicesUsingContract(ref);

        for (const dep of dependents) {
          results.push({
            service: dep,
            currentVersion: versionMeta.version,
            latestVersion: metadata.latestVersion,
          });
        }
      }
    }

    return results;
  }

  async getMigrationHistory(
    service: string,
    type: string,
    name: string
  ): Promise<Array<{ version: string; status: string; timestamp: string; action: string }>> {
    const metadata = await this.lifecycleManager.getContractMetadata(service, type, name);
    if (!metadata) return [];

    const history: Array<{ version: string; status: string; timestamp: string; action: string }> = [];

    for (const versionMeta of metadata.versions) {
      if (versionMeta.createdAt) {
        history.push({
          version: versionMeta.version,
          status: versionMeta.status,
          timestamp: versionMeta.createdAt,
          action: 'created',
        });
      }
      if (versionMeta.deprecatedAt) {
        history.push({
          version: versionMeta.version,
          status: 'deprecated',
          timestamp: versionMeta.deprecatedAt,
          action: 'deprecated',
        });
      }
      if (versionMeta.retiredAt) {
        history.push({
          version: versionMeta.version,
          status: 'retired',
          timestamp: versionMeta.retiredAt,
          action: 'retired',
        });
      }
    }

    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
