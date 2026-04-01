import { useState } from "react";
import { useTrading } from "../contexts/TradingContext";

const DEPOSIT_ADDRESS = "0x742d35Cc6634C0532925a3b8D4C9A7C9f8A1B2E";
const NETWORK = "Binance Smart Chain (BEP-20)";

interface ReceivePageProps {
  onBack: () => void;
}

export function ReceivePage({ onBack }: ReceivePageProps) {
  const { depositFunds, setBnbBalance } = useTrading();
  const [copied, setCopied] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<"USDT" | "BNB">("USDT");
  const [simAmount, setSimAmount] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(DEPOSIT_ADDRESS).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimDeposit = () => {
    const amount = parseFloat(simAmount);
    if (!amount || amount <= 0) return showToast("Enter a valid amount");
    if (selectedAsset === "USDT") {
      depositFunds(amount);
      showToast(`+${amount.toFixed(2)} USDT deposited`);
    } else {
      setBnbBalance((b) => parseFloat((b + amount).toFixed(5)));
      showToast(`+${amount.toFixed(4)} BNB deposited`);
    }
    setSimAmount("");
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-green-500">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack} className="mr-3 text-[#888888]">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-[#1A1A1A] text-base">Receive</span>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Asset selector */}
        <div>
          <p className="text-xs font-semibold text-[#888888] mb-2 uppercase tracking-wide">Select Asset</p>
          <div className="flex gap-2">
            {(["USDT", "BNB"] as const).map((a) => (
              <button key={a} onClick={() => setSelectedAsset(a)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  selectedAsset === a ? "btn-3d-gold" : "btn-3d-silver"
                }`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Network badge */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#D4AF37] bg-[#F5F0DC]">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-[#888888]">Network</p>
            <p className="text-xs font-semibold text-[#333333]">{NETWORK}</p>
          </div>
        </div>

        {/* QR Code placeholder */}
        <div className="panel-silver border border-[#D4AF37] rounded-2xl p-5 flex flex-col items-center">
          <div className="w-36 h-36 rounded-xl border-4 border-[#D4AF37] bg-[#FAFAFA] flex items-center justify-center mb-3"
            style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Simulated QR pattern */}
            <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" fill="white" />
              {/* Top-left finder */}
              <rect x="8" y="8" width="30" height="30" rx="3" fill="#1A1A1A" />
              <rect x="12" y="12" width="22" height="22" rx="2" fill="white" />
              <rect x="16" y="16" width="14" height="14" rx="1" fill="#1A1A1A" />
              {/* Top-right finder */}
              <rect x="82" y="8" width="30" height="30" rx="3" fill="#1A1A1A" />
              <rect x="86" y="12" width="22" height="22" rx="2" fill="white" />
              <rect x="90" y="16" width="14" height="14" rx="1" fill="#1A1A1A" />
              {/* Bottom-left finder */}
              <rect x="8" y="82" width="30" height="30" rx="3" fill="#1A1A1A" />
              <rect x="12" y="86" width="22" height="22" rx="2" fill="white" />
              <rect x="16" y="90" width="14" height="14" rx="1" fill="#1A1A1A" />
              {/* Data dots pattern */}
              {[44,48,52,56,60,64,68,72,76].map((x) =>
                [8,12,16,20,24,28].map((y) =>
                  Math.random() > 0.45 ? <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#1A1A1A" /> : null
                )
              )}
              {[8,12,16,20,24,28,32,36,40].map((y) =>
                [44,48,52,56,60,64,68,72,76].map((x) =>
                  Math.random() > 0.45 ? <rect key={`${x}-${y}b`} x={x} y={y} width="3" height="3" fill="#1A1A1A" /> : null
                )
              )}
              {[44,48,52,56,60,64,68,72,76].map((x) =>
                [44,48,52,56,60,64,68,72,76].map((y) =>
                  (x + y) % 8 < 4 ? <rect key={`${x}-${y}c`} x={x} y={y} width="3" height="3" fill="#1A1A1A" /> : null
                )
              )}
              {/* Gold center logo */}
              <rect x="51" y="51" width="18" height="18" rx="4" fill="#D4AF37" />
              <text x="60" y="63" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">₿</text>
            </svg>
          </div>

          <p className="text-[10px] text-[#888888] mb-1">Deposit Address ({selectedAsset} · BEP-20)</p>
          <div className="w-full bg-[#EEECDC] rounded-xl px-3 py-2.5 flex items-center gap-2 border border-[#D8D0A8]">
            <p className="text-[11px] font-mono text-[#333333] flex-1 break-all">{DEPOSIT_ADDRESS}</p>
            <button onClick={handleCopy} className="flex-shrink-0 btn-3d-gold px-2 py-1 rounded-lg text-[10px]">
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Warning notice */}
        <div className="bg-[#FFF8E0] border border-[#F0D060] rounded-xl px-4 py-3">
          <p className="text-[11px] text-[#8B6914] leading-relaxed">
            ⚠ Only send <strong>{selectedAsset}</strong> on the <strong>Binance Smart Chain (BEP-20)</strong> network to this address. Sending other assets or using another network may result in permanent loss.
          </p>
        </div>

        {/* Simulate deposit (demo feature) */}
        <div className="panel-card rounded-2xl p-4 border border-[#D4AF37]">
          <p className="text-xs font-semibold text-[#888888] mb-2">Simulate Deposit (Demo)</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#F5F3EA] rounded-xl border border-[#C8C0A0] flex items-center px-3 py-2.5">
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                placeholder={`Amount in ${selectedAsset}`}
                className="flex-1 text-sm font-medium text-[#333333] bg-transparent outline-none"
              />
              <span className="text-xs text-[#888888] ml-1 flex-shrink-0">{selectedAsset}</span>
            </div>
            <button onClick={handleSimDeposit} className="btn-3d-gold px-4 py-2.5 rounded-xl text-sm">
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
