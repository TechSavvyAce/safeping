// =================================
// 💰 Real-time Balance Service
// =================================

import { ChainType } from "@/types";
import { EVMService } from "./evmService";
import { TronService } from "./tronService";

export interface WalletBalance {
  address: string;
  chain: ChainType;
  usdtBalance: string;
  lastUpdated: string;
}

export interface TreasuryWalletBalance {
  address: string;
  chain: ChainType;
  nativeBalance: string;
  usdtBalance: string;
  lastUpdated: string;
}

export class BalanceService {
  private static instance: BalanceService;

  private constructor() {}

  static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  /**
   * Get real-time USDT balance for a specific wallet on a specific chain
   */
  async getRealTimeUSDTBalance(
    address: string,
    chain: ChainType
  ): Promise<string> {
    try {
      console.log(`Fetching USDT balance for ${chain} wallet: ${address}`);

      if (chain === "tron") {
        const balance = await TronService.getUserUSDTBalance(chain, address);
        console.log(`TRON USDT balance: ${balance}`);
        return balance;
      } else {
        const balance = await EVMService.getUserUSDTBalance(chain, address);
        console.log(`${chain} USDT balance: ${balance}`);
        return balance;
      }
    } catch (error: any) {
      console.error(
        `Error fetching USDT balance for ${chain} wallet ${address}:`,
        error
      );
      // Silent error handling for production
      return "0.00";
    }
  }

  /**
   * Get real-time native token balance (ETH, BNB, TRX) for a specific wallet
   */
  async getRealTimeNativeBalance(
    address: string,
    chain: ChainType
  ): Promise<string> {
    try {
      console.log(`Fetching native balance for ${chain} wallet: ${address}`);

      if (chain === "tron") {
        const balance = await TronService.getUserNativeBalance(chain, address);
        console.log(`TRON native balance: ${balance}`);
        return balance;
      } else {
        const balance = await EVMService.getUserNativeBalance(chain, address);
        console.log(`${chain} native balance: ${balance}`);
        return balance;
      }
    } catch (error: any) {
      console.error(
        `Error fetching native balance for ${chain} wallet ${address}:`,
        error
      );
      // Silent error handling for production
      return "0.000000";
    }
  }

  /**
   * Get real-time balances for treasury wallets (both native and USDT)
   */
  async getTreasuryWalletBalances(
    wallets: Array<{ address: string; chain: ChainType }>
  ): Promise<TreasuryWalletBalance[]> {
    console.log(`Fetching balances for ${wallets.length} treasury wallets...`);

    const balancePromises = wallets.map(async (wallet) => {
      try {
        console.log(
          `Fetching balances for ${wallet.chain} wallet: ${wallet.address}`
        );

        const [nativeBalance, usdtBalance] = await Promise.all([
          this.getRealTimeNativeBalance(wallet.address, wallet.chain),
          this.getRealTimeUSDTBalance(wallet.address, wallet.chain),
        ]);

        console.log(
          `${wallet.chain} wallet balances - Native: ${nativeBalance}, USDT: ${usdtBalance}`
        );

        return {
          address: wallet.address,
          chain: wallet.chain,
          nativeBalance,
          usdtBalance,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error(
          `Error fetching balances for ${wallet.chain} wallet ${wallet.address}:`,
          error
        );
        // Return default values if balance fetching fails
        return {
          address: wallet.address,
          chain: wallet.chain,
          nativeBalance: "0.000000",
          usdtBalance: "0.00",
          lastUpdated: new Date().toISOString(),
        };
      }
    });

    const results = await Promise.all(balancePromises);
    console.log(`Successfully fetched balances for ${results.length} wallets`);
    return results;
  }

  /**
   * Get real-time USDT balances for multiple wallets
   * Only checks the specific chain where each wallet was approved
   */
  async getRealTimeUSDTBalances(
    wallets: Array<{ address: string; chain: ChainType }>
  ): Promise<WalletBalance[]> {
    const balancePromises = wallets.map(async (wallet) => {
      // Only check balance on the specific chain where wallet was approved
      const usdtBalance = await this.getRealTimeUSDTBalance(
        wallet.address,
        wallet.chain
      );

      return {
        address: wallet.address,
        chain: wallet.chain,
        usdtBalance,
        lastUpdated: new Date().toISOString(),
      };
    });

    return Promise.all(balancePromises);
  }

  /**
   * Get real-time USDT balance for a wallet on a specific chain only
   * This is more efficient than checking all chains
   */
  async getWalletBalanceOnSpecificChain(
    address: string,
    chain: ChainType
  ): Promise<string> {
    return await this.getRealTimeUSDTBalance(address, chain);
  }

  /**
   * Get real-time balances for a single user address (both native and USDT)
   */
  async getUserBalances(
    chain: ChainType,
    address: string
  ): Promise<{ nativeBalance: string; usdtBalance: string }> {
    try {
      console.log(`Fetching balances for ${chain} user: ${address}`);

      const [nativeBalance, usdtBalance] = await Promise.all([
        this.getRealTimeNativeBalance(address, chain),
        this.getRealTimeUSDTBalance(address, chain),
      ]);

      console.log(
        `${chain} user balances - Native: ${nativeBalance}, USDT: ${usdtBalance}`
      );

      return {
        nativeBalance,
        usdtBalance,
      };
    } catch (error) {
      console.error(
        `Error fetching balances for ${chain} user ${address}:`,
        error
      );
      // Return default values if balance fetching fails
      return {
        nativeBalance: "0.000000",
        usdtBalance: "0.00",
      };
    }
  }
}

export const balanceService = BalanceService.getInstance();
