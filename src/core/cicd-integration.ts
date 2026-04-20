import { promises as fs } from 'fs';
import path from 'path';
import { CompatibilityValidator } from './compatibility-validator.js';
import { ConfigManager } from './config.js';
import type {
  CiCdConfig,
  CiCdIntegrationResult,
  CompatibilityCheckResult,
  PipelineConfig,
  CiCdProvider,
} from '../types/index.js';

export class CiCdIntegration {
  private configManager: ConfigManager;
  private compatibilityValidator: CompatibilityValidator;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.configManager = new ConfigManager(cwd);
    this.compatibilityValidator = new CompatibilityValidator();
  }

  async initCicdConfig(config?: Partial<CiCdConfig>): Promise<void> {
    const fullConfig = await this.configManager.loadConfig();
    fullConfig.cicd = {
      enabled: true,
      provider: 'github_actions',
      contractValidation: {
        enabled: true,
        strict: false,
        failOnBreakingChanges: true,
      },
      deployment: {
        enabled: true,
        autoDeployCompatibleChanges: true,
        autoDeployPatchChanges: true,
        requireApprovalForBreakingChanges: true,
      },
      ...config,
    };
    await this.configManager.saveConfig(fullConfig);
  }

  async getCicdConfig(): Promise<CiCdConfig | undefined> {
    const config = await this.configManager.loadConfig();
    return config.cicd;
  }

  async runContractValidation(
    oldContractPath: string,
    newContractPath: string
  ): Promise<CiCdIntegrationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const config = await this.getCicdConfig();

      if (!config?.contractValidation?.enabled) {
        return {
          success: true,
          message: 'Contract validation is disabled',
          warnings: ['Contract validation is disabled in configuration'],
        };
      }

      const compatibilityCheck = await this.compatibilityValidator.validateFromPaths(
        oldContractPath,
        newContractPath,
        { strict: config.contractValidation.strict }
      );

      const success = compatibilityCheck.compatible || !config.contractValidation.failOnBreakingChanges;

      if (!compatibilityCheck.compatible) {
        if (config.contractValidation.failOnBreakingChanges) {
          errors.push('Breaking changes detected and failOnBreakingChanges is enabled');
        } else {
          warnings.push('Breaking changes detected but failOnBreakingChanges is disabled');
        }
      }

      return {
        success,
        compatibilityCheck,
        message: success
          ? 'Contract validation passed'
          : 'Contract validation failed due to breaking changes',
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: `Contract validation failed: ${(error as Error).message}`,
        errors: [(error as Error).message],
      };
    }
  }

  async generatePipelineConfig(
    provider: CiCdProvider,
    options?: { outputPath?: string }
  ): Promise<PipelineConfig> {
    let content = '';
    let configPath = '';

    switch (provider) {
      case 'github_actions':
        content = this.generateGitHubActionsConfig();
        configPath = options?.outputPath || '.github/workflows/nexus-spec.yml';
        break;
      case 'gitlab_ci':
        content = this.generateGitLabCIConfig();
        configPath = options?.outputPath || '.gitlab-ci.yml';
        break;
      case 'jenkins':
        content = this.generateJenkinsConfig();
        configPath = options?.outputPath || 'Jenkinsfile';
        break;
      case 'circleci':
        content = this.generateCircleCIConfig();
        configPath = options?.outputPath || '.circleci/config.yml';
        break;
      case 'bitbucket_pipelines':
        content = this.generateBitbucketPipelinesConfig();
        configPath = options?.outputPath || 'bitbucket-pipelines.yml';
        break;
      default:
        throw new Error(`Unsupported CI/CD provider: ${provider}`);
    }

    if (options?.outputPath) {
      const fullPath = path.join(this.cwd, configPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    return {
      name: `nexus-spec-${provider}`,
      provider,
      configPath,
      content,
    };
  }

  private generateGitHubActionsConfig(): string {
    return `name: Nexus Spec Contract Validation

on:
  pull_request:
    paths:
      - '**/*.yaml'
      - '**/*.yml'
      - '**/*.json'
  push:
    branches:
      - main
      - master

jobs:
  validate-contracts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate contracts
        run: |
          # Find changed contract files and validate
          echo "Running contract validation..."
          npm run nxsp -- cicd validate --all

  deploy:
    needs: validate-contracts
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Deploy contracts
        run: |
          echo "Deploying contracts..."
          npm run nxsp -- cicd deploy --environment production
`;
  }

  private generateGitLabCIConfig(): string {
    return `stages:
  - validate
  - deploy

validate-contracts:
  stage: validate
  image: node:20
  script:
    - npm ci
    - echo "Running contract validation..."
    - npm run nxsp -- cicd validate --all
  only:
    changes:
      - "**/*.yaml"
      - "**/*.yml"
      - "**/*.json"

deploy-contracts:
  stage: deploy
  image: node:20
  script:
    - npm ci
    - echo "Deploying contracts..."
    - npm run nxsp -- cicd deploy --environment production
  only:
    - main
    - master
  needs:
    - validate-contracts
`;
  }

  private generateJenkinsConfig(): string {
    return `pipeline {
  agent any

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Validate Contracts') {
      when {
        anyOf {
          changeset '**/*.yaml'
          changeset '**/*.yml'
          changeset '**/*.json'
        }
      }
      steps {
        sh 'npm run nxsp -- cicd validate --all'
      }
    }

    stage('Deploy Contracts') {
      when {
        branch 'main'
        beforeAgent true
      }
      steps {
        sh 'npm run nxsp -- cicd deploy --environment production'
      }
    }
  }
}
`;
  }

  private generateCircleCIConfig(): string {
    return `version: 2.1

jobs:
  validate-contracts:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: npm ci
      - run:
          name: Validate contracts
          command: npm run nxsp -- cicd validate --all

  deploy-contracts:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: npm ci
      - run:
          name: Deploy contracts
          command: npm run nxsp -- cicd deploy --environment production

workflows:
  contract-workflow:
    jobs:
      - validate-contracts:
          filters:
            paths:
              only:
                - "**/*.yaml"
                - "**/*.yml"
                - "**/*.json"
      - deploy-contracts:
          requires:
            - validate-contracts
          filters:
            branches:
              only:
                - main
                - master
`;
  }

  private generateBitbucketPipelinesConfig(): string {
    return `image: node:20

pipelines:
  default:
    - parallel:
        - step:
            name: Validate Contracts
            script:
              - npm ci
              - npm run nxsp -- cicd validate --all

  branches:
    main:
      - step:
          name: Validate Contracts
          script:
            - npm ci
            - npm run nxsp -- cicd validate --all
      - step:
          name: Deploy Contracts
          deployment: production
          script:
            - npm ci
            - npm run nxsp -- cicd deploy --environment production
`;
  }

  async checkForContractChanges(): Promise<{ hasChanges: boolean; changedFiles: string[] }> {
    const changedFiles: string[] = [];

    const extensions = ['.yaml', '.yml', '.json'];

    for (const ext of extensions) {
      const files = await this.findFilesByExtension(this.cwd, ext);
      changedFiles.push(...files);
    }

    return {
      hasChanges: changedFiles.length > 0,
      changedFiles,
    };
  }

  private async findFilesByExtension(dir: string, ext: string): Promise<string[]> {
    const results: string[] = [];

    async function walk(currentDir: string) {
      const files = await fs.readdir(currentDir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(currentDir, file.name);

        if (file.isDirectory()) {
          if (!file.name.startsWith('.')) {
            await walk(fullPath);
          }
        } else if (file.name.endsWith(ext)) {
          results.push(fullPath);
        }
      }
    }

    await walk(dir);
    return results;
  }
}
