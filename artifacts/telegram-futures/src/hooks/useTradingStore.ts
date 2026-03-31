import { useState, useCallback } from "react";

export interface Position {
  id: string;
  side: "long" | "short";
  notional: number;        // position size in USDC (= margin × leverage)
  margin: number;          // collateral posted (cost)
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

export const INITIAL_BALANCE = 10_000;

/**
 * Max notional (position size in USDC) allowed per leverage level.
 * Mirrors bracket system used by real perpetual futures exchanges.
 */
export const LEVERAGE_MAX_NOTIONAL: Record<number, number> = {
  200:    50_000,
  100:   500_000,
   50: 2_000_000,
   25: 5_000_000,
   20: 10_000_000,
   10: 50_000_000,
};

/**
 * Maintenance Margin Rate (MMR) tiers by notional value.
 * The larger the position, the higher the MMR.
 */
const NOTIONAL_MMR_TIERS: { threshold: number; mmr: number }[] = [
  { threshold:        0, mmr: 0.005  }, // 0–500k  → 0.5%
  { threshold:  500_000, mmr: 0.010  }, // 500k–2M → 1.0%
  { threshold: 2_000_000, mmr: 0.015 }, // 2M–5M   → 1.5%
  { threshold: 5_000_000, mmr: 0.020 }, // 5M–10M  → 2.0%
  { threshold: 10_000_000, mmr: 0.025 },// 10M+    → 2.5%
];

/** Get the applicable MMR for a given notional position size */
export function getMmr(notional: number): number {
  let mmr = NOTIONAL_MMR_TIERS[0].mmr;
  for (const tier of NOTIONAL_MMR_TIERS) {
    if (notional >= tier.threshold) {
      mmr = tier.mmr;
    } else {
      break;
    }
  }
  return mmr;
}

/** Get the max allowed notional for the chosen leverage */
export function getMaxNotional(leverage: number): number {
  return LEVERAGE_MAX_NOTIONAL[leverage] ?? 50_000_000;
}

/**
 * Calculate the effective (capped) notional and margin given user inputs.
 *
 * @param requestedMargin  - raw margin the user wants to use
 * @param leverage         - chosen leverage
 * @returns { notional, margin } both capped by the leverage tier limit
 */
export function calcEffectivePosition(requestedMargin: number, leverage: number) {
  const maxNotional = getMaxNotional(leverage);
  const requestedNotional = requestedMargin * leverage;
  const notional = Math.min(requestedNotional, maxNotional);
  const margin = notional / leverage;   // cost (may be less than requestedMargin if capped)
  return { notional, margin };
}

/**
 * Liquidation price — verified against real exchange screenshots.
 *
 * At liquidation the account equity equals the maintenance margin requirement:
 *   collateral + unrealised_pnl = MMR × notional_at_liq
 *
 * Solving for liq_price:
 *   Long  → liq = (notional - collateral) × entry / (notional × (1 − MMR))
 *   Short → liq = (notional + collateral) × entry / (notional × (1 + MMR))
 *
 * Cross margin: collateral = full wallet balance (WB)
 * Isolated margin: collateral = position margin only
 *
 * MMR is tiered by notional size (see getMmr).
 */
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
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  /**
   * Open a new position.
   * @param requestedMargin  - collateral the user wants to use (may be reduced by tier cap)
   * @param price            - current mark/entry price
   * @param leverage         - chosen leverage
   * @param marginMode       - Cross or Isolated
   * @param sl / tp          - optional stop-loss / take-profit prices
   * @param currentBalance   - passed from UI to avoid stale closure
   */
  const openPosition = useCallback(
    (
      side: "long" | "short",
      requestedMargin: number,
      price: number,
      leverage: number,
      marginMode: "Cross" | "Isolated",
      sl?: number,
      tp?: number,
      currentBalance?: number
    ): { success: boolean; message: string } => {
      const avail = currentBalance ?? INITIAL_BALANCE;

      if (requestedMargin <= 0) return { success: false, message: "Enter a margin amount greater than 0" };
      if (requestedMargin < 1)  return { success: false, message: "Minimum margin is $1" };
      if (requestedMargin > avail) return { success: false, message: `Insufficient balance. Need $${requestedMargin.toFixed(2)}` };

      const { notional, margin } = calcEffectivePosition(requestedMargin, leverage);

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

      setBalance((b) => parseFloat((b - margin).toFixed(5)));
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

  return { balance, positions, history, openPosition, closePosition, updateSlTp, getPnl };
}
