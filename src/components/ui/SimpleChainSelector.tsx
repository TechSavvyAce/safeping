"use client";

import React from "react";
import { cn } from "@/utils/cn";
import { ChainType } from "@/types";

interface SimpleChainSelectorProps {
  selectedChain: ChainType;
  onChainSelect: (chain: ChainType) => void;
  disabled?: boolean;
}

const CHAIN_INFO = {
  ethereum: {
    name: "Ethereum",
    description: "USDT (ERC-20)",
    icon: "/icons/ethereum.png",
    color: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
    selectedColor: "border-blue-500 bg-blue-100 dark:bg-blue-900/40",
  },
  bsc: {
    name: "BSC",
    description: "USDT (BEP-20)",
    icon: "/icons/bsc.png",
    color: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    selectedColor: "border-yellow-500 bg-yellow-100 dark:bg-yellow-900/40",
  },
  tron: {
    name: "Tron",
    description: "USDT (TRC-20)",
    icon: "/icons/tron.png",
    color: "border-red-500 bg-red-50 dark:bg-red-900/20",
    selectedColor: "border-red-500 bg-red-100 dark:bg-red-900/40",
  },
};

export function SimpleChainSelector({
  selectedChain,
  onChainSelect,
  disabled = false,
}: SimpleChainSelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Select Network for USDT Payment
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(CHAIN_INFO) as ChainType[]).map((chain) => {
          const info = CHAIN_INFO[chain];
          const isSelected = selectedChain === chain;

          return (
            <button
              key={chain}
              onClick={() => onChainSelect(chain)}
              disabled={disabled}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all duration-200",
                "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2",
                isSelected
                  ? info.selectedColor + " ring-2 ring-offset-2 ring-blue-500"
                  : info.color + " hover:border-opacity-80",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex flex-col items-center text-center">
                <img
                  src={info.icon}
                  alt={info.name}
                  className="w-12 h-12 mb-3 rounded-full"
                />
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {info.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {info.description}
                </p>

                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Choose the network where you have USDT.
          {selectedChain === "ethereum" &&
            " Ethereum has lower fees but slower confirmations."}
          {selectedChain === "bsc" &&
            " BSC has fast confirmations and low fees."}
          {selectedChain === "tron" &&
            " Tron has the lowest fees and fastest confirmations."}
        </p>
      </div>
    </div>
  );
}
