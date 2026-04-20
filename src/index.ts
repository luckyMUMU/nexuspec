#!/usr/bin/env node

import { Command } from 'commander';
import { proposeCommand } from './commands/propose';
import { acceptCommand } from './commands/accept';
import { reviewCommand } from './commands/review';
import { applyCommand } from './commands/apply';
import { archiveCommand } from './commands/archive';
import { syncCommand } from './commands/sync';
import { syncContractsCommand } from './commands/sync-contracts';
import { syncGraphCommand } from './commands/sync-graph';
import { contractCommand } from './commands/contract';
import { impactCommand } from './commands/impact';
import { treeCommand } from './commands/tree';
import { initCommand } from './commands/init';
import { visualizeCommand } from './commands/visualize';
import { validateCommand } from './commands/validate';

const program = new Command();

program
  .name('nxsp')
  .description('NexusSpec CLI - 分布式 Spec 系统的命令行工具')
  .version('0.3.0');

// 注册命令
program.addCommand(initCommand);
program.addCommand(proposeCommand);
program.addCommand(acceptCommand);
program.addCommand(reviewCommand);
program.addCommand(applyCommand);
program.addCommand(archiveCommand);
program.addCommand(syncCommand);
program.addCommand(syncContractsCommand);
program.addCommand(syncGraphCommand);
program.addCommand(contractCommand);
program.addCommand(impactCommand);
program.addCommand(treeCommand);
program.addCommand(visualizeCommand);
program.addCommand(validateCommand);

// 执行命令
program.parse(process.argv);
