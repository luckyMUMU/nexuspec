import React, { useState } from 'react';
import { 
  GitPullRequest, Clock, CheckCircle, XCircle, 
  AlertCircle, Code2, User, Calendar, ArrowRight,
  ChevronRight
} from 'lucide-react';
import { CSPFlowNode, CSPStatus } from '../types';
import { clsx } from 'clsx';

type CSPFlowViewProps = {
  nodes: CSPFlowNode[];
};

const statusConfig: Record<CSPStatus, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ReactNode;
  label: string;
}> = {
  draft: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: <Clock className="w-4 h-4" />,
    label: '草稿',
  },
  submitted: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: <GitPullRequest className="w-4 h-4" />,
    label: '已提交',
  },
  reviewing: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    icon: <AlertCircle className="w-4 h-4" />,
    label: '审核中',
  },
  accepted: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: <CheckCircle className="w-4 h-4" />,
    label: '已接受',
  },
  rejected: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: <XCircle className="w-4 h-4" />,
    label: '已拒绝',
  },
  counterproposed: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: <GitPullRequest className="w-4 h-4" />,
    label: '反提案',
  },
  implementing: {
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
    icon: <Code2 className="w-4 h-4" />,
    label: '实现中',
  },
  completed: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    icon: <CheckCircle className="w-4 h-4" />,
    label: '已完成',
  },
  closed: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: <XCircle className="w-4 h-4" />,
    label: '已关闭',
  },
};

const workflowSteps = [
  { status: 'draft', label: '创建草案' },
  { status: 'submitted', label: '提交' },
  { status: 'reviewing', label: '审核' },
  { status: 'accepted', label: '接受' },
  { status: 'implementing', label: '实现' },
  { status: 'completed', label: '完成' },
];

const CSPCard: React.FC<{ 
  csp: CSPFlowNode; 
  isSelected: boolean;
  onSelect: () => void;
}> = ({ csp, isSelected, onSelect }) => {
  const config = statusConfig[csp.status];
  
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md',
        isSelected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{csp.name}</h3>
            <span className={clsx(
              'flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border',
              config.bgColor,
              config.color,
              config.borderColor
            )}>
              {config.icon}
              {config.label}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {csp.metadata?.description}
          </p>
          
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {csp.metadata?.initiator && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {csp.metadata.initiator}
              </div>
            )}
            {csp.metadata?.targetService && (
              <div className="flex items-center gap-1">
                <GitPullRequest className="w-3 h-3" />
                → {csp.metadata.targetService}
              </div>
            )}
            {csp.metadata?.contractType && (
              <div className="flex items-center gap-1">
                <Code2 className="w-3 h-3" />
                {csp.metadata.contractType}
              </div>
            )}
            {csp.metadata?.createdAt && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(csp.metadata.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        
        <ChevronRight className={clsx('w-5 h-5 shrink-0', config.color)} />
      </div>
    </div>
  );
};

const WorkflowTimeline: React.FC<{ currentStatus: CSPStatus }> = ({ currentStatus }) => {
  const getStepStatus = (stepStatus: CSPStatus) => {
    const currentIndex = workflowSteps.findIndex(s => s.status === currentStatus);
    const stepIndex = workflowSteps.findIndex(s => s.status === stepStatus);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">流程进度</h3>
      <div className="relative">
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, index) => {
            const status = getStepStatus(step.status as CSPStatus);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            
            return (
              <div key={step.status} className="flex flex-col items-center relative z-10">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2',
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 border-blue-500 text-white animate-pulse' :
                  'bg-white border-gray-300 text-gray-400'
                )}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className={clsx(
                  'text-xs font-medium',
                  isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0 flex">
          {workflowSteps.slice(0, -1).map((step, index) => {
            const currentIndex = workflowSteps.findIndex(s => s.status === currentStatus);
            const isFilled = index < currentIndex;
            
            return (
              <div
                key={step.status}
                className={clsx(
                  'flex-1 h-full',
                  isFilled ? 'bg-green-500' : 'bg-transparent'
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const CSPFlowView: React.FC<CSPFlowViewProps> = ({ nodes }) => {
  const [selectedCSP, setSelectedCSP] = useState<CSPFlowNode | null>(nodes[0] || null);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <GitPullRequest className="w-6 h-6 text-primary-600" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">CSP 流程</h2>
            <p className="text-sm text-gray-500">跨服务提案的状态和流程管理</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-gray-200 p-4 overflow-auto scrollbar-thin">
          <div className="space-y-3">
            {nodes.map((csp) => (
              <CSPCard
                key={csp.id}
                csp={csp}
                isSelected={selectedCSP?.id === csp.id}
                onSelect={() => setSelectedCSP(csp)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto scrollbar-thin">
          {selectedCSP ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCSP.name}</h2>
                  <span className={clsx(
                    'flex items-center gap-1 px-3 py-1 text-sm rounded-full border',
                    statusConfig[selectedCSP.status].bgColor,
                    statusConfig[selectedCSP.status].color,
                    statusConfig[selectedCSP.status].borderColor
                  )}>
                    {statusConfig[selectedCSP.status].icon}
                    {statusConfig[selectedCSP.status].label}
                  </span>
                </div>
                <p className="text-gray-600">{selectedCSP.metadata?.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedCSP.metadata?.initiator && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">发起方</div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {selectedCSP.metadata.initiator}
                    </div>
                  </div>
                )}
                {selectedCSP.metadata?.targetService && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">目标服务</div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <GitPullRequest className="w-4 h-4" />
                      {selectedCSP.metadata.targetService}
                    </div>
                  </div>
                )}
                {selectedCSP.metadata?.contractType && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">契约类型</div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      {selectedCSP.metadata.contractType}
                    </div>
                  </div>
                )}
                {selectedCSP.metadata?.createdAt && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">创建时间</div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedCSP.metadata.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <WorkflowTimeline currentStatus={selectedCSP.status} />

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {selectedCSP.status === 'submitted' || selectedCSP.status === 'reviewing' ? (
                  <>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      接受提案
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      拒绝提案
                    </button>
                  </>
                ) : selectedCSP.status === 'accepted' ? (
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    开始实现
                  </button>
                ) : selectedCSP.status === 'implementing' ? (
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    标记完成
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <GitPullRequest className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg">选择一个 CSP 查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
