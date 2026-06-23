"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface GraphNode {
  label: string;
  description: string;
}

interface DiagnosisGraphProps {
  graph: {
    current: GraphNode;
    gaps: GraphNode[];
    goal: GraphNode;
  };
  bottleneckLabel: string;
}

type NodeType = "goal" | "gap" | "primary-gap" | "current";

interface DisplayNode {
  label: string;
  description: string;
  type: NodeType;
  index: number;
}

export function DiagnosisGraph({ graph, bottleneckLabel }: DiagnosisGraphProps) {
  const nodes: DisplayNode[] = [
    { ...graph.goal, type: "goal", index: 0 },
    ...graph.gaps.map((g, i) => ({
      ...g,
      type: (i === 0 ? "primary-gap" : "gap") as NodeType,
      index: i + 1,
    })),
    { ...graph.current, type: "current", index: graph.gaps.length + 1 },
  ];

  const nodeCount = nodes.length;

  return (
    <div className="border border-accent/40 border-b-0 bg-black/60 p-7">
      <div className="flex items-center justify-between mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[9px] tracking-[0.3em] text-muted/50 uppercase">
          YOUR JOURNEY MAP
        </p>
        <span className="font-[family-name:var(--font-mono)] text-[8px] tracking-widest text-accent/40 uppercase border border-accent/20 px-2 py-0.5">
          {bottleneckLabel} · PRIMARY BLOCK
        </span>
      </div>

      {/* Desktop: horizontal flow */}
      <div className="hidden sm:block">
        <HorizontalGraph nodes={nodes} />
      </div>

      {/* Mobile: vertical flow */}
      <div className="block sm:hidden">
        <VerticalGraph nodes={nodes} />
      </div>
    </div>
  );
}

function nodeStyle(type: NodeType) {
  switch (type) {
    case "goal":
      return {
        ring: "border-[#5fa324] shadow-[0_0_18px_rgba(95,163,36,0.4)]",
        bg: "bg-[#5fa324]/20",
        dot: "bg-[#5fa324]",
        label: "text-[#5fa324]",
        tag: "GOAL",
        tagColor: "text-[#5fa324]/70",
      };
    case "primary-gap":
      return {
        ring: "border-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.35)]",
        bg: "bg-amber-500/10",
        dot: "bg-amber-500",
        label: "text-amber-400",
        tag: "PRIMARY BLOCK",
        tagColor: "text-amber-500/70",
      };
    case "gap":
      return {
        ring: "border-orange-600/60",
        bg: "bg-orange-900/10",
        dot: "bg-orange-600",
        label: "text-orange-400/90",
        tag: "MISSING",
        tagColor: "text-orange-500/60",
      };
    case "current":
      return {
        ring: "border-white/20",
        bg: "bg-white/5",
        dot: "bg-white/50",
        label: "text-white/70",
        tag: "YOU ARE HERE",
        tagColor: "text-white/30",
      };
  }
}

function HorizontalGraph({ nodes }: { nodes: DisplayNode[] }) {
  return (
    <div className="relative">
      {/* Connector layer */}
      <div className="absolute top-[28px] left-0 right-0 flex items-center px-[60px]">
        {nodes.slice(0, -1).map((_, i) => (
          <AnimatedConnector key={i} reverse={true} className="flex-1" />
        ))}
      </div>

      {/* Nodes */}
      <div className="relative flex items-start justify-between gap-2">
        {nodes.map((node, i) => {
          const s = nodeStyle(node.type);
          return (
            <motion.div
              key={i}
              className="flex flex-col items-center flex-1 min-w-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
            >
              {/* Node circle */}
              <div className={`relative w-14 h-14 rounded-full border-2 ${s.ring} ${s.bg} flex items-center justify-center mb-3 shrink-0`}>
                {node.type === "primary-gap" && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-amber-500/40"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <div className={`w-3 h-3 rounded-full ${s.dot}`} />
              </div>

              {/* Label */}
              <p className={`font-[family-name:var(--font-mono)] text-[8px] tracking-widest uppercase font-bold mb-1 text-center ${s.tagColor}`}>
                {s.tag}
              </p>
              <p className={`font-sans text-[11px] font-bold text-center leading-tight uppercase tracking-wide ${s.label}`}>
                {node.label}
              </p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted/50 text-center line-clamp-3">
                {node.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function VerticalGraph({ nodes }: { nodes: DisplayNode[] }) {
  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-[14px] top-6 bottom-6 w-px">
        <AnimatedVerticalLine nodeCount={nodes.length} />
      </div>

      <div className="space-y-0">
        {nodes.map((node, i) => {
          const s = nodeStyle(node.type);
          const isLast = i === nodes.length - 1;
          return (
            <motion.div
              key={i}
              className={`relative flex gap-5 items-start ${isLast ? "" : "pb-8"}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.45, ease: "easeOut" }}
            >
              {/* Node */}
              <div className={`absolute -left-8 mt-0.5 w-7 h-7 rounded-full border-2 ${s.ring} ${s.bg} flex items-center justify-center shrink-0`}>
                {node.type === "primary-gap" && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-amber-500/40"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              </div>

              <div className="min-w-0">
                <p className={`font-[family-name:var(--font-mono)] text-[8px] tracking-widest uppercase font-bold mb-0.5 ${s.tagColor}`}>
                  {s.tag}
                </p>
                <p className={`font-sans text-sm font-bold uppercase tracking-wide ${s.label}`}>
                  {node.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted/60">
                  {node.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedConnector({ reverse, className }: { reverse?: boolean; className?: string }) {
  return (
    <div className={`relative h-px overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-white/5" />
      <motion.div
        className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-accent/60 to-transparent"
        animate={{ x: reverse ? ["100%", "-100%"] : ["-100%", "100%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function AnimatedVerticalLine({ nodeCount }: { nodeCount: number }) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-white/5" />
      <motion.div
        className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-accent/50 to-transparent"
        animate={{ y: ["100%", "-100%"] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
