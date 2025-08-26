// =================================
// 💰 Auto-Transfer Service
// =================================

import { ethers } from "ethers";
import { getDatabase } from "./database";
import { logInfo, logError, logWarn } from "./logger";
import { CHAIN_CONFIG } from "@/config/chains";
import { ChainType } from "@/types";

interface TransferConfig {
  destinationAddresses: Record<ChainType, string>;
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
      destinationAddresses: {
        bsc: "",
        ethereum: "",
        tron: "",
      },
    };

    this.db = getDatabase();
    this.initialize();
  }

  private async initialize() {
    // Load chain-specific destination addresses from database
    await this.loadDestinationAddresses();

    // Check if all chains have destination addresses configured
    const missingChains = Object.entries(this.config.destinationAddresses)
      .filter(([_, address]) => !address)
      .map(([chain]) => chain);

    if (missingChains.length > 0) {
      logWarn(
        `⚠️ Auto-transfer destination addresses not configured for chains: ${missingChains.join(
          ", "
        )}`
      );
      return;
    }

    logInfo("🚀 Auto-transfer service initialized", {
      destinations: this.config.destinationAddresses,
    });

    await this.start();
  }

  private async loadDestinationAddresses() {
    try {
      await this.db.ensureInitialized();
      const configs = await this.db.getAutoTransferConfig();

      // Load chain-specific destination addresses
      this.config.destinationAddresses.bsc =
        configs.destination_address_bsc || "";
      this.config.destinationAddresses.ethereum =
        configs.destination_address_ethereum || "";
      this.config.destinationAddresses.tron =
        configs.destination_address_tron || "";

      logInfo(
        "📋 Loaded auto-transfer destination addresses",
        this.config.destinationAddresses
      );
    } catch (error) {
      logError("❌ Failed to load destination addresses", error);
    }
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

    // Set up interval - use fixed 30 minute interval
    this.intervalId = setInterval(async () => {
      await this.processTransfers();
    }, 30 * 60 * 1000);

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

      // Check if balance is greater than 0
      if (usdtBalance <= 0) {
        logInfo(`💰 Wallet ${balance.address} has no USDT balance`);
        return;
      }

      // Get destination address for this chain
      const destinationAddress =
        this.config.destinationAddresses[balance.chain as ChainType];
      if (!destinationAddress) {
        logWarn(
          `⚠️ No destination address configured for chain: ${balance.chain}`
        );
        return;
      }

      // Transfer all available balance
      const transferAmount = usdtBalance;

      logInfo(`💸 Processing transfer from ${balance.address}`, {
        amount: transferAmount,
        chain: balance.chain,
        destination: destinationAddress,
      });

      // Execute transfer
      const result = await this.executeTransfer(
        balance,
        transferAmount,
        destinationAddress
      );

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
    amount: number,
    destinationAddress: string
  ): Promise<TransferResult> {
    try {
      const chainConfig =
        CHAIN_CONFIG[balance.chain as keyof typeof CHAIN_CONFIG];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${balance.chain}`);
      }

      // Create provider and wallet
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const wallet = new ethers.Wallet(
        process.env.ADMIN_PRIVATE_KEY || "",
        provider
      );

      // Create USDT contract instance
      const usdtContract = new ethers.Contract(
        chainConfig.usdt,
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
        destinationAddress,
        ethers.parseUnits(amount.toString(), 6)
      );

      // Execute transfer
      const tx = await usdtContract.transfer(
        destinationAddress,
        ethers.parseUnits(amount.toString(), 6),
        {
          gasLimit: gasEstimate,
          gasPrice: ethers.parseUnits("20000000000", "wei"), // 20 Gwei default
        }
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        amount: amount.toString(),
        from: balance.address,
        to: destinationAddress,
        chain: balance.chain,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        amount: amount.toString(),
        from: balance.address,
        to: destinationAddress,
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

    // Save chain-specific destination addresses to database
    if (newConfig.destinationAddresses) {
      await this.saveDestinationAddresses();
    }

    logInfo("⚙️ Auto-transfer configuration updated", this.config);
  }

  private async saveDestinationAddresses() {
    try {
      await this.db.ensureInitialized();

      // Save each chain's destination address
      for (const [chain, address] of Object.entries(
        this.config.destinationAddresses
      )) {
        await this.db.updateAutoTransferConfig(
          `destination_address_${chain}`,
          address
        );
      }

      logInfo("💾 Saved destination addresses to database");
    } catch (error) {
      logError("❌ Failed to save destination addresses", error);
    }
  }

  async forceTransfer(walletAddress: string, amount: number, chain: ChainType) {
    const balance = await this.db.getWalletBalance(walletAddress);
    if (!balance) {
      throw new Error("Wallet not found");
    }

    const destinationAddress = this.config.destinationAddresses[chain];
    if (!destinationAddress) {
      throw new Error(`No destination address configured for chain: ${chain}`);
    }

    return await this.executeTransfer(balance, amount, destinationAddress);
  }

  // Method to refresh destination addresses from database
  async refreshDestinationAddresses() {
    await this.loadDestinationAddresses();
    return this.config.destinationAddresses;
  }
}

// Export singleton instance
export const autoTransferService = new AutoTransferService();

// Export for testing - use 'export type' for type exports
export { AutoTransferService };
export type { TransferConfig, TransferResult };
