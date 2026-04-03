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
  const items: { id: NavPage; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "portfolio",
      label: "Portfolio",
      icon: (active) => <IconWallet size={40} stroke={active ? 2.2 : 1.7} />,
    },
    {
      id: "futures",
      label: "Futures",
      icon: (active) => <IconChartCandle size={40} stroke={active ? 2.2 : 1.7} />,
    },
    {
      id: "earn",
      label: "Earn",
      icon: (active) => <IconCoins size={40} stroke={active ? 2.2 : 1.7} />,
    },
    {
      id: "profile",
      label: "Profile",
      icon: (active) => <IconUserCircle size={40} stroke={active ? 2.2 : 1.7} />,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-md mx-auto pb-6 flex justify-center pointer-events-auto">
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(232,200,74,0.38) 0%, rgba(212,175,55,0.44) 40%, rgba(184,150,12,0.48) 80%, rgba(155,122,26,0.52) 100%)",
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

          <div className="flex items-center gap-0 px-3 py-2">
            {items.map((item) => {
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className="flex flex-col items-center justify-center px-2.5 py-1 transition-all active:scale-90"
                  style={{
                    color: active ? "#D4AF37" : "rgba(255,255,255,0.82)",
                    filter: active ? "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {item.icon(active)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
