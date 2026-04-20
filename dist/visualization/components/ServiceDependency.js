"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const d3 = __importStar(require("d3"));
const ServiceDependency = ({ data }) => {
    const svgRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!data || !svgRef.current)
            return;
        // 清除旧的图表
        d3.select(svgRef.current).selectAll('*').remove();
        // 设置 SVG 尺寸
        const width = 800;
        const height = 600;
        // 准备数据
        const nodes = new Set();
        data.forEach(d => {
            nodes.add(d.source);
            nodes.add(d.target);
        });
        const nodeArray = Array.from(nodes).map(name => ({
            name,
            x: Math.random() * width,
            y: Math.random() * height
        }));
        const linkArray = data.map(d => ({
            source: d.source,
            target: d.target,
            type: d.type,
            version: d.version
        }));
        // 创建力导向图
        const simulation = d3.forceSimulation(nodeArray)
            .force('link', d3.forceLink(linkArray).id((d) => d.name).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2));
        // 创建 SVG
        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height);
        // 绘制连接线
        const link = svg.append('g')
            .selectAll('line')
            .data(linkArray)
            .enter()
            .append('line')
            .attr('stroke', '#999')
            .attr('stroke-width', 2);
        // 绘制节点
        const node = svg.append('g')
            .selectAll('circle')
            .data(nodeArray)
            .enter()
            .append('circle')
            .attr('r', 20)
            .attr('fill', (d) => d.name.includes('external') ? '#3498DB' : '#27AE60')
            .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
        // 添加节点标签
        const label = svg.append('g')
            .selectAll('text')
            .data(nodeArray)
            .enter()
            .append('text')
            .text((d) => d.name)
            .attr('font-size', '12px')
            .attr('text-anchor', 'middle')
            .attr('dy', 5);
        // 添加链接标签
        const linkLabel = svg.append('g')
            .selectAll('text')
            .data(linkArray)
            .enter()
            .append('text')
            .text((d) => `${d.type}:${d.version}`)
            .attr('font-size', '10px')
            .attr('text-anchor', 'middle');
        // 更新力导向图
        simulation.on('tick', () => {
            link
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);
            node
                .attr('cx', (d) => d.x)
                .attr('cy', (d) => d.y);
            label
                .attr('x', (d) => d.x)
                .attr('y', (d) => d.y + 30);
            linkLabel
                .attr('x', (d) => (d.source.x + d.target.x) / 2)
                .attr('y', (d) => (d.source.y + d.target.y) / 2);
        });
        // 拖拽函数
        function dragstarted(event, d) {
            if (!event.active)
                simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragended(event, d) {
            if (!event.active)
                simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }, [data]);
    if (!data) {
        return (0, jsx_runtime_1.jsx)("div", { className: "service-dependency", children: "No dependency data available" });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "service-dependency", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u670D\u52A1\u4F9D\u8D56\u5173\u7CFB" }), (0, jsx_runtime_1.jsx)("div", { className: "dependency-graph", children: (0, jsx_runtime_1.jsx)("svg", { ref: svgRef }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dependency-legend", children: [(0, jsx_runtime_1.jsxs)("div", { className: "legend-item", children: [(0, jsx_runtime_1.jsx)("div", { className: "legend-color", style: { backgroundColor: '#27AE60' } }), (0, jsx_runtime_1.jsx)("span", { children: "\u5185\u90E8\u670D\u52A1" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "legend-item", children: [(0, jsx_runtime_1.jsx)("div", { className: "legend-color", style: { backgroundColor: '#3498DB' } }), (0, jsx_runtime_1.jsx)("span", { children: "\u5916\u90E8\u670D\u52A1" })] })] })] }));
};
exports.default = ServiceDependency;
