"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TreeView = ({ data }) => {
    const [expanded, setExpanded] = (0, react_1.useState)(new Set(['spec', 'contracts', 'proposals']));
    const toggleExpand = (path) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        }
        else {
            newExpanded.add(path);
        }
        setExpanded(newExpanded);
    };
    const renderTree = (nodes, level = 0, currentPath = '') => {
        return nodes.map((node) => {
            const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
            const isExpanded = expanded.has(nodePath);
            return ((0, jsx_runtime_1.jsxs)("div", { className: "tree-node", children: [(0, jsx_runtime_1.jsxs)("div", { className: "tree-node-header", style: { paddingLeft: `${level * 20}px` }, children: [node.type === 'directory' && ((0, jsx_runtime_1.jsx)("span", { className: "tree-toggle", onClick: () => toggleExpand(nodePath), children: isExpanded ? '▼' : '►' })), (0, jsx_runtime_1.jsx)("span", { className: `tree-node-icon ${node.type}`, children: node.type === 'directory' ? '📁' : '📄' }), (0, jsx_runtime_1.jsx)("span", { className: "tree-node-name", children: node.name })] }), node.type === 'directory' && node.children && isExpanded && ((0, jsx_runtime_1.jsx)("div", { className: "tree-node-children", children: renderTree(node.children, level + 1, nodePath) }))] }, nodePath));
        });
    };
    if (!data) {
        return (0, jsx_runtime_1.jsx)("div", { className: "tree-view", children: "No tree data available" });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "tree-view", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Tree\u72B6 Spec \u7ED3\u6784" }), (0, jsx_runtime_1.jsx)("div", { className: "tree-container", children: renderTree(data) })] }));
};
exports.default = TreeView;
