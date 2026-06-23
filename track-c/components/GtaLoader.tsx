// components/GtaLoader.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";

const TRIVIA = [
  "DIAGNOSTIC CRITERIA: A grounded bottleneck must contain verbatim evidence.",
  "OUT OF SCOPE: If you have not started coding, the intake is automatically refused.",
  "CLOSED TAXONOMY: The system maps to exactly one of five barriers — or it abstains.",
  "ABSTAIN IS CORRECT: A prediction the evidence cannot carry is a horoscope.",
  "KILL-CONDITION: If our wrong-move prediction does not alter your behavior, it was inert."
];

export function GtaLoader() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triviaIndex, setTriviaIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const flareRedRef = useRef<HTMLDivElement>(null);
  const flareYellowRef = useRef<HTMLDivElement>(null);
  const flareCyanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(true);

    // 1. Progress count animation
    const progressObj = { value: 0 };
    gsap.to(progressObj, {
      value: 100,
      duration: 4.5,
      ease: "power1.inOut",
      onUpdate: () => {
        setProgress(Math.floor(progressObj.value));
      },
      onComplete: () => {
        // Smoothly fade out the entire splash overlay
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => {
            setVisible(false);
            sessionStorage.setItem("gta-loader-played", "true");
          }
        });
      }
    });

    // 2. Trivia cycle timer
    const triviaInterval = setInterval(() => {
      setTriviaIndex((prev) => (prev + 1) % TRIVIA.length);
    }, 1500);

    // 3. Logo entry zoom and pulse
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { scale: 0.7, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.5, ease: "back.out(1.5)" }
      );
      gsap.to(logoRef.current, {
        scale: 1.05,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    // 4. GSAP Light Leak / Lens Flare Animations
    // Red Flare Orbit
    if (flareRedRef.current) {
      gsap.to(flareRedRef.current, {
        x: "random(-20vw, 20vw)",
        y: "random(-20vh, 20vh)",
        scale: "random(1.2, 1.8)",
        opacity: "random(0.3, 0.7)",
        duration: "random(3, 5)",
        repeat: -1,
        repeatRefresh: true,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    // Yellow Flare Orbit
    if (flareYellowRef.current) {
      gsap.to(flareYellowRef.current, {
        x: "random(-25vw, 25vw)",
        y: "random(-25vh, 25vh)",
        scale: "random(1.1, 1.6)",
        opacity: "random(0.2, 0.6)",
        duration: "random(4, 6)",
        repeat: -1,
        repeatRefresh: true,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    // Cyan Flare Orbit
    if (flareCyanRef.current) {
      gsap.to(flareCyanRef.current, {
        x: "random(-30vw, 30vw)",
        y: "random(-30vh, 30vh)",
        scale: "random(1, 1.5)",
        opacity: "random(0.15, 0.5)",
        duration: "random(3.5, 5.5)",
        repeat: -1,
        repeatRefresh: true,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    return () => {
      clearInterval(triviaInterval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black overflow-hidden select-none pointer-events-auto"
    >
      {/* ── Ambient Light Leaks ─────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Flare Green */}
        <div
          ref={flareRedRef}
          className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] rounded-full bg-[#5fa324]/15 filter blur-[100px] mix-blend-screen"
        />
        {/* Flare Yellow */}
        <div
          ref={flareYellowRef}
          className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-[#f0c243]/10 filter blur-[110px] mix-blend-screen"
        />
        {/* Flare Charcoal */}
        <div
          ref={flareCyanRef}
          className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[35vw] h-[35vw] rounded-full bg-[#1a1a1a]/15 filter blur-[90px] mix-blend-screen"
        />
      </div>

      {/* ── Center Logo (Rockstar Games Homage) ─────────────────── */}
      <div ref={logoRef} className="z-10 flex flex-col items-center mb-12">
        <div className="relative w-40 h-40 bg-[#5fa324] border-4 border-black flex items-center justify-center shadow-[0_0_60px_rgba(95,163,36,0.3)]">
          {/* Custom Stylized Monogram */}
          <span className="font-sans font-black italic text-black text-[52px] leading-none select-none pr-1 pb-1 tracking-tighter uppercase">
            Dev
          </span>
          {/* Rockstar Star Overlap */}
          <svg
            className="absolute bottom-4 right-4 w-12 h-12 drop-shadow-[2px_2px_0px_#000]"
            viewBox="0 0 24 24"
            fill="#fff"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
      </div>

      {/* ── Bottom Loader Info (Progress & Cycling Trivia) ──────── */}
      <div className="absolute bottom-10 left-10 right-10 z-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/10 pt-6">
        {/* Cycling Game-style Trivia */}
        <div className="max-w-2xl text-center sm:text-left">
          <p className="font-mono text-[9px] tracking-widest text-[#5fa324] uppercase mb-1">
            LOADER PARAMETERS
          </p>
          <div className="h-10 flex items-center">
            <p className="font-sans text-[13px] text-white/70 font-light leading-relaxed transition-all duration-300">
              {TRIVIA[triviaIndex]}
            </p>
          </div>
        </div>

        {/* Loading Spinner & Progress */}
        <div className="flex items-center gap-4">
          <div className="text-right font-mono">
            <span className="text-[10px] tracking-widest text-white/30 block uppercase">
              INITIALIZING
            </span>
            <span className="text-2xl font-bold text-[#5fa324]">{progress}%</span>
          </div>
          {/* Rotating loading wheel */}
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#5fa324] animate-spin" />
        </div>
      </div>
    </div>
  );
}
