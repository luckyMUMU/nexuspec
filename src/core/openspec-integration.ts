import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import type { NxspConfig } from '../types/index.js';

const execFile = promisify(spawn);

export class OpenSpecIntegration {
  private openspecPath: string;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.openspecPath = this.resolveOpenspecPath();
  }

  private resolveOpenspecPath(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    try {
      const packageJsonPath = require.resolve('@fission-ai/openspec/package.json', {
        paths: [__dirname, this.cwd],
      });
      const packageJson = require(packageJsonPath);
      const binPath = path.resolve(path.dirname(packageJsonPath), packageJson.bin.openspec);
      return binPath;
    } catch {
      return 'openspec';
    }
  }

  async runCommand(args: string[], options?: { cwd?: string; silent?: boolean }): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.openspecPath, args, {
        cwd: options?.cwd || this.cwd,
        stdio: options?.silent ? 'pipe' : ['inherit', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          if (!options?.silent) process.stdout.write(data);
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
          if (!options?.silent) process.stderr.write(data);
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`openspec exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  async init(options?: { tools?: string; force?: boolean; profile?: string }): Promise<void> {
    const args = ['init'];
    if (options?.tools) args.push('--tools', options.tools);
    if (options?.force) args.push('--force');
    if (options?.profile) args.push('--profile', options.profile);
    await this.runCommand(args);
  }

  async update(options?: { force?: boolean }): Promise<void> {
    const args = ['update'];
    if (options?.force) args.push('--force');
    await this.runCommand(args);
  }

  async list(options?: { specs?: boolean; changes?: boolean; sort?: string; json?: boolean }): Promise<any> {
    const args = ['list'];
    if (options?.specs) args.push('--specs');
    if (options?.changes) args.push('--changes');
    if (options?.sort) args.push('--sort', options.sort);
    if (options?.json) args.push('--json');
    
    const { stdout } = await this.runCommand(args, { silent: options?.json });
    if (options?.json) {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return stdout;
      }
    }
    return stdout;
  }

  async view(): Promise<void> {
    await this.runCommand(['view']);
  }

  async status(options?: { change?: string; schema?: string; json?: boolean }): Promise<any> {
    const args = ['status'];
    if (options?.change) args.push('--change', options.change);
    if (options?.schema) args.push('--schema', options.schema);
    if (options?.json) args.push('--json');
    
    const { stdout } = await this.runCommand(args, { silent: options?.json });
    if (options?.json) {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return stdout;
      }
    }
    return stdout;
  }

  async instructions(artifactId?: string, options?: { change?: string; schema?: string; json?: boolean }): Promise<any> {
    const args = ['instructions'];
    if (artifactId) args.push(artifactId);
    if (options?.change) args.push('--change', options.change);
    if (options?.schema) args.push('--schema', options.schema);
    if (options?.json) args.push('--json');
    
    const { stdout } = await this.runCommand(args, { silent: options?.json });
    if (options?.json) {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return stdout;
      }
    }
    return stdout;
  }

  async schemas(options?: { json?: boolean }): Promise<any> {
    const args = ['schemas'];
    if (options?.json) args.push('--json');
    
    const { stdout } = await this.runCommand(args, { silent: options?.json });
    if (options?.json) {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return stdout;
      }
    }
    return stdout;
  }

  async newChange(name: string, options?: { description?: string; schema?: string }): Promise<void> {
    const args = ['new', 'change', name];
    if (options?.description) args.push('--description', options.description);
    if (options?.schema) args.push('--schema', options.schema);
    await this.runCommand(args);
  }

  async archive(changeName?: string, options?: { yes?: boolean; skipSpecs?: boolean; noValidate?: boolean }): Promise<void> {
    const args = ['archive'];
    if (changeName) args.push(changeName);
    if (options?.yes) args.push('--yes');
    if (options?.skipSpecs) args.push('--skip-specs');
    if (options?.noValidate) args.push('--no-validate');
    await this.runCommand(args);
  }

  async validate(itemName?: string, options?: { all?: boolean; changes?: boolean; specs?: boolean; type?: string; strict?: boolean; json?: boolean }): Promise<any> {
    const args = ['validate'];
    if (itemName) args.push(itemName);
    if (options?.all) args.push('--all');
    if (options?.changes) args.push('--changes');
    if (options?.specs) args.push('--specs');
    if (options?.type) args.push('--type', options.type);
    if (options?.strict) args.push('--strict');
    if (options?.json) args.push('--json');
    
    const { stdout } = await this.runCommand(args, { silent: options?.json });
    if (options?.json) {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return stdout;
      }
    }
    return stdout;
  }

  async show(itemName?: string, options?: { json?: boolean; type?: string; deltasOnly?: boolean; requirementsOnly?: boolean }): Promise<any> {
    const args = ['show'];
    if (itemName) args.push(itemName);
    if (options?.json) args.push('--json');
    if (options?.type) args.push('--type', options.type);
    if (options?.deltasOnly) args.push('--deltas-only');
    if (options?.requirementsOnly) args.push('--requirements-only');
    
    const { stdout } = await this.runCommand(args, { silent: options?.json });
    if (options?.json) {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return stdout;
      }
    }
    return stdout;
  }

  async configCommand(): Promise<void> {
    await this.runCommand(['config']);
  }

  async schemaCommand(): Promise<void> {
    await this.runCommand(['schema']);
  }
}
