"use client";

import { useEffect, useRef, useState } from "react";
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

type NodeType = "current" | "gap" | "primary-gap" | "goal";

interface DisplayNode {
  label: string;
  description: string;
  type: NodeType;
  nodeId: string;
}

// ── Design tokens matching globals.css ────────────────────────────────
const TOKEN = {
  bg:       "#050505",
  line:     "#222222",
  accent:   "#5fa324",
  warm:     "#f0c243",
  muted:    "#9e9e9e",
  orange:   "#c2640a",
  mono:     "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace",
} as const;

const NODE_CFG: Record<NodeType, {
  stroke: string; fill: string; glow: string;
  textColor: string; tag: string; glowId: string;
}> = {
  current: {
    stroke: "rgba(255,255,255,0.22)", fill: "rgba(255,255,255,0.03)",
    glow: "rgba(255,255,255,0.18)", textColor: "rgba(255,255,255,0.55)",
    tag: "YOU ARE HERE", glowId: "glow-current",
  },
  gap: {
    stroke: TOKEN.orange, fill: "rgba(194,100,10,0.07)",
    glow: TOKEN.orange, textColor: TOKEN.orange,
    tag: "MISSING", glowId: "glow-gap",
  },
  "primary-gap": {
    stroke: TOKEN.warm, fill: "rgba(240,194,67,0.07)",
    glow: TOKEN.warm, textColor: TOKEN.warm,
    tag: "PRIMARY BLOCK", glowId: "glow-primary",
  },
  goal: {
    stroke: TOKEN.accent, fill: "rgba(95,163,36,0.10)",
    glow: TOKEN.accent, textColor: TOKEN.accent,
    tag: "DESTINATION", glowId: "glow-goal",
  },
};

// SVG canvas dimensions
const SVG_W = 900;
const SVG_H = 280;
const MARGIN_X = 72;
const NODE_CY = 124;   // node center y
const DIAMOND_R = 20;  // half-diagonal

function xOf(i: number, total: number): number {
  if (total === 1) return SVG_W / 2;
  return MARGIN_X + (i * (SVG_W - MARGIN_X * 2)) / (total - 1);
}

// Wrap long strings to max N chars per line
function wrapText(text: string, maxLen = 38): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2); // max 2 lines
}

export function DiagnosisGraph({ graph, bottleneckLabel }: DiagnosisGraphProps) {
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Stagger the reveal
    const t = setTimeout(() => setVisible(true), 120);
    // Tick for blink effects
    const iv = setInterval(() => setTick((n) => n + 1), 700);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const nodes: DisplayNode[] = [
    { ...graph.current, type: "current",      nodeId: "NODE.01" },
    ...graph.gaps.map((g, i) => ({
      ...g,
      type: (i === 0 ? "primary-gap" : "gap") as NodeType,
      nodeId: `NODE.0${i + 2}`,
    })),
    { ...graph.goal,    type: "goal",         nodeId: `NODE.0${graph.gaps.length + 2}` },
  ];

  const total = nodes.length;
  const xs = nodes.map((_, i) => xOf(i, total));

  // Diamond polygon points centered at (cx, cy)
  function diamond(cx: number, cy: number, r: number) {
    return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
  }

  // Connector path between adjacent diamonds (edge-to-edge, not center-to-center)
  function connectorPath(x1: number, x2: number, cy: number) {
    return `M ${x1 + DIAMOND_R + 3},${cy} L ${x2 - DIAMOND_R - 3},${cy}`;
  }

  // Approx dash length for a connector
  function connectorLen(x1: number, x2: number) {
    return x2 - x1 - (DIAMOND_R + 3) * 2;
  }

  const blinkOn = tick % 2 === 0;

  return (
    <div className="border border-[#222222] border-b-0 bg-[#050505] relative overflow-hidden">
      {/* ── Corner bracket decorations ────────────────────────────── */}
      {(["tl","tr","bl","br"] as const).map((pos) => (
        <CornerBracket key={pos} pos={pos} />
      ))}

      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-7 pt-5 pb-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{
              background: blinkOn ? TOKEN.accent : "transparent",
              boxShadow: blinkOn ? `0 0 6px ${TOKEN.accent}` : "none",
              transition: "background 0.1s, box-shadow 0.1s",
            }}
          />
          <span
            style={{
              fontFamily: TOKEN.mono,
              fontSize: "9px",
              letterSpacing: "0.3em",
              color: TOKEN.muted,
              textTransform: "uppercase",
            }}
          >
            SIGNAL TRACE · JOURNEY MAP
          </span>
        </div>
        <span
          style={{
            fontFamily: TOKEN.mono,
            fontSize: "8px",
            letterSpacing: "0.2em",
            color: "#333",
            textTransform: "uppercase",
          }}
        >
          {bottleneckLabel} · {nodes.length} NODES
        </span>
      </div>

      {/* ── SVG graph ─────────────────────────────────────────────── */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ minWidth: 440, display: "block" }}
          aria-label="Journey map from current state to goal"
        >
          <defs>
            {/* Glow filters */}
            {Object.entries(NODE_CFG).map(([, cfg]) => (
              <filter key={cfg.glowId} id={cfg.glowId} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            {/* Subtle dot grid */}
            <pattern id="dotgrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="0"  cy="0"  r="0.6" fill="#ffffff" opacity="0.055" />
              <circle cx="30" cy="0"  r="0.6" fill="#ffffff" opacity="0.055" />
              <circle cx="0"  cy="30" r="0.6" fill="#ffffff" opacity="0.055" />
              <circle cx="30" cy="30" r="0.6" fill="#ffffff" opacity="0.055" />
            </pattern>
            {/* Flowing dash clip — one per connector */}
            {nodes.slice(0, -1).map((_, i) => {
              const len = connectorLen(xs[i], xs[i + 1]);
              return (
                <clipPath key={`clip-${i}`} id={`clip-${i}`}>
                  <rect x={xs[i] + DIAMOND_R + 3} y={NODE_CY - 2} width={Math.max(len, 0)} height={4} />
                </clipPath>
              );
            })}
          </defs>

          {/* Background */}
          <rect width={SVG_W} height={SVG_H} fill={TOKEN.bg} />
          <rect width={SVG_W} height={SVG_H} fill="url(#dotgrid)" />

          {/* Subtle horizontal centerline */}
          <line
            x1={MARGIN_X} y1={NODE_CY} x2={SVG_W - MARGIN_X} y2={NODE_CY}
            stroke={TOKEN.line} strokeWidth={1} opacity={0.5}
          />

          {/* ── Connectors ──────────────────────────────────────── */}
          {nodes.slice(0, -1).map((_, i) => {
            const x1 = xs[i];
            const x2 = xs[i + 1];
            const len = connectorLen(x1, x2);
            const dashLen = len;
            const cfg = NODE_CFG[nodes[i + 1].type];

            return (
              <g key={`connector-${i}`}>
                {/* Static dim dash track */}
                <path
                  d={connectorPath(x1, x2, NODE_CY)}
                  stroke={TOKEN.line}
                  strokeWidth={1}
                  strokeDasharray="6 5"
                  fill="none"
                />
                {/* Flowing animated light */}
                {visible && (
                  <path
                    d={connectorPath(x1, x2, NODE_CY)}
                    stroke={cfg.stroke}
                    strokeWidth={1.5}
                    strokeDasharray={`${dashLen * 0.25} ${dashLen * 0.75}`}
                    fill="none"
                    opacity={0.7}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from={dashLen}
                      to={0}
                      dur={`${1.8 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                )}
              </g>
            );
          })}

          {/* ── Nodes ───────────────────────────────────────────── */}
          {nodes.map((node, i) => {
            const cx = xs[i];
            const cfg = NODE_CFG[node.type];
            const descLines = wrapText(node.description, total > 3 ? 28 : 38);

            return (
              <motion.g
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: `${cx}px ${NODE_CY}px` }}
              >
                {/* Outer diamond glow ring */}
                <polygon
                  points={diamond(cx, NODE_CY, DIAMOND_R + 8)}
                  fill="none"
                  stroke={cfg.stroke}
                  strokeWidth={1}
                  opacity={node.type === "primary-gap" ? 0.35 : 0.12}
                  filter={`url(#${cfg.glowId})`}
                />
                {/* Primary diamond */}
                <polygon
                  points={diamond(cx, NODE_CY, DIAMOND_R)}
                  fill={cfg.fill}
                  stroke={cfg.stroke}
                  strokeWidth={node.type === "primary-gap" || node.type === "goal" ? 1.5 : 1}
                  filter={`url(#${cfg.glowId})`}
                />
                {/* Inner diamond accent */}
                <polygon
                  points={diamond(cx, NODE_CY, 6)}
                  fill={cfg.stroke}
                  opacity={node.type === "primary-gap" ? 0.85 : 0.6}
                />

                {/* Pulsing ring for primary-gap */}
                {node.type === "primary-gap" && visible && (
                  <polygon
                    points={diamond(cx, NODE_CY, DIAMOND_R + 14)}
                    fill="none"
                    stroke={cfg.stroke}
                    strokeWidth={1}
                    opacity={0}
                  >
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="points"
                      values={`${diamond(cx,NODE_CY,DIAMOND_R)};${diamond(cx,NODE_CY,DIAMOND_R+20)};${diamond(cx,NODE_CY,DIAMOND_R)}`}
                      dur="2.4s" repeatCount="indefinite"
                    />
                  </polygon>
                )}

                {/* Node ID (top) */}
                <text
                  x={cx} y={NODE_CY - DIAMOND_R - 16}
                  textAnchor="middle"
                  fill="#333"
                  fontSize={8}
                  fontFamily={TOKEN.mono}
                  letterSpacing="0.2em"
                >
                  {node.nodeId}
                </text>

                {/* Tag label */}
                <text
                  x={cx} y={NODE_CY - DIAMOND_R - 6}
                  textAnchor="middle"
                  fill={cfg.textColor}
                  fontSize={7.5}
                  fontFamily={TOKEN.mono}
                  letterSpacing="0.18em"
                  fontWeight="bold"
                >
                  {cfg.tag}
                </text>

                {/* Node label */}
                <text
                  x={cx} y={NODE_CY + DIAMOND_R + 18}
                  textAnchor="middle"
                  fill={cfg.textColor}
                  fontSize={10.5}
                  fontFamily={TOKEN.mono}
                  fontWeight="bold"
                  letterSpacing="0.08em"
                >
                  {node.label.length > 22 ? node.label.slice(0, 21) + "…" : node.label}
                </text>

                {/* Description lines */}
                {descLines.map((line, li) => (
                  <text
                    key={li}
                    x={cx} y={NODE_CY + DIAMOND_R + 34 + li * 14}
                    textAnchor="middle"
                    fill={TOKEN.muted}
                    fontSize={8.5}
                    fontFamily={TOKEN.mono}
                    opacity={0.6}
                    letterSpacing="0.02em"
                  >
                    {line}
                  </text>
                ))}
              </motion.g>
            );
          })}

          {/* Scan line sweep */}
          {visible && (
            <rect x={0} y={0} width={SVG_W} height={3} fill="rgba(255,255,255,0.025)" opacity={0}>
              <animate attributeName="y" from={-4} to={SVG_H + 4} dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.7;0" dur="4s" repeatCount="indefinite" />
            </rect>
          )}
        </svg>
      </div>

      {/* ── Footer row ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-7 py-3 border-t border-[#1a1a1a]">
        <span
          style={{
            fontFamily: TOKEN.mono,
            fontSize: "8px",
            letterSpacing: "0.25em",
            color: "#2a2a2a",
            textTransform: "uppercase",
          }}
        >
          ◀ CURRENT STATE
        </span>
        <span
          style={{
            fontFamily: TOKEN.mono,
            fontSize: "8px",
            letterSpacing: "0.12em",
            color: "#2a2a2a",
            textTransform: "uppercase",
          }}
        >
          JOURNEY DIRECTION
        </span>
        <span
          style={{
            fontFamily: TOKEN.mono,
            fontSize: "8px",
            letterSpacing: "0.25em",
            color: "#2a2a2a",
            textTransform: "uppercase",
          }}
        >
          DESTINATION ▶
        </span>
      </div>
    </div>
  );
}

// ── Corner bracket component ───────────────────────────────────────────
function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const size = 10;
  const thickness = 1;
  const offset = 6;

  const styles: Record<typeof pos, React.CSSProperties> = {
    tl: { top: offset, left: offset },
    tr: { top: offset, right: offset },
    bl: { bottom: offset, left: offset },
    br: { bottom: offset, right: offset },
  };

  const rotations = { tl: 0, tr: 90, bl: 270, br: 180 };

  return (
    <svg
      width={size + thickness}
      height={size + thickness}
      style={{
        position: "absolute",
        ...styles[pos],
        transform: `rotate(${rotations[pos]}deg)`,
        opacity: 0.25,
        pointerEvents: "none",
      }}
    >
      <polyline
        points={`0,${size} 0,0 ${size},0`}
        fill="none"
        stroke="#5fa324"
        strokeWidth={thickness}
      />
    </svg>
  );
}
