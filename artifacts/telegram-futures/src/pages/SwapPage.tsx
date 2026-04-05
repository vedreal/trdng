import { useState, useMemo } from "react";
import { useTrading } from "../contexts/TradingContext";
import { useBinancePrice } from "../hooks/useBinancePrice";
import { useCurrency } from "../contexts/CurrencyContext";
import {
  IconChevronLeft, IconArrowsUpDown, IconCheck, IconX,
  IconSearch,
} from "@tabler/icons-react";

// ─── Coin Config ────────────────────────────────────────────────────────────
type CoinSymbol = "USDT" | "XAUT" | "ETH" | "BNB" | "TON";

const COIN_ICONS: Record<CoinSymbol, string> = {
  USDT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiar6ik6oswrb7ncslxa2aeopdg7ifn252akbcpvd572v7u34dzcqq",
  XAUT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccstl7irrcrvusudyp26zjudtisjc44dz34o3molmxzuwfaizo5m",
  ETH:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccdvf3jvs2kngcddhe6siaca44y3ztru254dor3vocue36gbplw4",
  BNB:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreieg2zkdn3muod7uir7q77lee37cmisxoqqym3sjsm6smfn5wkq2da",
  TON:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreib6wlrvvorkcbkma43liqxrm4dv7hgad4jbqlcjzaa6rynileb7c4",
};

const COIN_NAMES: Record<CoinSymbol, string> = {
  USDT: "Tether USD",
  XAUT: "Tether Gold",
  ETH:  "Ethereum",
  BNB:  "BNB",
  TON:  "Toncoin",
};

const COIN_DEC: Record<CoinSymbol, number> = {
  USDT: 2, XAUT: 6, ETH: 6, BNB: 6, TON: 4,
};

function truncateDec(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

const ALT_COINS: CoinSymbol[] = ["XAUT", "ETH", "BNB", "TON"];

interface FeeConfig {
  feeAsset: CoinSymbol;
  feeUsd: number;
}
const PAIR_FEE: Record<string, FeeConfig> = {
  "XAUT": { feeAsset: "ETH", feeUsd: 1.3 },
  "ETH":  { feeAsset: "ETH", feeUsd: 1.3 },
  "BNB":  { feeAsset: "BNB", feeUsd: 0.5 },
  "TON":  { feeAsset: "TON", feeUsd: 0.7 },
};

const btnGrad = {
  background: "linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,240,180,0.85) 100%)",
  boxShadow: "0 2px 0 rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.6) inset",
};

interface SwapPageProps {
  onBack: () => void;
  bnbPrice: number;
}

function CoinIcon({ symbol, size = 36 }: { symbol: CoinSymbol; size?: number }) {
  return (
    <img
      src={COIN_ICONS[symbol]}
      alt={symbol}
      className="rounded-full flex-shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function CoinPickerModal({
  title, coins, selected, balances, onSelect, onClose,
}: {
  title: string;
  coins: CoinSymbol[];
  selected: CoinSymbol;
  balances: Record<CoinSymbol, number>;
  onSelect: (c: CoinSymbol) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = coins.filter(
    (c) =>
      c.toLowerCase().includes(q.toLowerCase()) ||
      COIN_NAMES[c].toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl flex flex-col"
        style={{ maxHeight: "75vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <span className="text-base font-bold text-[#1A1A1A]">{title}</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0EDE0] text-[#666]">
            <IconX size={16} stroke={2.5} />
          </button>
        </div>
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-[#F5F3EA] rounded-xl px-3 py-2.5">
            <IconSearch size={16} stroke={2} className="text-[#888888] flex-shrink-0" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search coin"
              className="flex-1 text-sm text-[#333333] bg-transparent outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-[#AAAAAA] py-8">No coins found</p>
          ) : filtered.map((coin) => (
            <button
              key={coin}
              onClick={() => onSelect(coin)}
              className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl mb-1 transition-all active:scale-[0.98] ${
                selected === coin ? "bg-[#FFF8D6]" : "hover:bg-[#F5F3EA]"
              }`}
            >
              <CoinIcon symbol={coin} size={40} />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[#1A1A1A]">{coin}</p>
                <p className="text-[11px] text-[#888888]">{COIN_NAMES[coin]}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-[#333333]">
                  {balances[coin].toFixed(COIN_DEC[coin])}
                </p>
                <p className="text-[10px] text-[#888888]">Available</p>
              </div>
              {selected === coin && (
                <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0 ml-1">
                  <span className="text-white text-[10px] font-bold">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SwapPage({ onBack }: SwapPageProps) {
  const { fmtFiat } = useCurrency();
  const {
    spotUsdtBalance, setSpotUsdtBalance,
    bnbBalance,      setBnbBalance,
    xautBalance,     setXautBalance,
    ethBalance,      setEthBalance,
    tonBalance,      setTonBalance,
    addWalletTx,
  } = useTrading();

  const { price: bnbPrice  } = useBinancePrice("BNBUSDT");
  const { price: ethPrice  } = useBinancePrice("ETHUSDT");
  const { price: xautPrice } = useBinancePrice("XAUTUSDT");
  const { price: tonPrice  } = useBinancePrice("TONUSDT");

  const [fromAsset, setFromAsset] = useState<CoinSymbol>("USDT");
  const [altCoin,   setAltCoin  ] = useState<CoinSymbol>("BNB");

  const toAsset: CoinSymbol = fromAsset === "USDT" ? altCoin : "USDT";

  const [fromAmount, setFromAmount] = useState("");
  const [step, setStep]             = useState<"form" | "done">("form");
  const [lastSwap, setLastSwap]     = useState<{ from: string; to: string; feeStr: string } | null>(null);
  const [toast, setToast]           = useState<string | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker,   setShowToPicker  ] = useState(false);
  const [showConfirm,    setShowConfirm   ] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const balances: Record<CoinSymbol, number> = {
    USDT: spotUsdtBalance,
    XAUT: xautBalance,
    ETH:  ethBalance,
    BNB:  bnbBalance,
    TON:  tonBalance,
  };

  const prices: Record<CoinSymbol, number> = {
    USDT: 1,
    XAUT: xautPrice > 0 ? xautPrice : 2620,
    ETH:  ethPrice  > 0 ? ethPrice  : 3000,
    BNB:  bnbPrice  > 0 ? bnbPrice  : 600,
    TON:  tonPrice  > 0 ? tonPrice  : 5,
  };

  const pairCoin: CoinSymbol = fromAsset === "USDT" ? altCoin : fromAsset;
  const feeConfig = PAIR_FEE[pairCoin];
  const feeAssetPrice = prices[feeConfig.feeAsset];
  const feeInAsset = feeAssetPrice > 0 ? feeConfig.feeUsd / feeAssetPrice : 0;
  const feeAssetBalance = balances[feeConfig.feeAsset];
  const parsedFrom = parseFloat(fromAmount) || 0;

  const fromIsFeeAsset = fromAsset === feeConfig.feeAsset;
  const hasFee = fromIsFeeAsset
    ? feeAssetBalance >= parsedFrom + feeInAsset
    : feeAssetBalance >= feeInAsset;

  const toAmount = useMemo(() => {
    if (parsedFrom <= 0) return 0;
    const fromPrice = prices[fromAsset];
    const toPrice   = prices[toAsset];
    if (fromPrice <= 0 || toPrice <= 0) return 0;
    return (parsedFrom * fromPrice) / toPrice;
  }, [parsedFrom, fromAsset, toAsset, prices]);

  const feePct = feeAssetBalance > 0 ? (feeInAsset / feeAssetBalance) * 100 : 0;

  const maxFrom = fromIsFeeAsset
    ? Math.max(0, balances[fromAsset] - feeInAsset)
    : balances[fromAsset];

  const handleFromPick = (coin: CoinSymbol) => {
    if (coin === "USDT") {
      setFromAsset("USDT");
    } else {
      setFromAsset(coin);
      setAltCoin(coin);
    }
    setFromAmount("");
    setShowFromPicker(false);
  };

  const handleToPick = (coin: CoinSymbol) => {
    setAltCoin(coin);
    setFromAmount("");
    setShowToPicker(false);
  };

  const handleSwitch = () => {
    if (fromAsset === "USDT") {
      setFromAsset(altCoin);
    } else {
      setFromAsset("USDT");
    }
    setFromAmount("");
  };

  const handleMax = () => {
    const dec = COIN_DEC[fromAsset];
    const truncated = truncateDec(maxFrom, dec);
    setFromAmount(truncated.toFixed(dec));
  };

  const handleSwap = () => {
    if (parsedFrom <= 0) return showToast("Enter a valid amount");
    if (fromIsFeeAsset) {
      if (parsedFrom + feeInAsset > balances[fromAsset]) {
        return showToast(`Insufficient ${fromAsset}. Use Max button.`);
      }
    } else {
      if (parsedFrom > balances[fromAsset] + 1e-9) return showToast(`Insufficient ${fromAsset} balance`);
      if (!hasFee) return showToast(`Insufficient ${feeConfig.feeAsset} for gas fee`);
    }
    setShowConfirm(true);
  };

  const executeSwap = () => {
    setShowConfirm(false);
    const decFrom = COIN_DEC[fromAsset];
    const decTo   = COIN_DEC[toAsset];

    const setFrom = fromAsset === "USDT" ? setSpotUsdtBalance
      : fromAsset === "XAUT" ? setXautBalance
      : fromAsset === "ETH"  ? setEthBalance
      : fromAsset === "BNB"  ? setBnbBalance
      : setTonBalance;

    const setTo = toAsset === "USDT" ? setSpotUsdtBalance
      : toAsset === "XAUT" ? setXautBalance
      : toAsset === "ETH"  ? setEthBalance
      : toAsset === "BNB"  ? setBnbBalance
      : setTonBalance;

    const setFeeAsset = feeConfig.feeAsset === "ETH" ? setEthBalance
      : feeConfig.feeAsset === "BNB" ? setBnbBalance
      : setTonBalance;

    setFrom((b: number) => parseFloat((b - parsedFrom).toFixed(8)));
    setTo((b: number)   => parseFloat((b + toAmount).toFixed(8)));
    setFeeAsset((b: number) => parseFloat((b - feeInAsset).toFixed(8)));

    addWalletTx({ type: "swap", asset: fromAsset, amount: parsedFrom, toAsset, toAmount });

    setLastSwap({
      from: `${parsedFrom.toFixed(decFrom)} ${fromAsset}`,
      to:   `${toAmount.toFixed(decTo)} ${toAsset}`,
      feeStr: `${feeInAsset.toFixed(6)} ${feeConfig.feeAsset} (~${fmtFiat(feeConfig.feeUsd)})`,
    });
    setFromAmount("");
    setStep("done");
  };

  // ── Done screen ───────────────────────────────────────────────────
  if (step === "done" && lastSwap) {
    return (
      <div className="flex flex-col h-full page-bg">
        <div className="flex items-center px-4 py-3 flex-shrink-0">
          <button onClick={onBack} className="mr-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#E8E4D0] text-[#666]">
            <IconChevronLeft size={18} stroke={2.5} />
          </button>
          <span className="font-bold text-[#1A1A1A] text-base">Swap</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,240,180,0.85) 100%)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
          >
            <IconCheck size={32} stroke={2.5} color="#8B6300" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Swap Successful!</h2>
          <p className="text-sm text-[#666666] mb-6">Your swap has been executed</p>
          <div className="w-full panel-card rounded-2xl p-4 text-left space-y-3">
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
              <span className="text-sm text-[#888888]">Gas Fee</span>
              <span className="text-sm text-[#888888]">{lastSwap.feeStr}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-6 w-full">
            <button
              onClick={() => setStep("form")}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-[#8B6300] transition-all active:scale-[0.98]"
              style={btnGrad}
            >
              Swap Again
            </button>
            <button
              onClick={() => setStep("form")}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold text-[#8B6300] transition-all active:scale-[0.98]"
              style={btnGrad}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rateText = (() => {
    const ap = prices[pairCoin];
    if (ap <= 0) return null;
    return `1 ${pairCoin} = ${ap.toFixed(pairCoin === "USDT" ? 2 : COIN_DEC[pairCoin])} USDT`;
  })();

  // ── Form screen ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-red-500">
          {toast}
        </div>
      )}

      {showFromPicker && (
        <CoinPickerModal
          title="Select From Coin"
          coins={["USDT", ...ALT_COINS]}
          selected={fromAsset}
          balances={balances}
          onSelect={handleFromPick}
          onClose={() => setShowFromPicker(false)}
        />
      )}

      {showToPicker && fromAsset === "USDT" && (
        <CoinPickerModal
          title="Select To Coin"
          coins={ALT_COINS}
          selected={altCoin}
          balances={balances}
          onSelect={handleToPick}
          onClose={() => setShowToPicker(false)}
        />
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#DDD]" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <span className="text-base font-bold text-[#1A1A1A]">Confirm Swap</span>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0EDE0] text-[#666]"
              >
                <IconX size={16} stroke={2.5} />
              </button>
            </div>

            <div className="mx-5 mb-4 rounded-2xl bg-[#F9F6EC] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img src={COIN_ICONS[fromAsset]} alt={fromAsset} className="w-10 h-10 rounded-full flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1">
                  <p className="text-[11px] text-[#888888] font-medium uppercase tracking-wide">You Pay</p>
                  <p className="text-lg font-bold text-[#1A1A1A]">{parsedFrom.toFixed(COIN_DEC[fromAsset])} {fromAsset}</p>
                  <p className="text-[11px] text-[#888888]">≈ {fmtFiat(parsedFrom * prices[fromAsset])}</p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-7 h-7 rounded-full bg-[#E8C84A] flex items-center justify-center">
                  <IconArrowsUpDown size={14} stroke={2.5} color="#5C3A00" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <img src={COIN_ICONS[toAsset]} alt={toAsset} className="w-10 h-10 rounded-full flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1">
                  <p className="text-[11px] text-[#888888] font-medium uppercase tracking-wide">You Receive (est.)</p>
                  <p className="text-lg font-bold text-green-600">{toAmount.toFixed(COIN_DEC[toAsset])} {toAsset}</p>
                  <p className="text-[11px] text-[#888888]">≈ {fmtFiat(toAmount * prices[toAsset])}</p>
                </div>
              </div>
            </div>

            <div className="mx-5 mb-5 flex items-center justify-between bg-[#F5F3EA] rounded-xl px-4 py-2.5">
              <span className="text-xs text-[#888888]">Gas Fee</span>
              <span className="text-xs font-semibold text-[#333333]">
                {feeInAsset.toFixed(6)} {feeConfig.feeAsset} (~{fmtFiat(feeConfig.feeUsd)})
              </span>
            </div>

            <div className="flex gap-3 mx-5">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-[#8B6300] transition-all active:scale-[0.98]"
                style={btnGrad}
              >
                Cancel
              </button>
              <button
                onClick={executeSwap}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-[#8B6300] transition-all active:scale-[0.98]"
                style={btnGrad}
              >
                Confirm Swap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center px-4 py-3 flex-shrink-0">
        <button onClick={onBack} className="mr-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#E8E4D0] text-[#666]">
          <IconChevronLeft size={18} stroke={2.5} />
        </button>
        <span className="font-bold text-[#1A1A1A] text-base">Swap</span>
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5E280] text-[#8B6914]">
          DEX Swap
        </span>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Rate */}
        {rateText && (
          <div className="flex items-center justify-center gap-2 py-1">
            <CoinIcon symbol={pairCoin} size={16} />
            <span className="text-xs font-semibold text-[#C9A227]">{rateText}</span>
          </div>
        )}

        {/* From panel */}
        <div className="panel-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#888888] uppercase tracking-wide">From</span>
            <span className="text-xs text-[#888888]">
              Balance: <span className="font-semibold text-[#C9A227]">
                {balances[fromAsset].toFixed(COIN_DEC[fromAsset])} {fromAsset}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFromPicker(true)}
              className="flex items-center gap-1.5 bg-[#F5F0DC] rounded-xl px-2.5 py-2 transition-all active:scale-95 flex-shrink-0"
            >
              <CoinIcon symbol={fromAsset} size={28} />
              <span className="text-sm font-bold text-[#1A1A1A]">{fromAsset}</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#C9A227]">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="flex-1">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl font-bold text-[#1A1A1A] bg-transparent outline-none"
              />
              {parsedFrom > 0 && (
                <p className="text-[11px] text-[#888888]">
                  ≈ {fmtFiat(parsedFrom * prices[fromAsset])}
                </p>
              )}
            </div>
            <button
              onClick={handleMax}
              className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#8B6300] flex-shrink-0"
              style={btnGrad}
            >
              Max
            </button>
          </div>
        </div>

        {/* Switch button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwitch}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#8B6300] transition-all active:scale-95"
            style={btnGrad}
          >
            <IconArrowsUpDown size={18} stroke={2.5} />
          </button>
        </div>

        {/* To panel */}
        <div className="panel-silver rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#888888] uppercase tracking-wide">To (estimated)</span>
            <span className="text-xs text-[#888888]">
              Balance: <span className="font-semibold text-[#C9A227]">
                {balances[toAsset].toFixed(COIN_DEC[toAsset])} {toAsset}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fromAsset === "USDT" && setShowToPicker(true)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 flex-shrink-0 transition-all ${
                fromAsset === "USDT" ? "bg-[#F5F0DC] active:scale-95" : "bg-[#EEECDC] cursor-default"
              }`}
            >
              <CoinIcon symbol={toAsset} size={28} />
              <span className="text-sm font-bold text-[#1A1A1A]">{toAsset}</span>
              {fromAsset === "USDT" && (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#C9A227]">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <div className="flex-1">
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {toAmount > 0 ? toAmount.toFixed(COIN_DEC[toAsset]) : "0.00"}
              </p>
              {toAmount > 0 && (
                <p className="text-[11px] text-[#888888]">
                  ≈ {fmtFiat(toAmount * prices[toAsset])}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Gas fee info */}
        <div className={`rounded-xl px-4 py-3 space-y-1.5 ${!hasFee ? "bg-red-50" : "bg-[#EEECDC]"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888888]">Network</span>
            <span className="text-xs font-semibold text-[#333333]">
              {pairCoin === "BNB" ? "BNB Smart Chain (BEP20)"
                : pairCoin === "TON" ? "Toncoin (TON)"
                : "Ethereum (ERC20)"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888888]">Gas Fee</span>
            <span className="text-xs font-semibold text-[#333333]">
              {feeInAsset.toFixed(6)} {feeConfig.feeAsset} (~{fmtFiat(feeConfig.feeUsd)})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888888]">Fee % of your {feeConfig.feeAsset}</span>
            <span className={`text-xs font-semibold ${!hasFee ? "text-red-500" : "text-[#333333]"}`}>
              {feePct.toFixed(4)}%
            </span>
          </div>
          {parsedFrom > 0 && (
            <div className="flex items-center justify-between border-t border-[#D0C890] pt-1.5">
              <span className="text-xs font-semibold text-[#333333]">Rate</span>
              <span className="text-xs font-semibold text-[#333333]">
                {fromAsset === "USDT"
                  ? `1 USDT = ${(1 / prices[pairCoin]).toFixed(COIN_DEC[pairCoin])} ${pairCoin}`
                  : `1 ${pairCoin} = ${prices[pairCoin].toFixed(2)} USDT`}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleSwap}
          disabled={!hasFee || parsedFrom <= 0}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-[#8B6300] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={btnGrad}
        >
          Swap {fromAsset} → {toAsset}
        </button>
      </div>
    </div>
  );
}
