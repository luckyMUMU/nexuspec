import path from 'path';
import { promises as fs } from 'fs';
import type { GitNexusConfig, KnowledgeGraph, GraphNode, GraphEdge, NxspConfig } from '../types/index.js';
import { ConfigManager } from './config.js';
import { LRUCache, PerformanceMonitor, getGlobalMonitor, hashKey } from './performance-optimizer.js';
import { retry, CircuitBreaker, withFallback } from './resilience.js';

interface GraphUpdate {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  deleteNodes?: string[];
  deleteEdges?: string[];
}

export class KnowledgeGraphService {
  private configManager: ConfigManager;
  private cwd: string;
  private localGraphPath: string | null = null;
  private cache: LRUCache<string, any>;
  private monitor: PerformanceMonitor;
  private graphCache: { graph: KnowledgeGraph; timestamp: number } | null = null;
  private cacheTTL = 1000;
  private pendingUpdates: GraphUpdate = {};
  private flushTimeout: NodeJS.Timeout | null = null;
  private circuitBreaker: CircuitBreaker;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.configManager = new ConfigManager(cwd);
    this.cache = new LRUCache({ maxSize: 1000, defaultTTL: 5 * 60 * 1000 });
    this.monitor = getGlobalMonitor();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
    });
  }

  private async getLocalGraphPath(config: NxspConfig): Promise<string> {
    if (this.localGraphPath) {
      return this.localGraphPath;
    }
    const namespacePath = this.configManager.getNamespaceLocalPath(config);
    const graphDir = path.join(namespacePath, 'graph');
    await fs.mkdir(graphDir, { recursive: true });
    this.localGraphPath = path.join(graphDir, 'knowledge-graph.json');
    return this.localGraphPath;
  }

  private invalidateCache(): void {
    this.graphCache = null;
    this.cache.clear();
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = setTimeout(() => this.flushPendingUpdates(), 100);
  }

  private async flushPendingUpdates(): Promise<void> {
    if (Object.keys(this.pendingUpdates).length === 0) return;

    this.monitor.startTimer('knowledgeGraph.flush');
    
    try {
      await this.circuitBreaker.execute(async () => {
        const graph = await this.loadLocalGraphUncached() || await this.createEmptyGraph();
        
        if (this.pendingUpdates.deleteNodes) {
          const deleteSet = new Set(this.pendingUpdates.deleteNodes);
          graph.nodes = graph.nodes.filter((n) => !deleteSet.has(n.id));
        }
        
        if (this.pendingUpdates.deleteEdges) {
          const deleteSet = new Set(this.pendingUpdates.deleteEdges);
          graph.edges = graph.edges.filter((e) => !deleteSet.has(e.id));
        }
        
        if (this.pendingUpdates.nodes) {
          const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
          for (const node of this.pendingUpdates.nodes) {
            const existing = nodeMap.get(node.id);
            if (existing) {
              existing.metadata = { ...existing.metadata, ...node.metadata };
            } else {
              graph.nodes.push(node);
              nodeMap.set(node.id, node);
            }
          }
        }
        
        if (this.pendingUpdates.edges) {
          const edgeMap = new Map(graph.edges.map((e) => [e.id, e]));
          for (const edge of this.pendingUpdates.edges) {
            const existing = edgeMap.get(edge.id);
            if (existing) {
              existing.metadata = { ...existing.metadata, ...edge.metadata };
            } else {
              graph.edges.push(edge);
              edgeMap.set(edge.id, edge);
            }
          }
        }
        
        graph.lastUpdated = new Date().toISOString();
        await this.saveLocalGraphUncached(graph);
      });
      
      this.pendingUpdates = {};
      this.invalidateCache();
    } finally {
      this.monitor.endTimer('knowledgeGraph.flush');
    }
  }

  private async loadLocalGraphUncached(): Promise<KnowledgeGraph | null> {
    try {
      const config = await this.configManager.loadConfig();
      const graphPath = await this.getLocalGraphPath(config);
      const content = await fs.readFile(graphPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async loadLocalGraph(): Promise<KnowledgeGraph | null> {
    const now = Date.now();
    
    if (this.graphCache && now - this.graphCache.timestamp < this.cacheTTL) {
      return this.graphCache.graph;
    }

    this.monitor.startTimer('knowledgeGraph.load');
    try {
      const graph = await retry(
        () => this.loadLocalGraphUncached(),
        { maxAttempts: 3, initialDelay: 100 }
      );
      
      if (graph) {
        this.graphCache = { graph, timestamp: now };
      }
      
      return graph;
    } finally {
      this.monitor.endTimer('knowledgeGraph.load');
    }
  }

  private async saveLocalGraphUncached(graph: KnowledgeGraph): Promise<void> {
    const config = await this.configManager.loadConfig();
    const graphPath = await this.getLocalGraphPath(config);
    await fs.writeFile(graphPath, JSON.stringify(graph, null, 2), 'utf-8');
  }

  async saveLocalGraph(graph: KnowledgeGraph): Promise<void> {
    this.monitor.startTimer('knowledgeGraph.save');
    try {
      await this.saveLocalGraphUncached(graph);
      this.graphCache = { graph, timestamp: Date.now() };
      this.invalidateCache();
    } finally {
      this.monitor.endTimer('knowledgeGraph.save');
    }
  }

  async createEmptyGraph(): Promise<KnowledgeGraph> {
    return {
      nodes: [],
      edges: [],
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    };
  }

  async addServiceNode(serviceName: string, metadata?: Record<string, any>): Promise<GraphNode> {
    const nodeId = `service:${serviceName}`;
    const node: GraphNode = {
      id: nodeId,
      type: 'service',
      name: serviceName,
      metadata,
    };

    if (!this.pendingUpdates.nodes) this.pendingUpdates.nodes = [];
    this.pendingUpdates.nodes.push(node);
    
    if (this.pendingUpdates.deleteNodes) {
      this.pendingUpdates.deleteNodes = this.pendingUpdates.deleteNodes.filter(
        (id) => id !== nodeId
      );
    }

    this.scheduleFlush();
    return node;
  }

  async addContractNode(
    serviceName: string,
    contractType: 'api' | 'events',
    contractName: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<GraphNode> {
    const nodeId = `contract:${serviceName}:${contractType}:${contractName}:${version}`;
    const node: GraphNode = {
      id: nodeId,
      type: 'contract',
      name: `${serviceName}/${contractType}/${contractName}:${version}`,
      metadata: { ...metadata, service: serviceName, contractType, contractName, version },
    };

    if (!this.pendingUpdates.nodes) this.pendingUpdates.nodes = [];
    this.pendingUpdates.nodes.push(node);
    
    if (this.pendingUpdates.deleteNodes) {
      this.pendingUpdates.deleteNodes = this.pendingUpdates.deleteNodes.filter(
        (id) => id !== nodeId
      );
    }

    this.scheduleFlush();
    return node;
  }

  async addEdge(
    source: string,
    target: string,
    type: 'depends_on' | 'provides' | 'consumes' | 'references' | 'extends' | 'produces' | 'uses',
    metadata?: Record<string, any>
  ): Promise<GraphEdge> {
    const edgeId = `edge:${source}:${target}:${type}`;
    const edge: GraphEdge = {
      id: edgeId,
      source,
      target,
      type,
      metadata,
    };

    if (!this.pendingUpdates.edges) this.pendingUpdates.edges = [];
    this.pendingUpdates.edges.push(edge);
    
    if (this.pendingUpdates.deleteEdges) {
      this.pendingUpdates.deleteEdges = this.pendingUpdates.deleteEdges.filter(
        (id) => id !== edgeId
      );
    }

    this.scheduleFlush();
    return edge;
  }

  async addNodesAndEdges(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
    if (!this.pendingUpdates.nodes) this.pendingUpdates.nodes = [];
    if (!this.pendingUpdates.edges) this.pendingUpdates.edges = [];
    
    this.pendingUpdates.nodes.push(...nodes);
    this.pendingUpdates.edges.push(...edges);
    
    this.scheduleFlush();
  }

  async syncFromConfig(): Promise<KnowledgeGraph> {
    this.monitor.startTimer('knowledgeGraph.syncFromConfig');
    
    try {
      const config = await this.configManager.loadConfig();
      
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      
      nodes.push({
        id: `service:${config.service.name}`,
        type: 'service',
        name: config.service.name,
        metadata: { team: config.service.team },
      });
      
      for (const expose of config.exposes) {
        const contractNode: GraphNode = {
          id: `contract:${config.service.name}:${expose.type}:${expose.name}:v1`,
          type: 'contract',
          name: `${config.service.name}/${expose.type}/${expose.name}:v1`,
          metadata: { path: expose.path, service: config.service.name, contractType: expose.type, contractName: expose.name, version: 'v1' },
        };
        nodes.push(contractNode);
        
        edges.push({
          id: `edge:service:${config.service.name}:${contractNode.id}:provides`,
          source: `service:${config.service.name}`,
          target: contractNode.id,
          type: 'provides',
        });
      }
      
      for (const [serviceName, contractRef] of Object.entries(config.depends)) {
        const serviceNodeId = `service:${serviceName}`;
        
        const existingServiceNode = nodes.find((n) => n.id === serviceNodeId);
        if (!existingServiceNode) {
          nodes.push({
            id: serviceNodeId,
            type: 'service',
            name: serviceName,
            metadata: {},
          });
        }
        
        edges.push({
          id: `edge:service:${config.service.name}:${serviceNodeId}:depends_on`,
          source: `service:${config.service.name}`,
          target: serviceNodeId,
          type: 'depends_on',
          metadata: { contractRef },
        });
      }
      
      await this.addNodesAndEdges(nodes, edges);
      await this.flushPendingUpdates();
      
      return (await this.loadLocalGraph()) || await this.createEmptyGraph();
    } finally {
      this.monitor.endTimer('knowledgeGraph.syncFromConfig');
    }
  }

  async connectToGitNexus(gitnexusConfig: GitNexusConfig): Promise<boolean> {
    return withFallback(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return true;
      },
      () => false
    );
  }

  async syncToGitNexus(): Promise<boolean> {
    return withFallback(
      async () => {
        const config = await this.configManager.loadConfig();
        if (!config.gitnexus) {
          throw new Error('GitNexus configuration not found');
        }

        const graph = await this.loadLocalGraph();
        if (!graph) {
          throw new Error('No local graph to sync');
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
        return true;
      },
      () => false
    );
  }

  async syncFromGitNexus(): Promise<KnowledgeGraph> {
    return withFallback(
      async () => {
        const config = await this.configManager.loadConfig();
        if (!config.gitnexus) {
          throw new Error('GitNexus configuration not found');
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
        
        const graph = (await this.loadLocalGraph()) || (await this.createEmptyGraph());
        return graph;
      },
      async () => await this.createEmptyGraph()
    );
  }

  async getServiceNode(serviceName: string): Promise<GraphNode | undefined> {
    const cacheKey = hashKey('serviceNode', serviceName);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const graph = await this.loadLocalGraph();
    const node = graph?.nodes.find((n) => n.id === `service:${serviceName}`);
    
    if (node) {
      this.cache.set(cacheKey, node);
    }
    
    return node;
  }

  async getAllServiceNodes(): Promise<GraphNode[]> {
    const cacheKey = 'allServiceNodes';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const graph = await this.loadLocalGraph();
    const nodes = graph?.nodes.filter((n) => n.type === 'service') || [];
    
    this.cache.set(cacheKey, nodes);
    return nodes;
  }

  async getAllEdges(): Promise<GraphEdge[]> {
    const cacheKey = 'allEdges';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const graph = await this.loadLocalGraph();
    const edges = graph?.edges || [];
    
    this.cache.set(cacheKey, edges);
    return edges;
  }

  async getGraphSnapshot(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const graph = await this.loadLocalGraph();
    return {
      nodes: graph?.nodes || [],
      edges: graph?.edges || [],
    };
  }

  async checkContractCompatibility(
    serviceName: string,
    contractType: string,
    contractName: string,
    currentVersion: string,
    proposedVersion: string
  ): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const cacheKey = hashKey('contractCompatibility', serviceName, contractType, contractName, currentVersion, proposedVersion);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const contractNodeId = `contract:${serviceName}:${contractType}:${contractName}:${currentVersion}`;
    const graph = await this.loadLocalGraph();
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!graph) {
      issues.push('知识图谱未找到');
      recommendations.push('请先同步知识图谱');
      const result = { compatible: false, issues, recommendations };
      this.cache.set(cacheKey, result, 5000);
      return result;
    }

    const currentContract = graph.nodes.find((n) => n.id === contractNodeId);
    if (!currentContract) {
      issues.push(`未找到当前版本 ${currentVersion} 的合约`);
      recommendations.push('请确认合约名称和版本');
      const result = { compatible: false, issues, recommendations };
      this.cache.set(cacheKey, result, 5000);
      return result;
    }

    const dependents = graph.edges.filter(
      (e) => e.target === contractNodeId && (e.type === 'consumes' || e.type === 'uses')
    );

    if (dependents.length > 0) {
      const dependentServices = dependents.map((e) => {
        const sourceNode = graph.nodes.find((n) => n.id === e.source);
        return sourceNode?.name || e.source;
      });
      issues.push(`${dependentServices.length} 个服务依赖此合约`);
      recommendations.push(`请确认变更不会破坏依赖服务: ${dependentServices.join(', ')}`);
    }

    const result = {
      compatible: issues.length === 0,
      issues,
      recommendations,
    };
    
    this.cache.set(cacheKey, result, 30000);
    return result;
  }

  async getContractDependents(
    serviceName: string,
    contractType: string,
    contractName: string,
    version: string
  ): Promise<string[]> {
    const cacheKey = hashKey('contractDependents', serviceName, contractType, contractName, version);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const contractNodeId = `contract:${serviceName}:${contractType}:${contractName}:${version}`;
    const graph = await this.loadLocalGraph();
    
    if (!graph) return [];

    const dependents = graph.edges.filter(
      (e) => e.target === contractNodeId && (e.type === 'consumes' || e.type === 'uses')
    );

    const result = dependents.map((e) => {
      const sourceNode = graph.nodes.find((n) => n.id === e.source);
      return sourceNode?.name?.replace('service:', '') || e.source;
    }).filter(Boolean) as string[];
    
    this.cache.set(cacheKey, result, 30000);
    return result;
  }

  async getCacheStats() {
    return {
      lruCache: this.cache.getStats(),
      graphCached: this.graphCache !== null,
      pendingUpdates: Object.keys(this.pendingUpdates).length,
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }
}
