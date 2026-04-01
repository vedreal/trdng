import { createContext, useContext, useState, type ReactNode } from "react";
import { useTradingStore } from "../hooks/useTradingStore";

const BNB_INITIAL = 0.5;

interface TradingContextType extends ReturnType<typeof useTradingStore> {
  bnbBalance: number;
  setBnbBalance: (v: number | ((prev: number) => number)) => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function TradingProvider({ children }: { children: ReactNode }) {
  const store = useTradingStore();
  const [bnbBalance, setBnbBalance] = useState(BNB_INITIAL);

  return (
    <TradingContext.Provider value={{ ...store, bnbBalance, setBnbBalance }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading(): TradingContextType {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}
