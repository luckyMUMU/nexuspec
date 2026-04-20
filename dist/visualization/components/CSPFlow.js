"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const CSPFlow = ({ data }) => {
    const getStatusColor = (status) => {
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
        return (0, jsx_runtime_1.jsx)("div", { className: "csp-flow", children: "No CSP data available" });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "csp-flow", children: [(0, jsx_runtime_1.jsx)("h2", { children: "CSP \u6D41\u7A0B\u53EF\u89C6\u5316" }), (0, jsx_runtime_1.jsx)("div", { className: "csp-list", children: data.map((csp) => ((0, jsx_runtime_1.jsxs)("div", { className: "csp-card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "csp-header", children: [(0, jsx_runtime_1.jsxs)("h3", { children: [csp.id, ": ", csp.title] }), (0, jsx_runtime_1.jsx)("span", { className: "csp-status", style: { backgroundColor: getStatusColor(csp.status) }, children: csp.status })] }), (0, jsx_runtime_1.jsxs)("div", { className: "csp-details", children: [(0, jsx_runtime_1.jsxs)("div", { className: "csp-initiation", children: [(0, jsx_runtime_1.jsx)("h4", { children: "\u53D1\u8D77\u65B9" }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u670D\u52A1: ", csp.initiator.service] }), (0, jsx_runtime_1.jsxs)("p", { children: ["Agent: ", csp.initiator.agent] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u521B\u5EFA\u65F6\u95F4: ", new Date(csp.initiator.created_at).toLocaleString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "csp-targets", children: [(0, jsx_runtime_1.jsx)("h4", { children: "\u76EE\u6807\u670D\u52A1" }), csp.targets.map((target, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "csp-target", children: [(0, jsx_runtime_1.jsxs)("p", { children: ["\u670D\u52A1: ", target.service] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u64CD\u4F5C: ", target.required_action] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u5951\u7EA6: ", target.contract.type, "/", target.contract.name] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u7248\u672C: ", target.contract.current_version, " \u2192 ", target.contract.proposed_version] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u53D8\u66F4: ", target.contract.change] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u8BE6\u60C5: ", target.contract.detail] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u7D27\u6025\u7A0B\u5EA6: ", target.urgency] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u8BC4\u5BA1\u72B6\u6001: ", target.review_status] })] }, index)))] })] })] }, csp.id))) })] }));
};
exports.default = CSPFlow;
