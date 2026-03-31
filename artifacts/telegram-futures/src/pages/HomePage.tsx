export function HomePage() {
  return (
    <div className="flex flex-col h-screen items-center justify-center page-bg">
      <div className="text-center px-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 btn-3d-gold"
          style={{ lineHeight: 1 }}>
          ₿
        </div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Catrix Futures</h2>
        <p className="text-sm text-[#666666]">Trade BTC futures with up to 125x leverage</p>
      </div>
    </div>
  );
}
