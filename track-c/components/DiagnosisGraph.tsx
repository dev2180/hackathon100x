"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────
export type NodeType = "current" | "step" | "goal" | "dead";
export type EdgeType = "path" | "dead-end";
export type Depth = "shallow" | "moderate" | "deep";

export interface GraphNodeData {
  id: string;
  label: string;
  description: string;
  type: NodeType;
  gap: string;          // what THIS builder doesn't know here — the bridge
  rabbitHole: string;   // how far down to go / where to stop
  depth: Depth;         // real effort the node deserves — un-flattens terrain
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

const DEPTH_RANK: Record<Depth, number> = { shallow: 1, moderate: 2, deep: 3 };
const DEPTH_LABEL: Record<Depth, string> = {
  shallow: "SHALLOW — a quick dip",
  moderate: "MODERATE — real but bounded",
  deep: "DEEP — a long descent",
};

// ── Layout ────────────────────────────────────────────────────────────
const W = 960;
const H = 340;
const MAIN_Y  = 155;
const DEAD_OFF = 110;
const MX      = 80;
const DR      = 20;
const LABEL_GAP = DR + 14;

interface LayoutNode {
  data: GraphNodeData;
  cx: number;
  cy: number;
}

function layout(graph: GraphData): LayoutNode[] {
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
  const goalId = graph.nodes.find((n) => n.type === "goal")?.id;
  if (goalId && !mainPath.includes(goalId)) mainPath.push(goalId);

  const spacing = mainPath.length > 1 ? (W - MX * 2) / (mainPath.length - 1) : 0;
  const mainPositions = new Map<string, number>(
    mainPath.map((id, i) => [id, MX + i * spacing])
  );

  const deadParent = new Map<string, string>();
  for (const e of graph.edges) {
    if (e.type === "dead-end") deadParent.set(e.to, e.from);
  }

  const deadAbove: string[] = [];
  const deadBelow: string[] = [];
  for (const n of graph.nodes) {
    if (n.type === "dead") {
      if (deadAbove.length <= deadBelow.length) deadAbove.push(n.id);
      else deadBelow.push(n.id);
    }
  }

  const result: LayoutNode[] = [];
  for (const n of graph.nodes) {
    if (mainPositions.has(n.id)) {
      result.push({ data: n, cx: mainPositions.get(n.id)!, cy: MAIN_Y });
    } else {
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

function dmd(cx: number, cy: number, r: number) {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

// ── Component ─────────────────────────────────────────────────────────
export function DiagnosisGraph({ graph, bottleneckLabel }: DiagnosisGraphProps) {
  const [visible, setVisible] = useState(false);
  const [blink, setBlink]     = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const t  = setTimeout(() => setVisible(true), 80);
    const iv = setInterval(() => setBlink((b) => !b), 650);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const placed = layout(graph);
  const posMap  = new Map(placed.map((p) => [p.data.id, p]));
  const selected = selectedId ? graph.nodes.find((n) => n.id === selectedId) ?? null : null;

  return (
    <div
      className="border border-[#222] border-b-0 relative overflow-hidden"
      style={{ background: C.bg }}
    >
      {(["tl","tr","bl","br"] as const).map((p) => <Corner key={p} pos={p} />)}

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 sm:px-7 pt-5 pb-3"
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
            KNOWLEDGE BRIDGE · SIGNAL TRACE
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
            {Object.values(NODE_STYLE).map((s) => (
              <filter key={s.glowId} id={s.glowId} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            ))}
            <marker id="arrow-path" markerWidth="6" markerHeight="6"
              refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={C.accent} opacity={0.6} />
            </marker>
            <marker id="arrow-dead" markerWidth="6" markerHeight="6"
              refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={C.red} opacity={0.6} />
            </marker>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              {[0,28].flatMap((px) => [0,28].map((py) => (
                <circle key={`${px}-${py}`} cx={px} cy={py} r={0.55}
                  fill="#fff" opacity={0.04} />
              )))}
            </pattern>
          </defs>

          <rect width={W} height={H} fill={C.bg} />
          <rect width={W} height={H} fill="url(#dots)" />

          <line x1={MX} y1={MAIN_Y} x2={W - MX} y2={MAIN_Y}
            stroke={C.line} strokeWidth={1} />

          {/* ── Edges ───────────────────────────────────────────── */}
          {graph.edges.map((e, i) => {
            const src  = posMap.get(e.from);
            const tgt  = posMap.get(e.to);
            if (!src || !tgt) return null;
            const isDead = e.type === "dead-end";

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
                <path
                  d={d}
                  stroke={isDead ? "#2a1010" : C.line}
                  strokeWidth={1}
                  strokeDasharray={isDead ? "5 5" : "7 5"}
                  fill="none"
                />
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

          {/* ── Nodes ───────────────────────────────────────────── */}
          {placed.map((p, i) => {
            const { data: n, cx, cy } = p;
            const s = NODE_STYLE[n.type];
            const isGoal = n.type === "goal";
            const isDead = n.type === "dead";
            const rank = DEPTH_RANK[n.depth] ?? 2;
            // depth drives the halo size → the terrain visibly stops being flat
            const ringOff = 4 + rank * 4 + (isGoal ? 4 : 0);
            const isActive = selectedId === n.id;
            const isHover = hoverId === n.id;
            const dim = selectedId !== null && !isActive ? 0.35 : 1;

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
            const labelsAbove = cy < MAIN_Y;

            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={visible
                  ? { opacity: dim, scale: isActive || isHover ? 1.12 : 1 }
                  : { opacity: 0, scale: 0.4 }}
                transition={{ delay: visible ? 0 : 0.1 + i * 0.1, duration: 0.35,
                  ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: `${cx}px ${cy}px`, cursor: "pointer" }}
                onClick={() => setSelectedId(isActive ? null : n.id)}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId((h) => (h === n.id ? null : h))}
              >
                {/* depth halo */}
                <polygon
                  points={dmd(cx, cy, DR + ringOff)}
                  fill="none"
                  stroke={s.stroke}
                  strokeWidth={1}
                  opacity={isGoal ? 0.4 : isDead ? 0.25 : 0.18}
                  filter={`url(#${s.glowId})`}
                />

                {/* selection ring */}
                {isActive && (
                  <polygon points={dmd(cx, cy, DR + ringOff + 6)} fill="none"
                    stroke={s.stroke} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.9}>
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                      dur="14s" repeatCount="indefinite" />
                  </polygon>
                )}

                <polygon
                  points={dmd(cx, cy, DR)}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={isActive ? 2 : isGoal || isDead ? 1.5 : 1}
                  filter={`url(#${s.glowId})`}
                />

                {!isDead && (
                  <polygon
                    points={dmd(cx, cy, 6)}
                    fill={s.stroke}
                    opacity={isGoal ? 0.9 : 0.65}
                  />
                )}

                {isDead && (
                  <g>
                    <line x1={cx-6} y1={cy-6} x2={cx+6} y2={cy+6}
                      stroke={C.red} strokeWidth={1.5} opacity={0.9}/>
                    <line x1={cx+6} y1={cy-6} x2={cx-6} y2={cy+6}
                      stroke={C.red} strokeWidth={1.5} opacity={0.9}/>
                  </g>
                )}

                {isGoal && visible && (
                  <polygon points={dmd(cx, cy, DR + 16)} fill="none"
                    stroke={C.accent} strokeWidth={1} opacity={0}>
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite"/>
                    <animate attributeName="points"
                      values={`${dmd(cx,cy,DR)};${dmd(cx,cy,DR+22)};${dmd(cx,cy,DR)}`}
                      dur="2.5s" repeatCount="indefinite"/>
                  </polygon>
                )}

                {/* labels */}
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

                {/* invisible enlarged hit target */}
                <polygon points={dmd(cx, cy, DR + 22)} fill="transparent" />
              </motion.g>
            );
          })}

          {visible && (
            <rect x={0} y={0} width={W} height={4} fill="rgba(255,255,255,0.02)" opacity={0}>
              <animate attributeName="y" from={-4} to={H + 4} dur="5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.6;0" dur="5s" repeatCount="indefinite"/>
            </rect>
          )}
        </svg>
      </div>

      {/* ── Detail panel / hint ────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ borderTop: `1px solid ${C.line}`, overflow: "hidden" }}
          >
            <NodePanel node={selected} onClose={() => setSelectedId(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 sm:px-7 py-3 flex items-center gap-2"
            style={{ borderTop: `1px solid ${C.line}` }}
          >
            <span style={{
              display: "inline-block", width: 6, height: 6,
              background: blink ? C.accent : "transparent",
              boxShadow: blink ? `0 0 6px ${C.accent}` : "none",
            }} />
            <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "0.12em",
              color: C.muted, textTransform: "uppercase" }}>
              Tap a node → what you don&apos;t know yet, and how far down to go.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 sm:px-7 py-3"
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
          HALO SIZE = HOW DEEP
        </span>
      </div>
    </div>
  );
}

// ── Node detail panel ─────────────────────────────────────────────────
function NodePanel({ node, onClose }: { node: GraphNodeData; onClose: () => void }) {
  const s = NODE_STYLE[node.type];
  const rank = DEPTH_RANK[node.depth] ?? 2;
  const isDead = node.type === "dead";

  return (
    <div className="px-5 sm:px-7 py-5" style={{ background: "rgba(255,255,255,0.012)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{
            fontFamily: C.mono, fontSize: 8, letterSpacing: "0.2em",
            color: s.text, border: `1px solid ${s.stroke}`,
            padding: "3px 7px", textTransform: "uppercase",
          }}>
            {s.tag}
          </span>
          {/* depth meter */}
          <div className="flex items-end gap-[3px]" title={DEPTH_LABEL[node.depth]}>
            {[1, 2, 3].map((b) => (
              <span key={b} style={{
                width: 5, height: 5 + b * 4,
                background: b <= rank ? s.text : "#222",
                opacity: b <= rank ? 0.9 : 1,
              }} />
            ))}
            <span style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: "0.15em",
              color: C.muted, marginLeft: 6, textTransform: "uppercase" }}>
              {DEPTH_LABEL[node.depth]}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ fontFamily: C.mono, fontSize: 11, color: C.muted,
            lineHeight: 1, padding: 2 }}
        >
          ✕
        </button>
      </div>

      <h4 className="mt-4" style={{
        fontFamily: C.mono, color: s.text, fontSize: 15,
        fontWeight: 700, letterSpacing: "0.02em",
      }}>
        {node.label}
      </h4>
      <p className="mt-1.5" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.55 }}>
        {node.description}
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-4">
        <div>
          <p style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: "0.25em",
            color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>
            {isDead ? "THE FALSE BELIEF" : "WHAT YOU DON'T KNOW HERE"}
          </p>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.5,
            borderLeft: `2px solid ${s.stroke}`, paddingLeft: 12 }}>
            {node.gap}
          </p>
        </div>
        <div>
          <p style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: "0.25em",
            color: isDead ? C.red : C.accent, textTransform: "uppercase", marginBottom: 6 }}>
            {isDead ? "WHY IT WON'T PAY OFF" : "HOW FAR DOWN TO GO"}
          </p>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.5,
            borderLeft: `2px solid ${isDead ? C.red : C.accent}`, paddingLeft: 12 }}>
            {node.rabbitHole}
          </p>
        </div>
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
