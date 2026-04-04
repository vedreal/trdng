import { useState, useCallback, useEffect } from "react";
import { IconX, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useBinancePrice, type CandleData } from "../hooks/useBinancePrice";
import {
  type Position,
  type ClosedTrade,
  calcLiqPrice,
  computeDynamicLiqPrice,
  calcEffectivePosition,
  calcMaxMarginForBalance,
  getMaxNotional,
  TAKER_FEE,
  MAKER_FEE,
} from "../hooks/useTradingStore";
import { useTrading } from "../contexts/TradingContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { CandleChart } from "../components/CandleChart";

type OrderType = "limit" | "market";
type TabType = "position" | "orders" | "history";

const PAIR_LEVERAGE_OPTIONS: Record<string, number[]> = {
  BTCUSDT: [50, 100, 150],
  ETHUSDT: [50, 75, 100],
  BNBUSDT: [50, 75, 100],
  SOLUSDT: [50, 75, 100],
};
const SLIDER_MARKS = [0, 25, 50, 75, 100];

const INTERVALS = [
  { label: "5m", value: "5m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
];

const IPFS = "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/";

interface TradingPair {
  symbol: string;
  label: string;
  base: string;
  icon: string;
  fallback: number;
  priceDec: number;
  stepSize: number;   // minimum lot size for this asset
}

const TRADING_PAIRS: TradingPair[] = [
  {
    symbol: "BTCUSDT", label: "BTC/USDT", base: "BTC",
    icon: IPFS + "bafkreih4mag7tt75x3lxxcgg6tx5wsitcdypqti3fvmdq6kyypcb5fieoy",
    fallback: 67000, priceDec: 0, stepSize: 0.001,
  },
  {
    symbol: "ETHUSDT", label: "ETH/USDT", base: "ETH",
    icon: IPFS + "bafkreiccdvf3jvs2kngcddhe6siaca44y3ztru254dor3vocue36gbplw4",
    fallback: 3500, priceDec: 2, stepSize: 0.01,
  },
  {
    symbol: "BNBUSDT", label: "BNB/USDT", base: "BNB",
    icon: IPFS + "bafkreieg2zkdn3muod7uir7q77lee37cmisxoqqym3sjsm6smfn5wkq2da",
    fallback: 600, priceDec: 2, stepSize: 0.01,
  },
  {
    symbol: "SOLUSDT", label: "SOL/USDT", base: "SOL",
    icon: IPFS + "bafybeidzzeeg4wfk744pzux4vq7isrhta6gz2w4wfo2psxtggklp4ioupa",
    fallback: 180, priceDec: 2, stepSize: 0.1,
  },
];

function fmtPrice(n: number, dec: number): string {
  if (n <= 0) return "...";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(3) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return fmt(n, 2);
}

function fmtQty(qty: number, stepSize: number): string {
  const dec = stepSize < 0.01 ? 3 : stepSize < 1 ? 2 : 0;
  return qty.toFixed(dec);
}

// ── Mini Sparkline ─────────────────────────────────────────────────
function MiniSparkline({ candles, positive }: { candles: CandleData[]; positive: boolean }) {
  const pts = candles.slice(-24);
  if (pts.length < 2) return <div style={{ width: 64, height: 32 }} />;
  const closes = pts.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const W = 64, H = 32;
  const points = closes
    .map((v, i) => {
      const x = (i / (closes.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Pair Picker Row ────────────────────────────────────────────────
function PairPickerRow({ pair, isSelected, onSelect }: {
  pair: TradingPair;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { price, priceChangePercent, candles } = useBinancePrice(pair.symbol);
  const positive = priceChangePercent >= 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
        isSelected ? "bg-[#F5E9B8]" : "hover:bg-[#F0EED8] active:bg-[#EEE8C8]"
      }`}
    >
      <img src={pair.icon} alt={pair.base} className="w-9 h-9 rounded-full flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-bold text-[#1A1A1A]">{pair.label}</p>
        <p className={`text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
          {positive ? "+" : ""}{priceChangePercent.toFixed(2)}%
        </p>
      </div>
      <MiniSparkline candles={candles} positive={positive} />
      <div className="text-right flex-shrink-0 ml-1">
        <p className="text-sm font-bold text-[#1A1A1A]">
          {price > 0 ? fmtPrice(price, pair.priceDec) : "..."}
        </p>
        {isSelected && (
          <p className="text-[10px] font-semibold text-[#C9A227]">Selected</p>
        )}
      </div>
    </button>
  );
}

// ── Pair Picker Modal ─────────────────────────────────────────────
function PairPickerModal({ selectedSymbol, onSelect, onClose }: {
  selectedSymbol: string;
  onSelect: (pair: TradingPair) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end modal-enter" onClick={onClose}>
      <div className="w-full rounded-t-2xl max-w-md mx-auto panel-silver border-t border-[#D4AF37] overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D8D0A8]">
          <span className="font-bold text-[#1A1A1A]">Select Trading Pair</span>
          <button onClick={onClose} className="text-[#888888]">
            <IconX size={20} stroke={2.5} />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "55vh", paddingBottom: "96px" }}>
          {TRADING_PAIRS.map((pair, idx) => (
            <div key={pair.symbol}>
              {idx > 0 && <div className="border-t border-[#EEEAD8] mx-4" />}
              <PairPickerRow
                pair={pair}
                isSelected={pair.symbol === selectedSymbol}
                onSelect={() => { onSelect(pair); onClose(); }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SL/TP Edit Modal ──────────────────────────────────────────────
function SlTpModal({
  pos, onSave, onClose,
}: {
  pos: Position;
  onSave: (sl?: number, tp?: number) => void;
  onClose: () => void;
}) {
  const [sl, setSl] = useState(pos.sl?.toString() ?? "");
  const [tp, setTp] = useState(pos.tp?.toString() ?? "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end modal-enter" onClick={onClose}>
      <div className="w-full rounded-t-2xl p-5 pb-28 max-w-md mx-auto panel-silver border-t border-[#D4AF37]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-[#1A1A1A]">Edit SL / TP</span>
          <button onClick={onClose} className="text-[#888888]">
            <IconX size={20} stroke={2.5} />
          </button>
        </div>
        <p className="text-xs text-[#888888] mb-3">
          Entry&nbsp;<span className="font-medium text-[#444444]">${fmt(pos.entryPrice, 1)}</span>
          &nbsp;·&nbsp;
          <span className={pos.side === "long" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
            {pos.side === "long" ? "Long" : "Short"} {pos.leverage}x
          </span>
        </p>
        <div className="mb-4">
          <label className="text-xs font-medium text-[#666666] mb-1 block">
            Stop Loss — <span className="text-[#888888] font-normal">{pos.side === "long" ? "below" : "above"} entry</span>
          </label>
          <div className="rounded-xl border border-red-200 flex items-center px-4 py-3 bg-[#F8F0F0]">
            <input type="number" value={sl} onChange={(e) => setSl(e.target.value)}
              placeholder="0.00" className="flex-1 text-sm font-medium text-[#333333] bg-transparent outline-none" />
            <span className="text-sm text-[#888888] ml-2">USDT</span>
          </div>
        </div>
        <div className="mb-5">
          <label className="text-xs font-medium text-[#666666] mb-1 block">
            Take Profit — <span className="text-[#888888] font-normal">{pos.side === "long" ? "above" : "below"} entry</span>
          </label>
          <div className="rounded-xl border border-green-200 flex items-center px-4 py-3 bg-[#F0F8F0]">
            <input type="number" value={tp} onChange={(e) => setTp(e.target.value)}
              placeholder="0.00" className="flex-1 text-sm font-medium text-[#333333] bg-transparent outline-none" />
            <span className="text-sm text-[#888888] ml-2">USDT</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { onSave(undefined, undefined); onClose(); }}
            className="flex-1 py-3 rounded-xl text-sm btn-3d-silver">Clear</button>
          <button
            onClick={() => {
              onSave(
                sl && parseFloat(sl) > 0 ? parseFloat(sl) : undefined,
                tp && parseFloat(tp) > 0 ? parseFloat(tp) : undefined
              );
              onClose();
            }}
            className="flex-1 py-3 rounded-xl text-sm btn-3d-gold">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Position Card ─────────────────────────────────────────────────
function PositionCard({
  pos, currentPrice, onClose, onEditSlTp, getPnl, pairStepSize, futuresBalance, allPositions,
}: {
  pos: Position;
  currentPrice: number;
  onClose: () => void;
  onEditSlTp: () => void;
  getPnl: (p: Position, price: number) => number;
  pairStepSize: number;
  futuresBalance: number;
  allPositions: Position[];
}) {
  const { fmtFiat } = useCurrency();
  const pnl     = getPnl(pos, currentPrice);
  const pnlPct  = pos.margin > 0 ? (pnl / pos.margin) * 100 : 0;
  const profit  = pnl >= 0;
  const qty     = pos.quantity;

  const liqPrice = computeDynamicLiqPrice(pos, futuresBalance, allPositions);

  return (
    <div className="mx-1 mb-3 rounded-2xl border border-[#D4AF37] p-4 shadow-sm panel-silver">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            pos.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
          }`}>
            {pos.side === "long" ? "Long" : "Short"}
          </span>
          <span className="text-xs text-[#666666] font-medium">{pos.leverage}x</span>
          <span className="text-xs text-[#888888]">{pos.marginMode}</span>
        </div>
        <button onClick={onClose}
          className="text-xs font-medium px-3 py-1 rounded-full transition-all btn-3d-silver">
          Close
        </button>
      </div>

      {/* Qty row */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] text-[#888888]">Size</span>
        <span className="text-xs font-semibold text-[#333333]">
          {fmtQty(qty, pairStepSize)} ({fmtCompact(pos.notional)} USDT)
        </span>
      </div>

      <div className="grid grid-cols-3 gap-y-3 mb-3">
        <div>
          <p className="text-[10px] text-[#888888] mb-0.5">Margin</p>
          <p className="text-xs font-semibold text-[#333333]">{fmtFiat(pos.margin)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-[#888888] mb-0.5">Entry Price</p>
          <p className="text-xs font-semibold text-[#333333]">${fmt(pos.entryPrice, 1)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#888888] mb-0.5">Mark Price</p>
          <p className="text-xs font-semibold text-[#333333]">${fmt(currentPrice, 1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#888888] mb-0.5">Liq. Price</p>
          <p className="text-xs font-semibold text-[#C9A227]">
            {liqPrice > 0 ? `$${fmt(liqPrice, 1)}` : "No Liq."}
          </p>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-[10px] text-[#888888] mb-0.5">Unrealized PnL</p>
          <p className={`text-xs font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
            {profit ? "+" : ""}{fmtFiat(pnl)} ({profit ? "+" : ""}{pnlPct.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-[#D8D0A8]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-[#888888]">SL&nbsp;</span>
            <span className={`text-xs font-medium ${pos.sl ? "text-red-500" : "text-[#AAAAAA]"}`}>
              {pos.sl ? `$${fmt(pos.sl, 1)}` : "--"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#888888]">TP&nbsp;</span>
            <span className={`text-xs font-medium ${pos.tp ? "text-green-600" : "text-[#AAAAAA]"}`}>
              {pos.tp ? `$${fmt(pos.tp, 1)}` : "--"}
            </span>
          </div>
          {pos.limitClosePrice && (
            <div>
              <span className="text-[10px] text-[#888888]">Limit Close&nbsp;</span>
              <span className="text-xs font-medium text-[#C9A227]">${fmt(pos.limitClosePrice, 1)}</span>
            </div>
          )}
        </div>
        <button onClick={onEditSlTp}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full btn-3d-gold" style={{ fontSize: '10px', padding: '4px 10px' }}>
          Edit SL/TP
        </button>
      </div>
    </div>
  );
}

// ── History Card ──────────────────────────────────────────────────
function HistoryCard({ trade }: { trade: ClosedTrade }) {
  const { fmtFiat } = useCurrency();
  const profit = trade.pnl >= 0;
  const roe = trade.margin > 0 ? (trade.pnl / trade.margin) * 100 : 0;
  const totalFees = trade.openingFee + trade.closingFee;

  return (
    <div className="mx-1 mb-3 rounded-xl border border-[#D8D0A8] p-3 bg-[#EEECE0]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            trade.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
          }`}>
            {trade.side === "long" ? "Long" : "Short"}
          </span>
          <span className="text-xs text-[#888888]">{trade.leverage}x</span>
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
            {profit ? "+" : ""}{fmtFiat(trade.pnl)}
          </span>
          <span className={`ml-1.5 text-xs font-medium ${profit ? "text-green-500" : "text-red-400"}`}>
            ({profit ? "+" : ""}{roe.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-y-2">
        <div>
          <p className="text-[10px] text-[#888888]">Notional</p>
          <p className="text-xs font-medium text-[#333333]">${fmtCompact(trade.notional)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-[#888888]">Entry</p>
          <p className="text-xs font-medium text-[#333333]">${fmt(trade.entryPrice, 1)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#888888]">Close</p>
          <p className="text-xs font-medium text-[#333333]">${fmt(trade.closePrice, 1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#888888]">Margin</p>
          <p className="text-xs font-medium text-[#333333]">${fmt(trade.margin, 2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-[#888888]">Raw PnL</p>
          <p className={`text-xs font-medium ${trade.rawPnl >= 0 ? "text-green-500" : "text-red-400"}`}>
            {trade.rawPnl >= 0 ? "+" : ""}{fmtFiat(trade.rawPnl)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#888888]">Total Fees</p>
          <p className="text-xs font-medium text-[#C9A227]">-${fmt(totalFees, 4)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Close Position Modal ───────────────────────────────────────────
function CloseModal({
  pos,
  currentPrice,
  priceDec,
  onMarketClose,
  onLimitClose,
  onClose,
}: {
  pos: Position;
  currentPrice: number;
  priceDec: number;
  onMarketClose: () => void;
  onLimitClose: (price: number) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"market" | "limit">("market");
  const [limitPriceStr, setLimitPriceStr] = useState(currentPrice > 0 ? currentPrice.toFixed(priceDec) : "");
  const [err, setErr] = useState<string | null>(null);

  const handleConfirm = () => {
    if (tab === "market") {
      onMarketClose();
    } else {
      const lp = parseFloat(limitPriceStr);
      if (!lp || lp <= 0) { setErr("Enter a valid price"); return; }
      onLimitClose(lp);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 modal-enter">
      <div className="w-full max-w-md rounded-t-3xl panel-card border-t border-[#D4AF37] p-5 pb-28 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-bold text-[#1A1A1A]">Close Position</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E0DDD0] text-[#666]">
            <IconX size={14} stroke={2.5} />
          </button>
        </div>

        {/* Position summary */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${pos.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
            {pos.side === "long" ? "Long" : "Short"}
          </span>
          <span className="text-xs text-[#666]">{pos.leverage}x</span>
          <span className="text-xs text-[#888] ml-auto">Entry: ${fmt(pos.entryPrice, 1)}</span>
        </div>

        {/* Market / Limit tabs */}
        <div className="flex rounded-xl border border-[#C8C0A0] p-1 mb-4 bg-[#E8E4D0]">
          <button onClick={() => setTab("market")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "market" ? "btn-3d-gold" : "text-[#888888]"}`}>
            Market
          </button>
          <button onClick={() => setTab("limit")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "limit" ? "btn-3d-gold" : "text-[#888888]"}`}>
            Limit
          </button>
        </div>

        {tab === "market" ? (
          <div className="rounded-xl bg-[#F5F3EA] border border-[#E0DDD0] px-4 py-3 mb-4 text-sm text-[#555]">
            Close immediately at market price ≈ <span className="font-bold text-[#1A1A1A]">${fmt(currentPrice, 1)}</span>
          </div>
        ) : (
          <div className="mb-4">
            <div className="rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3 bg-[#F5F3EA]">
              <span className="text-sm text-[#888888] mr-3 flex-shrink-0">Limit Price</span>
              <input
                type="number"
                value={limitPriceStr}
                onChange={(e) => { setLimitPriceStr(e.target.value); setErr(null); }}
                className="flex-1 text-right text-sm font-medium text-[#333333] bg-transparent outline-none"
                placeholder="0.00"
              />
              <span className="text-sm text-[#888888] ml-2">USDT</span>
            </div>
            <p className="text-[10px] text-[#888888] mt-1.5 px-1">
              {pos.side === "long"
                ? "Position closes when price reaches this level (above = profit, below = stop)"
                : "Position closes when price reaches this level (below = profit, above = stop)"}
            </p>
          </div>
        )}

        {err && <p className="text-xs text-red-500 text-center mb-3">{err}</p>}

        <button onClick={handleConfirm}
          className="w-full py-3 rounded-xl text-sm font-bold btn-3d-gold">
          {tab === "market" ? "Confirm Market Close" : "Set Limit Close"}
        </button>
      </div>
    </div>
  );
}

// ── Transfer Modal ────────────────────────────────────────────────
function TransferModal({
  spotBalance,
  futuresBalance,
  futuresBonus,
  onTransferToFutures,
  onTransferFromFutures,
  onClose,
}: {
  spotBalance: number;
  futuresBalance: number;
  futuresBonus: number;
  onTransferToFutures: (amount: number) => { success: boolean; message: string };
  onTransferFromFutures: (amount: number) => { success: boolean; message: string };
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<"toFutures" | "fromFutures">("toFutures");
  const [amountInput, setAmountInput] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const maxAmount = direction === "toFutures" ? spotBalance : futuresBalance;
  const amount = parseFloat(amountInput) || 0;

  const handleTransfer = () => {
    if (amount <= 0) { setFeedback({ msg: "Enter an amount greater than 0", ok: false }); return; }
    const result = direction === "toFutures"
      ? onTransferToFutures(amount)
      : onTransferFromFutures(amount);
    if (result.success) {
      setFeedback({ msg: result.message, ok: true });
      setAmountInput("");
    } else {
      setFeedback({ msg: result.message, ok: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 modal-enter">
      <div className="w-full max-w-md rounded-t-3xl panel-card border-t border-[#D4AF37] p-5 pb-28 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-bold text-[#1A1A1A]">Transfer</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E0DDD0] text-[#666]">
            <IconX size={14} stroke={2.5} />
          </button>
        </div>

        {/* Direction selector */}
        <div className="flex rounded-xl border border-[#C8C0A0] p-1 mb-5 bg-[#E8E4D0]">
          <button
            onClick={() => { setDirection("toFutures"); setAmountInput(""); setFeedback(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${direction === "toFutures" ? "btn-3d-gold" : "text-[#888888]"}`}>
            Spot → Futures
          </button>
          <button
            onClick={() => { setDirection("fromFutures"); setAmountInput(""); setFeedback(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${direction === "fromFutures" ? "btn-3d-gold" : "text-[#888888]"}`}>
            Futures → Spot
          </button>
        </div>

        {/* Balance rows */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F5F3EA] border border-[#E0DDD0]">
            <span className="text-xs text-[#888888]">Spot</span>
            <span className="text-sm font-semibold text-[#333333]">{fmt(spotBalance, 2)} USDT</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#F5F3EA] border border-[#E0DDD0]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#888888]">Futures</span>
              <span className="text-sm font-semibold text-[#333333]">{fmt(futuresBalance, 2)} USDT</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[#888888]">Bonus</span>
              <span className="text-xs font-medium text-[#C9A227]">{fmt(futuresBonus, 2)} USDT</span>
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div className="rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3 mb-2 bg-[#F5F3EA]">
          <span className="text-sm text-[#888888] mr-3 flex-shrink-0">Amount</span>
          <input
            type="number"
            value={amountInput}
            onChange={(e) => { setAmountInput(e.target.value); setFeedback(null); }}
            className="flex-1 text-right text-sm font-medium text-[#333333] bg-transparent outline-none"
            placeholder="0.00" min="0" step="0.01"
          />
          <span className="text-sm text-[#888888] ml-2 flex-shrink-0">USDT</span>
        </div>

        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setAmountInput(maxAmount.toFixed(2))}
            className="text-xs font-semibold text-[#C9A227] hover:text-[#A07800]">
            Max {fmt(maxAmount, 2)} USDT
          </button>
        </div>

        {feedback && (
          <div className={`text-xs text-center mb-3 font-medium ${feedback.ok ? "text-green-600" : "text-red-500"}`}>
            {feedback.msg}
          </div>
        )}

        <button
          onClick={handleTransfer}
          className="w-full py-3 rounded-xl text-sm font-bold btn-3d-gold transition-all active:scale-[0.98]">
          Confirm Transfer
        </button>
      </div>
    </div>
  );
}

// ── Leverage Confirmation Modal ────────────────────────────────────
const LEV_CONFIRM_KEY = "leverage_confirm_skip_v1";

function LeverageConfirmModal({
  targetLev,
  onConfirm,
  onCancel,
}: {
  targetLev: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [skipForever, setSkipForever] = useState(false);

  const handleYes = () => {
    if (skipForever) localStorage.setItem(LEV_CONFIRM_KEY, "1");
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6 modal-enter">
      <div className="w-full max-w-xs rounded-2xl panel-card border border-[#D4AF37] p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#FFF3CD] flex items-center justify-center flex-shrink-0">
            <span className="text-base">⚠</span>
          </div>
          <span className="font-bold text-[#1A1A1A] text-sm">Adjust Leverage</span>
        </div>
        <p className="text-xs text-[#555555] leading-relaxed mb-4">
          Are you sure you want to use <span className="font-bold text-[#C9A227]">{targetLev}x</span> leverage?
          Higher leverage increases both potential profit and risk of liquidation.
          Please make sure you fully understand the risks involved.
        </p>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <div
            onClick={() => setSkipForever(!skipForever)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              skipForever ? "bg-[#D4AF37] border-[#D4AF37]" : "border-[#CCCCCC] bg-white"
            }`}
          >
            {skipForever && <span className="text-white text-[9px] font-bold">✓</span>}
          </div>
          <span className="text-[11px] text-[#888888]">Don't show this again</span>
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-3d-silver">
            No
          </button>
          <button onClick={handleYes}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-3d-gold">
            Yes, I understand
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trader Activity Widget ─────────────────────────────────────────
const MOCK_NAMES = [
  "Alex R.", "Maria S.", "James K.", "Sophie L.", "David W.",
  "Emma T.", "Ryan M.", "Chloe B.", "Noah F.", "Olivia P.",
  "Liam G.", "Ava C.", "Ethan H.", "Isabella J.", "Mason D.",
  "Mia V.", "Logan N.", "Charlotte X.", "Aiden Z.", "Amelia Q.",
  "Lucas A.", "Harper U.", "Jackson E.", "Evelyn Y.", "Sebastian I.",
  "Abigail O.", "Mateo L.", "Emily R.", "Jack S.", "Elizabeth M.",
  "Owen T.", "Mila K.", "Theodore B.", "Ella W.", "Henry F.",
  "Sofia P.", "Elijah G.", "Aria C.", "William H.", "Scarlett J.",
  "James D.", "Victoria V.", "Benjamin N.", "Grace X.", "Samuel Z.",
  "Chloe Q.", "Daniel A.", "Penelope U.", "Michael E.", "Riley Y.",
  "Alexander I.", "Zoey O.", "Elias L.", "Nora R.", "Oliver S.",
  "Lily M.", "Lucas T.", "Eleanor K.", "Carter B.", "Hannah W.",
  "Julian F.", "Lillian P.", "Dylan G.", "Addison C.", "Nathan H.",
  "Aubrey J.", "Isaac D.", "Ellie V.", "Caleb N.", "Stella X.",
  "Wyatt Z.", "Natalie Q.", "Hunter A.", "Camila U.", "Connor E.",
  "Hazel Y.", "Levi I.", "Violet O.", "Christian L.", "Aurora R.",
  "Jonathan S.", "Savannah M.", "Nolan T.", "Brooklyn K.", "Jeremiah B.",
  "Bella W.", "Easton F.", "Claire P.", "Eli G.", "Skylar C.",
  "Vincent H.", "Lucy J.", "Lincoln D.", "Paisley V.", "Anthony N.",
  "Everly X.", "Colton Z.", "Anna Q.", "Cameron A.", "Caroline U.",
  "Brayden E.", "Genesis Y.", "Jordan I.", "Aaliyah O.", "Adrian L.",
];

const ACTIVITY_PAIRS = [
  { symbol: "BTCUSDT", label: "BTC/USDT" },
  { symbol: "ETHUSDT", label: "ETH/USDT" },
  { symbol: "BNBUSDT", label: "BNB/USDT" },
  { symbol: "SOLUSDT", label: "SOL/USDT" },
];

interface TraderEvent {
  id: number;
  name: string;
  pair: string;
  side: "long" | "short";
  leverage: number;
  closePrice: number;
  pnlPct: number;
  pnlAmt: number;
  margin: number;
  ts: number;
}

function generateEvent(id: number, prices: Record<string, number>): TraderEvent {
  const nameIdx = Math.floor(Math.random() * MOCK_NAMES.length);
  const pairIdx = Math.floor(Math.random() * ACTIVITY_PAIRS.length);
  const pair = ACTIVITY_PAIRS[pairIdx];
  const side = Math.random() > 0.5 ? "long" : "short";
  const leverageOptions = pair.symbol === "BTCUSDT" ? [50, 100, 150] : [50, 75, 100];
  const leverage = leverageOptions[Math.floor(Math.random() * leverageOptions.length)];

  const basePrice = prices[pair.symbol] ?? 0;
  const closePrice = basePrice > 0
    ? basePrice * (1 + (Math.random() - 0.5) * 0.002)
    : 0;

  const isProfit = Math.random() > 0.38;
  const pnlPct = isProfit
    ? (Math.random() * 80 + 5) * leverage / 100
    : -(Math.random() * 60 + 5) * leverage / 100;

  const margin = parseFloat((Math.random() * 500 + 20).toFixed(2));
  const pnlAmt = parseFloat((margin * pnlPct / 100).toFixed(2));

  return {
    id,
    name: MOCK_NAMES[nameIdx],
    pair: pair.label,
    side,
    leverage,
    closePrice: parseFloat(closePrice.toFixed(closePrice > 1000 ? 0 : closePrice > 10 ? 2 : 3)),
    pnlPct: parseFloat(pnlPct.toFixed(2)),
    pnlAmt,
    margin,
    ts: Date.now(),
  };
}

function TraderActivityWidget() {
  const { fmtFiat } = useCurrency();

  const btc = useBinancePrice("BTCUSDT");
  const eth = useBinancePrice("ETHUSDT");
  const bnb = useBinancePrice("BNBUSDT");
  const sol = useBinancePrice("SOLUSDT");

  const prices: Record<string, number> = {
    BTCUSDT: btc.price,
    ETHUSDT: eth.price,
    BNBUSDT: bnb.price,
    SOLUSDT: sol.price,
  };

  const [events, setEvents] = useState<TraderEvent[]>([]);
  const [eventCounter, setEventCounter] = useState(0);

  useEffect(() => {
    if (Object.values(prices).every((p) => p === 0)) return;

    const initial: TraderEvent[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push(generateEvent(i, prices));
    }
    setEvents(initial);
    setEventCounter(5);
  }, [btc.price > 0]);

  useEffect(() => {
    if (events.length === 0) return;

    const delay = Math.floor(Math.random() * 25000) + 5000;
    const timer = setTimeout(() => {
      const newEvent = generateEvent(eventCounter, prices);
      setEvents((prev) => [newEvent, ...prev].slice(0, 5));
      setEventCounter((c) => c + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [events, eventCounter]);

  return (
    <div className="mx-3 mt-1 mb-3 rounded-2xl overflow-hidden border border-[#D4AF37] panel-silver">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E0D8B0]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-[#888888]">Trader Activity</span>
        </div>
        <span className="text-[10px] text-[#AAAAAA]">Live · Last 5 closes</span>
      </div>

      {events.length === 0 && (
        <div className="py-10 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#AAAAAA]">Loading activity...</span>
        </div>
      )}

      {events.length > 0 && (
        <div className="divide-y divide-[#E8E4D0]">
          {events.map((ev) => {
            const profit = ev.pnlAmt >= 0;
            return (
              <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${
                  profit ? "bg-green-500" : "bg-red-500"
                }`}>
                  {profit ? "↑" : "↓"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-[#1A1A1A]">{ev.name}</span>
                    <span className={`text-xs font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
                      {profit ? "+" : ""}{fmtFiat(ev.pnlAmt)} ({profit ? "+" : ""}{ev.pnlPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      ev.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                    }`}>
                      {ev.side === "long" ? "Long" : "Short"}
                    </span>
                    <span className="text-[10px] text-[#888888]">{ev.pair} · {ev.leverage}x</span>
                    <span className="text-[10px] text-[#AAAAAA] ml-auto">
                      Closed @ ${ev.closePrice > 0 ? ev.closePrice.toLocaleString("en-US") : "..."}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export function FuturesPage() {
  const { fmtFiat } = useCurrency();
  const [selectedPair, setSelectedPair] = useState<TradingPair>(TRADING_PAIRS[0]);
  const [showPairPicker, setShowPairPicker] = useState(false);

  const { price, priceChangePercent, candles, interval, setInterval } = useBinancePrice(selectedPair.symbol);
  const {
    balance, positions, pendingOrders, history,
    openPosition, placeLimitOrder, cancelPendingOrder, checkPendingOrders, checkLiquidations,
    closePosition, updateSlTp, updateLimitClose, getPnl,
    spotUsdtBalance, transferToFutures, transferFromFutures,
    futuresBonus,
  } = useTrading();

  const positionSymbol = positions.length > 0 ? positions[0].symbol : null;
  const { price: positionPrice } = useBinancePrice(positionSymbol ?? selectedPair.symbol);
  const activePositionPrice = positionSymbol && positionPrice > 0 ? positionPrice : 0;

  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [marginInput, setMarginInput] = useState("");
  const [leverage, setLeverage]   = useState(50);
  const [sliderValue, setSliderValue] = useState(0);
  const [limitPriceInput, setLimitPriceInput] = useState("");

  const [showSlTpEntry, setShowSlTpEntry] = useState(false);
  const [entrySl, setEntrySl] = useState("");
  const [entryTp, setEntryTp] = useState("");

  const [activeTab, setActiveTab]       = useState<TabType>("position");
  const [contractTab, setContractTab]   = useState<"trade" | "news">("trade");
  const [pendingLev, setPendingLev]     = useState<number | null>(null);
  const [editingPos, setEditingPos]     = useState<Position | null>(null);
  const [closingPos, setClosingPos]     = useState<Position | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  const leverageOptions = PAIR_LEVERAGE_OPTIONS[selectedPair.symbol] ?? [50, 100];

  const priceDisplay = fmtPrice(price, selectedPair.priceDec);

  const entryPrice = orderType === "market"
    ? price
    : (parseFloat(limitPriceInput) > 0 ? parseFloat(limitPriceInput) : price);

  const feeRate = orderType === "market" ? TAKER_FEE : MAKER_FEE;

  const rawMargin = parseFloat(marginInput) || 0;

  const effectivePos =
    rawMargin > 0 && leverage > 0 && entryPrice > 0
      ? calcEffectivePosition(rawMargin, leverage, entryPrice, selectedPair.stepSize, feeRate)
      : { quantity: 0, notional: 0, margin: 0, openingFee: 0, totalCost: 0 };

  const { quantity: effectiveQty, notional: effectiveNotional, margin: effectiveMargin, openingFee: effectiveFee, totalCost: effectiveCost } = effectivePos;

  const tierMax = getMaxNotional(leverage);
  const isCapped = rawMargin > 0 && (rawMargin * leverage) > tierMax;

  function liqPreview(tradeSide: "long" | "short"): string {
    if (effectiveNotional <= 0 || entryPrice <= 0) return "--";
    // W after opening = (balance - totalCost) + (existingMargins + newMargin)
    //                 = balance - effectiveFee + existingMargins
    const existingMargins = positions.reduce((s, p) => s + p.margin, 0);
    const W = balance - effectiveFee + existingMargins;
    const liq = calcLiqPrice(tradeSide, entryPrice, effectiveNotional, effectiveMargin, "Cross", W);
    if (liq <= 0) return "No Liq.";
    return "$" + fmt(liq, 1);
  }

  const longLiqPreview  = liqPreview("long");
  const shortLiqPreview = liqPreview("short");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };

  // Check pending orders + liquidations on every price tick
  useEffect(() => {
    if (price > 0 && pendingOrders.length > 0) {
      checkPendingOrders(price, balance);
    }
  }, [price]);

  useEffect(() => {
  if (activePositionPrice > 0 && positions.length > 0) {  // ← ganti price → activePositionPrice
    const triggered = checkLiquidations(activePositionPrice);
      for (const { id, reason, closePrice } of triggered) {
        closePosition(id, closePrice);
        if (reason === "liquidation") showToast("Position liquidated!", false);
        else if (reason === "sl") showToast("Stop Loss triggered", false);
        else if (reason === "limit_close") showToast("Limit close executed ✓", true);
        else showToast("Take Profit triggered ✓", true);
      }
    }
  }, [price]);

  const handleMarginChange = useCallback((v: string) => {
    const clean = v.replace(/[^0-9.]/g, "");
    setMarginInput(clean);
    const num = parseFloat(clean) || 0;
    if (balance > 0 && entryPrice > 0) {
      // Compute slider position based on totalCost / balance
      const fRate = orderType === "market" ? TAKER_FEE : MAKER_FEE;
      const { totalCost } = calcEffectivePosition(num, leverage, entryPrice, selectedPair.stepSize, fRate);
      setSliderValue(Math.min(Math.round((totalCost / balance) * 100), 100));
    } else {
      setSliderValue(balance > 0 ? Math.min(Math.round((num / balance) * 100), 100) : 0);
    }
  }, [balance, entryPrice, leverage, orderType, selectedPair.stepSize]);

  const handleSliderChange = useCallback((pct: number) => {
    setSliderValue(pct);
    if (pct <= 0 || balance <= 0) {
      setMarginInput("");
      return;
    }

    const fRate = orderType === "market" ? TAKER_FEE : MAKER_FEE;
    const totalCostTarget = (balance * pct) / 100;

    if (entryPrice > 0 && selectedPair.stepSize > 0) {
      // Compute max margin using lot-size-aware formula
      const maxMargin = calcMaxMarginForBalance(totalCostTarget, leverage, entryPrice, selectedPair.stepSize, fRate);
      setMarginInput(maxMargin > 0 ? maxMargin.toFixed(5) : "");
    } else {
      // Fallback: no price yet
      const rawM = totalCostTarget / (1 + leverage * fRate);
      setMarginInput(rawM > 0 ? rawM.toFixed(5) : "");
    }
  }, [balance, leverage, entryPrice, orderType, selectedPair.stepSize]);

  const handleSubmit = (tradeSide: "long" | "short") => {
    if (price <= 0) return showToast("Price not loaded yet", false);

    // Single-position mode: block if any position is already open
    if (positions.length > 0) {
      return showToast("Close your existing position before opening a new one", false);
    }

    const sl = parseFloat(entrySl) || undefined;
    const tp = parseFloat(entryTp) || undefined;

    if (orderType === "market") {
      const result = openPosition(tradeSide, selectedPair.symbol, rawMargin, price, leverage, selectedPair.stepSize, "Cross", sl, tp, balance, positions);
      if (result.success) {
        setMarginInput(""); setSliderValue(0);
        setEntrySl(""); setEntryTp("");
        setActiveTab("position");
        showToast(`${tradeSide === "long" ? "Long" : "Short"} opened @${fmtPrice(price, selectedPair.priceDec)}`, true);
      } else {
        showToast(result.message, false);
      }
    } else {
      // Limit order: validate price direction
      const lp = parseFloat(limitPriceInput);
      if (!lp || lp <= 0) return showToast("Enter a valid limit price", false);
      if (tradeSide === "long" && lp >= price) {
        return showToast("Limit buy price must be below current market price", false);
      }
      if (tradeSide === "short" && lp <= price) {
        return showToast("Limit sell price must be above current market price", false);
      }
      const result = placeLimitOrder(tradeSide, rawMargin, lp, leverage, selectedPair.stepSize, sl, tp, balance);
      if (result.success) {
        setMarginInput(""); setSliderValue(0);
        setEntrySl(""); setEntryTp("");
        setActiveTab("orders");
        showToast(`Limit ${tradeSide === "long" ? "Long" : "Short"} pending @${fmtPrice(lp, selectedPair.priceDec)}`, true);
      } else {
        showToast(result.message, false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden page-bg">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? "bg-green-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* SL/TP edit modal */}
      {editingPos && (
        <SlTpModal pos={editingPos}
          onSave={(sl, tp) => updateSlTp(editingPos.id, sl, tp)}
          onClose={() => setEditingPos(null)} />
      )}

      {/* Close position modal */}
      {closingPos && (
        <CloseModal
          pos={closingPos}
          currentPrice={price}
          priceDec={selectedPair.priceDec}
          onMarketClose={() => {
            closePosition(closingPos.id, price);
            showToast("Position closed at market price", true);
            setClosingPos(null);
          }}
          onLimitClose={(lp) => {
            updateLimitClose(closingPos.id, lp);
            showToast(`Limit close set at $${lp.toFixed(1)}`, true);
            setClosingPos(null);
          }}
          onClose={() => setClosingPos(null)}
        />
      )}

      {/* Leverage confirm modal */}
      {pendingLev !== null && (
        <LeverageConfirmModal
          targetLev={pendingLev}
          onConfirm={() => {
            setLeverage(pendingLev);
            setMarginInput("");
            setSliderValue(0);
            setPendingLev(null);
          }}
          onCancel={() => setPendingLev(null)}
        />
      )}

      {/* Transfer modal */}
      {showTransferModal && (
        <TransferModal
          spotBalance={spotUsdtBalance}
          futuresBalance={balance}
          futuresBonus={futuresBonus}
          onTransferToFutures={(amount) => {
            return transferToFutures(amount);
          }}
          onTransferFromFutures={(amount) => {
            return transferFromFutures(amount);
          }}
          onClose={() => setShowTransferModal(false)}
        />
      )}

      {/* Pair picker modal */}
      {showPairPicker && (
        <PairPickerModal
          selectedSymbol={selectedPair.symbol}
          onSelect={(pair) => {
            setSelectedPair(pair);
            setMarginInput("");
            setSliderValue(0);
            setLimitPriceInput("");
            const opts = PAIR_LEVERAGE_OPTIONS[pair.symbol] ?? [50, 100];
            setLeverage(opts[0]);
          }}
          onClose={() => setShowPairPicker(false)}
        />
      )}

      {/* Header */}
      <div className="relative flex items-center px-4 py-3 border-b border-[#C8B040] flex-shrink-0 panel-header">
        <div className="w-[60px]" />
        <span className="absolute left-1/2 -translate-x-1/2 text-base font-bold text-[#1A1A1A] tracking-tight">Futures Trade</span>
        <div className="flex items-center gap-2 ml-auto">
          <div className="p-1 w-[26px] h-[26px]" />
          <div className="p-1 w-[26px] h-[26px]" />
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center px-4 py-2 flex-shrink-0 panel-header border-b border-[#D8D0A0]">
        <img
          src={selectedPair.icon}
          alt={selectedPair.base}
          className="w-7 h-7 rounded-full mr-2 flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <button
          className="flex items-center gap-1 rounded-lg px-2 py-1 border border-[#D4AF37] bg-[#F5EDD0]"
          onClick={() => setShowPairPicker(true)}
        >
          <span className="text-sm font-semibold text-[#333333]">{selectedPair.label}</span>
          <IconChevronDown size={12} stroke={2.5} />
        </button>
        <span className="ml-3 text-xl font-bold text-[#B8860B]">{priceDisplay}</span>
        <span className={`ml-auto text-sm font-medium ${priceChangePercent >= 0 ? "text-green-600" : "text-red-500"}`}>
          {priceChangePercent >= 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%
        </span>
      </div>

      {/* Interval selector */}
      <div className="flex items-center px-4 pt-2 pb-1 gap-1 flex-shrink-0 panel-header border-b border-[#D8D0A0]">
        {INTERVALS.map((iv) => (
          <button key={iv.value} onClick={() => setInterval(iv.value)}
            className={`text-sm px-3 py-1 rounded-lg font-medium transition-all ${
              interval === iv.value
                ? "btn-3d-gold border-0"
                : "text-[#777777] hover:text-[#444444]"
            }`}>
            {iv.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-shrink-0 bg-[#F0EEDC] border-b border-[#D8D0A0]" style={{ height: 170 }}>
        <CandleChart candles={candles} currentPrice={price} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* Contract header with Trade/News toggle */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-xs font-semibold text-[#888888] uppercase tracking-wide">Contract</span>
          <div className="flex rounded-xl border border-[#C8C0A0] p-1 bg-[#E8E4D0]">
            <button
              onClick={() => setContractTab("trade")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                contractTab === "trade" ? "btn-3d-gold" : "text-[#888888]"
              }`}>
              Trade
            </button>
            <button
              onClick={() => setContractTab("news")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                contractTab === "news" ? "btn-3d-gold" : "text-[#888888]"
              }`}>
              Activity
            </button>
          </div>
        </div>

        {contractTab === "news" && <TraderActivityWidget />}

        {contractTab === "trade" && <>

        {/* Trade panel */}
        <div className="mx-3 mt-0 panel-card rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #D4AF37' }}>

          {/* Leverage selector */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#888888] font-medium">Cross Margin</span>
            <div className="flex gap-1.5">
              {leverageOptions.map((lev) => (
                <button
                  key={lev}
                  onClick={() => {
                    if (lev === leverage) return;
                    if (localStorage.getItem(LEV_CONFIRM_KEY)) {
                      setLeverage(lev);
                      setMarginInput("");
                      setSliderValue(0);
                    } else {
                      setPendingLev(lev);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                    leverage === lev ? "btn-3d-gold" : "btn-3d-silver"
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          {/* Limit / Market tabs */}
          <div className="flex rounded-xl border border-[#C8C0A0] p-1 mb-4 bg-[#E8E4D0]">
            <button onClick={() => setOrderType("limit")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                orderType === "limit" ? "btn-3d-gold" : "text-[#888888]"
              }`}>Limit</button>
            <button onClick={() => setOrderType("market")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                orderType === "market" ? "btn-3d-gold" : "text-[#888888]"
              }`}>Market</button>
          </div>

          {/* Available */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#777777]">Available</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#333333]">{fmt(balance, 2)} USDT</span>
              <button
                onClick={() => setShowTransferModal(true)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full btn-3d-gold leading-tight">
                Transfer
              </button>
            </div>
          </div>

          {/* Margin input */}
          <div className="rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3 mb-1 bg-[#F5F3EA]">
            <span className="text-sm text-[#888888] mr-3 flex-shrink-0">Margin</span>
            <input
              type="number"
              value={marginInput}
              onChange={(e) => handleMarginChange(e.target.value)}
              className="flex-1 text-right text-sm font-medium text-[#333333] bg-transparent outline-none"
              placeholder="0.00" min="0" step="0.01"
            />
            <span className="text-sm text-[#888888] ml-2 flex-shrink-0">USDT</span>
          </div>

          {/* Fee info row */}
          {effectiveNotional > 0 && (
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] text-[#AAAAAA]">
                Fee ({orderType === "market" ? "0.04%" : "0.02%"})
              </span>
              <span className="text-[10px] text-[#C9A227] font-medium">
                -{fmt(effectiveFee, 4)} USDT
              </span>
            </div>
          )}

          {/* Cost row */}
          {effectiveNotional > 0 && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] text-[#888888] font-medium">Total Cost</span>
              <span className="text-[10px] text-[#333333] font-semibold">
                {fmt(effectiveCost, 4)} USDT
              </span>
            </div>
          )}

          {/* Tier cap notice */}
          {isCapped && (
            <div className="flex justify-end mb-2 pr-1">
              <span className="text-[10px] text-[#C9A227] font-medium">
                ⚠ Max position capped at ${fmtCompact(tierMax)} for {leverage}x
              </span>
            </div>
          )}
          {!isCapped && effectiveNotional <= 0 && <div className="mb-2" />}

          {/* Limit price input */}
          {orderType === "limit" && (
            <div className="rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3 mb-3 bg-[#F5F3EA]">
              <span className="text-sm text-[#888888] mr-3 flex-shrink-0">Price</span>
              <input
                type="number"
                value={limitPriceInput}
                onChange={(e) => setLimitPriceInput(e.target.value)}
                onFocus={(e) => { if (!limitPriceInput && price > 0) setLimitPriceInput(price.toFixed(selectedPair.priceDec)); e.target.select(); }}
                placeholder={price > 0 ? price.toFixed(selectedPair.priceDec) : "0"}
                className="flex-1 text-right text-sm font-medium text-[#333333] bg-transparent outline-none"
                min="0" step="1"
              />
              <span className="text-sm text-[#888888] ml-2 flex-shrink-0">USDT</span>
            </div>
          )}

          {/* Slider */}
          <div className="mb-3 px-1">
            <div className="relative h-6 flex items-center">
              <div className="absolute inset-x-0 h-[3px] rounded-full bg-[#D0CCA8]">
                <div className="h-full rounded-full"
                  style={{ width: `${sliderValue}%`, background: 'linear-gradient(to right, #D4AF37, #FFE566)' }} />
              </div>
              <div className="absolute w-5 h-5 rounded-full border-[2.5px] border-white shadow-md -translate-x-1/2 pointer-events-none"
                style={{ left: `${sliderValue}%`, background: 'linear-gradient(to bottom, #FFE566, #D4AF37)', boxShadow: '0 2px 6px rgba(180,140,0,0.4), 0 1px 0 #9B7A1A' }} />
              <input type="range" min={0} max={100} value={sliderValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
            </div>
            <div className="flex justify-between mt-1 px-0.5">
              {SLIDER_MARKS.map((v) => (
                <div key={v} className="flex flex-col items-center gap-0.5">
                  <button onClick={() => handleSliderChange(v)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${sliderValue >= v ? "bg-[#D4AF37]" : "bg-[#C8C8C8]"}`} />
                  <span className={`text-[9px] font-medium ${sliderValue >= v ? "text-[#C9A227]" : "text-[#AAAAAA]"}`}>
                    {v}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SL / TP toggle */}
          <button onClick={() => setShowSlTpEntry(!showSlTpEntry)}
            className="flex items-center gap-1.5 mb-3 text-xs text-[#B8860B] font-medium">
            {showSlTpEntry ? <IconChevronDown size={12} stroke={2.5} /> : <IconChevronRight size={12} stroke={2.5} />}
            SL / TP
          </button>

          {showSlTpEntry && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-[#888888] block mb-1">Stop Loss</span>
                <div className="rounded-xl border border-red-200 flex items-center px-3 py-2 bg-[#F8F0F0]">
                  <input type="number" value={entrySl} onChange={(e) => setEntrySl(e.target.value)}
                    className="flex-1 text-xs font-medium text-[#333333] bg-transparent outline-none w-0"
                    placeholder="Price" />
                  <span className="text-[10px] text-[#888888] ml-1 flex-shrink-0">USDT</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[#888888] block mb-1">Take Profit</span>
                <div className="rounded-xl border border-green-200 flex items-center px-3 py-2 bg-[#F0F8F0]">
                  <input type="number" value={entryTp} onChange={(e) => setEntryTp(e.target.value)}
                    className="flex-1 text-xs font-medium text-[#333333] bg-transparent outline-none w-0"
                    placeholder="Price" />
                  <span className="text-[10px] text-[#888888] ml-1 flex-shrink-0">USDT</span>
                </div>
              </div>
            </div>
          )}

          {/* Open Long / Open Short */}
          <div className="space-y-2">
            <button
              onClick={() => handleSubmit("long")}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all text-left px-4 btn-3d-long">
              <div className="font-bold">Open Long</div>
              {effectiveNotional > 0 && (
                <div className="text-xs text-green-100 font-normal mt-0.5">
                  {fmtQty(effectiveQty, selectedPair.stepSize)} {selectedPair.base} · ${fmtCompact(effectiveNotional)} · Cost ${fmt(effectiveCost, 2)} · Liq {longLiqPreview}
                </div>
              )}
            </button>
            <button
              onClick={() => handleSubmit("short")}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all text-left px-4 btn-3d-short">
              <div className="font-bold">Open Short</div>
              {effectiveNotional > 0 && (
                <div className="text-xs text-red-100 font-normal mt-0.5">
                  {fmtQty(effectiveQty, selectedPair.stepSize)} {selectedPair.base} · ${fmtCompact(effectiveNotional)} · Cost ${fmt(effectiveCost, 2)} · Liq {shortLiqPreview}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Position / Orders / History */}
        <div className="mx-3 mt-3 mb-3 rounded-2xl overflow-hidden shadow-sm border border-[#D4AF37] panel-silver">
          <div className="flex">
            {(["position", "orders", "history"] as TabType[]).map((tab, idx) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-all border-b-2 relative ${
                  activeTab === tab
                    ? "text-[#1A1A1A] border-[#D4AF37]"
                    : "text-[#888888] border-transparent"
                } ${idx > 0 ? "border-l border-[#D8D0A8]" : ""}`}>
                {tab === "position" ? "Position" : tab === "orders" ? "Orders" : "History"}
                {tab === "position" && positions.length > 0 && (
                  <span className="absolute top-2 right-3 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(to bottom, #FFE566, #D4AF37)', color: '#1A0F00' }}>
                    {positions.length}
                  </span>
                )}
                {tab === "orders" && pendingOrders.length > 0 && (
                  <span className="absolute top-2 right-3 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(to bottom, #FFE566, #C9A227)', color: '#1A0F00' }}>
                    {pendingOrders.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "position" && (
            <div className="p-2 tab-enter">
              {positions.length === 0
                ? <p className="py-8 text-center text-sm text-[#AAAAAA]">No positions</p>
                : positions.map((pos) => (
                  <PositionCard key={pos.id} pos={pos} currentPrice={activePositionPrice}
                    onClose={() => setClosingPos(pos)}
                    onEditSlTp={() => setEditingPos(pos)}
                    getPnl={getPnl}
                    pairStepSize={selectedPair.stepSize}
                    futuresBalance={balance}
                    allPositions={positions} />
                ))
              }
            </div>
          )}

          {activeTab === "orders" && (
            <div className="p-2 tab-enter">
              {pendingOrders.length === 0
                ? <p className="py-8 text-center text-sm text-[#AAAAAA]">No pending orders</p>
                : pendingOrders.map((order) => {
                  const previewPos = calcEffectivePosition(order.requestedMargin, order.leverage, order.limitPrice, order.stepSize, MAKER_FEE);
                  return (
                    <div key={order.id} className="mx-1 mb-3 rounded-2xl border border-[#D4AF37] p-4 shadow-sm panel-silver">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            order.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                          }`}>
                            {order.side === "long" ? "Long" : "Short"}
                          </span>
                          <span className="text-xs text-[#666666] font-medium">{order.leverage}x</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5E280] text-[#8B6914]">Pending</span>
                        </div>
                        <button onClick={() => cancelPendingOrder(order.id)}
                          className="text-xs font-medium px-3 py-1 rounded-full transition-all btn-3d-silver">
                          Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-y-2">
                        <div>
                          <p className="text-[10px] text-[#888888]">Type</p>
                          <p className="text-xs font-semibold text-[#333333]">Limit</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#888888]">Limit Price</p>
                          <p className="text-xs font-semibold text-[#C9A227]">${fmt(order.limitPrice, 1)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#888888]">Mark Price</p>
                          <p className="text-xs font-semibold text-[#333333]">${fmt(price, 1)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#888888]">Margin</p>
                          <p className="text-xs font-semibold text-[#333333]">${fmt(previewPos.margin, 2)}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-[10px] text-[#888888]">Total Cost</p>
                          <p className="text-xs font-semibold text-[#333333]">${fmt(previewPos.totalCost, 4)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#888888]">SL</p>
                          <p className={`text-xs font-medium ${order.sl ? "text-red-500" : "text-[#AAAAAA]"}`}>
                            {order.sl ? `$${fmt(order.sl, 1)}` : "--"}
                          </p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-[10px] text-[#888888]">TP</p>
                          <p className={`text-xs font-medium ${order.tp ? "text-green-600" : "text-[#AAAAAA]"}`}>
                            {order.tp ? `$${fmt(order.tp, 1)}` : "--"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-2 tab-enter">
              {history.length === 0
                ? <p className="py-8 text-center text-sm text-[#AAAAAA]">No history</p>
                : history.map((trade) => <HistoryCard key={trade.id} trade={trade} />)
              }
            </div>
          )}
        </div>

        </>}

      </div>

    </div>
  );
}
