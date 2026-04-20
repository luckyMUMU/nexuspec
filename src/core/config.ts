import path from 'path';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import yaml from 'yaml';
import type { NxspConfig, GitNexusConfig } from '../types/index.js';

const NXSP_CONFIG_DIR = '.nxsp';
const NXSP_CONFIG_FILE = 'config.yaml';

export class ConfigManager {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  getConfigPath(): string {
    return path.join(this.cwd, NXSP_CONFIG_DIR, NXSP_CONFIG_FILE);
  }

  getNamespaceLocalPath(config: NxspConfig): string {
    if (config.namespace.localPath) {
      return config.namespace.localPath;
    }
    return path.join(homedir(), '.nxsp', 'namespaces', path.basename(config.namespace.remote).replace('.git', ''));
  }

  async configExists(): Promise<boolean> {
    try {
      await fs.access(this.getConfigPath());
      return true;
    } catch {
      return false;
    }
  }

  async loadConfig(): Promise<NxspConfig> {
    const configPath = this.getConfigPath();
    const content = await fs.readFile(configPath, 'utf-8');
    return yaml.parse(content) as NxspConfig;
  }

  async saveConfig(config: NxspConfig): Promise<void> {
    const configPath = this.getConfigPath();
    const configDir = path.dirname(configPath);
    
    await fs.mkdir(configDir, { recursive: true });
    const content = yaml.stringify(config);
    await fs.writeFile(configPath, content, 'utf-8');
  }

  async initConfig(config: NxspConfig): Promise<void> {
    await this.saveConfig(config);
  }

  async getGitNexusConfig(): Promise<GitNexusConfig | undefined> {
    const config = await this.loadConfig();
    return config.gitnexus;
  }

  async setGitNexusConfig(gitnexusConfig: GitNexusConfig): Promise<void> {
    const config = await this.loadConfig();
    config.gitnexus = gitnexusConfig;
    await this.saveConfig(config);
  }

  async removeGitNexusConfig(): Promise<void> {
    const config = await this.loadConfig();
    delete config.gitnexus;
    await this.saveConfig(config);
  }
}
