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
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: "earn",
      label: "Earn",
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="8" width="18" height="10" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 6h.01M17 6h.01" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="8" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#C8B040]"
      style={{ background: 'linear-gradient(90deg, #ECECEC 0%, #E4DFC4 100%)' }}>
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
                active ? "text-[#C9A227]" : "text-[#888888]"
              }`}
            >
              {item.icon}
              <span className={`text-[10px] font-medium ${active ? "font-bold" : ""}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
