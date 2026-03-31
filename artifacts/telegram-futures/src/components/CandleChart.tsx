import { useEffect, useRef } from "react";
import type { CandleData } from "../hooks/useBinancePrice";

interface CandleChartProps {
  candles: CandleData[];
  currentPrice: number;
}

export function CandleChart({ candles, currentPrice }: CandleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;
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
    const PRICE_LABEL_W = 58;
    const chartW = W - PRICE_LABEL_W;
    const TOP_PAD = 10;
    const BOT_PAD = 20;
    const chartH = H - TOP_PAD - BOT_PAD;

    ctx.clearRect(0, 0, W, H);

    const visible = candles.slice(-60);
    const prices = visible.map((c) => c.close);
    const maxP = Math.max(...prices) * 1.0003;
    const minP = Math.min(...prices) * 0.9997;
    const priceRange = maxP - minP || 1;

    const toX = (i: number) => (i / (visible.length - 1)) * chartW;
    const toY = (p: number) => TOP_PAD + ((maxP - p) / priceRange) * chartH;

    // Draw grid lines
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = TOP_PAD + (i / gridCount) * chartH;
      const price = maxP - (i / gridCount) * priceRange;

      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.font = "9px Inter, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(0), chartW + 5, y + 3.5);
    }

    if (visible.length < 2) return;

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, TOP_PAD, 0, TOP_PAD + chartH);
    gradient.addColorStop(0, "rgba(251, 146, 60, 0.25)");
    gradient.addColorStop(0.6, "rgba(251, 146, 60, 0.05)");
    gradient.addColorStop(1, "rgba(251, 146, 60, 0)");

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(visible[0].close));
    for (let i = 1; i < visible.length; i++) {
      const x0 = toX(i - 1);
      const x1 = toX(i);
      const y0 = toY(visible[i - 1].close);
      const y1 = toY(visible[i].close);
      const cpx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
    }
    ctx.lineTo(toX(visible.length - 1), TOP_PAD + chartH);
    ctx.lineTo(toX(0), TOP_PAD + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(visible[0].close));
    for (let i = 1; i < visible.length; i++) {
      const x0 = toX(i - 1);
      const x1 = toX(i);
      const y0 = toY(visible[i - 1].close);
      const y1 = toY(visible[i].close);
      const cpx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
    }
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();

    // Current price dashed line
    if (currentPrice > 0) {
      const py = toY(currentPrice);
      if (py >= TOP_PAD && py <= TOP_PAD + chartH) {
        ctx.strokeStyle = "#ef5350";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(chartW, py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price tag
        ctx.fillStyle = "#ef5350";
        const tagW = 52;
        const tagH = 15;
        ctx.beginPath();
        ctx.roundRect(chartW + 4, py - tagH / 2, tagW, tagH, 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 9px Inter, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(currentPrice.toFixed(1), chartW + 4 + tagW / 2, py + 3.5);
      }
    }

    // Dot at latest price
    const lastX = toX(visible.length - 1);
    const lastY = toY(visible[visible.length - 1].close);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f97316";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Time labels
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.font = "9px Inter, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.setLineDash([]);
    const timeSteps = [0, Math.floor(visible.length / 3), Math.floor((visible.length / 3) * 2), visible.length - 1];
    timeSteps.forEach((idx) => {
      if (!visible[idx]) return;
      const x = toX(idx);
      const d = new Date(visible[idx].time);
      const label = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      ctx.fillText(label, x, H - 4);
    });

  }, [candles, currentPrice]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
