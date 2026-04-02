type NavPage = "portfolio" | "futures" | "earn" | "profile";

interface BottomNavProps {
  current: NavPage;
  onChange: (page: NavPage) => void;
}

export function BottomNav({ current, onChange }: BottomNavProps) {
  const items: { id: NavPage; label: string; icon: React.ReactNode }[] = [
    {
      id: "portfolio",
      label: "Portfolio",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4m-2-2h4" />
        </svg>
      ),
    },
    {
      id: "futures",
      label: "Futures",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: "earn",
      label: "Earn",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="8" width="18" height="10" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 6h.01M17 6h.01" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="8" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-4 pointer-events-auto">
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #E8C84A 0%, #D4AF37 40%, #B8960C 80%, #9B7A1A 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 2px 0 rgba(255,255,255,0.25) inset",
          }}
        >
          {/* Subtle top glare */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "rgba(255,255,255,0.35)" }}
          />

          <div className="flex items-center justify-around px-3 py-3">
            {items.map((item) => {
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className="flex flex-col items-center gap-1.5 transition-all active:scale-95"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: active
                        ? "linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,242,170,0.92) 100%)"
                        : "linear-gradient(to bottom, rgba(255,255,255,0.78) 0%, rgba(255,235,140,0.68) 100%)",
                      boxShadow: active
                        ? "0 3px 0 rgba(0,0,0,0.2), 0 6px 16px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.8) inset"
                        : "0 2px 0 rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.5) inset",
                      color: active ? "#5C3A00" : "#8B6300",
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    className="text-[10px] leading-none"
                    style={{
                      fontWeight: active ? 700 : 600,
                      color: active ? "#2A1500" : "rgba(60,30,0,0.65)",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
