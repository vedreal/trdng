import { useEffect, useRef } from "react";
import type { CandleData } from "../hooks/useBinancePrice";

interface CandleChartProps {
  candles: CandleData[];
  currentPrice: number;
}

export function CandleChart({ candles, currentPrice }: CandleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W  = rect.width;
    const H  = rect.height;
    ctx.clearRect(0, 0, W, H);

    // ── Loading skeleton ───────────────────────────────────────────────────
    if (candles.length < 2) {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      const barW = 8, barGap = 5, barY = H * 0.3;
      for (let i = 0; i < Math.floor(W / (barW + barGap)); i++) {
        const bH = H * (0.2 + Math.sin(i * 0.6) * 0.15 + 0.15);
        ctx.beginPath();
        ctx.roundRect?.(i * (barW + barGap) + 4, barY + (H * 0.4 - bH), barW, bH, 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.font = "11px -apple-system, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Loading chart…", W / 2, H / 2 + 4);
      return;
    }

    const PRICE_LABEL_W = 58;
    const chartW = W - PRICE_LABEL_W;
    const TOP_PAD = 14;
    const BOT_PAD = 8;
    const chartH = H - TOP_PAD - BOT_PAD;

    // Use the live currentPrice to update the last candle so the endpoint
    // always matches the real-time ticker — only when price is valid.
    const liveClose =
      currentPrice > 0 && isFinite(currentPrice) ? currentPrice : candles[candles.length - 1].close;

    const pts = candles.map((c, i) => {
      const closePrice = i === candles.length - 1 ? liveClose : c.close;
      return { close: closePrice };
    });

    // Y-scale based on close prices only
    const closes  = pts.map((p) => p.close);
    const rawMax  = Math.max(...closes);
    const rawMin  = Math.min(...closes);
    const pad     = (rawMax - rawMin) * 0.15 || rawMax * 0.002;
    const maxP    = rawMax + pad;
    const minP    = rawMin - pad;
    const range   = maxP - minP || 1;

    const toX = (i: number) => (i / (candles.length - 1)) * chartW;
    const toY = (p: number) => TOP_PAD + ((maxP - p) / range) * chartH;

    // ── Horizontal grid lines + price labels ──────────────────────────────
    const gridLevels = 4;
    for (let i = 0; i <= gridLevels; i++) {
      const frac = i / gridLevels;
      const y    = TOP_PAD + frac * chartH;
      const p    = maxP - frac * range;

      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth   = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      ctx.fillStyle  = "rgba(0,0,0,0.30)";
      ctx.font       = "9px -apple-system, Inter, sans-serif";
      ctx.textAlign  = "left";
      ctx.fillText(
        p >= 1000
          ? p.toLocaleString("en-US", { maximumFractionDigits: 0 })
          : p.toFixed(p < 1 ? 4 : 2),
        chartW + 4,
        y + 3.5,
      );
    }

    // ── Build screen coordinates ──────────────────────────────────────────
    const screenPts = pts.map((p, i) => ({ x: toX(i), y: toY(p.close) }));

    // ── Path builder (straight line segments — correct for finance charts) ─
    const buildPath = () => {
      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
      }
    };

    // ── Gradient fill ─────────────────────────────────────────────────────
    const gradient = ctx.createLinearGradient(0, TOP_PAD, 0, TOP_PAD + chartH);
    gradient.addColorStop(0,    "rgba(59,130,246,0.20)");
    gradient.addColorStop(0.65, "rgba(59,130,246,0.05)");
    gradient.addColorStop(1,    "rgba(59,130,246,0)");

    buildPath();
    ctx.lineTo(screenPts[screenPts.length - 1].x, TOP_PAD + chartH);
    ctx.lineTo(screenPts[0].x, TOP_PAD + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // ── Main line ─────────────────────────────────────────────────────────
    buildPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth   = 1.8;
    ctx.setLineDash([]);
    ctx.lineJoin    = "round";
    ctx.lineCap     = "round";
    ctx.stroke();

    // ── Live price dashed horizontal line ─────────────────────────────────
    const py = toY(liveClose);
    if (py >= TOP_PAD - 2 && py <= TOP_PAD + chartH + 2) {
      ctx.strokeStyle = "rgba(59,130,246,0.7)";
      ctx.lineWidth   = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(chartW, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag pill
      const tagW = 54, tagH = 14;
      const tagX = chartW + 2;
      const tagY = py - tagH / 2;
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(tagX, tagY, tagW, tagH, 2);
      else ctx.rect(tagX, tagY, tagW, tagH);
      ctx.fill();

      ctx.fillStyle  = "white";
      ctx.font       = "bold 8.5px -apple-system, Inter, sans-serif";
      ctx.textAlign  = "center";
      ctx.fillText(
        liveClose >= 1000
          ? liveClose.toLocaleString("en-US", { maximumFractionDigits: 1 })
          : liveClose.toFixed(liveClose < 1 ? 4 : 2),
        tagX + tagW / 2,
        py + 3.5,
      );
    }

    // ── Glowing dot at the live endpoint ──────────────────────────────────
    const last = screenPts[screenPts.length - 1];
    const glow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 8);
    glow.addColorStop(0, "rgba(59,130,246,0.40)");
    glow.addColorStop(1, "rgba(59,130,246,0)");
    ctx.beginPath();
    ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle   = "#3b82f6";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
  }, [candles, currentPrice]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
