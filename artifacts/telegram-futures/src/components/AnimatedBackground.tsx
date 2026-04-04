import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  life: number; maxLife: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0, height = 0;
    let animId: number;
    let frame = 0;
    const particles: Particle[] = [];

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawnParticle() {
      const cx = width * 0.5;
      const cy = height * 0.4;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.12 * Math.min(width, height);
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 0.9 + 0.4),
        size: Math.random() * 2.2 + 0.4,
        alpha: Math.random() * 0.7 + 0.2,
        life: 0,
        maxLife: Math.random() * 180 + 90,
      });
    }

    const draw = () => {
      frame++;
      if (frame % 2 === 0 && particles.length < 100) spawnParticle();

      const cx = width * 0.5;
      const cy = height * 0.38;
      const r = Math.min(width, height);
      const t = frame * 0.0025;

      // ── Dark base ──
      ctx.fillStyle = "#060400";
      ctx.fillRect(0, 0, width, height);

      // ── Rotating god rays ──
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.4);

      const numRays = 20;
      for (let i = 0; i < numRays; i++) {
        const baseAngle = (i / numRays) * Math.PI * 2;
        const wobble = 0.012 * Math.sin(t * 1.5 + i * 1.3);
        const angle = baseAngle + wobble;
        const spreadAngle = (Math.PI * 2 / numRays) * (0.12 + 0.07 * Math.sin(t * 0.9 + i));
        const rayLen = r * (0.95 + 0.12 * Math.sin(t * 0.6 + i * 0.7));
        const brightness = 0.028 + 0.018 * Math.sin(t * 1.1 + i * 0.9);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, rayLen, angle - spreadAngle / 2, angle + spreadAngle / 2);
        ctx.closePath();

        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rayLen);
        rg.addColorStop(0,   `rgba(232, 196, 60, ${brightness * 4.5})`);
        rg.addColorStop(0.18,`rgba(210, 168, 40, ${brightness * 1.8})`);
        rg.addColorStop(0.5, `rgba(190, 145, 20, ${brightness * 0.7})`);
        rg.addColorStop(1,   "rgba(160, 120, 10, 0)");
        ctx.fillStyle = rg;
        ctx.fill();
      }
      ctx.restore();

      // ── Counter-rotating secondary rays (depth) ──
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.18);

      const numRays2 = 10;
      for (let i = 0; i < numRays2; i++) {
        const angle = (i / numRays2) * Math.PI * 2;
        const spread = (Math.PI * 2 / numRays2) * 0.06;
        const rayLen2 = r * (0.7 + 0.08 * Math.sin(t * 0.5 + i));
        const alpha2 = 0.018 + 0.01 * Math.sin(t + i * 1.2);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, rayLen2, angle - spread / 2, angle + spread / 2);
        ctx.closePath();

        const rg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rayLen2);
        rg2.addColorStop(0,   `rgba(255, 230, 100, ${alpha2 * 3})`);
        rg2.addColorStop(0.3, `rgba(220, 175, 50, ${alpha2})`);
        rg2.addColorStop(1,   "rgba(200, 150, 20, 0)");
        ctx.fillStyle = rg2;
        ctx.fill();
      }
      ctx.restore();

      // ── Outer ambient glow ──
      const outerR = r * (0.55 + 0.03 * Math.sin(t * 1.3));
      const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
      outerGrad.addColorStop(0,   "rgba(210, 170, 40, 0.18)");
      outerGrad.addColorStop(0.35,"rgba(190, 148, 28, 0.09)");
      outerGrad.addColorStop(0.7, "rgba(170, 128, 16, 0.04)");
      outerGrad.addColorStop(1,   "rgba(150, 110, 10, 0)");
      ctx.fillStyle = outerGrad;
      ctx.fillRect(0, 0, width, height);

      // ── Core glow ──
      const coreR = r * (0.22 + 0.015 * Math.sin(t * 2.1));
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0,    "rgba(255, 240, 140, 0.75)");
      coreGrad.addColorStop(0.12, "rgba(240, 210, 80, 0.5)");
      coreGrad.addColorStop(0.35, "rgba(215, 175, 45, 0.25)");
      coreGrad.addColorStop(0.65, "rgba(195, 150, 25, 0.1)");
      coreGrad.addColorStop(1,    "rgba(170, 125, 10, 0)");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, width, height);

      // ── Bright nucleus ──
      const nucR = r * (0.045 + 0.006 * Math.sin(t * 3.5));
      const nucGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucR);
      nucGrad.addColorStop(0,   "rgba(255, 252, 220, 1)");
      nucGrad.addColorStop(0.25,"rgba(255, 235, 130, 0.9)");
      nucGrad.addColorStop(0.6, "rgba(245, 215, 80, 0.5)");
      nucGrad.addColorStop(1,   "rgba(220, 185, 45, 0)");
      ctx.fillStyle = nucGrad;
      ctx.fillRect(0, 0, width, height);

      // ── Floating orb (drifts around core) ──
      const ox = cx + r * 0.18 * Math.sin(t * 0.35);
      const oy = cy + r * 0.09 * Math.cos(t * 0.28);
      const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 0.14);
      orbGrad.addColorStop(0,  "rgba(200, 165, 35, 0.22)");
      orbGrad.addColorStop(0.5,"rgba(185, 145, 25, 0.1)");
      orbGrad.addColorStop(1,  "rgba(160, 120, 10, 0)");
      ctx.fillStyle = orbGrad;
      ctx.fillRect(0, 0, width, height);

      // ── Rising particles ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy -= 0.003;
        const lr = p.life / p.maxLife;
        const pa = p.alpha * (1 - lr) * Math.min(lr * 6, 1);
        if (pa <= 0 || p.life >= p.maxLife) { particles.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - lr * 0.4), 0, Math.PI * 2);
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        pg.addColorStop(0, `rgba(255, 235, 100, ${pa})`);
        pg.addColorStop(1, `rgba(220, 180, 50, 0)`);
        ctx.fillStyle = pg;
        ctx.fill();
      }

      // ── Vignette / bottom fade ──
      const vigGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.1);
      vigGrad.addColorStop(0, "rgba(0,0,0,0)");
      vigGrad.addColorStop(1, "rgba(4,3,0,0.72)");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, width, height);

      const botGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
      botGrad.addColorStop(0, "rgba(4,3,0,0)");
      botGrad.addColorStop(1, "rgba(4,3,0,0.65)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
