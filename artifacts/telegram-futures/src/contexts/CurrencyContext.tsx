import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CHF: "CHF ", EUR: "€", GBP: "£",
  HKD: "HKD ", IDR: "Rp", INR: "₹", JPY: "¥", KRW: "₩",
  MYR: "RM ", QAR: "QR ", RUB: "₽", SAR: "SR ",
  SGD: "SGD ", USD: "$", VND: "₫",
};

const ZERO_DEC = new Set(["IDR", "JPY", "KRW", "VND"]);

const LS_KEY       = "profile_currency_v1";
const LS_RATES     = "fx_rates_cache_v1";
const LS_RATES_TS  = "fx_rates_ts_v1";
const CACHE_TTL    = 60 * 60 * 1000;

function readCurrency(): string {
  return localStorage.getItem(LS_KEY) ?? "USD";
}

interface CurrencyContextType {
  currency: string;
  symbol: string;
  rate: number;
  loading: boolean;
  fmtFiat: (usd: number, dec?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState(readCurrency);
  const [rates, setRates]       = useState<Record<string, number>>({ USD: 1 });
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const cachedTs    = localStorage.getItem(LS_RATES_TS);
        const cachedRates = localStorage.getItem(LS_RATES);
        if (cachedTs && cachedRates && Date.now() - parseInt(cachedTs) < CACHE_TTL) {
          setRates(JSON.parse(cachedRates));
          setLoading(false);
          return;
        }
        const res  = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data.result === "success" && data.rates) {
          setRates(data.rates);
          localStorage.setItem(LS_RATES, JSON.stringify(data.rates));
          localStorage.setItem(LS_RATES_TS, Date.now().toString());
        }
      } catch { /* use defaults */ }
      setLoading(false);
    };
    fetchRates();
  }, []);

  useEffect(() => {
    const onCurrencyChanged = (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      if (code) setCurrency(code);
    };
    window.addEventListener("currency-changed", onCurrencyChanged);
    return () => window.removeEventListener("currency-changed", onCurrencyChanged);
  }, []);

  const rate   = rates[currency] ?? 1;
  const symbol = CURRENCY_SYMBOLS[currency] ?? (currency + " ");

  const fmtFiat = useCallback((usd: number, dec?: number): string => {
    const converted  = usd * rate;
    const actualDec  = dec ?? (ZERO_DEC.has(currency) ? 0 : 2);
    return symbol + converted.toLocaleString("en-US", {
      minimumFractionDigits: actualDec,
      maximumFractionDigits: actualDec,
    });
  }, [rate, symbol, currency]);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, rate, loading, fmtFiat }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
