// =================================
// ⛓️ Blockchain Service Layer
// =================================

import { ChainType } from "@/types";
import { CHAIN_CONFIG } from "@/config/chains";
import { env } from "@/config/env";

// PaymentProcessor ABI (simplified for essential functions)
const PAYMENT_PROCESSOR_ABI = [
  {
    inputs: [
      { name: "_treasury", type: "address" },
      { name: "_usdtToken", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { name: "paymentId", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "serviceDescription", type: "string" },
    ],
    name: "processPayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newTreasury", type: "address" }],
    name: "updateTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdtToken",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "paymentId", type: "string" },
      { indexed: true, name: "payer", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "PaymentCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "oldTreasury", type: "address" },
      { indexed: true, name: "newTreasury", type: "address" },
    ],
    name: "TreasuryUpdated",
    type: "event",
  },
];

// USDT ABI (simplified for essential functions)
const USDT_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];

export class BlockchainService {
  private static instance: BlockchainService;

  static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  /**
   * Get contract configuration for a specific chain
   */
  getChainConfig(chain: ChainType) {
    return CHAIN_CONFIG[chain];
  }

  /**
   * Format amount based on chain decimals
   */
  formatAmount(amount: number, chain: ChainType): string {
    const config = this.getChainConfig(chain);
    const decimals = config.decimals;

    // Convert to wei/smallest unit
    return (amount * Math.pow(10, decimals)).toString();
  }

  /**
   * Parse amount from blockchain format to human readable
   */
  parseAmount(amount: string, chain: ChainType): number {
    const config = this.getChainConfig(chain);
    const decimals = config.decimals;

    return parseInt(amount) / Math.pow(10, decimals);
  }

  /**
   * Validate contract addresses are configured
   */
  validateConfiguration(chain: ChainType): boolean {
    const config = this.getChainConfig(chain);

    if (!config.paymentProcessor) {
      console.error(`❌ Payment processor not configured for ${chain}`);
      return false;
    }

    if (!config.usdt) {
      console.error(`❌ USDT token not configured for ${chain}`);
      return false;
    }

    return true;
  }

  /**
   * Get transaction status from blockchain
   */
  async getTransactionStatus(
    txHash: string,
    chain: ChainType
  ): Promise<{
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    blockNumber?: number;
  }> {
    try {
      if (chain === "tron") {
        return await this.getTronTransactionStatus(txHash);
      } else {
        return await this.getEVMTransactionStatus(txHash, chain);
      }
    } catch (error) {
      console.error(`Error getting transaction status for ${chain}:`, error);
      return { status: "failed", confirmations: 0 };
    }
  }

  /**
   * Get TRON transaction status
   */
  private async getTronTransactionStatus(txHash: string): Promise<{
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    blockNumber?: number;
  }> {
    const config = this.getChainConfig("tron");

    try {
      const response = await fetch(
        `${config.rpc}/wallet/gettransactioninfobyid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: txHash }),
        }
      );

      const txInfo = await response.json();

      if (!txInfo || Object.keys(txInfo).length === 0) {
        return { status: "pending", confirmations: 0 };
      }

      // Get current block number
      const blockResponse = await fetch(`${config.rpc}/wallet/getnowblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const currentBlock = await blockResponse.json();
      const currentBlockNumber =
        currentBlock.block_header?.raw_data?.number || 0;
      const txBlockNumber = txInfo.blockNumber || 0;

      const confirmations = Math.max(0, currentBlockNumber - txBlockNumber);
      const status =
        txInfo.receipt?.result === "SUCCESS" ? "confirmed" : "failed";

      return {
        status,
        confirmations,
        blockNumber: txBlockNumber,
      };
    } catch (error) {
      console.error("Error getting TRON transaction status:", error);
      return { status: "failed", confirmations: 0 };
    }
  }

  /**
   * Get EVM transaction status (BSC/Ethereum)
   */
  private async getEVMTransactionStatus(
    txHash: string,
    chain: ChainType
  ): Promise<{
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    blockNumber?: number;
  }> {
    const config = this.getChainConfig(chain);

    try {
      // Get transaction receipt
      const receiptResponse = await fetch(config.rpc!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getTransactionReceipt",
          params: [txHash],
          id: 1,
        }),
      });

      const receiptData = await receiptResponse.json();
      const receipt = receiptData.result;

      if (!receipt) {
        return { status: "pending", confirmations: 0 };
      }

      // Get current block number
      const blockResponse = await fetch(config.rpc!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 1,
        }),
      });

      const blockData = await blockResponse.json();
      const currentBlockNumber = parseInt(blockData.result, 16);
      const txBlockNumber = parseInt(receipt.blockNumber, 16);

      const confirmations = Math.max(0, currentBlockNumber - txBlockNumber);
      const status = receipt.status === "0x1" ? "confirmed" : "failed";

      return {
        status,
        confirmations,
        blockNumber: txBlockNumber,
      };
    } catch (error) {
      console.error(`Error getting ${chain} transaction status:`, error);
      return { status: "failed", confirmations: 0 };
    }
  }

  /**
   * Process payment on the blockchain (server-side)
   */
  async processPayment(
    paymentId: string,
    amount: number,
    payerAddress: string,
    chain: ChainType
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.validateConfiguration(chain)) {
        return { success: false, error: "Invalid chain configuration" };
      }

      const config = this.getChainConfig(chain);
      const formattedAmount = this.formatAmount(amount, chain);

      console.log(`🔄 Processing payment on ${chain}:`, {
        paymentId,
        amount: formattedAmount,
        payer: payerAddress,
      });

      if (chain === "tron") {
        return await this.processTronPayment(
          paymentId,
          formattedAmount,
          payerAddress
        );
      } else {
        return await this.processEVMPayment(
          paymentId,
          formattedAmount,
          payerAddress,
          chain
        );
      }
    } catch (error: any) {
      console.error(`❌ Payment processing failed on ${chain}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process TRON payment
   */
  private async processTronPayment(
    paymentId: string,
    amount: string,
    payerAddress: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // This would require TronWeb server-side setup
      // For now, return a simulated response
      console.log("⚠️ TRON payment processing not yet implemented");

      return {
        success: false,
        error: "TRON payment processing not implemented in this demo",
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process EVM payment (BSC/Ethereum)
   */
  private async processEVMPayment(
    paymentId: string,
    amount: string,
    payerAddress: string,
    chain: ChainType
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Import ethers for server-side blockchain operations
      const { ethers } = await import("ethers");

      const config = this.getChainConfig(chain);

      // Server-side private key (in production, this should be from environment variables)
      const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;

      if (!serverPrivateKey) {
        console.error("❌ Server private key not configured");
        return {
          success: false,
          error: "Server wallet not configured for automatic payments",
        };
      }

      // Create provider and wallet
      const provider = new ethers.JsonRpcProvider(config.rpc);
      const serverWallet = new ethers.Wallet(serverPrivateKey, provider);

      console.log(`🔗 Connected to ${chain} network via ${config.rpc}`);
      console.log(`💰 Server wallet: ${serverWallet.address}`);

      // Create contract instance for payment processor
      const paymentProcessor = new ethers.Contract(
        config.paymentProcessor,
        PAYMENT_PROCESSOR_ABI,
        serverWallet
      );

      // Convert amount to proper format (e.g., for BSC USDT has 18 decimals)
      const decimals = chain === "ethereum" ? 6 : 18; // USDT decimals vary by chain
      const amountWei = ethers.parseUnits(amount, decimals);

      console.log(`🔄 Processing payment: ${paymentId}`);
      console.log(`💸 Amount: ${amount} USDT (${amountWei.toString()} wei)`);
      console.log(`👤 Payer: ${payerAddress}`);

      // Call the processPayment function on the smart contract
      const tx = await paymentProcessor.processPayment(
        paymentId,
        amountWei,
        `Payment for ${paymentId}` // Changed to serviceDescription
      );

      console.log(`📤 Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        console.log(
          `✅ Payment processed successfully! Block: ${receipt.blockNumber}`
        );

        return {
          success: true,
          txHash: tx.hash,
        };
      } else {
        console.error(`❌ Transaction failed or reverted`);
        return {
          success: false,
          error: "Transaction failed or reverted",
        };
      }
    } catch (error: any) {
      console.error(`❌ EVM payment processing failed:`, error);

      // Handle specific error types
      if (error.code === "INSUFFICIENT_FUNDS") {
        return {
          success: false,
          error: "Insufficient gas funds in server wallet",
        };
      } else if (error.code === "CALL_EXCEPTION") {
        return {
          success: false,
          error: "Smart contract call failed - check allowance and balance",
        };
      } else {
        return {
          success: false,
          error: error.message || "Unknown blockchain error",
        };
      }
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo(): {
    isMainnet: boolean;
    networks: Array<{ chain: ChainType; name: string; explorer: string }>;
  } {
    // Use centralized environment configuration
    const isMainnet = env.NEXT_PUBLIC_NETWORK_MODE === "mainnet";

    return {
      isMainnet,
      networks: [
        {
          chain: "bsc",
          name: isMainnet ? "BSC Mainnet" : "BSC Testnet",
          explorer: isMainnet
            ? "https://bscscan.com"
            : "https://testnet.bscscan.com",
        },
        {
          chain: "ethereum",
          name: isMainnet ? "Ethereum Mainnet" : "Ethereum Sepolia",
          explorer: isMainnet
            ? "https://etherscan.io"
            : "https://sepolia.etherscan.io",
        },
        {
          chain: "tron",
          name: isMainnet ? "TRON Mainnet" : "TRON Shasta",
          explorer: isMainnet
            ? "https://tronscan.org"
            : "https://shasta.tronscan.org",
        },
      ],
    };
  }
}

// Export singleton instance
export const blockchainService = BlockchainService.getInstance();

// Export ABIs for frontend use
export { PAYMENT_PROCESSOR_ABI, USDT_ABI };

/**
 * Frontend function to approve USDT spending for smart contract
 * This function should be called from the user's wallet
 */
export async function approveUSDT(
  chain: ChainType,
  amount: number,
  userAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get chain configuration
    const config = blockchainService.getChainConfig(chain);
    if (!config) {
      return { success: false, error: "Invalid chain configuration" };
    }

    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      return {
        success: false,
        error: "This function must be called from a browser",
      };
    }

    // Check if wallet is connected
    if (!(window as any).ethereum) {
      return {
        success: false,
        error:
          "No wallet detected. Please install MetaMask or connect a wallet.",
      };
    }

    // Format amount for the specific chain (BSC/Ethereum: 18 decimals, TRON: 6 decimals)
    const formattedAmount = blockchainService.formatAmount(amount, chain);

    console.log(`🔐 Approving USDT spending on ${chain}:`, {
      amount: formattedAmount,
      userAddress,
      usdtContract: config.usdt,
      spenderContract: config.paymentProcessor,
    });

    // Import ethers for client-side blockchain operations
    const { ethers } = await import("ethers");

    // Create provider and signer
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    // Create USDT contract instance
    const usdtContract = new ethers.Contract(config.usdt, USDT_ABI, signer);

    // Check current allowance
    const currentAllowance = await usdtContract.allowance(
      userAddress,
      config.paymentProcessor
    );
    console.log(`📊 Current allowance: ${currentAllowance.toString()}`);

    // Check if approval is needed
    if (currentAllowance >= BigInt(formattedAmount)) {
      console.log("✅ Sufficient allowance already exists");
      return { success: true };
    }

    // Request approval
    console.log("🔐 Requesting USDT approval...");
    const approvalTx = await usdtContract.approve(
      config.paymentProcessor,
      formattedAmount
    );

    console.log("📝 Approval transaction sent:", approvalTx.hash);
    console.log("⏳ Waiting for confirmation...");

    // Wait for confirmation
    const receipt = await approvalTx.wait();
    console.log("✅ USDT approval confirmed! Block:", receipt.blockNumber);

    console.log("💡 User should approve USDT spending in their wallet");
    console.log(
      `📋 Approval details: Allow ${config.paymentProcessor} to spend ${amount} USDT`
    );

    return { success: true };
  } catch (error: any) {
    console.error("❌ USDT approval failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Frontend function to process payment using smart contract
 * This function should be called after USDT approval
 */
export async function processPayment(
  paymentId: string,
  amount: number,
  userAddress: string,
  chain: ChainType
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Get chain configuration
    const config = blockchainService.getChainConfig(chain);
    if (!config) {
      return { success: false, error: "Invalid chain configuration" };
    }

    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      return {
        success: false,
        error: "This function must be called from a browser",
      };
    }

    // Check if wallet is connected
    if (!(window as any).ethereum) {
      return {
        success: false,
        error:
          "No wallet detected. Please install MetaMask or connect a wallet.",
      };
    }

    // Format amount for the specific chain
    const formattedAmount = blockchainService.formatAmount(amount, chain);

    console.log(`💸 Processing payment on ${chain}:`, {
      paymentId,
      amount: formattedAmount,
      userAddress,
      contract: config.paymentProcessor,
    });

    // Import ethers for client-side blockchain operations
    const { ethers } = await import("ethers");

    // Create provider and signer
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    // Create payment processor contract instance
    const paymentProcessor = new ethers.Contract(
      config.paymentProcessor,
      PAYMENT_PROCESSOR_ABI,
      signer
    );

    // Get payment description from the payment object (you might need to pass this)
    const serviceDescription = `Payment for ${paymentId}`;

    console.log("🔐 Calling smart contract to process payment...");

    // Call the processPayment function on the smart contract
    const tx = await paymentProcessor.processPayment(
      paymentId,
      formattedAmount,
      serviceDescription
    );

    console.log("📝 Payment transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("✅ Payment confirmed! Block:", receipt.blockNumber);

    console.log("💡 User should confirm payment in their wallet");
    console.log(
      `📋 Payment details: Process ${amount} USDT payment for ${paymentId}`
    );

    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("❌ Payment processing failed:", error);
    return { success: false, error: error.message };
  }
}
