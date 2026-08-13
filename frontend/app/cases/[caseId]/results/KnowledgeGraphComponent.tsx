"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import ForceGraph2D with ssr: false to prevent canvas window SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphNode {
  id: string;
  name: string;
  type?: string;
  val?: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  relationship_type?: string;
  confidence?: number;
}

interface KnowledgeGraphProps {
  nodes?: any[];
  edges?: any[];
  graphData?: any;
}

const TYPE_COLORS: Record<string, string> = {
  person: "#97BC62",
  phone_number: "#38bdf8",
  ip_address: "#f43f5e",
  device: "#a855f7",
  location: "#eab308",
  user_account: "#fb923c",
  default: "#10b981",
};

export default function KnowledgeGraphComponent({ nodes = [], edges = [], graphData }: KnowledgeGraphProps) {
  const formattedData = useMemo(() => {
    let rawNodes = nodes;
    let rawLinks = edges;

    if (graphData && graphData.nodes && (graphData.links || graphData.edges)) {
      rawNodes = graphData.nodes;
      rawLinks = graphData.links || graphData.edges;
    }

    // Process nodes
    const nodeMap = new Map<string, GraphNode>();

    rawNodes.forEach((n) => {
      const id = typeof n === "string" ? n : n.id || n.name;
      const type = typeof n === "object" ? n.type || "entity" : "entity";
      if (id) {
        nodeMap.set(id, {
          id,
          name: id,
          type,
          val: 6,
          color: TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.default,
        });
      }
    });

    // Process links & ensure endpoints exist in nodeMap
    const links: GraphLink[] = [];
    rawLinks.forEach((e) => {
      const source = typeof e.source === "object" ? e.source.id : e.source || e.from;
      const target = typeof e.target === "object" ? e.target.id : e.target || e.to;

      if (source && target) {
        if (!nodeMap.has(source)) {
          nodeMap.set(source, { id: source, name: source, type: "entity", val: 5, color: TYPE_COLORS.default });
        }
        if (!nodeMap.has(target)) {
          nodeMap.set(target, { id: target, name: target, type: "entity", val: 5, color: TYPE_COLORS.default });
        }
        links.push({
          source,
          target,
          relationship_type: e.relationship_type || e.type || "associated",
          confidence: e.confidence || 0.85,
        });
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links,
    };
  }, [nodes, edges, graphData]);

  if (formattedData.nodes.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-[#0D1F16] rounded-xl text-emerald-300/50 text-xs font-mono border border-white/5">
        No graph node topology generated yet. Run pipeline analysis to populate correlation graph.
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] bg-[#0D1F16] rounded-xl overflow-hidden border border-[#97BC62]/20 shadow-inner">
      {/* Legend overlay */}
      <div className="absolute top-3 left-3 z-10 bg-[#11261C]/90 backdrop-blur-md p-3 rounded-lg border border-white/10 text-[10px] space-y-1.5 shadow-md">
        <div className="font-bold text-white uppercase tracking-wider mb-1">Graph Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#97BC62]"></span>
          <span className="text-emerald-200">Person</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span>
          <span className="text-emerald-200">Phone Number</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
          <span className="text-emerald-200">IP Address</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></span>
          <span className="text-emerald-200">Device</span>
        </div>
      </div>

      <ForceGraph2D
        graphData={formattedData}
        nodeLabel={(node: any) => `${node.name} (${node.type || "entity"})`}
        nodeColor={(node: any) => node.color || TYPE_COLORS.default}
        nodeRelSize={6}
        linkLabel={(link: any) => `${link.relationship_type} (${(link.confidence * 100).toFixed(0)}%)`}
        linkColor={() => "rgba(151, 188, 98, 0.4)"}
        linkWidth={2}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "#97BC62"}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;

          // Circle node
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color || TYPE_COLORS.default;
          ctx.fill();

          // Label text
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "white";
          ctx.fillText(label, node.x, node.y + 10);
        }}
      />
    </div>
  );
}
