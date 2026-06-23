// components/CustomCursor.tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { playHoverTick, playClickSelect } from "@/lib/audio";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the user is on a touch device
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Set initial off-screen positions
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    // GSAP quickTo for ultra-smooth lagging cursor tracking
    const xToDot = gsap.quickTo(dot, "x", { duration: 0.1, ease: "power3.out" });
    const yToDot = gsap.quickTo(dot, "y", { duration: 0.1, ease: "power3.out" });

    const xToRing = gsap.quickTo(ring, "x", { duration: 0.4, ease: "power3.out" });
    const yToRing = gsap.quickTo(ring, "y", { duration: 0.4, ease: "power3.out" });

    const onMouseMove = (e: MouseEvent) => {
      // Reveal on first mouse move
      gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
      xToDot(e.clientX);
      yToDot(e.clientY);
      xToRing(e.clientX);
      yToRing(e.clientY);
    };

    // Stateful Mouse Hover tracking to prevent duplicate hover ticks on sub-elements
    let lastActiveElement: HTMLElement | null = null;
    
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const activeEl = target.closest(
        "a, button, select, input, textarea, [role='button'], .glass, label, [class*='cl-'], [tabindex]"
      ) as HTMLElement;

      if (activeEl) {
        if (activeEl !== lastActiveElement) {
          playHoverTick();
          lastActiveElement = activeEl;

          // Expand Reticle
          gsap.to([dot, ring], { scale: 1.8, duration: 0.15, ease: "power2.out" });
          gsap.to(ring, { borderColor: "#5fa324", duration: 0.15 });
        }
      } else {
        if (lastActiveElement !== null) {
          lastActiveElement = null;
          // Contract Reticle
          gsap.to([dot, ring], { scale: 1, duration: 0.15, ease: "power2.out" });
          gsap.to(ring, { borderColor: "rgba(95, 163, 36, 0.4)", duration: 0.15 });
        }
      }
    };

    // Click Physics and sound
    const onMouseDown = () => {
      playClickSelect();
      gsap.to(dot, { scale: 2.2, opacity: 0.6, duration: 0.1, ease: "power2.out" });
      gsap.to(ring, { scale: 0.6, borderColor: "#5fa324", duration: 0.1, ease: "back.out(3)" });
    };

    const onMouseUp = () => {
      const isHovering = lastActiveElement !== null;
      const targetScale = isHovering ? 1.8 : 1;
      const targetColor = isHovering ? "#5fa324" : "rgba(95, 163, 36, 0.4)";

      gsap.to(dot, { scale: targetScale, opacity: 1, duration: 0.15, ease: "power2.out" });
      gsap.to(ring, { scale: targetScale, borderColor: targetColor, duration: 0.15, ease: "power2.out" });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    const onMouseLeaveWindow = () => {
      gsap.to([dot, ring], { opacity: 0, duration: 0.3 });
    };
    document.addEventListener("mouseleave", onMouseLeaveWindow);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeaveWindow);
    };
  }, []);

  return (
    <>
      {/* Inner Dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] h-1.5 w-1.5 bg-accent opacity-0"
      />
      {/* Outer Reticle Ring */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed top-0 left-0 z-[9998] h-6 w-6 opacity-0 flex items-center justify-center transition-transform duration-75 ease-out"
      >
        {/* Thin outline circle */}
        <div className="absolute inset-0 rounded-full border border-accent/30" />
        {/* Crosshair Ticks */}
        <div className="absolute top-0 w-[1px] h-1.5 bg-accent/60" />
        <div className="absolute bottom-0 w-[1px] h-1.5 bg-accent/60" />
        <div className="absolute left-0 h-[1px] w-1.5 bg-accent/60" />
        <div className="absolute right-0 h-[1px] w-1.5 bg-accent/60" />
      </div>
    </>
  );
}
