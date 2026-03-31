import { useState, useCallback } from "react";

export interface Position {
  id: string;
  side: "long" | "short";
  notional: number;        // position size in USDC (= margin × leverage)
  margin: number;          // collateral posted
  entryPrice: number;
  leverage: number;
  marginMode: "Cross" | "Isolated";
  liquidationPrice: number;
  sl?: number;
  tp?: number;
  openTime: number;
}

export interface ClosedTrade {
  id: string;
  side: "long" | "short";
  notional: number;
  entryPrice: number;
  closePrice: number;
  pnl: number;
  margin: number;
  leverage: number;
  openTime: number;
  closeTime: number;
}

const INITIAL_BALANCE = 10_000;
const MMR = 0.005; // 0.5% maintenance margin rate (standard for BTC futures)

/**
 * Liquidation price — mirrors real futures exchange logic.
 *
 * The position is liquidated when:
 *   unrealised PnL + collateral = maintenance margin
 *
 * Cross  Long  → Liq = Entry × (N − W) / (N × (1 − MMR))
 * Cross  Short → Liq = Entry × (N + W) / (N × (1 + MMR))
 * Isol.  Long  → same as cross but collateral = margin (= N / leverage)
 * Isol.  Short → same as cross but collateral = margin
 *
 * where N = positionNotional, W = wallet/margin used.
 *
 * If Liq ≤ 0 for a long (collateral > notional), the account can absorb any
 * loss before the price reaches 0 — show "No Liq." in the UI.
 */
function calcLiqPrice(
  side: "long" | "short",
  entryPrice: number,
  notional: number,
  margin: number,
  marginMode: "Cross" | "Isolated",
  walletBalance: number
): number {
  const collateral = marginMode === "Cross" ? walletBalance : margin;

  if (side === "long") {
    const liq = (entryPrice * (notional - collateral)) / (notional * (1 - MMR));
    return Math.max(liq, 0);
  } else {
    return (entryPrice * (notional + collateral)) / (notional * (1 + MMR));
  }
}

export function useTradingStore() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  /**
   * @param margin    – collateral to post (USDC)
   * @param price     – current mark price
   * @param leverage  – chosen leverage
   * @param marginMode
   * @param sl / tp   – optional stop loss / take profit prices
   * @param currentBalance – passed from UI to avoid stale closure
   */
  const openPosition = useCallback(
    (
      side: "long" | "short",
      margin: number,
      price: number,
      leverage: number,
      marginMode: "Cross" | "Isolated",
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;

      if (margin <= 0)      return { success: false, message: "Enter a margin amount greater than 0" };
      if (margin < 1)       return { success: false, message: "Minimum margin is $1" };
      if (margin > avail)   return { success: false, message: `Insufficient balance. Need $${margin.toFixed(2)}` };

      const notional = margin * leverage;
      const liquidationPrice = calcLiqPrice(side, price, notional, margin, marginMode, avail);

      const pos: Position = {
        id: Date.now().toString(),
        side,
        notional,
        margin,
        entryPrice: price,
        leverage,
        marginMode,
        liquidationPrice,
        sl: sl && sl > 0 ? sl : undefined,
        tp: tp && tp > 0 ? tp : undefined,
        openTime: Date.now(),
      };

      setBalance((b) => parseFloat((b - margin).toFixed(2)));
      setPositions((prev) => [...prev, pos]);
      return { success: true, message: "Position opened" };
    },
    []
  );

  const closePosition = useCallback((positionId: string, currentPrice: number) => {
    setPositions((prev) => {
      const pos = prev.find((p) => p.id === positionId);
      if (!pos) return prev;

      const priceDiff = currentPrice - pos.entryPrice;
      const pnl =
        pos.side === "long"
          ? (priceDiff / pos.entryPrice) * pos.notional
          : (-priceDiff / pos.entryPrice) * pos.notional;

      const returned = pos.margin + pnl;
      setBalance((b) => parseFloat((b + Math.max(returned, 0)).toFixed(2)));

      setHistory((h) => [
        {
          id: pos.id,
          side: pos.side,
          notional: pos.notional,
          entryPrice: pos.entryPrice,
          closePrice: currentPrice,
          pnl,
          margin: pos.margin,
          leverage: pos.leverage,
          openTime: pos.openTime,
          closeTime: Date.now(),
        },
        ...h,
      ]);

      return prev.filter((p) => p.id !== positionId);
    });
  }, []);

  const updateSlTp = useCallback((positionId: string, sl?: number, tp?: number) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId
          ? { ...p, sl: sl && sl > 0 ? sl : undefined, tp: tp && tp > 0 ? tp : undefined }
          : p
      )
    );
  }, []);

  const getPnl = useCallback((pos: Position, currentPrice: number): number => {
    const priceDiff = currentPrice - pos.entryPrice;
    return pos.side === "long"
      ? (priceDiff / pos.entryPrice) * pos.notional
      : (-priceDiff / pos.entryPrice) * pos.notional;
  }, []);

  return { balance, positions, history, openPosition, closePosition, updateSlTp, getPnl };
}
