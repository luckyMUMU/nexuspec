import React, { useState } from 'react';
import { 
  Folder, FileText, Database, GitBranch, Shield, ExternalLink, 
  ChevronDown, ChevronRight, Code, Zap 
} from 'lucide-react';
import { TreeNode } from '../types';
import { clsx } from 'clsx';

type SpecTreeViewProps = {
  data: TreeNode;
};

const getNodeIcon = (type: TreeNode['type'], isExpanded?: boolean) => {
  switch (type) {
    case 'namespace':
      return <Database className="w-5 h-5 text-green-600" />;
    case 'service':
      return <Zap className="w-5 h-5 text-blue-600" />;
    case 'contract':
      return <Code className="w-5 h-5 text-amber-600" />;
    case 'shared':
      return isExpanded ? <Folder className="w-5 h-5 text-amber-500" /> : <Folder className="w-5 h-5 text-amber-500" />;
    case 'policy':
      return <Shield className="w-5 h-5 text-purple-600" />;
    case 'external':
      return <ExternalLink className="w-5 h-5 text-indigo-600" />;
    default:
      return <FileText className="w-5 h-5 text-gray-600" />;
  }
};

const getNodeColor = (type: TreeNode['type'], status?: string) => {
  if (status === 'deprecated') {
    return 'bg-gray-100 text-gray-500 border-gray-200';
  }
  if (status === 'draft') {
    return 'bg-yellow-50 text-yellow-800 border-yellow-200';
  }
  switch (type) {
    case 'namespace':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'service':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'contract':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'shared':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'policy':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'external':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
};

const TreeNodeComponent: React.FC<{ node: TreeNode; level: number }> = ({ node, level }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all',
          getNodeColor(node.type, node.metadata?.status),
          'ml-' + (level * 4)
        )}
        style={{ marginLeft: `${level * 16}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren && (
          isExpanded ? 
            <ChevronDown className="w-4 h-4" /> : 
            <ChevronRight className="w-4 h-4" />
        )}
        {!hasChildren && <div className="w-4 h-4" />}
        {getNodeIcon(node.type, isExpanded)}
        <span className="font-medium">{node.name}</span>
        {node.metadata?.version && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-white bg-opacity-50 rounded-full border border-opacity-30">
            {node.metadata.version}
          </span>
        )}
        {node.metadata?.status && (
          <span className={clsx(
            'ml-2 px-2 py-0.5 text-xs rounded-full border',
            node.metadata.status === 'active' ? 'bg-green-100 text-green-700 border-green-300' :
            node.metadata.status === 'deprecated' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
            'bg-gray-100 text-gray-600 border-gray-300'
          )}>
            {node.metadata.status}
          </span>
        )}
        {node.metadata?.contractType && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-300">
            {node.metadata.contractType}
          </span>
        )}
      </div>
      
      {node.metadata?.description && (
        <div 
          className="ml-4 mt-1 text-sm text-gray-500"
          style={{ marginLeft: `${(level * 16) + 32}px` }}
        >
          {node.metadata.description}
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children?.map((child) => (
            <TreeNodeComponent 
              key={child.id} 
              node={child} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SpecTreeView: React.FC<SpecTreeViewProps> = ({ data }) => {
  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-primary-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">树状 Spec 结构</h2>
            <p className="text-sm text-gray-500">可视化展示命名空间的完整架构</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto scrollbar-thin">
        <TreeNodeComponent node={data} level={0} />
      </div>
    </div>
  );
};
