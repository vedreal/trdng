import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { FuturesPage } from "@/pages/FuturesPage";
import { HomePage } from "@/pages/HomePage";
import { EarnPage } from "@/pages/EarnPage";
import { ProfilePage } from "@/pages/ProfilePage";

const queryClient = new QueryClient();

type NavPage = "home" | "futures" | "earn" | "profile";

function AppContent() {
  const [page, setPage] = useState<NavPage>("futures");

  return (
    <div className="relative w-full max-w-md mx-auto bg-[#f5ede0] overflow-hidden" style={{ height: "100dvh" }}>
      <div className="h-full pb-16 overflow-hidden">
        {page === "home"    && <HomePage />}
        {page === "futures" && <FuturesPage />}
        {page === "earn"    && <EarnPage />}
        {page === "profile" && <ProfilePage />}
      </div>
      <BottomNav current={page} onChange={setPage} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
