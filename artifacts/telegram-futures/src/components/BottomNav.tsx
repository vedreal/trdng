import {
  IconWallet,
  IconChartCandle,
  IconCoins,
  IconUserCircle,
} from "@tabler/icons-react";

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
      icon: <IconWallet size={22} stroke={1.8} />,
    },
    {
      id: "futures",
      label: "Futures",
      icon: <IconChartCandle size={22} stroke={1.8} />,
    },
    {
      id: "earn",
      label: "Earn",
      icon: <IconCoins size={22} stroke={1.8} />,
    },
    {
      id: "profile",
      label: "Profile",
      icon: <IconUserCircle size={22} stroke={1.8} />,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3 pointer-events-auto">
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(232,200,74,0.72) 0%, rgba(212,175,55,0.78) 40%, rgba(184,150,12,0.82) 80%, rgba(155,122,26,0.85) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 2px 0 rgba(255,255,255,0.25) inset",
          }}
        >
          {/* Subtle top glare */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "rgba(255,255,255,0.45)" }}
          />

          <div className="flex items-center justify-around px-3 py-2">
            {items.map((item) => {
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className="flex items-center justify-center transition-all active:scale-90"
                >
                  <div
                    className="w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 52,
                      height: 52,
                      background: active
                        ? "linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,242,170,0.92) 100%)"
                        : "linear-gradient(to bottom, rgba(255,255,255,0.78) 0%, rgba(255,235,140,0.68) 100%)",
                      boxShadow: active
                        ? "0 3px 0 rgba(0,0,0,0.2), 0 6px 16px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.8) inset"
                        : "0 2px 0 rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.5) inset",
                      color: active ? "#5C3A00" : "#8B6300",
                      transition: "all 0.45s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  >
                    {item.icon}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
