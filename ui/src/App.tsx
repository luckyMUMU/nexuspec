import React, { useState } from 'react';
import { 
  GitBranch, Network, GitPullRequest, 
  Menu, X, Settings, Database
} from 'lucide-react';
import { SpecTreeView } from './components/SpecTreeView';
import { DependencyGraph } from './components/DependencyGraph';
import { CSPFlowView } from './components/CSPFlowView';
import { specTreeData, serviceNodes, serviceEdges, cspFlowNodes } from './mockData';

type ViewType = 'tree' | 'dependencies' | 'csp';

const NavItem: React.FC<{
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ id, label, icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left ${
        isActive
          ? 'bg-primary-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      <span className="font-medium">{label}</span>
    </button>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('tree');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'tree' as const, label: '树状结构', icon: <GitBranch /> },
    { id: 'dependencies' as const, label: '依赖关系', icon: <Network /> },
    { id: 'csp' as const, label: 'CSP 流程', icon: <GitPullRequest /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        {isSidebarOpen && (
          <div className="bg-white border-r border-gray-200 w-64 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">NexusSpec</h1>
                  <p className="text-xs text-gray-500">可视化界面</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.id}
                  {...item}
                  isActive={activeView === item.id}
                  onClick={() => setActiveView(item.id)}
                />
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all w-full text-left">
                <Settings className="w-5 h-5" />
                <span className="font-medium">设置</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {navItems.find((item) => item.id === activeView)?.label}
                </h2>
                <p className="text-sm text-gray-500">payments-namespace</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                已连接
              </span>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden">
            <div className="h-full">
              {activeView === 'tree' && <SpecTreeView data={specTreeData} />}
              {activeView === 'dependencies' && <DependencyGraph nodes={serviceNodes} edges={serviceEdges} />}
              {activeView === 'csp' && <CSPFlowView nodes={cspFlowNodes} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
