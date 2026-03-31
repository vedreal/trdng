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
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PRICE_LABEL_W = 54;
    const chartW = W - PRICE_LABEL_W;
    const TOP_PAD = 12;
    const BOT_PAD = 8;
    const chartH = H - TOP_PAD - BOT_PAD;

    ctx.clearRect(0, 0, W, H);

    const visible = candles.slice(-70);
    const prices = visible.map((c) => c.close);
    const rawMax = Math.max(...prices);
    const rawMin = Math.min(...prices);
    const padding = (rawMax - rawMin) * 0.15 || rawMax * 0.002;
    const maxP = rawMax + padding;
    const minP = rawMin - padding;
    const priceRange = maxP - minP;

    const toX = (i: number) =>
      (i / (visible.length - 1)) * chartW;
    const toY = (p: number) =>
      TOP_PAD + ((maxP - p) / priceRange) * chartH;

    // Horizontal grid lines + price labels (4 levels)
    const gridLevels = 4;
    for (let i = 0; i <= gridLevels; i++) {
      const frac = i / gridLevels;
      const y = TOP_PAD + frac * chartH;
      const price = maxP - frac * priceRange;

      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.font = `9px -apple-system, Inter, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(
        price >= 1000
          ? price.toLocaleString("en-US", { maximumFractionDigits: 0 })
          : price.toFixed(2),
        chartW + 4,
        y + 3.5
      );
    }

    // Build smooth path via catmull-rom to bezier
    const pts = visible.map((c, i) => ({ x: toX(i), y: toY(c.close) }));

    const buildSmoothPath = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
    };

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, TOP_PAD, 0, TOP_PAD + chartH);
    gradient.addColorStop(0, "rgba(249,115,22,0.18)");
    gradient.addColorStop(0.65, "rgba(249,115,22,0.04)");
    gradient.addColorStop(1, "rgba(249,115,22,0)");

    buildSmoothPath();
    ctx.lineTo(pts[pts.length - 1].x, TOP_PAD + chartH);
    ctx.lineTo(pts[0].x, TOP_PAD + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main line
    buildSmoothPath();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([]);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Current price dashed line
    const py = toY(currentPrice > 0 ? currentPrice : prices[prices.length - 1]);
    if (py >= TOP_PAD - 2 && py <= TOP_PAD + chartH + 2) {
      ctx.strokeStyle = "rgba(239,83,80,0.7)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(chartW, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag
      ctx.fillStyle = "#ef5350";
      const tagW = 50;
      const tagH = 14;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(chartW + 2, py - tagH / 2, tagW, tagH, 2);
      } else {
        ctx.rect(chartW + 2, py - tagH / 2, tagW, tagH);
      }
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = `bold 8.5px -apple-system, Inter, sans-serif`;
      ctx.textAlign = "center";
      const displayP = currentPrice > 0 ? currentPrice : prices[prices.length - 1];
      ctx.fillText(
        displayP >= 1000
          ? displayP.toLocaleString("en-US", { maximumFractionDigits: 1 })
          : displayP.toFixed(2),
        chartW + 2 + tagW / 2,
        py + 3.5
      );
    }

    // Dot at latest point
    const lastPt = pts[pts.length - 1];
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
