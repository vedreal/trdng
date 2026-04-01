import { useState } from "react";
import { useTrading, type WalletTransaction } from "../contexts/TradingContext";

interface HistoryPageProps {
  onBack: () => void;
}

type FilterType = "all" | "deposit" | "withdraw" | "swap";

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function TxIcon({ type }: { type: WalletTransaction["type"] }) {
  if (type === "deposit") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
        </svg>
      </div>
    );
  }
  if (type === "withdraw") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V8m0 0l-4 4m4-4l4 4M4 4h16" />
        </svg>
      </div>
    );
  }
  if (type === "bonus") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[#8B6300]"
        style={{ background: "linear-gradient(135deg, #E8C84A, #D4AF37)" }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13C10.832 5.477 9.246 5 7.5 5A5.5 5.5 0 002 10.5c0 3.038 2.5 5 5.5 5 2.5 0 4.5-1 5.5-2.5m0 0c1-1.5 3-2.5 5.5-2.5 3 0 5.5 1.962 5.5 5A5.5 5.5 0 0116.5 21c-1.746 0-3.332-.477-4.5-1.5" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[#8B6300]"
      style={{ background: "linear-gradient(135deg, #E8C84A, #D4AF37)" }}>
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    </div>
  );
}

function TxCard({ tx }: { tx: WalletTransaction }) {
  const label =
    tx.type === "deposit" ? "Deposit"
    : tx.type === "withdraw" ? "Withdraw"
    : tx.type === "bonus" ? "Futures Bonus"
    : "Swap";

  const isBonus = tx.type === "bonus";

  return (
    <div className="panel-silver border border-[#D8D0A8] rounded-2xl px-4 py-3.5 flex items-start gap-3">
      <TxIcon type={tx.type} />

      <div className="flex-1 min-w-0">
        {/* Row 1: label + amount */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-bold text-[#1A1A1A]">{label}</span>
          {tx.type === "swap" ? (
            <div className="text-right">
              <p className="text-sm font-bold text-[#C9A227]">
                -{tx.amount.toFixed(tx.asset === "USDT" ? 2 : 6)} {tx.asset}
              </p>
              <p className="text-[11px] text-green-600 font-semibold">
                +{tx.toAmount!.toFixed(tx.toAsset === "USDT" ? 2 : 6)} {tx.toAsset}
              </p>
            </div>
          ) : isBonus ? (
            <span className="text-sm font-bold text-[#C9A227]">
              +{tx.amount.toFixed(2)} {tx.asset}
            </span>
          ) : (
            <span className={`text-sm font-bold ${tx.type === "deposit" ? "text-green-600" : "text-red-500"}`}>
              {tx.type === "deposit" ? "+" : "-"}{tx.amount.toFixed(tx.asset === "USDT" ? 2 : 6)} {tx.asset}
            </span>
          )}
        </div>

        {/* Row 2: address / swap route / bonus label */}
        {tx.type === "swap" ? (
          <p className="text-[11px] text-[#888888]">
            {tx.asset} → {tx.toAsset} · BEP-20
          </p>
        ) : isBonus ? (
          <p className="text-[11px] text-[#888888]">Futures Account</p>
        ) : tx.address ? (
          <p className="text-[11px] text-[#888888] font-mono truncate">
            {tx.type === "deposit" ? "From" : "To"}: {shortAddr(tx.address)}
          </p>
        ) : (
          <p className="text-[11px] text-[#888888]">BEP-20 Network</p>
        )}

        {/* Row 3: time + status */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[#AAAAAA]">{fmtTime(tx.timestamp)}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            tx.status === "completed"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}>
            {tx.status === "completed" ? "✓ Completed" : "⏳ Pending"}
          </span>
        </div>
      </div>
    </div>
  );
}

const FILTER_TABS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
  { id: "swap", label: "Swap" },
];

export function HistoryPage({ onBack }: HistoryPageProps) {
  const { walletHistory } = useTrading();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all"
      ? walletHistory
      : filter === "deposit"
      ? walletHistory.filter((t) => t.type === "deposit" || t.type === "bonus")
      : walletHistory.filter((t) => t.type === filter);

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">

      {/* Header */}
      <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack} className="mr-3 text-[#888888]">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-bold text-[#1A1A1A] text-base">Transaction History</span>
        {walletHistory.length > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5E280] text-[#8B6914]">
            {walletHistory.length}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-[#D8D0A8] flex-shrink-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id ? "btn-3d-gold" : "btn-3d-silver"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-full btn-3d-silver flex items-center justify-center mb-4">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#AAAAAA" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#888888]">No transactions yet</p>
            <p className="text-xs text-[#AAAAAA] mt-1">Your Receive, Send, and Swap<br />history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tx) => <TxCard key={tx.id} tx={tx} />)}
          </div>
        )}
      </div>
    </div>
  );
}
