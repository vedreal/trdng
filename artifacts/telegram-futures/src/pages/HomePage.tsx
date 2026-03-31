export function HomePage() {
  return (
    <div className="flex flex-col h-screen bg-[#f5ede0] items-center justify-center">
      <div className="text-center px-6">
        <div className="w-16 h-16 rounded-full bg-orange-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">₿</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Catrix Futures</h2>
        <p className="text-sm text-gray-500">Trade BTC futures with up to 125x leverage</p>
      </div>
    </div>
  );
}
