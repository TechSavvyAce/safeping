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
  onWalletConnected: (walletId: string, address: string) => void;
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
  onWalletConnected,
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

    // Clear wallet selection if it's incompatible with the new chain
    if (selectedWallet && !isWalletCompatible(selectedWallet, chainType)) {
      setSelectedWallet(null);
      setShowQRCode(false);
    }

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

  // Helper function to check if a wallet is compatible with the selected chain
  const isWalletCompatible = (walletId: string, chainType: ChainType) => {
    if (chainType === "tron") {
      return walletId !== "metamask"; // Tron doesn't support MetaMask
    } else if (chainType === "ethereum" || chainType === "bsc") {
      return walletId !== "tronlink"; // Ethereum/BSC don't support TronLink
    }
    return true; // imToken and Bitpie work with all chains
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

    // Generate different URLs based on wallet type
    if (selectedWallet === "metamask") {
      // MetaMask deep link
      return `https://metamask.app.link/dapp/${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${walletParam}`;
    } else if (
      selectedWallet === "imtoken" ||
      selectedWallet === "bitpie" ||
      selectedWallet === "tronlink"
    ) {
      // WalletConnect for mobile wallets
      return `${currentOrigin}${currentPath}?chain=${chainParam}&wallet=${walletParam}`;
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

      return `wc:${projectId}@1?chainId=${chainId}&relay-protocol=irn`;
    }

    return "";
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
                "p-3 rounded-lg border transition-all duration-200 text-center",
                localSelectedChain === chainOption.id
                  ? "border-red-500 bg-red-900/20"
                  : "border-gray-600 bg-gray-800/30 hover:border-gray-500"
              )}
            >
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

            return (
              <button
                key={wallet.id}
                onClick={() =>
                  !isWalletDisabled && handleWalletSelect(wallet.id)
                }
                disabled={isWalletDisabled}
                className={cn(
                  "bg-gray-700/30 rounded p-2 border transition-all duration-200 text-center",
                  selectedWallet === wallet.id
                    ? "border-green-500 bg-green-900/20"
                    : isWalletDisabled
                    ? "border-gray-500/30 bg-gray-600/20 opacity-50 cursor-not-allowed"
                    : "border-gray-600/30 hover:border-gray-500"
                )}
              >
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
                  {isWalletDisabled && (
                    <span className="block text-xs text-red-400 mt-1">
                      {localSelectedChain === "tron" ? "不支持" : "不兼容"}
                    </span>
                  )}
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
            <div className="flex justify-center">
              <QRCode
                value={generatePaymentUrl()}
                size={200}
                className="mx-auto"
              />
            </div>
          ) : selectedWallet === "tronlink" ? (
            // TronLink deep link QR code
            <div className="flex justify-center">
              <QRCode
                value={generatePaymentUrl()}
                size={200}
                className="mx-auto"
              />
            </div>
          ) : (
            // WalletConnect QR code for imToken/Bitpie
            <div className="flex justify-center">
              <QRCode
                value={generatePaymentUrl()}
                size={200}
                className="mx-auto"
              />
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
                onClick={() => onWalletConnected("wallet", address || "")}
                className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                继续支付
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
