import React, { useState, useEffect } from 'react';
import TreeView from './components/TreeView';
import CSPFlow from './components/CSPFlow';
import ServiceDependency from './components/ServiceDependency';
import { loadNamespaceData } from './utils/dataLoader';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tree' | 'csp' | 'dependency'>('tree');
  const [namespaceData, setNamespaceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await loadNamespaceData();
        setNamespaceData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load namespace data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>NexusSpec Visualizer</h1>
        <p>GitNexus Visualization Interface</p>
      </header>

      <nav className="app-nav">
        <button 
          className={activeTab === 'tree' ? 'active' : ''}
          onClick={() => setActiveTab('tree')}
        >
          Spec Tree
        </button>
        <button 
          className={activeTab === 'csp' ? 'active' : ''}
          onClick={() => setActiveTab('csp')}
        >
          CSP Flow
        </button>
        <button 
          className={activeTab === 'dependency' ? 'active' : ''}
          onClick={() => setActiveTab('dependency')}
        >
          Service Dependencies
        </button>
      </nav>

      <main className="app-content">
        {activeTab === 'tree' && <TreeView data={namespaceData?.tree} />}
        {activeTab === 'csp' && <CSPFlow data={namespaceData?.csp} />}
        {activeTab === 'dependency' && <ServiceDependency data={namespaceData?.dependencies} />}
      </main>

      <footer className="app-footer">
        <p>NexusSpec Visualizer v0.1.0</p>
      </footer>
    </div>
  );
};

export default App;