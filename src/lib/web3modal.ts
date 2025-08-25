// =================================
// 🌐 Web3Modal Configuration
// =================================

import { createWeb3Modal } from "@web3modal/wagmi/react";
import { config } from "./wagmi";
import { env } from "@/config/env";

// Check if WalletConnect project ID is configured
const projectId = env.WALLETCONNECT_PROJECT_ID;
if (!projectId || projectId === "YOUR_WALLETCONNECT_PROJECT_ID") {
  console.warn(
    "⚠️ WalletConnect Project ID not configured. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file"
  );
}

// Initialize Web3Modal - this must be called before using useWeb3Modal
export const web3modal = createWeb3Modal({
  wagmiConfig: config,
  projectId: projectId || "YOUR_PROJECT_ID",
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#dc2626",
    "--w3m-z-index": 9999,
    "--w3m-border-radius-master": "12px",
    "--w3m-font-family":
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  allowUnsupportedChain: true,
  defaultChain: config.chains[0],
  enableAnalytics: false,
  enableOnramp: false,
  enableWalletFeatures: false,
  enableExplorer: false,
  explorerRecommendedWalletIds: [],
  explorerExcludedWalletIds: [],
  privacyPolicyUrl: undefined,
  termsOfServiceUrl: undefined,
  walletConnectVersion: 2,
  // Disable external API calls that are causing 403 errors
  enableNetworkView: false,
  enableExplorer: false,
  enableOnramp: false,
  enableWalletFeatures: false,
});

// Export the modal instance for use in components
export default web3modal;
