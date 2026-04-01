import { useState } from "react";
import { useTrading } from "../contexts/TradingContext";

interface SendPageProps {
  onBack: () => void;
  bnbPrice: number;
}

const NETWORK_FEE_BNB = 0.0005;

export function SendPage({ onBack, bnbPrice }: SendPageProps) {
  const { balance, bnbBalance, withdrawFunds, setBnbBalance } = useTrading();
  const [asset, setAsset] = useState<"USDT" | "BNB">("USDT");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [toast, setToast] = useState<string | null>(null);

  const maxAmount = asset === "USDT"
    ? Math.max(0, balance - NETWORK_FEE_BNB * bnbPrice)
    : Math.max(0, bnbBalance - NETWORK_FEE_BNB);
  const parsedAmount = parseFloat(amount) || 0;
  const networkFeeUsd = NETWORK_FEE_BNB * bnbPrice;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleMax = () => setAmount(maxAmount.toFixed(asset === "USDT" ? 2 : 6));

  const handleContinue = () => {
    if (!address || address.length < 10) return showToast("Enter a valid destination address");
    if (parsedAmount <= 0) return showToast("Enter amount to send");
    if (asset === "USDT" && parsedAmount > balance) return showToast("Insufficient USDT balance");
    if (asset === "BNB" && parsedAmount > bnbBalance) return showToast("Insufficient BNB balance");
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (asset === "USDT") {
      const ok = withdrawFunds(parsedAmount, balance);
      if (!ok) return showToast("Insufficient balance");
    } else {
      if (parsedAmount > bnbBalance) return showToast("Insufficient BNB");
      setBnbBalance((b) => parseFloat((b - parsedAmount).toFixed(6)));
    }
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="flex flex-col h-full page-bg">
        <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
          <button onClick={onBack} className="mr-3 text-[#888888]">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-[#1A1A1A] text-base">Send</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full btn-3d-long flex items-center justify-center mb-5">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Withdrawal Submitted</h2>
          <p className="text-sm text-[#666666] mb-1">
            <span className="font-semibold text-[#C9A227]">{parsedAmount.toFixed(asset === "USDT" ? 2 : 6)} {asset}</span> is being processed
          </p>
          <p className="text-xs text-[#888888] mb-6">Usually confirmed within 1–3 minutes on BSC</p>
          <div className="w-full bg-[#F5F0DC] border border-[#D4AF37] rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">To</span>
              <span className="text-xs font-mono text-[#333333]">{address.slice(0, 10)}...{address.slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">Network</span>
              <span className="text-xs font-semibold text-[#333333]">BEP-20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">Network Fee</span>
              <span className="text-xs text-[#333333]">{NETWORK_FEE_BNB} BNB (~${networkFeeUsd.toFixed(2)})</span>
            </div>
          </div>
          <button onClick={onBack} className="mt-6 w-full py-3.5 rounded-xl btn-3d-gold text-sm">
            Back to Portfolio
          </button>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="flex flex-col h-full page-bg">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-red-500">
            {toast}
          </div>
        )}
        <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
          <button onClick={() => setStep("form")} className="mr-3 text-[#888888]">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-[#1A1A1A] text-base">Confirm Send</span>
        </div>
        <div className="flex-1 px-4 py-5 space-y-4">
          <div className="panel-card rounded-2xl p-5 border border-[#D4AF37] text-center">
            <p className="text-xs text-[#888888] mb-1">You are sending</p>
            <p className="text-3xl font-bold text-[#B8860B]">{parsedAmount.toFixed(asset === "USDT" ? 2 : 6)}</p>
            <p className="text-lg font-semibold text-[#666666]">{asset}</p>
          </div>
          <div className="panel-silver border border-[#D4AF37] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">To Address</span>
              <span className="text-sm font-mono text-[#333333] max-w-[180px] truncate">{address}</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">Network</span>
              <span className="text-sm font-semibold text-[#333333]">BEP-20 (BSC)</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">Network Fee</span>
              <span className="text-sm text-[#333333]">{NETWORK_FEE_BNB} BNB ≈ ${networkFeeUsd.toFixed(2)}</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-[#333333]">You Receive</span>
              <span className="text-sm font-bold text-[#C9A227]">
                {parsedAmount.toFixed(asset === "USDT" ? 2 : 6)} {asset}
              </span>
            </div>
          </div>
          <div className="bg-[#FFF8E0] border border-[#F0D060] rounded-xl px-4 py-3">
            <p className="text-[11px] text-[#8B6914]">⚠ Transactions on BSC are irreversible. Double-check the address before confirming.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("form")} className="flex-1 py-3.5 rounded-xl text-sm btn-3d-silver">
              Cancel
            </button>
            <button onClick={handleConfirm} className="flex-1 py-3.5 rounded-xl text-sm btn-3d-gold">
              Confirm Send
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
        <span className="font-bold text-[#1A1A1A] text-base">Send / Withdraw</span>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Asset selector */}
        <div>
          <p className="text-xs font-semibold text-[#888888] mb-2 uppercase tracking-wide">Asset</p>
          <div className="flex gap-2">
            {(["USDT", "BNB"] as const).map((a) => (
              <button key={a} onClick={() => { setAsset(a); setAmount(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  asset === a ? "btn-3d-gold" : "btn-3d-silver"
                }`}>
                <span className="block text-current">{a}</span>
                <span className={`text-[10px] font-normal ${asset === a ? "text-[#5A3A00]" : "text-[#888888]"}`}>
                  {a === "USDT" ? `${balance.toFixed(2)}` : `${bnbBalance.toFixed(4)}`} available
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Network */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#D4AF37] bg-[#F5F0DC]">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-[#888888]">Network</p>
            <p className="text-xs font-semibold text-[#333333]">Binance Smart Chain (BEP-20)</p>
          </div>
        </div>

        {/* Address input */}
        <div>
          <p className="text-xs font-semibold text-[#888888] mb-2">Destination Address</p>
          <div className="bg-[#F5F3EA] rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... BEP-20 address"
              className="flex-1 text-sm font-mono text-[#333333] bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Amount input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#888888]">Amount</p>
            <span className="text-xs text-[#888888]">
              Available: <span className="font-semibold text-[#C9A227]">
                {asset === "USDT" ? `${balance.toFixed(2)} USDT` : `${bnbBalance.toFixed(4)} BNB`}
              </span>
            </span>
          </div>
          <div className="bg-[#F5F3EA] rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-lg font-semibold text-[#333333] bg-transparent outline-none"
            />
            <span className="text-sm text-[#888888] mr-3">{asset}</span>
            <button onClick={handleMax} className="btn-3d-gold px-2 py-1 rounded-lg text-[10px]">Max</button>
          </div>
          {parsedAmount > 0 && (
            <p className="text-[11px] text-[#888888] mt-1 pl-1">
              ≈ ${asset === "USDT" ? parsedAmount.toFixed(2) : (parsedAmount * bnbPrice).toFixed(2)} USD
            </p>
          )}
        </div>

        {/* Fee estimate */}
        <div className="bg-[#EEECDC] rounded-xl px-4 py-3 flex items-center justify-between border border-[#D8D0A8]">
          <span className="text-xs text-[#888888]">Estimated Network Fee</span>
          <span className="text-xs font-semibold text-[#333333]">
            {NETWORK_FEE_BNB} BNB ≈ ${networkFeeUsd.toFixed(2)}
          </span>
        </div>

        <button onClick={handleContinue}
          className="w-full py-3.5 rounded-xl text-sm btn-3d-gold">
          Continue
        </button>
      </div>
    </div>
  );
}
