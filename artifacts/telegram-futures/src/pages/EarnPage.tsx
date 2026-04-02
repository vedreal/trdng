import { useState } from "react";
import { useTrading } from "../contexts/TradingContext";

const DAILY_REWARDS = [0.00001, 0.00001, 0.00002, 0.000012, 0.000012, 0.000012, 0.00005];

const LS_KEY = "earn_checkin_v1";

interface CIState {
  streak: number;
  lastCheckIn: string;
}

function loadCIState(): CIState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CIState) : { streak: 0, lastCheckIn: "" };
  } catch {
    return { streak: 0, lastCheckIn: "" };
  }
}

function saveCIState(s: CIState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function todayStr() { return new Date().toDateString(); }
function yesterdayStr() { return new Date(Date.now() - 86400000).toDateString(); }

function fmtXaut(n: number): string {
  for (let d = 4; d <= 7; d++) {
    if (parseFloat(n.toFixed(d)) === n) return n.toFixed(d);
  }
  return n.toFixed(7);
}

type DayState = "completed" | "current" | "upcoming";

function DayBox({ day, reward, state }: { day: number; reward: number; state: DayState }) {
  const isCompleted = state === "completed";
  const isCurrent   = state === "current";

  return (
    <div
      className="relative rounded-xl flex flex-col items-center justify-center py-2.5 px-1 overflow-hidden"
      style={{
        background: isCompleted
          ? "rgba(255,255,255,0.22)"
          : isCurrent
          ? "rgba(255,255,255,0.88)"
          : "rgba(0,0,0,0.16)",
        border: isCurrent
          ? "1.5px solid rgba(255,255,255,0.95)"
          : isCompleted
          ? "1.5px solid rgba(255,255,255,0.4)"
          : "1.5px solid rgba(0,0,0,0.12)",
        boxShadow: isCurrent ? "0 0 12px rgba(255,255,255,0.5)" : undefined,
      }}
    >
      {isCompleted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center opacity-90">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      <p className={`text-[10px] font-semibold mb-0.5 ${
        isCompleted ? "text-[rgba(255,255,255,0.7)]"
        : isCurrent ? "text-[#8B6300]"
        : "text-[rgba(255,255,255,0.45)]"
      }`}>
        Day {day}
      </p>

      <div className="w-7 h-7 rounded-full flex items-center justify-center mb-1"
        style={{
          background: isCompleted
            ? "rgba(255,255,255,0.15)"
            : isCurrent
            ? "linear-gradient(135deg, #E8C84A, #D4AF37)"
            : "rgba(255,255,255,0.1)",
        }}>
        <span className="text-xs">✦</span>
      </div>

      <p className={`text-[9px] font-bold leading-tight text-center ${
        isCompleted ? "text-[rgba(255,255,255,0.65)]"
        : isCurrent ? "text-[#8B6300]"
        : "text-[rgba(255,255,255,0.4)]"
      }`}>
        {fmtXaut(reward)}
      </p>
      <p className={`text-[8px] ${
        isCompleted ? "text-[rgba(255,255,255,0.5)]"
        : isCurrent ? "text-[#B8960C]"
        : "text-[rgba(255,255,255,0.3)]"
      }`}>
        XAUT
      </p>
    </div>
  );
}

function Day7Box({ reward, state }: { reward: number; state: DayState }) {
  const isCompleted = state === "completed";
  const isCurrent   = state === "current";

  return (
    <div
      className="relative rounded-xl flex items-center justify-between px-5 py-3 overflow-hidden"
      style={{
        background: isCompleted
          ? "rgba(255,255,255,0.22)"
          : isCurrent
          ? "rgba(255,255,255,0.92)"
          : "rgba(0,0,0,0.16)",
        border: isCurrent
          ? "1.5px solid rgba(255,255,255,0.95)"
          : isCompleted
          ? "1.5px solid rgba(255,255,255,0.4)"
          : "1.5px solid rgba(0,0,0,0.12)",
        boxShadow: isCurrent ? "0 0 18px rgba(255,255,255,0.55)" : undefined,
      }}
    >
      {isCurrent && (
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #FFD700, transparent)" }} />
      )}

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: isCompleted
              ? "rgba(255,255,255,0.2)"
              : isCurrent
              ? "linear-gradient(135deg, #E8C84A 0%, #B8960C 100%)"
              : "rgba(255,255,255,0.1)",
            boxShadow: isCurrent ? "0 2px 8px rgba(180,140,0,0.4)" : undefined,
          }}>
          {isCompleted ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-lg">🏆</span>
          )}
        </div>
        <div>
          <p className={`text-xs font-bold ${
            isCompleted ? "text-[rgba(255,255,255,0.75)]"
            : isCurrent ? "text-[#5C4200]"
            : "text-[rgba(255,255,255,0.45)]"
          }`}>
            Day 7 — Jackpot
          </p>
          <p className={`text-[10px] ${
            isCompleted ? "text-[rgba(255,255,255,0.55)]"
            : isCurrent ? "text-[#8B6300]"
            : "text-[rgba(255,255,255,0.3)]"
          }`}>
            Complete full streak for bonus reward
          </p>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${
          isCompleted ? "text-[rgba(255,255,255,0.8)]"
          : isCurrent ? "text-[#8B6300]"
          : "text-[rgba(255,255,255,0.4)]"
        }`}>
          {fmtXaut(reward)}
        </p>
        <p className={`text-[10px] ${
          isCompleted ? "text-[rgba(255,255,255,0.55)]"
          : isCurrent ? "text-[#B8960C]"
          : "text-[rgba(255,255,255,0.3)]"
        }`}>
          XAUT
        </p>
      </div>
    </div>
  );
}

export function EarnPage() {
  const { setXautBalance, addWalletTx } = useTrading();

  const [ciState, setCiState] = useState<CIState>(loadCIState);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [lastReward, setLastReward] = useState(0);

  const today     = todayStr();
  const yesterday = yesterdayStr();

  const checkedInToday = ciState.lastCheckIn === today;

  const streakBroken =
    ciState.lastCheckIn !== "" &&
    ciState.lastCheckIn !== today &&
    ciState.lastCheckIn !== yesterday;

  const effectiveStreak = streakBroken ? 0 : ciState.streak;
  const nextDay         = (effectiveStreak % 7) + 1;
  const canCheckIn      = !checkedInToday;
  const allDone         = checkedInToday && effectiveStreak === 7;

  const getDayState = (day: number): DayState => {
    if (checkedInToday) {
      return day <= effectiveStreak ? "completed" : "upcoming";
    }
    if (day < nextDay) return "completed";
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
    setLastReward(reward);
    setJustCheckedIn(true);
    setTimeout(() => setJustCheckedIn(false), 3500);
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">

      {/* Header */}
      <div className="relative flex items-center justify-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <span className="font-bold text-[#1A1A1A] text-base">Earn</span>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Daily Check-In Card ── */}
        <div className="rounded-2xl overflow-hidden shadow-lg relative"
          style={{
            background: "linear-gradient(135deg, #E8C84A 0%, #D4AF37 40%, #B8960C 80%, #9B7A1A 100%)",
            boxShadow: "0 6px 24px rgba(180,140,0,0.4), 0 1px 0 rgba(255,255,255,0.3) inset",
          }}>

          {/* Decorative glow circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, #FFE566, transparent)" }} />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, #FFE566, transparent)" }} />

          {/* Card top */}
          <div className="px-5 pt-5 pb-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(0,0,0,0.2)] flex-shrink-0">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
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
                  <span className="text-sm">🔥</span>
                  <span className="text-white font-bold text-xs">{effectiveStreak}d</span>
                </div>
              )}
            </div>

            {/* Streak broken warning */}
            {streakBroken && ciState.lastCheckIn !== "" && (
              <div className="mt-3 bg-[rgba(0,0,0,0.25)] rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <p className="text-[rgba(255,255,255,0.9)] text-xs font-medium">
                  Streak broken! You missed a day — check in now to restart from Day 1.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-[rgba(255,255,255,0.2)] mb-3" />

          {/* 7-day grid */}
          <div className="px-4 pb-5 space-y-2 relative">
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
        </div>

        {/* ── Action Area ── */}
        {justCheckedIn ? (
          <div className="rounded-2xl px-5 py-4 text-center shadow-md"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 16px rgba(22,163,74,0.4)" }}>
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-white font-bold text-base">Checked In Successfully!</p>
            <p className="text-[rgba(255,255,255,0.85)] text-sm mt-1">
              <span className="font-bold">+{fmtXaut(lastReward)} XAUT</span> has been added to your Spot wallet
            </p>
          </div>

        ) : checkedInToday ? (
          <div className="panel-card rounded-2xl border border-[#D4AF37] px-5 py-4">
            {allDone ? (
              <div className="text-center">
                <p className="text-2xl mb-1">🏆</p>
                <p className="font-bold text-[#1A1A1A] text-sm">7-Day Streak Complete!</p>
                <p className="text-xs text-[#666666] mt-1">
                  Amazing! Come back tomorrow to begin a brand new streak.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[#1A1A1A] text-sm">Checked in today!</p>
                  <p className="text-xs text-[#888888] mt-0.5">
                    Come back tomorrow for <span className="font-semibold text-[#C9A227]">Day {(effectiveStreak % 7) + 1}</span>
                    {" "}· +{fmtXaut(DAILY_REWARDS[(effectiveStreak % 7)]) } XAUT
                  </p>
                </div>
              </div>
            )}
          </div>

        ) : (
          <button
            onClick={handleCheckIn}
            className="w-full py-4 rounded-2xl font-bold text-[#1A0F00] transition-all active:scale-[0.98] btn-3d-gold"
            style={{ fontSize: "15px", boxShadow: "0 4px 20px rgba(180,140,0,0.45), 0 1px 0 rgba(255,255,255,0.4) inset" }}
          >
            {streakBroken && ciState.lastCheckIn !== ""
              ? `🔄  Restart Streak  ·  Day 1  ·  +${fmtXaut(DAILY_REWARDS[0])} XAUT`
              : `✅  Check In  ·  Day ${nextDay}  ·  +${fmtXaut(DAILY_REWARDS[nextDay - 1])} XAUT`
            }
          </button>
        )}

        {/* Info card */}
        <div className="panel-silver rounded-xl border border-[#D8D0A8] px-4 py-3 space-y-1.5">
          <p className="text-xs font-bold text-[#555555] flex items-center gap-1.5">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How It Works
          </p>
          <p className="text-[11px] text-[#777777] leading-relaxed">
            Check in every day to build your streak. Miss a single day and your streak resets to Day 1.
            Complete all 7 days to earn the jackpot reward, then start a new cycle!
            All rewards are credited instantly to your Spot XAUT balance.
          </p>
        </div>

      </div>
    </div>
  );
}
