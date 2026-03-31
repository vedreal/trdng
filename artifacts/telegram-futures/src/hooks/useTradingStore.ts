import { useState, useCallback } from "react";

export interface Position {
  id: string;
  side: "long" | "short";
  notional: number;
  margin: number;
  entryPrice: number;
  leverage: number;
  marginMode: "Cross" | "Isolated";
  liquidationPrice: number;
  sl?: number;
  tp?: number;
  openTime: number;
}

export interface PendingOrder {
  id: string;
  side: "long" | "short";
  requestedMargin: number;
  limitPrice: number;
  leverage: number;
  sl?: number;
  tp?: number;
  createdAt: number;
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

export const INITIAL_BALANCE = 10_000;

export const LEVERAGE_MAX_NOTIONAL: Record<number, number> = {
  200:   250_000,
  100:   500_000,
   50: 2_000_000,
};

const NOTIONAL_MMR_TIERS: { upTo: number; mmr: number }[] = [
  { upTo:   500_000, mmr: 0.005 },
  { upTo: 2_000_000, mmr: 0.010 },
  { upTo: 5_000_000, mmr: 0.015 },
  { upTo:10_000_000, mmr: 0.020 },
  { upTo: Infinity,  mmr: 0.025 },
];

export function getMmr(notional: number): number {
  return NOTIONAL_MMR_TIERS.find((t) => notional <= t.upTo)?.mmr ?? 0.025;
}

export function getMaxNotional(leverage: number): number {
  return LEVERAGE_MAX_NOTIONAL[leverage] ?? 50_000_000;
}

export function calcEffectivePosition(requestedMargin: number, leverage: number) {
  const maxNotional = getMaxNotional(leverage);
  const requestedNotional = requestedMargin * leverage;
  const notional = Math.min(requestedNotional, maxNotional);
  const margin = notional / leverage;
  return { notional, margin };
}

export function calcLiqPrice(
  side: "long" | "short",
  entryPrice: number,
  notional: number,
  margin: number,
  marginMode: "Cross" | "Isolated",
  walletBalance: number
): number {
  const collateral = marginMode === "Cross" ? walletBalance : margin;
  const mmr = getMmr(notional);

  if (side === "long") {
    const liq = (notional - collateral) * entryPrice / (notional * (1 - mmr));
    return Math.max(liq, 0);
  } else {
    return (notional + collateral) * entryPrice / (notional * (1 + mmr));
  }
}

export function useTradingStore() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  // Internal: execute a position open (used for market orders and triggered limit orders)
  const _executeOpen = useCallback(
    (
      side: "long" | "short",
      requestedMargin: number,
      price: number,
      leverage: number,
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;

      if (requestedMargin <= 0) return { success: false, message: "Enter a margin amount greater than 0" };
      if (requestedMargin < 1)  return { success: false, message: "Minimum margin is $1" };
      if (requestedMargin > avail) return { success: false, message: `Insufficient balance. Need $${requestedMargin.toFixed(2)}` };

      const { notional, margin } = calcEffectivePosition(requestedMargin, leverage);
      const liquidationPrice = calcLiqPrice(side, price, notional, margin, "Cross", avail);

      const pos: Position = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        side,
        notional,
        margin,
        entryPrice: price,
        leverage,
        marginMode: "Cross",
        liquidationPrice,
        sl: sl && sl > 0 ? sl : undefined,
        tp: tp && tp > 0 ? tp : undefined,
        openTime: Date.now(),
      };

      setBalance((b) => parseFloat((b - margin).toFixed(5)));
      setPositions((prev) => [...prev, pos]);
      return { success: true, message: "Position opened" };
    },
    []
  );

  /**
   * Open a market order — executes immediately at current price.
   */
  const openPosition = useCallback(
    (
      side: "long" | "short",
      requestedMargin: number,
      price: number,
      leverage: number,
      _marginMode: "Cross" | "Isolated",
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      return _executeOpen(side, requestedMargin, price, leverage, sl, tp, currentBalance);
    },
    [_executeOpen]
  );

  /**
   * Place a limit order — goes into pendingOrders queue.
   * Will be triggered when market price crosses the limit price.
   *
   * Trigger conditions:
   *   Long  (buy):  triggered when market price FALLS TO or BELOW limitPrice
   *   Short (sell): triggered when market price RISES TO or ABOVE limitPrice
   */
  const placeLimitOrder = useCallback(
    (
      side: "long" | "short",
      requestedMargin: number,
      limitPrice: number,
      leverage: number,
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;

      if (requestedMargin <= 0) return { success: false, message: "Enter a margin amount greater than 0" };
      if (requestedMargin < 1)  return { success: false, message: "Minimum margin is $1" };
      if (requestedMargin > avail) return { success: false, message: `Insufficient balance. Need $${requestedMargin.toFixed(2)}` };
      if (limitPrice <= 0) return { success: false, message: "Invalid limit price" };

      const order: PendingOrder = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        side,
        requestedMargin,
        limitPrice,
        leverage,
        sl: sl && sl > 0 ? sl : undefined,
        tp: tp && tp > 0 ? tp : undefined,
        createdAt: Date.now(),
      };

      setPendingOrders((prev) => [...prev, order]);
      return { success: true, message: "Limit order placed" };
    },
    []
  );

  /**
   * Cancel a pending limit order (returns margin to balance — balance not locked in
   * this simplified implementation since we check balance at fill time).
   */
  const cancelPendingOrder = useCallback((orderId: string) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  /**
   * Called on every price tick from the UI.
   * Checks if any pending limit orders should be filled at the current market price.
   *
   * Long  limit: fill when marketPrice <= limitPrice  (price dropped to our buy target)
   * Short limit: fill when marketPrice >= limitPrice  (price rose to our sell target)
   */
  const checkPendingOrders = useCallback(
    (marketPrice: number, currentBalance: number) => {
      setPendingOrders((prev) => {
        if (prev.length === 0) return prev;

        const toFill: PendingOrder[] = [];
        const remaining: PendingOrder[] = [];

        for (const order of prev) {
          const shouldFill =
            order.side === "long"
              ? marketPrice <= order.limitPrice
              : marketPrice >= order.limitPrice;

          if (shouldFill) {
            toFill.push(order);
          } else {
            remaining.push(order);
          }
        }

        if (toFill.length === 0) return prev;

        // Execute each triggered order sequentially (balance updated per fill)
        let runningBalance = currentBalance;
        for (const order of toFill) {
          if (order.requestedMargin <= runningBalance) {
            const { notional, margin } = calcEffectivePosition(order.requestedMargin, order.leverage);
            const liquidationPrice = calcLiqPrice(order.side, order.limitPrice, notional, margin, "Cross", runningBalance);

            const pos: Position = {
              id: order.id + "_filled",
              side: order.side,
              notional,
              margin,
              entryPrice: order.limitPrice,
              leverage: order.leverage,
              marginMode: "Cross",
              liquidationPrice,
              sl: order.sl,
              tp: order.tp,
              openTime: Date.now(),
            };

            setPositions((p) => [...p, pos]);
            setBalance((b) => parseFloat((b - margin).toFixed(5)));
            runningBalance -= margin;
          }
        }

        return remaining;
      });
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
      setBalance((b) => parseFloat((b + Math.max(returned, 0)).toFixed(5)));

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

  return {
    balance,
    positions,
    pendingOrders,
    history,
    openPosition,
    placeLimitOrder,
    cancelPendingOrder,
    checkPendingOrders,
    closePosition,
    updateSlTp,
    getPnl,
  };
}
