#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const propose_1 = require("./commands/propose");
const accept_1 = require("./commands/accept");
const review_1 = require("./commands/review");
const apply_1 = require("./commands/apply");
const archive_1 = require("./commands/archive");
const sync_1 = require("./commands/sync");
const sync_contracts_1 = require("./commands/sync-contracts");
const sync_graph_1 = require("./commands/sync-graph");
const contract_1 = require("./commands/contract");
const impact_1 = require("./commands/impact");
const tree_1 = require("./commands/tree");
const init_1 = require("./commands/init");
const visualize_1 = require("./commands/visualize");
const validate_1 = require("./commands/validate");
const program = new commander_1.Command();
program
    .name('nxsp')
    .description('NexusSpec CLI - 分布式 Spec 系统的命令行工具')
    .version('0.3.0');
// 注册命令
program.addCommand(init_1.initCommand);
program.addCommand(propose_1.proposeCommand);
program.addCommand(accept_1.acceptCommand);
program.addCommand(review_1.reviewCommand);
program.addCommand(apply_1.applyCommand);
program.addCommand(archive_1.archiveCommand);
program.addCommand(sync_1.syncCommand);
program.addCommand(sync_contracts_1.syncContractsCommand);
program.addCommand(sync_graph_1.syncGraphCommand);
program.addCommand(contract_1.contractCommand);
program.addCommand(impact_1.impactCommand);
program.addCommand(tree_1.treeCommand);
program.addCommand(visualize_1.visualizeCommand);
program.addCommand(validate_1.validateCommand);
// 执行命令
program.parse(process.argv);
