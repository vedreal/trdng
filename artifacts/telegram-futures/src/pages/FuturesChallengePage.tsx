import { useState, useRef } from "react";
import { useTrading } from "../contexts/TradingContext";

const CHALLENGE_JOINED_KEY  = "futures_challenge_joined_v1";
const CHALLENGE_VOLUME_KEY  = "futures_challenge_volume_v1";
const CHALLENGE_CLAIMED_KEY = "futures_challenge_claimed_v1";
const USDT_ICON = "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiar6ik6oswrb7ncslxa2aeopdg7ifn252akbcpvd572v7u34dzcqq";

// Volume tiers: [requiredVolume, bonusAmount]
const TIERS: { volume: number; bonus: number }[] = [
  { volume: 10_000,  bonus: 10 },
  { volume: 30_000,  bonus: 20 },
  { volume: 50_000,  bonus: 30 },
  { volume: 100_000, bonus: 50 },
];

function loadJoined(): boolean {
  return localStorage.getItem(CHALLENGE_JOINED_KEY) === "1";
}
function saveJoined() {
  localStorage.setItem(CHALLENGE_JOINED_KEY, "1");
}
function loadVolume(): number {
  return parseFloat(localStorage.getItem(CHALLENGE_VOLUME_KEY) ?? "0");
}
function loadClaimed(): number[] {
  try {
    const raw = localStorage.getItem(CHALLENGE_CLAIMED_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch { return []; }
}
function saveClaimed(tiers: number[]) {
  localStorage.setItem(CHALLENGE_CLAIMED_KEY, JSON.stringify(tiers));
}

function fmtVol(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

// ── Icon helper ──────────────────────────────────────────────────────
function Ico({ d, size = 18, color = "currentColor", sw = 2, fill = "none", linecap = "round", linejoin = "round" }: {
  d: string | string[]; size?: number; color?: string; sw?: number; fill?: string; linecap?: "round" | "butt"; linejoin?: "round" | "miter";
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap={linecap} strokeLinejoin={linejoin}>
      {paths.map((p, i) => <path key={i} strokeLinecap={linecap} strokeLinejoin={linejoin} d={p} />)}
    </svg>
  );
}

const I = {
  back:       "M19 12H5M12 5l-7 7 7 7",
  check:      "M5 13l4 4L19 7",
  shield:     "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  trending:   ["M23 6l-9.5 9.5-5-5L1 18", "M17 6h6v6"],
  award:      ["M12 15c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z", "M8.21 13.89L7 23l5-3 5 3-1.21-9.12"],
  zap:        "M13 10V3L4 14h7v7l9-11h-7z",
  info:       "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  lock:       ["M5 11V7a7 7 0 0114 0v4", "M3 11h18v11H3z", "M12 16v2"],
  userCheck:  ["M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z", "M17 11l2 2 4-4"],
  barChart:   ["M18 20V10", "M12 20V4", "M6 20v-6"],
  gift:       ["M20 12v10H4V12", "M2 7h20v5H2z", "M12 22V7", "M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z", "M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"],
  alert:      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

interface Props { onBack: () => void; }

export function FuturesChallengePage({ onBack }: Props) {
  const { addFuturesBonus } = useTrading();

  const [joined,  setJoined]  = useState(loadJoined);
  const [volume,  setVolume]  = useState(loadVolume);
  const [claimed, setClaimed] = useState<number[]>(loadClaimed);
  const [toast,   setToast]   = useState<{ msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast({ msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const handleJoin = () => {
    if (joined) return;
    saveJoined();
    setJoined(true);
    showToast("You have successfully joined the Futures Challenge!");
  };

  const handleClaim = (tierIndex: number) => {
    const tier = TIERS[tierIndex];
    if (claimed.includes(tierIndex)) return;
    if (volume < tier.volume) return;
    const next = [...claimed, tierIndex];
    setClaimed(next);
    saveClaimed(next);
    addFuturesBonus(tier.bonus);
    showToast(`$${tier.bonus} Futures Bonus credited instantly to your account!`);
  };

  // Highest tier reached but not yet claimed
  const nextClaimable = TIERS.findIndex((t, i) => volume >= t.volume && !claimed.includes(i));

  return (
    <div className="flex flex-col h-full page-bg overflow-hidden">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-4 left-1/2 z-[70] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl"
          style={{ transform: "translateX(-50%)", background: "linear-gradient(135deg,#22c55e,#15803d)", boxShadow: "0 8px 32px rgba(22,163,74,0.45)", minWidth: 290, maxWidth: 340 }}>
          <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Ico d={I.check} size={18} color="white" sw={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Success</p>
            <p className="text-[rgba(255,255,255,0.85)] text-xs mt-1 leading-snug">{toast.msg}</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack}
          className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-xl bg-[rgba(0,0,0,0.06)] active:bg-[rgba(0,0,0,0.12)]">
          <Ico d={I.back} size={17} color="#1A1A1A" sw={2} />
        </button>
        <span className="w-full text-center font-bold text-[#1A1A1A] text-base">Futures Challenge</span>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Event Banner ── */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg,#1A1F3A 0%,#0F1628 60%,#1A2A1A 100%)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
          <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle,#22c55e,transparent)" }} />

          <div className="px-5 pt-5 pb-4 relative">
            <div className="flex items-start justify-between mb-3">
              <span className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">ACTIVE</span>
              <span className="text-[rgba(255,255,255,0.4)] text-[10px]">Limited Time Event</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(212,175,55,0.15)" }}>
                <Ico d={I.trending} size={22} color="#D4AF37" sw={1.8} />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">Up to $50 USDT</p>
                <p className="text-[#D4AF37] text-xs font-semibold">Futures Trading Bonus</p>
              </div>
            </div>

            <p className="text-[rgba(255,255,255,0.7)] text-xs leading-relaxed">
              Trade Futures using your <span className="text-white font-semibold">real balance</span> and unlock instant bonus rewards as your cumulative volume grows. The more you trade, the more you earn.
            </p>
          </div>

          <div className="mx-5 border-t border-[rgba(255,255,255,0.08)] mb-4" />

          <div className="px-5 pb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Max Reward",    value: "$50 USDT" },
              { label: "Bonus Valid",   value: "7 Days"   },
              { label: "Payout",        value: "Instant"  },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-white font-bold text-sm">{item.value}</p>
                <p className="text-[rgba(255,255,255,0.45)] text-[10px] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Join / Volume Progress Card ── */}
        <div className="panel-silver rounded-2xl border border-[#DDD5B0] overflow-hidden">

          <div className="px-4 pt-4 pb-3 border-b border-[#EEE8CC] flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1A1A1A] text-sm">Volume Milestones</p>
              <p className="text-[#888888] text-xs mt-0.5">
                {joined ? "Your cumulative Futures trading volume" : "Join the event to start tracking your volume"}
              </p>
            </div>
            {joined && (
              <div className="flex items-center gap-1.5 bg-[#F0F9FF] border border-[#BAE6FD] rounded-full px-2.5 py-1">
                <Ico d={I.userCheck} size={11} color="#0284C7" sw={2} />
                <span className="text-[#0284C7] text-[10px] font-bold">Joined</span>
              </div>
            )}
          </div>

          {/* Volume display (when joined) */}
          {joined && (
            <div className="px-4 pt-4 pb-3 border-b border-[#EEE8CC]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Ico d={I.barChart} size={13} color="#8B6300" sw={2} />
                  <p className="text-[#1A1A1A] text-xs font-bold">Current Volume</p>
                </div>
                <p className="text-[#1A1A1A] font-bold text-sm">${fmtVol(volume)} <span className="text-[#888888] font-normal text-[10px]">USDT</span></p>
              </div>
              {/* Overall progress bar toward 100K */}
              <div className="w-full h-2 rounded-full bg-[#EEEEEE] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((volume / 100_000) * 100, 100)}%`,
                    background: "linear-gradient(to right, #E8C84A, #C9A520)",
                  }}
                />
              </div>
              <p className="text-[#AAAAAA] text-[10px] mt-1 text-right">${fmtVol(volume)} / $100K target</p>
            </div>
          )}

          {/* Tier rows */}
          <div className="divide-y divide-[#EEE8CC]">
            {TIERS.map((tier, i) => {
              const isClaimed    = claimed.includes(i);
              const isReached    = joined && volume >= tier.volume;
              const isClaimable  = isReached && !isClaimed;
              const progress     = joined ? Math.min((volume / tier.volume) * 100, 100) : 0;

              return (
                <div key={tier.volume} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isClaimed
                            ? "#dcfce7"
                            : isReached
                            ? "rgba(212,175,55,0.15)"
                            : "#F5F5F5",
                          border: isClaimed
                            ? "1px solid #bbf7d0"
                            : isReached
                            ? "1px solid rgba(212,175,55,0.4)"
                            : "1px solid #E5E5E5",
                        }}
                      >
                        {isClaimed
                          ? <Ico d={I.check}  size={14} color="#16a34a" sw={2.5} />
                          : isReached
                          ? <Ico d={I.award}  size={14} color="#D4AF37" sw={1.8} />
                          : <Ico d={I.lock}   size={13} color="#BBBBBB" sw={1.8} />
                        }
                      </div>
                      <div>
                        <p className="text-[#1A1A1A] text-xs font-bold">Volume ≥ ${fmtVol(tier.volume)}</p>
                        <p className="text-[#888888] text-[10px] mt-0.5">
                          Reward: <span className={`font-semibold ${isClaimed ? "text-green-600" : isReached ? "text-[#C9A520]" : "text-[#AAAAAA]"}`}>${tier.bonus} Futures Bonus</span>
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    {isClaimed ? (
                      <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Ico d={I.check} size={9} color="#16a34a" sw={3} /> Claimed
                      </span>
                    ) : isClaimable ? (
                      <span className="flex items-center gap-1 bg-[#FFF8E8] text-[#C9A520] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#E8C84A]">
                        <Ico d={I.zap} size={9} color="#C9A520" sw={2.5} /> Ready
                      </span>
                    ) : (
                      <span className="text-[#CCCCCC] text-[10px] font-semibold">
                        {joined ? `${Math.min(Math.round(progress), 99)}%` : "—"}
                      </span>
                    )}
                  </div>

                  {/* Per-tier progress bar */}
                  {joined && !isClaimed && (
                    <div className="mb-3">
                      <div className="w-full h-1.5 rounded-full bg-[#EEEEEE] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            background: isReached
                              ? "linear-gradient(to right,#22c55e,#16a34a)"
                              : "linear-gradient(to right,#E8C84A,#C9A520)",
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <p className="text-[#AAAAAA] text-[9px]">${fmtVol(volume)}</p>
                        <p className="text-[#AAAAAA] text-[9px]">${fmtVol(tier.volume)}</p>
                      </div>
                    </div>
                  )}

                  {/* Claim button (only when claimable) */}
                  {isClaimable && (
                    <button
                      onClick={() => handleClaim(i)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                      style={{
                        background: "linear-gradient(to bottom,#E8C84A,#C9A520)",
                        color: "#3A2000",
                        boxShadow: "0 2px 0 rgba(0,0,0,0.15), 0 4px 12px rgba(180,140,0,0.25)",
                      }}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <img src={USDT_ICON} alt="USDT" className="w-4 h-4 rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        Claim ${tier.bonus} Futures Bonus
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Join / Already joined footer ── */}
          <div className="px-4 py-4 border-t border-[#EEE8CC]">
            {joined ? (
              <div className="flex items-start gap-2 bg-[#FFF8E8] border border-[#E8C84A] rounded-xl px-3 py-2.5">
                <Ico d={I.info} size={13} color="#C9A520" sw={2} />
                <p className="text-[#8B6300] text-[11px] leading-snug font-medium">
                  Your Futures trading volume using real balance is being tracked automatically. Open a position in the Futures tab to accumulate volume.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 bg-[#FFF8E8] border border-[#E8C84A] rounded-xl px-3 py-2.5">
                  <Ico d={I.alert} size={13} color="#C9A520" sw={2} />
                  <p className="text-[#8B6300] text-[11px] font-medium">Join the event first to start tracking your trading volume.</p>
                </div>
                <button
                  onClick={handleJoin}
                  className="w-full py-4 rounded-xl font-bold text-[14px] transition-all active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(to bottom,#E8C84A 0%,#C9A520 100%)",
                    color: "#3A2000",
                    boxShadow: "0 3px 0 rgba(0,0,0,0.18), 0 6px 18px rgba(180,140,0,0.3), 0 1px 0 rgba(255,255,255,0.4) inset",
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Ico d={I.zap} size={16} color="#3A2000" sw={2} />
                    Join Futures Challenge
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Terms & Conditions ── */}
        <div className="panel-silver rounded-2xl border border-[#DDD5B0] px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Ico d={I.shield} size={14} color="#8B6300" sw={2} />
            <p className="text-[#1A1A1A] text-xs font-bold">Terms & Conditions</p>
          </div>
          <div className="space-y-2.5">
            {[
              "This event is exclusively available to users who trade Futures using a real (non-bonus) balance. Volume generated from Futures bonus funds does not count toward the challenge milestones.",
              "Eligible volume is calculated from the cumulative notional value of all Futures positions opened using real balance after joining the event. Closed positions contribute their full notional value at the time of closing.",
              "Bonus rewards are credited instantly to your Futures account upon successful milestone claim. Each milestone can only be claimed once per account.",
              "The Futures Bonus can only be used to open Futures trading positions and cannot be withdrawn directly. Only net profits generated using the bonus are eligible for transfer to your Spot wallet or withdrawal.",
              "The Futures Bonus is valid for 7 days from the date of issuance. Any unused bonus balance will be automatically forfeited upon expiry.",
              "Each user may participate in and claim rewards for this event only once. Attempting to register multiple accounts or manipulate volume through wash trading, self-dealing, or any coordinated activity constitutes a violation and will result in immediate disqualification and cancellation of all bonuses and profits.",
              "Any form of fraudulent activity, API abuse, or exploitation of system vulnerabilities detected in connection with this event will result in permanent account suspension and forfeiture of all balances.",
              "Volume milestones are tiered and cumulative: achieving a higher milestone does not retroactively replace lower milestones — each tier must be claimed individually when its volume threshold is met.",
              "Catrix Trading reserves the right to modify, suspend, or terminate this event at any time, with or without prior notice, in the event of technical issues, market irregularities, or regulatory requirements.",
              "Participation in this event constitutes full acceptance of all terms and conditions listed herein. Any disputes will be resolved at the sole discretion of Catrix Trading.",
            ].map((term, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#F0EAD0] border border-[#D4AF37] flex items-center justify-center mt-0.5">
                  <p className="text-[8px] font-bold text-[#8B6300]">{i + 1}</p>
                </div>
                <p className="text-[#666666] text-[11px] leading-snug">{term}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
