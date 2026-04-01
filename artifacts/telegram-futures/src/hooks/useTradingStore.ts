import { useState, useCallback } from "react";

export const TAKER_FEE = 0.0004; // 0.04% — market orders & closing
export const MAKER_FEE = 0.0002; // 0.02% — limit orders

export interface Position {
  id: string;
  side: "long" | "short";
  quantity: number;        // base asset qty (e.g. BTC)
  notional: number;        // = quantity * entryPrice
  margin: number;          // initial margin = notional / leverage
  openingFee: number;      // fee paid at open
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
  pnl: number;       // net PnL = rawPnl - openingFee - closingFee
  margin: number;
  leverage: number;
  openTime: number;
  closeTime: number;
}

export const INITIAL_BALANCE = 10_000;

// Binance-style max notional per leverage tier
export const LEVERAGE_MAX_NOTIONAL: Record<number, number> = {
  100:   500_000,
   50: 2_000_000,
   25: 5_000_000,
   10:10_000_000,
};

// Maintenance Margin Rate tiers (Binance BTC perpetual)
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

/**
 * Calculate effective position size with lot size rounding.
 * Returns all position metrics including fees.
 *
 * @param requestedMargin  - User-input margin amount
 * @param leverage         - Selected leverage
 * @param entryPrice       - Entry price (needed for qty calculation)
 * @param stepSize         - Min lot size for the asset (e.g. 0.001 BTC)
 * @param feeRate          - Fee rate (TAKER_FEE for market, MAKER_FEE for limit)
 */
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
    // Round DOWN to minimum lot size — this causes the small balance remainder
    quantity = Math.floor(desiredQty / stepSize) * stepSize;
    // Clamp to 8 decimal places to avoid floating point drift
    quantity = parseFloat(quantity.toFixed(8));
    notional = quantity * entryPrice;
  } else {
    // Fallback (no price info yet)
    notional = desiredNotional;
    quantity = entryPrice > 0 ? notional / entryPrice : 0;
  }

  const margin = notional / leverage;
  const openingFee = notional * feeRate;
  const totalCost = margin + openingFee;

  return { quantity, notional, margin, openingFee, totalCost };
}

/**
 * Calculate max margin the user can enter such that totalCost ≤ available balance.
 * Returns the margin value rounded down to step-size precision.
 */
export function calcMaxMarginForBalance(
  availableBalance: number,
  leverage: number,
  entryPrice: number,
  stepSize: number,
  feeRate: number = TAKER_FEE
): number {
  if (availableBalance <= 0 || entryPrice <= 0) return 0;
  // cost = margin + margin * leverage * feeRate
  // cost = margin * (1 + leverage * feeRate)
  // margin = cost / (1 + leverage * feeRate)
  const maxCost = availableBalance;
  const rawMargin = maxCost / (1 + leverage * feeRate);
  const { margin } = calcEffectivePosition(rawMargin, leverage, entryPrice, stepSize, feeRate);
  return margin;
}

/**
 * Liquidation price for a single cross-margin position.
 *
 * Cross margin: wallet balance = free cash + locked margin of this position
 *               = (initial_balance - openingFee) at time of opening
 *
 * Liq condition: walletBalance + unrealizedPnL ≤ maintenanceMargin + maintenanceAmount
 *
 * Long  liq = entryPrice * (notional - walletBalance + mmAmount) / (notional * (1 - mmr))
 * Short liq = entryPrice * (notional + walletBalance - mmAmount) / (notional * (1 + mmr))
 */
export function calcLiqPrice(
  side: "long" | "short",
  entryPrice: number,
  notional: number,
  _margin: number,          // kept for API compat but unused
  _marginMode: "Cross" | "Isolated",
  walletBalance: number     // balance AFTER opening fee, BEFORE deducting margin
): number {
  if (notional <= 0 || entryPrice <= 0) return 0;
  const { mmr, mmAmount } = getMmrTier(notional);

  if (side === "long") {
    const liq = entryPrice * (notional - walletBalance + mmAmount) / (notional * (1 - mmr));
    return Math.max(liq, 0);
  } else {
    const liq = entryPrice * (notional + walletBalance - mmAmount) / (notional * (1 + mmr));
    return Math.max(liq, 0);
  }
}

export function useTradingStore() {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  /**
   * Internal: execute a position open.
   * Deducts totalCost (margin + openingFee) from balance.
   * Uses (balance - openingFee) as wallet balance for liq price calculation
   * since in cross margin the margin remains as collateral.
   */
  const _executeOpen = useCallback(
    (
      side: "long" | "short",
      requestedMargin: number,
      price: number,
      leverage: number,
      stepSize: number,
      feeRate: number,
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;

      if (requestedMargin <= 0) return { success: false, message: "Enter a margin amount greater than 0" };
      if (price <= 0) return { success: false, message: "Invalid entry price" };

      const { quantity, notional, margin, openingFee, totalCost } =
        calcEffectivePosition(requestedMargin, leverage, price, stepSize, feeRate);

      if (quantity <= 0 || notional <= 0) return { success: false, message: "Order size too small for minimum lot" };
      if (totalCost > avail) return { success: false, message: `Insufficient balance. Need $${totalCost.toFixed(2)}` };

      // Wallet balance for liq formula = free cash after fee + locked margin
      // = (avail - totalCost) + margin = avail - openingFee
      const walletBalanceForLiq = avail - openingFee;

      const liquidationPrice = calcLiqPrice(side, price, notional, margin, "Cross", walletBalanceForLiq);

      const pos: Position = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
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

      // Deduct total cost (margin locked + fee consumed)
      setBalance((b) => parseFloat((b - totalCost).toFixed(5)));
      setPositions((prev) => [...prev, pos]);
      return { success: true, message: "Position opened" };
    },
    []
  );

  /**
   * Open a market order — executes immediately at current price.
   * Uses TAKER_FEE.
   */
  const openPosition = useCallback(
    (
      side: "long" | "short",
      requestedMargin: number,
      price: number,
      leverage: number,
      stepSize: number,
      _marginMode: "Cross" | "Isolated",
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      return _executeOpen(side, requestedMargin, price, leverage, stepSize, TAKER_FEE, sl, tp, currentBalance);
    },
    [_executeOpen]
  );

  /**
   * Place a limit order — queued, filled when price crosses limit.
   * Uses MAKER_FEE (limit orders are typically maker orders).
   *
   * Long  limit: fill when marketPrice ≤ limitPrice
   * Short limit: fill when marketPrice ≥ limitPrice
   */
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

  /**
   * Called on every price tick. Fills triggered limit orders.
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

          if (shouldFill) toFill.push(order);
          else remaining.push(order);
        }

        if (toFill.length === 0) return prev;

        let runningBalance = currentBalance;
        for (const order of toFill) {
          const { quantity, notional, margin, openingFee, totalCost } =
            calcEffectivePosition(order.requestedMargin, order.leverage, order.limitPrice, order.stepSize, MAKER_FEE);

          if (quantity <= 0 || totalCost > runningBalance) continue;

          const walletBalanceForLiq = runningBalance - openingFee;
          const liquidationPrice = calcLiqPrice(order.side, order.limitPrice, notional, margin, "Cross", walletBalanceForLiq);

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
          runningBalance -= totalCost;
        }

        return remaining;
      });
    },
    []
  );

  /**
   * Close a position at current market price.
   * Calculates closing fee (taker) on the closing notional.
   * Net PnL = raw PnL - closing fee (opening fee was already paid).
   * Returns: margin + raw PnL - closing fee (capped at 0 minimum).
   */
  const closePosition = useCallback((positionId: string, currentPrice: number) => {
    setPositions((prev) => {
      const pos = prev.find((p) => p.id === positionId);
      if (!pos) return prev;

      // Raw PnL = price change * quantity
      const rawPnl =
        pos.side === "long"
          ? (currentPrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - currentPrice) * pos.quantity;

      // Closing notional = qty * closePrice (not entry notional)
      const closingNotional = pos.quantity * currentPrice;
      const closingFee = closingNotional * TAKER_FEE;

      const netPnl = rawPnl - closingFee;

      // Balance gets back: margin + netPnl (minimum 0 — can't get back more than 0 if margin wiped)
      const returned = pos.margin + netPnl;
      setBalance((b) => parseFloat((b + Math.max(returned, 0)).toFixed(5)));

      setHistory((h) => [
        {
          id: pos.id,
          side: pos.side,
          quantity: pos.quantity,
          notional: pos.notional,
          entryPrice: pos.entryPrice,
          closePrice: currentPrice,
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

  /**
   * Check if any open position should be liquidated or SL/TP triggered.
   * Returns position IDs to be closed, and the reason.
   */
  const checkLiquidations = useCallback(
    (marketPrice: number): { id: string; reason: "liquidation" | "sl" | "tp" }[] => {
      const result: { id: string; reason: "liquidation" | "sl" | "tp" }[] = [];
      for (const pos of positions) {
        if (pos.side === "long") {
          if (pos.liquidationPrice > 0 && marketPrice <= pos.liquidationPrice) {
            result.push({ id: pos.id, reason: "liquidation" });
          } else if (pos.sl && marketPrice <= pos.sl) {
            result.push({ id: pos.id, reason: "sl" });
          } else if (pos.tp && marketPrice >= pos.tp) {
            result.push({ id: pos.id, reason: "tp" });
          }
        } else {
          if (pos.liquidationPrice > 0 && marketPrice >= pos.liquidationPrice) {
            result.push({ id: pos.id, reason: "liquidation" });
          } else if (pos.sl && marketPrice >= pos.sl) {
            result.push({ id: pos.id, reason: "sl" });
          } else if (pos.tp && marketPrice <= pos.tp) {
            result.push({ id: pos.id, reason: "tp" });
          }
        }
      }
      return result;
    },
    [positions]
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

  /**
   * Unrealized PnL for an open position (gross, before closing fee).
   */
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
    getPnl,
    depositFunds,
    withdrawFunds,
  };
}
