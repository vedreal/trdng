import { useState, useEffect } from "react";
import {
  IconArrowLeft, IconChevronRight, IconShieldLock, IconUsers,
  IconHeadset, IconCopy, IconCheck, IconPhone, IconMail,
  IconAlertTriangle, IconCalendarEvent, IconUser, IconLink,
  IconInfoCircle, IconSend2, IconLock, IconCurrencyDollar,
} from "@tabler/icons-react";

// ── localStorage keys ─────────────────────────────────────────────
const LS_JOIN_DATE     = "profile_join_date_v1";
const LS_SECURITY      = "profile_security_v1";
const LS_REFERRALS     = "referral_count";
const LS_CURRENCY      = "profile_currency_v1";

// ── Currency helpers ──────────────────────────────────────────────
export const CURRENCIES = [
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KRW", name: "South Korean Won" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "USD", name: "United States Dollar" },
  { code: "VND", name: "Vietnamese Dong" },
];
export function loadCurrency(): string {
  return localStorage.getItem(LS_CURRENCY) ?? "USD";
}
function saveCurrency(code: string) { localStorage.setItem(LS_CURRENCY, code); }

const SUPPORT_LINK     = "https://t.me/CatrixSupport"; // ganti link bot support sesuai kebutuhan

// ── Telegram WebApp user (fallback ke mock) ───────────────────────
interface TgUser { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; }
function getTgUser(): TgUser {
  try {
    const u = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TgUser } } } })
      ?.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u?.id) return u;
  } catch { /* ignore */ }
  return { id: 100_001, first_name: "Catrix", last_name: "User", username: "catrix_user" };
}

function getOrSetJoinDate(): string {
  let d = localStorage.getItem(LS_JOIN_DATE);
  if (!d) {
    d = new Date().toISOString();
    localStorage.setItem(LS_JOIN_DATE, d);
  }
  return d;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ── Initials avatar ───────────────────────────────────────────────
function InitialsAvatar({ name, size = 72 }: { name: string; size?: number }) {
  const parts   = name.trim().split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg,#E8C84A 0%,#C9A520 100%)",
        boxShadow: "0 4px 16px rgba(180,140,0,0.4), 0 1px 0 rgba(255,255,255,0.4) inset",
        fontSize: size * 0.32,
        color: "#3A2000",
        letterSpacing: "0.04em",
      }}
    >
      {initials}
    </div>
  );
}



// ── Security state ────────────────────────────────────────────────
interface SecurityData { phone: string; email: string; savedAt: string; }
function loadSecurity(): SecurityData | null {
  try {
    const raw = localStorage.getItem(LS_SECURITY);
    return raw ? (JSON.parse(raw) as SecurityData) : null;
  } catch { return null; }
}
function saveSecurity(d: SecurityData) { localStorage.setItem(LS_SECURITY, JSON.stringify(d)); }

// ── Referral helpers ──────────────────────────────────────────────
const MOCK_REFERRALS = [
  { username: "@trader_alpha", joinedAt: "2025-03-10T08:22:00Z" },
  { username: "@futuresfan99", joinedAt: "2025-03-14T15:45:00Z" },
];
function loadReferrals(): { username: string; joinedAt: string }[] {
  const count = parseInt(localStorage.getItem(LS_REFERRALS) ?? "0", 10);
  return MOCK_REFERRALS.slice(0, Math.min(count, MOCK_REFERRALS.length));
}

// ═══════════════════════════════════════════════════════════════════
// SUB-PAGE: Security
// ═══════════════════════════════════════════════════════════════════
function SecurityPage({ onBack }: { onBack: () => void }) {
  const [saved, setSaved]       = useState<SecurityData | null>(loadSecurity);
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [toast, setToast]       = useState(false);

  const isPhoneValid = /^[+\d][\d\s\-()]{6,18}$/.test(phone.trim());
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit    = isPhoneValid && isEmailValid;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const data: SecurityData = { phone: phone.trim(), email: email.trim(), savedAt: new Date().toISOString() };
    saveSecurity(data);
    setSaved(data);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-hidden">
      {toast && (
        <div className="fixed top-4 left-1/2 z-[70] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{ transform: "translateX(-50%)", background: "linear-gradient(135deg,#22c55e,#15803d)", boxShadow: "0 8px 32px rgba(22,163,74,0.45)", minWidth: 280 }}>
          <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center flex-shrink-0">
            <IconCheck size={16} color="white" stroke={2.5} />
          </div>
          <p className="text-white font-bold text-sm">Security data saved successfully.</p>
        </div>
      )}

      <div className="relative flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack} className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-xl bg-[rgba(0,0,0,0.06)] active:bg-[rgba(0,0,0,0.12)]">
          <IconArrowLeft size={17} color="#1A1A1A" stroke={2} />
        </button>
        <span className="w-full text-center font-bold text-[#1A1A1A] text-base">Security Backup</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Banner */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg,#1A1F3A 0%,#0F1628 60%,#1A2818 100%)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />
          <div className="px-5 py-5 relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(212,175,55,0.15)" }}>
              <IconShieldLock size={22} color="#D4AF37" stroke={1.8} />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Account Security Backup</p>
              <p className="text-[rgba(255,255,255,0.6)] text-xs mt-1 leading-snug">
                Save your contact details to help recover your account if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Warning notice */}
        <div className="flex items-start gap-3 bg-[#FFF8E8] border border-[#E8C84A] rounded-2xl px-4 py-3">
          <div className="flex-shrink-0 mt-0.5">
            <IconAlertTriangle size={20} color="#C9A520" stroke={2} />
          </div>
          <p className="text-[#7A5000] text-[11px] leading-relaxed">
            <span className="font-bold">Important:</span> Security data cannot be edited once submitted. Please ensure all information is accurate before saving. This data is stored locally on your device and is used solely for account recovery purposes.
          </p>
        </div>

        {/* Form or saved view */}
        <div className="panel-silver rounded-2xl border border-[#DDD5B0] overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#EEE8CC]">
            <p className="font-bold text-[#1A1A1A] text-sm">Contact Information</p>
            <p className="text-[#888888] text-xs mt-0.5">
              {saved ? `Saved on ${fmtDate(saved.savedAt)}` : "Enter your details below"}
            </p>
          </div>

          <div className="px-4 py-4 space-y-4">

            {/* Phone */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <IconPhone size={13} color="#8B6300" stroke={2} />
                <p className="text-[#1A1A1A] text-xs font-bold">Phone Number</p>
              </div>
              {saved ? (
                <div className="flex items-center gap-2 bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2.5">
                  <IconLock size={12} color="#AAAAAA" stroke={2} />
                  <p className="text-[#1A1A1A] text-sm font-medium flex-1">{saved.phone}</p>
                  <span className="text-[10px] text-[#AAAAAA] font-medium">Locked</span>
                </div>
              ) : (
                <input
                  type="tel"
                  placeholder="+62 812 3456 7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A520]"
                />
              )}
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <IconMail size={13} color="#8B6300" stroke={2} />
                <p className="text-[#1A1A1A] text-xs font-bold">Email Address</p>
              </div>
              {saved ? (
                <div className="flex items-center gap-2 bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2.5">
                  <IconLock size={12} color="#AAAAAA" stroke={2} />
                  <p className="text-[#1A1A1A] text-sm font-medium flex-1">{saved.email}</p>
                  <span className="text-[10px] text-[#AAAAAA] font-medium">Locked</span>
                </div>
              ) : (
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A520]"
                />
              )}
            </div>
          </div>

          {/* Submit */}
          {!saved && (
            <div className="px-4 pb-4">
              {!canSubmit && (phone || email) && (
                <div className="flex items-center gap-2 mb-3 bg-[#FFF8E8] border border-[#E8C84A] rounded-xl px-3 py-2">
                  <IconInfoCircle size={12} color="#C9A520" stroke={2} />
                  <p className="text-[#8B6300] text-[11px]">Please enter a valid phone number and email address.</p>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{
                  background: canSubmit ? "linear-gradient(to bottom,#E8C84A,#C9A520)" : "#E5E5E5",
                  color:      canSubmit ? "#3A2000" : "#AAAAAA",
                  boxShadow:  canSubmit ? "0 3px 0 rgba(0,0,0,0.15), 0 6px 16px rgba(180,140,0,0.25)" : "none",
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <IconShieldLock size={15} color={canSubmit ? "#3A2000" : "#AAAAAA"} stroke={2} />
                  Save Security Backup
                </div>
              </button>
            </div>
          )}

          {saved && (
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-[#bbf7d0] bg-green-50 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <IconCheck size={15} color="white" stroke={2.5} />
                </div>
                <div>
                  <p className="text-green-800 font-bold text-xs">Security backup is active</p>
                  <p className="text-green-700 text-[11px] mt-0.5">Your contact details are saved and locked.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-PAGE: Referral
// ═══════════════════════════════════════════════════════════════════
function ReferralPage({ onBack, userId }: { onBack: () => void; userId: number }) {
  const [copied, setCopied] = useState(false);
  const referrals           = loadReferrals();
  const REFERRAL_LINK       = `https://t.me/CatrixTrading?start=ref_${userId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(REFERRAL_LINK).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-hidden">
      <div className="relative flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack} className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-xl bg-[rgba(0,0,0,0.06)] active:bg-[rgba(0,0,0,0.12)]">
          <IconArrowLeft size={17} color="#1A1A1A" stroke={2} />
        </button>
        <span className="w-full text-center font-bold text-[#1A1A1A] text-base">Referral</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Banner */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg,#1A1F3A 0%,#0F1628 60%,#1A2818 100%)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />
          <div className="px-5 py-5 relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(212,175,55,0.15)" }}>
              <IconUsers size={22} color="#D4AF37" stroke={1.8} />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Invite Friends</p>
              <p className="text-[rgba(255,255,255,0.6)] text-xs mt-1 leading-snug">
                Share your referral link and grow the Catrix Trading community.
              </p>
            </div>
          </div>
        </div>

        {/* Referral link */}
        <div className="panel-silver rounded-2xl border border-[#DDD5B0] overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#EEE8CC]">
            <div className="flex items-center gap-2">
              <IconLink size={13} color="#8B6300" stroke={2} />
              <p className="font-bold text-[#1A1A1A] text-sm">Your Referral Link</p>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 bg-[#F7F3E8] border border-[#DDD5B0] rounded-xl px-3 py-2.5 mb-3">
              <p className="flex-1 text-[11px] text-[#555555] truncate font-mono">{REFERRAL_LINK}</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97]"
              style={{
                background: copied ? "#dcfce7" : "linear-gradient(to bottom,#E8C84A,#C9A520)",
                color:      copied ? "#16a34a" : "#3A2000",
                boxShadow:  copied ? "none" : "0 3px 0 rgba(0,0,0,0.15), 0 6px 16px rgba(180,140,0,0.25)",
                border:     copied ? "1px solid #bbf7d0" : "none",
              }}
            >
              <div className="flex items-center justify-center gap-2">
                {copied
                  ? <><IconCheck size={15} color="#16a34a" stroke={2.5} /> Link Copied!</>
                  : <><IconCopy size={15} color="#3A2000" stroke={2} /> Copy Referral Link</>
                }
              </div>
            </button>
          </div>
        </div>

        {/* Referral list */}
        <div className="panel-silver rounded-2xl border border-[#DDD5B0] overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#EEE8CC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconUsers size={13} color="#8B6300" stroke={2} />
              <p className="font-bold text-[#1A1A1A] text-sm">Referred Users</p>
            </div>
            <span className="bg-[#F0EAD0] text-[#8B6300] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]">
              {referrals.length} joined
            </span>
          </div>

          {referrals.length === 0 ? (
            <div className="px-4 py-8 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <IconUsers size={22} color="#CCCCCC" stroke={1.8} />
              </div>
              <p className="text-[#BBBBBB] text-xs font-medium text-center">No referrals yet.<br />Share your link to invite friends.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EEE8CC]">
              {referrals.map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                    style={{ background: "linear-gradient(135deg,#E8C84A,#C9A520)", color: "#3A2000" }}>
                    {r.username.replace("@", "").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1A1A] text-xs font-semibold truncate">{r.username}</p>
                    <p className="text-[#AAAAAA] text-[10px] mt-0.5">Joined {fmtDate(r.joinedAt)}</p>
                  </div>
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <IconCheck size={9} color="#16a34a" stroke={3} /> Verified
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-PAGE: Currency
// ═══════════════════════════════════════════════════════════════════
function CurrencyPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState(loadCurrency);

  const handleSelect = (code: string) => {
    saveCurrency(code);
    setSelected(code);
  };

  return (
    <div className="flex flex-col h-full page-bg overflow-hidden">
      <div className="relative flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack} className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-xl bg-[rgba(0,0,0,0.06)] active:bg-[rgba(0,0,0,0.12)]">
          <IconArrowLeft size={17} color="#1A1A1A" stroke={2} />
        </button>
        <span className="w-full text-center font-bold text-[#1A1A1A] text-base">Display Currency</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Banner */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg,#1A1F3A 0%,#0F1628 60%,#1A2818 100%)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />
          <div className="px-5 py-5 relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(212,175,55,0.15)" }}>
              <IconCurrencyDollar size={22} color="#D4AF37" stroke={1.8} />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Display Currency</p>
              <p className="text-[rgba(255,255,255,0.6)] text-xs mt-1 leading-snug">
                Select your preferred currency for display.
              </p>
            </div>
          </div>
        </div>

        {/* Currency list */}
        <div className="panel-silver rounded-2xl border border-[#DDD5B0] overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#EEE8CC]">
            <p className="font-bold text-[#1A1A1A] text-sm">Select Currency</p>
            <p className="text-[#888888] text-xs mt-0.5">Currently: {selected}</p>
          </div>
          <div className="divide-y divide-[#EEE8CC]">
            {CURRENCIES.map((c) => {
              const active = selected === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => handleSelect(c.code)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-[#FFF8E8] transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                    style={{
                      background: active
                        ? "linear-gradient(to bottom,#E8C84A,#C9A520)"
                        : "linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(240,235,215,0.92) 100%)",
                      boxShadow: active
                        ? "0 3px 0 rgba(0,0,0,0.18), 0 5px 14px rgba(180,140,0,0.25)"
                        : "0 2px 0 rgba(0,0,0,0.10), 0 3px 8px rgba(0,0,0,0.08)",
                      color: active ? "#3A2000" : "#888888",
                    }}
                  >
                    {c.code.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1A1A] font-bold text-sm">{c.code}</p>
                    <p className="text-[#888888] text-[11px] mt-0.5">{c.name}</p>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
                      <IconCheck size={11} color="#3A2000" stroke={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PROFILE PAGE
// ═══════════════════════════════════════════════════════════════════
type View = "main" | "security" | "referral" | "currency";

export function ProfilePage() {
  const [view, setView] = useState<View>("main");
  const [user]          = useState(getTgUser);
  const [joinDate]      = useState(getOrSetJoinDate);

  // Re-render on security/referral save
  const [, forceUpdate] = useState(0);
  useEffect(() => { forceUpdate((n) => n + 1); }, [view]);

  if (view === "security") return (
    <div key="security" className="page-enter h-full">
      <SecurityPage onBack={() => setView("main")} />
    </div>
  );
  if (view === "referral") return (
    <div key="referral" className="page-enter h-full">
      <ReferralPage onBack={() => setView("main")} userId={user.id} />
    </div>
  );
  if (view === "currency") return (
    <div key="currency" className="page-enter h-full">
      <CurrencyPage onBack={() => setView("main")} />
    </div>
  );

  const displayName  = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const handle       = user.username ? `@${user.username}` : `ID: ${user.id}`;
  const security     = loadSecurity();
  const referrals    = loadReferrals();

  const currency = loadCurrency();

  const menuItems = [
    {
      id:      "security",
      icon: IconShieldLock,
      iconColor: "#5C3A00",
      iconBg:  "linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,242,170,0.92) 100%)",
      iconBorder: "transparent",
      iconShadow: "0 3px 0 rgba(0,0,0,0.18), 0 5px 14px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8) inset",
      title:   "Security Backup",
      sub:     security ? "Phone & email saved" : "Add phone & email",
      badge:   security ? "Saved" : "Not set",
      badgeOk: !!security,
      onClick: () => setView("security"),
    },
    {
      id:      "referral",
      icon: IconUsers,
      iconColor: "#5C3A00",
      iconBg:  "linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,242,170,0.92) 100%)",
      iconBorder: "transparent",
      iconShadow: "0 3px 0 rgba(0,0,0,0.18), 0 5px 14px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8) inset",
      title:   "Referral",
      sub:     `${referrals.length} friend${referrals.length !== 1 ? "s" : ""} joined`,
      badge:   "",
      badgeOk: false,
      onClick: () => setView("referral"),
    },
    {
      id:      "currency",
      icon: IconCurrencyDollar,
      iconColor: "#5C3A00",
      iconBg:  "linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,242,170,0.92) 100%)",
      iconBorder: "transparent",
      iconShadow: "0 3px 0 rgba(0,0,0,0.18), 0 5px 14px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8) inset",
      title:   "Display Currency",
      sub:     CURRENCIES.find((c) => c.code === currency)?.name ?? "United States Dollar",
      badge:   currency,
      badgeOk: false,
      onClick: () => setView("currency"),
    },
  ];

  return (
    <div key="profile-main" className="page-enter flex flex-col h-full page-bg overflow-y-auto pb-28">

      {/* Header */}
      <div className="relative flex items-center justify-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <span className="font-bold text-[#1A1A1A] text-base">Profile</span>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── Profile Card ── */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg,#1A1F3A 0%,#0F1628 60%,#1A2818 100%)", boxShadow: "0 6px 24px rgba(0,0,0,0.35)" }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle,#D4AF37,transparent)" }} />

          <div className="px-5 pt-6 pb-5 relative">
            <div className="flex items-center gap-4">
              {user.photo_url ? (
                <img src={user.photo_url} alt={displayName}
                  className="w-[72px] h-[72px] rounded-full object-cover border-2 border-[#D4AF37] flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <InitialsAvatar name={displayName} size={72} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-lg leading-tight truncate">{displayName}</p>
                <p className="text-[#D4AF37] text-sm font-medium mt-0.5">{handle}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <IconCalendarEvent size={11} color="rgba(255,255,255,0.45)" stroke={2} />
                  <p className="text-[rgba(255,255,255,0.45)] text-[11px]">
                    Member since {fmtDate(joinDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)] grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-white font-bold text-sm">{user.id}</p>
                <p className="text-[rgba(255,255,255,0.4)] text-[10px] mt-0.5">User ID</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm">Healthy</p>
                <p className="text-[rgba(255,255,255,0.4)] text-[10px] mt-0.5">Account</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Menu Items ── */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <button key={item.id} onClick={item.onClick}
              className="w-full text-left panel-silver rounded-2xl border border-[#DDD5B0] overflow-hidden active:scale-[0.985] transition-transform">
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: item.iconBg, boxShadow: (item as any).iconShadow ?? "0 2px 0 rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.1)" }}>
                  <item.icon size={19} color={item.iconColor} stroke={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1A1A1A] font-bold text-sm">{item.title}</p>
                  <p className="text-[#888888] text-[11px] mt-0.5">{item.sub}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeOk
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-[#F0EAD0] text-[#8B6300] border border-[#D4AF37]"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <IconChevronRight size={15} color="#CCCCCC" stroke={2} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Support Button ── */}
        <a
          href={SUPPORT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full panel-silver rounded-2xl border border-[#DDD5B0] px-4 py-3.5 active:scale-[0.985] transition-transform"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,242,170,0.92) 100%)",
              boxShadow: "0 3px 0 rgba(0,0,0,0.18), 0 5px 14px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8) inset",
            }}>
            <IconHeadset size={19} color="#5C3A00" stroke={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1A1A1A] font-bold text-sm">Support</p>
            <p className="text-[#888888] text-[11px] mt-0.5">Contact our team via Telegram</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <IconSend2 size={15} color="#D4AF37" stroke={1.8} />
          </div>
        </a>

        <div className="h-4" />
      </div>
    </div>
  );
}
