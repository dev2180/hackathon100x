// app/page.tsx — Public landing page.
// Premium, cinematic design conforming to gpt-taste guidelines.

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const BOTTLENECKS = [
  { key: "flat_terrain", label: "Flat terrain", color: "text-accent" },
  { key: "fear_of_shipping", label: "Fear of shipping", color: "text-accent-2" },
  { key: "no_idea", label: "No idea", color: "text-warm" },
  { key: "motivation_only", label: "Motivation only", color: "text-accent" },
  { key: "outsourcing_judgment", label: "Outsourcing judgment", color: "text-accent-2" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Intake parameters",
    body: "Six fixed questions mapping what you say is hard against what you have actually done. No open-ended advice.",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    step: "02",
    title: "Double AI validation",
    body: "Two narrow model queries separate claims from behaviors to identify contradictions before any mapping happens.",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    step: "03",
    title: "Closed taxonomy mapping",
    body: "Our system matches your profile to one strict bottleneck from a closed 5-item list based on verbatim quotes — or it abstains.",
    span: "md:col-span-1 md:row-span-2 bg-[#5fa324]/5 border-[#5fa324]/20",
  },
  {
    step: "04",
    title: "Falsifiable outcome triggers",
    body: "You receive a concrete wrong move you will try next, and a kill-condition action that disproves our diagnosis.",
    span: "md:col-span-2 md:row-span-1",
  },
];

export default function LandingPage() {
  const { isLoaded, userId } = useAuth();
  
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLQuoteElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Hero Entry Animation
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: "power4.out" }
      );
    }

    // Scroll-triggered Bento Grid animations
    if (gridRef.current) {
      gsap.fromTo(
        gridRef.current.children,
        { opacity: 0, y: 50, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    // Scroll-triggered quote word scrub reveal
    if (quoteRef.current) {
      gsap.fromTo(
        quoteRef.current,
        { opacity: 0.3, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          scrollTrigger: {
            trigger: quoteRef.current,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    // Infinite Marquee looping
    if (marqueeRef.current) {
      gsap.to(marqueeRef.current, {
        x: "-50%",
        ease: "none",
        duration: 35,
        repeat: -1,
      });
    }
  }, []);

  return (
    <main className="overflow-x-hidden w-full max-w-full min-h-screen">
      {/* ── Floating Navigation Bar ────────────────────────────── */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
        <nav className="bg-black/90 flex items-center justify-between rounded-none px-6 py-3.5 border border-line backdrop-blur-md">
          <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.4em] text-muted">
            TRACK&nbsp;C
          </span>
          <div className="flex items-center gap-6">
            {!isLoaded ? (
              <span className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-muted">
                LOADING...
              </span>
            ) : userId ? (
              <>
                <Link
                  href="/diagnose"
                  className="inline-block border border-accent bg-[#5fa324]/10 hover:bg-[#5fa324] hover:text-black px-4 py-1.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-accent transition-all duration-150 active:scale-95 uppercase font-bold rounded-none"
                >
                  RUN DIAGNOSIS →
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link
                  href="/diagnose"
                  className="inline-block font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-[#5fa324] transition-all duration-200 hover:text-white hover:-translate-y-0.5 active:scale-95 mr-2"
                >
                  GUEST ACCESS →
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-block font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-muted transition-all duration-200 hover:text-fg hover:-translate-y-0.5 active:scale-95"
                >
                  SIGN IN
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-block bg-[#5fa324] border border-[#5fa324] px-5 py-2 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-wider text-black transition-all duration-150 hover:bg-black hover:text-[#5fa324] active:scale-95 uppercase rounded-none"
                >
                  GET STARTED
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* ── Cinematic Hero (Attention) ─────────────────────────── */}
      <section ref={heroRef} className="flex flex-col items-center text-center justify-center min-h-[90dvh] pt-32 pb-24 px-5">
        <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.4em] text-muted mb-6 uppercase">
          For mid-build builders with multi-stage AI products
        </p>

        {/* Inline typography images embedded inside heading */}
        <h1 className="max-w-5xl font-sans font-black text-5xl leading-[1.05] tracking-tight sm:text-7xl text-white uppercase">
          You&apos;re not stuck because{" "}
          <span className="text-[#5fa324] italic">
            you&apos;re lost.
          </span>
          <br />
          You&apos;re stuck because you lack
          <span className="inline-block w-24 h-9 align-middle bg-cover bg-center mx-3 border-2 border-black shadow-[2px_2px_0px_#5fa324]" style={{ backgroundImage: "url('https://picsum.photos/seed/build/400/200')" }}></span>
          a clear wall.
        </h1>

        <p className="mt-8 max-w-xl text-[14px] tracking-wider leading-relaxed text-muted uppercase font-semibold">
          Every stage of a multi-stage AI build feels equally urgent. We read the gap between your claims and your actual behavior to map your single bottleneck — or abstain.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {!isLoaded ? (
            <span className="text-sm text-muted uppercase font-bold tracking-widest">Confirming credentials...</span>
          ) : userId ? (
            <Link
              href="/diagnose"
              className="inline-flex items-center gap-2 bg-[#5fa324] px-8 py-4 text-xs font-bold text-black uppercase tracking-widest transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Run your diagnosis →
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-[#5fa324] px-8 py-4 text-xs font-bold text-black uppercase tracking-widest transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Find your wall →
              </Link>
              <Link
                href="/diagnose"
                className="inline-flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 px-8 py-4 text-xs font-bold text-white uppercase tracking-widest transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Continue without signing in
              </Link>
              <Link
                href="/sign-in"
                className="inline-block text-xs font-bold text-white/80 tracking-widest uppercase transition-all duration-200 hover:text-white hover:-translate-y-0.5 active:scale-[0.97] underline underline-offset-4"
              >
                Already registered?
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Infinite Scrolling Marquee (Desire/Brandkit) ───────── */}
      <div className="relative w-full overflow-hidden border-y border-line bg-white/[0.01] py-6 mb-28">
        <div ref={marqueeRef} className="flex gap-20 whitespace-nowrap font-[family-name:var(--font-mono)] text-[9px] tracking-[0.3em] text-muted/30 uppercase w-max">
          <span>Grounded Evidence · No Horoscopes · Closed Taxonomy · Falsifiable Predictions · Behavioral Tracking · Fail Closed</span>
          <span>Grounded Evidence · No Horoscopes · Closed Taxonomy · Falsifiable Predictions · Behavioral Tracking · Fail Closed</span>
        </div>
      </div>

      {/* ── Interlocking Gapless Bento Grid (Interest) ─────────── */}
      <section className="py-20 px-5 max-w-5xl mx-auto">
        <h2 className="mb-14 font-sans font-black text-4xl tracking-wide text-center sm:text-5xl text-white uppercase">
          An architecture designed to{" "}
          <span className="text-[#5fa324] italic">defy horoscopes.</span>
        </h2>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 md:grid-flow-dense gap-4">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className={`glass rounded-none p-7 relative overflow-hidden group border border-line transition-all duration-500 ease-out hover:scale-[1.02] hover:border-accent/40 hover:shadow-[0_10px_35px_rgba(95,163,36,0.15)] ${item.span}`}
            >
              {/* Dynamic hover reveal glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-muted/40 block transition-transform duration-300 group-hover:translate-x-1">
                {item.step}
              </span>
              <h3 className="mt-4 text-sm font-bold tracking-widest leading-snug text-fg group-hover:text-accent transition-colors duration-300 uppercase">
                {item.title}
              </h3>
              <p className="mt-2.5 text-xs tracking-wider leading-relaxed text-muted uppercase font-medium">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scientific Bet Section (Scrub reveal) ────────────────── */}
      <section className="py-32 px-5 max-w-4xl mx-auto">
        <div className="rounded-none border border-accent/30 bg-black/85 p-8 sm:p-14 text-center relative overflow-hidden border-left-4">
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.25em] text-accent font-bold uppercase mb-4">
            The prior hypothesis
          </p>
          <blockquote ref={quoteRef} className="font-sans font-bold text-2xl leading-relaxed text-fg sm:text-3xl uppercase">
            &ldquo;Handed a single sentence that isolates their real roadblock — rather than generic comfort — builders recognize it instantly and act.&rdquo;
          </blockquote>
          <p className="mt-6 max-w-xl mx-auto text-xs tracking-wider text-muted uppercase font-medium">
            Predictions are strictly falsifiable. If the diagnosis changes nothing, it was a horoscope. If you choose a concrete action step or drop an out-of-scope stage, the diagnostic succeeded.
          </p>
          <div className="mt-8 flex justify-center">
            {!isLoaded ? (
              <span className="text-xs font-bold text-muted uppercase tracking-widest">Checking authentication...</span>
            ) : userId ? (
              <Link
                href="/diagnose"
                className="inline-flex items-center gap-2 bg-[#5fa324] px-6 py-3.5 text-xs font-bold text-black uppercase tracking-widest transition hover:brightness-110"
              >
                Test it on yourself →
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-[#5fa324] px-6 py-3.5 text-xs font-bold text-black uppercase tracking-widest transition hover:brightness-110"
              >
                Find your bottleneck →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-line py-10 text-center font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-muted/30 uppercase">
        Track C · Falsifiable Predictions · Closed Taxonomy · Abstain is Valid
      </footer>
    </main>
  );
}
