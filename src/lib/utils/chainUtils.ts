// =================================
// 🔗 Chain Utilities
// =================================

import { ChainType, SafePingConfig } from "../types/blockchain";
import { CHAIN_CONFIG } from "@/config/chains";

/**
 * Get ABI for specific chain
 */
export function getChainAbi(chain: ChainType) {
  switch (chain) {
    case "ethereum":
      return require("@/abi/ether.json");
    case "bsc":
      return require("@/abi/bsc.json");
    case "tron":
      // TRON ABI has different format - extract the entrys array
      const tronAbi = require("@/abi/tron.json");
      return tronAbi.entrys || tronAbi;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Get chain configuration
 */
export function getChainConfig(chain: ChainType): SafePingConfig {
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`No configuration found for chain: ${chain}`);
  }

  return {
    paymentProcessor: config.paymentProcessor,
    usdt: config.usdt,
    rpc: config.rpc || "", // Provide default empty string if rpc is undefined
    decimals: config.decimals || 6,
    chainId: getChainId(chain),
  };
}

/**
 * Get numeric chain ID
 */
export function getChainId(chain: ChainType): number {
  // Get chainId directly from CHAIN_CONFIG to avoid circular dependency
  const config = CHAIN_CONFIG[chain];
  if (!config) {
    throw new Error(`No configuration found for chain: ${chain}`);
  }

  // Parse chainId from config (it's stored as hex string)
  if (config.chainId) {
    // Check if it's already a number
    if (typeof config.chainId === "number") {
      return config.chainId;
    }

    // Check if it's a hex string
    if (typeof config.chainId === "string" && config.chainId.startsWith("0x")) {
      return parseInt(config.chainId, 16);
    }

    // For TRON, the chainId might be "mainnet" or "shasta" - use fallback
    if (chain === "tron") {
      return 728126428; // TRON mainnet chainId
    }

    // Try to parse as decimal string
    const parsed = parseInt(config.chainId, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  // Fallback to hardcoded values if config parsing fails
  switch (chain) {
    case "ethereum":
      return 1;
    case "bsc":
      return 56;
    case "tron":
      return 728126428;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Format amount with proper decimals
 */
export function formatAmount(amount: string, decimals: number): string {
  return (parseInt(amount) / Math.pow(10, decimals)).toFixed(2);
}

/**
 * Validate chain type
 */
export function isValidChain(chain: string): chain is ChainType {
  return ["ethereum", "bsc", "tron"].includes(chain);
}

/**
 * Get wallet type from chain
 */
export function getWalletType(chain: ChainType): string {
  switch (chain) {
    case "tron":
      return "TronLink";
    case "ethereum":
    case "bsc":
      return "MetaMask";
    default:
      return "Unknown";
  }
}
