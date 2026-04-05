import { useState } from "react";
import { useTrading, type WalletTransaction } from "../contexts/TradingContext";
import {
  IconArrowBarToDown, IconArrowBarUp, IconGift,
  IconArrowsRightLeft, IconChevronLeft, IconFileText,
} from "@tabler/icons-react";

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
        <IconArrowBarToDown size={18} stroke={2.5} />
      </div>
    );
  }
  if (type === "withdraw") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
        <IconArrowBarUp size={18} stroke={2.5} />
      </div>
    );
  }
  if (type === "bonus") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[#8B6300]"
        style={{ background: "linear-gradient(135deg, #E8C84A, #D4AF37)" }}>
        <IconGift size={18} stroke={2.5} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[#8B6300]"
      style={{ background: "linear-gradient(135deg, #E8C84A, #D4AF37)" }}>
      <IconArrowsRightLeft size={18} stroke={2.5} />
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
    <div className="panel-silver rounded-2xl px-4 py-3.5 flex items-start gap-3">
      <TxIcon type={tx.type} />

      <div className="flex-1 min-w-0">
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

const btnGrad = {
  background: "linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,240,180,0.85) 100%)",
  boxShadow: "0 2px 0 rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.6) inset",
};

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
      <div className="flex items-center px-4 py-3 flex-shrink-0">
        <button onClick={onBack} className="mr-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#E8E4D0] text-[#666]">
          <IconChevronLeft size={18} stroke={2.5} />
        </button>
        <span className="font-bold text-[#1A1A1A] text-base">Transaction History</span>
        {walletHistory.length > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5E280] text-[#8B6914]">
            {walletHistory.length}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id ? "text-[#8B6300]" : "text-[#888888]"
            }`}
            style={filter === tab.id ? btnGrad : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#E8E4D0] flex items-center justify-center mb-4">
              <IconFileText size={28} stroke={1.5} color="#AAAAAA" />
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
