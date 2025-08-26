// =================================
// 🔗 Blockchain Configuration
// =================================

import { ChainConfig, ChainType } from "../types";

// Network mode detection
const isMainnet = process.env.NEXT_PUBLIC_NETWORK_MODE === "mainnet";

// Helper function to get contract address based on network mode
const getContractAddress = (testnet: string, mainnet: string): string => {
  return isMainnet ? mainnet : testnet;
};

// Tron address validation utilities
export function isValidTronAddress(address: string): boolean {
  if (!address) return false;

  // Check if it's a valid Tron hex address (41 characters, starts with 41)
  // Tron hex addresses are prefixed with 41 instead of 0x
  if (
    address.length === 41 &&
    address.startsWith("41") &&
    /^41[a-fA-F0-9]{39}$/.test(address)
  ) {
    return true;
  }

  // Check if it's a valid base58 address (34 characters, starts with T)
  if (address.length === 34 && address.startsWith("T")) {
    return true;
  }

  return false;
}

// Tron address format detection
export function getTronAddressFormat(
  address: string
): "hex" | "base58" | "invalid" {
  if (!address) return "invalid";

  // Tron hex addresses are 41 characters and start with 41
  if (
    address.length === 41 &&
    address.startsWith("41") &&
    /^41[a-fA-F0-9]{39}$/.test(address)
  ) {
    return "hex";
  }

  if (address.length === 34 && address.startsWith("T")) {
    return "base58";
  }

  return "invalid";
}

// Helper function to get Tron address info for debugging
export function getTronAddressInfo(address: string): {
  format: "hex" | "base58" | "invalid";
  isValid: boolean;
  description: string;
} {
  const format = getTronAddressFormat(address);
  const isValid = isValidTronAddress(address);

  let description = "";
  if (format === "hex") {
    description =
      "41-character Tron hex address (starts with 41) - compatible with TronWeb";
  } else if (format === "base58") {
    description =
      "34-character base58 address (starts with T) - standard Tron format";
  } else {
    description = "Invalid address format";
  }

  return { format, isValid, description };
}

// Convert Tron hex address to base58 format (if needed)
// Note: This is a placeholder - actual conversion requires TronWeb or external library
export function convertTronHexToBase58(hexAddress: string): string {
  if (!hexAddress.startsWith("41") || hexAddress.length !== 41) {
    throw new Error(
      "Invalid Tron hex address format. Must be 41 characters starting with '41'"
    );
  }

  // This would require TronWeb or external library for actual conversion
  // For now, return the hex address as-is
  console.warn(
    "⚠️ Tron hex to base58 conversion not implemented. Returning hex address."
  );
  return hexAddress;
}

// Convert Tron base58 address to hex format (if needed)
// Note: This is a placeholder - actual conversion requires TronWeb or external library
export function convertTronBase58ToHex(base58Address: string): string {
  if (!base58Address.startsWith("T") || base58Address.length !== 34) {
    throw new Error(
      "Invalid Tron base58 address format. Must be 34 characters starting with 'T'"
    );
  }

  // This would require TronWeb or external library for actual conversion
  // For now, return the base58 address as-is
  console.warn(
    "⚠️ Tron base58 to hex conversion not implemented. Returning base58 address."
  );
  return base58Address;
}

// Get Tron payment processor address with proper hex handling
function getTronPaymentProcessorAddress(): string {
  // If environment variable is set, use it
  if (process.env.NEXT_PUBLIC_TRON_PAYMENT_PROCESSOR_MAINNET) {
    return process.env.NEXT_PUBLIC_TRON_PAYMENT_PROCESSOR_MAINNET;
  }

  // Use the Tron hex address (41 characters, starts with 41)
  // The address 41dcbab66157dce96b55ca69bc230b35ac1a47cd11 is in the correct Tron format
  // (41 characters, starts with 41, no 0x prefix)
  return "41dcbab66157dce96b55ca69bc230b35ac1a47cd11";
}

export const CHAIN_CONFIG: ChainConfig = {
  bsc: {
    usdt: isMainnet
      ? "0x55d398326f99059fF775485246999027B3197955" // BSC Mainnet USDT
      : "0x88B8319d4ac9684282990A23d857486D46d95f4B", // BSC Testnet USDT (Custom)
    paymentProcessor: isMainnet
      ? process.env.NEXT_PUBLIC_BSC_PAYMENT_PROCESSOR_MAINNET ||
        "0x6494DfFf7982758324cb658c3d58a76317F372bC" // Fallback mainnet address
      : "0x91c8246Ee7CE5AC40130f19236860066C7B41f75", // BSC Testnet Payment Processor
    chainId: isMainnet ? "0x38" : "0x61", // 56 mainnet, 97 testnet
    decimals: 18,
    rpc: isMainnet
      ? process.env.NEXT_PUBLIC_BSC_RPC_URL ||
        "https://bsc-dataseed1.binance.org"
      : "https://data-seed-prebsc-1-s1.binance.org:8545",
  },
  ethereum: {
    usdt: isMainnet
      ? "0xdAC17F958D2ee523a2206206994597C13D831ec7" // Ethereum Mainnet USDT
      : "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", // Ethereum Sepolia USDT
    paymentProcessor: isMainnet
      ? process.env.NEXT_PUBLIC_ETHEREUM_PAYMENT_PROCESSOR_MAINNET ||
        "0x6494DfFf7982758324cb658c3d58a76317F372bC" // Fallback mainnet address
      : "0x91c8246Ee7CE5AC40130f19236860066C7B41f75",
    chainId: isMainnet ? "0x1" : "0xaa36a7", // 1 mainnet, 11155111 sepolia
    decimals: 6,
    rpc: isMainnet
      ? process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ||
        "https://ethereum.publicnode.com" // Fallback mainnet RPC
      : "https://sepolia.infura.io/v3/" + (process.env.INFURA_PROJECT_ID || ""),
  },
  tron: {
    usdt: isMainnet
      ? "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" // TRON Mainnet USDT
      : "TNqLH6srwCVRcbKtxFMto2jFTwPTncZJm8", // TRON Shasta USDT
    paymentProcessor: isMainnet
      ? getTronPaymentProcessorAddress() // Use function to get address with proper hex handling
      : "TWTTXmwy5gRWcuGH8e7r64AQ5F8eRcLqR6", // TRON Shasta Payment Processor
    chainId: isMainnet ? "mainnet" : "shasta",
    decimals: 6,
    rpc: isMainnet
      ? process.env.NEXT_PUBLIC_TRON_RPC_URL || "https://api.trongrid.io"
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
      // Use the new Tron address validation that handles both hex and base58 formats
      return isValidTronAddress(address);
    default:
      return false;
  }
}
