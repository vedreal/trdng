import { useState, useCallback } from "react";
import { useBinancePrice } from "../hooks/useBinancePrice";
import { useTradingStore, type Position } from "../hooks/useTradingStore";
import { CandleChart } from "../components/CandleChart";

type OrderSide = "buy" | "sell";
type OrderType = "limit" | "market";
type TabType = "position" | "orders" | "history";

const LEVERAGE_OPTIONS = [10, 25, 50, 100, 200];

const INTERVALS = [
  { label: "5m", value: "5m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
];

const SLIDER_MARKS = [0, 25, 50, 75, 100];

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── SL/TP Edit Modal ────────────────────────────────────────────────
function SlTpModal({
  pos,
  onSave,
  onClose,
}: {
  pos: Position;
  onSave: (sl?: number, tp?: number) => void;
  onClose: () => void;
}) {
  const [sl, setSl] = useState(pos.sl ? pos.sl.toString() : "");
  const [tp, setTp] = useState(pos.tp ? pos.tp.toString() : "");

  const handleSave = () => {
    onSave(
      sl && parseFloat(sl) > 0 ? parseFloat(sl) : undefined,
      tp && parseFloat(tp) > 0 ? parseFloat(tp) : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 max-w-md mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-gray-800">Edit SL / TP</span>
          <button onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-xs text-gray-400 mb-3">
          Entry price: <span className="text-gray-600 font-medium">${fmt(pos.entryPrice, 1)}</span>
          &nbsp;·&nbsp;
          <span className={pos.side === "long" ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
            {pos.side === "long" ? "Long" : "Short"} {pos.leverage}x
          </span>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Stop Loss (SL)
            <span className="text-gray-400 font-normal ml-1">
              — {pos.side === "long" ? "below" : "above"} entry
            </span>
          </label>
          <div className="bg-gray-50 rounded-xl border border-gray-200 flex items-center px-4 py-3">
            <input
              type="number"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-sm font-medium text-gray-700 bg-transparent outline-none"
            />
            <span className="text-sm text-gray-400">USDC</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Take Profit (TP)
            <span className="text-gray-400 font-normal ml-1">
              — {pos.side === "long" ? "above" : "below"} entry
            </span>
          </label>
          <div className="bg-gray-50 rounded-xl border border-gray-200 flex items-center px-4 py-3">
            <input
              type="number"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-sm font-medium text-gray-700 bg-transparent outline-none"
            />
            <span className="text-sm text-gray-400">USDC</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { onSave(undefined, undefined); onClose(); }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Position Card ────────────────────────────────────────────────────
function PositionCard({
  pos,
  currentPrice,
  onClose,
  onEditSlTp,
  getPnl,
}: {
  pos: Position;
  currentPrice: number;
  onClose: () => void;
  onEditSlTp: () => void;
  getPnl: (p: Position, price: number) => number;
}) {
  const pnl = getPnl(pos, currentPrice);
  const pnlPct = (pnl / pos.margin) * 100;
  const isProfit = pnl >= 0;

  return (
    <div className="mx-1 mb-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            pos.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
          }`}>
            {pos.side === "long" ? "Long" : "Short"}
          </span>
          <span className="text-xs text-gray-500 font-medium">{pos.leverage}x</span>
          <span className="text-xs text-gray-400">{pos.marginMode}</span>
        </div>
        <button
          onClick={onClose}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-3 py-1 rounded-full transition-all"
        >
          Close
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-y-3 mb-3">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Size</p>
          <p className="text-xs font-semibold text-gray-700">${fmt(pos.size)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">Entry Price</p>
          <p className="text-xs font-semibold text-gray-700">${fmt(pos.entryPrice, 1)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 mb-0.5">Mark Price</p>
          <p className="text-xs font-semibold text-gray-700">${fmt(currentPrice, 1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Margin</p>
          <p className="text-xs font-semibold text-gray-700">${fmt(pos.margin)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">Liq. Price</p>
          <p className="text-xs font-semibold text-orange-500">${fmt(pos.liquidationPrice, 1)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 mb-0.5">PnL</p>
          <p className={`text-xs font-bold ${isProfit ? "text-green-500" : "text-red-500"}`}>
            {isProfit ? "+" : ""}${fmt(pnl)} ({isProfit ? "+" : ""}{pnlPct.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* SL / TP row */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-gray-400">SL&nbsp;</span>
            <span className={`text-xs font-medium ${pos.sl ? "text-red-500" : "text-gray-400"}`}>
              {pos.sl ? `$${fmt(pos.sl, 1)}` : "--"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400">TP&nbsp;</span>
            <span className={`text-xs font-medium ${pos.tp ? "text-green-500" : "text-gray-400"}`}>
              {pos.tp ? `$${fmt(pos.tp, 1)}` : "--"}
            </span>
          </div>
        </div>
        <button
          onClick={onEditSlTp}
          className="text-[10px] text-orange-500 font-semibold border border-orange-200 bg-orange-50 px-2.5 py-1 rounded-full"
        >
          Edit SL/TP
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export function FuturesPage() {
  const { price, priceChangePercent, candles, interval, setInterval } =
    useBinancePrice("BTCUSDT");
  const { balance, positions, history, openPosition, closePosition, updateSlTp, getPnl } =
    useTradingStore();

  const [side, setSide]           = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [amount, setAmount]       = useState("");
  const [leverage, setLeverage]   = useState(50);
  const [marginMode, setMarginMode] = useState<"Cross" | "Isolated">("Cross");
  const [sliderValue, setSliderValue] = useState(0);

  // SL/TP on entry
  const [showSlTpEntry, setShowSlTpEntry] = useState(false);
  const [entrySl, setEntrySl] = useState("");
  const [entryTp, setEntryTp] = useState("");

  const [activeTab, setActiveTab]     = useState<TabType>("position");
  const [showLevModal, setShowLevModal] = useState(false);
  const [editingPos, setEditingPos]   = useState<Position | null>(null);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  const priceDisplay =
    price > 0
      ? "$" + price.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : "$...";
  const limitPrice = price > 0 ? Math.round(price).toString() : "...";

  const parsedAmount = parseFloat(amount) || 0;
  const margin       = parsedAmount > 0 ? parsedAmount / leverage : 0;

  const liqPrice = (() => {
    if (parsedAmount <= 0 || price <= 0) return "--";
    const MMR = 0.005;
    const col  = marginMode === "Cross" ? balance : margin;
    const eff  = Math.max(col - parsedAmount * MMR, col * 0.01);
    const dist = eff / parsedAmount;
    if (side === "buy")  return `$${fmt(Math.max(price * (1 - dist), 0), 1)}`;
    return `$${fmt(price * (1 + dist), 1)}`;
  })();

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };

  const handleAmountChange = useCallback((v: string) => {
    const clean = v.replace(/[^0-9.]/g, "");
    setAmount(clean);
    const num = parseFloat(clean) || 0;
    setSliderValue(balance > 0 ? Math.min(Math.round((num / balance) * 100), 100) : 0);
  }, [balance]);

  const handleSliderChange = useCallback((pct: number) => {
    setSliderValue(pct);
    const notional = (balance * pct) / 100;
    setAmount(notional > 0 ? notional.toFixed(2) : "");
  }, [balance]);

  const handleSubmit = () => {
    if (price <= 0) return showToast("Price not loaded yet", false);
    const result = openPosition(
      side === "buy" ? "long" : "short",
      parsedAmount,
      price,
      leverage,
      marginMode,
      parseFloat(entrySl) || undefined,
      parseFloat(entryTp) || undefined,
      balance
    );
    if (result.success) {
      setAmount(""); setSliderValue(0);
      setEntrySl(""); setEntryTp("");
      setActiveTab("position");
      showToast(`${side === "buy" ? "Long" : "Short"} opened at $${Math.round(price).toLocaleString()}`, true);
    } else {
      showToast(result.message, false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f5ede0] overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? "bg-green-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* SL/TP edit modal */}
      {editingPos && (
        <SlTpModal
          pos={editingPos}
          onSave={(sl, tp) => updateSlTp(editingPos.id, sl, tp)}
          onClose={() => setEditingPos(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button className="p-1">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div />
        <div className="flex items-center gap-2">
          <button className="p-1">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button className="p-1">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="5"  r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold mr-2">₿</div>
        <button className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
          <span className="text-sm font-semibold text-gray-700">BTC-USD</span>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span className="ml-3 text-xl font-bold text-orange-500">{priceDisplay}</span>
        <span className={`ml-auto text-sm font-medium ${priceChangePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
          {priceChangePercent >= 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%
        </span>
      </div>

      {/* Interval selector */}
      <div className="bg-white flex items-center px-4 pt-2 pb-1 gap-1 flex-shrink-0">
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            onClick={() => setInterval(iv.value)}
            className={`text-sm px-3 py-1 rounded-lg font-medium transition-all ${
              interval === iv.value
                ? "bg-amber-100 text-orange-600 font-bold border border-amber-300"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {iv.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white flex-shrink-0" style={{ height: 170 }}>
        <CandleChart candles={candles} currentPrice={price} />
      </div>

      {/* Margin / leverage row */}
      <div className="flex items-center px-4 py-2 flex-shrink-0">
        <button
          onClick={() => setMarginMode(m => m === "Cross" ? "Isolated" : "Cross")}
          className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm mr-2"
        >
          {marginMode}
        </button>
        <button
          onClick={() => setShowLevModal(true)}
          className="bg-amber-100 border border-amber-200 rounded-full px-3 py-1.5 text-sm font-bold text-orange-600 shadow-sm"
        >
          {leverage}x
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Trade panel */}
        <div className="mx-3 bg-[#fdf6ec] border border-amber-100 rounded-2xl p-4 shadow-sm">

          {/* Buy / Sell */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide("buy")}
              className={`flex-1 py-3 rounded-xl font-semibold text-base transition-all ${
                side === "buy" ? "bg-white border-2 border-green-400 text-green-600 shadow-sm" : "text-gray-400"
              }`}
            >
              <span className="text-green-500 mr-1">₿</span> Buy
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`flex-1 py-3 rounded-xl font-semibold text-base transition-all ${
                side === "sell" ? "bg-white border-2 border-orange-400 text-orange-600 shadow-sm" : "text-gray-400"
              }`}
            >
              <span className="text-orange-500 mr-1">₿</span> Sell
            </button>
          </div>

          {/* Available */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Available</span>
            <span className="text-sm font-semibold text-gray-700">${fmt(balance)}</span>
          </div>

          {/* Amount */}
          <div className="bg-white rounded-xl border border-gray-200 flex items-center px-4 py-3 mb-3">
            <span className="text-sm text-gray-400 mr-3 flex-shrink-0">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 text-right text-sm font-medium text-gray-700 bg-transparent outline-none"
              placeholder="0.00"
              min="0" step="0.01"
            />
            <span className="text-sm text-gray-400 ml-2 flex items-center gap-0.5 flex-shrink-0">
              USDC
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Order type */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setOrderType(t => t === "limit" ? "market" : "limit")}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                orderType === "limit" ? "border-orange-500" : "border-gray-300"
              }`}
            >
              {orderType === "limit" && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
            </button>
            <span className="text-sm text-gray-600">Limit</span>
          </div>

          {/* Limit price */}
          {orderType === "limit" && (
            <div className="bg-white rounded-xl border border-gray-200 flex items-center px-4 py-3 mb-3">
              <span className="text-sm text-gray-400 mr-3 flex-shrink-0">Price</span>
              <div className="flex-1 text-right text-sm font-medium text-gray-500">{limitPrice}</div>
              <span className="text-sm text-gray-400 ml-2 flex-shrink-0">USDC</span>
            </div>
          )}

          {/* ── Slider with % marks ── */}
          <div className="mb-3 px-1">
            {/* Track */}
            <div className="relative h-6 flex items-center">
              <div className="absolute inset-x-0 h-[3px] rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-300"
                  style={{ width: `${sliderValue}%` }}
                />
              </div>
              <div
                className="absolute w-5 h-5 bg-orange-500 rounded-full border-[2.5px] border-white shadow-md -translate-x-1/2 pointer-events-none"
                style={{ left: `${sliderValue}%` }}
              />
              <input
                type="range" min={0} max={100}
                value={sliderValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Tick marks + percentage labels */}
            <div className="flex justify-between mt-1 px-0.5">
              {SLIDER_MARKS.map((v) => (
                <div key={v} className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => handleSliderChange(v)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      sliderValue >= v ? "bg-orange-400" : "bg-gray-300"
                    }`}
                  />
                  <span className={`text-[9px] font-medium transition-all ${
                    sliderValue >= v ? "text-orange-400" : "text-gray-400"
                  }`}>
                    {v}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SL / TP toggle on entry */}
          <button
            onClick={() => setShowSlTpEntry(!showSlTpEntry)}
            className="flex items-center gap-1.5 mb-3 text-xs text-orange-500 font-medium"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showSlTpEntry ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
            </svg>
            SL / TP
          </button>

          {showSlTpEntry && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-400 block mb-1">Stop Loss</span>
                <div className="bg-white rounded-xl border border-red-100 flex items-center px-3 py-2">
                  <input
                    type="number"
                    value={entrySl}
                    onChange={(e) => setEntrySl(e.target.value)}
                    className="flex-1 text-xs font-medium text-gray-700 bg-transparent outline-none w-0"
                    placeholder="Price"
                  />
                  <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">USDC</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block mb-1">Take Profit</span>
                <div className="bg-white rounded-xl border border-green-100 flex items-center px-3 py-2">
                  <input
                    type="number"
                    value={entryTp}
                    onChange={(e) => setEntryTp(e.target.value)}
                    className="flex-1 text-xs font-medium text-gray-700 bg-transparent outline-none w-0"
                    placeholder="Price"
                  />
                  <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">USDC</span>
                </div>
              </div>
            </div>
          )}

          {/* Liq / Margin */}
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">Liq. Price</span>
            <span className="text-xs text-gray-600 font-medium">{liqPrice}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-xs text-gray-500">Margin Required</span>
            <span className="text-xs text-gray-700">{margin > 0 ? `$${fmt(margin)}` : "$0.00"}</span>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className={`w-full py-4 rounded-xl text-white font-semibold text-base shadow-sm transition-all active:scale-[0.98] ${
              side === "buy"
                ? "bg-gradient-to-r from-green-400 to-green-500"
                : "bg-gradient-to-r from-orange-300 to-red-400"
            }`}
          >
            {side === "buy" ? "Buy / Long" : "Sell / Short"}
          </button>
        </div>

        {/* Position / Orders / History tabs */}
        <div className="mx-3 mt-3 mb-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="flex">
            {(["position", "orders", "history"] as TabType[]).map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-all border-b-2 relative ${
                  activeTab === tab ? "text-gray-800 border-orange-500" : "text-gray-400 border-transparent"
                } ${idx > 0 ? "border-l border-gray-100" : ""}`}
              >
                {tab === "position" ? "Position" : tab === "orders" ? "Orders" : "History"}
                {tab === "position" && positions.length > 0 && (
                  <span className="absolute top-2 right-3 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {positions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "position" && (
            <div className="p-2">
              {positions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No positions</p>
              ) : (
                positions.map((pos) => (
                  <PositionCard
                    key={pos.id}
                    pos={pos}
                    currentPrice={price}
                    onClose={() => closePosition(pos.id, price)}
                    onEditSlTp={() => setEditingPos(pos)}
                    getPnl={getPnl}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "orders" && (
            <p className="py-8 text-center text-sm text-gray-400">No orders</p>
          )}

          {activeTab === "history" && (
            <div className="p-2">
              {history.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No history</p>
              ) : (
                history.map((trade) => {
                  const isProfit = trade.pnl >= 0;
                  return (
                    <div key={trade.id} className="mx-1 mb-3 bg-gray-50 rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            trade.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                          }`}>
                            {trade.side === "long" ? "Long" : "Short"}
                          </span>
                          <span className="text-xs text-gray-400">{trade.leverage}x</span>
                        </div>
                        <span className={`text-sm font-bold ${isProfit ? "text-green-500" : "text-red-500"}`}>
                          {isProfit ? "+" : ""}${fmt(trade.pnl)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-y-2">
                        <div>
                          <p className="text-[10px] text-gray-400">Size</p>
                          <p className="text-xs font-medium text-gray-700">${fmt(trade.size)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400">Entry</p>
                          <p className="text-xs font-medium text-gray-700">${fmt(trade.entryPrice, 1)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">Close</p>
                          <p className="text-xs font-medium text-gray-700">${fmt(trade.closePrice, 1)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leverage modal */}
      {showLevModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowLevModal(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800">Select Leverage</span>
              <button onClick={() => setShowLevModal(false)}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              {LEVERAGE_OPTIONS.map((lev) => (
                <button
                  key={lev}
                  onClick={() => { setLeverage(lev); setShowLevModal(false); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                    leverage === lev
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-gray-200 text-gray-600 bg-gray-50"
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">Higher leverage = higher risk. Trade responsibly.</p>
          </div>
        </div>
      )}
    </div>
  );
}
