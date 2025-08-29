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
      if (chain === "tron") {
        return await TronService.getUserUSDTBalance(chain, address);
      } else {
        return await EVMService.getUserUSDTBalance(chain, address);
      }
    } catch (error) {
      console.error(
        `Failed to get USDT balance for ${address} on ${chain}:`,
        error
      );
      return "0.00";
    }
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
}

export const balanceService = BalanceService.getInstance();
