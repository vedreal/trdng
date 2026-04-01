import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useTradingStore } from "../hooks/useTradingStore";

const BNB_INITIAL = 0.5;
const XAUT_INITIAL = 0;

export type WalletTxType = "deposit" | "withdraw" | "swap";

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  asset: string;
  amount: number;
  toAsset?: string;
  toAmount?: number;
  address?: string;
  timestamp: number;
  status: "completed" | "pending";
}

interface TradingContextType extends ReturnType<typeof useTradingStore> {
  bnbBalance: number;
  setBnbBalance: (v: number | ((prev: number) => number)) => void;
  xautBalance: number;
  setXautBalance: (v: number | ((prev: number) => number)) => void;
  walletHistory: WalletTransaction[];
  addWalletTx: (tx: Omit<WalletTransaction, "id" | "timestamp" | "status">) => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function TradingProvider({ children }: { children: ReactNode }) {
  const store = useTradingStore();
  const [bnbBalance, setBnbBalance] = useState(BNB_INITIAL);
  const [xautBalance, setXautBalance] = useState(XAUT_INITIAL);
  const [walletHistory, setWalletHistory] = useState<WalletTransaction[]>([]);

  const addWalletTx = useCallback((tx: Omit<WalletTransaction, "id" | "timestamp" | "status">) => {
    const entry: WalletTransaction = {
      ...tx,
      id: `wtx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      status: "completed",
    };
    setWalletHistory((prev) => [entry, ...prev]);
  }, []);

  return (
    <TradingContext.Provider value={{
      ...store,
      bnbBalance, setBnbBalance,
      xautBalance, setXautBalance,
      walletHistory, addWalletTx,
    }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading(): TradingContextType {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within TradingProvider");
  return ctx;
}
