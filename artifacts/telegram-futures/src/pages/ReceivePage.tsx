import { useState } from "react";
import { useTrading } from "../contexts/TradingContext";
import { IconChevronLeft, IconChevronDown } from "@tabler/icons-react";

const DEPOSIT_ADDRESS = "0x742d35Cc6634C0532925a3b8D4C9A7C9f8A1B2E";

interface ReceivePageProps {
  onBack: () => void;
}

export function ReceivePage({ onBack }: ReceivePageProps) {
  const { setSpotUsdtBalance, setBnbBalance, addWalletTx } = useTrading();
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
      setSpotUsdtBalance((b) => parseFloat((b + amount).toFixed(5)));
      showToast(`+${amount.toFixed(2)} USDT deposited to Spot`);
    } else {
      setBnbBalance((b) => parseFloat((b + amount).toFixed(5)));
      showToast(`+${amount.toFixed(4)} BNB deposited`);
    }
    addWalletTx({ type: "deposit", asset: selectedAsset, amount, address: DEPOSIT_ADDRESS });
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
          <IconChevronLeft size={22} stroke={2.5} />
        </button>
        <span className="font-bold text-[#1A1A1A] text-base">Receive / Deposit</span>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Asset dropdown */}
        <div>
          <p className="text-xs font-semibold text-[#888888] mb-2 uppercase tracking-wide">Select Asset</p>
          <div className="relative">
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value as "USDT" | "BNB")}
              className="w-full appearance-none bg-[#F5F3EA] border border-[#D4AF37] rounded-xl px-4 py-3 text-sm font-semibold text-[#333333] outline-none cursor-pointer pr-10"
              style={{ WebkitAppearance: 'none' }}
            >
              <option value="USDT">USDT — Tether USD</option>
              <option value="BNB">BNB — BNB Chain</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#C9A227]">
              <IconChevronDown size={16} stroke={2.5} />
            </div>
          </div>
        </div>

        {/* Network badge */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#D4AF37] bg-[#F5F0DC]">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-[#888888]">Network</p>
            <p className="text-xs font-semibold text-[#333333]">Binance Smart Chain (BEP-20)</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="panel-silver border border-[#D4AF37] rounded-2xl p-5 flex flex-col items-center">
          <div className="w-36 h-36 rounded-xl border-4 border-[#D4AF37] bg-white flex items-center justify-center mb-3 overflow-hidden">
            <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" fill="white" />
              <rect x="8" y="8" width="30" height="30" rx="3" fill="#1A1A1A" />
              <rect x="12" y="12" width="22" height="22" rx="2" fill="white" />
              <rect x="16" y="16" width="14" height="14" rx="1" fill="#1A1A1A" />
              <rect x="82" y="8" width="30" height="30" rx="3" fill="#1A1A1A" />
              <rect x="86" y="12" width="22" height="22" rx="2" fill="white" />
              <rect x="90" y="16" width="14" height="14" rx="1" fill="#1A1A1A" />
              <rect x="8" y="82" width="30" height="30" rx="3" fill="#1A1A1A" />
              <rect x="12" y="86" width="22" height="22" rx="2" fill="white" />
              <rect x="16" y="90" width="14" height="14" rx="1" fill="#1A1A1A" />
              <rect x="44" y="8" width="4" height="4" fill="#1A1A1A" /><rect x="52" y="8" width="4" height="4" fill="#1A1A1A" />
              <rect x="60" y="8" width="4" height="4" fill="#1A1A1A" /><rect x="44" y="16" width="4" height="4" fill="#1A1A1A" />
              <rect x="56" y="16" width="4" height="4" fill="#1A1A1A" /><rect x="68" y="16" width="4" height="4" fill="#1A1A1A" />
              <rect x="48" y="24" width="4" height="4" fill="#1A1A1A" /><rect x="60" y="24" width="4" height="4" fill="#1A1A1A" />
              <rect x="8" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="16" y="44" width="4" height="4" fill="#1A1A1A" />
              <rect x="28" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="8" y="52" width="4" height="4" fill="#1A1A1A" />
              <rect x="20" y="52" width="4" height="4" fill="#1A1A1A" /><rect x="32" y="52" width="4" height="4" fill="#1A1A1A" />
              <rect x="12" y="60" width="4" height="4" fill="#1A1A1A" /><rect x="24" y="60" width="4" height="4" fill="#1A1A1A" />
              <rect x="44" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="52" y="44" width="4" height="4" fill="#1A1A1A" />
              <rect x="60" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="68" y="44" width="4" height="4" fill="#1A1A1A" />
              <rect x="76" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="48" y="52" width="4" height="4" fill="#1A1A1A" />
              <rect x="64" y="52" width="4" height="4" fill="#1A1A1A" /><rect x="44" y="60" width="4" height="4" fill="#1A1A1A" />
              <rect x="56" y="60" width="4" height="4" fill="#1A1A1A" /><rect x="72" y="60" width="4" height="4" fill="#1A1A1A" />
              <rect x="84" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="96" y="44" width="4" height="4" fill="#1A1A1A" />
              <rect x="108" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="88" y="52" width="4" height="4" fill="#1A1A1A" />
              <rect x="100" y="52" width="4" height="4" fill="#1A1A1A" /><rect x="84" y="60" width="4" height="4" fill="#1A1A1A" />
              <rect x="96" y="60" width="4" height="4" fill="#1A1A1A" /><rect x="108" y="60" width="4" height="4" fill="#1A1A1A" />
              <rect x="44" y="76" width="4" height="4" fill="#1A1A1A" /><rect x="56" y="76" width="4" height="4" fill="#1A1A1A" />
              <rect x="68" y="76" width="4" height="4" fill="#1A1A1A" /><rect x="48" y="84" width="4" height="4" fill="#1A1A1A" />
              <rect x="60" y="84" width="4" height="4" fill="#1A1A1A" /><rect x="72" y="84" width="4" height="4" fill="#1A1A1A" />
              <rect x="44" y="92" width="4" height="4" fill="#1A1A1A" /><rect x="52" y="100" width="4" height="4" fill="#1A1A1A" />
              <rect x="64" y="92" width="4" height="4" fill="#1A1A1A" /><rect x="76" y="100" width="4" height="4" fill="#1A1A1A" />
              <rect x="84" y="76" width="4" height="4" fill="#1A1A1A" /><rect x="100" y="76" width="4" height="4" fill="#1A1A1A" />
              <rect x="92" y="84" width="4" height="4" fill="#1A1A1A" /><rect x="108" y="84" width="4" height="4" fill="#1A1A1A" />
              <rect x="84" y="92" width="4" height="4" fill="#1A1A1A" /><rect x="96" y="96" width="4" height="4" fill="#1A1A1A" />
              <rect x="108" y="92" width="4" height="4" fill="#1A1A1A" />
              <rect x="51" y="51" width="18" height="18" rx="4" fill="#D4AF37" />
              <text x="60" y="64" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">₿</text>
            </svg>
          </div>

          <p className="text-[10px] text-[#888888] mb-1.5">{selectedAsset} · BEP-20 Deposit Address</p>
          <div className="w-full bg-[#EEECDC] rounded-xl px-3 py-2.5 flex items-center gap-2 border border-[#D8D0A8]">
            <p className="text-[11px] font-mono text-[#333333] flex-1 break-all">{DEPOSIT_ADDRESS}</p>
            <button onClick={handleCopy} className="flex-shrink-0 btn-3d-gold px-2.5 py-1 rounded-lg text-[10px]">
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-[#FFF8E0] border border-[#F0D060] rounded-xl px-4 py-3">
          <p className="text-[11px] text-[#8B6914] leading-relaxed">
            ⚠ Only send <strong>{selectedAsset}</strong> on the <strong>Binance Smart Chain (BEP-20)</strong> network. Sending other assets or using a different network may result in permanent loss.
          </p>
        </div>

        {/* Simulate deposit */}
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
