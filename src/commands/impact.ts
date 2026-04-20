import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

interface Config {
  namespace: {
    local_path: string;
  };
  gitnexus?: {
    url: string;
    api_key: string;
  };
}

interface ServiceConfig {
  depends: Record<string, string>;
}

interface DirectImpact {
  service: string;
  reference: string;
  action: string;
}

interface DownstreamImpact {
  service: string;
  description: string;
  action: string;
  depth: number;
}

interface GraphNode {
  id: string;
  type: 'service' | 'contract' | 'external';
  name: string;
  version?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'depends_on' | 'exposes';
  contract?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const impactCommand = new Command('impact')
  .description('分析契约变更的影响范围')
  .option('--contract <contract>', '契约变更，例如 loyalty-service/api:v1→v2')
  .action(async (options) => {
    try {
      // 读取配置文件
      const configPath = path.join(process.cwd(), '.nxsp', 'config.yaml');
      if (!await fs.exists(configPath)) {
        console.log('Error: .nxsp/config.yaml not found. Please run nxsp init first.');
        process.exit(1);
      }

      const config = yaml.load(await fs.readFile(configPath, 'utf8')) as Config;
      const namespacePath = config.namespace.local_path.replace('~', process.env.HOME || '');

      // 确保 Namespace 仓库存在
      if (!await fs.exists(namespacePath)) {
        console.log('Error: Namespace repository not found. Please clone it first.');
        process.exit(1);
      }

      // 解析契约变更信息
      const [contractInfo, versionChange] = options.contract.split('→');
      const [service, contractType] = contractInfo.split('/');
      const [oldVersion, newVersion] = versionChange.split(':');

      // 加载知识图谱数据
      let graphData: GraphData | null = null;
      const graphPath = path.join(namespacePath, 'graph', 'snapshot.json');
      if (await fs.exists(graphPath)) {
        console.log('Loading dependency graph from local snapshot...');
        graphData = JSON.parse(await fs.readFile(graphPath, 'utf8')) as GraphData;
      } else if (config.gitnexus?.url && config.gitnexus?.api_key) {
        console.log('Loading dependency graph from GitNexus...');
        graphData = await fetchGraphFromGitNexus(config.gitnexus.url, config.gitnexus.api_key);
      }

      // 分析直接影响
      const directImpact: DirectImpact[] = [];
      const contractsDir = path.join(namespacePath, 'contracts');
      
      // 遍历所有服务的依赖
      const serviceDirs = await fs.readdir(contractsDir);
      for (const serviceDir of serviceDirs) {
        if (serviceDir === 'external') continue;

        const serviceConfigPath = path.join(contractsDir, serviceDir, 'config.yaml');
        if (await fs.exists(serviceConfigPath)) {
          const serviceConfig = yaml.load(await fs.readFile(serviceConfigPath, 'utf8')) as ServiceConfig;
          if (serviceConfig.depends) {
            for (const [name, ref] of Object.entries(serviceConfig.depends)) {
              if (ref.includes(`${service}/${contractType}:${oldVersion}`)) {
                directImpact.push({
                  service: serviceDir,
                  reference: ref,
                  action: `update_ref_to_${newVersion}`
                });
              }
            }
          }
        }
      }

      // 分析下游影响
      const downstreamImpact: DownstreamImpact[] = [];
      if (graphData) {
        console.log('Analyzing downstream impact using dependency graph...');
        const affectedServices = new Set(directImpact.map(impact => impact.service));
        
        // 使用 BFS 遍历下游依赖
        const visited = new Set<string>();
        const queue: { service: string; depth: number }[] = 
          directImpact.map(impact => ({ service: impact.service, depth: 1 }));
        
        while (queue.length > 0) {
          const { service, depth } = queue.shift()!;
          if (visited.has(service)) continue;
          visited.add(service);
          
          // 找到依赖当前服务的其他服务
          const downstreamServices = graphData.edges
            .filter(edge => 
              edge.type === 'depends_on' && 
              edge.target.startsWith(service + '/')
            )
            .map(edge => edge.source);
          
          for (const downstreamService of downstreamServices) {
            if (!visited.has(downstreamService) && !affectedServices.has(downstreamService)) {
              downstreamImpact.push({
                service: downstreamService,
                description: `Depends on ${service} which is directly affected`,
                action: 'Review and test',
                depth
              });
              queue.push({ service: downstreamService, depth: depth + 1 });
            }
          }
        }
      }

      // 生成影响分析报告
      console.log('📊 Impact Analysis Report');
      console.log('=========================');
      console.log(`Contract: ${service}/${contractType}`);
      console.log(`Version Change: ${oldVersion} → ${newVersion}`);
      console.log('');

      console.log('Direct Impact:');
      if (directImpact.length > 0) {
        directImpact.forEach((impact) => {
          console.log(`  - ${impact.service}: references ${impact.reference}`);
          console.log(`    Action: ${impact.action}`);
        });
      } else {
        console.log('  No direct impact found');
      }
      console.log('');

      console.log('Downstream Impact:');
      if (downstreamImpact.length > 0) {
        // 按深度排序
        downstreamImpact.sort((a, b) => a.depth - b.depth);
        downstreamImpact.forEach((impact) => {
          console.log(`  - ${impact.service} (depth: ${impact.depth}): ${impact.description}`);
          console.log(`    Action: ${impact.action}`);
        });
      } else {
        console.log('  No downstream impact found');
      }
      console.log('');

      console.log('Contract Version Transition:');
      console.log(`  From: ${oldVersion} (active → deprecated)`);
      console.log(`  To: ${newVersion} (draft → active)`);
      console.log('');

      // 提供建议
      console.log('Recommendations:');
      if (directImpact.length > 0) {
        console.log('  1. Update all direct dependencies to use the new version');
        console.log('  2. Run compatibility tests for affected services');
      }
      if (downstreamImpact.length > 0) {
        console.log('  3. Review downstream services for potential breakage');
        console.log('  4. Consider a staged rollout to minimize impact');
      }
      console.log('');

      console.log('✅ Impact analysis completed successfully');
    } catch (error) {
      console.error('Error analyzing impact:', error);
      process.exit(1);
    }
  });

async function fetchGraphFromGitNexus(url: string, apiKey: string): Promise<GraphData> {
  try {
    const response = await fetch(`${url}/api/graph`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch graph from GitNexus: ${await response.text()}`);
    }

    return await response.json() as GraphData;
  } catch (error) {
    console.warn('Warning: Failed to fetch graph from GitNexus, using local analysis:', error);
    return { nodes: [], edges: [] };
  }
}

export { impactCommand };
