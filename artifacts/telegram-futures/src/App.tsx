import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TradingProvider } from "@/contexts/TradingContext";
import { BottomNav } from "@/components/BottomNav";
import { FuturesPage } from "@/pages/FuturesPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { ReceivePage } from "@/pages/ReceivePage";
import { SendPage } from "@/pages/SendPage";
import { SwapPage } from "@/pages/SwapPage";
import { EarnPage } from "@/pages/EarnPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { useBinancePrice } from "@/hooks/useBinancePrice";

const queryClient = new QueryClient();

type NavPage = "portfolio" | "futures" | "earn" | "profile";
type SubRoute = null | "receive" | "send" | "swap";

function AppContent() {
  const [page, setPage] = useState<NavPage>("futures");
  const [subRoute, setSubRoute] = useState<SubRoute>(null);
  const { price: bnbPrice } = useBinancePrice("BNBUSDT");

  const handleNavChange = (p: NavPage) => {
    setSubRoute(null);
    setPage(p);
  };

  const handleNavigate = (route: "receive" | "send" | "swap") => {
    setSubRoute(route);
  };

  const handleBack = () => setSubRoute(null);

  const showBottomNav = subRoute === null;

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden" style={{ height: "100dvh", background: '#DCDCDC' }}>
      <div className={`h-full overflow-hidden ${showBottomNav ? "pb-16" : ""}`}>
        {subRoute === "receive" && <ReceivePage onBack={handleBack} />}
        {subRoute === "send"    && <SendPage onBack={handleBack} bnbPrice={bnbPrice} />}
        {subRoute === "swap"    && <SwapPage onBack={handleBack} bnbPrice={bnbPrice} />}
        {subRoute === null && (
          <>
            {page === "portfolio" && <PortfolioPage onNavigate={handleNavigate} />}
            {page === "futures"   && <FuturesPage />}
            {page === "earn"      && <EarnPage />}
            {page === "profile"   && <ProfilePage />}
          </>
        )}
      </div>
      {showBottomNav && <BottomNav current={page} onChange={handleNavChange} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TradingProvider>
        <AppContent />
      </TradingProvider>
    </QueryClientProvider>
  );
}

export default App;
