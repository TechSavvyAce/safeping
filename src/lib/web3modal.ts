// =================================
// 🌐 Web3Modal Configuration
// =================================

import { createWeb3Modal } from "@web3modal/wagmi/react";
import { config } from "./wagmi";

// Check if WalletConnect project ID is configured
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId || projectId === "YOUR_WALLETCONNECT_PROJECT_ID") {
  // WalletConnect Project ID not configured
  // This allows the app to run but WalletConnect won't work
}

// Initialize Web3Modal - this must be called before using useWeb3Modal
export const web3modal = createWeb3Modal({
  wagmiConfig: config,
  projectId: projectId || "eafad09429e587ca37ab547047bdfe3a",
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
});

// Export the modal instance for use in components
export default web3modal;
