import { useState, useCallback } from "react";

export const TAKER_FEE = 0.0004; // 0.04%
export const MAKER_FEE = 0.0002; // 0.02%

export interface Position {
  id: string;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  notional: number;
  margin: number;
  openingFee: number;
  entryPrice: number;
  leverage: number;
  marginMode: "Cross" | "Isolated";
  liquidationPrice: number;
  sl?: number;
  tp?: number;
  limitClosePrice?: number; // for limit-close orders
  openTime: number;
}

export interface PendingOrder {
  id: string;
  side: "long" | "short";
  requestedMargin: number;
  limitPrice: number;
  leverage: number;
  stepSize: number;
  sl?: number;
  tp?: number;
  createdAt: number;
}

export interface ClosedTrade {
  id: string;
  side: "long" | "short";
  quantity: number;
  notional: number;
  entryPrice: number;
  closePrice: number;
  rawPnl: number;
  openingFee: number;
  closingFee: number;
  pnl: number;
  margin: number;
  leverage: number;
  openTime: number;
  closeTime: number;
}

export const INITIAL_BALANCE = 10_000;

export const LEVERAGE_MAX_NOTIONAL: Record<number, number> = {
  150:   200_000,
  100:   500_000,
   75:   750_000,
   50: 2_000_000,
   25: 5_000_000,
   10:10_000_000,
};

const NOTIONAL_MMR_TIERS: { upTo: number; mmr: number; mmAmount: number }[] = [
  { upTo:    50_000, mmr: 0.004,  mmAmount:       0 },
  { upTo:   250_000, mmr: 0.005,  mmAmount:      50 },
  { upTo:   500_000, mmr: 0.010,  mmAmount:   1_300 },
  { upTo: 1_000_000, mmr: 0.0125, mmAmount:   2_550 },
  { upTo: 2_000_000, mmr: 0.015,  mmAmount:   5_050 },
  { upTo: 5_000_000, mmr: 0.025,  mmAmount:  25_050 },
  { upTo:10_000_000, mmr: 0.050,  mmAmount: 150_050 },
  { upTo: Infinity,  mmr: 0.100,  mmAmount: 650_050 },
];

export function getMmrTier(notional: number): { mmr: number; mmAmount: number } {
  return NOTIONAL_MMR_TIERS.find((t) => notional <= t.upTo) ?? { mmr: 0.1, mmAmount: 650_050 };
}

export function getMmr(notional: number): number {
  return getMmrTier(notional).mmr;
}

export function getMaxNotional(leverage: number): number {
  return LEVERAGE_MAX_NOTIONAL[leverage] ?? 500_000;
}

export function calcEffectivePosition(
  requestedMargin: number,
  leverage: number,
  entryPrice = 0,
  stepSize = 0,
  feeRate: number = TAKER_FEE
): {
  quantity: number;
  notional: number;
  margin: number;
  openingFee: number;
  totalCost: number;
} {
  const maxNotional = getMaxNotional(leverage);
  const desiredNotional = Math.min(requestedMargin * leverage, maxNotional);

  let quantity: number;
  let notional: number;

  if (entryPrice > 0 && stepSize > 0) {
    const desiredQty = desiredNotional / entryPrice;
    quantity = Math.floor(desiredQty / stepSize) * stepSize;
    quantity = parseFloat(quantity.toFixed(8));
    notional = quantity * entryPrice;
  } else {
    notional = desiredNotional;
    quantity = entryPrice > 0 ? notional / entryPrice : 0;
  }

  const margin = notional / leverage;
  const openingFee = notional * feeRate;
  const totalCost = margin + openingFee;

  return { quantity, notional, margin, openingFee, totalCost };
}

export function calcMaxMarginForBalance(
  availableBalance: number,
  leverage: number,
  entryPrice: number,
  stepSize: number,
  feeRate: number = TAKER_FEE
): number {
  if (availableBalance <= 0 || entryPrice <= 0) return 0;
  const maxCost = availableBalance;
  const rawMargin = maxCost / (1 + leverage * feeRate);
  const { margin } = calcEffectivePosition(rawMargin, leverage, entryPrice, stepSize, feeRate);
  return margin;
}

export function calcLiqPrice(
  side: "long" | "short",
  entryPrice: number,
  notional: number,
  _margin: number,
  _marginMode: "Cross" | "Isolated",
  walletBalance: number
): number {
  if (notional <= 0 || entryPrice <= 0 || walletBalance <= 0) return 0;
  const { mmr, mmAmount } = getMmrTier(notional);

  if (side === "long") {
    const liq = entryPrice * (1 + mmr + (mmAmount - walletBalance) / notional);
    return Math.max(liq, 0);
  } else {
    const liq = entryPrice * (1 - mmr + (walletBalance - mmAmount) / notional);
    return Math.max(liq, 0);
  }
}

export function computeWalletBalance(freeBalance: number, positions: Position[]): number {
  const totalMargins = positions.reduce((sum, p) => sum + p.margin, 0);
  return freeBalance + totalMargins;
}

export function computeDynamicLiqPrice(
  pos: Position,
  freeBalance: number,
  allPositions: Position[]
): number {
  const W = computeWalletBalance(freeBalance, allPositions);
  return calcLiqPrice(pos.side, pos.entryPrice, pos.notional, pos.margin, "Cross", W);
}

export function computeRiskPercent(
  pos: Position,
  currentPrice: number,
  dynamicLiqPrice: number
): number | null {
  if (dynamicLiqPrice <= 0) return null;

  if (pos.side === "long") {
    const total = pos.entryPrice - dynamicLiqPrice;
    if (total <= 0) return null;
    const consumed = pos.entryPrice - currentPrice;
    return Math.min(Math.max((consumed / total) * 100, 0), 100);
  } else {
    const total = dynamicLiqPrice - pos.entryPrice;
    if (total <= 0) return null;
    const consumed = currentPrice - pos.entryPrice;
    return Math.min(Math.max((consumed / total) * 100, 0), 100);
  }
}

export type TriggerReason = "liquidation" | "sl" | "tp" | "limit_close";

export function useTradingStore() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  const _executeOpen = useCallback(
    (
      side: "long" | "short",
      symbol: string,
      requestedMargin: number,
      price: number,
      leverage: number,
      stepSize: number,
      feeRate: number,
      sl?: number,
      tp?: number,
      currentBalance?: number,
      currentPositions?: Position[]
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;
      const existingPositions = currentPositions ?? [];

      if (requestedMargin <= 0) return { success: false, message: "Enter a margin amount greater than 0" };
      if (price <= 0) return { success: false, message: "Invalid entry price" };

      const { quantity, notional, margin, openingFee, totalCost } =
        calcEffectivePosition(requestedMargin, leverage, price, stepSize, feeRate);

      if (quantity <= 0 || notional <= 0) return { success: false, message: "Order size too small for minimum lot" };
      if (totalCost > avail) return { success: false, message: `Insufficient balance. Need $${totalCost.toFixed(2)}` };

      const existingMargins = existingPositions.reduce((s, p) => s + p.margin, 0);
      const W = (avail - totalCost) + existingMargins + margin;

      const liquidationPrice = calcLiqPrice(side, price, notional, margin, "Cross", W);

      const pos: Position = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        symbol,
        side,
        quantity,
        notional,
        margin,
        openingFee,
        entryPrice: price,
        leverage,
        marginMode: "Cross",
        liquidationPrice,
        sl: sl && sl > 0 ? sl : undefined,
        tp: tp && tp > 0 ? tp : undefined,
        openTime: Date.now(),
      };

      setBalance((b) => parseFloat((b - totalCost).toFixed(5)));
      setPositions((prev) => [...prev, pos]);
      return { success: true, message: "Position opened" };
    },
    []
  );

  const openPosition = useCallback(
    (
      side: "long" | "short",
      symbol: string,
      requestedMargin: number,
      price: number,
      leverage: number,
      stepSize: number,
      _marginMode: "Cross" | "Isolated",
      sl?: number,
      tp?: number,
      currentBalance?: number,
      currentPositions?: Position[]
    ): { success: boolean; message: string } => {
      return _executeOpen(side, requestedMargin, price, leverage, stepSize, TAKER_FEE, sl, tp, currentBalance, currentPositions);
    },
    [_executeOpen]
  );

  const placeLimitOrder = useCallback(
    (
      side: "long" | "short",
      requestedMargin: number,
      limitPrice: number,
      leverage: number,
      stepSize: number,
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;

      if (requestedMargin <= 0) return { success: false, message: "Enter a margin amount greater than 0" };
      if (limitPrice <= 0) return { success: false, message: "Invalid limit price" };

      const { totalCost } = calcEffectivePosition(requestedMargin, leverage, limitPrice, stepSize, MAKER_FEE);
      if (totalCost > avail) return { success: false, message: `Insufficient balance. Need $${totalCost.toFixed(2)}` };

      const order: PendingOrder = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        side,
        requestedMargin,
        limitPrice,
        leverage,
        stepSize,
        sl: sl && sl > 0 ? sl : undefined,
        tp: tp && tp > 0 ? tp : undefined,
        createdAt: Date.now(),
      };

      setPendingOrders((prev) => [...prev, order]);
      return { success: true, message: "Limit order placed" };
    },
    []
  );

  const cancelPendingOrder = useCallback((orderId: string) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  // Single-position mode: don't fill pending orders if a position is already open
  const checkPendingOrders = useCallback(
    (marketPrice: number, currentBalance: number) => {
      if (positions.length > 0) return; // block fill when position already exists

      setPendingOrders((prev) => {
        if (prev.length === 0) return prev;

        const toFill: PendingOrder[] = [];
        const remaining: PendingOrder[] = [];

        for (const order of prev) {
          const shouldFill =
            order.side === "long"
              ? marketPrice <= order.limitPrice
              : marketPrice >= order.limitPrice;
          if (shouldFill) toFill.push(order);
          else remaining.push(order);
        }

        if (toFill.length === 0) return prev;

        // Only fill the first eligible order (single-position mode)
        const order = toFill[0];
        const { quantity, notional, margin, openingFee, totalCost } =
          calcEffectivePosition(order.requestedMargin, order.leverage, order.limitPrice, order.stepSize, MAKER_FEE);

        if (quantity > 0 && totalCost <= currentBalance) {
          const W = currentBalance - openingFee;
          const liquidationPrice = calcLiqPrice(order.side, order.limitPrice, notional, margin, "Cross", W);

          const pos: Position = {
            id: order.id + "_filled",
            side: order.side,
            quantity,
            notional,
            margin,
            openingFee,
            entryPrice: order.limitPrice,
            leverage: order.leverage,
            marginMode: "Cross",
            liquidationPrice,
            sl: order.sl,
            tp: order.tp,
            openTime: Date.now(),
          };

          setPositions((p) => [...p, pos]);
          setBalance((b) => parseFloat((b - totalCost).toFixed(5)));
        }

        // Cancel all unfilled orders from this batch (single-position mode)
        return remaining.filter((o) => !toFill.includes(o)).concat(toFill.slice(1));
      });
    },
    [positions]
  );

  const closePosition = useCallback((positionId: string, closePrice: number, feeRate = TAKER_FEE) => {
    setPositions((prev) => {
      const pos = prev.find((p) => p.id === positionId);
      if (!pos) return prev;

      const rawPnl =
        pos.side === "long"
          ? (closePrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - closePrice) * pos.quantity;

      const closingNotional = pos.quantity * closePrice;
      const closingFee = closingNotional * feeRate;
      const netPnl = rawPnl - closingFee;
      const returned = pos.margin + netPnl;

      setBalance((b) => parseFloat((b + Math.max(returned, 0)).toFixed(5)));

      setHistory((h) => [
        {
          id: pos.id,
          side: pos.side,
          quantity: pos.quantity,
          notional: pos.notional,
          entryPrice: pos.entryPrice,
          closePrice,
          rawPnl,
          openingFee: pos.openingFee,
          closingFee,
          pnl: netPnl,
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

  const checkLiquidations = useCallback(
    (marketPrice: number): { id: string; reason: TriggerReason; closePrice: number }[] => {
      const result: { id: string; reason: TriggerReason; closePrice: number }[] = [];
      const W = computeWalletBalance(balance, positions);

      for (const pos of positions) {
        const liqPrice = calcLiqPrice(pos.side, pos.entryPrice, pos.notional, pos.margin, "Cross", W);

        if (pos.side === "long") {
          if (liqPrice > 0 && marketPrice <= liqPrice) {
            result.push({ id: pos.id, reason: "liquidation", closePrice: liqPrice });
          } else if (pos.sl && marketPrice <= pos.sl) {
            result.push({ id: pos.id, reason: "sl", closePrice: pos.sl });
          } else if (pos.tp && marketPrice >= pos.tp) {
            result.push({ id: pos.id, reason: "tp", closePrice: pos.tp });
          } else if (pos.limitClosePrice && marketPrice >= pos.limitClosePrice) {
            result.push({ id: pos.id, reason: "limit_close", closePrice: pos.limitClosePrice });
          }
        } else {
          if (liqPrice > 0 && marketPrice >= liqPrice) {
            result.push({ id: pos.id, reason: "liquidation", closePrice: liqPrice });
          } else if (pos.sl && marketPrice >= pos.sl) {
            result.push({ id: pos.id, reason: "sl", closePrice: pos.sl });
          } else if (pos.tp && marketPrice <= pos.tp) {
            result.push({ id: pos.id, reason: "tp", closePrice: pos.tp });
          } else if (pos.limitClosePrice && marketPrice <= pos.limitClosePrice) {
            result.push({ id: pos.id, reason: "limit_close", closePrice: pos.limitClosePrice });
          }
        }
      }
      return result;
    },
    [positions, balance]
  );

  const updateSlTp = useCallback((positionId: string, sl?: number, tp?: number) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId
          ? { ...p, sl: sl && sl > 0 ? sl : undefined, tp: tp && tp > 0 ? tp : undefined }
          : p
      )
    );
  }, []);

  const updateLimitClose = useCallback((positionId: string, price?: number) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId
          ? { ...p, limitClosePrice: price && price > 0 ? price : undefined }
          : p
      )
    );
  }, []);

  const getPnl = useCallback((pos: Position, currentPrice: number): number => {
    return pos.side === "long"
      ? (currentPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - currentPrice) * pos.quantity;
  }, []);

  const depositFunds = useCallback((amount: number) => {
    setBalance((b) => parseFloat((b + amount).toFixed(5)));
  }, []);

  const withdrawFunds = useCallback((amount: number, currentBalance: number): boolean => {
    if (amount > currentBalance) return false;
    setBalance((b) => parseFloat((b - amount).toFixed(5)));
    return true;
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
    checkLiquidations,
    closePosition,
    updateSlTp,
    updateLimitClose,
    getPnl,
    depositFunds,
    withdrawFunds,
  };
}
