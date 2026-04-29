export type TreeNode = {
  id: string;
  name: string;
  type: 'namespace' | 'service' | 'contract' | 'shared' | 'policy' | 'external';
  children?: TreeNode[];
  metadata?: {
    description?: string;
    version?: string;
    status?: 'active' | 'deprecated' | 'draft';
    contractType?: 'api' | 'events';
  };
};

export type ServiceNode = {
  id: string;
  name: string;
  type: 'service' | 'external';
  metadata?: {
    team?: string;
    description?: string;
  };
};

export type ServiceEdge = {
  id: string;
  source: string;
  target: string;
  type: 'depends_on' | 'provides';
  metadata?: {
    contractRef?: string;
  };
};

export type CSPStatus = 'draft' | 'submitted' | 'reviewing' | 'accepted' | 'rejected' | 'counterproposed' | 'implementing' | 'completed' | 'closed';

export type CSPFlowNode = {
  id: string;
  name: string;
  status: CSPStatus;
  metadata?: {
    description?: string;
    initiator?: string;
    targetService?: string;
    contractType?: 'api' | 'events';
    createdAt?: string;
  };
};

export type CSPFlowEdge = {
  id: string;
  source: string;
  target: string;
  type: 'transition';
  metadata?: {
    action?: string;
  };
};
