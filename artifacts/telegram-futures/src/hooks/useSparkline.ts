import { useState, useEffect } from "react";

const FAPI_BASE = "https://fapi.binance.com/fapi/v1";

/**
 * Fetches the last 25 hourly close prices from Binance Futures for a given symbol.
 * Returns an empty array if the symbol is null or the fetch fails.
 */
export function useSparkline(symbol: string | null): number[] {
  const [closes, setCloses] = useState<number[]>([]);

  useEffect(() => {
    if (!symbol) { setCloses([]); return; }
    let cancelled = false;

    (async () => {
      try {
        const url = `${FAPI_BASE}/klines?symbol=${symbol}&interval=1h&limit=25`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok || cancelled) return;
        const data: (string | number)[][] = await res.json();
        if (!Array.isArray(data) || cancelled) return;
        const prices = data.map((k) => parseFloat(String(k[4]))).filter((v) => isFinite(v) && v > 0);
        if (!cancelled) setCloses(prices);
      } catch {
        // ignore
      }
    })();

    return () => { cancelled = true; };
  }, [symbol]);

  return closes;
}
