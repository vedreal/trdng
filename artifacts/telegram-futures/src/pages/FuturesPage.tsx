import { useState, useCallback } from "react";
import { useBinancePrice } from "../hooks/useBinancePrice";
import { CandleChart } from "../components/CandleChart";

type OrderSide = "buy" | "sell";
type OrderType = "limit" | "market";
type TabType = "position" | "orders" | "history";

const LEVERAGE_OPTIONS = [5, 10, 20, 40, 50, 75, 100, 125];

const INTERVALS = [
  { label: "5m",  value: "5m" },
  { label: "1h",  value: "1h" },
  { label: "4h",  value: "4h" },
  { label: "1D",  value: "1d" },
];

export function FuturesPage() {
  const { price, priceChangePercent, candles, interval, setInterval } =
    useBinancePrice("BTCUSDT");

  const [side, setSide] = useState<OrderSide>("sell");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(40);
  const [marginMode, setMarginMode] = useState<"Cross" | "Isolated">("Cross");
  const [sliderValue, setSliderValue] = useState(45);
  const [activeTab, setActiveTab] = useState<TabType>("position");
  const [showLeverageModal, setShowLeverageModal] = useState(false);

  const priceDisplay =
    price > 0
      ? "$" + price.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : "$...";
  const limitPrice = price > 0 ? Math.round(price).toString() : "...";

  const parsedAmount = parseFloat(amount) || 0;

  const liqPrice =
    parsedAmount > 0 && price > 0
      ? side === "buy"
        ? (price * (1 - 1 / leverage * 0.9)).toFixed(1)
        : (price * (1 + 1 / leverage * 0.9)).toFixed(1)
      : "--";

  const marginRequired =
    parsedAmount > 0 && price > 0
      ? (parsedAmount * price / leverage).toFixed(2)
      : "0.00";

  const handleAmountChange = useCallback((v: string) => {
    setAmount(v.replace(/[^0-9.]/g, ""));
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f5ede0] overflow-hidden">

      {/* ── Header (no title) ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button className="p-1">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* spacer – no title */}
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

      {/* ── Price row ── */}
      <div className="flex items-center px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold mr-2">
          ₿
        </div>
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

      {/* ── Interval selector ── */}
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

      {/* ── Chart ── */}
      <div className="bg-white flex-shrink-0" style={{ height: 170 }}>
        <CandleChart candles={candles} currentPrice={price} />
      </div>

      {/* ── Margin / leverage row ── */}
      <div className="flex items-center px-4 py-2 flex-shrink-0">
        <button
          onClick={() => setMarginMode(m => m === "Cross" ? "Isolated" : "Cross")}
          className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm mr-2"
        >
          {marginMode}
        </button>
        <button
          onClick={() => setShowLeverageModal(true)}
          className="bg-amber-100 border border-amber-200 rounded-full px-3 py-1.5 text-sm font-bold text-orange-600 shadow-sm"
        >
          {leverage}x
        </button>
      </div>

      {/* ── Scrollable trade area ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Trade panel */}
        <div className="mx-3 bg-[#fdf6ec] border border-amber-100 rounded-2xl p-4 shadow-sm">

          {/* Buy / Sell */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide("buy")}
              className={`flex-1 py-3 rounded-xl font-semibold text-base transition-all ${
                side === "buy"
                  ? "bg-white border-2 border-green-400 text-green-600 shadow-sm"
                  : "text-gray-400"
              }`}
            >
              <span className="text-green-500 mr-1">₿</span> Buy
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`flex-1 py-3 rounded-xl font-semibold text-base transition-all ${
                side === "sell"
                  ? "bg-white border-2 border-orange-400 text-orange-600 shadow-sm"
                  : "text-gray-400"
              }`}
            >
              <span className="text-orange-500 mr-1">₿</span> Sell
            </button>
          </div>

          {/* Available */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Available</span>
            <span className="text-sm font-medium text-gray-700">$0.00</span>
          </div>

          {/* Amount */}
          <div className="bg-white rounded-xl border border-gray-200 flex items-center px-4 py-3 mb-3">
            <span className="text-sm text-gray-400 mr-3 flex-shrink-0">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 text-right text-sm font-medium text-gray-600 bg-transparent outline-none"
              placeholder="0.00"
              min="0"
              step="0.01"
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
              {orderType === "limit" && (
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              )}
            </button>
            <span className="text-sm text-gray-600">Limit</span>
          </div>

          {/* Limit price */}
          {orderType === "limit" && (
            <div className="bg-white rounded-xl border border-gray-200 flex items-center px-4 py-3 mb-3">
              <span className="text-sm text-gray-400 mr-3 flex-shrink-0">Price</span>
              <div className="flex-1 text-right text-sm font-medium text-gray-500">
                {limitPrice}
              </div>
              <span className="text-sm text-gray-400 ml-2 flex-shrink-0">USDC</span>
            </div>
          )}

          {/* Slider */}
          <div className="mb-3 px-1">
            <div className="relative h-6 flex items-center">
              {/* Track background */}
              <div className="absolute inset-x-0 h-[3px] rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-300"
                  style={{ width: `${sliderValue}%` }}
                />
              </div>
              {/* Thumb */}
              <div
                className="absolute w-5 h-5 bg-orange-500 rounded-full border-[2.5px] border-white shadow-md -translate-x-1/2"
                style={{ left: `${sliderValue}%` }}
              />
              {/* Invisible range input on top */}
              <input
                type="range"
                min={0} max={100}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            {/* Tick dots */}
            <div className="flex justify-between mt-2 px-0.5">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setSliderValue(v)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    sliderValue >= v ? "bg-orange-400" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Liq / Margin */}
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">Liq. Price</span>
            <span className="text-xs text-gray-500">{liqPrice}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-xs text-gray-500">Margin Required</span>
            <span className="text-xs text-gray-700">${marginRequired}</span>
          </div>

          {/* Action button */}
          <button
            className={`w-full py-4 rounded-xl text-white font-semibold text-base shadow-sm transition-all active:scale-[0.98] ${
              side === "buy"
                ? "bg-gradient-to-r from-green-400 to-green-500"
                : "bg-gradient-to-r from-orange-300 to-red-400 opacity-90"
            }`}
          >
            {side === "buy" ? "Buy" : "Sell"}
          </button>
        </div>

        {/* Position / Orders / History */}
        <div className="mx-3 mt-3 mb-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="flex">
            {(["position", "orders", "history"] as TabType[]).map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-all border-b-2 ${
                  activeTab === tab
                    ? "text-gray-800 border-orange-500"
                    : "text-gray-400 border-transparent"
                } ${idx > 0 ? "border-l border-gray-100" : ""}`}
              >
                {tab === "position" ? "Position" : tab === "orders" ? "Orders" : "History"}
              </button>
            ))}
          </div>
          <div className="py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-b-2xl">
            {activeTab === "position" && "No positions"}
            {activeTab === "orders"   && "No orders"}
            {activeTab === "history"  && "No history"}
          </div>
        </div>
      </div>

      {/* ── Leverage modal ── */}
      {showLeverageModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowLeverageModal(false)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-5 max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800">Select Leverage</span>
              <button onClick={() => setShowLeverageModal(false)}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {LEVERAGE_OPTIONS.map((lev) => (
                <button
                  key={lev}
                  onClick={() => { setLeverage(lev); setShowLeverageModal(false); }}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    leverage === lev
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-gray-200 text-gray-600 bg-gray-50"
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">
              Max leverage: 125x. Higher leverage = higher risk.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
