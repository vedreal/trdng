import { useMemo, useState } from "react";
import { useTrading } from "../contexts/TradingContext";
import { useBinancePrice } from "../hooks/useBinancePrice";
import { useSparkline } from "../hooks/useSparkline";
import type { ClosedTrade } from "../hooks/useTradingStore";
import {
  IconX, IconArrowBarToDown, IconArrowBarToUp,
  IconSwitchVertical, IconArrowsRightLeft,
  IconClock, IconGift, IconChevronDown, IconChevronUp,
  IconChevronLeft, IconChevronRight,
} from "@tabler/icons-react";

const IPFS = "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/";
const COIN_ICONS: Record<string, string> = {
  USDT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiar6ik6oswrb7ncslxa2aeopdg7ifn252akbcpvd572v7u34dzcqq",
  XAUT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccstl7irrcrvusudyp26zjudtisjc44dz34o3molmxzuwfaizo5m",
  BNB:  IPFS + "bafkreieg2zkdn3muod7uir7q77lee37cmisxoqqym3sjsm6smfn5wkq2da",
  ETH:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccdvf3jvs2kngcddhe6siaca44y3ztru254dor3vocue36gbplw4",
  TON:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreib6wlrvvorkcbkma43liqxrm4dv7hgad4jbqlcjzaa6rynileb7c4",
};

interface PortfolioPageProps {
  onNavigate: (route: "receive" | "send" | "swap" | "history") => void;
}

const TODAY_START = new Date();
TODAY_START.setHours(0, 0, 0, 0);

function fmtUsd(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── Mini Sparkline SVG ─────────────────────────────────────────────────────
function MiniSparkline({ prices, isUp }: { prices: number[]; isUp: boolean }) {
  if (prices.length < 2) {
    return <div className="w-16 h-8 flex-shrink-0" />;
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max * 0.001 || 1;
  const W = 64;
  const H = 30;
  const pad = 2;

  const pts = prices
    .map((p, i) => {
      const x = pad + (i / (prices.length - 1)) * (W - pad * 2);
      const y = H - pad - ((p - min) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = isUp ? "#16a34a" : "#ef4444";
  const fillColor = isUp ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.08)";

  const firstPt = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (W - pad * 2);
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return { x, y };
  });
  const fillPath =
    `M${firstPt[0].x.toFixed(1)},${H} ` +
    firstPt.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L${firstPt[firstPt.length - 1].x.toFixed(1)},${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0 overflow-visible">
      <path d={fillPath} fill={fillColor} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Futures PnL Calendar ───────────────────────────────────────────────────
function FuturesPnlCalendar({ history }: { history: ClosedTrade[] }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const dailyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of history) {
      const d = new Date(t.closeTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map[key] = (map[key] ?? 0) + t.pnl;
    }
    return map;
  }, [history]);

  const monthlyTotal = useMemo(() => {
    return Object.entries(dailyPnl)
      .filter(([key]) => {
        const [y, m] = key.split("-").map(Number);
        return y === viewYear && m === viewMonth;
      })
      .reduce((sum, [, v]) => sum + v, 0);
  }, [dailyPnl, viewYear, viewMonth]);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0 ... Sun=6

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DOW = ["Mo","Tu","We","Th","Fr","Sa","Su"];

  return (
    <div className="mt-3 px-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E8E4D0] text-[#666] active:scale-90">
          <IconChevronLeft size={14} stroke={2.5} />
        </button>
        <div className="text-center">
          <span className="text-xs font-bold text-[#1A1A1A]">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <div className={`text-[10px] font-semibold mt-0.5 ${monthlyTotal >= 0 ? "text-green-600" : "text-red-500"}`}>
            Monthly: {monthlyTotal >= 0 ? "+" : ""}${fmtUsd(monthlyTotal)}
          </div>
        </div>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E8E4D0] text-[#666] active:scale-90">
          <IconChevronRight size={14} stroke={2.5} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-[#AAAAAA]">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const key = `${viewYear}-${viewMonth}-${day}`;
          const pnl = dailyPnl[key];
          const isToday =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();

          const hasPnl = pnl !== undefined;
          const isPos  = hasPnl && pnl >= 0;
          const isNeg  = hasPnl && pnl < 0;

          return (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center rounded-lg py-0.5 min-h-[38px] relative ${
                isToday ? "ring-1 ring-[#D4AF37]" : ""
              } ${isPos ? "bg-green-50" : isNeg ? "bg-red-50" : ""}`}
            >
              <span className={`text-[10px] font-semibold ${
                isToday ? "text-[#C9A227]" :
                isPos ? "text-green-700" :
                isNeg ? "text-red-600" :
                "text-[#999]"
              }`}>
                {day}
              </span>
              {hasPnl && (
                <span className={`text-[8px] font-bold leading-tight ${isPos ? "text-green-600" : "text-red-500"}`}>
                  {isPos ? "+" : ""}{Math.abs(pnl) >= 1000 ? `${(pnl / 1000).toFixed(1)}k` : pnl.toFixed(1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Inline Transfer Modal ──────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 modal-enter" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl panel-card border-t border-[#D4AF37] p-5 pb-28 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-bold text-[#1A1A1A]">Transfer</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E0DDD0] text-[#666]">
            <IconX size={14} stroke={2.5} />
          </button>
        </div>

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

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F5F3EA] border border-[#E0DDD0]">
            <span className="text-xs text-[#888888]">Spot</span>
            <span className="text-sm font-semibold text-[#333333]">{fmtUsd(spotBalance)} USDT</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#F5F3EA] border border-[#E0DDD0]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#888888]">Futures</span>
              <span className="text-sm font-semibold text-[#333333]">{fmtUsd(futuresBalance)} USDT</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[#888888]">Bonus</span>
              <span className="text-xs font-medium text-[#C9A227]">{fmtUsd(futuresBonus)} USDT</span>
            </div>
          </div>
        </div>

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
          <button onClick={() => setAmountInput(maxAmount.toFixed(2))}
            className="text-xs font-semibold text-[#C9A227] hover:text-[#A07800]">
            Max ${fmtUsd(maxAmount)}
          </button>
        </div>

        {feedback && (
          <div className={`text-xs text-center mb-3 font-medium ${feedback.ok ? "text-green-600" : "text-red-500"}`}>
            {feedback.msg}
          </div>
        )}

        <button onClick={handleTransfer}
          className="w-full py-3 rounded-xl text-sm font-bold btn-3d-gold transition-all active:scale-[0.98]">
          Confirm Transfer
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function PortfolioPage({ onNavigate }: PortfolioPageProps) {
  const {
    balance, positions, history, getPnl,
    bnbBalance, xautBalance, spotUsdtBalance,
    ethBalance, tonBalance,
    walletHistory, transferToFutures, transferFromFutures,
    futuresBonus,
  } = useTrading();

  const { price: btcPrice }  = useBinancePrice("BTCUSDT");
  const { price: bnbPrice,  priceChangePercent: bnbChangePct  } = useBinancePrice("BNBUSDT");
  const { price: xautPrice, priceChangePercent: xautChangePct } = useBinancePrice("XAUTUSDT");
  const { price: ethPrice,  priceChangePercent: ethChangePct  } = useBinancePrice("ETHUSDT");
  const { price: tonPrice,  priceChangePercent: tonChangePct  } = useBinancePrice("TONUSDT");

  // Sparkline data (25 hourly candles for 24h trend)
  const bnbSpark  = useSparkline("BNBUSDT");
  const xautSpark = useSparkline("XAUTUSDT");
  const ethSpark  = useSparkline("ETHUSDT");
  const tonSpark  = useSparkline("TONUSDT");
  // USDT is a stablecoin — flat line
  const usdtSpark = useMemo(() => Array(25).fill(1), []);

  const [assetTab, setAssetTab]             = useState<"spot" | "futures">("spot");
  const [showTransferModal, setShowTransfer] = useState(false);
  const [showPnlCalendar, setShowPnlCalendar] = useState(false);

  const unrealizedPnl = useMemo(() => {
    if (btcPrice <= 0) return 0;
    return positions.reduce((sum, pos) => sum + getPnl(pos, btcPrice), 0);
  }, [positions, btcPrice, getPnl]);

  const todayRealizedPnl = useMemo(() => {
    return history
      .filter((t) => t.closeTime >= TODAY_START.getTime())
      .reduce((sum, t) => sum + t.pnl, 0);
  }, [history]);

  // Effective prices with fallback
  const bnbValuePrice  = bnbPrice  > 0 ? bnbPrice  : 600;
  const xautValuePrice = xautPrice > 0 ? xautPrice : 2620;
  const ethValuePrice  = ethPrice  > 0 ? ethPrice  : 3000;
  const tonValuePrice  = tonPrice  > 0 ? tonPrice  : 5;

  // Spot today PnL based on 24h price change of each spot crypto asset
  const spotTodayPnl = useMemo(() => {
    return (
      bnbBalance  * bnbValuePrice  * (bnbChangePct  / 100) +
      xautBalance * xautValuePrice * (xautChangePct / 100) +
      ethBalance  * ethValuePrice  * (ethChangePct  / 100) +
      tonBalance  * tonValuePrice  * (tonChangePct  / 100)
    );
  }, [
    bnbBalance, bnbValuePrice, bnbChangePct,
    xautBalance, xautValuePrice, xautChangePct,
    ethBalance, ethValuePrice, ethChangePct,
    tonBalance, tonValuePrice, tonChangePct,
  ]);

  const todayPnl      = unrealizedPnl + todayRealizedPnl + spotTodayPnl;
  const bnbValueUsdt  = bnbBalance  * bnbValuePrice;
  const xautValueUsdt = xautBalance * xautValuePrice;
  const ethValueUsdt  = ethBalance  * ethValuePrice;
  const tonValueUsdt  = tonBalance  * tonValuePrice;
  const totalBalance  = spotUsdtBalance + balance + unrealizedPnl + bnbValueUsdt + xautValueUsdt + ethValueUsdt + tonValueUsdt;
  const todayPct      = totalBalance > 0 ? (todayPnl / (totalBalance - todayPnl)) * 100 : 0;
  const pnlPositive   = todayPnl >= 0;

  const futuresActivity = useMemo(() => {
    type ActivityItem =
      | { kind: "trade"; id: string; side: "long" | "short"; leverage: number; pnl: number; time: number }
      | { kind: "transfer"; id: string; direction: "toFutures" | "fromFutures"; amount: number; time: number }
      | { kind: "bonus"; id: string; amount: number; time: number };

    const trades: ActivityItem[] = history.map((t) => ({
      kind: "trade",
      id: t.id,
      side: t.side,
      leverage: t.leverage,
      pnl: t.pnl,
      time: t.closeTime,
    }));

    const transfers: ActivityItem[] = walletHistory
      .filter((w) => w.type === "transfer")
      .map((w) => ({
        kind: "transfer",
        id: w.id,
        direction: w.asset === "USDT" ? "toFutures" : "fromFutures",
        amount: w.amount,
        time: w.timestamp,
      }));

    const bonuses: ActivityItem[] = walletHistory
      .filter((w) => w.type === "bonus")
      .map((w) => ({
        kind: "bonus",
        id: w.id,
        amount: w.amount,
        time: w.timestamp,
      }));

    return [...trades, ...transfers, ...bonuses]
      .sort((a, b) => b.time - a.time)
      .slice(0, 3);
  }, [history, walletHistory]);

  const actionBtns: { id: string; label: string; icon: React.ReactNode; action: () => void }[] = [
    {
      id: "receive",
      label: "Receive",
      action: () => onNavigate("receive"),
      icon: <IconArrowBarToDown size={20} stroke={2} />,
    },
    {
      id: "send",
      label: "Send",
      action: () => onNavigate("send"),
      icon: <IconArrowBarToUp size={20} stroke={2} />,
    },
    {
      id: "swap",
      label: "Swap",
      action: () => onNavigate("swap"),
      icon: <IconSwitchVertical size={20} stroke={2} />,
    },
    {
      id: "transfer",
      label: "Transfer",
      action: () => setShowTransfer(true),
      icon: <IconArrowsRightLeft size={20} stroke={2} />,
    },
  ];

  // Helper: render a ±% badge
  const PctBadge = ({ pct }: { pct: number }) => {
    const pos = pct >= 0;
    return (
      <span className={`text-[10px] font-semibold px-1 py-0.5 rounded ${
        pos ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"
      }`}>
        {pos ? "+" : ""}{pct.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-hidden">

      {showTransferModal && (
        <TransferModal
          spotBalance={spotUsdtBalance}
          futuresBalance={balance}
          futuresBonus={futuresBonus}
          onTransferToFutures={transferToFutures}
          onTransferFromFutures={transferFromFutures}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {/* ── FIXED TOP SECTION (does not scroll) ── */}
      <div className="flex-shrink-0">

        <div className="relative flex items-center justify-center px-4 py-3 panel-header border-b border-[#C8B040]">
          <span className="font-bold text-[#1A1A1A] text-base">Portfolio</span>
          <div className="absolute right-4 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-[#666666]">MAINNET</span>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">

        {/* Balance card */}
        <div className="rounded-2xl shadow-md relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #E8C84A 0%, #D4AF37 40%, #B8960C 80%, #9B7A1A 100%)',
            boxShadow: '0 4px 20px rgba(180,140,0,0.35), 0 1px 0 rgba(255,255,255,0.3) inset',
          }}>

          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #FFE566, transparent)' }} />
          <div className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #FFE566, transparent)' }} />

          <button
            onClick={() => onNavigate("history")}
            className="absolute top-3 right-4 z-10 text-[rgba(255,255,255,0.7)] hover:text-white transition-colors active:scale-90"
            title="History">
            <IconClock size={26} stroke={2} />
          </button>

          <div className="px-5 pt-5 pb-4">
            <p className="text-[11px] font-semibold text-[rgba(255,255,255,0.8)] uppercase tracking-wide mb-1">Total Balance</p>
            <p className="text-4xl font-bold text-white mb-0.5">
              ${fmtUsd(totalBalance)}
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.7)] mb-4">≈ {fmtUsd(totalBalance)} USDT</p>

            <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.18)] rounded-xl px-3 py-2 w-fit mb-5">
              <span className="text-[11px] text-[rgba(255,255,255,0.85)]">Today PnL</span>
              <span className={`text-sm font-bold ${pnlPositive ? "text-green-300" : "text-red-300"}`}>
                {pnlPositive ? "+" : ""}${fmtUsd(Math.abs(todayPnl))}
              </span>
              <span className={`text-xs font-medium ${pnlPositive ? "text-green-300" : "text-red-300"}`}>
                ({pnlPositive ? "+" : ""}{todayPct.toFixed(2)}%)
              </span>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.2)] mb-4" />

            <div className="flex items-center justify-around pb-1">
              {actionBtns.map((btn) => (
                <button
                  key={btn.id}
                  onClick={btn.action}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#8B6300] transition-all group-active:scale-95"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,240,180,0.85) 100%)',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.6) inset',
                    }}>
                    {btn.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-[rgba(255,255,255,0.95)]">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Open Positions PnL summary */}
        {positions.length > 0 && (
          <div className="panel-card rounded-2xl p-4 border border-[#D4AF37]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#666666]">Open Positions</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5E280] text-[#8B6914]">
                {positions.length} active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Unrealized PnL</span>
              <span className={`text-sm font-bold ${unrealizedPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                {unrealizedPnl >= 0 ? "+" : ""}${fmtUsd(unrealizedPnl)}
              </span>
            </div>
          </div>
        )}

        {/* Assets header + tab switcher — stays fixed */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide">Assets</p>
          <div className="flex rounded-lg border border-[#C8C0A0] bg-[#E8E4D0] p-0.5 gap-0.5">
            {(["spot", "futures"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAssetTab(tab)}
                className={`px-3 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  assetTab === tab ? "btn-3d-gold" : "text-[#888888]"
                }`}>
                {tab === "spot" ? "Spot" : "Futures"}
              </button>
            ))}
          </div>
        </div>

        </div>{/* end px-4 pt-4 */}
      </div>{/* end flex-shrink-0 */}

      {/* ── SCROLLABLE ASSET LIST ONLY ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3">

          {/* Spot tab — order: USDT, XAUT, ETH, BNB, TON */}
          {assetTab === "spot" && (
            <div className="space-y-2">

              {/* USDT */}
              <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3 flex items-center gap-3">
                <img src={COIN_ICONS.USDT} alt="USDT" className="w-10 h-10 rounded-full flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  {/* Row 1: Symbol | $price ±% */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1A1A]">USDT</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#333]">$1.00</span>
                      <PctBadge pct={0} />
                    </div>
                  </div>
                  {/* Row 2: Full name | mini chart */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[#888888]">Tether USD</span>
                    <MiniSparkline prices={usdtSpark} isUp={true} />
                  </div>
                  {/* Row 3: $total value | amount */}
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-[#1A1A1A]">${fmtUsd(spotUsdtBalance)}</span>
                    <span className="text-[11px] text-[#888888]">{fmtUsd(spotUsdtBalance)} USDT</span>
                  </div>
                </div>
              </div>

              {/* XAUT */}
              <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3 flex items-center gap-3">
                <img src={COIN_ICONS.XAUT} alt="XAUT" className="w-10 h-10 rounded-full flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  {/* Row 1: Symbol | $price ±% */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1A1A]">XAUT</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#333]">
                        {xautPrice > 0 ? `$${fmtUsd(xautPrice)}` : "—"}
                      </span>
                      {xautPrice > 0 && <PctBadge pct={xautChangePct} />}
                    </div>
                  </div>
                  {/* Row 2: Full name | mini chart */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[#888888]">Tether Gold</span>
                    <MiniSparkline prices={xautSpark} isUp={xautChangePct >= 0} />
                  </div>
                  {/* Row 3: $total value | amount */}
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-[#1A1A1A]">${fmtUsd(xautValueUsdt)}</span>
                    <span className="text-[11px] text-[#888888]">{xautBalance.toFixed(6)} XAUT</span>
                  </div>
                </div>
              </div>

              {/* ETH */}
              <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3 flex items-center gap-3">
                <img src={COIN_ICONS.ETH} alt="ETH" className="w-10 h-10 rounded-full flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  {/* Row 1: Symbol | $price ±% */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1A1A]">ETH</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#333]">
                        {ethPrice > 0 ? `$${fmtUsd(ethPrice)}` : "—"}
                      </span>
                      {ethPrice > 0 && <PctBadge pct={ethChangePct} />}
                    </div>
                  </div>
                  {/* Row 2: Full name | mini chart */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[#888888]">Ethereum</span>
                    <MiniSparkline prices={ethSpark} isUp={ethChangePct >= 0} />
                  </div>
                  {/* Row 3: $total value | amount */}
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-[#1A1A1A]">${fmtUsd(ethValueUsdt)}</span>
                    <span className="text-[11px] text-[#888888]">{ethBalance.toFixed(6)} ETH</span>
                  </div>
                </div>
              </div>

              {/* BNB */}
              <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3 flex items-center gap-3">
                <img src={COIN_ICONS.BNB} alt="BNB" className="w-10 h-10 rounded-full flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  {/* Row 1: Symbol | $price ±% */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1A1A]">BNB</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#333]">
                        {bnbPrice > 0 ? `$${fmtUsd(bnbPrice)}` : "—"}
                      </span>
                      {bnbPrice > 0 && <PctBadge pct={bnbChangePct} />}
                    </div>
                  </div>
                  {/* Row 2: Full name | mini chart */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[#888888]">BNB</span>
                    <MiniSparkline prices={bnbSpark} isUp={bnbChangePct >= 0} />
                  </div>
                  {/* Row 3: $total value | amount */}
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-[#1A1A1A]">${fmtUsd(bnbValueUsdt)}</span>
                    <span className="text-[11px] text-[#888888]">{bnbBalance.toFixed(6)} BNB</span>
                  </div>
                </div>
              </div>

              {/* TON */}
              <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3 flex items-center gap-3">
                <img src={COIN_ICONS.TON} alt="TON" className="w-10 h-10 rounded-full flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  {/* Row 1: Symbol | $price ±% */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1A1A]">TON</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#333]">
                        {tonPrice > 0 ? `$${fmtUsd(tonPrice, 3)}` : "—"}
                      </span>
                      {tonPrice > 0 && <PctBadge pct={tonChangePct} />}
                    </div>
                  </div>
                  {/* Row 2: Full name | mini chart */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[#888888]">Toncoin</span>
                    <MiniSparkline prices={tonSpark} isUp={tonChangePct >= 0} />
                  </div>
                  {/* Row 3: $total value | amount */}
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-[#1A1A1A]">${fmtUsd(tonValueUsdt)}</span>
                    <span className="text-[11px] text-[#888888]">{tonBalance.toFixed(4)} TON</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Futures tab */}
          {assetTab === "futures" && (
            <div className="space-y-2">
              {/* Futures balance card with collapsible PnL calendar */}
              <div className="panel-silver border border-[#D4AF37] rounded-2xl overflow-hidden">
                {/* Balance rows */}
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <img src={COIN_ICONS.USDT} alt="USDT" className="w-10 h-10 rounded-full flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1A1A1A]">USDT</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">${fmtUsd(balance + futuresBonus)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-[#888888]">Futures Balance</span>
                      <span className="text-[11px] text-[#888888]">{fmtUsd(balance)} USDT</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-[#888888]">Futures Bonus</span>
                      <span className="text-[11px] text-[#888888]">{fmtUsd(futuresBonus)} USDT</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible PnL Calendar */}
                {showPnlCalendar && (
                  <div className="px-4 pb-3 border-t border-[#E8E0C0]">
                    <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide pt-2 pb-0.5">
                      Futures PnL Calendar
                    </p>
                    <FuturesPnlCalendar history={history} />
                  </div>
                )}

                {/* Toggle arrow at bottom center */}
                <button
                  onClick={() => setShowPnlCalendar((v) => !v)}
                  className="w-full flex items-center justify-center py-2 border-t border-[#E8E0C0] text-[#AAAAAA] hover:text-[#888888] active:scale-95 transition-all"
                  aria-label="Toggle PnL Calendar"
                >
                  {showPnlCalendar
                    ? <IconChevronUp size={16} stroke={2} />
                    : <IconChevronDown size={16} stroke={2} />
                  }
                </button>
              </div>

              <>
                <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide pt-1 pb-0.5 px-1">
                  Recent Activity
                </p>
                {futuresActivity.length === 0 ? (
                  <div className="panel-silver border border-[#D8D0A8] rounded-xl px-4 py-4 text-center">
                    <p className="text-xs text-[#AAAAAA]">No recent activity</p>
                  </div>
                ) : futuresActivity.map((item) => {
                    if (item.kind === "trade") {
                      const profit = item.pnl >= 0;
                      return (
                        <div key={item.id}
                          className="panel-silver border border-[#D8D0A8] rounded-xl px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                              profit ? "bg-green-500" : "bg-red-500"
                            }`}>
                              {item.side === "long" ? "↑" : "↓"}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#333333]">
                                {item.side === "long" ? "Long" : "Short"} {item.leverage}x — Closed
                              </p>
                              <p className="text-[10px] text-[#888888]">
                                {new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
                            {profit ? "+" : ""}${fmtUsd(item.pnl)}
                          </span>
                        </div>
                      );
                    }

                    if (item.kind === "bonus") {
                      return (
                        <div key={item.id}
                          className="panel-silver border border-[#D8D0A8] rounded-xl px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#8B6300] text-xs font-bold flex-shrink-0"
                              style={{ background: "linear-gradient(135deg, #E8C84A, #D4AF37)" }}>
                              <IconGift size={14} stroke={2.5} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#333333]">Futures Bonus</p>
                              <p className="text-[10px] text-[#888888]">
                                {new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-[#C9A227]">
                            +${fmtUsd(item.amount)}
                          </span>
                        </div>
                      );
                    }

                    const transferItem = item as { kind: "transfer"; id: string; direction: "toFutures" | "fromFutures"; amount: number; time: number };
                    return (
                      <div key={transferItem.id}
                        className="panel-silver border border-[#D8D0A8] rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-blue-500">
                            ⇄
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#333333]">
                              {transferItem.direction === "toFutures" ? "Spot → Futures" : "Futures → Spot"}
                            </p>
                            <p className="text-[10px] text-[#888888]">
                              {new Date(transferItem.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-[#333333]">
                          ${fmtUsd(transferItem.amount)}
                        </span>
                      </div>
                    );
                  })}
              </>
            </div>
          )}
      </div>{/* end scrollable */}
    </div>
  );
}
