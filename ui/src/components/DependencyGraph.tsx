import React, { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Network, Zap, ExternalLink, 
  Info, Users 
} from 'lucide-react';
import { ServiceNode, ServiceEdge } from '../types';

type DependencyGraphProps = {
  nodes: ServiceNode[];
  edges: ServiceEdge[];
};

const ServiceNodeComponent: React.FC<{ data: { node: ServiceNode } }> = ({ data }) => {
  const { node } = data;
  const isExternal = node.type === 'external';
  
  return (
    <div className="px-4 py-3 bg-white rounded-xl shadow-lg border-2 min-w-[160px]">
      <Handle type="target" position={Position.Left} className="bg-blue-500" />
      <Handle type="source" position={Position.Right} className="bg-blue-500" />
      
      <div className="flex items-center gap-3">
        <div className={isExternal ? 'p-2 bg-indigo-100 rounded-lg' : 'p-2 bg-blue-100 rounded-lg'}>
          {isExternal ? (
            <ExternalLink className="w-5 h-5 text-indigo-600" />
          ) : (
            <Zap className="w-5 h-5 text-blue-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{node.name}</div>
          {node.metadata?.team && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="w-3 h-3" />
              {node.metadata.team}
            </div>
          )}
        </div>
      </div>
      
      {node.metadata?.description && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">{node.metadata.description}</p>
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  service: ServiceNodeComponent,
};

const DependencyGraphInner: React.FC<DependencyGraphProps> = ({ nodes, edges }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<ServiceNode | null>(null);

  const initialNodes = useMemo((): Node[] => {
    const positions: Record<string, { x: number; y: number }> = {
      'svc-os': { x: 100, y: 150 },
      'svc-ls': { x: 400, y: 50 },
      'svc-ns': { x: 400, y: 250 },
      'svc-ps': { x: 100, y: 350 },
      'ext-pg': { x: -200, y: 350 },
    };

    return nodes.map((node) => ({
      id: node.id,
      type: 'service',
      position: positions[node.id] || { x: 0, y: 0 },
      data: { node },
    }));
  }, [nodes]);

  const initialEdges = useMemo((): Edge[] => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#3b82f6',
      },
      data: edge.metadata,
      label: edge.type === 'depends_on' ? 'depends on' : 'provides',
      labelStyle: { fill: '#64748b', fontSize: 12 },
    }));
  }, [edges]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setFlowEdges((eds) => addEdge(params, eds)),
    [setFlowEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const serviceNode = nodes.find(n => n.id === node.id);
    if (serviceNode) {
      setSelectedNode(serviceNode);
    }
  }, [nodes]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-primary-600" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">服务依赖关系</h2>
            <p className="text-sm text-gray-500">交互式图形展示服务间的依赖关系</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background color="#e2e8f0" gap={16} />
            <Controls className="bg-white border border-gray-200 shadow-sm rounded-lg" />
            <MiniMap
              className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden"
              nodeColor={(node) => {
                const serviceNode = nodes.find(n => n.id === node.id);
                return serviceNode?.type === 'external' ? '#818cf8' : '#60a5fa';
              }}
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="w-72 border-l border-gray-200 bg-gray-50 p-4 overflow-auto scrollbar-thin">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">节点详情</h3>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">服务名称</div>
                <div className="font-medium text-gray-900">{selectedNode.name}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">类型</div>
                <div className="font-medium text-gray-900 capitalize">{selectedNode.type}</div>
              </div>

              {selectedNode.metadata?.team && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">团队</div>
                  <div className="font-medium text-gray-900">{selectedNode.metadata.team}</div>
                </div>
              )}

              {selectedNode.metadata?.description && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">描述</div>
                  <div className="text-sm text-gray-700">{selectedNode.metadata.description}</div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">依赖关系</div>
                <div className="space-y-1">
                  {edges.filter(e => e.source === selectedNode.id).map(edge => {
                    const targetNode = nodes.find(n => n.id === edge.target);
                    return (
                      <div key={edge.id} className="text-sm text-gray-700">
                        → {targetNode?.name}
                      </div>
                    );
                  })}
                  {edges.filter(e => e.source === selectedNode.id).length === 0 && (
                    <div className="text-sm text-gray-500 italic">无依赖</div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">被依赖</div>
                <div className="space-y-1">
                  {edges.filter(e => e.target === selectedNode.id).map(edge => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    return (
                      <div key={edge.id} className="text-sm text-gray-700">
                        ← {sourceNode?.name}
                      </div>
                    );
                  })}
                  {edges.filter(e => e.target === selectedNode.id).length === 0 && (
                    <div className="text-sm text-gray-500 italic">无依赖者</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DependencyGraph: React.FC<DependencyGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner {...props} />
    </ReactFlowProvider>
  );
};
