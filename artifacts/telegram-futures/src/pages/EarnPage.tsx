export function EarnPage() {
  return (
    <div className="flex flex-col h-full page-bg">
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <span className="font-bold text-[#1A1A1A] text-base">Earn</span>
      </div>

      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#1A0F00] text-2xl font-bold mx-auto mb-4 btn-3d-gold"
            style={{ lineHeight: 1 }}>
            $
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Earn</h2>
          <p className="text-sm text-[#666666]">Earn rewards by holding and staking</p>
        </div>
      </div>
    </div>
  );
}
