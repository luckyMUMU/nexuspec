import type {
  ImpactAnalysisResult,
  DependencyNode,
  GraphNode,
  GraphEdge,
  ContractRef,
} from '../types/index.js';
import { KnowledgeGraphService } from './knowledge-graph.js';
import { ConfigManager } from './config.js';
import { LRUCache, PerformanceMonitor, getGlobalMonitor, hashKey } from './performance-optimizer.js';

interface GraphIndex {
  nodes: Map<string, GraphNode>;
  edgesBySource: Map<string, GraphEdge[]>;
  edgesByTarget: Map<string, GraphEdge[]>;
}

export class DependencyAnalyzer {
  private graphService: KnowledgeGraphService;
  private configManager: ConfigManager;
  private cwd: string;
  private cache: LRUCache<string, any>;
  private monitor: PerformanceMonitor;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.graphService = new KnowledgeGraphService(cwd);
    this.configManager = new ConfigManager(cwd);
    this.cache = new LRUCache({ maxSize: 100, defaultTTL: 5 * 60 * 1000 });
    this.monitor = getGlobalMonitor();
  }

  private async getGraphIndex(): Promise<GraphIndex> {
    const cacheKey = 'graphIndex';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const { nodes, edges } = await this.graphService.getGraphSnapshot();
    
    const index: GraphIndex = {
      nodes: new Map(nodes.map((n) => [n.id, n])),
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };

    for (const edge of edges) {
      if (!index.edgesBySource.has(edge.source)) {
        index.edgesBySource.set(edge.source, []);
      }
      index.edgesBySource.get(edge.source)!.push(edge);

      if (!index.edgesByTarget.has(edge.target)) {
        index.edgesByTarget.set(edge.target, []);
      }
      index.edgesByTarget.get(edge.target)!.push(edge);
    }

    this.cache.set(cacheKey, index);
    return index;
  }

  async analyzeImpact(
    targetService: string,
    options?: { contractRef?: ContractRef; breaking?: boolean }
  ): Promise<ImpactAnalysisResult> {
    const cacheKey = hashKey('analyzeImpact', targetService, options?.breaking);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    this.monitor.startTimer('dependencyAnalyzer.analyzeImpact');
    
    try {
      await this.graphService.syncFromConfig();
      const index = await this.getGraphIndex();

      const directDependencies = this.getDirectDependencies(targetService, index);
      const directDependents = this.getDirectDependents(targetService, index);
      const allAffectedServices = this.getAllAffectedServices(targetService, index);
      const dependencyTree = this.buildDependencyTree(targetService, index);

      const riskLevel = this.calculateRiskLevel(directDependents.length, allAffectedServices.length, options?.breaking);

      const result: ImpactAnalysisResult = {
        targetService,
        directDependencies,
        directDependents,
        allAffectedServices,
        dependencyTree,
        riskLevel,
        summary: this.generateSummary(targetService, directDependencies, directDependents, allAffectedServices, riskLevel),
      };

      this.cache.set(cacheKey, result, 30000);
      return result;
    } finally {
      this.monitor.endTimer('dependencyAnalyzer.analyzeImpact');
    }
  }

  private getDirectDependencies(
    serviceName: string,
    index: GraphIndex
  ): DependencyNode[] {
    const dependencies: DependencyNode[] = [];
    const targetNodeId = `service:${serviceName}`;

    const directDepEdges = index.edgesBySource.get(targetNodeId)?.filter((e) => e.type === 'depends_on') || [];

    for (const edge of directDepEdges) {
      const dependentService = edge.target.replace('service:', '');
      const subDeps = this.getDirectDependenciesFast(dependentService, index);
      
      dependencies.push({
        service: dependentService,
        level: 1,
        dependencies: subDeps,
        dependents: [serviceName],
      });
    }

    return dependencies;
  }

  private getDirectDependenciesFast(
    serviceName: string,
    index: GraphIndex
  ): string[] {
    const targetNodeId = `service:${serviceName}`;
    const edges = index.edgesBySource.get(targetNodeId)?.filter((e) => e.type === 'depends_on') || [];
    return edges.map((e) => e.target.replace('service:', ''));
  }

  private getDirectDependents(
    serviceName: string,
    index: GraphIndex
  ): DependencyNode[] {
    const dependents: DependencyNode[] = [];
    const targetNodeId = `service:${serviceName}`;

    const directDepEdges = index.edgesByTarget.get(targetNodeId)?.filter((e) => e.type === 'depends_on') || [];

    for (const edge of directDepEdges) {
      const dependentService = edge.source.replace('service:', '');
      const subDependents = this.getDirectDependentsFast(dependentService, index);
      
      dependents.push({
        service: dependentService,
        level: 1,
        dependencies: [serviceName],
        dependents: subDependents,
      });
    }

    return dependents;
  }

  private getDirectDependentsFast(
    serviceName: string,
    index: GraphIndex
  ): string[] {
    const targetNodeId = `service:${serviceName}`;
    const edges = index.edgesByTarget.get(targetNodeId)?.filter((e) => e.type === 'depends_on') || [];
    return edges.map((e) => e.source.replace('service:', ''));
  }

  private getAllAffectedServices(
    serviceName: string,
    index: GraphIndex
  ): string[] {
    const affected = new Set<string>();
    const queue: string[] = [serviceName];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const currentNodeId = `service:${current}`;
      const depEdges = index.edgesByTarget.get(currentNodeId)?.filter((e) => e.type === 'depends_on') || [];

      for (const edge of depEdges) {
        const depService = edge.source.replace('service:', '');
        if (!visited.has(depService)) {
          affected.add(depService);
          queue.push(depService);
        }
      }
    }

    return Array.from(affected);
  }

  private buildDependencyTree(
    serviceName: string,
    index: GraphIndex,
    visited = new Set<string>()
  ): any {
    if (visited.has(serviceName)) {
      return { service: serviceName, circular: true };
    }

    visited.add(serviceName);
    const nodeId = `service:${serviceName}`;

    const depEdges = index.edgesBySource.get(nodeId)?.filter((e) => e.type === 'depends_on') || [];
    const dependencies = depEdges.map((edge) => {
      const depService = edge.target.replace('service:', '');
      return this.buildDependencyTree(depService, index, new Set(visited));
    });

    return {
      service: serviceName,
      dependencies,
    };
  }

  private calculateRiskLevel(
    directDependentsCount: number,
    totalAffectedCount: number,
    breaking?: boolean
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (breaking) {
      if (totalAffectedCount > 5) return 'critical';
      if (totalAffectedCount > 2) return 'high';
      return 'medium';
    }

    if (totalAffectedCount > 5) return 'high';
    if (totalAffectedCount > 2) return 'medium';
    return 'low';
  }

  private generateSummary(
    targetService: string,
    directDependencies: DependencyNode[],
    directDependents: DependencyNode[],
    allAffectedServices: string[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): string {
    const parts = [
      `Impact analysis for service "${targetService}":`,
      `- Direct dependencies: ${directDependencies.length}`,
      `- Direct dependents: ${directDependents.length}`,
      `- Total affected services: ${allAffectedServices.length}`,
      `- Risk level: ${riskLevel.toUpperCase()}`,
    ];

    if (allAffectedServices.length > 0) {
      parts.push(`- Affected services: ${allAffectedServices.join(', ')}`);
    }

    return parts.join('\n');
  }

  async getFullDependencyMap(): Promise<Record<string, { dependencies: string[]; dependents: string[] }>> {
    const cacheKey = 'fullDependencyMap';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    this.monitor.startTimer('dependencyAnalyzer.getFullDependencyMap');
    
    try {
      await this.graphService.syncFromConfig();
      const index = await this.getGraphIndex();

      const map: Record<string, { dependencies: string[]; dependents: string[] }> = {};

      for (const [nodeId, node] of index.nodes) {
        if (node.type !== 'service') continue;
        
        const serviceName = node.name;
        
        const dependencies = (index.edgesBySource.get(nodeId) || [])
          .filter((e) => e.type === 'depends_on')
          .map((e) => e.target.replace('service:', ''));

        const dependents = (index.edgesByTarget.get(nodeId) || [])
          .filter((e) => e.type === 'depends_on')
          .map((e) => e.source.replace('service:', ''));

        map[serviceName] = { dependencies, dependents };
      }

      this.cache.set(cacheKey, map, 30000);
      return map;
    } finally {
      this.monitor.endTimer('dependencyAnalyzer.getFullDependencyMap');
    }
  }

  async analyzeMultipleImpacts(
    serviceNames: string[],
    options?: { contractRef?: ContractRef; breaking?: boolean }
  ): Promise<Record<string, ImpactAnalysisResult>> {
    this.monitor.startTimer('dependencyAnalyzer.analyzeMultipleImpacts');
    
    try {
      await this.graphService.syncFromConfig();
      const index = await this.getGraphIndex();
      
      const results: Record<string, ImpactAnalysisResult> = {};
      
      for (const serviceName of serviceNames) {
        const cacheKey = hashKey('analyzeImpact', serviceName, options?.breaking);
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
          results[serviceName] = cached;
          continue;
        }

        const directDependencies = this.getDirectDependencies(serviceName, index);
        const directDependents = this.getDirectDependents(serviceName, index);
        const allAffectedServices = this.getAllAffectedServices(serviceName, index);
        const dependencyTree = this.buildDependencyTree(serviceName, index);
        const riskLevel = this.calculateRiskLevel(directDependents.length, allAffectedServices.length, options?.breaking);

        const result: ImpactAnalysisResult = {
          targetService: serviceName,
          directDependencies,
          directDependents,
          allAffectedServices,
          dependencyTree,
          riskLevel,
          summary: this.generateSummary(serviceName, directDependencies, directDependents, allAffectedServices, riskLevel),
        };

        this.cache.set(cacheKey, result, 30000);
        results[serviceName] = result;
      }

      return results;
    } finally {
      this.monitor.endTimer('dependencyAnalyzer.analyzeMultipleImpacts');
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
