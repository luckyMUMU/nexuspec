import React, { useState } from 'react';

interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  children?: TreeNode[];
  path?: string;
}

interface TreeViewProps {
  data: TreeNode[] | null;
}

const TreeView: React.FC<TreeViewProps> = ({ data }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['spec', 'contracts', 'proposals']));

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const renderTree = (nodes: TreeNode[], level: number = 0, currentPath: string = '') => {
    return nodes.map((node) => {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
      const isExpanded = expanded.has(nodePath);

      return (
        <div key={nodePath} className="tree-node">
          <div 
            className="tree-node-header"
            style={{ paddingLeft: `${level * 20}px` }}
          >
            {node.type === 'directory' && (
              <span 
                className="tree-toggle"
                onClick={() => toggleExpand(nodePath)}
              >
                {isExpanded ? '▼' : '►'}
              </span>
            )}
            <span className={`tree-node-icon ${node.type}`}>
              {node.type === 'directory' ? '📁' : '📄'}
            </span>
            <span className="tree-node-name">{node.name}</span>
          </div>
          {node.type === 'directory' && node.children && isExpanded && (
            <div className="tree-node-children">
              {renderTree(node.children, level + 1, nodePath)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!data) {
    return <div className="tree-view">No tree data available</div>;
  }

  return (
    <div className="tree-view">
      <h2>Tree状 Spec 结构</h2>
      <div className="tree-container">
        {renderTree(data)}
      </div>
    </div>
  );
};

export default TreeView;