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
      marginMode: "Cross" | "Isolated"
    ): { success: boolean; message: string } => {
      const margin = size / leverage;

      if (size <= 0) return { success: false, message: "Enter an amount greater than 0" };
      if (margin > balance) return { success: false, message: `Insufficient balance. Need $${margin.toFixed(2)}` };

      const liqPricePct = 1 / leverage * 0.9;
      const liquidationPrice =
        side === "long"
          ? price * (1 - liqPricePct)
          : price * (1 + liqPricePct);

      const pos: Position = {
        id: Date.now().toString(),
        side,
        size,
        entryPrice: price,
        leverage,
        margin,
        marginMode,
        liquidationPrice,
        openTime: Date.now(),
      };

      setBalance((b) => parseFloat((b - margin).toFixed(2)));
      setPositions((prev) => [...prev, pos]);
      return { success: true, message: "Position opened" };
    },
    [balance]
  );

  const closePosition = useCallback(
    (positionId: string, currentPrice: number) => {
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
    },
    []
  );

  const getPnl = useCallback(
    (pos: Position, currentPrice: number): number => {
      const priceDiff = currentPrice - pos.entryPrice;
      return pos.side === "long"
        ? (priceDiff / pos.entryPrice) * pos.size
        : (-priceDiff / pos.entryPrice) * pos.size;
    },
    []
  );

  return { balance, positions, history, openPosition, closePosition, getPnl };
}
