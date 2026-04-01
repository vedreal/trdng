import { useMemo } from "react";
import { useTrading } from "../contexts/TradingContext";
import { useBinancePrice } from "../hooks/useBinancePrice";

const IPFS = "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/";
const COIN_ICONS: Record<string, string> = {
  USDT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiar6ik6oswrb7ncslxa2aeopdg7ifn252akbcpvd572v7u34dzcqq",
  XAUT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccstl7irrcrvusudyp26zjudtisjc44dz34o3molmxzuwfaizo5m",
  BNB:  IPFS + "bafkreieg2zkdn3muod7uir7q77lee37cmisxoqqym3sjsm6smfn5wkq2da",
};

interface PortfolioPageProps {
  onNavigate: (route: "receive" | "send" | "swap" | "history") => void;
}

const TODAY_START = new Date();
TODAY_START.setHours(0, 0, 0, 0);

function fmtUsd(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function PortfolioPage({ onNavigate }: PortfolioPageProps) {
  const { balance, positions, history, getPnl, bnbBalance, xautBalance } = useTrading();
  const { price: btcPrice } = useBinancePrice("BTCUSDT");
  const { price: bnbPrice } = useBinancePrice("BNBUSDT");
  const { price: xautPrice } = useBinancePrice("XAUTUSDT");

  const unrealizedPnl = useMemo(() => {
    if (btcPrice <= 0) return 0;
    return positions.reduce((sum, pos) => sum + getPnl(pos, btcPrice), 0);
  }, [positions, btcPrice, getPnl]);

  const todayRealizedPnl = useMemo(() => {
    return history
      .filter((t) => t.closeTime >= TODAY_START.getTime())
      .reduce((sum, t) => sum + t.pnl, 0);
  }, [history]);

  const todayPnl = unrealizedPnl + todayRealizedPnl;
  const bnbValueUsdt = bnbBalance * (bnbPrice > 0 ? bnbPrice : 600);
  const xautValueUsdt = xautBalance * (xautPrice > 0 ? xautPrice : 2620);
  const totalBalance = balance + unrealizedPnl + bnbValueUsdt + xautValueUsdt;
  const todayPct = totalBalance > 0 ? (todayPnl / (totalBalance - todayPnl)) * 100 : 0;
  const pnlPositive = todayPnl >= 0;

  const actionBtns: { id: "receive" | "send" | "swap" | "history"; label: string; icon: React.ReactNode }[] = [
    {
      id: "receive",
      label: "Receive",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
        </svg>
      ),
    },
    {
      id: "send",
      label: "Send",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V8m0 0l-4 4m4-4l4 4M4 4h16" />
        </svg>
      ),
    },
    {
      id: "swap",
      label: "Swap",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      id: "history",
      label: "History",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <span className="font-bold text-[#1A1A1A] text-base">Portfolio</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-[#666666]">MAINNET</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Balance card — includes action buttons inside */}
        <div className="rounded-2xl shadow-md relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #E8C84A 0%, #D4AF37 40%, #B8960C 80%, #9B7A1A 100%)',
            boxShadow: '0 4px 20px rgba(180,140,0,0.35), 0 1px 0 rgba(255,255,255,0.3) inset',
          }}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #FFE566, transparent)' }} />
          <div className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #FFE566, transparent)' }} />

          {/* Balance content */}
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

            {/* Divider */}
            <div className="border-t border-[rgba(255,255,255,0.2)] mb-4" />

            {/* Action buttons inside card */}
            <div className="flex items-center justify-around pb-1">
              {actionBtns.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => onNavigate(btn.id)}
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

        {/* Assets */}
        <div>
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-2">Assets</p>
          <div className="space-y-2">
            {/* USDT */}
            <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <img src={COIN_ICONS.USDT} alt="USDT" className="w-10 h-10 rounded-full flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1A1A1A]">USDT</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">${fmtUsd(balance)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-[#888888]">Tether USD</span>
                  <span className="text-[11px] text-[#888888]">{fmtUsd(balance)} USDT</span>
                </div>
              </div>
            </div>

            {/* XAUT */}
            <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <img src={COIN_ICONS.XAUT} alt="XAUT" className="w-10 h-10 rounded-full flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1A1A1A]">XAUT</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">${fmtUsd(xautValueUsdt)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-[#888888]">Tether Gold</span>
                  <span className="text-[11px] text-[#888888]">{xautBalance.toFixed(6)} XAUT</span>
                </div>
              </div>
            </div>

            {/* BNB */}
            <div className="panel-silver border border-[#D4AF37] rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <img src={COIN_ICONS.BNB} alt="BNB" className="w-10 h-10 rounded-full flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1A1A1A]">BNB</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">${fmtUsd(bnbValueUsdt)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-[#888888]">BNB</span>
                  <span className="text-[11px] text-[#888888]">{bnbBalance.toFixed(4)} BNB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-2">Recent Activity</p>
            <div className="space-y-2">
              {history.slice(0, 3).map((trade) => {
                const profit = trade.pnl >= 0;
                return (
                  <div key={trade.id}
                    className="panel-silver border border-[#D8D0A8] rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        profit ? "bg-green-500" : "bg-red-500"
                      }`}>
                        {trade.side === "long" ? "↑" : "↓"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#333333]">
                          BTC {trade.side === "long" ? "Long" : "Short"} {trade.leverage}x
                        </p>
                        <p className="text-[10px] text-[#888888]">
                          {new Date(trade.closeTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${profit ? "text-green-600" : "text-red-500"}`}>
                      {profit ? "+" : ""}${fmtUsd(trade.pnl)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
