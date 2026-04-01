import { useEffect, useRef, useState } from "react";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BinancePriceData {
  price: number;
  priceChange: number;
  priceChangePercent: number;
  candles: CandleData[];
  connected: boolean;
  interval: string;
  setInterval: (interval: string) => void;
}

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function generateMockCandles(basePrice: number, count = 60, intervalMs = 60000): CandleData[] {
  const now = Date.now();
  let price = basePrice;
  const candles: CandleData[] = [];
  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.48) * basePrice * 0.002;
    price = Math.max(price + change, basePrice * 0.9);
    const open = price;
    const closeChange = (Math.random() - 0.48) * basePrice * 0.001;
    const close = open + closeChange;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.001;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.001;
    candles.push({
      time: now - i * intervalMs,
      open,
      high,
      low,
      close,
      volume: Math.random() * 100,
    });
    price = close;
  }
  return candles;
}

async function fetchKlines(symbol: string, interval: string, limit = 60): Promise<CandleData[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!res.ok) throw new Error("klines fetch failed");
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid response");
    return data.map((k: (string | number)[]) => ({
      time: Number(k[0]),
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }));
  } catch {
    return [];
  }
}

async function fetchTicker24h(symbol: string): Promise<{ price: number; change: number; changePct: number }> {
  try {
    const res = await fetch(`${BASE_URL}/api/binance/ticker?symbol=${symbol}`);
    if (!res.ok) throw new Error("ticker failed");
    const data = await res.json();
    if (!data.lastPrice) throw new Error("Invalid ticker");
    return {
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChange),
      changePct: parseFloat(data.priceChangePercent),
    };
  } catch {
    return { price: 0, change: 0, changePct: 0 };
  }
}

const SYMBOL_MOCK_PRICES: Record<string, number> = {
  BTCUSDT: 67000,
  BNBUSDT: 600,
  XAUTUSDT: 2620,
};

export function useBinancePrice(symbol = "BTCUSDT"): BinancePriceData {
  const MOCK_PRICE = SYMBOL_MOCK_PRICES[symbol] ?? 67000;
  const [price, setPrice] = useState(MOCK_PRICE);
  const [priceChange, setPriceChange] = useState(-120);
  const [priceChangePercent, setPriceChangePercent] = useState(-0.18);
  const [candles, setCandles] = useState<CandleData[]>(() => generateMockCandles(MOCK_PRICE, 60, 300000));
  const [connected, setConnected] = useState(false);
  const [interval, setIntervalState] = useState("5m");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMockUpdates = (baseP: number) => {
    if (mockUpdateRef.current) clearInterval(mockUpdateRef.current);
    let p = baseP;
    mockUpdateRef.current = setInterval(() => {
      const change = (Math.random() - 0.48) * p * 0.0008;
      p = p + change;
      setPrice(p);
      setCandles((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        const newCandle = {
          ...last,
          close: p,
          high: Math.max(last.high, p),
          low: Math.min(last.low, p),
        };
        updated[updated.length - 1] = newCandle;
        return [...updated];
      });
    }, 2000);
  };

  const connectWs = (sym: string, intv: string, fallbackPrice: number) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    try {
      const stream = `${sym.toLowerCase()}@kline_${intv}`;
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
      wsRef.current = ws;

      let opened = false;
      const timeout = setTimeout(() => {
        if (!opened) {
          ws.close();
          startMockUpdates(fallbackPrice);
        }
      }, 5000);

      ws.onopen = () => {
        opened = true;
        clearTimeout(timeout);
        setConnected(true);
        if (mockUpdateRef.current) {
          clearInterval(mockUpdateRef.current);
          mockUpdateRef.current = null;
        }
      };
      ws.onclose = () => {
        clearTimeout(timeout);
        setConnected(false);
        reconnectTimerRef.current = setTimeout(() => connectWs(sym, intv, fallbackPrice), 5000);
      };
      ws.onerror = () => {
        ws.close();
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.k) {
            const k = msg.k;
            const newCandle: CandleData = {
              time: Number(k.t),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
            };
            setPrice(newCandle.close);
            setCandles((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].time === newCandle.time) {
                updated[lastIdx] = newCandle;
              } else {
                updated.push(newCandle);
                if (updated.length > 80) updated.shift();
              }
              return updated;
            });
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      startMockUpdates(fallbackPrice);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [ticker, klines] = await Promise.all([
        fetchTicker24h(symbol),
        fetchKlines(symbol, interval),
      ]);
      if (!mounted) return;

      let usedPrice = MOCK_PRICE;
      if (ticker.price > 0) {
        usedPrice = ticker.price;
        setPrice(ticker.price);
        setPriceChange(ticker.change);
        setPriceChangePercent(ticker.changePct);
      }
      if (klines.length > 0) {
        setCandles(klines);
        usedPrice = klines[klines.length - 1].close;
      } else {
        setCandles(generateMockCandles(usedPrice));
      }
      connectWs(symbol, interval, usedPrice);
    };

    init();

    return () => {
      mounted = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (mockUpdateRef.current) clearInterval(mockUpdateRef.current);
    };
  }, [symbol, interval]);

  return {
    price,
    priceChange,
    priceChangePercent,
    candles,
    connected,
    interval,
    setInterval: setIntervalState,
  };
}
