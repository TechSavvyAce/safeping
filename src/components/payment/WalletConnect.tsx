// =================================
// 💼 Wallet Connect Component
// =================================

"use client";

import React, { useState, useEffect } from "react";
import { WalletType, ChainType, WalletConnection } from "@/types";
import { cn } from "@/utils/cn";
import { walletManager } from "@/lib/wallet";
import { formatAddress } from "@/config/chains";

interface WalletConnectProps {
  selectedChain: ChainType | null;
  onConnect: (connection: WalletConnection) => void;
  disabled?: boolean;
  className?: string;
}

const walletInfo = {
  metamask: {
    name: "MetaMask",
    description: "Connect with MetaMask wallet",
    description_cn: "使用MetaMask钱包连接",
    icon: "/icons/metamask.png",
    emoji: "🦊",
    color: "bg-orange-500",
    supportedChains: ["ethereum", "bsc"] as ChainType[],
  },
  tronlink: {
    name: "TronLink",
    description: "Connect with TronLink wallet",
    description_cn: "使用TronLink钱包连接",
    icon: "/icons/tronlink.png",
    emoji: "🔴",
    color: "bg-red-500",
    supportedChains: ["tron"] as ChainType[],
  },
  imtoken: {
    name: "imToken",
    description: "Connect with imToken wallet",
    description_cn: "使用imToken钱包连接",
    icon: "/icons/imtoken.png",
    emoji: "💎",
    color: "bg-blue-500",
    supportedChains: ["ethereum", "bsc"] as ChainType[],
  },
};

export function WalletConnect({
  selectedChain,
  onConnect,
  disabled = false,
  className,
}: WalletConnectProps) {
  const [connectingWallet, setConnectingWallet] = useState<WalletType | null>(
    null
  );
  const [availableWallets, setAvailableWallets] = useState<
    Record<WalletType, boolean>
  >({
    metamask: false,
    tronlink: false,
    imtoken: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Detect available wallets on mount
  useEffect(() => {
    const detected = walletManager.detectWallets();
    setAvailableWallets(detected);
  }, []);

  const handleWalletConnect = async (walletType: WalletType) => {
    if (!selectedChain) {
      setError("Please select a network first");
      return;
    }

    if (!availableWallets[walletType]) {
      setError(`${walletInfo[walletType].name} is not installed`);
      return;
    }

    // Check if wallet supports selected chain
    if (!walletInfo[walletType].supportedChains.includes(selectedChain)) {
      setError(
        `${
          walletInfo[walletType].name
        } does not support ${selectedChain.toUpperCase()}`
      );
      return;
    }

    setConnectingWallet(walletType);
    setError(null);

    try {
      const connection = await walletManager.connectWallet(
        walletType,
        selectedChain
      );
      onConnect(connection);
      console.log(`✅ Connected to ${walletType}:`, connection);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err.message);
    } finally {
      setConnectingWallet(null);
    }
  };

  const getWalletButtonState = (walletType: WalletType) => {
    const info = walletInfo[walletType];
    const isAvailable = availableWallets[walletType];
    const isSupported = selectedChain
      ? info.supportedChains.includes(selectedChain)
      : true;
    const isConnecting = connectingWallet === walletType;
    const isDisabled =
      disabled || !isAvailable || !isSupported || !selectedChain;

    return {
      isAvailable,
      isSupported,
      isConnecting,
      isDisabled,
    };
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Chain selection reminder */}
      {!selectedChain && (
        <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-xl">
          <p className="text-sm text-yellow-300">请先选择网络</p>
        </div>
      )}

      {/* Wallet options - Chinese Dark Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(walletInfo).map(([walletKey, info]) => {
          const walletType = walletKey as WalletType;
          const state = getWalletButtonState(walletType);

          return (
            <button
              key={walletType}
              onClick={() => handleWalletConnect(walletType)}
              disabled={state.isDisabled}
              className={cn(
                "relative p-6 rounded-xl border-2 transition-all duration-300 group overflow-hidden",
                "focus:outline-none focus:ring-2 focus:ring-red-500 transform hover:scale-105",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                state.isAvailable && state.isSupported
                  ? "border-gray-700 hover:border-red-500 bg-gray-800 shadow-lg"
                  : "border-gray-700 bg-gray-800/50"
              )}
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              {/* Connecting spinner */}
              {state.isConnecting && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Wallet icon */}
              <div className="relative z-10 flex items-center justify-center mb-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 p-3",
                    info.color,
                    state.isAvailable ? "border-gray-600" : "border-gray-700"
                  )}
                >
                  <img
                    src={info.icon}
                    alt={info.name}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      // Fallback to emoji if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "block";
                    }}
                  />
                  <span className="text-3xl hidden">{info.emoji}</span>
                </div>
              </div>

              {/* Wallet info */}
              <div className="relative z-10 text-center">
                <h4 className="font-bold text-white text-lg mb-2">
                  {info.name}
                </h4>

                {/* Status indicators */}
                <div className="space-y-2">
                  {!state.isAvailable && (
                    <p className="text-sm text-red-300 font-medium">未安装</p>
                  )}

                  {state.isAvailable && !state.isSupported && selectedChain && (
                    <p className="text-sm text-yellow-300 font-medium">
                      不支持
                    </p>
                  )}

                  {state.isAvailable && state.isSupported && (
                    <p className="text-sm text-gray-300">
                      {info.description_cn}
                    </p>
                  )}

                  {state.isConnecting && (
                    <p className="text-sm text-red-300 font-medium animate-pulse">
                      连接中...
                    </p>
                  )}
                </div>
              </div>

              {/* Supported chains indicator */}
              <div className="relative z-10 flex justify-center mt-4 space-x-2">
                {info.supportedChains.map((chain) => (
                  <div
                    key={chain}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      selectedChain === chain
                        ? "bg-red-500 animate-pulse"
                        : "bg-gray-600"
                    )}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Installation hints - Chinese Style */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-400">
          没有钱包?{" "}
          <a
            href="https://metamask.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 underline font-medium transition-colors"
          >
            安装MetaMask
          </a>
        </p>
      </div>
    </div>
  );
}
