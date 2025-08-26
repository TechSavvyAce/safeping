// =================================
// 🔗 Blockchain Configuration
// =================================

import { ChainConfig, ChainType } from "@/types";
import { env } from "@/config/env";

// Network mode detection
const isMainnet = env.NEXT_PUBLIC_NETWORK_MODE === "mainnet";

// Helper function to get contract address based on network mode
const getContractAddress = (testnet: string, mainnet: string): string => {
  return isMainnet ? mainnet : testnet;
};

export const CHAIN_CONFIG: ChainConfig = {
  bsc: {
    usdt: isMainnet
      ? "0x55d398326f99059fF775485246999027B3197955" // BSC Mainnet USDT
      : "0x88B8319d4ac9684282990A23d857486D46d95f4B", // BSC Testnet USDT (Custom)
    paymentProcessor: isMainnet
      ? env.NEXT_PUBLIC_BSC_PAYMENT_PROCESSOR_MAINNET ||
        env.NEXT_PUBLIC_BSC_PAYMENT_PROCESSOR_MAINNET ||
        ""
      : "0x91c8246Ee7CE5AC40130f19236860066C7B41f75", // BSC Testnet Payment Processor
    chainId: isMainnet ? "0x38" : "0x61", // 56 mainnet, 97 testnet
    decimals: 18,
    rpc: isMainnet
      ? env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org"
      : "https://data-seed-prebsc-1-s1.binance.org:8545",
  },
  ethereum: {
    usdt: isMainnet
      ? "0xdAC17F958D2ee523a2206206994597C13D831ec7" // Ethereum Mainnet USDT
      : "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", // Ethereum Sepolia USDT
    paymentProcessor: isMainnet
      ? env.NEXT_PUBLIC_ETHEREUM_PAYMENT_PROCESSOR_MAINNET ||
        env.NEXT_PUBLIC_ETHEREUM_PAYMENT_PROCESSOR_MAINNET ||
        ""
      : env.NEXT_PUBLIC_ETHEREUM_PAYMENT_PROCESSOR_TESTNET || "",
    chainId: isMainnet ? "0x1" : "0xaa36a7", // 1 mainnet, 11155111 sepolia
    decimals: 6,
    rpc: isMainnet
      ? env.ETHEREUM_RPC_URL || ""
      : "https://sepolia.infura.io/v3/" + (env.INFURA_PROJECT_ID || ""),
  },
  tron: {
    usdt: isMainnet
      ? "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" // TRON Mainnet USDT
      : "TNqLH6srwCVRcbKtxFMto2jFTwPTncZJm8", // TRON Shasta USDT
    paymentProcessor: isMainnet
      ? env.NEXT_PUBLIC_TRON_PAYMENT_PROCESSOR_MAINNET ||
        env.TRON_PAYMENT_PROCESSOR_MAINNET ||
        ""
      : "TWTTXmwy5gRWcuGH8e7r64AQ5F8eRcLqR6", // TRON Shasta Payment Processor
    chainId: isMainnet ? "mainnet" : "shasta",
    decimals: 6,
    rpc: isMainnet
      ? env.TRON_RPC_URL || "https://api.trongrid.io"
      : "https://api.shasta.trongrid.io",
  },
};

export const EXPLORERS: Record<ChainType, string> = {
  bsc: isMainnet ? "https://bscscan.com" : "https://testnet.bscscan.com",
  ethereum: isMainnet ? "https://etherscan.io" : "https://sepolia.etherscan.io",
  tron: isMainnet ? "https://tronscan.org" : "https://shasta.tronscan.org",
};

export const CHAIN_NAMES: Record<ChainType, string> = {
  bsc: "BSC",
  ethereum: "Ethereum",
  tron: "TRON",
};

export const NATIVE_CURRENCIES: Record<
  ChainType,
  { name: string; symbol: string; decimals: number }
> = {
  bsc: { name: "BNB", symbol: "BNB", decimals: 18 },
  ethereum: { name: "Ether", symbol: "ETH", decimals: 18 },
  tron: { name: "TRON", symbol: "TRX", decimals: 6 },
};

// Maximum approval amount (2^255 - 1)
export const MAX_APPROVAL =
  "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// Gas limits for different operations
export const GAS_LIMITS = {
  bsc: {
    approve: 60000,
    transfer: 60000,
  },
  ethereum: {
    approve: 80000,
    transfer: 80000,
  },
  tron: {
    feeLimit: 100000000, // 100 TRX
  },
};

// RPC endpoints (fallbacks)
export const RPC_ENDPOINTS = {
  bsc: [
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed2.binance.org",
    "https://bsc-dataseed3.binance.org",
  ],
  ethereum: [
    "https://mainnet.infura.io/v3/",
    "https://eth-mainnet.alchemyapi.io/v2/",
  ],
  tron: ["https://api.trongrid.io", "https://api.tronstack.io"],
};

export function getChainConfig(chain: ChainType) {
  return CHAIN_CONFIG[chain];
}

export function getExplorerUrl(chain: ChainType, txHash: string): string {
  const explorer = EXPLORERS[chain];

  if (chain === "tron") {
    return `${explorer}/#/transaction/${txHash}`;
  }

  return `${explorer}/tx/${txHash}`;
}

export function formatAddress(
  address: string,
  startChars = 6,
  endChars = 4
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function isValidAddress(address: string, chain: ChainType): boolean {
  if (!address) return false;

  switch (chain) {
    case "bsc":
    case "ethereum":
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case "tron":
      return /^T[A-Za-z1-9]{33}$/.test(address);
    default:
      return false;
  }
}
