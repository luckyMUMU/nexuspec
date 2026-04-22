import { promises as fs } from 'fs';
import path from 'path';
import type {
  CompatibilityCheckResult,
  CompatibilityRule,
  ContractDiff,
  ContractChangeType,
  CompatibilityRuleType,
} from '../types/index.js';

export class CompatibilityValidator {
  private rules: CompatibilityRule[] = [
    {
      type: 'add_optional_field',
      backwardCompatible: true,
      breaking: false,
      riskLevel: 'low',
      description: 'Adding an optional field is backward compatible',
      autoApprovable: true,
    },
    {
      type: 'add_endpoint',
      backwardCompatible: true,
      breaking: false,
      riskLevel: 'low',
      description: 'Adding a new endpoint is backward compatible',
      autoApprovable: true,
    },
    {
      type: 'deprecate_field',
      backwardCompatible: true,
      breaking: false,
      riskLevel: 'medium',
      description: 'Deprecating a field is backward compatible but should be communicated',
      autoApprovable: true,
    },
    {
      type: 'remove_field',
      backwardCompatible: false,
      breaking: true,
      riskLevel: 'high',
      description: 'Removing a field is a breaking change',
      autoApprovable: false,
    },
    {
      type: 'change_field_type',
      backwardCompatible: false,
      breaking: true,
      riskLevel: 'high',
      description: 'Changing a field type is a breaking change',
      autoApprovable: false,
    },
    {
      type: 'change_endpoint_path',
      backwardCompatible: false,
      breaking: true,
      riskLevel: 'high',
      description: 'Changing an endpoint path is a breaking change',
      autoApprovable: false,
    },
    {
      type: 'add_required_field',
      backwardCompatible: false,
      breaking: true,
      riskLevel: 'high',
      description: 'Adding a required field is a breaking change',
      autoApprovable: false,
    },
    {
      type: 'add_event',
      backwardCompatible: true,
      breaking: false,
      riskLevel: 'low',
      description: 'Adding a new event is backward compatible',
      autoApprovable: true,
    },
    {
      type: 'remove_event',
      backwardCompatible: false,
      breaking: true,
      riskLevel: 'high',
      description: 'Removing an event is a breaking change',
      autoApprovable: false,
    },
    {
      type: 'change_event_schema',
      backwardCompatible: false,
      breaking: true,
      riskLevel: 'medium',
      description: 'Changing an event schema may break consumers',
      autoApprovable: false,
    },
  ];

  constructor() {}

  getRules(): CompatibilityRule[] {
    return this.rules;
  }

  getRule(type: CompatibilityRuleType): CompatibilityRule | undefined {
    return this.rules.find((rule) => rule.type === type);
  }

  async validateCompatibility(
    oldContract: any,
    newContract: any,
    options?: { strict?: boolean }
  ): Promise<CompatibilityCheckResult> {
    const issues: CompatibilityCheckResult['issues'] = [];
    const changes = this.compareContracts(oldContract, newContract);

    for (const addition of changes.additions) {
      const analysis = this.analyzeAddition(addition);
      if (analysis) {
        issues.push(analysis);
      }
    }

    for (const removal of changes.removals) {
      const analysis = this.analyzeRemoval(removal);
      if (analysis) {
        issues.push(analysis);
      }
    }

    for (const modification of changes.modifications) {
      const analysis = this.analyzeModification(modification);
      if (analysis) {
        issues.push(analysis);
      }
    }

    const hasBreakingChanges = issues.some((issue) => issue.severity === 'error');
    const compatible = !hasBreakingChanges || !options?.strict;
    const changeType = this.determineChangeType(issues);

    const summary = this.generateSummary(issues, compatible, changeType);

    return {
      compatible,
      changeType,
      issues,
      summary,
    };
  }

  async validateFromPaths(
    oldContractPath: string,
    newContractPath: string,
    options?: { strict?: boolean }
  ): Promise<CompatibilityCheckResult> {
    const [oldContent, newContent] = await Promise.all([
      fs.readFile(oldContractPath, 'utf-8'),
      fs.readFile(newContractPath, 'utf-8'),
    ]);

    const oldContract = this.parseContract(oldContractPath, oldContent);
    const newContract = this.parseContract(newContractPath, newContent);

    return this.validateCompatibility(oldContract, newContract, options);
  }

  private parseContract(filePath: string, content: string): any {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      const yaml = require('yaml');
      return yaml.parse(content);
    } else if (ext === '.json') {
      return JSON.parse(content);
    }
    throw new Error(`Unsupported contract format: ${ext}`);
  }

  private compareContracts(oldContract: any, newContract: any): ContractDiff {
    const additions: ContractDiff['additions'] = [];
    const removals: ContractDiff['removals'] = [];
    const modifications: ContractDiff['modifications'] = [];

    this.deepCompare('', oldContract, newContract, additions, removals, modifications);

    return {
      oldVersion: oldContract?.info?.version || 'unknown',
      newVersion: newContract?.info?.version || 'unknown',
      additions,
      removals,
      modifications,
    };
  }

  private deepCompare(
    path: string,
    oldObj: any,
    newObj: any,
    additions: ContractDiff['additions'],
    removals: ContractDiff['removals'],
    modifications: ContractDiff['modifications']
  ): void {
    if (oldObj === newObj) return;

    if (oldObj === undefined || oldObj === null) {
      additions.push({
        path: path || '/',
        type: typeof newObj,
        description: `Added ${path || 'root'}`,
      });
      return;
    }

    if (newObj === undefined || newObj === null) {
      removals.push({
        path: path || '/',
        type: typeof oldObj,
        description: `Removed ${path || 'root'}`,
      });
      return;
    }

    if (typeof oldObj !== typeof newObj) {
      modifications.push({
        path: path || '/',
        oldValue: oldObj,
        newValue: newObj,
        description: `Type changed from ${typeof oldObj} to ${typeof newObj}`,
      });
      return;
    }

    if (typeof oldObj !== 'object' || oldObj === null || newObj === null) {
      if (oldObj !== newObj) {
        modifications.push({
          path: path || '/',
          oldValue: oldObj,
          newValue: newObj,
          description: `Value changed from ${oldObj} to ${newObj}`,
        });
      }
      return;
    }

    const oldKeys = Object.keys(oldObj);
    const newKeys = Object.keys(newObj);

    for (const key of oldKeys) {
      const newPath = path ? `${path}.${key}` : key;
      if (!newKeys.includes(key)) {
        removals.push({
          path: newPath,
          type: typeof oldObj[key],
          description: `Removed ${newPath}`,
        });
      } else {
        this.deepCompare(newPath, oldObj[key], newObj[key], additions, removals, modifications);
      }
    }

    for (const key of newKeys) {
      const newPath = path ? `${path}.${key}` : key;
      if (!oldKeys.includes(key)) {
        additions.push({
          path: newPath,
          type: typeof newObj[key],
          description: `Added ${newPath}`,
        });
      }
    }
  }

  private analyzeAddition(addition: ContractDiff['additions'][0]): CompatibilityCheckResult['issues'][0] | null {
    const path = addition.path.toLowerCase();

    if (path.includes('paths') || path.includes('endpoints')) {
      return {
        severity: 'info',
        message: `Added new endpoint: ${addition.path}`,
        rule: 'add_endpoint',
        path: addition.path,
      };
    }

    if (path.includes('events')) {
      return {
        severity: 'info',
        message: `Added new event: ${addition.path}`,
        rule: 'add_event',
        path: addition.path,
      };
    }

    if (path.includes('properties')) {
      return {
        severity: 'info',
        message: `Added property: ${addition.path}`,
        rule: 'add_optional_field',
        path: addition.path,
      };
    }

    if (path.includes('required')) {
      return {
        severity: 'error',
        message: `Added required field: ${addition.path}`,
        rule: 'add_required_field',
        path: addition.path,
      };
    }

    return {
      severity: 'info',
      message: `Added: ${addition.path}`,
      path: addition.path,
    };
  }

  private analyzeRemoval(removal: ContractDiff['removals'][0]): CompatibilityCheckResult['issues'][0] | null {
    const path = removal.path.toLowerCase();

    if (path.includes('paths') || path.includes('endpoints')) {
      return {
        severity: 'error',
        message: `Removed endpoint: ${removal.path}`,
        rule: 'change_endpoint_path',
        path: removal.path,
      };
    }

    if (path.includes('events')) {
      return {
        severity: 'error',
        message: `Removed event: ${removal.path}`,
        rule: 'remove_event',
        path: removal.path,
      };
    }

    if (path.includes('properties')) {
      return {
        severity: 'error',
        message: `Removed property: ${removal.path}`,
        rule: 'remove_field',
        path: removal.path,
      };
    }

    return {
      severity: 'warning',
      message: `Removed: ${removal.path}`,
      path: removal.path,
    };
  }

  private analyzeModification(
    modification: ContractDiff['modifications'][0]
  ): CompatibilityCheckResult['issues'][0] | null {
    const path = modification.path.toLowerCase();

    if (path.includes('type')) {
      return {
        severity: 'error',
        message: `Changed field type at ${modification.path}: ${modification.oldValue} -> ${modification.newValue}`,
        rule: 'change_field_type',
        path: modification.path,
      };
    }

    if (path.includes('paths') || path.includes('endpoints')) {
      return {
        severity: 'warning',
        message: `Modified endpoint: ${modification.path}`,
        rule: 'change_endpoint_path',
        path: modification.path,
      };
    }

    if (path.includes('events')) {
      return {
        severity: 'warning',
        message: `Modified event schema: ${modification.path}`,
        rule: 'change_event_schema',
        path: modification.path,
      };
    }

    if (path.includes('deprecated')) {
      return {
        severity: 'info',
        message: `Deprecated field: ${modification.path}`,
        rule: 'deprecate_field',
        path: modification.path,
      };
    }

    return {
      severity: 'info',
      message: `Modified: ${modification.path}`,
      path: modification.path,
    };
  }

  private determineChangeType(issues: CompatibilityCheckResult['issues']): ContractChangeType {
    const hasErrors = issues.some((issue) => issue.severity === 'error');
    const hasWarnings = issues.some((issue) => issue.severity === 'warning');

    if (hasErrors) {
      return 'breaking';
    } else if (hasWarnings) {
      return 'minor';
    } else if (issues.length > 0) {
      return 'patch';
    } else {
      return 'compatible';
    }
  }

  private generateSummary(
    issues: CompatibilityCheckResult['issues'],
    compatible: boolean,
    changeType: ContractChangeType
  ): string {
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const infoCount = issues.filter((i) => i.severity === 'info').length;

    const parts: string[] = [];

    if (compatible) {
      parts.push('Contract changes are compatible');
    } else {
      parts.push('Contract changes contain breaking changes');
    }

    parts.push(`(change type: ${changeType})`);

    if (errorCount > 0 || warningCount > 0 || infoCount > 0) {
      const counts: string[] = [];
      if (errorCount > 0) counts.push(`${errorCount} errors`);
      if (warningCount > 0) counts.push(`${warningCount} warnings`);
      if (infoCount > 0) counts.push(`${infoCount} info`);
      parts.push(`- ${counts.join(', ')}`);
    }

    return parts.join(' ');
  }
}
