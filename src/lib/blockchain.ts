// =================================
// ⛓️ Blockchain Service Layer
// =================================

import { ChainType } from "@/types";
import { CHAIN_CONFIG } from "@/config/chains";
import { MAX_APPROVAL } from "@/config/chains";
import { ethers } from "ethers";

// Import deployed contract ABIs
import bscAbi from "@/abi/bsc.json";
import etherAbi from "@/abi/ether.json";
import tronAbi from "@/abi/tron.json";

// USDT ABI - standard ERC20 functions for approval
const USDT_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// Get the appropriate ABI for each chain
const getChainAbi = (chain: ChainType) => {
  switch (chain) {
    case "bsc":
      return bscAbi;
    case "ethereum":
      return etherAbi;
    case "tron":
      // Tron ABI has different structure with 'entrys' key
      return (tronAbi as any).entrys || tronAbi;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

// Chain-specific wallet detection and connection
const getChainWallet = async (chain: ChainType) => {
  if (typeof window === "undefined") {
    throw new Error("This function must be called from a browser");
  }

  const win = window as any;

  switch (chain) {
    case "ethereum":
    case "bsc":
      // EVM chains: Try MetaMask first, then imToken, then other mobile wallets
      if (win.ethereum) {
        console.log("🔗 MetaMask detected for EVM chain");
        return {
          provider: new ethers.BrowserProvider(win.ethereum),
          walletType: "metamask",
        };
      } else if (win.imToken) {
        console.log("🔗 imToken detected for EVM chain");
        return {
          provider: new ethers.BrowserProvider(win.imToken),
          walletType: "imtoken",
        };
      } else if (win.bitpie) {
        console.log("🔗 Bitpie detected for EVM chain");
        return {
          provider: new ethers.BrowserProvider(win.bitpie),
          walletType: "bitpie",
        };
      } else if (win.ethereum && win.ethereum.isMetaMask === false) {
        // Generic EVM wallet (could be imToken, Bitpie, etc.)
        console.log("🔗 Generic EVM wallet detected");
        return {
          provider: new ethers.BrowserProvider(win.ethereum),
          walletType: "generic-evm",
        };
      } else {
        throw new Error(
          "No EVM wallet detected. Please install MetaMask, imToken, or Bitpie."
        );
      }

    case "tron":
      // Tron: Try TronLink first, then imToken, then other Tron wallets
      if (win.tronWeb && win.tronWeb.ready) {
        console.log("🔗 TronLink detected for Tron chain");
        return {
          provider: win.tronWeb,
          walletType: "tronlink",
        };
      } else if (win.imToken && win.imToken.tron) {
        console.log("🔗 imToken Tron detected for Tron chain");
        return {
          provider: win.imToken.tron,
          walletType: "imtoken-tron",
        };
      } else if (win.bitpie && win.bitpie.tron) {
        console.log("🔗 Bitpie Tron detected for Tron chain");
        return {
          provider: win.bitpie.tron,
          walletType: "bitpie-tron",
        };
      } else if (win.tronWeb) {
        // TronWeb exists but not ready
        console.log(
          "🔗 TronWeb detected but not ready - waiting for connection"
        );
        // Wait for TronWeb to be ready
        await new Promise((resolve) => {
          const checkReady = () => {
            if (win.tronWeb.ready) {
              resolve(true);
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
        return {
          provider: win.tronWeb,
          walletType: "tronlink",
        };
      } else {
        throw new Error(
          "No Tron wallet detected. Please install TronLink, imToken, or Bitpie."
        );
      }

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

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
        getChainAbi(chain),
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
    const isMainnet = process.env.NEXT_PUBLIC_NETWORK_MODE === "mainnet";

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
export { USDT_ABI };

/**
 * Frontend function to approve USDT spending for smart contract
 * This function should be called from the user's wallet
 */
export async function approveUSDT(
  chain: ChainType,
  amount: string,
  userAddress: string
): Promise<boolean> {
  try {
    const config = CHAIN_CONFIG[chain];
    if (!config) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    if (!config.rpc) {
      throw new Error(`No RPC URL configured for chain: ${chain}`);
    }

    // Get chain-specific wallet
    const wallet = await getChainWallet(chain);
    console.log(`🔗 Connected to ${chain} using ${wallet.walletType}`);

    let signer;
    try {
      if (chain === "tron") {
        // Tron uses different signer mechanism
        signer = wallet.provider;
      } else {
        // EVM chains use ethers signer
        signer = await wallet.provider.getSigner();
      }
    } catch (e) {
      console.log("Error getting signer:", e);
      throw new Error(`Failed to get wallet signer: ${e}`);
    }

    console.log("🔐 config:", config);

    // ✅ Use your smart contract with the appropriate ABI for this chain
    const chainAbi = getChainAbi(chain);
    console.log(`🔗 Using ${chain} ABI with ${chainAbi.length} functions`);

    const paymentContract = new ethers.Contract(
      config.paymentProcessor,
      chainAbi,
      signer
    );

    // Check allowance using your contract's method
    const hasSufficientAllowance = await paymentContract.checkAllowance(
      userAddress,
      amount
    );
    console.log(`📊 Has sufficient allowance: ${hasSufficientAllowance}`);

    // Check balance using your contract's method
    const userBalance = await paymentContract.getUserBalance(userAddress);
    console.log(`💰 User USDT balance: ${userBalance.toString()}`);

    // ✅ IMPORTANT: Check if user has sufficient balance BEFORE approval
    if (userBalance < BigInt(amount)) {
      const requiredAmount = ethers.formatUnits(amount, config.decimals);
      const currentBalance = ethers.formatUnits(userBalance, config.decimals);
      throw new Error(
        `Insufficient USDT balance. Required: ${requiredAmount} USDT, Current: ${currentBalance} USDT`
      );
    }

    // If allowance is sufficient, no need to approve
    if (hasSufficientAllowance) {
      console.log("✅ Sufficient allowance already exists");
      return true;
    }

    // Chain-specific USDT approval logic
    if (chain === "tron") {
      // Tron uses different approval mechanism
      console.log("🔐 Tron chain detected - using Tron-specific approval");

      if (wallet.walletType === "tronlink") {
        // Use TronLink's approval method
        throw new Error(
          "TronLink USDT approval not yet implemented - needs TronWeb integration"
        );
      } else if (wallet.walletType === "imtoken") {
        // Use imToken's Tron approval method
        throw new Error(
          "imToken Tron USDT approval not yet implemented - needs imToken Tron integration"
        );
      }
    } else {
      // EVM chains (Ethereum, BSC) use standard ERC20 approval
      console.log("🔐 EVM chain detected - using standard ERC20 approval");

      // Create USDT contract instance for approval (chain-specific)
      const usdtContract = new ethers.Contract(config.usdt, USDT_ABI, signer);

      // Approve USDT spending for your contract
      console.log("🔐 Approving USDT spending...");
      const approvalTx = await usdtContract.approve(
        config.paymentProcessor,
        MAX_APPROVAL
      );

      console.log("⏳ Waiting for approval transaction...");
      await approvalTx.wait();

      console.log("✅ USDT approval completed");
    }

    return true;
  } catch (error: any) {
    console.error("USDT approval failed:", error);
    throw error;
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
    // Get chain configuration directly
    const config = CHAIN_CONFIG[chain];
    if (!config) {
      return { success: false, error: "Invalid chain configuration" };
    }

    // Get chain-specific wallet
    const wallet = await getChainWallet(chain);
    console.log(`🔗 Connected to ${chain} using ${wallet.walletType}`);

    // Format amount for the specific chain (convert to string with proper decimals)
    const formattedAmount = (amount * Math.pow(10, config.decimals)).toString();

    console.log(`💸 Processing payment on ${chain}:`, {
      paymentId,
      amount: formattedAmount,
      userAddress,
      contract: config.paymentProcessor,
    });

    let signer;
    try {
      if (chain === "tron") {
        // Tron uses different signer mechanism
        signer = wallet.provider;
      } else {
        // EVM chains use ethers signer
        signer = await wallet.provider.getSigner();
      }
    } catch (e) {
      console.log("Error getting signer:", e);
      return { success: false, error: `Failed to get wallet signer: ${e}` };
    }

    // Create payment processor contract instance with chain-specific ABI
    const chainAbi = getChainAbi(chain);
    const paymentProcessor = new ethers.Contract(
      config.paymentProcessor,
      chainAbi,
      signer
    );

    // ✅ Double-check balance and allowance before processing payment
    const finalBalanceCheck = await paymentProcessor.getUserBalance(
      userAddress
    );
    const finalAllowanceCheck = await paymentProcessor.checkAllowance(
      userAddress,
      formattedAmount
    );

    if (finalBalanceCheck < BigInt(formattedAmount)) {
      const requiredAmount = ethers.formatUnits(
        formattedAmount,
        config.decimals
      );
      const currentBalance = ethers.formatUnits(
        finalBalanceCheck,
        config.decimals
      );
      throw new Error(
        `Insufficient USDT balance for payment. Required: ${requiredAmount} USDT, Current: ${currentBalance} USDT`
      );
    }

    if (!finalAllowanceCheck) {
      throw new Error(
        `Insufficient USDT allowance. Please approve USDT spending first.`
      );
    }

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
