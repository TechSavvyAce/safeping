"use client";

import React, { useState, useEffect } from "react";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { useWeb3Modal } from "@web3modal/react";
import { cn } from "@/utils/cn";
import { ChainType } from "@/types";
import { getChainName } from "@/lib/wagmi";
import { QRCode } from "@/components/ui/QRCode";
import { env } from "process";

interface WalletSelectorProps {
  selectedChain: ChainType;
  onStartPayment: (walletId: string, address: string) => void;
  onChainSelected?: (chainType: ChainType) => void;
  className?: string;
}

const CHAIN_OPTIONS = [
  {
    id: "ethereum",
    name: "Ethereum",
    description: "USDT on Ethereum (ERC-20)",
    icon: "/icons/ethereum.png",
    chainId: 1,
  },
  {
    id: "bsc",
    name: "BSC",
    description: "USDT on BSC (BEP-20)",
    icon: "/icons/bsc.png",
    chainId: 56,
  },
  {
    id: "tron",
    name: "Tron",
    description: "USDT on Tron (TRC-20)",
    icon: "/icons/tron.png",
    chainId: 728126428,
  },
];

// USDT icon path
const USDT_ICON = "/icons/tether.svg";

export function WalletSelector({
  selectedChain,
  onStartPayment,
  onChainSelected,
  className,
}: WalletSelectorProps) {
  const { openWalletModal, isConnected, address, chain, switchNetwork } =
    useWalletConnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [localSelectedChain, setLocalSelectedChain] =
    useState<ChainType>(selectedChain);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalSelectedChain(selectedChain);
  }, [selectedChain]);

  // Auto-select MetaMask when Ethereum is the default chain
  useEffect(() => {
    if (localSelectedChain === "ethereum" && !selectedWallet) {
      console.log("🔗 Auto-selecting MetaMask for Ethereum chain");
      setSelectedWallet("metamask");

      // Auto-connect to MetaMask if available
      if (typeof window !== "undefined" && (window as any).ethereum) {
        console.log("🦊 MetaMask detected, attempting auto-connection...");
        // Small delay to ensure component is fully mounted
        setTimeout(() => {
          handleConnectWallet();
        }, 500);
      }
    }
  }, [localSelectedChain, selectedWallet]);

  // Auto-select best wallet for the current chain on component mount
  useEffect(() => {
    if (!selectedWallet && localSelectedChain) {
      const bestWallet = getBestWalletForChain(localSelectedChain);
      console.log(
        `🔗 Auto-selecting best wallet for ${localSelectedChain}: ${bestWallet}`
      );
      setSelectedWallet(bestWallet);

      // Auto-connect if MetaMask is selected and available
      if (
        bestWallet === "metamask" &&
        typeof window !== "undefined" &&
        (window as any).ethereum
      ) {
        console.log("🦊 Auto-connecting to MetaMask...");
        setTimeout(() => {
          handleConnectWallet();
        }, 1000);
      }
    }
  }, [localSelectedChain, selectedWallet]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setConnectionError(null); // Clear previous errors

    try {
      // Try to open the wallet modal first
      openWalletModal();

      // Add a fallback for direct MetaMask connection if Web3Modal fails
      setTimeout(() => {
        if (!isConnected && !isConnecting) {
          console.log("Web3Modal failed, trying direct MetaMask connection...");
          // Try direct MetaMask connection as fallback
          if (typeof window !== "undefined" && (window as any).ethereum) {
            (window as any).ethereum.request({ method: "eth_requestAccounts" });
          }
        }
      }, 2000);
    } catch (error) {
      console.error("Failed to open wallet modal:", error);
      setConnectionError("钱包连接失败，请检查浏览器扩展或重试");

      // Fallback: try direct MetaMask connection
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          console.log("Attempting direct MetaMask connection...");
          await (window as any).ethereum.request({
            method: "eth_requestAccounts",
          });
        } catch (fallbackError) {
          console.error(
            "Direct MetaMask connection also failed:",
            fallbackError
          );
          setConnectionError("MetaMask 连接失败，请确保已安装 MetaMask 扩展");
        }
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleChainSwitch = async (chainId: number, chainType: ChainType) => {
    console.log("Chain switch requested:", { chainId, chainType, isConnected });

    // Update local state immediately for UI feedback
    setLocalSelectedChain(chainType);

    // Auto-select appropriate wallet for the chain
    if (chainType === "ethereum") {
      setSelectedWallet("metamask");
    } else if (chainType === "bsc") {
      setSelectedWallet("metamask"); // MetaMask also supports BSC
    } else if (chainType === "tron") {
      setSelectedWallet("tronlink"); // TronLink for TRON network
    }

    // Clear QR code display when switching chains
    setShowQRCode(false);

    // Notify parent component of chain selection
    if (onChainSelected) {
      onChainSelected(chainType);
    }

    // If wallet is connected, try to switch network
    if (isConnected && switchNetwork) {
      try {
        console.log("Attempting to switch network to:", chainId);
        await switchNetwork(chainId);
        console.log("Network switch successful");
      } catch (error) {
        console.error("Failed to switch network:", error);
        // Revert local state if network switch fails
        setLocalSelectedChain(selectedChain);
        if (onChainSelected) {
          onChainSelected(selectedChain);
        }
      }
    } else {
      console.log("Wallet not connected, chain selection stored locally");
    }
  };

  const handleWalletSelect = (walletId: string) => {
    setSelectedWallet(walletId);
    setShowQRCode(true);
  };

  const getChainInfo = (chainType: ChainType) => {
    return CHAIN_OPTIONS.find((chain) => chain.id === chainType);
  };

  // Get the best wallet for a specific chain
  const getBestWalletForChain = (chainType: ChainType): string => {
    switch (chainType) {
      case "ethereum":
        return "metamask";
      case "bsc":
        return "metamask";
      case "tron":
        return "tronlink";
      default:
        return "metamask";
    }
  };

  // Check if wallet is compatible with chain
  const isWalletCompatible = (
    walletId: string,
    chainType: ChainType
  ): boolean => {
    if (walletId === "metamask") {
      return chainType === "ethereum" || chainType === "bsc";
    } else if (walletId === "tronlink") {
      return chainType === "tron";
    } else if (walletId === "imtoken" || walletId === "bitpie") {
      return true; // WalletConnect supports all chains
    }
    return false;
  };

  // Use local state for UI, but keep the prop for external state management
  const currentChainInfo = getChainInfo(localSelectedChain);

  // Generate payment URL with wallet and chain parameters (simplified - only 2 parameters)
  const generatePaymentUrl = () => {
    if (!selectedWallet || !localSelectedChain) return "";

    const currentPath = window.location.pathname;
    const currentOrigin = window.location.origin;

    // Map wallet IDs to readable names
    const walletMap: { [key: string]: string } = {
      metamask: "metamask",
      imtoken: "imtoken",
      tronlink: "tronlink",
      bitpie: "bitpie",
    };

    // Map chain IDs to readable names
    const chainMap: { [key: string]: string } = {
      ethereum: "ether",
      bsc: "bsc",
      tron: "tron",
    };

    const walletParam = walletMap[selectedWallet] || selectedWallet;
    const chainParam = chainMap[localSelectedChain] || localSelectedChain;

    // Generate different deep links based on wallet type for mobile app integration
    if (selectedWallet === "metamask") {
      // MetaMask deep link - opens MetaMask app and shows contract interaction
      return `https://metamask.app.link/dapp/${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${walletParam}&action=connect&autoApprove=true`;
    } else if (selectedWallet === "imtoken") {
      // imToken deep link - opens imToken app with WalletConnect
      return `imtokenv2://navigate/DappView?url=${encodeURIComponent(
        `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${walletParam}&connect=imtoken`
      )}`;
    } else if (selectedWallet === "tronlink") {
      // TronLink deep link - opens TronLink app
      return `tronlinkoutside://navigate/DappView?url=${encodeURIComponent(
        `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${walletParam}&connect=tronlink`
      )}`;
    } else if (selectedWallet === "bitpie") {
      // Bitpie deep link - opens Bitpie app with WalletConnect
      return `bitpie://navigate/DappView?url=${encodeURIComponent(
        `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${walletParam}&connect=bitpie`
      )}`;
    }

    // Fallback to regular URL
    return `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${walletParam}`;
  };

  // Generate WalletConnect URI for mobile wallets
  const generateWalletConnectURI = () => {
    if (!selectedWallet || !localSelectedChain) return "";

    // For imToken and Bitpie, generate WalletConnect URI
    if (selectedWallet === "imtoken" || selectedWallet === "bitpie") {
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      const chainId =
        localSelectedChain === "ethereum"
          ? 1
          : localSelectedChain === "bsc"
          ? 56
          : 728126428;

      return `wc:${projectId}@1?chainId=${chainId}&relay-protocol=irn&rpcUrl=${getRpcUrlForChain(
        localSelectedChain
      )}`;
    }

    return "";
  };

  // Generate mobile-specific deep links for each wallet type
  const generateMobileDeepLink = () => {
    if (!selectedWallet || !localSelectedChain) return "";

    const currentPath = window.location.pathname;
    const currentOrigin = window.location.origin;

    // Map chain IDs to readable names
    const chainMap: { [key: string]: string } = {
      ethereum: "ether",
      bsc: "bsc",
      tron: "tron",
    };

    const chainParam = chainMap[localSelectedChain] || localSelectedChain;

    // Generate wallet-specific deep links with proper parameters
    switch (selectedWallet) {
      case "metamask":
        // MetaMask deep link - opens app and shows contract interaction
        return `https://metamask.app.link/dapp/${currentOrigin}${currentPath}?chain=${chainParam}&wallet=metamask&action=connect&autoApprove=true&source=qr`;

      case "imtoken":
        // imToken deep link - opens app with WalletConnect
        const imtokenUrl = `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=imtoken&connect=walletconnect&source=qr`;
        return `imtokenv2://navigate/DappView?url=${encodeURIComponent(
          imtokenUrl
        )}`;

      case "tronlink":
        // TronLink deep link - opens app
        const tronlinkUrl = `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=tronlink&connect=tronlink&source=qr`;
        return `tronlinkoutside://navigate/DappView?url=${encodeURIComponent(
          tronlinkUrl
        )}`;

      case "bitpie":
        // Bitpie deep link - opens app with WalletConnect
        const bitpieUrl = `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=bitpie&connect=walletconnect&source=qr`;
        return `bitpie://navigate/DappView?url=${encodeURIComponent(
          bitpieUrl
        )}`;

      default:
        return `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${selectedWallet}`;
    }
  };

  // Get RPC URL for specific chain
  const getRpcUrlForChain = (chainType: ChainType) => {
    switch (chainType) {
      case "ethereum":
        return "https://eth.llamarpc.com";
      case "bsc":
        return "https://bsc-dataseed.binance.org";
      case "tron":
        return "https://api.trongrid.io";
      default:
        return "https://eth.llamarpc.com";
    }
  };

  // Generate TronLink login deep link for wallet connection
  const generateTronLinkLoginURI = () => {
    if (selectedWallet !== "tronlink") return "";

    const loginParams = {
      url: window.location.href,
      callbackUrl: `${window.location.origin}/api/tron/callback`,
      dappIcon: `${window.location.origin}/icons/tronlink.png`,
      dappName: "USDT支付平台",
      protocol: "TronLink",
      version: "1.0",
      chainId: "0x2b6653dc", // TRON MainNet
      action: "login",
      actionId: `tron-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const encodedParams = encodeURIComponent(JSON.stringify(loginParams));
    return `tronlinkoutside://pull.activity?param=${encodedParams}`;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Chain Selection - Compact */}
      <div className="mb-4">
        <div className="text-center mb-2">
          <span className="text-gray-400 text-xs">选择网络</span>
          <span className="text-blue-400 text-xs ml-2">⭐ 推荐: Ethereum</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CHAIN_OPTIONS.map((chainOption) => (
            <button
              key={chainOption.id}
              onClick={() =>
                handleChainSwitch(
                  chainOption.chainId,
                  chainOption.id as ChainType
                )
              }
              className={cn(
                "p-3 rounded-lg border transition-all duration-200 text-center relative",
                localSelectedChain === chainOption.id
                  ? "border-red-500 bg-red-900/20"
                  : "border-gray-600 bg-gray-800/30 hover:border-gray-500"
              )}
            >
              {/* Recommended badge for Ethereum */}
              {chainOption.id === "ethereum" && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full">
                  ⭐
                </div>
              )}

              <div className="flex items-center justify-center space-x-2">
                <img
                  src={chainOption.icon}
                  alt={chainOption.name}
                  className="w-5 h-5"
                />
                <span className="text-xs text-white font-medium">
                  {chainOption.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Selection Status */}
      <div className="mb-4 p-3 bg-gray-800/30 rounded border border-gray-700/30">
        <div className="text-center text-sm">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-gray-400">当前选择:</span>
            <div className="flex items-center space-x-2">
              <img
                src={getChainInfo(localSelectedChain)?.icon}
                alt={getChainInfo(localSelectedChain)?.name}
                className="w-4 h-4"
              />
              <span className="text-white font-medium">
                {getChainInfo(localSelectedChain)?.name}
              </span>
            </div>
          </div>
          {selectedWallet && (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-gray-400">推荐钱包:</span>
              <div className="flex items-center space-x-2">
                <img
                  src={`/icons/${selectedWallet}.png`}
                  alt={selectedWallet}
                  className="w-4 h-4"
                />
                <span className="text-green-400 font-medium capitalize">
                  {selectedWallet === "metamask"
                    ? "MetaMask"
                    : selectedWallet === "tronlink"
                    ? "TronLink"
                    : selectedWallet === "imtoken"
                    ? "imToken"
                    : "Bitpie"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supported Wallets - Compact & Selectable */}
      <div className="mb-4">
        <div className="text-center mb-2">
          <span className="text-gray-400 text-xs">选择钱包</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "metamask", name: "MetaMask", icon: "/icons/metamask.png" },
            { id: "imtoken", name: "imToken", icon: "/icons/imtoken.png" },
            { id: "tronlink", name: "TronLink", icon: "/icons/tronlink.png" },
            { id: "bitpie", name: "Bitpie", icon: "/icons/bitpie.png" },
          ].map((wallet) => {
            // Determine if wallet should be disabled based on selected chain
            const isWalletDisabled = !isWalletCompatible(
              wallet.id,
              localSelectedChain
            );

            // Check if this is the recommended wallet for the current chain
            const isRecommended =
              wallet.id === getBestWalletForChain(localSelectedChain);

            // Auto-select recommended wallet if none selected
            const isSelected =
              selectedWallet === wallet.id ||
              (!selectedWallet && isRecommended);

            return (
              <button
                key={wallet.id}
                onClick={() =>
                  !isWalletDisabled && handleWalletSelect(wallet.id)
                }
                disabled={isWalletDisabled}
                className={cn(
                  "bg-gray-700/30 rounded p-2 border transition-all duration-200 text-center relative",
                  isSelected
                    ? "border-green-500 bg-green-900/20"
                    : isWalletDisabled
                    ? "border-gray-500/30 bg-gray-600/20 opacity-50 cursor-not-allowed"
                    : "border-gray-600/30 hover:border-gray-500"
                )}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full">
                    ⭐
                  </div>
                )}

                <div
                  className={cn(
                    "rounded p-1 mb-1",
                    isWalletDisabled ? "bg-gray-500/30" : "bg-gray-600/50"
                  )}
                >
                  <img
                    src={wallet.icon}
                    alt={wallet.name}
                    className={cn(
                      "w-4 h-4 mx-auto",
                      isWalletDisabled && "grayscale opacity-50"
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "text-xs font-medium",
                    isWalletDisabled ? "text-gray-500" : "text-gray-300"
                  )}
                >
                  {wallet.name}
                </p>
              </button>
            );
          })}
        </div>

        {/* Wallet Compatibility Info */}
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            {localSelectedChain === "tron" &&
              "💡 Tron 网络不支持 MetaMask，请使用 TronLink、imToken 或 Bitpie"}
            {localSelectedChain === "ethereum" &&
              "💡 Ethereum 网络不支持 TronLink，请使用 MetaMask、imToken 或 Bitpie"}
            {localSelectedChain === "bsc" &&
              "💡 BSC 网络不支持 TronLink，请使用 MetaMask、imToken 或 Bitpie"}
          </p>
        </div>
      </div>

      {/* QR Code for Mobile Users - BIGGER and CLEANER */}
      {showQRCode && selectedWallet && (
        <div className="mb-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
          {/* Show different QR codes based on wallet type - BIGGER SIZE */}
          {selectedWallet === "metamask" ? (
            // MetaMask deep link QR code
            <div className="space-y-3">
              <div className="text-center mb-2">
                <p className="text-blue-300 text-xs">
                  📱 扫描后将在 MetaMask 移动端打开
                </p>
                <p className="text-gray-400 text-xs">自动显示连接请求</p>
              </div>
              <div className="flex justify-center">
                <QRCode
                  value={generateMobileDeepLink()}
                  size={200}
                  className="mx-auto"
                />
              </div>
            </div>
          ) : selectedWallet === "tronlink" ? (
            // TronLink deep link QR code
            <div className="space-y-3">
              <div className="text-center mb-2">
                <p className="text-blue-300 text-xs">
                  📱 扫描后将在 TronLink 移动端打开
                </p>
                <p className="text-gray-400 text-xs">自动显示连接请求</p>
              </div>
              <div className="flex justify-center">
                <QRCode
                  value={generateMobileDeepLink()}
                  size={200}
                  className="mx-auto"
                />
              </div>
            </div>
          ) : (
            // WalletConnect QR code for imToken/Bitpie
            <div className="space-y-3">
              <div className="text-center mb-2">
                <p className="text-blue-300 text-xs">
                  📱 扫描后将在{" "}
                  {selectedWallet === "imtoken" ? "imToken" : "Bitpie"}{" "}
                  移动端打开
                </p>
                <p className="text-gray-400 text-xs">
                  使用 WalletConnect 协议连接
                </p>
              </div>
              <div className="flex justify-center">
                <QRCode
                  value={generateWalletConnectURI()}
                  size={200}
                  className="mx-auto"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet Connection - Compact */}
      <div className="text-center">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
              <div className="text-2xl mb-2">🔗</div>
              <h3 className="text-white font-semibold text-sm mb-2">
                连接钱包
              </h3>
              <p className="text-blue-200 text-xs mb-3">
                当前网络: {currentChainInfo?.name}
              </p>
              <div className="text-xs text-gray-400 mb-3">
                <p>支持的钱包:</p>
                <ul className="mt-1 space-y-1">
                  <li>• MetaMask (推荐)</li>
                  <li>• 其他 Web3 钱包</li>
                </ul>
              </div>
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {isConnecting ? "连接中..." : "连接钱包"}
              </button>
              {connectionError && (
                <p className="text-red-400 text-xs mt-2">{connectionError}</p>
              )}
              {isConnecting && (
                <p className="text-blue-400 text-xs mt-2">
                  正在连接钱包，请在弹出的窗口中确认连接...
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-900/20 rounded-lg p-4 border border-green-600/30">
              <div className="text-2xl mb-2">✅</div>
              <h3 className="text-white font-semibold text-sm mb-3">
                钱包已连接
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-300">地址:</span>
                  <span className="text-green-400 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">网络:</span>
                  <span className="text-green-400">
                    {chain?.id ? getChainName(chain.id) : "Unknown"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onStartPayment("wallet", address || "")}
                className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                开始支付流程
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
