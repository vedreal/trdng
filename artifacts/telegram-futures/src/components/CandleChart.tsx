import { useEffect, useRef } from "react";
import type { CandleData } from "../hooks/useBinancePrice";

interface CandleChartProps {
  candles: CandleData[];
  currentPrice: number;
}

export function CandleChart({ candles, currentPrice }: CandleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || candles.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PRICE_LABEL_W = 58;
    const chartW = W - PRICE_LABEL_W;
    const TOP_PAD = 14;
    const BOT_PAD = 8;
    const chartH = H - TOP_PAD - BOT_PAD;

    ctx.clearRect(0, 0, W, H);

    // Take up to 70 candles, sorted by time, filter out invalid entries
    const rawVisible = candles
      .filter((c) => c.time > 0 && c.close > 0 && isFinite(c.close))
      .sort((a, b) => a.time - b.time)
      .slice(-70);

    if (rawVisible.length < 2) return;

    // Update the last candle's close to currentPrice if it's valid and more recent
    const visible: CandleData[] = rawVisible.map((c, i) => {
      if (i === rawVisible.length - 1 && currentPrice > 0 && isFinite(currentPrice)) {
        return {
          ...c,
          close: currentPrice,
          high: Math.max(c.high, currentPrice),
          low:  Math.min(c.low,  currentPrice),
        };
      }
      return c;
    });

    // Y-scale based on close prices only (no extra clipping)
    const closePrices = visible.map((c) => c.close);
    const rawMax = Math.max(...closePrices);
    const rawMin = Math.min(...closePrices);
    const padding = (rawMax - rawMin) * 0.18 || rawMax * 0.002;
    const maxP = rawMax + padding;
    const minP = rawMin - padding;
    const priceRange = maxP - minP || 1;

    const toX = (i: number) => (i / (visible.length - 1)) * chartW;
    const toY = (p: number) => TOP_PAD + ((maxP - p) / priceRange) * chartH;

    // Horizontal grid lines + price labels
    const gridLevels = 4;
    for (let i = 0; i <= gridLevels; i++) {
      const frac = i / gridLevels;
      const y = TOP_PAD + frac * chartH;
      const p = maxP - frac * priceRange;

      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.font = `9px -apple-system, Inter, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(
        p >= 1000
          ? p.toLocaleString("en-US", { maximumFractionDigits: 0 })
          : p.toFixed(p < 1 ? 4 : 2),
        chartW + 4,
        y + 3.5
      );
    }

    // Build points
    const pts = visible.map((c, i) => ({ x: toX(i), y: toY(c.close) }));

    // Draw path using straight line segments — this is the correct approach for
    // financial charts and prevents the "straight vertical spike" artifact that
    // cubic Bezier control points cause on large price moves.
    const buildPath = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    };

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, TOP_PAD, 0, TOP_PAD + chartH);
    gradient.addColorStop(0,    "rgba(249,115,22,0.18)");
    gradient.addColorStop(0.65, "rgba(249,115,22,0.04)");
    gradient.addColorStop(1,    "rgba(249,115,22,0)");

    buildPath();
    ctx.lineTo(pts[pts.length - 1].x, TOP_PAD + chartH);
    ctx.lineTo(pts[0].x, TOP_PAD + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main line
    buildPath();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([]);
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";
    ctx.stroke();

    // Current price dashed horizontal line
    const livePrice = currentPrice > 0 && isFinite(currentPrice)
      ? currentPrice
      : closePrices[closePrices.length - 1];
    const py = toY(livePrice);
    if (py >= TOP_PAD - 2 && py <= TOP_PAD + chartH + 2) {
      ctx.strokeStyle = "rgba(239,83,80,0.7)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(chartW, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag pill
      ctx.fillStyle = "#ef5350";
      const tagW = 54;
      const tagH = 14;
      const tagX = chartW + 2;
      const tagY = py - tagH / 2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(tagX, tagY, tagW, tagH, 2);
      } else {
        ctx.rect(tagX, tagY, tagW, tagH);
      }
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = `bold 8.5px -apple-system, Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        livePrice >= 1000
          ? livePrice.toLocaleString("en-US", { maximumFractionDigits: 1 })
          : livePrice.toFixed(livePrice < 1 ? 4 : 2),
        tagX + tagW / 2,
        py + 3.5
      );
    }

    // Glowing dot at the live price endpoint
    const lastPt = pts[pts.length - 1];
    const glowGrad = ctx.createRadialGradient(lastPt.x, lastPt.y, 0, lastPt.x, lastPt.y, 8);
    glowGrad.addColorStop(0,   "rgba(249,115,22,0.35)");
    glowGrad.addColorStop(1,   "rgba(249,115,22,0)");
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
    // Inner dot
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f97316";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
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
