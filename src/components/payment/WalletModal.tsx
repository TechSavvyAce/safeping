// =================================
// 🔐 Professional Wallet Connection Modal
// =================================

"use client";

import React, { useState, useEffect } from "react";
import { ChainType } from "@/types";
import { cn } from "@/utils/cn";
import { walletManager } from "@/lib/wallet";

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  installUrl: string;
  supportedChains: ChainType[];
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChain: ChainType;
  onConnect: (walletId: string) => void;
  className?: string;
}

// Check if we're in testnet mode
const isTestnet = process.env.NEXT_PUBLIC_NETWORK_MODE !== "mainnet";

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "metamask",
    name: "MetaMask",
    description: isTestnet ? "连接 BSC 测试网络" : "最受欢迎的以太坊钱包",
    icon: "/icons/metamask.png",
    installUrl: "https://metamask.io/download/",
    supportedChains: ["ethereum", "bsc"],
  },
  {
    id: "tronlink",
    name: "TronLink",
    description: isTestnet ? "连接 TRON Shasta 测试网" : "官方 TRON 钱包",
    icon: "/icons/tronlink.png",
    installUrl: "https://www.tronlink.org/",
    supportedChains: ["tron"],
  },
  {
    id: "imtoken",
    name: "imToken",
    description: isTestnet ? "多链测试网支持" : "多链钱包支持",
    icon: "/icons/imtoken.png",
    installUrl: "https://token.im/",
    supportedChains: ["ethereum", "bsc", "tron"],
  },
];

export function WalletModal({
  isOpen,
  onClose,
  selectedChain,
  onConnect,
  className,
}: WalletModalProps) {
  const [walletAvailability, setWalletAvailability] = useState<
    Record<string, boolean>
  >({});
  const [connecting, setConnecting] = useState<string | null>(null);

  // Check wallet availability
  useEffect(() => {
    if (isOpen) {
      const availability = walletManager.detectWallets();
      setWalletAvailability(availability);
    }
  }, [isOpen]);

  const handleWalletClick = async (walletId: string, installUrl: string) => {
    const isInstalled = walletAvailability[walletId];

    if (!isInstalled) {
      // Open install page
      window.open(installUrl, "_blank");
      return;
    }

    // Connect wallet
    setConnecting(walletId);
    try {
      await onConnect(walletId);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setConnecting(null);
    }
  };

  if (!isOpen) return null;

  const supportedWallets = WALLET_OPTIONS.filter((wallet) =>
    wallet.supportedChains.includes(selectedChain)
  );

  const getChainName = (chain: ChainType) => {
    switch (chain) {
      case "tron":
        return "TRON";
      case "bsc":
        return "BSC";
      case "ethereum":
        return "Ethereum";
      default:
        return chain;
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        className
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-gray-800 rounded-2xl border-2 border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-600 to-red-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">
                连接钱包
                {isTestnet && (
                  <span className="ml-2 text-sm bg-orange-500 text-white px-2 py-1 rounded-full">
                    测试网
                  </span>
                )}
              </h3>
              <p className="text-red-100 text-sm mt-1">
                选择钱包连接到 {getChainName(selectedChain)}{" "}
                {isTestnet ? "测试网络" : "网络"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute top-8 right-8 w-1 h-1 bg-yellow-300 rounded-full animate-ping"></div>
            <div className="absolute bottom-6 left-8 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce"></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {supportedWallets.map((wallet) => {
            const isInstalled = walletAvailability[wallet.id];
            const isConnecting = connecting === wallet.id;

            return (
              <button
                key={wallet.id}
                onClick={() => handleWalletClick(wallet.id, wallet.installUrl)}
                disabled={isConnecting}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all duration-300 group overflow-hidden relative",
                  "focus:outline-none focus:ring-2 focus:ring-red-500 transform hover:scale-102",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                  isInstalled
                    ? "border-green-600 bg-gradient-to-r from-green-900/20 to-green-800/20"
                    : "border-yellow-600 bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 hover:border-yellow-500",
                  "text-left"
                )}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative z-10 flex items-center space-x-4">
                  {/* Wallet Icon */}
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border-2 border-gray-600 p-2">
                    {isConnecting ? (
                      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <img
                          src={wallet.icon}
                          alt={wallet.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback =
                              target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "block";
                          }}
                        />
                        <span className="text-white text-sm font-bold hidden">
                          {wallet.name.charAt(0)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Wallet Info */}
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-lg">
                      {wallet.name}
                    </h4>
                    <p className="text-sm text-gray-400 mb-1">
                      {wallet.description}
                    </p>

                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {isConnecting ? (
                        <>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-blue-400 font-medium">
                            连接中...
                          </span>
                        </>
                      ) : isInstalled ? (
                        <>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-400 font-medium">
                            已安装 • 点击连接
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span className="text-xs text-yellow-400 font-medium">
                            点击安装
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Icon */}
                  <div className="text-gray-400 group-hover:text-white transition-colors">
                    {isInstalled ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              连接钱包即表示您同意我们的
              <span className="text-red-400">服务条款</span>和
              <span className="text-red-400">隐私政策</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
