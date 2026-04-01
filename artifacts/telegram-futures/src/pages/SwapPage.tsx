import { useState, useMemo } from "react";
import { useTrading } from "../contexts/TradingContext";

interface SwapPageProps {
  onBack: () => void;
  bnbPrice: number;
}

const SWAP_FEE = 0.001;

export function SwapPage({ onBack, bnbPrice }: SwapPageProps) {
  const { balance, bnbBalance, depositFunds, withdrawFunds, setBnbBalance } = useTrading();

  const [fromAsset, setFromAsset] = useState<"USDT" | "BNB">("USDT");
  const [fromAmount, setFromAmount] = useState("");
  const [step, setStep] = useState<"form" | "done">("form");
  const [lastSwap, setLastSwap] = useState<{ from: string; to: string; fee: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const toAsset = fromAsset === "USDT" ? "BNB" : "USDT";
  const parsedFrom = parseFloat(fromAmount) || 0;

  const toAmount = useMemo(() => {
    if (parsedFrom <= 0 || bnbPrice <= 0) return 0;
    const raw = fromAsset === "USDT" ? parsedFrom / bnbPrice : parsedFrom * bnbPrice;
    return raw * (1 - SWAP_FEE);
  }, [parsedFrom, fromAsset, bnbPrice]);

  const feeAmount = useMemo(() => {
    if (parsedFrom <= 0 || bnbPrice <= 0) return 0;
    const raw = fromAsset === "USDT" ? parsedFrom / bnbPrice : parsedFrom * bnbPrice;
    return raw * SWAP_FEE;
  }, [parsedFrom, fromAsset, bnbPrice]);

  const maxFrom = fromAsset === "USDT" ? balance : bnbBalance;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSwitch = () => {
    setFromAsset((a) => (a === "USDT" ? "BNB" : "USDT"));
    setFromAmount("");
  };

  const handleMax = () => setFromAmount(maxFrom.toFixed(fromAsset === "USDT" ? 2 : 6));

  const handleSwap = () => {
    if (parsedFrom <= 0) return showToast("Enter a valid amount");
    if (fromAsset === "USDT") {
      if (parsedFrom > balance) return showToast("Insufficient USDT balance");
      const ok = withdrawFunds(parsedFrom, balance);
      if (!ok) return showToast("Insufficient balance");
      setBnbBalance((b) => parseFloat((b + toAmount).toFixed(6)));
      setLastSwap({ from: `${parsedFrom.toFixed(2)} USDT`, to: `${toAmount.toFixed(6)} BNB`, fee: `${feeAmount.toFixed(6)} BNB` });
    } else {
      if (parsedFrom > bnbBalance) return showToast("Insufficient BNB balance");
      setBnbBalance((b) => parseFloat((b - parsedFrom).toFixed(6)));
      depositFunds(toAmount);
      setLastSwap({ from: `${parsedFrom.toFixed(6)} BNB`, to: `${toAmount.toFixed(2)} USDT`, fee: `${feeAmount.toFixed(2)} USDT` });
    }
    setFromAmount("");
    setStep("done");
  };

  if (step === "done" && lastSwap) {
    return (
      <div className="flex flex-col h-full page-bg">
        <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
          <button onClick={onBack} className="mr-3 text-[#888888]">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-[#1A1A1A] text-base">Swap</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full btn-3d-gold flex items-center justify-center mb-5">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Swap Successful!</h2>
          <p className="text-sm text-[#666666] mb-6">Your swap has been executed</p>
          <div className="w-full panel-card border border-[#D4AF37] rounded-2xl p-4 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">You Swapped</span>
              <span className="text-sm font-bold text-[#C9A227]">{lastSwap.from}</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">You Received</span>
              <span className="text-sm font-bold text-green-600">{lastSwap.to}</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">Fee (0.1%)</span>
              <span className="text-sm text-[#888888]">{lastSwap.fee}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-6 w-full">
            <button onClick={() => setStep("form")} className="flex-1 py-3.5 rounded-xl text-sm btn-3d-silver">
              Swap Again
            </button>
            <button onClick={onBack} className="flex-1 py-3.5 rounded-xl text-sm btn-3d-gold">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-red-500">
          {toast}
        </div>
      )}
      <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack} className="mr-3 text-[#888888]">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-[#1A1A1A] text-base">Swap</span>
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5E280] text-[#8B6914]">Fee 0.1%</span>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Rate info */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-xs text-[#888888]">1 BNB</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#C9A227" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="text-xs font-semibold text-[#C9A227]">${bnbPrice > 0 ? bnbPrice.toFixed(2) : "---"} USDT</span>
        </div>

        {/* From panel */}
        <div className="panel-card rounded-2xl p-4 border border-[#D4AF37] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#888888] uppercase tracking-wide">From</span>
            <span className="text-xs text-[#888888]">
              Balance: <span className="font-semibold text-[#C9A227]">
                {fromAsset === "USDT" ? `${balance.toFixed(2)} USDT` : `${bnbBalance.toFixed(4)} BNB`}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm btn-3d-gold">
              {fromAsset === "USDT" ? "$" : "B"}
            </div>
            <div className="flex-1">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl font-bold text-[#1A1A1A] bg-transparent outline-none"
              />
              <p className="text-xs text-[#888888]">{fromAsset}</p>
            </div>
            <button onClick={handleMax} className="btn-3d-gold px-2 py-1 rounded-lg text-[10px]">Max</button>
          </div>
        </div>

        {/* Switch button */}
        <div className="flex justify-center">
          <button onClick={handleSwitch}
            className="w-10 h-10 rounded-full btn-3d-gold flex items-center justify-center">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To panel */}
        <div className="panel-silver rounded-2xl p-4 border border-[#D4AF37] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#888888] uppercase tracking-wide">To (estimated)</span>
            <span className="text-xs text-[#888888]">
              Balance: <span className="font-semibold text-[#C9A227]">
                {toAsset === "USDT" ? `${balance.toFixed(2)} USDT` : `${bnbBalance.toFixed(4)} BNB`}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm btn-3d-silver">
              {toAsset === "USDT" ? "$" : "B"}
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {toAmount > 0 ? toAmount.toFixed(toAsset === "USDT" ? 2 : 6) : "0.00"}
              </p>
              <p className="text-xs text-[#888888]">{toAsset}</p>
            </div>
          </div>
        </div>

        {/* Swap details */}
        {parsedFrom > 0 && (
          <div className="bg-[#EEECDC] rounded-xl px-4 py-3 space-y-1.5 border border-[#D8D0A8]">
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">Rate</span>
              <span className="text-xs font-medium text-[#333333]">
                {fromAsset === "USDT"
                  ? `1 USDT = ${(1 / bnbPrice).toFixed(6)} BNB`
                  : `1 BNB = ${bnbPrice.toFixed(2)} USDT`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">Fee (0.1%)</span>
              <span className="text-xs text-[#888888]">
                {feeAmount.toFixed(toAsset === "USDT" ? 2 : 6)} {toAsset}
              </span>
            </div>
          </div>
        )}

        <button onClick={handleSwap}
          className="w-full py-3.5 rounded-xl text-sm btn-3d-gold">
          Swap {fromAsset} → {toAsset}
        </button>
      </div>
    </div>
  );
}
