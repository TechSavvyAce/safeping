// =================================
// 💰 USDT Chain Selection Component
// =================================

"use client";

import React, { useState, useEffect } from "react";
import { ChainType } from "@/types";
import { cn } from "@/utils/cn";
import QRCode from "qrcode";

interface USDTChainSelectorProps {
  onSelect: (chain: ChainType) => void;
  disabled?: boolean;
  className?: string;
}

interface MobileQRProps {
  chain: ChainType;
  onBack: () => void;
}

// Check if we're in testnet mode
const isTestnet = process.env.NEXT_PUBLIC_NETWORK_MODE !== "mainnet";

const USDT_CHAINS = [
  {
    id: "tron" as ChainType,
    name: "USDT",
    network: isTestnet ? "Tron Shasta" : "Tron",
    fullName: isTestnet
      ? "TUSDT on Tron Shasta Testnet"
      : "USDT on Tron Network",
    icon: "/icons/tron.png",
    color: "from-red-500 to-red-600",
    bgColor: "from-red-900/20 to-red-800/20",
    borderColor: "border-red-600",
    description: isTestnet ? "TRC20 • 测试网络" : "TRC20 • 最低手续费",
    fees: "~1 TRX",
    speed: "1-3分钟",
  },
  {
    id: "bsc" as ChainType,
    name: "USDT",
    network: isTestnet ? "BSC Testnet" : "BSC",
    fullName: isTestnet ? "USDT on BSC Testnet" : "USDT on BNB Smart Chain",
    icon: "/icons/bsc.png",
    color: "from-yellow-500 to-yellow-600",
    bgColor: "from-yellow-900/20 to-yellow-800/20",
    borderColor: "border-yellow-600",
    description: isTestnet ? "BEP20 • 测试网络" : "BEP20 • 快速便宜",
    fees: isTestnet ? "~0.01 BNB" : "~0.3 BNB",
    speed: "1-2分钟",
  },
];

function MobileQRView({ chain, onBack }: MobileQRProps) {
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  useEffect(() => {
    const generateQR = async () => {
      try {
        // Create payment URL with chain parameter
        const paymentUrl = `${window.location.origin}${window.location.pathname}?chain=${chain}`;
        const qrData = await QRCode.toDataURL(paymentUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeData(qrData);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };

    generateQR();
  }, [chain]);

  const chainInfo = USDT_CHAINS.find((c) => c.id === chain);

  return (
    <div className="text-center space-y-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">扫码选择钱包</h3>
        <p className="text-gray-400 text-sm">
          使用手机钱包扫描二维码继续支付流程
        </p>
      </div>

      {/* Chain Badge */}
      <div className="flex items-center justify-center space-x-3 mb-4">
        <div className="relative">
          {/* USDT Icon */}
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <img
              src="/icons/tether.svg"
              alt="USDT"
              className="w-8 h-8 object-contain"
            />
          </div>
          {/* Chain Badge */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
            <img
              src={chainInfo?.icon}
              alt={chainInfo?.network}
              className="w-3 h-3 object-contain"
            />
          </div>
        </div>
        <span className="text-white font-semibold">{chainInfo?.fullName}</span>
      </div>

      {/* QR Code */}
      {qrCodeData && (
        <div className="bg-white p-6 rounded-xl inline-block shadow-lg">
          <img src={qrCodeData} alt="Payment QR Code" className="w-48 h-48" />
        </div>
      )}

      <div className="space-y-3 text-sm text-gray-300">
        <p>请使用以下钱包扫描二维码:</p>
        <div className="flex justify-center space-x-4">
          {chain === "tron" && (
            <div className="text-center">
              <img
                src="/icons/tronlink.png"
                alt="TronLink"
                className="w-8 h-8 mx-auto mb-1"
              />
              <span className="text-xs">TronLink</span>
            </div>
          )}
          {(chain === "bsc" || chain === "ethereum") && (
            <>
              <div className="text-center">
                <img
                  src="/icons/metamask.png"
                  alt="MetaMask"
                  className="w-8 h-8 mx-auto mb-1"
                />
                <span className="text-xs">MetaMask</span>
              </div>
              <div className="text-center">
                <img
                  src="/icons/imtoken.png"
                  alt="imToken"
                  className="w-8 h-8 mx-auto mb-1"
                />
                <span className="text-xs">imToken</span>
              </div>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onBack}
        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
      >
        返回选择网络
      </button>
    </div>
  );
}

export function USDTChainSelector({
  onSelect,
  disabled = false,
  className,
}: USDTChainSelectorProps) {
  const [selectedChainForQR, setSelectedChainForQR] =
    useState<ChainType | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  const handleChainSelect = (chain: ChainType) => {
    if (isMobile) {
      setSelectedChainForQR(chain);
    } else {
      onSelect(chain);
    }
  };

  const handleBackFromQR = () => {
    setSelectedChainForQR(null);
  };

  if (selectedChainForQR) {
    return (
      <MobileQRView chain={selectedChainForQR} onBack={handleBackFromQR} />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          选择 USDT 网络
          {isTestnet && (
            <span className="ml-2 text-sm bg-orange-500 text-white px-2 py-1 rounded-full">
              测试网
            </span>
          )}
        </h3>
        <p className="text-gray-400 text-sm">
          {isTestnet
            ? "请选择测试网络进行开发测试"
            : "请选择您要使用的 USDT 所在的区块链网络"}
        </p>
      </div>

      <div className="space-y-3">
        {USDT_CHAINS.map((chain) => (
          <button
            key={chain.id}
            onClick={() => handleChainSelect(chain.id)}
            disabled={disabled}
            className={cn(
              "w-full p-6 rounded-xl border-2 transition-all duration-300 group overflow-hidden relative",
              "focus:outline-none focus:ring-2 focus:ring-red-500 transform hover:scale-102",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
              `bg-gradient-to-r ${chain.bgColor}`,
              `hover:${chain.borderColor}`,
              "border-gray-700"
            )}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative z-10 flex items-center space-x-4">
              {/* USDT Icon */}
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center border-2 border-gray-600 p-3 shadow-lg">
                <div className="relative">
                  {/* USDT Logo */}
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <img
                      src="/icons/tether.svg"
                      alt="USDT"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "block";
                      }}
                    />
                    <span className="text-green-600 font-bold text-lg hidden">
                      ₮
                    </span>
                  </div>
                  {/* Chain Badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                    <img
                      src={chain.icon}
                      alt={chain.network}
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "block";
                      }}
                    />
                    <span className="text-white text-xs font-bold hidden">
                      {chain.network.charAt(0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chain Info */}
              <div className="flex-1 text-left">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-bold text-white text-lg">{chain.name}</h4>
                  <span className="text-gray-400 text-sm">on</span>
                  <span className="font-semibold text-gray-300 text-sm">
                    {chain.network}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  {chain.description}
                </p>

                {/* Network Details */}
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">费用:</span>
                    <span className="text-gray-300">{chain.fees}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">速度:</span>
                    <span className="text-gray-300">{chain.speed}</span>
                  </div>
                </div>
              </div>

              {/* Selection Arrow */}
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
        ))}
      </div>
    </div>
  );
}
