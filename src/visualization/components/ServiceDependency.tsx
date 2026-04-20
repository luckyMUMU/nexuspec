import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Dependency {
  source: string;
  target: string;
  type: string;
  version: string;
}

interface ServiceDependencyProps {
  data: Dependency[] | null;
}

const ServiceDependency: React.FC<ServiceDependencyProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // 清除旧的图表
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置 SVG 尺寸
    const width = 800;
    const height = 600;

    // 准备数据
    const nodes = new Set<string>();
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
      .force('link', d3.forceLink(linkArray).id((d: any) => d.name).distance(150))
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
      .attr('fill', (d: any) => d.name.includes('external') ? '#3498DB' : '#27AE60')
      .call(d3.drag<SVGCircleElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // 添加节点标签
    const label = svg.append('g')
      .selectAll('text')
      .data(nodeArray)
      .enter()
      .append('text')
      .text((d: any) => d.name)
      .attr('font-size', '12px')
      .attr('text-anchor', 'middle')
      .attr('dy', 5);

    // 添加链接标签
    const linkLabel = svg.append('g')
      .selectAll('text')
      .data(linkArray)
      .enter()
      .append('text')
      .text((d: any) => `${d.type}:${d.version}`)
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle');

    // 更新力导向图
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y + 30);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
    });

    // 拖拽函数
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [data]);

  if (!data) {
    return <div className="service-dependency">No dependency data available</div>;
  }

  return (
    <div className="service-dependency">
      <h2>服务依赖关系</h2>
      <div className="dependency-graph">
        <svg ref={svgRef}></svg>
      </div>
      <div className="dependency-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#27AE60' }}></div>
          <span>内部服务</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#3498DB' }}></div>
          <span>外部服务</span>
        </div>
      </div>
    </div>
  );
};

export default ServiceDependency;