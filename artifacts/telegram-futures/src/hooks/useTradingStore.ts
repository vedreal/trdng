import { useState, useCallback } from "react";

export interface Position {
  id: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  leverage: number;
  margin: number;
  marginMode: "Cross" | "Isolated";
  liquidationPrice: number;
  sl?: number;
  tp?: number;
  openTime: number;
}

export interface ClosedTrade {
  id: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  closePrice: number;
  pnl: number;
  margin: number;
  leverage: number;
  openTime: number;
  closeTime: number;
}

const INITIAL_BALANCE = 10000;
const MMR = 0.005; // 0.5% maintenance margin rate

/**
 * Calculate liquidation price.
 *
 * Cross margin: the full wallet balance backs the position, so liq is
 * much further away — (balance / size) drives the distance.
 *
 * Isolated margin: only the assigned margin backs the position,
 * so liq ≈ entry ± margin/size × entry.
 */
function calcLiqPrice(
  side: "long" | "short",
  entryPrice: number,
  size: number,
  margin: number,
  marginMode: "Cross" | "Isolated",
  balance: number
): number {
  const collateral = marginMode === "Cross" ? balance : margin;
  // Effective distance before liquidation = collateral minus maintenance reserve
  const effectiveCollateral = Math.max(collateral - size * MMR, collateral * 0.01);
  const distancePct = effectiveCollateral / size; // fraction of entry price

  if (side === "long") {
    return Math.max(entryPrice * (1 - distancePct), 0);
  } else {
    return entryPrice * (1 + distancePct);
  }
}

export function useTradingStore() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  const openPosition = useCallback(
    (
      side: "long" | "short",
      size: number,
      price: number,
      leverage: number,
      marginMode: "Cross" | "Isolated",
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;
      const margin = size / leverage;

      if (size <= 0) return { success: false, message: "Enter an amount greater than 0" };
      if (size < 1)  return { success: false, message: "Minimum order size is $1" };
      if (margin > avail) return { success: false, message: `Insufficient balance. Need $${margin.toFixed(2)}` };

      const liquidationPrice = calcLiqPrice(side, price, size, margin, marginMode, avail);

      const pos: Position = {
        id: Date.now().toString(),
        side,
        size,
        entryPrice: price,
        leverage,
        margin,
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
          ? (priceDiff / pos.entryPrice) * pos.size
          : (-priceDiff / pos.entryPrice) * pos.size;

      const returned = pos.margin + pnl;
      setBalance((b) => parseFloat((b + Math.max(returned, 0)).toFixed(2)));

      setHistory((h) => [
        {
          id: pos.id,
          side: pos.side,
          size: pos.size,
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

  const updateSlTp = useCallback(
    (positionId: string, sl?: number, tp?: number) => {
      setPositions((prev) =>
        prev.map((p) =>
          p.id === positionId
            ? { ...p, sl: sl && sl > 0 ? sl : undefined, tp: tp && tp > 0 ? tp : undefined }
            : p
        )
      );
    },
    []
  );

  const getPnl = useCallback((pos: Position, currentPrice: number): number => {
    const priceDiff = currentPrice - pos.entryPrice;
    return pos.side === "long"
      ? (priceDiff / pos.entryPrice) * pos.size
      : (-priceDiff / pos.entryPrice) * pos.size;
  }, []);

  return { balance, positions, history, openPosition, closePosition, updateSlTp, getPnl };
}
