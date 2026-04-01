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

/** Convert Binance interval string to milliseconds */
function getIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    "1m":     60_000,
    "3m":    180_000,
    "5m":    300_000,
    "15m":   900_000,
    "30m": 1_800_000,
    "1h":  3_600_000,
    "2h":  7_200_000,
    "4h": 14_400_000,
    "6h": 21_600_000,
    "1d": 86_400_000,
    "1D": 86_400_000,
  };
  return map[interval] ?? 300_000;
}

/**
 * Generate mock candles with Binance-aligned timestamps.
 * The last candle's open time = floor(now / intervalMs) * intervalMs,
 * which matches what the WebSocket kline stream will send for the current period.
 * This prevents the WebSocket from pushing a brand-new candle (spike) instead of
 * updating the existing last mock candle.
 */
function generateMockCandles(basePrice: number, count = 60, interval = "5m"): CandleData[] {
  const intervalMs = getIntervalMs(interval);
  const now = Date.now();
  // Align to the current Binance period boundary
  const currentPeriodStart = Math.floor(now / intervalMs) * intervalMs;

  const candles: CandleData[] = [];
  // Start slightly below basePrice for a natural-looking chart
  let price = basePrice * (0.97 + Math.random() * 0.02);

  for (let i = count; i >= 0; i--) {
    const time = currentPeriodStart - i * intervalMs;
    const change = (Math.random() - 0.48) * price * 0.0015;
    price = Math.max(price + change, basePrice * 0.88);
    const open = price;
    const closeChange = (Math.random() - 0.48) * price * 0.001;
    const close = open + closeChange;
    const high = Math.max(open, close) + Math.random() * price * 0.0008;
    const low  = Math.min(open, close) - Math.random() * price * 0.0008;
    candles.push({
      time,
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
  BTCUSDT:  84000,
  ETHUSDT:  1600,
  BNBUSDT:   590,
  SOLUSDT:   130,
  XRPUSDT:   2.1,
  DOGEUSDT:  0.17,
  XAUTUSDT: 3100,
};

export function useBinancePrice(symbol = "BTCUSDT"): BinancePriceData {
  const MOCK_PRICE = SYMBOL_MOCK_PRICES[symbol] ?? 67000;
  const [price, setPrice] = useState(MOCK_PRICE);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [candles, setCandles] = useState<CandleData[]>(() =>
    generateMockCandles(MOCK_PRICE, 60, "5m")
  );
  const [connected, setConnected] = useState(false);
  const [interval, setIntervalState] = useState("5m");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSymbolRef = useRef(symbol);
  const activeIntervalRef = useRef(interval);
  // Track whether candles are still placeholder mock data (not yet replaced by real data)
  const isMockDataRef = useRef(true);

  const stopAll = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (mockUpdateRef.current) {
      clearInterval(mockUpdateRef.current);
      mockUpdateRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const startMockUpdates = (baseP: number, intv: string) => {
    if (mockUpdateRef.current) clearInterval(mockUpdateRef.current);
    let p = baseP;
    mockUpdateRef.current = setInterval(() => {
      const change = (Math.random() - 0.48) * p * 0.0008;
      p = p + change;
      setPrice(p);
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...last,
          close: p,
          high: Math.max(last.high, p),
          low:  Math.min(last.low,  p),
        };
        return updated;
      });
    }, 2000);
  };

  const connectWs = (sym: string, intv: string, fallbackPrice: number) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
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
          ws.onclose = null;
          ws.close();
          if (activeSymbolRef.current === sym && activeIntervalRef.current === intv) {
            startMockUpdates(fallbackPrice, intv);
          }
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
        if (activeSymbolRef.current === sym && activeIntervalRef.current === intv) {
          reconnectTimerRef.current = setTimeout(() => {
            if (activeSymbolRef.current === sym && activeIntervalRef.current === intv) {
              connectWs(sym, intv, fallbackPrice);
            }
          }, 5000);
        }
      };

      ws.onerror = () => {
        ws.onclose = null;
        ws.close();
        if (activeSymbolRef.current === sym && activeIntervalRef.current === intv) {
          startMockUpdates(fallbackPrice, intv);
        }
      };

      ws.onmessage = (event) => {
        if (activeSymbolRef.current !== sym) return;
        try {
          const msg = JSON.parse(event.data);
          if (!msg.k) return;
          const k = msg.k;
          const newCandle: CandleData = {
            time: Number(k.t),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low:  parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          };
          setPrice(newCandle.close);

          setCandles((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;

            if (lastIdx >= 0 && updated[lastIdx].time === newCandle.time) {
              // Normal case: update the current forming candle in-place
              updated[lastIdx] = newCandle;
              isMockDataRef.current = false;
              return updated;
            }

            // Time mismatch: either stale mock data or a new candle starting
            if (isMockDataRef.current || lastIdx < 0) {
              // Still on mock data → replace entire array with fresh aligned mock
              // candles ending at the real price, then set the last one to the real kline
              const fresh = generateMockCandles(newCandle.close, 60, intv);
              // Replace the last mock candle with the real kline (times now match)
              fresh[fresh.length - 1] = newCandle;
              isMockDataRef.current = false;
              return fresh;
            }

            // Real historical data present → this is a new completed candle starting
            updated.push(newCandle);
            if (updated.length > 80) updated.shift();
            return updated;
          });
        } catch {
          /* ignore malformed messages */
        }
      };
    } catch {
      if (activeSymbolRef.current === sym) {
        startMockUpdates(fallbackPrice, intv);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    activeSymbolRef.current = symbol;
    activeIntervalRef.current = interval;
    isMockDataRef.current = true;

    const mockPrice = SYMBOL_MOCK_PRICES[symbol] ?? 67000;
    setPrice(mockPrice);
    setPriceChange(0);
    setPriceChangePercent(0);
    // Immediately show interval-aligned mock candles
    setCandles(generateMockCandles(mockPrice, 60, interval));
    setConnected(false);

    stopAll();

    const init = async () => {
      const [ticker, klines] = await Promise.all([
        fetchTicker24h(symbol),
        fetchKlines(symbol, interval),
      ]);
      if (!mounted) return;

      let usedPrice = mockPrice;
      if (ticker.price > 0) {
        usedPrice = ticker.price;
        setPrice(ticker.price);
        setPriceChange(ticker.change);
        setPriceChangePercent(ticker.changePct);
      }

      if (klines.length > 0) {
        // Real historical data loaded — no more mock
        isMockDataRef.current = false;
        setCandles(klines);
        usedPrice = klines[klines.length - 1].close;
      } else {
        // API failed — generate fresh aligned mock candles at the real price
        // (if ticker succeeded) so WebSocket can match the last candle's time
        setCandles(generateMockCandles(usedPrice, 60, interval));
        // isMockDataRef.current stays true so WS handler replaces on first message
      }

      connectWs(symbol, interval, usedPrice);
    };

    init();

    return () => {
      mounted = false;
      stopAll();
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
