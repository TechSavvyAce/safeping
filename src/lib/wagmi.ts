import { createConfig, http, createStorage } from "wagmi";
import { mainnet, bsc } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { env } from "@/config/env";

const projectId = env.WALLETCONNECT_PROJECT_ID;

export const config = createConfig({
  chains: [mainnet, bsc],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId,
      showQrModal: false, // Disable QR modal to prevent external API calls
      qrModalOptions: {
        themeMode: "dark",
        themeVariables: {
          "--wcm-z-index": "9999",
          "--wcm-accent-color": "#dc2626",
        },
      },
      metadata: {
        name: "Crypto Payment Platform",
        description: "Professional USDT Payment Platform",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000",
        icons: ["/icons/icon-192x192.png"],
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
  // Add polling configuration for better connection stability
  pollingInterval: 4000,
  // Disable auto-connect to prevent connection issues
  autoConnect: false,
});

export { mainnet, bsc };

// Custom chain configuration for your payment platform
export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  usdtContract: string;
  usdtDecimals: number;
}

// Chain configurations with proper USDT addresses
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    id: 1,
    name: "Ethereum",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
    usdtContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum
    usdtDecimals: 6,
  },
  bsc: {
    id: 56,
    name: "BSC",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
    usdtContract: "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
    usdtDecimals: 18,
  },
  tron: {
    id: 728126428, // Tron mainnet
    name: "Tron",
    nativeCurrency: {
      name: "TRX",
      symbol: "TRX",
      decimals: 6,
    },
    rpcUrls: ["https://api.trongrid.io"],
    blockExplorerUrls: ["https://tronscan.org"],
    usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT on Tron (TRC20)
    usdtDecimals: 6,
  },
};

// Helper function to get chain name by ID
export function getChainName(chainId: number): string {
  switch (chainId) {
    case mainnet.id:
      return mainnet.name;
    case bsc.id:
      return bsc.name;
    case 728126428: // Tron
      return "Tron";
    default:
      return `Chain ${chainId}`;
  }
}

// Helper function to get USDT contract address by chain
export function getUSDTContract(chainId: number): string | null {
  switch (chainId) {
    case 1: // Ethereum
      return CHAIN_CONFIGS.ethereum.usdtContract;
    case 56: // BSC
      return CHAIN_CONFIGS.bsc.usdtContract;
    case 728126428: // Tron
      return CHAIN_CONFIGS.tron.usdtContract;
    default:
      return null;
  }
}
