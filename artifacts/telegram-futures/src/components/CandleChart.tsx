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
    const PRICE_LABEL_W = 60;
    const chartW = W - PRICE_LABEL_W;
    const TOP_PAD = 8;
    const BOT_PAD = 20;
    const chartH = H - TOP_PAD - BOT_PAD;

    ctx.clearRect(0, 0, W, H);

    const visible = candles.slice(-50);
    const highs = visible.map((c) => c.high);
    const lows = visible.map((c) => c.low);
    const maxP = Math.max(...highs);
    const minP = Math.min(...lows);
    const priceRange = maxP - minP || 1;

    const toY = (p: number) => TOP_PAD + ((maxP - p) / priceRange) * chartH;
    const candleW = (chartW / visible.length) * 0.6;
    const candleSpacing = chartW / visible.length;

    // Draw grid lines
    const gridCount = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridCount; i++) {
      const y = TOP_PAD + (i / gridCount) * chartH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
      const price = maxP - (i / gridCount) * priceRange;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(0), chartW + 4, y + 3);
    }

    // Draw candles
    visible.forEach((candle, i) => {
      const x = i * candleSpacing + candleSpacing / 2;
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? "#26a69a" : "#ef5350";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(candle.high));
      ctx.lineTo(x, toY(candle.low));
      ctx.stroke();

      // Body
      const openY = toY(candle.open);
      const closeY = toY(candle.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(Math.abs(openY - closeY), 1);
      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // Current price line
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

        // Price tag box
        ctx.fillStyle = "#ef5350";
        const tagW = 52;
        const tagH = 14;
        ctx.beginPath();
        ctx.roundRect(chartW + 4, py - tagH / 2, tagW, tagH, 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(currentPrice.toFixed(1), chartW + 4 + tagW / 2, py + 3.5);
      }
    }

    // Time labels
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.font = "9px Inter, sans-serif";
    ctx.textAlign = "center";
    const timeSteps = [0, Math.floor(visible.length / 3), Math.floor((visible.length / 3) * 2), visible.length - 1];
    timeSteps.forEach((idx) => {
      if (!visible[idx]) return;
      const x = idx * candleSpacing + candleSpacing / 2;
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
