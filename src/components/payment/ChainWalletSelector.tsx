// =================================
// 🔗💼 Unified Chain & Wallet Selector
// =================================

"use client";

import React, { useState, useEffect } from "react";
import { ChainType } from "@/types";
import { cn } from "@/utils/cn";
import QRCode from "qrcode";

interface ChainWalletSelectorProps {
  onSelect: (chain: ChainType, wallet: string) => void;
  disabled?: boolean;
  isMobile?: boolean;
  showQR?: boolean;
  qrUrl?: string;
  className?: string;
}

const chainWalletCombos = [
  // BSC combinations
  {
    chain: "bsc" as ChainType,
    chainName: "BSC",
    chainDescription: "币安智能链",
    chainIcon: "/icons/bsc.png",
    wallets: [
      {
        id: "metamask",
        name: "MetaMask",
        description: "使用MetaMask连接",
        icon: "/icons/metamask.png",
        installUrl: "https://metamask.io/download/",
      },
      {
        id: "imtoken",
        name: "imToken",
        description: "使用imToken连接",
        icon: "/icons/imtoken.png",
        installUrl: "https://token.im/",
      },
    ],
  },
  // Ethereum combinations
  {
    chain: "ethereum" as ChainType,
    chainName: "Ethereum",
    chainDescription: "以太坊主网",
    chainIcon: "/icons/ethereum.png",
    wallets: [
      {
        id: "metamask",
        name: "MetaMask",
        description: "使用MetaMask连接",
        icon: "/icons/metamask.png",
        installUrl: "https://metamask.io/download/",
      },
      {
        id: "imtoken",
        name: "imToken",
        description: "使用imToken连接",
        icon: "/icons/imtoken.png",
        installUrl: "https://token.im/",
      },
    ],
  },
  // TRON combinations
  {
    chain: "tron" as ChainType,
    chainName: "TRON",
    chainDescription: "波场网络",
    chainIcon: "/icons/tron.png",
    wallets: [
      {
        id: "tronlink",
        name: "TronLink",
        description: "使用TronLink连接",
        icon: "/icons/tronlink.png",
        installUrl: "https://www.tronlink.org/",
      },
    ],
  },
];

export function ChainWalletSelector({
  onSelect,
  disabled = false,
  isMobile = false,
  showQR = false,
  qrUrl,
  className,
}: ChainWalletSelectorProps) {
  const [walletAvailability, setWalletAvailability] = useState<
    Record<string, boolean>
  >({});
  const [qrCodeData, setQrCodeData] = useState<string>("");

  // Detect available wallets (PC only)
  useEffect(() => {
    if (!isMobile) {
      const detectWallets = () => {
        const availability: Record<string, boolean> = {};

        // Detect MetaMask
        availability.metamask = !!(window as any).ethereum?.isMetaMask;

        // Detect TronLink
        availability.tronlink = !!(window as any).tronWeb;

        // Detect imToken (similar to MetaMask detection)
        availability.imtoken = !!(window as any).ethereum?.isImToken;

        setWalletAvailability(availability);
      };

      detectWallets();

      // Re-check every 2 seconds for newly installed wallets
      const interval = setInterval(detectWallets, 2000);
      return () => clearInterval(interval);
    }
  }, [isMobile]);

  // Generate QR code
  useEffect(() => {
    if (showQR && qrUrl) {
      QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      }).then(setQrCodeData);
    }
  }, [showQR, qrUrl]);

  const handleWalletClick = (
    chain: ChainType,
    walletId: string,
    installUrl: string
  ) => {
    if (isMobile) {
      onSelect(chain, walletId);
      return;
    }

    const isInstalled = walletAvailability[walletId];

    if (isInstalled) {
      onSelect(chain, walletId);
    } else {
      // Redirect to wallet installation
      window.open(installUrl, "_blank");
    }
  };

  if (showQR && qrCodeData) {
    return (
      <div className={cn("text-center space-y-6", className)}>
        <h3 className="text-xl font-bold text-white">手机扫码支付</h3>

        <div className="bg-white p-6 rounded-xl inline-block">
          <img src={qrCodeData} alt="Payment QR Code" className="w-48 h-48" />
        </div>

        <p className="text-gray-300 text-sm leading-relaxed">
          请使用手机钱包应用扫描上方二维码
          <br />
          扫码后将自动打开对应的钱包应用
        </p>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          返回选择
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">选择支付方式</h3>
        <p className="text-gray-400">
          {isMobile ? "选择钱包生成扫码支付" : "选择区块链网络和钱包"}
        </p>
      </div>

      {/* Single Row Wallet Layout */}
      <div className="space-y-3">
        {chainWalletCombos.map((chainGroup) =>
          chainGroup.wallets.map((wallet) => {
            const isInstalled = !isMobile && walletAvailability[wallet.id];
            const needsInstall = !isMobile && !isInstalled;

            return (
              <button
                key={`${chainGroup.chain}-${wallet.id}`}
                onClick={() =>
                  handleWalletClick(
                    chainGroup.chain,
                    wallet.id,
                    wallet.installUrl
                  )
                }
                disabled={disabled}
                className={cn(
                  "w-full relative p-5 rounded-xl border-2 transition-all duration-300 group overflow-hidden",
                  "focus:outline-none focus:ring-2 focus:ring-red-500 transform hover:scale-102",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                  needsInstall
                    ? "border-yellow-600 bg-gradient-to-r from-yellow-900/20 to-yellow-800/20"
                    : isInstalled
                    ? "border-green-600 bg-gradient-to-r from-green-900/20 to-green-800/20"
                    : "border-gray-700 hover:border-red-500 bg-gray-800"
                )}
              >
                {/* Enhanced Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative z-10 flex items-center space-x-4">
                  {/* Chain Icon (Small) */}
                  <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center border border-gray-600">
                    <img
                      src={chainGroup.chainIcon}
                      alt={chainGroup.chainName}
                      className="w-5 h-5 object-contain"
                    />
                  </div>

                  {/* Wallet Icon (Large) */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center border-2 border-gray-600 p-3 shadow-lg">
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
                    <span className="text-white text-lg font-bold hidden">
                      {wallet.name.charAt(0)}
                    </span>
                  </div>

                  {/* Wallet & Chain Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-bold text-white text-lg">
                        {wallet.name}
                      </h5>
                      <span className="text-gray-400 text-sm">on</span>
                      <span className="font-semibold text-gray-300 text-sm">
                        {chainGroup.chainName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {wallet.description} • {chainGroup.chainDescription}
                    </p>

                    {/* Enhanced Status */}
                    <div className="flex items-center space-x-2">
                      {!isMobile ? (
                        isInstalled ? (
                          <>
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-400 font-medium">
                              已安装，点击连接
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-yellow-400 font-medium">
                              点击安装钱包
                            </span>
                          </>
                        )
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-blue-400 font-medium">
                            点击生成扫码
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Arrow */}
                  <div className="text-gray-400 group-hover:text-white transition-colors">
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
