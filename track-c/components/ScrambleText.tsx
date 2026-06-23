"use client";

import { useEffect, useRef, useState } from "react";

// Watch-Dogs / terminal-style decode effect: characters resolve left-to-right
// out of random glyph noise. Lets a line stay small but still feel "gaming".
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&/\\<>[]{}=+*^?".split("");

function rand() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** total decode time in ms */
  duration?: number;
  /** delay before decoding starts, ms */
  delay?: number;
}

export function ScrambleText({
  text,
  className,
  duration = 850,
  delay = 0,
}: ScrambleTextProps) {
  const [out, setOut] = useState(text);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Honour reduced-motion: just show the final text.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOut(text);
      return;
    }

    const len = text.length;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (start === null) start = ts + delay;
      const elapsed = ts - start;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / duration);
      // how many characters (from the left) have fully resolved
      const resolved = p * (len + 6);
      let s = "";
      for (let i = 0; i < len; i++) {
        const ch = text[i];
        if (ch === " " || ch === "\n") {
          s += ch;
        } else if (i < resolved - 6) {
          s += ch;
        } else if (i < resolved) {
          s += rand();
        } else {
          s += " ";
        }
      }
      setOut(s);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setOut(text);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, duration, delay]);

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {out}
    </span>
  );
}
