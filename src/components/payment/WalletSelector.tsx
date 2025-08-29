"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { web3modal } from "@/lib/web3modal";
import { ChainType } from "@/types";
import { cn } from "@/utils/cn";

interface WalletSelectorProps {
  selectedChain: ChainType;
  onStartPayment: () => void;
  onChainSelected: (chain: ChainType) => void;
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

function getChainName(chainId: number): string {
  const chain = CHAIN_OPTIONS.find(c => c.chainId === chainId);
  return chain ? chain.name : "Unknown";
}

function getBestWalletForChain(chain: ChainType): string {
  if (chain === "tron") return "tronlink";
  return "metamask";
}

export function WalletSelector({
  selectedChain,
  onStartPayment,
  onChainSelected,
  className,
}: WalletSelectorProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { chainId } = useChainId();
  const { switchChain } = useSwitchChain();

  const [localSelectedChain, setLocalSelectedChain] = useState<ChainType>(selectedChain);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auto-select best wallet for chain
  useEffect(() => {
    if (localSelectedChain === "ethereum" && !selectedWallet) {
      setSelectedWallet("metamask");

      if (typeof window !== "undefined" && (window as any).ethereum) {
        setTimeout(() => {
          handleConnectWallet();
        }, 100);
      }
    }
  }, [localSelectedChain, selectedWallet]);

  // Auto-select best wallet for current chain
  useEffect(() => {
    if (!selectedWallet && localSelectedChain) {
      const bestWallet = getBestWalletForChain(localSelectedChain);
      setSelectedWallet(bestWallet);

      if (
        bestWallet === "metamask" &&
        typeof window !== "undefined" &&
        (window as any).ethereum
      ) {
        setTimeout(() => {
          handleConnectWallet();
        }, 100);
      }
    }
  }, [localSelectedChain, selectedWallet]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      if (web3modal) {
        web3modal.open();
      }

      setTimeout(() => {
        if (!isConnected && !isConnecting) {
          if (typeof window !== "undefined" && (window as any).ethereum) {
            (window as any).ethereum.request({ method: "eth_requestAccounts" });
          }
        }
      }, 2000);
    } catch (error) {
      setConnectionError("钱包连接失败，请检查浏览器扩展或重试");

      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          await (window as any).ethereum.request({
            method: "eth_requestAccounts",
          });
        } catch (fallbackError) {
          setConnectionError("MetaMask 连接失败，请确保已安装 MetaMask 扩展");
        }
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleChainSwitch = async (chainId: number, chainType: ChainType) => {
    setLocalSelectedChain(chainType);

    if (isConnected && switchChain) {
      try {
        await switchChain({ chainId });
      } catch (error) {
        setLocalSelectedChain(selectedChain);
      }
    }
  };

  const currentChainId = chainId;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Chain Selection */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-3">选择网络</h3>
        <div className="grid grid-cols-3 gap-2">
          {CHAIN_OPTIONS.map((chainOption) => (
            <button
              key={chainOption.id}
              onClick={() => {
                onChainSelected(chainOption.id as ChainType);
                handleChainSwitch(chainOption.chainId, chainOption.id as ChainType);
              }}
              className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center space-y-2 ${
                localSelectedChain === chainOption.id
                  ? "bg-red-600 text-white shadow-lg scale-105"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
              }`}
            >
              <img
                src={chainOption.icon}
                alt={chainOption.name}
                className="w-8 h-8 object-contain"
              />
              <span className="text-xs">{chainOption.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet Connection */}
      {!isConnected ? (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">连接钱包</h3>
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>连接中...</span>
              </>
            ) : (
              <>
                <span>🔗</span>
                <span>连接钱包</span>
              </>
            )}
          </button>
          {connectionError && (
            <p className="text-red-400 text-sm mt-2 text-center">
              {connectionError}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-3">钱包已连接</h3>
          <div className="space-y-3">
            <div className="bg-green-900/20 border border-green-700/30 rounded p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-300">钱包地址</span>
                <span className="text-gray-300 font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-300">网络:</span>
                <span className="text-green-400">
                  {currentChainId ? getChainName(currentChainId) : "Unknown"}
                </span>
              </div>
            </div>
            <button
              onClick={() => onStartPayment()}
              className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              开始支付
            </button>
            <button
              onClick={() => disconnect()}
              className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              断开连接
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
