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

// ── Binance Perpetual Futures endpoints (called directly from the browser) ──
const FAPI_BASE = "https://fapi.binance.com/fapi/v1";
const FSTREAM_WS = "wss://fstream.binance.com/ws";

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

/** Normalise "1D" → "1d" for API calls */
function normaliseInterval(interval: string): string {
  return interval === "1D" ? "1d" : interval;
}

/** Validate a single candle — all price fields must be finite positive numbers */
function isValidCandle(c: CandleData): boolean {
  return (
    c.time > 0 &&
    isFinite(c.close) && c.close > 0 &&
    isFinite(c.open)  && c.open  > 0 &&
    isFinite(c.high)  && c.high  > 0 &&
    isFinite(c.low)   && c.low   > 0
  );
}

/**
 * Sort candles by open time ascending, deduplicate (last write wins),
 * and filter out invalid entries.
 */
function sanitizeCandles(candles: CandleData[]): CandleData[] {
  const map = new Map<number, CandleData>();
  for (const c of candles) {
    if (isValidCandle(c)) map.set(c.time, c);
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

/**
 * Fetch perpetual-futures klines directly from the browser.
 * Returns an empty array on any failure so the caller can fall back gracefully.
 */
async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 100,
): Promise<CandleData[]> {
  try {
    const iv = normaliseInterval(interval);
    const url =
      `${FAPI_BASE}/klines?symbol=${symbol}&interval=${iv}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: (string | number)[][] = await res.json();
    if (!Array.isArray(data)) throw new Error("Bad shape");
    return sanitizeCandles(
      data.map((k) => ({
        time:   Number(k[0]),
        open:   parseFloat(String(k[1])),
        high:   parseFloat(String(k[2])),
        low:    parseFloat(String(k[3])),
        close:  parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
      })),
    );
  } catch {
    return [];
  }
}

/**
 * Fetch 24-hour ticker from Binance perpetual futures.
 */
async function fetchTicker24h(
  symbol: string,
): Promise<{ price: number; change: number; changePct: number }> {
  try {
    const url = `${FAPI_BASE}/ticker/24hr?symbol=${symbol}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.lastPrice) throw new Error("Bad shape");
    return {
      price:     parseFloat(data.lastPrice),
      change:    parseFloat(data.priceChange),
      changePct: parseFloat(data.priceChangePercent),
    };
  } catch {
    return { price: 0, change: 0, changePct: 0 };
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useBinancePrice(symbol = "BTCUSDT"): BinancePriceData {
  const [price, setPrice]                       = useState(0);
  const [priceChange, setPriceChange]           = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [candles, setCandles]                   = useState<CandleData[]>([]);
  const [connected, setConnected]               = useState(false);
  const [interval, setIntervalState]            = useState("5m");

  const wsRef             = useRef<WebSocket | null>(null);
  const reconnectRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSymbolRef   = useRef(symbol);
  const activeIntervalRef = useRef(interval);
  // true while candles come from the REST load (not yet updated by WS)
  const loadedRef         = useRef(false);

  // ── helpers ────────────────────────────────────────────────────────────

  const stopWs = () => {
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
      ws.close();
    }
  };

  // ── WebSocket ──────────────────────────────────────────────────────────

  const connectWs = (sym: string, intv: string) => {
    stopWs();
    const iv     = normaliseInterval(intv);
    const stream = `${sym.toLowerCase()}@kline_${iv}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(`${FSTREAM_WS}/${stream}`);
    } catch {
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (activeSymbolRef.current !== sym || activeIntervalRef.current !== intv) {
        ws.close(); return;
      }
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
      if (activeSymbolRef.current === sym && activeIntervalRef.current === intv) {
        reconnectRef.current = setTimeout(() => {
          if (activeSymbolRef.current === sym && activeIntervalRef.current === intv) {
            connectWs(sym, intv);
          }
        }, 5000);
      }
    };

    ws.onerror = () => {
      ws.onclose = null;
      ws.close();
      setConnected(false);
    };

    ws.onmessage = (event) => {
      if (activeSymbolRef.current !== sym || activeIntervalRef.current !== intv) return;
      try {
        const msg = JSON.parse(event.data as string);
        if (!msg.k) return;
        const k = msg.k;

        const candle: CandleData = {
          time:   Number(k.t),
          open:   parseFloat(k.o),
          high:   parseFloat(k.h),
          low:    parseFloat(k.l),
          close:  parseFloat(k.c),
          volume: parseFloat(k.v),
        };
        if (!isValidCandle(candle)) return;

        // Always update the displayed price with the live candle close
        setPrice(candle.close);

        setCandles((prev) => {
          // If we have no candles yet (REST still loading), just seed with this candle
          if (prev.length === 0) return [candle];

          const lastIdx = prev.length - 1;
          const last    = prev[lastIdx];

          if (last.time === candle.time) {
            // Same period → update in place
            const updated = [...prev];
            updated[lastIdx] = candle;
            return updated;
          }

          if (candle.time > last.time) {
            // New period started → append and cap at 120 candles
            const updated = [...prev, candle];
            return updated.length > 120 ? updated.slice(-120) : updated;
          }

          // Out-of-order / stale message → ignore
          return prev;
        });

        loadedRef.current = true;
      } catch { /* ignore */ }
    };
  };

  // ── Main effect (re-runs on symbol or interval change) ─────────────────

  useEffect(() => {
    let mounted = true;
    activeSymbolRef.current   = symbol;
    activeIntervalRef.current = interval;
    loadedRef.current         = false;

    // Reset state immediately so stale candles don't flash
    setCandles([]);
    setPrice(0);
    setPriceChange(0);
    setPriceChangePercent(0);
    setConnected(false);
    stopWs();

    (async () => {
      // Fire REST calls in parallel
      const [ticker, klines] = await Promise.all([
        fetchTicker24h(symbol),
        fetchKlines(symbol, interval, 100),
      ]);
      if (!mounted) return;

      // Update ticker info
      if (ticker.price > 0) {
        setPrice(ticker.price);
        setPriceChange(ticker.change);
        setPriceChangePercent(ticker.changePct);
      }

      // Seed chart with real historical klines
      if (klines.length > 0) {
        setCandles(klines);
        // Ensure price reflects the latest kline close if ticker failed
        if (ticker.price <= 0) setPrice(klines[klines.length - 1].close);
      }

      loadedRef.current = true;

      // Open the real-time WebSocket
      if (mounted) connectWs(symbol, interval);
    })();

    return () => {
      mounted = false;
      stopWs();
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
