// =================================
// 🔗 Chain Selector Component
// =================================

"use client";

import React from "react";
import { ChainType } from "@/types";
import { cn } from "@/utils/cn";
import { CHAIN_NAMES } from "@/config/chains";

interface ChainSelectorProps {
  selectedChain: ChainType | null;
  onChainSelect: (chain: ChainType) => void;
  disabled?: boolean;
  className?: string;
}

const chainInfo = {
  tron: {
    name: "TRON",
    description: "Low Fee",
    description_cn: "低手续费",
    color: "bg-red-500",
    icon: "/icons/tron.png",
    emoji: "🔴",
  },
  bsc: {
    name: "BSC",
    description: "Fast",
    description_cn: "快速",
    color: "bg-yellow-500",
    icon: "/icons/bsc.png",
    emoji: "🟡",
  },
  ethereum: {
    name: "Ethereum",
    description: "Secure",
    description_cn: "安全",
    color: "bg-blue-500",
    icon: "/icons/ethereum.png",
    emoji: "🔵",
  },
};

export function ChainSelector({
  selectedChain,
  onChainSelect,
  disabled = false,
  className,
}: ChainSelectorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(chainInfo).map(([chainKey, info]) => {
          const chain = chainKey as ChainType;
          const isSelected = selectedChain === chain;

          return (
            <button
              key={chain}
              onClick={() => !disabled && onChainSelect(chain)}
              disabled={disabled}
              className={cn(
                "relative p-6 rounded-xl border-2 transition-all duration-300 group",
                "hover:shadow-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                "bg-gray-800 text-center overflow-hidden transform hover:scale-105",
                isSelected
                  ? "border-red-500 bg-gradient-to-br from-red-900/20 to-red-800/20"
                  : "border-gray-700 hover:border-red-400"
              )}
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              )}

              {/* Chain icon */}
              <div className="relative z-10 flex items-center justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center border-2 border-gray-600 p-2">
                  <img
                    src={info.icon}
                    alt={info.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      // Fallback to first letter if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "block";
                    }}
                  />
                  <span className="text-white text-xl font-bold hidden">
                    {info.name.charAt(0)}
                  </span>
                </div>
              </div>

              {/* Chain name */}
              <div className="relative z-10 text-center">
                <h4 className="font-semibold text-white text-lg mb-1">
                  {info.name}
                </h4>
                <p
                  className={cn(
                    "text-sm font-medium",
                    chain === "tron"
                      ? "text-red-300"
                      : chain === "bsc"
                      ? "text-yellow-300"
                      : "text-blue-300"
                  )}
                >
                  {info.description_cn}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected chain info - Chinese style */}
      {selectedChain && (
        <div className="mt-6 p-4 bg-gradient-to-r from-gray-800 to-gray-750 rounded-xl border border-gray-700">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">
              <span className="text-gray-300">已选择网络:</span>{" "}
              <span className="text-red-300 font-semibold">
                {chainInfo[selectedChain].name}
              </span>
            </span>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping" />
              <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping animation-delay-200" />
              <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping animation-delay-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
