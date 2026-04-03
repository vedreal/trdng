import { useState } from "react";
import { useTrading } from "../contexts/TradingContext";
import {
  IconChevronLeft, IconX, IconSearch, IconCheck, IconAlertTriangle,
} from "@tabler/icons-react";

const COIN_ICONS: Record<string, string> = {
  USDT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiar6ik6oswrb7ncslxa2aeopdg7ifn252akbcpvd572v7u34dzcqq",
  XAUT: "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccstl7irrcrvusudyp26zjudtisjc44dz34o3molmxzuwfaizo5m",
  ETH:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreiccdvf3jvs2kngcddhe6siaca44y3ztru254dor3vocue36gbplw4",
  BNB:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreieg2zkdn3muod7uir7q77lee37cmisxoqqym3sjsm6smfn5wkq2da",
  TON:  "https://gold-defensive-cattle-30.mypinata.cloud/ipfs/bafkreib6wlrvvorkcbkma43liqxrm4dv7hgad4jbqlcjzaa6rynileb7c4",
};

interface NetworkOption {
  id: string;
  name: string;
  shortName: string;
  minWithdraw: number;
  fee: number;
  feeAsset?: string;
}

interface AssetConfig {
  symbol: string;
  name: string;
  networks: NetworkOption[];
  xautEthGasFee?: boolean;
}

const SEND_ASSETS: AssetConfig[] = [
  {
    symbol: "USDT",
    name: "Tether USD",
    networks: [
      { id: "bep20", name: "BNB Smart Chain (BEP20)", shortName: "BEP20", minWithdraw: 15,  fee: 1.2  },
      { id: "erc20", name: "Ethereum (ERC20)",         shortName: "ERC20", minWithdraw: 20,  fee: 5    },
      { id: "ton",   name: "Toncoin (TON)",             shortName: "TON",   minWithdraw: 10,  fee: 1.5  },
      { id: "arb",   name: "Arbitrum One (ARB)",        shortName: "ARB",   minWithdraw: 12,  fee: 1    },
      { id: "matic", name: "Polygon (MATIC)",           shortName: "MATIC", minWithdraw: 10,  fee: 2    },
      { id: "op",    name: "Optimism (OP)",             shortName: "OP",    minWithdraw: 10,  fee: 1    },
    ],
  },
  {
    symbol: "XAUT",
    name: "Tether Gold",
    xautEthGasFee: true,
    networks: [
      { id: "erc20", name: "Ethereum (ERC20)", shortName: "ERC20", minWithdraw: 0.0007, fee: 0.0015, feeAsset: "ETH" },
    ],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    networks: [
      { id: "erc20", name: "Ethereum (ERC20)", shortName: "ERC20", minWithdraw: 0.015, fee: 0.0015 },
    ],
  },
  {
    symbol: "BNB",
    name: "BNB",
    networks: [
      { id: "bep20", name: "BNB Smart Chain (BEP20)", shortName: "BEP20", minWithdraw: 0.025, fee: 0.0025 },
    ],
  },
  {
    symbol: "TON",
    name: "Toncoin",
    networks: [
      { id: "ton", name: "Toncoin (TON)", shortName: "TON", minWithdraw: 8, fee: 1.2 },
    ],
  },
];

interface SendPageProps {
  onBack: () => void;
  bnbPrice: number;
}

export function SendPage({ onBack, bnbPrice }: SendPageProps) {
  const {
    spotUsdtBalance, setSpotUsdtBalance,
    bnbBalance, setBnbBalance,
    xautBalance, setXautBalance,
    ethBalance, setEthBalance,
    tonBalance, setTonBalance,
    addWalletTx,
  } = useTrading();

  const [selectedAsset, setSelectedAsset] = useState<AssetConfig>(SEND_ASSETS[0]);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>(SEND_ASSETS[0].networks[0]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const getAvailableBalance = () => {
    switch (selectedAsset.symbol) {
      case "USDT": return spotUsdtBalance;
      case "XAUT": return xautBalance;
      case "ETH":  return ethBalance;
      case "BNB":  return bnbBalance;
      case "TON":  return tonBalance;
      default: return 0;
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const availableBalance = getAvailableBalance();
  const feeAsset = selectedNetwork.feeAsset ?? selectedAsset.symbol;
  const fee = selectedNetwork.fee;
  const receiveAmount = selectedAsset.xautEthGasFee
    ? parsedAmount
    : Math.max(0, parsedAmount - fee);

  const filteredAssets = SEND_ASSETS.filter(
    (a) =>
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAsset = (asset: AssetConfig) => {
    setSelectedAsset(asset);
    setSelectedNetwork(asset.networks[0]);
    setShowAssetModal(false);
    setSearchQuery("");
    setAmount("");
  };

  const handleSelectNetwork = (network: NetworkOption) => {
    setSelectedNetwork(network);
    setShowNetworkModal(false);
    setAmount("");
  };

  const handleMax = () => {
    if (selectedAsset.xautEthGasFee) {
      setAmount(availableBalance.toFixed(6));
    } else {
      const max = availableBalance;
      const decimals =
        selectedAsset.symbol === "USDT" ? 2 :
        selectedAsset.symbol === "ETH" ? 6 :
        selectedAsset.symbol === "XAUT" ? 6 :
        selectedAsset.symbol === "BNB" ? 6 : 4;
      setAmount(max.toFixed(decimals));
    }
  };

  const handleContinue = () => {
    if (!address || address.length < 10) return showToast("Enter a valid destination address");
    if (parsedAmount <= 0) return showToast("Enter amount to withdraw");
    if (parsedAmount < selectedNetwork.minWithdraw) {
      return showToast(`Minimum withdrawal is ${selectedNetwork.minWithdraw} ${selectedAsset.symbol}`);
    }
    if (parsedAmount > availableBalance) {
      return showToast(`Insufficient ${selectedAsset.symbol} balance`);
    }
    if (selectedAsset.xautEthGasFee && ethBalance < fee) {
      return showToast(`Insufficient ETH for gas fee. Need at least ${fee} ETH`);
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (selectedAsset.symbol === "USDT") {
      setSpotUsdtBalance((b) => parseFloat((b - parsedAmount).toFixed(5)));
    } else if (selectedAsset.symbol === "XAUT") {
      setXautBalance((b) => parseFloat((b - parsedAmount).toFixed(8)));
      setEthBalance((b) => parseFloat((b - fee).toFixed(8)));
    } else if (selectedAsset.symbol === "ETH") {
      setEthBalance((b) => parseFloat((b - parsedAmount).toFixed(8)));
    } else if (selectedAsset.symbol === "BNB") {
      setBnbBalance((b) => parseFloat((b - parsedAmount).toFixed(8)));
    } else if (selectedAsset.symbol === "TON") {
      setTonBalance((b) => parseFloat((b - parsedAmount).toFixed(8)));
    }
    addWalletTx({ type: "withdraw", asset: selectedAsset.symbol, amount: parsedAmount, address });
    setStep("done");
  };

  const formatAmt = (val: number) => {
    if (selectedAsset.symbol === "USDT") return val.toFixed(2);
    return val.toFixed(6);
  };

  if (step === "done") {
    return (
      <div className="flex flex-col h-full page-bg">
        <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
          <button onClick={onBack} className="mr-3 text-[#888888]">
            <IconChevronLeft size={22} stroke={2.5} />
          </button>
          <span className="font-bold text-[#1A1A1A] text-base">Send</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full btn-3d-long flex items-center justify-center mb-5">
            <IconCheck size={36} stroke={2.5} color="white" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Withdrawal Submitted</h2>
          <p className="text-sm text-[#666666] mb-1">
            <span className="font-semibold text-[#C9A227]">{formatAmt(parsedAmount)} {selectedAsset.symbol}</span> is being processed
          </p>
          <p className="text-xs text-[#888888] mb-6">
            Usually confirmed within 1–3 minutes on {selectedNetwork.shortName}
          </p>
          <div className="w-full bg-[#F5F0DC] border border-[#D4AF37] rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">To</span>
              <span className="text-xs font-mono text-[#333333]">{address.slice(0, 10)}...{address.slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">Network</span>
              <span className="text-xs font-semibold text-[#333333]">{selectedNetwork.shortName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">Network Fee</span>
              <span className="text-xs text-[#333333]">{fee} {feeAsset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#888888]">You Receive</span>
              <span className="text-xs font-bold text-[#C9A227]">{formatAmt(receiveAmount)} {selectedAsset.symbol}</span>
            </div>
          </div>
          <button onClick={onBack} className="mt-6 w-full py-3.5 rounded-xl btn-3d-gold text-sm">
            Back to Portfolio
          </button>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="flex flex-col h-full page-bg">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-red-500">
            {toast}
          </div>
        )}
        <div className="flex items-center px-4 py-3 panel-header border-b border-[#C8B040] flex-shrink-0">
          <button onClick={() => setStep("form")} className="mr-3 text-[#888888]">
            <IconChevronLeft size={22} stroke={2.5} />
          </button>
          <span className="font-bold text-[#1A1A1A] text-base">Confirm Send</span>
        </div>
        <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
          <div className="panel-card rounded-2xl p-5 border border-[#D4AF37] flex flex-col items-center">
            <img
              src={COIN_ICONS[selectedAsset.symbol]}
              alt={selectedAsset.symbol}
              className="w-12 h-12 rounded-full mb-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <p className="text-xs text-[#888888] mb-1">You are sending</p>
            <p className="text-3xl font-bold text-[#B8860B]">{formatAmt(parsedAmount)}</p>
            <p className="text-lg font-semibold text-[#666666]">{selectedAsset.symbol}</p>
          </div>
          <div className="panel-silver border border-[#D4AF37] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">To Address</span>
              <span className="text-sm font-mono text-[#333333] max-w-[180px] truncate">{address}</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">Network</span>
              <span className="text-sm font-semibold text-[#333333]">{selectedNetwork.name}</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">Network Fee</span>
              <span className="text-sm text-[#333333]">{fee} {feeAsset}</span>
            </div>
            <div className="border-t border-[#D8D0A8]" />
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-[#333333]">You Receive</span>
              <span className="text-sm font-bold text-[#C9A227]">
                {formatAmt(receiveAmount)} {selectedAsset.symbol}
              </span>
            </div>
          </div>
          {selectedAsset.xautEthGasFee && (
            <div className="bg-[#FFF8E0] border border-[#F0D060] rounded-xl px-4 py-3">
              <p className="text-[11px] text-[#8B6914] leading-relaxed">
                ⚠ Gas fee of <strong>{fee} ETH</strong> will be deducted from your ETH balance. Make sure you have sufficient ETH.
              </p>
            </div>
          )}
          <div className="bg-[#FFF8E0] border border-[#F0D060] rounded-xl px-4 py-3">
            <p className="text-[11px] text-[#8B6914]">⚠ Transactions are irreversible. Double-check the address before confirming.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("form")} className="flex-1 py-3.5 rounded-xl text-sm btn-3d-silver">
              Cancel
            </button>
            <button onClick={handleConfirm} className="flex-1 py-3.5 rounded-xl text-sm btn-3d-gold">
              Confirm Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full page-bg overflow-y-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-red-500">
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
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <span className="text-base font-bold text-[#1A1A1A]">Select Asset</span>
              <button
                onClick={() => { setShowAssetModal(false); setSearchQuery(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0EDE0] text-[#666]"
              >
                <IconX size={16} stroke={2.5} />
              </button>
            </div>

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

            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {filteredAssets.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#AAAAAA]">No assets found</div>
              ) : (
                filteredAssets.map((asset) => {
                  const bal = asset.symbol === "USDT" ? spotUsdtBalance
                    : asset.symbol === "XAUT" ? xautBalance
                    : asset.symbol === "ETH"  ? ethBalance
                    : asset.symbol === "BNB"  ? bnbBalance
                    : asset.symbol === "TON"  ? tonBalance : 0;
                  const decimals = asset.symbol === "USDT" ? 2 : asset.symbol === "BNB" ? 4 : asset.symbol === "TON" ? 4 : 6;
                  return (
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
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="flex-1 text-left">
                        <span className="text-sm font-bold text-[#1A1A1A]">{asset.symbol}</span>
                        <br />
                        <span className="text-[11px] text-[#888888]">{asset.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-[#333333]">{bal.toFixed(decimals)}</p>
                        <p className="text-[10px] text-[#888888]">Available</p>
                      </div>
                      {selectedAsset.symbol === asset.symbol && (
                        <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0 ml-1">
                          <span className="text-white text-[10px] font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })
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
                  Ensure the withdrawal network matches the recipient's address network. Wrong network may result in permanent loss.
                </p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {selectedAsset.networks.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleSelectNetwork(network)}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl mb-1 transition-all active:scale-[0.98] ${
                    selectedNetwork.id === network.id
                      ? "bg-[#FFF8D6] border border-[#D4AF37]"
                      : "hover:bg-[#F5F3EA]"
                  }`}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1A1A1A]">{network.shortName}</span>
                      {selectedNetwork.id === network.id && (
                        <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-[#888888]">{network.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-[10px] text-[#888888]">Min. Withdraw</p>
                    <p className="text-xs font-semibold text-[#333333]">
                      {network.minWithdraw} {selectedAsset.symbol}
                    </p>
                    <p className="text-[10px] text-[#888888]">
                      Fee: {network.fee} {network.feeAsset ?? selectedAsset.symbol}
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
        <span className="font-bold text-[#1A1A1A] text-base">Send / Withdraw</span>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Asset Selector */}
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
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-[#1A1A1A]">{selectedNetwork.shortName}</p>
              <p className="text-[11px] text-[#888888]">{selectedNetwork.name}</p>
            </div>
            {selectedAsset.networks.length > 1 && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#C9A227] flex-shrink-0">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* XAUT ETH gas warning */}
        {selectedAsset.xautEthGasFee && (
          <div className={`rounded-xl px-4 py-3 flex items-start gap-2 border ${
            ethBalance < fee
              ? "bg-red-50 border-red-300"
              : "bg-[#FFF8E0] border-[#F0D060]"
          }`}>
            <IconAlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${ethBalance < fee ? "text-red-500" : "text-[#B8860B]"}`} />
            <p className={`text-[11px] leading-relaxed ${ethBalance < fee ? "text-red-600" : "text-[#8B6914]"}`}>
              {ethBalance < fee
                ? `⚠ Insufficient ETH for gas fee. You need at least ${fee} ETH but only have ${ethBalance.toFixed(6)} ETH.`
                : `Gas fee of ${fee} ETH will be deducted from your ETH balance (Current: ${ethBalance.toFixed(6)} ETH).`
              }
            </p>
          </div>
        )}

        {/* Address input */}
        <div>
          <p className="text-xs font-semibold text-[#888888] mb-2">Destination Address</p>
          <div className="bg-[#F5F3EA] rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={`Enter ${selectedNetwork.shortName} address`}
              className="flex-1 text-sm font-mono text-[#333333] bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Amount input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#888888]">Amount</p>
            <span className="text-xs text-[#888888]">
              Available: <span className="font-semibold text-[#C9A227]">
                {availableBalance.toFixed(selectedAsset.symbol === "USDT" ? 2 : 6)} {selectedAsset.symbol}
              </span>
            </span>
          </div>
          <div className="bg-[#F5F3EA] rounded-xl border border-[#C8C0A0] flex items-center px-4 py-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-lg font-semibold text-[#333333] bg-transparent outline-none"
            />
            <span className="text-sm text-[#888888] mr-3">{selectedAsset.symbol}</span>
            <button onClick={handleMax} className="btn-3d-gold px-2 py-1 rounded-lg text-[10px]">Max</button>
          </div>
        </div>

        {/* Fee & receive breakdown */}
        <div className="bg-[#EEECDC] rounded-xl px-4 py-3 space-y-1.5 border border-[#D8D0A8]">
          <div className="flex justify-between">
            <span className="text-xs text-[#888888]">Min. Withdrawal</span>
            <span className="text-xs font-semibold text-[#333333]">{selectedNetwork.minWithdraw} {selectedAsset.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-[#888888]">Network Fee</span>
            <span className="text-xs font-semibold text-[#333333]">{fee} {feeAsset}</span>
          </div>
          {parsedAmount > 0 && (
            <div className="flex justify-between border-t border-[#D0C890] pt-1.5">
              <span className="text-xs font-semibold text-[#333333]">You Receive</span>
              <span className="text-xs font-bold text-[#C9A227]">
                {formatAmt(receiveAmount)} {selectedAsset.symbol}
              </span>
            </div>
          )}
        </div>

        <button onClick={handleContinue} className="w-full py-3.5 rounded-xl text-sm btn-3d-gold">
          Continue
        </button>
      </div>
    </div>
  );
}
