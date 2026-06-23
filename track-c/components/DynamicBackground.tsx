// components/DynamicBackground.tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function DynamicBackground() {
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);
  const blob4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (blob1Ref.current && blob2Ref.current && blob3Ref.current && blob4Ref.current) {
      // Slow organic orbits using GSAP
      gsap.to(blob1Ref.current, {
        x: "15vw",
        y: "10vh",
        scale: 1.3,
        duration: 25,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(blob2Ref.current, {
        x: "-15vw",
        y: "-10vh",
        scale: 1.25,
        duration: 28,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(blob3Ref.current, {
        x: "10vw",
        y: "-15vh",
        scale: 1.2,
        duration: 22,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(blob4Ref.current, {
        x: "-10vw",
        y: "15vh",
        scale: 1.3,
        duration: 26,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden bg-[#050508]">
      {/* Blob 1: Franklin Green */}
      <div
        ref={blob1Ref}
        className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-[#5fa324]/12 to-transparent filter blur-[130px] mix-blend-screen"
      />
      {/* Blob 2: Deep Violet / Purple (Complementary) */}
      <div
        ref={blob2Ref}
        className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-[#6d28d9]/10 to-transparent filter blur-[140px] mix-blend-screen"
      />
      {/* Blob 3: Trevor Amber (Analogous Accent) */}
      <div
        ref={blob3Ref}
        className="absolute top-[40%] left-[30%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#f59e0b]/8 to-transparent filter blur-[120px] mix-blend-screen"
      />
      {/* Blob 4: Michael Blue (Triadic) */}
      <div
        ref={blob4Ref}
        className="absolute bottom-[20%] left-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-[#1f83b4]/8 to-transparent filter blur-[110px] mix-blend-screen"
      />
    </div>
  );
}
