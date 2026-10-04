import React, { useEffect, useRef } from 'react';
import { BackgroundTheme } from './types';

interface ParticleCanvasProps {
  theme: BackgroundTheme;
  concept?: string;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  alphaSpeed: number;
  wobble?: number;
  wobbleSpeed?: number;
  symbol?: string; // for "Z" or sparks
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  theme,
  concept,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = canvas.offsetWidth || 360);
    const height = (canvas.height = canvas.offsetHeight || 640);

    const isSleep = concept === 'sleep_clock_zzz' || theme === 'indoor';
    const isOcean = theme === 'ocean' || concept === 'shark_teeth_closeup' || concept === 'sunken_atlantis';
    const isSpace = theme === 'space' || concept === 'earth_sun_orbit' || concept === 'black_hole_spiral';
    const isVolcano = concept === 'volcano_cross_section';

    // Particle count: optimal 25-35 particles for smooth 60fps mobile execution
    const count = isSpace ? 35 : isOcean ? 28 : isSleep ? 20 : isVolcano ? 30 : 22;
    const particles: Particle[] = [];

    const colorsByTheme: Record<string, string[]> = {
      space: ['#ffffff', '#bae6fd', '#fef08a', '#e9d5ff'],
      ocean: ['#bae6fd', '#7dd3fc', '#ffffff', '#38bdf8'],
      indoor: ['#a5b4fc', '#cbd5e1', '#fef08a', '#c7d2fe'],
      nature: ['#86efac', '#fef08a', '#bbf7d0', '#6ee7b7'],
      cafe: ['#fde68a', '#fed7aa', '#fbcfe8', '#fef3c7'],
      history: ['#fde68a', '#fbbf24', '#fed7aa', '#ffffff'],
      cyber: ['#38bdf8', '#818cf8', '#22d3ee', '#67e8f9'],
      lab: ['#38bdf8', '#a7f3d0', '#67e8f9', '#c084fc'],
      finance: ['#6ee7b7', '#a7f3d0', '#fde047', '#34d399'],
      city: ['#fde047', '#f472b6', '#38bdf8', '#ffffff'],
      mystery: ['#cbd5e1', '#94a3b8', '#e2e8f0', '#ffffff'],
      abstract: ['#e2e8f0', '#cbd5e1', '#94a3b8'],
    };

    const palette = colorsByTheme[theme] || colorsByTheme.abstract;

    for (let i = 0; i < count; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const radius = isOcean
        ? Math.random() * 3.5 + 1.2
        : isSpace
        ? Math.random() * 1.6 + 0.6
        : Math.random() * 2.2 + 0.8;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: isOcean
          ? (Math.random() - 0.5) * 0.4
          : (Math.random() - 0.5) * 0.3,
        vy: isOcean
          ? -(Math.random() * 0.8 + 0.4) // bubbles rise
          : isVolcano
          ? -(Math.random() * 1.2 + 0.6) // sparks rise
          : isSleep
          ? -(Math.random() * 0.3 + 0.15) // sleep particles float gently up
          : (Math.random() - 0.5) * 0.25,
        radius,
        color,
        alpha: Math.random() * 0.7 + 0.2,
        alphaSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.04 + 0.02,
        symbol: isSleep && i % 4 === 0 ? 'z' : undefined,
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Alpha twinkle / pulse
        p.alpha += p.alphaSpeed;
        if (p.alpha > 0.85) {
          p.alpha = 0.85;
          p.alphaSpeed = -Math.abs(p.alphaSpeed);
        } else if (p.alpha < 0.15) {
          p.alpha = 0.15;
          p.alphaSpeed = Math.abs(p.alphaSpeed);
        }

        // Wobble for floating particles
        if (p.wobble !== undefined && p.wobbleSpeed !== undefined) {
          p.wobble += p.wobbleSpeed;
          p.x += Math.sin(p.wobble) * 0.35;
        }

        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;

        // Wrap around boundaries
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        // Render particle
        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.symbol) {
          // Render floating 'z' for sleep/tired concepts
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = p.color;
          ctx.fillText(p.symbol, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Subtle glow on brighter particles
          if (p.alpha > 0.55 && isSpace) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
          }
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, concept]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
    />
  );
};
