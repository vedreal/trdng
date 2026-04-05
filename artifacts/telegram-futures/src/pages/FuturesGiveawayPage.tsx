import { useState, useRef } from "react";
import { useTrading } from "../contexts/TradingContext";
import {
  IconArrowLeft, IconCheck, IconCircleX, IconSend2, IconLink,
  IconUsers, IconMail, IconGift, IconShieldCheck, IconCopy,
  IconAlertTriangle, IconClockHour3,
} from "@tabler/icons-react";

const GIVEAWAY_LS_KEY = "giveaway_futures_v1";
const REFERRAL_COUNT_KEY = "referral_count";
const USDT_ICON = "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiar6ik6oswrb7ncslxa2aeopdg7ifn252akbcpvd572v7u34dzcqq";
const BONUS_AMOUNT = 30;

function loadParticipated(): boolean {
  return localStorage.getItem(GIVEAWAY_LS_KEY) === "1";
}
function saveParticipated() {
  localStorage.setItem(GIVEAWAY_LS_KEY, "1");
}
function getReferralCount(): number {
  return parseInt(localStorage.getItem(REFERRAL_COUNT_KEY) ?? "0", 10);
}


type TaskStatus = "pending" | "done" | "error";

interface GiveawayState {
  telegram: TaskStatus;
  xLink: string;
  xDone: boolean;
  email: string;
  emailDone: boolean;
  referral: TaskStatus;
  referralCount: number;
}

function taskBadge(status: TaskStatus | boolean, pendingLabel = "Pending") {
  if (status === true || status === "done") {
    return (
      <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
        <IconCheck size={9} color="#16a34a" stroke={3} /> Verified
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
        <IconCircleX size={9} color="#dc2626" stroke={2.5} /> Insufficient
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 bg-[#F0EAD0] text-[#8B6300] text-[10px] font-bold px-2 py-0.5 rounded-full">
      <IconClockHour3 size={9} color="#8B6300" stroke={2} /> {pendingLabel}
    </span>
  );
}

interface Props { onBack: () => void; }

export function FuturesGiveawayPage({ onBack }: Props) {
  const { addFuturesBonus } = useTrading();
  const [participated, setParticipated] = useState(loadParticipated);
  const [showToast, setShowToast]       = useState(false);
  const [copied, setCopied]             = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gs, setGs] = useState<GiveawayState>({
    telegram: "pending",
    xLink: "",
    xDone: false,
    email: "",
    emailDone: false,
    referral: "pending",
    referralCount: 0,
  });

  const REFERRAL_LINK = "https://t.me/CatrixTrading?start=ref_USER001";

  const isXLinkValid  = gs.xLink.trim().startsWith("http") && gs.xLink.trim().length > 15;
  const isEmailValid  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gs.email.trim());
  const allDone =
    gs.telegram === "done" &&
    gs.xDone && isXLinkValid &&
    gs.emailDone && isEmailValid &&
    gs.referral === "done";

  const handleTelegramCheck = () => setGs((p) => ({ ...p, telegram: "done" }));

  const handleXSubmit = () => {
    if (!isXLinkValid) return;
    setGs((p) => ({ ...p, xDone: true }));
  };

  const handleEmailSubmit = () => {
    if (!isEmailValid) return;
    setGs((p) => ({ ...p, emailDone: true }));
  };

  const handleReferralCheck = () => {
    const count = getReferralCount();
    if (count >= 2) {
      setGs((p) => ({ ...p, referral: "done", referralCount: count }));
    } else {
      setGs((p) => ({ ...p, referral: "error", referralCount: count }));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(REFERRAL_LINK).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParticipate = () => {
    if (!allDone || participated) return;
    saveParticipated();
    setParticipated(true);
    addFuturesBonus(BONUS_AMOUNT);
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-hidden">

      {/* ── Toast ── */}
      {showToast && (
        <div className="fixed top-4 left-1/2 z-[70] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl"
          style={{ transform: "translateX(-50%)", background: "linear-gradient(135deg,#22c55e,#15803d)", boxShadow: "0 8px 32px rgba(22,163,74,0.45)", minWidth: 290, maxWidth: 340 }}>
          <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <IconCheck size={18} color="white" stroke={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Participation Successful!</p>
            <p className="text-[rgba(255,255,255,0.85)] text-xs mt-1 leading-snug">
              Your submission is under review. A <span className="font-bold">30 USDT Futures Bonus</span> will be credited within 24 hours.
            </p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative flex items-center px-4 py-3 flex-shrink-0">
        <button onClick={onBack}
          className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-xl bg-[rgba(0,0,0,0.06)] active:bg-[rgba(0,0,0,0.12)]">
          <IconArrowLeft size={17} color="#1A1A1A" stroke={2} />
        </button>
        <span className="w-full text-center font-bold text-[#1A1A1A] text-base">Futures Giveaway</span>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28">

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
                <IconGift size={22} color="#D4AF37" stroke={1.8} />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">30 USDT</p>
                <p className="text-[#D4AF37] text-xs font-semibold">Futures Trading Bonus</p>
              </div>
            </div>

            <p className="text-[rgba(255,255,255,0.7)] text-xs leading-relaxed">
              Complete all tasks below to receive a <span className="text-white font-semibold">$30 Futures Bonus</span> credited directly to your Futures account. New users only!
            </p>
          </div>

          <div className="mx-5 border-t border-[rgba(255,255,255,0.08)] mb-4" />

          <div className="px-5 pb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Reward",       value: "30 USDT"  },
              { label: "Bonus Valid",  value: "7 Days"   },
              { label: "Participants", value: "Limited"  },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-white font-bold text-sm">{item.value}</p>
                <p className="text-[rgba(255,255,255,0.45)] text-[10px] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tasks Card ── */}
        <div className="panel-silver rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <p className="font-bold text-[#1A1A1A] text-sm">Complete All Tasks</p>
            <p className="text-[#888888] text-xs mt-0.5">All tasks must be completed to qualify</p>
          </div>

          <div className="divide-y divide-[#EEE8CC]">

            {/* Task 1: Telegram */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: gs.telegram === "done" ? "#dcfce7" : "#EFF6FF" }}>
                    <IconSend2 size={13} color={gs.telegram === "done" ? "#16a34a" : "#3b82f6"} stroke={2} />
                  </div>
                  <p className="text-[#1A1A1A] text-xs font-bold">Subscribe Telegram Channel</p>
                </div>
                {taskBadge(gs.telegram)}
              </div>
              <p className="text-[#777777] text-[11px] mb-3 leading-snug">
                Subscribe to the official Catrix Trading Telegram channel to stay updated with announcements and events.
              </p>
              <div className="flex gap-2">
                <a href="https://t.me/CatrixTrading" target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2 rounded-xl text-center text-xs font-semibold border border-[#3b82f6] text-[#3b82f6] bg-[#EFF6FF] active:opacity-80">
                  Open Channel
                </a>
                <button onClick={handleTelegramCheck} disabled={gs.telegram === "done"}
                  className="flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all active:scale-[0.97]"
                  style={{
                    background: gs.telegram === "done" ? "#dcfce7" : "linear-gradient(to bottom,#E8C84A,#C9A520)",
                    color:      gs.telegram === "done" ? "#16a34a" : "#5C3A00",
                    border:     gs.telegram === "done" ? "1px solid #bbf7d0" : "none",
                  }}>
                  {gs.telegram === "done" ? "Verified" : "Check"}
                </button>
              </div>
            </div>

            {/* Task 2: X Post */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: gs.xDone ? "#dcfce7" : "#F5F5F5" }}>
                    <IconLink size={13} color={gs.xDone ? "#16a34a" : "#1A1A1A"} stroke={2} />
                  </div>
                  <p className="text-[#1A1A1A] text-xs font-bold">Post on X (Twitter)</p>
                </div>
                {taskBadge(gs.xDone)}
              </div>
              <p className="text-[#777777] text-[11px] mb-3 leading-snug">
                Make a public post about Catrix Trading on X and paste the link below. Include <span className="font-semibold text-[#1A1A1A]">#CatrixTrading</span> in your post.
              </p>
              {!gs.xDone ? (
                <div className="flex gap-2">
                  <input type="url" placeholder="https://x.com/yourpost/..."
                    value={gs.xLink}
                    onChange={(e) => setGs((p) => ({ ...p, xLink: e.target.value }))}
                    className="flex-1 bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#C9A520]" />
                  <button onClick={handleXSubmit} disabled={!isXLinkValid}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: isXLinkValid ? "linear-gradient(to bottom,#E8C84A,#C9A520)" : "#E5E5E5",
                      color:      isXLinkValid ? "#5C3A00" : "#AAAAAA",
                    }}>
                    Submit
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <IconCheck size={11} color="#16a34a" stroke={3} />
                  <p className="text-green-700 text-[11px] font-semibold truncate">{gs.xLink}</p>
                </div>
              )}
            </div>

            {/* Task 3: Email */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: gs.emailDone ? "#dcfce7" : "#FFF8E8" }}>
                    <IconMail size={13} color={gs.emailDone ? "#16a34a" : "#D4AF37"} stroke={2} />
                  </div>
                  <p className="text-[#1A1A1A] text-xs font-bold">Submit Email Address</p>
                </div>
                {taskBadge(gs.emailDone)}
              </div>
              <p className="text-[#777777] text-[11px] mb-3 leading-snug">
                Provide your email address for bonus notification and account verification purposes.
              </p>
              {!gs.emailDone ? (
                <div className="flex gap-2">
                  <input type="email" placeholder="your@email.com"
                    value={gs.email}
                    onChange={(e) => setGs((p) => ({ ...p, email: e.target.value }))}
                    className="flex-1 bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#C9A520]" />
                  <button onClick={handleEmailSubmit} disabled={!isEmailValid}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: isEmailValid ? "linear-gradient(to bottom,#E8C84A,#C9A520)" : "#E5E5E5",
                      color:      isEmailValid ? "#5C3A00" : "#AAAAAA",
                    }}>
                    Submit
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <IconCheck size={11} color="#16a34a" stroke={3} />
                  <p className="text-green-700 text-[11px] font-semibold">{gs.email}</p>
                </div>
              )}
            </div>

            {/* Task 4: Referral */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: gs.referral === "done" ? "#dcfce7" : gs.referral === "error" ? "#fee2e2" : "#F0EAD0" }}>
                    <IconUsers size={13}
                      color={gs.referral === "done" ? "#16a34a" : gs.referral === "error" ? "#dc2626" : "#8B6300"} stroke={2} />
                  </div>
                  <p className="text-[#1A1A1A] text-xs font-bold">Invite 2 Friends</p>
                </div>
                {taskBadge(gs.referral, "Required: 2")}
              </div>
              <p className="text-[#777777] text-[11px] mb-3 leading-snug">
                Share your referral link and have at least <span className="font-semibold text-[#1A1A1A]">2 friends</span> register using your link to qualify.
              </p>

              {/* Referral link row */}
              <div className="flex items-center gap-2 bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2 mb-3">
                <p className="flex-1 text-[10px] text-[#555555] truncate font-mono">{REFERRAL_LINK}</p>
                <button onClick={handleCopyLink}
                  className="flex-shrink-0 flex items-center gap-1 text-[#C9A520] text-[10px] font-bold">
                  <IconCopy size={12} color="#C9A520" stroke={2} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {gs.referral === "error" && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                  <IconAlertTriangle size={12} color="#dc2626" stroke={2} />
                  <p className="text-red-600 text-[11px] leading-snug">
                    You currently have <span className="font-bold">{gs.referralCount} referral{gs.referralCount !== 1 ? "s" : ""}</span>. Minimum 2 required to qualify.
                  </p>
                </div>
              )}

              <button onClick={handleReferralCheck} disabled={gs.referral === "done"}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                style={{
                  background: gs.referral === "done" ? "#dcfce7" : "linear-gradient(to bottom,#E8C84A,#C9A520)",
                  color:      gs.referral === "done" ? "#16a34a" : "#5C3A00",
                  border:     gs.referral === "done" ? "1px solid #bbf7d0" : "none",
                }}>
                {gs.referral === "done"
                  ? `Verified — ${gs.referralCount} Referral${gs.referralCount !== 1 ? "s" : ""}`
                  : "Check Referral Count"}
              </button>
            </div>
          </div>

          {/* ── Participate button — inside tasks card, below Task 4 ── */}
          <div className="px-4 py-4 border-t border-[#EEE8CC]">
            {participated ? (
              <div className="rounded-xl border border-[#bbf7d0] bg-green-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <IconCheck size={18} color="white" stroke={2.5} />
                  </div>
                  <div>
                    <p className="text-green-800 font-bold text-sm">Already Participated</p>
                    <p className="text-green-700 text-xs mt-0.5">
                      Under review — bonus will be credited within 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {!allDone && (
                  <div className="flex items-center gap-2 bg-[#FFF8E8] border border-[#E8C84A] rounded-xl px-3 py-2.5">
                    <IconAlertTriangle size={13} color="#C9A520" stroke={2} />
                    <p className="text-[#8B6300] text-[11px] font-medium">Complete all tasks above to enable participation.</p>
                  </div>
                )}
                <button
                  onClick={handleParticipate}
                  disabled={!allDone}
                  className="w-full py-4 rounded-xl font-bold text-[14px] transition-all active:scale-[0.98]"
                  style={{
                    background: allDone ? "linear-gradient(to bottom,#E8C84A 0%,#C9A520 100%)" : "#E5E5E5",
                    color:      allDone ? "#3A2000" : "#AAAAAA",
                    boxShadow:  allDone ? "0 3px 0 rgba(0,0,0,0.18), 0 6px 18px rgba(180,140,0,0.3), 0 1px 0 rgba(255,255,255,0.4) inset" : "none",
                  }}>
                  <div className="flex items-center justify-center gap-2">
                    <img src={USDT_ICON} alt="USDT" className="w-5 h-5 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    Participate & Claim $30 Futures Bonus
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Terms & Conditions ── */}
        <div className="panel-silver rounded-2xl px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <IconShieldCheck size={14} color="#8B6300" stroke={2} />
            <p className="text-[#1A1A1A] text-xs font-bold">Bonus Terms & Conditions</p>
          </div>
          <div className="space-y-2">
            {[
              "The Futures Bonus can only be used to open Futures trading positions and cannot be withdrawn directly.",
              "The bonus itself cannot be transferred to your Spot wallet. Only profits earned using the bonus may be transferred and withdrawn.",
              "Each user is eligible for this bonus only once. Duplicate accounts or attempts to claim multiple times will result in disqualification.",
              "The bonus will expire 7 days after it is credited. Any unused bonus will be forfeited upon expiry.",
              "Any form of manipulation, fraudulent activity, or abuse of the referral system will result in immediate cancellation of the bonus and any profits generated.",
              "Catrix Trading reserves the right to modify, suspend, or terminate this event at any time without prior notice.",
              "Participation in this event constitutes acceptance of all terms and conditions listed above.",
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
