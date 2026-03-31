import { useState, useCallback, useEffect } from "react";
import { useBinancePrice } from "../hooks/useBinancePrice";
import {
  useTradingStore,
  type Position,
  calcLiqPrice,
  calcEffectivePosition,
  getMaxNotional,
} from "../hooks/useTradingStore";
import { CandleChart } from "../components/CandleChart";

type OrderType = "limit" | "market";
type TabType = "position" | "orders" | "history";

const LEVERAGE_OPTIONS = [50, 100, 200];
const SLIDER_MARKS = [0, 25, 50, 75, 100];

const INTERVALS = [
  { label: "5m", value: "5m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
];

function fmt(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(3) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return fmt(n, 2);
}

// ── SL/TP Edit Modal ──────────────────────────────────────────────
function SlTpModal({
  pos,
  onSave,
  onClose,
}: {
  pos: Position;
  onSave: (sl?: number, tp?: number) => void;
  onClose: () => void;
}) {
  const [sl, setSl] = useState(pos.sl?.toString() ?? "");
  const [tp, setTp] = useState(pos.tp?.toString() ?? "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div className="w-full rounded-t-2xl p-5 max-w-md mx-auto panel-silver border-t border-[#D4AF37]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-[#1A1A1A]">Edit SL / TP</span>
          <button onClick={onClose} className="text-[#888888]">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            className="flex-1 py-3 rounded-xl text-sm btn-3d-silver">
            Clear
          </button>
          <button
            onClick={() => {
              onSave(
                sl && parseFloat(sl) > 0 ? parseFloat(sl) : undefined,
                tp && parseFloat(tp) > 0 ? parseFloat(tp) : undefined
              );
              onClose();
            }}
            className="flex-1 py-3 rounded-xl text-sm btn-3d-gold">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Position Card ─────────────────────────────────────────────────
function PositionCard({
  pos, currentPrice, onClose, onEditSlTp, getPnl,
}: {
  pos: Position;
  currentPrice: number;
  onClose: () => void;
  onEditSlTp: () => void;
  getPnl: (p: Position, price: number) => number;
}) {
  const pnl    = getPnl(pos, currentPrice);
  const pnlPct = (pnl / pos.margin) * 100;
  const profit = pnl >= 0;

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

      <div className="grid grid-cols-3 gap-y-3 mb-3">
        <div>
          <p className="text-[10px] text-[#888888] mb-0.5">Max (Pos.)</p>
          <p className="text-xs font-semibold text-[#333333]">${fmtCompact(pos.notional)}</p>
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
          <p className="text-[10px] text-[#888888] mb-0.5">Cost</p>
          <p className="text-xs font-semibold text-[#333333]">${fmt(pos.margin, 5)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-[#888888] mb-0.5">Liq. Price</p>
          <p className="text-xs font-semibold text-[#C9A227]">
            {pos.liquidationPrice > 0 ? `$${fmt(pos.liquidationPrice, 1)}` : "No Liq."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#888888] mb-0.5">PnL</p>
          <p className={`text-xs font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
            {profit ? "+" : ""}${fmt(pnl)} ({profit ? "+" : ""}{pnlPct.toFixed(2)}%)
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
        </div>
        <button onClick={onEditSlTp}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full btn-3d-gold" style={{ fontSize: '10px', padding: '4px 10px' }}>
          Edit SL/TP
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export function FuturesPage() {
  const { price, priceChangePercent, candles, interval, setInterval } = useBinancePrice("BTCUSDT");
  const {
    balance, positions, pendingOrders, history,
    openPosition, placeLimitOrder, cancelPendingOrder, checkPendingOrders,
    closePosition, updateSlTp, getPnl,
  } = useTradingStore();

  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [marginInput, setMarginInput] = useState("");
  const [leverage, setLeverage]   = useState(50);
  const [sliderValue, setSliderValue] = useState(0);
  const [limitPriceInput, setLimitPriceInput] = useState("");

  const [showSlTpEntry, setShowSlTpEntry] = useState(false);
  const [entrySl, setEntrySl] = useState("");
  const [entryTp, setEntryTp] = useState("");

  const [activeTab, setActiveTab]     = useState<TabType>("position");
  const [showLevModal, setShowLevModal] = useState(false);
  const [editingPos, setEditingPos]   = useState<Position | null>(null);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  const priceDisplay = price > 0
    ? "$" + price.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : "$...";

  const entryPrice = orderType === "market"
    ? price
    : (parseFloat(limitPriceInput) > 0 ? parseFloat(limitPriceInput) : price);

  const rawMargin = parseFloat(marginInput) || 0;

  const { notional: effectiveNotional, margin: effectiveCost } =
    rawMargin > 0 && leverage > 0
      ? calcEffectivePosition(rawMargin, leverage)
      : { notional: 0, margin: 0 };

  const tierMax = getMaxNotional(leverage);
  const isCapped = rawMargin > 0 && (rawMargin * leverage) > tierMax;

  function liqPreview(tradeSide: "long" | "short"): string {
    if (effectiveNotional <= 0 || entryPrice <= 0) return "--";
    const liq = calcLiqPrice(tradeSide, entryPrice, effectiveNotional, effectiveCost, "Cross", balance);
    if (tradeSide === "long" && liq <= 0) return "No Liq.";
    return "$" + fmt(liq, 1);
  }

  const longLiqPreview  = liqPreview("long");
  const shortLiqPreview = liqPreview("short");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    if (price > 0 && pendingOrders.length > 0) {
      checkPendingOrders(price, balance);
    }
  }, [price]);

  const handleMarginChange = useCallback((v: string) => {
    const clean = v.replace(/[^0-9.]/g, "");
    setMarginInput(clean);
    const num = parseFloat(clean) || 0;
    setSliderValue(balance > 0 ? Math.min(Math.round((num / balance) * 100), 100) : 0);
  }, [balance]);

  const handleSliderChange = useCallback((pct: number) => {
    setSliderValue(pct);
    const m = (balance * pct) / 100;
    setMarginInput(m > 0 ? m.toFixed(5) : "");
  }, [balance]);

  const handleSubmit = (tradeSide: "long" | "short") => {
    if (price <= 0) return showToast("Price not loaded yet", false);

    const sl = parseFloat(entrySl) || undefined;
    const tp = parseFloat(entryTp) || undefined;

    const isLimitImmediateFill =
      orderType === "limit"
        ? (tradeSide === "long"
            ? entryPrice >= price
            : entryPrice <= price)
        : false;

    if (orderType === "market" || isLimitImmediateFill) {
      const fillPrice = orderType === "market" ? price : entryPrice;
      const result = openPosition(tradeSide, rawMargin, fillPrice, leverage, "Cross", sl, tp, balance);
      if (result.success) {
        setMarginInput(""); setSliderValue(0);
        setEntrySl(""); setEntryTp("");
        setActiveTab("position");
        showToast(`${tradeSide === "long" ? "Long" : "Short"} opened @$${Math.round(fillPrice).toLocaleString()}`, true);
      } else {
        showToast(result.message, false);
      }
    } else {
      const result = placeLimitOrder(tradeSide, rawMargin, entryPrice, leverage, sl, tp, balance);
      if (result.success) {
        setMarginInput(""); setSliderValue(0);
        setEntrySl(""); setEntryTp("");
        setActiveTab("orders");
        showToast(`Limit ${tradeSide === "long" ? "Long" : "Short"} pending @$${Math.round(entryPrice).toLocaleString()}`, true);
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

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#C8B040] flex-shrink-0 panel-header">
        <div className="p-1 w-[26px] h-[26px]" />
        <div />
        <div className="flex items-center gap-2">
          <div className="p-1 w-[26px] h-[26px]" />
          <div className="p-1 w-[26px] h-[26px]" />
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center px-4 py-2 flex-shrink-0 panel-header border-b border-[#D8D0A0]">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[#1A0F00] text-xs font-bold mr-2 btn-3d-gold"
          style={{ width: 28, height: 28, flexShrink: 0 }}>₿</div>
        <button className="flex items-center gap-1 rounded-lg px-2 py-1 border border-[#D4AF37] bg-[#F5EDD0]">
          <span className="text-sm font-semibold text-[#333333]">BTC/USDT</span>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
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
      <div className="flex-1 overflow-y-auto">

        {/* Trade panel */}
        <div className="mx-3 mt-3 panel-card rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #D4AF37' }}>

          {/* Leverage selector */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#888888] font-medium">Cross Margin</span>
            <button onClick={() => setShowLevModal(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-3d-gold active:scale-[0.98] transition-all">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
              </svg>
              Leverage {leverage}x
            </button>
          </div>

          {/* Limit / Market tabs */}
          <div className="flex rounded-xl border border-[#C8C0A0] p-1 mb-4 bg-[#E8E4D0]">
            <button onClick={() => setOrderType("limit")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                orderType === "limit" ? "btn-3d-gold" : "text-[#888888]"
              }`}>
              Limit
            </button>
            <button onClick={() => setOrderType("market")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                orderType === "market" ? "btn-3d-gold" : "text-[#888888]"
              }`}>
              Market
            </button>
          </div>

          {/* Available */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#777777]">Avail.</span>
            <span className="text-sm font-semibold text-[#333333]">${fmt(balance, 5)} USDT</span>
          </div>

          {/* Margin input */}
          <div className="rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3 mb-1 bg-[#F5F3EA]">
            <span className="text-sm text-[#888888] mr-3 flex-shrink-0">Margin</span>
            <input
              type="number"
              value={marginInput}
              onChange={(e) => handleMarginChange(e.target.value)}
              className="flex-1 text-right text-sm font-medium text-[#333333] bg-transparent outline-none"
              placeholder="0.00000" min="0" step="0.00001"
            />
            <span className="text-sm text-[#888888] ml-2 flex-shrink-0">USDT</span>
          </div>

          {/* Tier cap notice */}
          {isCapped && (
            <div className="flex justify-end mb-2 pr-1">
              <span className="text-[10px] text-[#C9A227] font-medium">
                ⚠ Max position capped at ${fmtCompact(tierMax)} for {leverage}x
              </span>
            </div>
          )}
          {!isCapped && <div className="mb-2" />}

          {/* Limit price input */}
          {orderType === "limit" && (
            <div className="rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3 mb-3 bg-[#F5F3EA]">
              <span className="text-sm text-[#888888] mr-3 flex-shrink-0">Price</span>
              <input
                type="number"
                value={limitPriceInput}
                onChange={(e) => setLimitPriceInput(e.target.value)}
                onFocus={(e) => { if (!limitPriceInput && price > 0) setLimitPriceInput(Math.round(price).toString()); e.target.select(); }}
                placeholder={price > 0 ? Math.round(price).toString() : "0"}
                className="flex-1 text-right text-sm font-medium text-[#333333] bg-transparent outline-none"
                min="0" step="1"
              />
              <span className="text-sm text-[#888888] ml-2 flex-shrink-0">USDT</span>
            </div>
          )}

          {/* Slider with % labels */}
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
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d={showSlTpEntry ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
            </svg>
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
                  Max {fmtCompact(effectiveNotional)} · Cost {fmt(effectiveCost, 2)} · Liq {longLiqPreview}
                </div>
              )}
            </button>
            <button
              onClick={() => handleSubmit("short")}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all text-left px-4 btn-3d-short">
              <div className="font-bold">Open Short</div>
              {effectiveNotional > 0 && (
                <div className="text-xs text-red-100 font-normal mt-0.5">
                  Max {fmtCompact(effectiveNotional)} · Cost {fmt(effectiveCost, 2)} · Liq {shortLiqPreview}
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
            <div className="p-2">
              {positions.length === 0
                ? <p className="py-8 text-center text-sm text-[#AAAAAA]">No positions</p>
                : positions.map((pos) => (
                  <PositionCard key={pos.id} pos={pos} currentPrice={price}
                    onClose={() => closePosition(pos.id, price)}
                    onEditSlTp={() => setEditingPos(pos)}
                    getPnl={getPnl} />
                ))
              }
            </div>
          )}

          {activeTab === "orders" && (
            <div className="p-2">
              {pendingOrders.length === 0
                ? <p className="py-8 text-center text-sm text-[#AAAAAA]">No pending orders</p>
                : pendingOrders.map((order) => (
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
                        <p className="text-xs font-semibold text-[#333333]">${fmt(order.requestedMargin, 5)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-[#888888]">SL</p>
                        <p className={`text-xs font-medium ${order.sl ? "text-red-500" : "text-[#AAAAAA]"}`}>
                          {order.sl ? `$${fmt(order.sl, 1)}` : "--"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#888888]">TP</p>
                        <p className={`text-xs font-medium ${order.tp ? "text-green-600" : "text-[#AAAAAA]"}`}>
                          {order.tp ? `$${fmt(order.tp, 1)}` : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-2">
              {history.length === 0
                ? <p className="py-8 text-center text-sm text-[#AAAAAA]">No history</p>
                : history.map((trade) => {
                  const profit = trade.pnl >= 0;
                  return (
                    <div key={trade.id} className="mx-1 mb-3 rounded-xl border border-[#D8D0A8] p-3 bg-[#EEECE0]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            trade.side === "long" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                          }`}>
                            {trade.side === "long" ? "Long" : "Short"}
                          </span>
                          <span className="text-xs text-[#888888]">{trade.leverage}x</span>
                        </div>
                        <span className={`text-sm font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
                          {profit ? "+" : ""}${fmt(trade.pnl)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-y-2">
                        <div>
                          <p className="text-[10px] text-[#888888]">Max (Pos.)</p>
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
                          <p className="text-[10px] text-[#888888]">Cost</p>
                          <p className="text-xs font-medium text-[#333333]">${fmt(trade.margin, 2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[#888888]">Leverage</p>
                          <p className="text-xs font-medium text-[#333333]">{trade.leverage}x</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#888888]">PnL%</p>
                          <p className={`text-xs font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
                            {profit ? "+" : ""}{((trade.pnl / trade.margin) * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      </div>

      {/* Leverage modal */}
      {showLevModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowLevModal(false)}>
          <div className="w-full rounded-t-2xl p-5 max-w-md mx-auto panel-silver border-t border-[#D4AF37]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-[#1A1A1A]">Select Leverage</span>
              <button onClick={() => setShowLevModal(false)} className="text-[#888888]">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              {LEVERAGE_OPTIONS.map((lev) => (
                <button key={lev} onClick={() => { setLeverage(lev); setShowLevModal(false); setMarginInput(""); setSliderValue(0); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    leverage === lev
                      ? "btn-3d-gold"
                      : "btn-3d-silver"
                  }`}>
                  {lev}x
                </button>
              ))}
            </div>
            <div className="rounded-xl p-3 space-y-1.5 bg-[#ECECEC] border border-[#D0CCA8]">
              <p className="text-xs text-[#888888] font-medium mb-2">Max Position by Leverage</p>
              {LEVERAGE_OPTIONS.map((lev) => (
                <div key={lev} className="flex justify-between">
                  <span className={`text-xs font-medium ${lev === leverage ? "text-[#C9A227]" : "text-[#666666]"}`}>{lev}x</span>
                  <span className={`text-xs ${lev === leverage ? "text-[#C9A227] font-semibold" : "text-[#888888]"}`}>
                    Max ${fmtCompact(getMaxNotional(lev))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
