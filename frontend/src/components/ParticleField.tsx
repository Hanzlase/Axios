"use client";

import { useEffect, useRef } from "react";

/**
 * Physics-inspired particle field.
 *
 * Particles float in zero-gravity — continuous slow drift with organic
 * noise-based velocity changes. They gently repel the cursor within a
 * soft radius. No springs, no anchors — pure free-floating feel.
 *
 * Intentionally low density and monochromatic to match the premium design
 * language (matches --ax-text at low opacity).
 */

type Dot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;       // radius
  alpha: number;
  targetAlpha: number;
  noiseOffX: number;
  noiseOffY: number;
};

// Simple smooth noise via layered sin/cos (no external deps)
function smoothNoise(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 0.8 + t * 0.4) * 0.5 +
    Math.cos(y * 0.6 + t * 0.3) * 0.3 +
    Math.sin((x + y) * 0.5 + t * 0.2) * 0.2
  );
}

function makeParticles(w: number, h: number, isDark: boolean): Dot[] {
  const count = Math.floor((w * h) / 12000); // Increased density (~80-160 particles)
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random() * 2.2 + 0.8; // radius 0.8–3.0px
    dots.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r,
      alpha: Math.random() * 0.4 + 0.15,
      targetAlpha: Math.random() * 0.4 + 0.15,
      noiseOffX: Math.random() * 1000,
      noiseOffY: Math.random() * 1000,
    });
  }
  return dots;
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let dots: Dot[] = [];
    let t = 0;
    let mouseX = -9999;
    let mouseY = -9999;
    const REPEL_RADIUS = 120;
    const REPEL_STRENGTH = 0.28;
    const MAX_SPEED = 0.9;
    const FRICTION = 0.984;

    const isDark = () => document.documentElement.classList.contains("dark");

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dots = makeParticles(canvas.width, canvas.height, isDark());
    };

    // Connect nearby particles with faint lines
    const drawConnections = (color: string) => {
      const CONNECT_DIST = 160;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i]!.x - dots[j]!.x;
          const dy = dots[i]!.y - dots[j]!.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const strength = (1 - d / CONNECT_DIST) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.globalAlpha = strength;
            ctx.lineWidth = 0.8;
            ctx.moveTo(dots[i]!.x, dots[i]!.y);
            ctx.lineTo(dots[j]!.x, dots[j]!.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      t += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dark = isDark();
      const dotColor = dark ? "255,255,255" : "0,0,0";

      drawConnections(dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)");

      for (const dot of dots) {
        // Organic noise-based drift — no anchors
        const nx = smoothNoise(dot.noiseOffX, dot.noiseOffY, t);
        const ny = smoothNoise(dot.noiseOffY, dot.noiseOffX, t + 100);
        dot.vx += nx * 0.006;
        dot.vy += ny * 0.006;

        // Cursor repulsion — soft, no snapping
        const cdx = dot.x - mouseX;
        const cdy = dot.y - mouseY;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cd < REPEL_RADIUS && cd > 0) {
          const push = (REPEL_RADIUS - cd) / REPEL_RADIUS;
          dot.vx += (cdx / cd) * push * REPEL_STRENGTH;
          dot.vy += (cdy / cd) * push * REPEL_STRENGTH;
        }

        // Friction & speed cap
        dot.vx *= FRICTION;
        dot.vy *= FRICTION;
        const spd = Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy);
        if (spd > MAX_SPEED) {
          dot.vx = (dot.vx / spd) * MAX_SPEED;
          dot.vy = (dot.vy / spd) * MAX_SPEED;
        }

        dot.x += dot.vx;
        dot.y += dot.vy;

        // Soft wrap (toroidal)
        const pad = 40;
        if (dot.x < -pad) dot.x = canvas.width + pad;
        if (dot.x > canvas.width + pad) dot.x = -pad;
        if (dot.y < -pad) dot.y = canvas.height + pad;
        if (dot.y > canvas.height + pad) dot.y = -pad;

        // Slow alpha breathing
        dot.alpha += (dot.targetAlpha - dot.alpha) * 0.02;
        if (Math.abs(dot.alpha - dot.targetAlpha) < 0.01) {
          dot.targetAlpha = Math.random() * 0.3 + 0.06;
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor},${dot.alpha.toFixed(2)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(animate);
    };

    const onMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    const onLeave = () => { mouseX = -9999; mouseY = -9999; };
    const onResize = () => init();

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);
    init();
    animate();

    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
