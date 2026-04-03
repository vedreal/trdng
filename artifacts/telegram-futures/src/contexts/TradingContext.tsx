import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useTradingStore } from "../hooks/useTradingStore";

const BNB_INITIAL = 0.5;
const XAUT_INITIAL = 0;
const SPOT_USDT_INITIAL = 5_000;
const ETH_INITIAL = 0;
const TON_INITIAL = 0;

export type WalletTxType = "deposit" | "withdraw" | "swap" | "transfer" | "bonus";

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
  spotUsdtBalance: number;
  setSpotUsdtBalance: (v: number | ((prev: number) => number)) => void;
  ethBalance: number;
  setEthBalance: (v: number | ((prev: number) => number)) => void;
  tonBalance: number;
  setTonBalance: (v: number | ((prev: number) => number)) => void;
  transferToFutures: (amount: number) => { success: boolean; message: string };
  transferFromFutures: (amount: number) => { success: boolean; message: string };
  walletHistory: WalletTransaction[];
  addWalletTx: (tx: Omit<WalletTransaction, "id" | "timestamp" | "status">) => void;
  futuresBonus: number;
  addFuturesBonus: (amount: number) => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function TradingProvider({ children }: { children: ReactNode }) {
  const store = useTradingStore();
  const [bnbBalance, setBnbBalance] = useState(BNB_INITIAL);
  const [xautBalance, setXautBalance] = useState(XAUT_INITIAL);
  const [spotUsdtBalance, setSpotUsdtBalance] = useState(SPOT_USDT_INITIAL);
  const [ethBalance, setEthBalance] = useState(ETH_INITIAL);
  const [tonBalance, setTonBalance] = useState(TON_INITIAL);
  const [walletHistory, setWalletHistory] = useState<WalletTransaction[]>([]);
  const [futuresBonus, setFuturesBonus] = useState(0);

  const addWalletTx = useCallback((tx: Omit<WalletTransaction, "id" | "timestamp" | "status">) => {
    const entry: WalletTransaction = {
      ...tx,
      id: `wtx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      status: "completed",
    };
    setWalletHistory((prev) => [entry, ...prev]);
  }, []);

  const transferToFutures = useCallback(
    (amount: number): { success: boolean; message: string } => {
      if (amount <= 0) return { success: false, message: "Amount must be greater than 0" };
      if (amount > spotUsdtBalance) return { success: false, message: "Insufficient portfolio balance" };
      setSpotUsdtBalance((b) => parseFloat((b - amount).toFixed(5)));
      store.depositFunds(amount);
      addWalletTx({ type: "transfer", asset: "USDT", amount, toAsset: "USDT (Futures)", toAmount: amount });
      return { success: true, message: `Transferred $${amount.toFixed(2)} to Futures` };
    },
    [spotUsdtBalance, store, addWalletTx]
  );

  const transferFromFutures = useCallback(
    (amount: number): { success: boolean; message: string } => {
      if (amount <= 0) return { success: false, message: "Amount must be greater than 0" };
      if (amount > store.balance) return { success: false, message: "Insufficient futures balance" };
      const ok = store.withdrawFunds(amount, store.balance);
      if (!ok) return { success: false, message: "Insufficient futures balance" };
      setSpotUsdtBalance((b) => parseFloat((b + amount).toFixed(5)));
      addWalletTx({ type: "transfer", asset: "USDT (Futures)", amount, toAsset: "USDT", toAmount: amount });
      return { success: true, message: `Transferred $${amount.toFixed(2)} to Spot` };
    },
    [store, addWalletTx]
  );

  const addFuturesBonus = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      setFuturesBonus((prev) => parseFloat((prev + amount).toFixed(5)));
      addWalletTx({ type: "bonus", asset: "USDT", amount });
    },
    [addWalletTx]
  );

  return (
    <TradingContext.Provider value={{
      ...store,
      bnbBalance, setBnbBalance,
      xautBalance, setXautBalance,
      spotUsdtBalance, setSpotUsdtBalance,
      ethBalance, setEthBalance,
      tonBalance, setTonBalance,
      transferToFutures,
      transferFromFutures,
      walletHistory, addWalletTx,
      futuresBonus, addFuturesBonus,
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
