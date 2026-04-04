import { useState, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TradingProvider } from "@/contexts/TradingContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { BottomNav } from "@/components/BottomNav";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { FuturesPage } from "@/pages/FuturesPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { ReceivePage } from "@/pages/ReceivePage";
import { SendPage } from "@/pages/SendPage";
import { SwapPage } from "@/pages/SwapPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { EarnPage } from "@/pages/EarnPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { useBinancePrice } from "@/hooks/useBinancePrice";

const queryClient = new QueryClient();

type NavPage = "portfolio" | "futures" | "earn" | "profile";
type SubRoute = null | "receive" | "send" | "swap" | "history";

function AppContent() {
  const [page, setPage] = useState<NavPage>("futures");
  const [subRoute, setSubRoute] = useState<SubRoute>(null);
  const [animClass, setAnimClass] = useState("page-enter");
  const [animKey, setAnimKey] = useState(0);
  const prevSubRoute = useRef<SubRoute>(null);

  const triggerAnim = (cls: string) => {
    setAnimClass(cls);
    setAnimKey((k) => k + 1);
  };

  const { price: bnbPrice } = useBinancePrice("BNBUSDT");

  const handleNavChange = (p: NavPage) => {
    if (p === page && subRoute === null) return;
    setSubRoute(null);
    prevSubRoute.current = null;
    setPage(p);
    triggerAnim("page-enter");
  };

  const handleNavigate = (route: "receive" | "send" | "swap" | "history") => {
    prevSubRoute.current = subRoute;
    setSubRoute(route);
    triggerAnim("subroute-enter");
  };

  const handleBack = () => {
    prevSubRoute.current = subRoute;
    setSubRoute(null);
    triggerAnim("subroute-back-enter");
  };

  const showBottomNav = subRoute === null;

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden" style={{ height: "100dvh" }}>
      <AnimatedBackground />
      <div className="h-full overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
        <div key={animKey} className={`${animClass} h-full`}>
          {subRoute === "receive" && <ReceivePage onBack={handleBack} />}
          {subRoute === "send"    && <SendPage onBack={handleBack} bnbPrice={bnbPrice} />}
          {subRoute === "swap"    && <SwapPage onBack={handleBack} bnbPrice={bnbPrice} />}
          {subRoute === "history" && <HistoryPage onBack={handleBack} />}
          {subRoute === null && (
            <>
              {page === "portfolio" && <PortfolioPage onNavigate={handleNavigate} />}
              {page === "futures"   && <FuturesPage />}
              {page === "earn"      && <EarnPage />}
              {page === "profile"   && <ProfilePage />}
            </>
          )}
        </div>
      </div>
      {showBottomNav && <BottomNav current={page} onChange={handleNavChange} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TradingProvider>
        <CurrencyProvider>
          <AppContent />
        </CurrencyProvider>
      </TradingProvider>
    </QueryClientProvider>
  );
}

export default App;
