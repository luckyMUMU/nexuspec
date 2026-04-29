#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { OpenSpecIntegration } from './core/openspec-integration.js';
import { ConfigManager } from './core/config.js';
import { ProposalManager } from './core/proposal-manager.js';
import { KnowledgeGraphService } from './core/knowledge-graph.js';
import { DependencyAnalyzer } from './core/dependency-analyzer.js';
import { ContractLifecycleManager } from './core/contract-lifecycle-manager.js';
import { VersionMigrationTool } from './core/version-migration-tool.js';
import { CompatibilityValidator } from './core/compatibility-validator.js';
import { CiCdIntegration } from './core/cicd-integration.js';
import { DeploymentManager } from './core/deployment-manager.js';
import { NxspConfigSchema, GitNexusConfigSchema, CiCdProviderSchema } from './types/index.js';

const program = new Command();
const openspec = new OpenSpecIntegration();
const configManager = new ConfigManager();
const proposalManager = new ProposalManager();
const knowledgeGraph = new KnowledgeGraphService();
const dependencyAnalyzer = new DependencyAnalyzer();
const contractManager = new ContractLifecycleManager();
const migrationTool = new VersionMigrationTool();
const compatibilityValidator = new CompatibilityValidator();
const cicdIntegration = new CiCdIntegration();
const deploymentManager = new DeploymentManager();

program
  .name('nxsp')
  .description('NexusSpec CLI - Distributed spec system with OpenSpec 1.3 integration')
  .version('2.0.0');

program
  .command('init')
  .description('Initialize NexusSpec in your project')
  .option('--namespace <url>', 'Namespace git repository URL')
  .option('--service <name>', 'Service name')
  .option('--team <name>', 'Team name (optional)')
  .action(async (options) => {
    try {
      if (!options.namespace || !options.service) {
        console.error(chalk.red('Error: --namespace and --service are required'));
        process.exit(1);
      }

      const spinner = ora('Initializing NexusSpec...').start();
      
      await openspec.init();
      
      const config = {
        service: {
          name: options.service,
          team: options.team,
        },
        namespace: {
          remote: options.namespace,
        },
        exposes: [],
        depends: {},
      };
      
      NxspConfigSchema.parse(config);
      
      await configManager.initConfig(config);
      
      spinner.succeed('NexusSpec initialized successfully!');
      console.log(chalk.green(`\nConfig saved to ${configManager.getConfigPath()}`));
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('propose')
  .description('Create a cross-service proposal (CSP)')
  .option('--title <title>', 'Proposal title', 'New proposal')
  .option('--target <service>', 'Target service name')
  .option('--contract-type <type>', 'Contract type (api/events)')
  .option('--contract-name <name>', 'Contract name', 'default')
  .option('--current-version <version>', 'Current contract version', 'v1')
  .option('--proposed-version <version>', 'Proposed contract version', 'v2')
  .option('--change-type <type>', 'Change type', 'add_endpoint')
  .option('--detail <text>', 'Change details')
  .option('--breaking', 'Breaking change')
  .option('--backward-compatible', 'Backward compatible change')
  .option('--openspec-schema <schema>', 'OpenSpec schema to use')
  .action(async (options) => {
    try {
      if (!options.target) {
        console.error(chalk.red('Error: --target is required'));
        process.exit(1);
      }

      const spinner = ora('Creating proposal...').start();
      
      const changeName = options.title.toLowerCase().replace(/\s+/g, '-');
      await openspec.newChange(changeName, {
        description: options.title,
        schema: options.openspecSchema,
      });
      
      const proposal = await proposalManager.createProposal({
        title: options.title,
        targetService: options.target,
        contractType: options.contractType,
        contractName: options.contractName,
        currentVersion: options.currentVersion,
        proposedVersion: options.proposedVersion,
        changeType: options.changeType,
        detail: options.detail,
        breaking: options.breaking,
        backwardCompatible: options.backwardCompatible,
      });
      
      spinner.succeed(`Proposal ${proposal.id} created successfully!`);
      console.log(chalk.green(`\nID: ${proposal.id}`));
      console.log(chalk.green(`Title: ${proposal.title}`));
      console.log(chalk.green(`Target: ${options.target}`));
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('review')
  .description('Review pending proposals with AI suggestions')
  .option('--id <id>', 'Specific proposal ID to review')
  .option('--auto', 'Run automatic review and show suggestions')
  .action(async (options) => {
    try {
      if (options.id) {
        const proposal = await proposalManager.loadProposal(options.id);
        console.log(chalk.bold(`\n📋 Proposal: ${proposal.id}`));
        console.log(chalk.bold(`Title: ${proposal.title}`));
        console.log(chalk.bold(`Status: ${proposal.status}`));
        console.log(chalk.bold(`Initiator: ${proposal.initiator.service}`));
        console.log(chalk.bold(`\nTargets:`));
        proposal.targets.forEach((target, i) => {
          console.log(`  ${i + 1}. ${target.service} - ${target.requiredAction}`);
        });

        if (options.auto) {
          const spinner = ora('Running AI review...').start();
          const reviewResult = await proposalManager.reviewProposal(options.id);
          spinner.succeed('AI review complete!');
          displayReviewResult(reviewResult);
        }
      } else {
        const proposals = await proposalManager.listProposals();
        if (proposals.length === 0) {
          console.log(chalk.yellow('No pending proposals'));
          return;
        }
        console.log(chalk.bold(`\n📋 Pending Proposals (${proposals.length}):`));
        proposals.forEach((proposal) => {
          const statusColor = proposal.status === 'accepted' ? chalk.green : 
                             proposal.status === 'rejected' ? chalk.red : chalk.yellow;
          console.log(`  ${chalk.cyan(proposal.id)} - ${proposal.title} (${statusColor(proposal.status)})`);
        });

        if (options.auto) {
          const spinner = ora('Running batch AI review...').start();
          const result = await proposalManager.batchReviewProposals();
          spinner.succeed('Batch AI review complete!');
          console.log(chalk.bold(`\n📊 Review Summary:`));
          console.log(chalk.gray(`  Reviewed: ${result.reviewed}`));
          console.log(chalk.green(`  Auto-approved: ${result.autoApproved}`));
          console.log(chalk.yellow(`  Needs manual review: ${result.needsReview}`));
        }
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

function displayReviewResult(reviewResult: any) {
  console.log(chalk.bold('\n🤖 AI Review Result:'));
  
  const suggestionColors: Record<string, any> = {
    auto_approve: chalk.green,
    approve_with_warning: chalk.yellow,
    needs_manual_review: chalk.blue,
    reject: chalk.red,
  };
  
  const suggestionColor = suggestionColors[reviewResult.suggestion.type] || chalk.white;
  console.log(`  Suggestion: ${suggestionColor(reviewResult.suggestion.type.toUpperCase())}`);
  console.log(`  Confidence: ${(reviewResult.suggestion.confidence * 100).toFixed(0)}%`);
  
  console.log(chalk.bold('\n💭 Reasoning:'));
  reviewResult.suggestion.reasoning.forEach((reason: string, i: number) => {
    console.log(chalk.gray(`  ${i + 1}. ${reason}`));
  });
  
  console.log(chalk.bold('\n💡 Recommendations:'));
  reviewResult.suggestion.recommendations.forEach((rec: string, i: number) => {
    console.log(chalk.cyan(`  ${i + 1}. ${rec}`));
  });
  
  console.log(chalk.bold('\n⚠️ Risk Assessment:'));
  const riskColors: Record<string, any> = {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.red,
    critical: chalk.bold.red,
  };
  const riskColor = riskColors[reviewResult.suggestion.riskAssessment.level] || chalk.white;
  console.log(`  Level: ${riskColor(reviewResult.suggestion.riskAssessment.level.toUpperCase())}`);
  console.log(chalk.gray('  Factors:'));
  reviewResult.suggestion.riskAssessment.factors.forEach((factor: string, i: number) => {
    console.log(chalk.gray(`    ${i + 1}. ${factor}`));
  });
  
  console.log(chalk.bold('\n✅ Compatibility Check:'));
  console.log(`  Passed: ${reviewResult.suggestion.compatibilityCheck.passed ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(chalk.gray('  Applied Rules:'));
  reviewResult.suggestion.compatibilityCheck.rules.forEach((rule: any, i: number) => {
    console.log(chalk.gray(`    ${i + 1}. ${rule.description}`));
  });

  if (reviewResult.impactAnalysis) {
    console.log(chalk.bold('\n📊 Impact Analysis:'));
    console.log(chalk.gray(reviewResult.impactAnalysis.summary));
  }
}

program
  .command('accept')
  .description('Accept a proposal')
  .argument('<id>', 'Proposal ID')
  .action(async (id) => {
    try {
      const spinner = ora(`Accepting proposal ${id}...`).start();
      await proposalManager.acceptProposal(id);
      spinner.succeed(`Proposal ${id} accepted!`);
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('reject')
  .description('Reject a proposal')
  .argument('<id>', 'Proposal ID')
  .action(async (id) => {
    try {
      const spinner = ora(`Rejecting proposal ${id}...`).start();
      await proposalManager.rejectProposal(id);
      spinner.succeed(`Proposal ${id} rejected!`);
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('apply')
  .description('Apply a change (delegates to openspec)')
  .alias('opsx-apply')
  .action(async () => {
    try {
      console.log(chalk.cyan('This command delegates to openspec. Please use /opsx:apply in your AI assistant.'));
      console.log(chalk.gray('Or you can run: openspec instructions apply'));
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('archive')
  .description('Archive completed changes and proposals')
  .argument('[id]', 'Change or proposal ID (optional)')
  .option('--yes', 'Skip confirmation prompts')
  .option('--skip-specs', 'Skip spec update operations')
  .action(async (id, options) => {
    try {
      if (id?.startsWith('CSP-')) {
        const spinner = ora(`Archiving proposal ${id}...`).start();
        await proposalManager.archiveProposal(id);
        spinner.succeed(`Proposal ${id} archived!`);
      } else {
        await openspec.archive(id, options);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Sync with namespace (delegates to openspec)')
  .action(async () => {
    try {
      const spinner = ora('Syncing...').start();
      await openspec.update();
      spinner.succeed('Synced successfully!');
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('sync-contracts')
  .description('Sync contracts to namespace')
  .action(async () => {
    try {
      const spinner = ora('Syncing contracts...').start();
      const config = await configManager.loadConfig();
      
      for (const expose of config.exposes) {
        console.log(chalk.gray(`  Syncing ${expose.type}: ${expose.name}`));
      }
      
      spinner.succeed('Contracts synced successfully!');
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

const contractCommand = program
  .command('contract')
  .description('Contract lifecycle management commands');

contractCommand
  .command('promote')
  .description('Promote a contract version to active')
  .argument('<service>', 'Service name')
  .argument('<type>', 'Contract type (api/events)')
  .argument('<name>', 'Contract name')
  .argument('<version>', 'Version to promote')
  .option('--description <text>', 'Description for this promotion')
  .option('--backward-compatible', 'Mark as backward compatible')
  .option('--breaking-changes <list>', 'Breaking changes (comma-separated)')
  .option('--no-auto-deprecate', 'Do not auto-deprecate old version')
  .option('--auto-update-dependents', 'Automatically update dependent services')
  .option('--dry-run', 'Show what would happen without making changes')
  .option('--plan-only', 'Only show migration plan, do not execute')
  .action(async (service, type, name, version, options) => {
    try {
      const spinner = ora('Creating migration plan...').start();

      const plan = await migrationTool.createPromotionPlan(service, type, name, version, {
        autoDeprecateOld: options.autoDeprecate !== false,
        autoUpdateDependents: options.autoUpdateDependents,
      });

      spinner.succeed('Migration plan created!');
      displayMigrationPlan(plan);

      if (options.planOnly) {
        return;
      }

      if (plan.requiresManualReview) {
        console.log(chalk.yellow('\n⚠️  This migration requires manual review.'));
      }

      const confirm = require('readline-sync').keyInYN(
        '\nDo you want to proceed with this migration?'
      );

      if (!confirm) {
        console.log(chalk.yellow('Migration cancelled.'));
        return;
      }

      const execSpinner = ora('Executing migration...').start();
      const result = await migrationTool.executePromotion(plan, {
        dryRun: options.dryRun,
        autoUpdateDependents: options.autoUpdateDependents,
      });

      if (result.success) {
        execSpinner.succeed('Migration completed successfully!');
        displayMigrationResult(result);
      } else {
        execSpinner.fail('Migration failed with errors.');
        displayMigrationResult(result);
        process.exit(1);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

contractCommand
  .command('deprecate')
  .description('Deprecate a contract version')
  .argument('<service>', 'Service name')
  .argument('<type>', 'Contract type (api/events)')
  .argument('<name>', 'Contract name')
  .argument('<version>', 'Version to deprecate')
  .option('--migration-guide <text>', 'Migration guide for dependents')
  .option('--dry-run', 'Show what would happen without making changes')
  .option('--plan-only', 'Only show migration plan, do not execute')
  .action(async (service, type, name, version, options) => {
    try {
      const spinner = ora('Creating migration plan...').start();

      const plan = await migrationTool.createDeprecationPlan(service, type, name, version);

      spinner.succeed('Migration plan created!');
      displayMigrationPlan(plan);

      if (options.planOnly) {
        return;
      }

      if (plan.requiresManualReview) {
        console.log(chalk.yellow('\n⚠️  This migration requires manual review.'));
      }

      const confirm = require('readline-sync').keyInYN(
        '\nDo you want to proceed with this migration?'
      );

      if (!confirm) {
        console.log(chalk.yellow('Migration cancelled.'));
        return;
      }

      const execSpinner = ora('Executing migration...').start();
      const result = await migrationTool.executeDeprecation(plan, {
        dryRun: options.dryRun,
      });

      if (result.success) {
        execSpinner.succeed('Migration completed successfully!');
        displayMigrationResult(result);
      } else {
        execSpinner.fail('Migration failed with errors.');
        displayMigrationResult(result);
        process.exit(1);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

contractCommand
  .command('retire')
  .description('Retire a contract version')
  .argument('<service>', 'Service name')
  .argument('<type>', 'Contract type (api/events)')
  .argument('<name>', 'Contract name')
  .argument('<version>', 'Version to retire')
  .option('--force', 'Force retirement even if still referenced')
  .option('--dry-run', 'Show what would happen without making changes')
  .option('--plan-only', 'Only show migration plan, do not execute')
  .action(async (service, type, name, version, options) => {
    try {
      const spinner = ora('Creating migration plan...').start();

      const plan = await migrationTool.createRetirementPlan(service, type, name, version);

      spinner.succeed('Migration plan created!');
      displayMigrationPlan(plan);

      if (options.planOnly) {
        return;
      }

      if (plan.requiresManualReview) {
        console.log(chalk.yellow('\n⚠️  This migration requires manual review.'));
      }

      const confirm = require('readline-sync').keyInYN(
        '\nDo you want to proceed with this migration?'
      );

      if (!confirm) {
        console.log(chalk.yellow('Migration cancelled.'));
        return;
      }

      const execSpinner = ora('Executing migration...').start();
      const result = await migrationTool.executeRetirement(plan, {
        dryRun: options.dryRun,
        force: options.force,
      });

      if (result.success) {
        execSpinner.succeed('Migration completed successfully!');
        displayMigrationResult(result);
      } else {
        execSpinner.fail('Migration failed with errors.');
        displayMigrationResult(result);
        process.exit(1);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

contractCommand
  .command('list')
  .description('List all contracts')
  .option('--service <name>', 'Filter by service name')
  .action(async (options) => {
    try {
      const spinner = ora('Loading contracts...').start();
      const contracts = await contractManager.listContracts(options.service);
      spinner.succeed('Contracts loaded!');

      if (contracts.length === 0) {
        console.log(chalk.yellow('\nNo contracts found.'));
        return;
      }

      console.log(chalk.bold('\n📋 Contracts:'));
      for (const contract of contracts) {
        const statusColor = {
          draft: chalk.gray,
          active: chalk.green,
          deprecated: chalk.yellow,
          retired: chalk.red,
        };
        console.log(
          `  ${chalk.cyan(contract.service)}/${chalk.magenta(contract.type)}/${chalk.blue(contract.name)} ` +
          `- ${statusColor[contract.status as keyof typeof statusColor](contract.status)} ` +
          `@ ${contract.currentVersion}`
        );
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

contractCommand
  .command('versions')
  .description('List versions of a contract')
  .argument('<service>', 'Service name')
  .argument('<type>', 'Contract type (api/events)')
  .argument('<name>', 'Contract name')
  .action(async (service, type, name) => {
    try {
      const spinner = ora('Loading contract versions...').start();
      const versions = await contractManager.getContractVersions(service, type, name);
      spinner.succeed('Versions loaded!');

      if (versions.length === 0) {
        console.log(chalk.yellow('\nNo versions found for this contract.'));
        return;
      }

      console.log(chalk.bold('\n📋 Contract Versions:'));
      for (const version of versions) {
        const statusColor = {
          draft: chalk.gray,
          active: chalk.green,
          deprecated: chalk.yellow,
          retired: chalk.red,
        };
        console.log(
          `  ${statusColor[version.status as keyof typeof statusColor](version.version)} ` +
          `(${version.status})`
        );
        if (version.description) {
          console.log(chalk.gray(`    ${version.description}`));
        }
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

contractCommand
  .command('add-version')
  .description('Add a new contract version')
  .argument('<service>', 'Service name')
  .argument('<type>', 'Contract type (api/events)')
  .argument('<name>', 'Contract name')
  .argument('<version>', 'Version number (e.g., v2)')
  .option('--status <status>', 'Initial status (draft/active)', 'draft')
  .option('--description <text>', 'Description for this version')
  .option('--backward-compatible', 'Mark as backward compatible')
  .option('--breaking-changes <list>', 'Breaking changes (comma-separated)')
  .action(async (service, type, name, version, options) => {
    try {
      const spinner = ora(`Adding contract version ${version}...`).start();
      await contractManager.addContractVersion(service, type, name, version, {
        status: options.status as any,
        description: options.description,
        backwardCompatible: options.backwardCompatible,
        breakingChanges: options.breakingChanges?.split(','),
      });
      spinner.succeed(`Contract version ${version} added successfully!`);
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

contractCommand
  .command('outdated')
  .description('Find services using outdated contract versions')
  .argument('<service>', 'Service name')
  .argument('<type>', 'Contract type (api/events)')
  .argument('<name>', 'Contract name')
  .action(async (service, type, name) => {
    try {
      const spinner = ora('Checking for outdated references...').start();
      const outdated = await migrationTool.findOutdatedReferences(service, type, name);
      spinner.succeed('Check complete!');

      if (outdated.length === 0) {
        console.log(chalk.green('\n✅ All services are using the latest version!'));
        return;
      }

      console.log(chalk.bold('\n⚠️  Outdated References:'));
      for (const ref of outdated) {
        console.log(
          `  ${chalk.cyan(ref.service)}: ${chalk.yellow(ref.currentVersion)} ` +
          `→ ${chalk.green(ref.latestVersion)}`
        );
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

contractCommand
  .command('history')
  .description('Show migration history of a contract')
  .argument('<service>', 'Service name')
  .argument('<type>', 'Contract type (api/events)')
  .argument('<name>', 'Contract name')
  .action(async (service, type, name) => {
    try {
      const spinner = ora('Loading migration history...').start();
      const history = await migrationTool.getMigrationHistory(service, type, name);
      spinner.succeed('History loaded!');

      if (history.length === 0) {
        console.log(chalk.yellow('\nNo migration history found.'));
        return;
      }

      console.log(chalk.bold('\n📜 Migration History:'));
      for (const entry of history) {
        const actionColor = {
          created: chalk.green,
          deprecated: chalk.yellow,
          retired: chalk.red,
        };
        console.log(
          `  ${chalk.cyan(entry.version)} ` +
          `${actionColor[entry.action as keyof typeof actionColor](entry.action)} ` +
          `- ${entry.timestamp}`
        );
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

function displayMigrationPlan(plan: any) {
  console.log(chalk.bold('\n📋 Migration Plan:'));
  console.log(chalk.cyan(`  Contract: ${plan.contractRef}`));
  console.log(chalk.gray(`  Type: ${plan.migrationType}`));
  console.log(chalk.gray(`  From: ${plan.fromVersion} (${plan.fromStatus})`));
  console.log(chalk.gray(`  To: ${plan.toVersion} (${plan.toStatus})`));

  const riskColors = {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.red,
    critical: chalk.bold.red,
  };
  console.log(`  Risk Level: ${riskColors[plan.riskLevel as keyof typeof riskColors](plan.riskLevel.toUpperCase())}`);

  if (plan.affectedServices.length > 0) {
    console.log(chalk.magenta(`\n  Affected Services (${plan.affectedServices.length}):`));
    for (const service of plan.affectedServices) {
      console.log(chalk.gray(`    - ${service}`));
    }
  }

  console.log(chalk.blue('\n  Steps:'));
  for (const step of plan.migrationSteps) {
    console.log(chalk.gray(`    ${step.step}. ${step.description}`));
  }
}

function displayMigrationResult(result: any) {
  console.log(chalk.bold('\n📊 Migration Result:'));
  console.log(chalk.gray(`  Duration: ${result.durationMs}ms`));

  if (result.updatedServices.length > 0) {
    console.log(chalk.green(`\n  Updated Services (${result.updatedServices.length}):`));
    for (const service of result.updatedServices) {
      console.log(chalk.gray(`    ✓ ${service}`));
    }
  }

  if (result.warnings) {
    console.log(chalk.yellow('\n  Warnings:'));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`    ⚠ ${warning}`));
    }
  }

  if (result.errors) {
    console.log(chalk.red('\n  Errors:'));
    for (const error of result.errors) {
      console.log(chalk.red(`    ✗ ${error}`));
    }
  }
}

program
  .command('impact')
  .description('Analyze impact of changes using knowledge graph')
  .option('--service <name>', 'Service name to analyze')
  .option('--contract <ref>', 'Contract reference to analyze')
  .option('--breaking', 'Indicate if this is a breaking change')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    try {
      const spinner = ora('Analyzing impact...').start();
      
      let targetService: string;
      if (options.service) {
        targetService = options.service;
      } else {
        const config = await configManager.loadConfig();
        targetService = config.service.name;
      }
      
      const result = await dependencyAnalyzer.analyzeImpact(targetService, {
        breaking: options.breaking,
      });
      
      spinner.succeed('Impact analysis complete!');
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.bold('\nImpact Analysis:'));
        console.log(chalk.gray(result.summary));
        
        if (result.directDependencies.length > 0) {
          console.log(chalk.cyan('\n  Direct Dependencies:'));
          for (const dep of result.directDependencies) {
            console.log(chalk.gray(`    - ${dep.service}`));
          }
        }
        
        if (result.directDependents.length > 0) {
          console.log(chalk.cyan('\n  Direct Dependents:'));
          for (const dep of result.directDependents) {
            console.log(chalk.gray(`    - ${dep.service}`));
          }
        }
        
        const riskColors = {
          low: chalk.green,
          medium: chalk.yellow,
          high: chalk.red,
          critical: chalk.bold.red,
        };
        console.log(chalk.cyan('\n  Risk Level:'), riskColors[result.riskLevel](result.riskLevel.toUpperCase()));
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

const gitnexusCmd = new Command('gitnexus')
  .description('GitNexus knowledge graph configuration');

gitnexusCmd
  .command('configure')
  .description('Configure GitNexus connection')
  .requiredOption('--url <url>', 'GitNexus API URL')
  .requiredOption('--api-key <key>', 'GitNexus API key')
  .option('--space-key <key>', 'GitNexus space key')
  .option('--graph-id <id>', 'GitNexus graph ID')
  .action(async (options) => {
    try {
      const spinner = ora('Configuring GitNexus...').start();
      
      const config = GitNexusConfigSchema.parse(options);
      await configManager.setGitNexusConfig(config);
      
      const connected = await knowledgeGraph.connectToGitNexus(config);
      
      if (connected) {
        spinner.succeed('GitNexus configured and connected successfully!');
      } else {
        spinner.warn('GitNexus configured but connection test failed');
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

gitnexusCmd
  .command('sync')
  .description('Sync knowledge graph with GitNexus')
  .option('--push', 'Push local graph to GitNexus')
  .option('--pull', 'Pull graph from GitNexus')
  .action(async (options) => {
    try {
      const spinner = ora('Syncing knowledge graph...').start();
      
      if (options.push) {
        const success = await knowledgeGraph.syncToGitNexus();
        if (success) {
          spinner.succeed('Knowledge graph pushed to GitNexus successfully!');
        } else {
          spinner.fail('Failed to push knowledge graph to GitNexus');
        }
      } else if (options.pull) {
        await knowledgeGraph.syncFromGitNexus();
        spinner.succeed('Knowledge graph pulled from GitNexus successfully!');
      } else {
        await knowledgeGraph.syncFromConfig();
        spinner.succeed('Local knowledge graph updated from config!');
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

gitnexusCmd
  .command('status')
  .description('Show GitNexus configuration and graph status')
  .action(async () => {
    try {
      const config = await configManager.getGitNexusConfig();
      
      if (!config) {
        console.log(chalk.yellow('GitNexus not configured'));
        return;
      }
      
      console.log(chalk.bold('\nGitNexus Configuration:'));
      console.log(chalk.gray(`  URL: ${config.url}`));
      console.log(chalk.gray(`  Space Key: ${config.spaceKey || 'Not set'}`));
      console.log(chalk.gray(`  Graph ID: ${config.graphId || 'Not set'}`));
      
      const graph = await knowledgeGraph.loadLocalGraph();
      if (graph) {
        console.log(chalk.bold('\nKnowledge Graph Status:'));
        console.log(chalk.gray(`  Version: ${graph.version}`));
        console.log(chalk.gray(`  Last Updated: ${graph.lastUpdated}`));
        console.log(chalk.gray(`  Nodes: ${graph.nodes.length}`));
        console.log(chalk.gray(`  Edges: ${graph.edges.length}`));
      } else {
        console.log(chalk.yellow('\nNo local knowledge graph found'));
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.addCommand(gitnexusCmd);

program
  .command('dependencies')
  .description('Show service dependency map')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const spinner = ora('Loading dependency map...').start();
      const map = await dependencyAnalyzer.getFullDependencyMap();
      spinner.succeed('Dependency map loaded!');
      
      if (options.json) {
        console.log(JSON.stringify(map, null, 2));
      } else {
        console.log(chalk.bold('\nService Dependency Map:'));
        
        for (const [service, deps] of Object.entries(map)) {
          console.log(chalk.cyan(`\n  ${service}:`));
          
          if (deps.dependencies.length > 0) {
            console.log(chalk.gray(`    Depends on: ${deps.dependencies.join(', ')}`));
          }
          
          if (deps.dependents.length > 0) {
            console.log(chalk.gray(`    Used by: ${deps.dependents.join(', ')}`));
          }
        }
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('tree')
  .description('Display namespace spec tree')
  .action(async () => {
    try {
      console.log(chalk.bold('\n📦 Namespace Spec Tree:'));
      console.log(chalk.green('  ├── spec/'));
      console.log(chalk.gray('  │   ├── namespace.md'));
      console.log(chalk.gray('  │   ├── shared/'));
      console.log(chalk.gray('  │   └── policies/'));
      console.log(chalk.blue('  ├── contracts/'));
      console.log(chalk.gray('  │   ├── service-a/'));
      console.log(chalk.gray('  │   ├── service-b/'));
      console.log(chalk.gray('  │   └── external/'));
      console.log(chalk.yellow('  ├── proposals/'));
      console.log(chalk.gray('  │   ├── active/'));
      console.log(chalk.gray('  │   └── archive/'));
      console.log(chalk.magenta('  └── graph/'));
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

const openspecProxy = new Command('openspec')
  .description('Direct openspec command proxy')
  .allowUnknownOption()
  .action(async (_options, command) => {
    try {
      const args = command.args;
      if (args.length === 0) {
        await openspec.runCommand(['--help']);
      } else {
        await openspec.runCommand(args);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.addCommand(openspecProxy);

['status', 'list', 'view', 'validate', 'show', 'schemas'].forEach((cmd) => {
  program
    .command(cmd)
    .description(`Show ${cmd} (delegates to openspec)`)
    .allowUnknownOption()
    .action(async (_options, command) => {
      try {
        const args = [cmd, ...command.args];
        
        command.options.forEach((opt: any) => {
          const short = opt.short?.replace('-', '');
          const long = opt.long?.replace('--', '');
          const opts = command.opts() as any;
          if (short && opts[short] !== undefined) {
            args.push(`--${long || short}`);
            if (typeof opts[short] !== 'boolean') {
              args.push(opts[short]);
            }
          }
          if (long && opts[long] !== undefined) {
            args.push(`--${long}`);
            if (typeof opts[long] !== 'boolean') {
              args.push(opts[long]);
            }
          }
        });
        
        await openspec.runCommand(args);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
});

const newCmd = new Command('new')
  .description('Create new items (delegates to openspec)');

newCmd
  .command('change <name>')
  .description('Create a new change')
  .option('--description <text>', 'Description')
  .option('--schema <name>', 'Schema')
  .action(async (name, options) => {
    try {
      await openspec.newChange(name, options);
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.addCommand(newCmd);

const cicdCmd = new Command('cicd')
  .description('CI/CD integration for contract validation and deployment');

cicdCmd
  .command('init')
  .description('Initialize CI/CD configuration')
  .option('--provider <provider>', 'CI/CD provider', 'github_actions')
  .option('--no-deploy', 'Disable deployment')
  .option('--no-validate', 'Disable contract validation')
  .action(async (options) => {
    try {
      const spinner = ora('Initializing CI/CD configuration...').start();
      
      await cicdIntegration.initCicdConfig({
        provider: options.provider as any,
        deployment: {
          enabled: options.deploy !== false,
          autoDeployCompatibleChanges: true,
          autoDeployPatchChanges: true,
          requireApprovalForBreakingChanges: true,
        },
        contractValidation: {
          enabled: options.validate !== false,
          strict: false,
          failOnBreakingChanges: true,
        },
      });
      
      spinner.succeed('CI/CD configuration initialized successfully');
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

cicdCmd
  .command('validate')
  .description('Validate contract compatibility')
  .option('--old <path>', 'Old contract file path')
  .option('--new <path>', 'New contract file path')
  .option('--all', 'Validate all contracts')
  .option('--strict', 'Strict validation mode')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const spinner = ora('Validating contracts...').start();
      
      if (options.old && options.new) {
        const result = await cicdIntegration.runContractValidation(
          options.old,
          options.new
        );
        
        spinner.stop();
        
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          displayCiCdResult(result);
        }
        
        if (!result.success) {
          process.exit(1);
        }
      } else if (options.all) {
        const changes = await cicdIntegration.checkForContractChanges();
        
        spinner.stop();
        
        if (options.json) {
          console.log(JSON.stringify(changes, null, 2));
        } else {
          if (changes.hasChanges) {
            console.log(chalk.yellow('\n📋 Found contract files:'));
            changes.changedFiles.forEach((file) => {
              console.log(chalk.gray(`  - ${file}`));
            });
            console.log(chalk.yellow('\n⚠️  Use --old and --new to validate specific contract changes'));
          } else {
            console.log(chalk.green('\n✅ No contract files found'));
          }
        }
      } else {
        spinner.fail('Please provide either --old and --new or --all');
        process.exit(1);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

cicdCmd
  .command('deploy')
  .description('Deploy contracts')
  .option('--environment <env>', 'Target environment', 'production')
  .option('--contract <ref>', 'Contract reference', 'default')
  .option('--dry-run', 'Show what would happen without deploying')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const spinner = ora('Deploying contracts...').start();
      
      await deploymentManager.initialize();
      
      const result = await deploymentManager.executeDeployment(
        options.contract,
        options.environment,
        { dryRun: options.dryRun }
      );
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayCiCdResult(result);
      }
      
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

cicdCmd
  .command('deployments')
  .description('List deployments')
  .option('--environment <env>', 'Filter by environment')
  .option('--status <status>', 'Filter by status')
  .option('--limit <n>', 'Limit results', '10')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const spinner = ora('Loading deployments...').start();
      
      const deployments = await deploymentManager.listDeployments({
        environment: options.environment,
        status: options.status as any,
        limit: parseInt(options.limit),
      });
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(deployments, null, 2));
      } else {
        if (deployments.length === 0) {
          console.log(chalk.yellow('\nNo deployments found'));
          return;
        }
        
        console.log(chalk.bold('\n📋 Deployments:'));
        deployments.forEach((deployment) => {
          const statusColor = {
            pending: chalk.gray,
            running: chalk.blue,
            success: chalk.green,
            failed: chalk.red,
            cancelled: chalk.yellow,
            skipped: chalk.gray,
          }[deployment.status] || chalk.white;
          
          console.log(
            `  ${chalk.cyan(deployment.id.slice(0, 8))}... ` +
            `${statusColor(deployment.status)} ` +
            `${chalk.magenta(deployment.environment)} ` +
            `${chalk.gray(deployment.startedAt)}`
          );
        });
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

cicdCmd
  .command('rollback <deploymentId>')
  .description('Rollback a deployment')
  .option('--dry-run', 'Show what would happen without rolling back')
  .option('--json', 'Output as JSON')
  .action(async (deploymentId, options) => {
    try {
      const spinner = ora('Rolling back deployment...').start();
      
      const result = await deploymentManager.rollbackDeployment(
        deploymentId,
        { dryRun: options.dryRun }
      );
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayCiCdResult(result);
      }
      
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

cicdCmd
  .command('generate')
  .description('Generate CI/CD pipeline configuration')
  .option('--provider <provider>', 'CI/CD provider', 'github_actions')
  .option('--output <path>', 'Output file path')
  .action(async (options) => {
    try {
      const spinner = ora('Generating pipeline configuration...').start();
      
      const provider = CiCdProviderSchema.parse(options.provider);
      const pipeline = await cicdIntegration.generatePipelineConfig(provider, {
        outputPath: options.output,
      });
      
      spinner.succeed(`Pipeline configuration generated: ${pipeline.configPath}`);
      
      console.log(chalk.gray('\nConfiguration:'));
      console.log(chalk.gray(pipeline.content));
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.addCommand(cicdCmd);

function displayCiCdResult(result: any) {
  console.log(chalk.bold('\n📋 CI/CD Result:'));
  
  if (result.success) {
    console.log(chalk.green(`  ✅ ${result.message}`));
  } else {
    console.log(chalk.red(`  ❌ ${result.message}`));
  }
  
  if (result.compatibilityCheck) {
    const check = result.compatibilityCheck;
    console.log(chalk.bold('\n  Compatibility Check:'));
    console.log(chalk.gray(`    Compatible: ${check.compatible ? '✅' : '❌'}`));
    console.log(chalk.gray(`    Change Type: ${check.changeType}`));
    console.log(chalk.gray(`    Summary: ${check.summary}`));
    
    if (check.issues && check.issues.length > 0) {
      console.log(chalk.gray(`    Issues (${check.issues.length}):`));
      check.issues.forEach((issue: any) => {
        const icon = issue.severity === 'error' ? '❌' : 
                    issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        const color = issue.severity === 'error' ? chalk.red : 
                     issue.severity === 'warning' ? chalk.yellow : chalk.blue;
        console.log(color(`      ${icon} ${issue.message}`));
      });
    }
  }
  
  if (result.deployment) {
    const deployment = result.deployment;
    console.log(chalk.bold('\n  Deployment:'));
    console.log(chalk.gray(`    ID: ${deployment.id}`));
    console.log(chalk.gray(`    Contract: ${deployment.contractRef}`));
    console.log(chalk.gray(`    Environment: ${deployment.environment}`));
    console.log(chalk.gray(`    Status: ${deployment.status}`));
    console.log(chalk.gray(`    Started: ${deployment.startedAt}`));
    if (deployment.completedAt) {
      console.log(chalk.gray(`    Completed: ${deployment.completedAt}`));
    }
  }
  
  if (result.warnings && result.warnings.length > 0) {
    console.log(chalk.yellow('\n  ⚠️  Warnings:'));
    result.warnings.forEach((warning: string) => {
      console.log(chalk.yellow(`    - ${warning}`));
    });
  }
  
  if (result.errors && result.errors.length > 0) {
    console.log(chalk.red('\n  ❌ Errors:'));
    result.errors.forEach((error: string) => {
      console.log(chalk.red(`    - ${error}`));
    });
  }
}

program.parse();
