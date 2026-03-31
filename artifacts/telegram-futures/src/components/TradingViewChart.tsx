import { useEffect, useRef } from "react";

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1",
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
};

interface TradingViewChartProps {
  interval: string;
}

export function TradingViewChart({ interval }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:BTCUSDT.P",
      interval: INTERVAL_MAP[interval] ?? "1",
      timezone: "Etc/UTC",
      theme: "light",
      style: "3",
      locale: "en",
      hide_top_toolbar: true,
      hide_legend: true,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      support_host: "https://www.tradingview.com",
      backgroundColor: "rgba(255,255,255,1)",
      gridColor: "rgba(0,0,0,0.04)",
      overrides: {
        "mainSeriesProperties.style": 3,
        "mainSeriesProperties.lineStyle.color": "#f97316",
        "mainSeriesProperties.lineStyle.linewidth": 2,
        "mainSeriesProperties.areaStyle.color1": "rgba(249,115,22,0.2)",
        "mainSeriesProperties.areaStyle.color2": "rgba(249,115,22,0)",
        "mainSeriesProperties.areaStyle.linecolor": "#f97316",
        "mainSeriesProperties.areaStyle.linewidth": 2,
        "paneProperties.background": "#ffffff",
        "paneProperties.backgroundGradientStartColor": "#ffffff",
        "paneProperties.backgroundGradientEndColor": "#ffffff",
        "paneProperties.vertGridProperties.color": "rgba(0,0,0,0.04)",
        "paneProperties.horzGridProperties.color": "rgba(0,0,0,0.04)",
        "scalesProperties.textColor": "rgba(0,0,0,0.4)",
        "scalesProperties.fontSize": 10,
      },
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [interval]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: "100%", width: "100%" }}
    />
  );
}
