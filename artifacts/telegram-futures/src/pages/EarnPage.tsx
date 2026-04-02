import { useState } from "react";
import { useTrading } from "../contexts/TradingContext";
import { FuturesGiveawayPage } from "./FuturesGiveawayPage";
import { FuturesChallengePage } from "./FuturesChallengePage";

const GIVEAWAY_LS_KEY = "giveaway_futures_v1";

const XAUT_ICON = "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccstl7irrcrvusudyp26zjudtisjc44dz34o3molmxzuwfaizo5m";
const DAILY_REWARDS = [0.00001, 0.00001, 0.00002, 0.000012, 0.000012, 0.000012, 0.00005];
const LS_KEY = "earn_checkin_v1";

interface CIState { streak: number; lastCheckIn: string; }

function loadCIState(): CIState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CIState) : { streak: 0, lastCheckIn: "" };
  } catch { return { streak: 0, lastCheckIn: "" }; }
}
function saveCIState(s: CIState) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }
function todayStr()     { return new Date().toDateString(); }
function yesterdayStr() { return new Date(Date.now() - 86400000).toDateString(); }

function fmtXaut(n: number): string {
  for (let d = 4; d <= 7; d++) {
    if (parseFloat(n.toFixed(d)) === n) return n.toFixed(d);
  }
  return n.toFixed(7);
}

type DayState = "completed" | "current" | "upcoming";

// ── SVG Icons ─────────────────────────────────────────────────────
function IconZap({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconAlertTriangle({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
function IconCheck({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconTrophy({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 21h8m-4-4v4M6 3h12M6 3v6a6 6 0 0012 0V3M6 3H4a2 2 0 000 4h2m12-4h2a2 2 0 010 4h-2" />
    </svg>
  );
}
function IconRotateCcw({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 10h3.5a4.5 4.5 0 014.5-4.5h.5M3 10l3-3m-3 3l3 3M21 14h-3.5a4.5 4.5 0 01-4.5 4.5H13M21 14l-3 3m3-3l-3-3" />
    </svg>
  );
}
function IconInfo({ size = 13, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconCalendar({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// ── Day Box ───────────────────────────────────────────────────────
function DayBox({ day, reward, state }: { day: number; reward: number; state: DayState }) {
  const isCompleted = state === "completed";
  const isCurrent   = state === "current";

  return (
    <div
      className="relative rounded-xl flex flex-col items-center justify-center py-2.5 px-1 overflow-hidden"
      style={{
        background: isCompleted ? "rgba(255,255,255,0.22)" : isCurrent ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.16)",
        border: isCurrent
          ? "1.5px solid rgba(255,255,255,0.95)"
          : isCompleted
          ? "1.5px solid rgba(255,255,255,0.4)"
          : "1.5px solid rgba(0,0,0,0.12)",
        boxShadow: isCurrent ? "0 0 14px rgba(255,255,255,0.5)" : undefined,
      }}
    >
      {isCompleted && (
        <div className="absolute top-1.5 right-1.5 pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <IconCheck size={9} color="white" />
          </div>
        </div>
      )}

      <p className={`text-[10px] font-semibold mb-1 ${
        isCompleted ? "text-[rgba(255,255,255,0.7)]" : isCurrent ? "text-[#8B6300]" : "text-[rgba(255,255,255,0.45)]"
      }`}>Day {day}</p>

      <img
        src={XAUT_ICON}
        alt="XAUT"
        className="w-7 h-7 rounded-full mb-1 flex-shrink-0"
        style={{ opacity: isCompleted ? 0.55 : isCurrent ? 1 : 0.35 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      <p className={`text-[9px] font-bold leading-tight text-center ${
        isCompleted ? "text-[rgba(255,255,255,0.65)]" : isCurrent ? "text-[#8B6300]" : "text-[rgba(255,255,255,0.4)]"
      }`}>{fmtXaut(reward)}</p>
      <p className={`text-[8px] ${
        isCompleted ? "text-[rgba(255,255,255,0.5)]" : isCurrent ? "text-[#B8960C]" : "text-[rgba(255,255,255,0.3)]"
      }`}>XAUT</p>
    </div>
  );
}

// ── Day 7 Box (full-width jackpot row) ────────────────────────────
function Day7Box({ reward, state }: { reward: number; state: DayState }) {
  const isCompleted = state === "completed";
  const isCurrent   = state === "current";

  return (
    <div
      className="relative rounded-xl flex items-center justify-between px-4 py-3 overflow-hidden"
      style={{
        background: isCompleted ? "rgba(255,255,255,0.22)" : isCurrent ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.16)",
        border: isCurrent
          ? "1.5px solid rgba(255,255,255,0.95)"
          : isCompleted
          ? "1.5px solid rgba(255,255,255,0.4)"
          : "1.5px solid rgba(0,0,0,0.12)",
        boxShadow: isCurrent ? "0 0 20px rgba(255,255,255,0.55)" : undefined,
      }}
    >
      {isCurrent && (
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #FFD700, transparent)" }} />
      )}

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: isCompleted ? "rgba(255,255,255,0.2)" : isCurrent ? "linear-gradient(135deg,#E8C84A,#B8960C)" : "rgba(255,255,255,0.1)",
            boxShadow: isCurrent ? "0 2px 8px rgba(180,140,0,0.4)" : undefined,
          }}>
          {isCompleted
            ? <IconCheck size={18} color="white" />
            : <IconTrophy size={18} color={isCurrent ? "#5C4200" : "rgba(255,255,255,0.4)"} />
          }
        </div>
        <div>
          <p className={`text-xs font-bold ${
            isCompleted ? "text-[rgba(255,255,255,0.75)]" : isCurrent ? "text-[#5C4200]" : "text-[rgba(255,255,255,0.45)]"
          }`}>Day 7 — Jackpot</p>
          <p className={`text-[10px] ${
            isCompleted ? "text-[rgba(255,255,255,0.55)]" : isCurrent ? "text-[#8B6300]" : "text-[rgba(255,255,255,0.3)]"
          }`}>Complete full streak for the biggest reward</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <img src={XAUT_ICON} alt="XAUT" className="w-6 h-6 rounded-full"
          style={{ opacity: isCompleted ? 0.55 : isCurrent ? 1 : 0.35 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div className="text-right">
          <p className={`text-sm font-bold ${
            isCompleted ? "text-[rgba(255,255,255,0.8)]" : isCurrent ? "text-[#8B6300]" : "text-[rgba(255,255,255,0.4)]"
          }`}>{fmtXaut(reward)}</p>
          <p className={`text-[10px] ${
            isCompleted ? "text-[rgba(255,255,255,0.55)]" : isCurrent ? "text-[#B8960C]" : "text-[rgba(255,255,255,0.3)]"
          }`}>XAUT</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export function EarnPage() {
  const { setXautBalance, addWalletTx } = useTrading();

  const [view, setView]           = useState<"main" | "giveaway" | "challenge">("main");
  const [ciState, setCiState]     = useState<CIState>(loadCIState);
  const [toast, setToast]         = useState<{ amount: number } | null>(null);

  if (view === "giveaway") {
    return <FuturesGiveawayPage onBack={() => setView("main")} />;
  }
  if (view === "challenge") {
    return <FuturesChallengePage onBack={() => setView("main")} />;
  }

  const today     = todayStr();
  const yesterday = yesterdayStr();

  const checkedInToday  = ciState.lastCheckIn === today;
  const streakBroken    = ciState.lastCheckIn !== "" && ciState.lastCheckIn !== today && ciState.lastCheckIn !== yesterday;
  const effectiveStreak = streakBroken ? 0 : ciState.streak;
  const nextDay         = (effectiveStreak % 7) + 1;
  const canCheckIn      = !checkedInToday;
  const allDone         = checkedInToday && effectiveStreak === 7;

  const getDayState = (day: number): DayState => {
    if (checkedInToday) return day <= effectiveStreak ? "completed" : "upcoming";
    if (day < nextDay)  return "completed";
    if (day === nextDay) return "current";
    return "upcoming";
  };

  const handleCheckIn = () => {
    if (!canCheckIn) return;
    const dayToCollect = (effectiveStreak % 7) + 1;
    const reward       = DAILY_REWARDS[dayToCollect - 1];

    setXautBalance((prev) => parseFloat((prev + reward).toFixed(8)));
    addWalletTx({ type: "deposit", asset: "XAUT", amount: reward });

    const newState: CIState = { streak: dayToCollect, lastCheckIn: today };
    setCiState(newState);
    saveCIState(newState);
    setToast({ amount: reward });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto pb-28">

      {/* ── Floating Toast ── */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 z-[70] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #22c55e, #15803d)",
            boxShadow: "0 8px 32px rgba(22,163,74,0.45)",
            minWidth: 280,
          }}
        >
          <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center flex-shrink-0">
            <IconCheck size={18} color="white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Check-In Successful!</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <img src={XAUT_ICON} alt="XAUT" className="w-4 h-4 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <p className="text-[rgba(255,255,255,0.9)] text-xs font-semibold">
                +{fmtXaut(toast.amount)} XAUT added to Spot
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative flex items-center justify-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <span className="font-bold text-[#1A1A1A] text-base">Earn</span>
      </div>

      <div className="px-4 py-4">

        {/* ── Single Check-In Card ── */}
        <div
          className="rounded-2xl overflow-hidden shadow-lg relative"
          style={{
            background: "linear-gradient(135deg, #E8C84A 0%, #D4AF37 40%, #B8960C 80%, #9B7A1A 100%)",
            boxShadow: "0 6px 28px rgba(180,140,0,0.4), 0 1px 0 rgba(255,255,255,0.3) inset",
          }}
        >
          {/* Decorative glows */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #FFE566, transparent)" }} />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #FFE566, transparent)" }} />

          {/* ── Section 1: Title ── */}
          <div className="px-5 pt-5 pb-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(0,0,0,0.2)] flex items-center justify-center flex-shrink-0">
                  <IconCalendar size={20} color="white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">Daily Check-In</p>
                  <p className="text-[rgba(255,255,255,0.75)] text-[11px] mt-0.5">
                    Check in daily to earn <span className="font-semibold text-white">XAUT</span> rewards
                  </p>
                </div>
              </div>
              {effectiveStreak > 0 && (
                <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.25)] rounded-full px-3 py-1.5 flex-shrink-0">
                  <IconZap size={12} color="#FFE566" />
                  <span className="text-white font-bold text-xs">{effectiveStreak} day{effectiveStreak > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Streak broken warning */}
            {streakBroken && ciState.lastCheckIn !== "" && (
              <div className="mt-3 bg-[rgba(0,0,0,0.25)] rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  <IconAlertTriangle size={14} color="rgba(255,220,100,0.9)" />
                </div>
                <p className="text-[rgba(255,255,255,0.9)] text-xs font-medium leading-snug">
                  Streak lost — you missed a day. Check in now to restart from Day 1.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-[rgba(255,255,255,0.2)]" />

          {/* ── Section 2: 7-Day Grid ── */}
          <div className="px-4 py-4 space-y-2 relative">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((day) => (
                <DayBox key={day} day={day} reward={DAILY_REWARDS[day - 1]} state={getDayState(day)} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[4, 5, 6].map((day) => (
                <DayBox key={day} day={day} reward={DAILY_REWARDS[day - 1]} state={getDayState(day)} />
              ))}
            </div>
            <Day7Box reward={DAILY_REWARDS[6]} state={getDayState(7)} />
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-[rgba(255,255,255,0.2)]" />

          {/* ── Section 3: Action ── */}
          <div className="px-4 py-4">
            {checkedInToday ? (
              <div className="flex items-center gap-3 bg-[rgba(0,0,0,0.2)] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <IconCheck size={16} color="white" />
                </div>
                <div className="flex-1 min-w-0">
                  {allDone ? (
                    <>
                      <p className="text-white font-bold text-sm">7-Day Streak Complete!</p>
                      <p className="text-[rgba(255,255,255,0.7)] text-xs mt-0.5">
                        Come back tomorrow to start a new cycle
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-bold text-sm">Checked in today</p>
                      <p className="text-[rgba(255,255,255,0.7)] text-xs mt-0.5">
                        Next: Day {(effectiveStreak % 7) + 1} · +{fmtXaut(DAILY_REWARDS[effectiveStreak % 7])} XAUT tomorrow
                      </p>
                    </>
                  )}
                </div>
                {allDone && (
                  <div className="flex-shrink-0">
                    <IconTrophy size={20} color="rgba(255,255,255,0.8)" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={handleCheckIn}
                  className="px-8 py-3 rounded-xl font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(255,240,180,0.88) 100%)",
                    boxShadow: "0 3px 0 rgba(0,0,0,0.2), 0 6px 16px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8) inset",
                    color: "#5C3A00",
                    fontSize: "14px",
                  }}
                >
                  <div className="flex items-center gap-2">
                    {streakBroken && ciState.lastCheckIn !== "" ? (
                      <>
                        <IconRotateCcw size={15} color="#5C3A00" />
                        <span>Restart Streak</span>
                      </>
                    ) : (
                      <>
                        <img src={XAUT_ICON} alt="XAUT" className="w-5 h-5 rounded-full flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <span>Check-In</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-[rgba(255,255,255,0.2)]" />

          {/* ── Section 4: How It Works ── */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <IconInfo size={13} color="rgba(255,255,255,0.7)" />
              <p className="text-[rgba(255,255,255,0.85)] text-xs font-bold tracking-wide uppercase">How It Works</p>
            </div>
            <ul className="space-y-1.5">
              {[
                "Check in every day to grow your streak.",
                "Miss a single day and your streak resets to Day 1.",
                "Complete all 7 days to claim the jackpot reward.",
                "After Day 7, a new 7-day cycle begins automatically.",
                "All XAUT rewards are credited instantly to your Spot wallet.",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.55)] mt-1.5 flex-shrink-0" />
                  <p className="text-[rgba(255,255,255,0.72)] text-[11px] leading-snug">{line}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Events Section ── */}
        <div className="mt-5">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3 px-1">Events</p>

          {/* Futures Giveaway Event Card */}
          <button
            onClick={() => setView("giveaway")}
            className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.985] transition-transform"
            style={{
              background: "linear-gradient(135deg,#1A1F3A 0%,#0F1628 55%,#1C2818 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
            }}
          >
            <div className="relative px-4 pt-4 pb-3">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-15 pointer-events-none"
                style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-[rgba(212,175,55,0.35)]"
                    style={{ background: "rgba(212,175,55,0.12)" }}>
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">ACTIVE</span>
                      <span className="text-[rgba(255,255,255,0.35)] text-[10px]">Limited Time</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-tight">Futures Giveaway</p>
                    <p className="text-[rgba(255,255,255,0.55)] text-[11px] mt-1 leading-snug">
                      Complete all tasks and receive a <span className="text-[#D4AF37] font-semibold">$30 Futures Bonus</span> for new users.
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="text-[rgba(255,255,255,0.4)] text-[10px]">
                    {localStorage.getItem(GIVEAWAY_LS_KEY) === "1" ? "Already Participated" : "New Users Eligible"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#D4AF37] font-bold text-xs">30 USDT</span>
                  <span className="text-[rgba(255,255,255,0.4)] text-[10px]">Futures Bonus</span>
                </div>
              </div>
            </div>
          </button>

          {/* Futures Challenge Event Card */}
          <button
            onClick={() => setView("challenge")}
            className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.985] transition-transform mt-3"
            style={{
              background: "linear-gradient(135deg,#1A1F3A 0%,#0F1628 55%,#1C2818 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
            }}
          >
            <div className="relative px-4 pt-4 pb-3">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-15 pointer-events-none"
                style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-[rgba(212,175,55,0.35)]"
                    style={{ background: "rgba(212,175,55,0.12)" }}>
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide">ACTIVE</span>
                      <span className="text-[rgba(255,255,255,0.35)] text-[10px]">Limited Time</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-tight">Futures Challenge</p>
                    <p className="text-[rgba(255,255,255,0.55)] text-[11px] mt-1 leading-snug">
                      Trade Futures with real balance and earn up to <span className="text-[#D4AF37] font-semibold">$50 Futures Bonus</span> based on your volume.
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="text-[rgba(255,255,255,0.4)] text-[10px]">
                    {localStorage.getItem("futures_challenge_joined_v1") === "1" ? "Already Joined" : "Real Balance Required"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#D4AF37] font-bold text-xs">50 USDT</span>
                  <span className="text-[rgba(255,255,255,0.4)] text-[10px]">Max Bonus</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
