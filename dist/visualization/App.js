"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TreeView_1 = __importDefault(require("./components/TreeView"));
const CSPFlow_1 = __importDefault(require("./components/CSPFlow"));
const ServiceDependency_1 = __importDefault(require("./components/ServiceDependency"));
const dataLoader_1 = require("./utils/dataLoader");
const App = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('tree');
    const [namespaceData, setNamespaceData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await (0, dataLoader_1.loadNamespaceData)();
                setNamespaceData(data);
                setError(null);
            }
            catch (err) {
                setError('Failed to load namespace data');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    if (loading) {
        return (0, jsx_runtime_1.jsx)("div", { className: "loading", children: "Loading..." });
    }
    if (error) {
        return (0, jsx_runtime_1.jsx)("div", { className: "error", children: error });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "app", children: [(0, jsx_runtime_1.jsxs)("header", { className: "app-header", children: [(0, jsx_runtime_1.jsx)("h1", { children: "NexusSpec Visualizer" }), (0, jsx_runtime_1.jsx)("p", { children: "GitNexus Visualization Interface" })] }), (0, jsx_runtime_1.jsxs)("nav", { className: "app-nav", children: [(0, jsx_runtime_1.jsx)("button", { className: activeTab === 'tree' ? 'active' : '', onClick: () => setActiveTab('tree'), children: "Spec Tree" }), (0, jsx_runtime_1.jsx)("button", { className: activeTab === 'csp' ? 'active' : '', onClick: () => setActiveTab('csp'), children: "CSP Flow" }), (0, jsx_runtime_1.jsx)("button", { className: activeTab === 'dependency' ? 'active' : '', onClick: () => setActiveTab('dependency'), children: "Service Dependencies" })] }), (0, jsx_runtime_1.jsxs)("main", { className: "app-content", children: [activeTab === 'tree' && (0, jsx_runtime_1.jsx)(TreeView_1.default, { data: namespaceData?.tree }), activeTab === 'csp' && (0, jsx_runtime_1.jsx)(CSPFlow_1.default, { data: namespaceData?.csp }), activeTab === 'dependency' && (0, jsx_runtime_1.jsx)(ServiceDependency_1.default, { data: namespaceData?.dependencies })] }), (0, jsx_runtime_1.jsx)("footer", { className: "app-footer", children: (0, jsx_runtime_1.jsx)("p", { children: "NexusSpec Visualizer v0.1.0" }) })] }));
};
exports.default = App;
