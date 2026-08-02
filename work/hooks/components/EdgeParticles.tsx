"use client";

import { useEffect, useRef } from "react";

// Gentle floating dust, confined to a narrow side column — no connecting
// lines (that constellation-map look read as "astrology site" when it spanned
// the whole hero, see DESIGN.md). Two independent instances (left/right) run
// the full page height now, so density is computed from canvas height rather
// than a fixed count — otherwise the same 14 dots that read as ambient in a
// ~700px hero would look nearly empty stretched across a ~3500px page.
interface Particle {
  x: number;
  y: number;
  vy: number;
  r: number;
  opacity: number;
}

const PARTICLES_PER_PX = 1 / 130;
const MIN_PARTICLES = 12;
const MAX_PARTICLES = 70;

export function EdgeParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let running = false;
    let rafId = 0;

    // Sized from the real document height, not CSS `inset-y-0` — that
    // stretches against the nearest positioned ancestor's box, which for a
    // flex-item `<main>` with auto height resolved to a stale/too-small
    // value in practice (measured ~80px instead of the ~3500px page).
    // Explicit JS sizing + a ResizeObserver (content reflow: fonts, images)
    // is the robust fix.
    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = document.documentElement.scrollHeight;
      canvas!.style.height = `${height}px`;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      const count = Math.round(
        Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, height * PARTICLES_PER_PX))
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: -(Math.random() * 0.18 + 0.05),
        r: Math.random() * 1.8 + 0.8,
        opacity: Math.random() * 0.4 + 0.25,
      }));
    }

    function step() {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y += p.vy;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(107,138,255,${p.opacity})`;
        ctx!.fill();
      }
      if (running) rafId = requestAnimationFrame(step);
    }

    resize();
    seed();
    if (!reduceMotion) {
      running = true;
      rafId = requestAnimationFrame(step);
    } else {
      step();
    }

    const onResize = () => {
      resize();
      seed();
    };
    window.addEventListener("resize", onResize);

    // Catches height changes CSS resize/window-resize would miss entirely:
    // web font swap and image loads reflowing the page after mount.
    const ro = new ResizeObserver(() => onResize());
    ro.observe(document.documentElement);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (reduceMotion) return;
        if (entry.isIntersecting && !running) {
          running = true;
          rafId = requestAnimationFrame(step);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(rafId);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
