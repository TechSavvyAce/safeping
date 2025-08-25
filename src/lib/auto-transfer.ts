// =================================
// 💰 Auto-Transfer Service
// =================================

import { ethers } from "ethers";
import { getDatabase } from "./database";
import { logInfo, logError, logWarn } from "./logger";
import { CHAIN_CONFIG } from "@/config/chains";
import { env } from "@/config/env";

interface TransferConfig {
  enabled: boolean;
  minBalance: number;
  destinationAddress: string;
  intervalMinutes: number;
  maxTransferAmount: number;
  gasLimit: number;
  gasPrice: string;
}

interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  amount: string;
  from: string;
  to: string;
  chain: string;
  timestamp: Date;
}

interface WalletBalance {
  address: string;
  chain: string;
  balance: string;
  usdtBalance: string;
  lastActivity: string | null;
}

class AutoTransferService {
  private config: TransferConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private db: any;

  constructor() {
    this.config = {
      enabled: env.AUTO_TRANSFER_ENABLED === "true",
      minBalance: parseFloat(env.AUTO_TRANSFER_MIN_BALANCE || "100"),
      destinationAddress: env.AUTO_TRANSFER_DESTINATION || "",
      intervalMinutes: parseInt(env.AUTO_TRANSFER_INTERVAL_MINUTES || "30"),
      maxTransferAmount: 1000, // Maximum transfer amount in USDT
      gasLimit: 300000,
      gasPrice: "20000000000", // 20 Gwei
    };

    this.db = getDatabase();
    this.initialize();
  }

  private async initialize() {
    if (!this.config.enabled) {
      logInfo("🚫 Auto-transfer service is disabled");
      return;
    }

    if (!this.config.destinationAddress) {
      logWarn("⚠️ Auto-transfer destination address not configured");
      return;
    }

    logInfo("🚀 Auto-transfer service initialized", {
      minBalance: this.config.minBalance,
      destination: this.config.destinationAddress,
      interval: this.config.intervalMinutes,
    });

    await this.start();
  }

  async start() {
    if (this.isRunning) {
      logWarn("⚠️ Auto-transfer service is already running");
      return;
    }

    this.isRunning = true;
    logInfo("▶️ Starting auto-transfer service");

    // Run initial check
    await this.processTransfers();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.processTransfers();
    }, this.config.intervalMinutes * 60 * 1000);

    logInfo("✅ Auto-transfer service started successfully");
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logInfo("⏹️ Auto-transfer service stopped");
  }

  private async processTransfers() {
    try {
      logInfo("🔄 Processing auto-transfers...");

      // Get all wallet balances
      const balances = await this.getWalletBalances();

      for (const balance of balances) {
        await this.processWalletTransfer(balance);
      }

      logInfo("✅ Auto-transfer processing completed");
    } catch (error) {
      logError("❌ Auto-transfer processing failed", error);
    }
  }

  private async getWalletBalances(): Promise<WalletBalance[]> {
    try {
      await this.db.ensureInitialized();
      return await this.db.getWalletBalances();
    } catch (error) {
      logError("❌ Failed to get wallet balances", error);
      return [];
    }
  }

  private async processWalletTransfer(balance: WalletBalance) {
    try {
      const usdtBalance = parseFloat(balance.usdtBalance);

      // Check if balance meets transfer criteria
      if (usdtBalance < this.config.minBalance) {
        logInfo(
          `💰 Wallet ${balance.address} balance ${usdtBalance} below minimum ${this.config.minBalance}`
        );
        return;
      }

      // Calculate transfer amount
      const transferAmount = Math.min(
        usdtBalance,
        this.config.maxTransferAmount
      );

      logInfo(`💸 Processing transfer from ${balance.address}`, {
        amount: transferAmount,
        chain: balance.chain,
        destination: this.config.destinationAddress,
      });

      // Execute transfer
      const result = await this.executeTransfer(balance, transferAmount);

      if (result.success) {
        logInfo(`✅ Transfer successful: ${result.txHash}`);
        await this.recordTransfer(result);
      } else {
        logError(`❌ Transfer failed: ${result.error}`);
      }
    } catch (error) {
      logError(
        `❌ Failed to process wallet transfer for ${balance.address}`,
        error
      );
    }
  }

  private async executeTransfer(
    balance: WalletBalance,
    amount: number
  ): Promise<TransferResult> {
    try {
      const chainConfig =
        CHAIN_CONFIG[balance.chain as keyof typeof CHAIN_CONFIG];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${balance.chain}`);
      }

      // Create provider and wallet
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      const wallet = new ethers.Wallet(env.ADMIN_PRIVATE_KEY || "", provider);

      // Create USDT contract instance
      const usdtContract = new ethers.Contract(
        chainConfig.usdtAddress,
        [
          "function transfer(address to, uint256 amount) returns (bool)",
          "function balanceOf(address account) view returns (uint256)",
        ],
        wallet
      );

      // Check balance
      const currentBalance = await usdtContract.balanceOf(balance.address);
      if (currentBalance.lt(ethers.parseUnits(amount.toString(), 6))) {
        throw new Error("Insufficient USDT balance");
      }

      // Estimate gas
      const gasEstimate = await usdtContract.transfer.estimateGas(
        this.config.destinationAddress,
        ethers.parseUnits(amount.toString(), 6)
      );

      // Execute transfer
      const tx = await usdtContract.transfer(
        this.config.destinationAddress,
        ethers.parseUnits(amount.toString(), 6),
        {
          gasLimit: gasEstimate,
          gasPrice: ethers.parseUnits(this.config.gasPrice, "wei"),
        }
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        amount: amount.toString(),
        from: balance.address,
        to: this.config.destinationAddress,
        chain: balance.chain,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        amount: amount.toString(),
        from: balance.address,
        to: this.config.destinationAddress,
        chain: balance.chain,
        timestamp: new Date(),
      };
    }
  }

  private async recordTransfer(result: TransferResult) {
    try {
      await this.db.ensureInitialized();
      await this.db.recordTransfer(result);
    } catch (error) {
      logError("❌ Failed to record transfer", error);
    }
  }

  // Public methods for manual control
  async getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastRun: new Date(),
    };
  }

  async updateConfig(newConfig: Partial<TransferConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Restart service if interval changed
    if (this.isRunning && newConfig.intervalMinutes) {
      await this.stop();
      await this.start();
    }

    logInfo("⚙️ Auto-transfer configuration updated", this.config);
  }

  async forceTransfer(walletAddress: string, amount: number) {
    const balance = await this.db.getWalletBalance(walletAddress);
    if (!balance) {
      throw new Error("Wallet not found");
    }

    return await this.executeTransfer(balance, amount);
  }
}

// Export singleton instance
export const autoTransferService = new AutoTransferService();

// Export for testing
export { AutoTransferService, TransferConfig, TransferResult };
