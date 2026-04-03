import { useState } from "react";
import { useTrading } from "../contexts/TradingContext";
import { IconChevronLeft, IconX, IconSearch, IconAlertTriangle, IconTool } from "@tabler/icons-react";

const DEPOSIT_ADDRESS = "0x742d35Cc6634C0532925a3b8D4C9A7C9f8A1B2E";
const TON_ADDRESS = "UQD742d35Cc6634C0532925a3b8D4C9A7C9f8A1B2E3x";

const COIN_ICONS: Record<string, string> = {
  USDT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiar6ik6oswrb7ncslxa2aeopdg7ifn252akbcpvd572v7u34dzcqq",
  ETH:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccdvf3jvs2kngcddhe6siaca44y3ztru254dor3vocue36gbplw4",
  BNB:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreieg2zkdn3muod7uir7q77lee37cmisxoqqym3sjsm6smfn5wkq2da",
  TON:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreib6wlrvvorkcbkma43liqxrm4dv7hgad4jbqlcjzaa6rynileb7c4",
};

interface NetworkOption {
  id: string;
  name: string;
  shortName: string;
  minDeposit: number;
  maintenance?: boolean;
}

interface AssetOption {
  symbol: string;
  name: string;
  networks: NetworkOption[];
}

const ASSETS: AssetOption[] = [
  {
    symbol: "USDT",
    name: "Tether USD",
    networks: [
      { id: "bep20",    name: "BNB Smart Chain (BEP20)", shortName: "BEP20",    minDeposit: 0.1  },
      { id: "erc20",    name: "Ethereum (ERC20)",         shortName: "ERC20",    minDeposit: 5    },
      { id: "ton",      name: "Toncoin (TON)",             shortName: "TON",      minDeposit: 1,   maintenance: true },
      { id: "arb",      name: "Arbitrum One (ARB)",        shortName: "ARB",      minDeposit: 0.05 },
      { id: "matic",    name: "Polygon (MATIC)",           shortName: "MATIC",    minDeposit: 1    },
      { id: "op",       name: "Optimism (OP)",             shortName: "OP",       minDeposit: 0.01 },
    ],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    networks: [
      { id: "erc20", name: "Ethereum (ERC20)", shortName: "ERC20", minDeposit: 0.005 },
    ],
  },
  {
    symbol: "BNB",
    name: "BNB",
    networks: [
      { id: "bep20", name: "BNB Smart Chain (BEP20)", shortName: "BEP20", minDeposit: 0.0005 },
    ],
  },
  {
    symbol: "TON",
    name: "Toncoin",
    networks: [
      { id: "ton", name: "Toncoin (TON)", shortName: "TON", minDeposit: 1 },
    ],
  },
];

interface ReceivePageProps {
  onBack: () => void;
}

export function ReceivePage({ onBack }: ReceivePageProps) {
  const { setSpotUsdtBalance, setBnbBalance, setEthBalance, setTonBalance, addWalletTx } = useTrading();

  const [selectedAsset, setSelectedAsset] = useState<AssetOption>(ASSETS[0]);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>(ASSETS[0].networks[0]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [simAmount, setSimAmount] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const depositAddress = (selectedNetwork.id === "ton" || selectedAsset.symbol === "TON")
    ? TON_ADDRESS
    : DEPOSIT_ADDRESS;

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectAsset = (asset: AssetOption) => {
    setSelectedAsset(asset);
    setSelectedNetwork(asset.networks[0]);
    setShowAssetModal(false);
    setSearchQuery("");
  };

  const handleSelectNetwork = (network: NetworkOption) => {
    if (network.maintenance) return;
    setSelectedNetwork(network);
    setShowNetworkModal(false);
  };

  const handleSimDeposit = () => {
    const amount = parseFloat(simAmount);
    if (!amount || amount <= 0) return showToast("Enter a valid amount");
    if (amount < selectedNetwork.minDeposit) {
      return showToast(`Minimum deposit is ${selectedNetwork.minDeposit} ${selectedAsset.symbol}`);
    }

    if (selectedAsset.symbol === "USDT") {
      setSpotUsdtBalance((b) => parseFloat((b + amount).toFixed(5)));
      showToast(`+${amount.toFixed(2)} USDT deposited to Spot`);
    } else if (selectedAsset.symbol === "ETH") {
      setEthBalance((b) => parseFloat((b + amount).toFixed(8)));
      showToast(`+${amount.toFixed(6)} ETH deposited to Spot`);
    } else if (selectedAsset.symbol === "BNB") {
      setBnbBalance((b) => parseFloat((b + amount).toFixed(8)));
      showToast(`+${amount.toFixed(4)} BNB deposited to Spot`);
    } else if (selectedAsset.symbol === "TON") {
      setTonBalance((b) => parseFloat((b + amount).toFixed(6)));
      showToast(`+${amount.toFixed(4)} TON deposited to Spot`);
    }

    addWalletTx({
      type: "deposit",
      asset: selectedAsset.symbol,
      amount,
      address: depositAddress,
    });
    setSimAmount("");
  };

  const filteredAssets = ASSETS.filter(
    (a) =>
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-green-500">
          {toast}
        </div>
      )}

      {/* Asset Selection Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => { setShowAssetModal(false); setSearchQuery(""); }}>
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl flex flex-col"
            style={{ maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <span className="text-base font-bold text-[#1A1A1A]">Select Asset</span>
              <button
                onClick={() => { setShowAssetModal(false); setSearchQuery(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0EDE0] text-[#666]"
              >
                <IconX size={16} stroke={2.5} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2 bg-[#F5F3EA] border border-[#D4C060] rounded-xl px-3 py-2.5">
                <IconSearch size={16} stroke={2} className="text-[#888888] flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search coin name or symbol"
                  className="flex-1 text-sm text-[#333333] bg-transparent outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Asset List */}
            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {filteredAssets.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#AAAAAA]">No assets found</div>
              ) : (
                filteredAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => handleSelectAsset(asset)}
                    className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl mb-1 transition-all active:scale-[0.98] ${
                      selectedAsset.symbol === asset.symbol
                        ? "bg-[#FFF8D6] border border-[#D4AF37]"
                        : "hover:bg-[#F5F3EA]"
                    }`}
                  >
                    <img
                      src={COIN_ICONS[asset.symbol]}
                      alt={asset.symbol}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                      }}
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1A1A1A]">{asset.symbol}</span>
                      </div>
                      <span className="text-[11px] text-[#888888]">{asset.name}</span>
                    </div>
                    {selectedAsset.symbol === asset.symbol && (
                      <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-bold">✓</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Selection Modal */}
      {showNetworkModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowNetworkModal(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
              <span className="text-base font-bold text-[#1A1A1A]">Select Network</span>
              <button
                onClick={() => setShowNetworkModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0EDE0] text-[#666]"
              >
                <IconX size={16} stroke={2.5} />
              </button>
            </div>

            <div className="px-4 pb-3 flex-shrink-0">
              <div className="bg-[#FFF8E0] border border-[#F0D060] rounded-xl px-3 py-2.5 flex items-start gap-2">
                <IconAlertTriangle size={14} className="text-[#B8860B] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[#8B6914] leading-relaxed">
                  Make sure the selected network matches the sending platform's network. Using the wrong network may cause permanent asset loss.
                </p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {selectedAsset.networks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleSelectNetwork(network)}
                  disabled={network.maintenance}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl mb-1 transition-all ${
                    network.maintenance
                      ? "opacity-60 cursor-not-allowed"
                      : selectedNetwork.id === network.id
                      ? "bg-[#FFF8D6] border border-[#D4AF37] active:scale-[0.98]"
                      : "hover:bg-[#F5F3EA] active:scale-[0.98]"
                  }`}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1A1A1A]">{network.shortName}</span>
                      {network.maintenance && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-semibold">
                          <IconTool size={10} stroke={2} />
                          Maintenance
                        </span>
                      )}
                      {!network.maintenance && selectedNetwork.id === network.id && (
                        <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-[#888888]">{network.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-[#888888]">Min. Deposit</p>
                    <p className="text-xs font-semibold text-[#333333]">
                      {network.minDeposit} {selectedAsset.symbol}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
        <button onClick={onBack} className="mr-3 text-[#888888]">
          <IconChevronLeft size={22} stroke={2.5} />
        </button>
        <span className="font-bold text-[#1A1A1A] text-base">Receive / Deposit</span>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Asset Selector — Exchange style */}
        <div>
          <p className="text-xs font-semibold text-[#888888] mb-2 uppercase tracking-wide">Coin</p>
          <button
            onClick={() => setShowAssetModal(true)}
            className="w-full flex items-center gap-3 bg-[#F5F3EA] border border-[#D4AF37] rounded-xl px-4 py-3 transition-all active:scale-[0.99]"
          >
            <img
              src={COIN_ICONS[selectedAsset.symbol]}
              alt={selectedAsset.symbol}
              className="w-8 h-8 rounded-full flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-[#1A1A1A]">{selectedAsset.symbol}</p>
              <p className="text-[11px] text-[#888888]">{selectedAsset.name}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#C9A227] flex-shrink-0">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Network Selector */}
        <div>
          <p className="text-xs font-semibold text-[#888888] mb-2 uppercase tracking-wide">Network</p>
          <button
            onClick={() => selectedAsset.networks.length > 1 && setShowNetworkModal(true)}
            className={`w-full flex items-center gap-3 bg-[#F5F3EA] border border-[#D4AF37] rounded-xl px-4 py-3 ${
              selectedAsset.networks.length > 1 ? "active:scale-[0.99]" : "cursor-default"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${selectedNetwork.maintenance ? "bg-orange-400" : "bg-green-500"}`} />
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#1A1A1A]">{selectedNetwork.shortName}</p>
                {selectedNetwork.maintenance && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-semibold">
                    <IconTool size={9} stroke={2} />
                    Maintenance
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#888888]">{selectedNetwork.name}</p>
            </div>
            {selectedAsset.networks.length > 1 && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#C9A227] flex-shrink-0">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* Min Deposit info */}
        <div className="bg-[#F0F7FF] border border-[#B8D4F0] rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-[#5588AA]">Minimum Deposit</span>
          <span className="text-[11px] font-bold text-[#336699]">
            {selectedNetwork.minDeposit} {selectedAsset.symbol}
          </span>
        </div>

        {/* QR Code */}
        {!selectedNetwork.maintenance ? (
          <div className="panel-silver border border-[#D4AF37] rounded-2xl p-5 flex flex-col items-center">
            <div className="w-36 h-36 rounded-xl border-4 border-[#D4AF37] bg-white flex items-center justify-center mb-3 overflow-hidden">
              <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="white" />
                <rect x="8" y="8" width="30" height="30" rx="3" fill="#1A1A1A" />
                <rect x="12" y="12" width="22" height="22" rx="2" fill="white" />
                <rect x="16" y="16" width="14" height="14" rx="1" fill="#1A1A1A" />
                <rect x="82" y="8" width="30" height="30" rx="3" fill="#1A1A1A" />
                <rect x="86" y="12" width="22" height="22" rx="2" fill="white" />
                <rect x="90" y="16" width="14" height="14" rx="1" fill="#1A1A1A" />
                <rect x="8" y="82" width="30" height="30" rx="3" fill="#1A1A1A" />
                <rect x="12" y="86" width="22" height="22" rx="2" fill="white" />
                <rect x="16" y="90" width="14" height="14" rx="1" fill="#1A1A1A" />
                <rect x="44" y="8" width="4" height="4" fill="#1A1A1A" /><rect x="52" y="8" width="4" height="4" fill="#1A1A1A" />
                <rect x="60" y="8" width="4" height="4" fill="#1A1A1A" /><rect x="44" y="16" width="4" height="4" fill="#1A1A1A" />
                <rect x="56" y="16" width="4" height="4" fill="#1A1A1A" /><rect x="68" y="16" width="4" height="4" fill="#1A1A1A" />
                <rect x="48" y="24" width="4" height="4" fill="#1A1A1A" /><rect x="60" y="24" width="4" height="4" fill="#1A1A1A" />
                <rect x="8" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="16" y="44" width="4" height="4" fill="#1A1A1A" />
                <rect x="28" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="8" y="52" width="4" height="4" fill="#1A1A1A" />
                <rect x="20" y="52" width="4" height="4" fill="#1A1A1A" /><rect x="32" y="52" width="4" height="4" fill="#1A1A1A" />
                <rect x="12" y="60" width="4" height="4" fill="#1A1A1A" /><rect x="24" y="60" width="4" height="4" fill="#1A1A1A" />
                <rect x="44" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="52" y="44" width="4" height="4" fill="#1A1A1A" />
                <rect x="60" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="68" y="44" width="4" height="4" fill="#1A1A1A" />
                <rect x="76" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="48" y="52" width="4" height="4" fill="#1A1A1A" />
                <rect x="64" y="52" width="4" height="4" fill="#1A1A1A" /><rect x="44" y="60" width="4" height="4" fill="#1A1A1A" />
                <rect x="56" y="60" width="4" height="4" fill="#1A1A1A" /><rect x="72" y="60" width="4" height="4" fill="#1A1A1A" />
                <rect x="84" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="96" y="44" width="4" height="4" fill="#1A1A1A" />
                <rect x="108" y="44" width="4" height="4" fill="#1A1A1A" /><rect x="88" y="52" width="4" height="4" fill="#1A1A1A" />
                <rect x="100" y="52" width="4" height="4" fill="#1A1A1A" /><rect x="84" y="60" width="4" height="4" fill="#1A1A1A" />
                <rect x="96" y="60" width="4" height="4" fill="#1A1A1A" /><rect x="108" y="60" width="4" height="4" fill="#1A1A1A" />
                <rect x="44" y="76" width="4" height="4" fill="#1A1A1A" /><rect x="56" y="76" width="4" height="4" fill="#1A1A1A" />
                <rect x="68" y="76" width="4" height="4" fill="#1A1A1A" /><rect x="48" y="84" width="4" height="4" fill="#1A1A1A" />
                <rect x="60" y="84" width="4" height="4" fill="#1A1A1A" /><rect x="72" y="84" width="4" height="4" fill="#1A1A1A" />
                <rect x="44" y="92" width="4" height="4" fill="#1A1A1A" /><rect x="52" y="100" width="4" height="4" fill="#1A1A1A" />
                <rect x="64" y="92" width="4" height="4" fill="#1A1A1A" /><rect x="76" y="100" width="4" height="4" fill="#1A1A1A" />
                <rect x="84" y="76" width="4" height="4" fill="#1A1A1A" /><rect x="100" y="76" width="4" height="4" fill="#1A1A1A" />
                <rect x="92" y="84" width="4" height="4" fill="#1A1A1A" /><rect x="108" y="84" width="4" height="4" fill="#1A1A1A" />
                <rect x="84" y="92" width="4" height="4" fill="#1A1A1A" /><rect x="96" y="96" width="4" height="4" fill="#1A1A1A" />
                <rect x="108" y="92" width="4" height="4" fill="#1A1A1A" />
                <rect x="51" y="51" width="18" height="18" rx="4" fill="#D4AF37" />
                <text x="60" y="64" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">₿</text>
              </svg>
            </div>
            <p className="text-[10px] text-[#888888] mb-1.5">
              {selectedAsset.symbol} · {selectedNetwork.shortName} Deposit Address
            </p>
            <div className="w-full bg-[#EEECDC] rounded-xl px-3 py-2.5 flex items-center gap-2 border border-[#D8D0A8]">
              <p className="text-[11px] font-mono text-[#333333] flex-1 break-all">{depositAddress}</p>
              <button onClick={handleCopy} className="flex-shrink-0 btn-3d-gold px-2.5 py-1 rounded-lg text-[10px]">
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="panel-silver border border-orange-300 rounded-2xl p-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
              <IconTool size={28} stroke={1.5} className="text-orange-500" />
            </div>
            <p className="text-sm font-bold text-orange-600 mb-1">Network Under Maintenance</p>
            <p className="text-[11px] text-[#888888] text-center">
              The {selectedNetwork.name} network is currently under maintenance. Please select a different network.
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="bg-[#FFF8E0] border border-[#F0D060] rounded-xl px-4 py-3">
          <p className="text-[11px] text-[#8B6914] leading-relaxed">
            ⚠ Only send <strong>{selectedAsset.symbol}</strong> via the <strong>{selectedNetwork.name}</strong> network to this address. Sending other assets or using a different network may result in permanent loss.
          </p>
        </div>

        {/* Simulate deposit */}
        {!selectedNetwork.maintenance && (
          <div className="panel-card rounded-2xl p-4 border border-[#D4AF37]">
            <p className="text-xs font-semibold text-[#888888] mb-2">Simulate Deposit (Demo)</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#F5F3EA] rounded-xl border border-[#C8C0A0] flex items-center px-3 py-2.5">
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  placeholder={`Min: ${selectedNetwork.minDeposit} ${selectedAsset.symbol}`}
                  className="flex-1 text-sm font-medium text-[#333333] bg-transparent outline-none"
                />
                <span className="text-xs text-[#888888] ml-1 flex-shrink-0">{selectedAsset.symbol}</span>
              </div>
              <button onClick={handleSimDeposit} className="btn-3d-gold px-4 py-2.5 rounded-xl text-sm">
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
