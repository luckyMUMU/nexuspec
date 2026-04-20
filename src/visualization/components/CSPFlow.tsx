import React from 'react';

interface CSP {  id: string;  title: string;  status: string;  initiator: {
    service: string;
    agent: string;
    created_at: string;
  };  targets: Array<{
    service: string;
    required_action: string;
    contract: {
      type: string;
      name: string;
      current_version: string;
      proposed_version: string;
      change: string;
      detail: string;
    };
    urgency: string;
    review_status: string;
  }>;
}

interface CSPFlowProps {
  data: CSP[] | null;
}

const CSPFlow: React.FC<CSPFlowProps> = ({ data }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return '#FFC107';
      case 'submitted':
        return '#3498DB';
      case 'reviewing':
        return '#9B59B6';
      case 'accepted':
        return '#27AE60';
      case 'rejected':
        return '#E74C3C';
      case 'completed':
        return '#1ABC9C';
      case 'closed':
        return '#95A5A6';
      default:
        return '#95A5A6';
    }
  };

  if (!data) {
    return <div className="csp-flow">No CSP data available</div>;
  }

  return (
    <div className="csp-flow">
      <h2>CSP 流程可视化</h2>
      <div className="csp-list">
        {data.map((csp) => (
          <div key={csp.id} className="csp-card">
            <div className="csp-header">
              <h3>{csp.id}: {csp.title}</h3>
              <span 
                className="csp-status"
                style={{ backgroundColor: getStatusColor(csp.status) }}
              >
                {csp.status}
              </span>
            </div>
            <div className="csp-details">
              <div className="csp-initiation">
                <h4>发起方</h4>
                <p>服务: {csp.initiator.service}</p>
                <p>Agent: {csp.initiator.agent}</p>
                <p>创建时间: {new Date(csp.initiator.created_at).toLocaleString()}</p>
              </div>
              <div className="csp-targets">
                <h4>目标服务</h4>
                {csp.targets.map((target, index) => (
                  <div key={index} className="csp-target">
                    <p>服务: {target.service}</p>
                    <p>操作: {target.required_action}</p>
                    <p>契约: {target.contract.type}/{target.contract.name}</p>
                    <p>版本: {target.contract.current_version} → {target.contract.proposed_version}</p>
                    <p>变更: {target.contract.change}</p>
                    <p>详情: {target.contract.detail}</p>
                    <p>紧急程度: {target.urgency}</p>
                    <p>评审状态: {target.review_status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CSPFlow;