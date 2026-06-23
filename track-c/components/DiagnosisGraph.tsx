"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────
export type NodeType = "current" | "step" | "goal" | "dead";
export type EdgeType = "path" | "dead-end";

export interface GraphNodeData {
  id: string;
  label: string;
  description: string;
  type: NodeType;
}

export interface GraphEdgeData {
  from: string;
  to: string;
  type: EdgeType;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

interface DiagnosisGraphProps {
  graph: GraphData;
  bottleneckLabel: string;
}

// ── Design tokens ─────────────────────────────────────────────────────
const C = {
  bg:     "#050505",
  line:   "#1e1e1e",
  accent: "#5fa324",
  warm:   "#f0c243",
  orange: "#c2640a",
  red:    "#c0392b",
  muted:  "#9e9e9e",
  mono:   "ui-monospace,'SF Mono','Cascadia Code',Menlo,monospace",
} as const;

const NODE_STYLE: Record<NodeType, {
  stroke: string; fill: string; text: string;
  tag: string; glow: string; glowId: string;
}> = {
  current: {
    stroke: "rgba(255,255,255,0.25)", fill: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.6)",   tag: "YOU ARE HERE",
    glow:  "rgba(255,255,255,0.15)", glowId: "gw-cur",
  },
  step: {
    stroke: C.accent,  fill: "rgba(95,163,36,0.08)",
    text: C.accent,    tag: "NEXT STEP",
    glow:  C.accent,   glowId: "gw-step",
  },
  goal: {
    stroke: C.accent,  fill: "rgba(95,163,36,0.14)",
    text:  C.accent,   tag: "DESTINATION",
    glow:  C.accent,   glowId: "gw-goal",
  },
  dead: {
    stroke: C.red,     fill: "rgba(192,57,43,0.08)",
    text:  C.red,      tag: "DEAD PATH",
    glow:  C.red,      glowId: "gw-dead",
  },
};

// ── Layout ────────────────────────────────────────────────────────────
// Canvas dims
const W = 960;
const H = 340;
const MAIN_Y  = 155;       // y of the main spine
const DEAD_OFF = 110;       // vertical offset for dead nodes
const MX      = 80;        // horizontal margin
const DR      = 20;        // diamond half-diagonal
const LABEL_GAP = DR + 14; // y-gap from node centre to first label

interface LayoutNode {
  data: GraphNodeData;
  cx: number;
  cy: number;
}

function layout(graph: GraphData): LayoutNode[] {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // Build main path (BFS following "path" edges from "current")
  const adjPath = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.type === "path") {
      if (!adjPath.has(e.from)) adjPath.set(e.from, []);
      adjPath.get(e.from)!.push(e.to);
    }
  }
  const mainPath: string[] = [];
  const startNode = graph.nodes.find((n) => n.type === "current");
  if (startNode) {
    let cur: string | undefined = startNode.id;
    const visited = new Set<string>();
    while (cur && !visited.has(cur)) {
      mainPath.push(cur);
      visited.add(cur);
      const nexts: string[] = adjPath.get(cur) ?? [];
      cur = nexts[0];
    }
  }
  // Ensure goal is last
  const goalId = graph.nodes.find((n) => n.type === "goal")?.id;
  if (goalId && !mainPath.includes(goalId)) mainPath.push(goalId);

  // X positions for main-path nodes
  const spacing = mainPath.length > 1 ? (W - MX * 2) / (mainPath.length - 1) : 0;
  const mainPositions = new Map<string, number>(
    mainPath.map((id, i) => [id, MX + i * spacing])
  );

  // Dead-end nodes: position above/below their source node, alternating
  const deadParent = new Map<string, string>();
  for (const e of graph.edges) {
    if (e.type === "dead-end") deadParent.set(e.to, e.from);
  }

  const deadAbove: string[] = [];
  const deadBelow: string[] = [];
  for (const n of graph.nodes) {
    if (n.type === "dead") {
      const parent = deadParent.get(n.id);
      if (deadAbove.length <= deadBelow.length) deadAbove.push(n.id);
      else deadBelow.push(n.id);
    }
  }

  const result: LayoutNode[] = [];
  for (const n of graph.nodes) {
    if (mainPositions.has(n.id)) {
      result.push({ data: n, cx: mainPositions.get(n.id)!, cy: MAIN_Y });
    } else {
      // Dead node
      const parentId = deadParent.get(n.id);
      const parentX = parentId ? (mainPositions.get(parentId) ?? W / 2) : W / 2;
      const isAbove = deadAbove.includes(n.id);
      result.push({
        data: n,
        cx: parentX,
        cy: isAbove ? MAIN_Y - DEAD_OFF : MAIN_Y + DEAD_OFF,
      });
    }
  }
  return result;
}

// diamond polygon points string
function dmd(cx: number, cy: number, r: number) {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

// ── Component ─────────────────────────────────────────────────────────
export function DiagnosisGraph({ graph, bottleneckLabel }: DiagnosisGraphProps) {
  const [visible, setVisible] = useState(false);
  const [blink, setBlink]     = useState(true);

  useEffect(() => {
    const t  = setTimeout(() => setVisible(true), 80);
    const iv = setInterval(() => setBlink((b) => !b), 650);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const placed = layout(graph);
  const posMap  = new Map(placed.map((p) => [p.data.id, p]));

  return (
    <div
      className="border border-[#222] border-b-0 relative overflow-hidden"
      style={{ background: C.bg }}
    >
      {/* Corner brackets */}
      {(["tl","tr","bl","br"] as const).map((p) => <Corner key={p} pos={p} />)}

      {/* Header */}
      <div
        className="flex items-center justify-between px-7 pt-5 pb-3"
        style={{ borderBottom: `1px solid ${C.line}` }}
      >
        <div className="flex items-center gap-3">
          <span style={{
            display: "inline-block", width: 7, height: 7, borderRadius: "50%",
            background: blink ? C.accent : "transparent",
            boxShadow: blink ? `0 0 7px ${C.accent}` : "none",
            transition: "all 0.15s",
          }} />
          <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: "0.3em",
            color: C.muted, textTransform: "uppercase" }}>
            JOURNEY MAP · SIGNAL TRACE
          </span>
        </div>
        <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: "0.2em",
          color: "#2c2c2c", textTransform: "uppercase" }}>
          {bottleneckLabel}
        </span>
      </div>

      {/* SVG */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ minWidth: 520, display: "block" }}
        >
          <defs>
            {/* Glow filters */}
            {Object.values(NODE_STYLE).map((s) => (
              <filter key={s.glowId} id={s.glowId} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            ))}
            {/* Arrow marker — green */}
            <marker id="arrow-path" markerWidth="6" markerHeight="6"
              refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={C.accent} opacity={0.6} />
            </marker>
            {/* Arrow marker — red */}
            <marker id="arrow-dead" markerWidth="6" markerHeight="6"
              refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={C.red} opacity={0.6} />
            </marker>
            {/* Dot grid */}
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              {[0,28].flatMap((px) => [0,28].map((py) => (
                <circle key={`${px}-${py}`} cx={px} cy={py} r={0.55}
                  fill="#fff" opacity={0.04} />
              )))}
            </pattern>
          </defs>

          {/* Background */}
          <rect width={W} height={H} fill={C.bg} />
          <rect width={W} height={H} fill="url(#dots)" />

          {/* Main spine dim line */}
          <line x1={MX} y1={MAIN_Y} x2={W - MX} y2={MAIN_Y}
            stroke={C.line} strokeWidth={1} />

          {/* ── Edges ────────────────────────────────────────────── */}
          {graph.edges.map((e, i) => {
            const src  = posMap.get(e.from);
            const tgt  = posMap.get(e.to);
            if (!src || !tgt) return null;

            const isDead = e.type === "dead-end";

            // Edge endpoints: from diamond edge → to diamond edge
            const dx = tgt.cx - src.cx;
            const dy = tgt.cy - src.cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;
            const x1 = src.cx + ux * (DR + 2);
            const y1 = src.cy + uy * (DR + 2);
            const x2 = tgt.cx - ux * (DR + 6);
            const y2 = tgt.cy - uy * (DR + 6);
            const edgeLen = Math.sqrt((x2-x1)**2 + (y2-y1)**2);

            // Slight curve for dead-end edges
            let d: string;
            if (isDead) {
              const mx = (x1 + x2) / 2 - uy * 30;
              const my = (y1 + y2) / 2 + ux * 30;
              d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
            } else {
              d = `M ${x1} ${y1} L ${x2} ${y2}`;
            }

            return (
              <g key={i}>
                {/* Static dim track */}
                <path
                  d={d}
                  stroke={isDead ? "#2a1010" : C.line}
                  strokeWidth={1}
                  strokeDasharray={isDead ? "5 5" : "7 5"}
                  fill="none"
                />
                {/* Animated flowing light */}
                {visible && (
                  <path
                    d={d}
                    stroke={isDead ? C.red : C.accent}
                    strokeWidth={isDead ? 1 : 1.5}
                    strokeDasharray={isDead
                      ? `${edgeLen * 0.15} ${edgeLen * 0.85}`
                      : `${edgeLen * 0.22} ${edgeLen * 0.78}`
                    }
                    fill="none"
                    opacity={isDead ? 0.5 : 0.75}
                    markerEnd={isDead ? "url(#arrow-dead)" : "url(#arrow-path)"}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from={edgeLen}
                      to={0}
                      dur={isDead ? "3s" : "2s"}
                      repeatCount="indefinite"
                    />
                  </path>
                )}
              </g>
            );
          })}

          {/* ── Nodes ────────────────────────────────────────────── */}
          {placed.map((p, i) => {
            const { data: n, cx, cy } = p;
            const s = NODE_STYLE[n.type];
            const isGoal = n.type === "goal";
            const isDead = n.type === "dead";

            // Wrap description
            const words = n.description.split(" ");
            const lines: string[] = [];
            let cur = "";
            for (const w of words) {
              if ((cur + " " + w).trim().length > 30) {
                if (cur) lines.push(cur);
                cur = w;
              } else cur = (cur + " " + w).trim();
            }
            if (cur) lines.push(cur);
            const descLines = lines.slice(0, 2);

            // Labels go above for dead nodes on top spine, below for everyone else
            const labelsAbove = cy < MAIN_Y;

            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={visible
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.4 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.45,
                  ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                {/* Outer glow ring */}
                <polygon
                  points={dmd(cx, cy, DR + (isGoal ? 12 : 8))}
                  fill="none"
                  stroke={s.stroke}
                  strokeWidth={1}
                  opacity={isGoal ? 0.4 : isDead ? 0.2 : 0.15}
                  filter={`url(#${s.glowId})`}
                />

                {/* Main diamond */}
                <polygon
                  points={dmd(cx, cy, DR)}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={isGoal || isDead ? 1.5 : 1}
                  filter={`url(#${s.glowId})`}
                />

                {/* Inner dot */}
                {!isDead && (
                  <polygon
                    points={dmd(cx, cy, 6)}
                    fill={s.stroke}
                    opacity={isGoal ? 0.9 : 0.65}
                  />
                )}

                {/* Dead node: ✕ mark */}
                {isDead && (
                  <g>
                    <line x1={cx-6} y1={cy-6} x2={cx+6} y2={cy+6}
                      stroke={C.red} strokeWidth={1.5} opacity={0.9}/>
                    <line x1={cx+6} y1={cy-6} x2={cx-6} y2={cy+6}
                      stroke={C.red} strokeWidth={1.5} opacity={0.9}/>
                  </g>
                )}

                {/* Pulsing outer ring for goal */}
                {isGoal && visible && (
                  <polygon points={dmd(cx, cy, DR + 16)} fill="none"
                    stroke={C.accent} strokeWidth={1} opacity={0}>
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite"/>
                    <animate attributeName="points"
                      values={`${dmd(cx,cy,DR)};${dmd(cx,cy,DR+22)};${dmd(cx,cy,DR)}`}
                      dur="2.5s" repeatCount="indefinite"/>
                  </polygon>
                )}

                {/* Tag + label + description — above or below node */}
                {labelsAbove ? (
                  <>
                    {descLines.slice().reverse().map((line, li) => (
                      <text key={li} x={cx} y={cy - LABEL_GAP - 30 - li * 14}
                        textAnchor="middle" fill={C.muted} fontSize={8}
                        fontFamily={C.mono} opacity={0.5}>
                        {line}
                      </text>
                    ))}
                    <text x={cx} y={cy - LABEL_GAP - 14}
                      textAnchor="middle" fill={s.text}
                      fontSize={10} fontFamily={C.mono} fontWeight="bold">
                      {n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label}
                    </text>
                    <text x={cx} y={cy - LABEL_GAP - 2}
                      textAnchor="middle" fill={s.text} fontSize={7}
                      fontFamily={C.mono} letterSpacing="0.2em" opacity={0.7}>
                      {s.tag}
                    </text>
                  </>
                ) : (
                  <>
                    <text x={cx} y={cy + LABEL_GAP + 2}
                      textAnchor="middle" fill={s.text} fontSize={7}
                      fontFamily={C.mono} letterSpacing="0.2em" opacity={0.7}>
                      {s.tag}
                    </text>
                    <text x={cx} y={cy + LABEL_GAP + 16}
                      textAnchor="middle" fill={s.text}
                      fontSize={10} fontFamily={C.mono} fontWeight="bold">
                      {n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label}
                    </text>
                    {descLines.map((line, li) => (
                      <text key={li} x={cx} y={cy + LABEL_GAP + 32 + li * 14}
                        textAnchor="middle" fill={C.muted} fontSize={8}
                        fontFamily={C.mono} opacity={0.5}>
                        {line}
                      </text>
                    ))}
                  </>
                )}
              </motion.g>
            );
          })}

          {/* Scan sweep */}
          {visible && (
            <rect x={0} y={0} width={W} height={4} fill="rgba(255,255,255,0.02)" opacity={0}>
              <animate attributeName="y" from={-4} to={H + 4} dur="5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.6;0" dur="5s" repeatCount="indefinite"/>
            </rect>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-6 px-7 py-3"
        style={{ borderTop: `1px solid ${C.line}` }}
      >
        {[
          { color: C.accent, label: "CORRECT PATH" },
          { color: C.red,    label: "DEAD PATH — DO NOT ENTER" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <svg width={14} height={14}>
              <polygon points={dmd(7, 7, 5)} fill="none"
                stroke={color} strokeWidth={1.2}/>
              <polygon points={dmd(7, 7, 2)} fill={color}/>
            </svg>
            <span style={{ fontFamily: C.mono, fontSize: 7.5,
              letterSpacing: "0.2em", color: "#333",
              textTransform: "uppercase" }}>
              {label}
            </span>
          </div>
        ))}
        <span style={{ fontFamily: C.mono, fontSize: 7.5,
          letterSpacing: "0.15em", color: "#252525",
          textTransform: "uppercase", marginLeft: "auto" }}>
          ← CURRENT · PATH · DESTINATION →
        </span>
      </div>
    </div>
  );
}

// Corner bracket decoration
function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const s = 10;
  const off = 6;
  const placements: Record<typeof pos, React.CSSProperties> = {
    tl: { top: off, left: off },
    tr: { top: off, right: off },
    bl: { bottom: off, left: off },
    br: { bottom: off, right: off },
  };
  const rot = { tl: 0, tr: 90, bl: 270, br: 180 };
  return (
    <svg width={s + 1} height={s + 1} style={{
      position: "absolute", ...placements[pos],
      transform: `rotate(${rot[pos]}deg)`,
      opacity: 0.2, pointerEvents: "none",
    }}>
      <polyline points={`0,${s} 0,0 ${s},0`}
        fill="none" stroke={C.accent} strokeWidth={1}/>
    </svg>
  );
}
