// =================================
// 🌐 Web3Modal Configuration
// =================================

import { createWeb3Modal } from "@web3modal/wagmi/react";
import { config } from "./wagmi";
import { isWalletConnectConfigured, env } from "./env";

// Only initialize Web3Modal if we have a valid project ID
let web3modal: any = null;

if (isWalletConnectConfigured()) {
  try {
    web3modal = createWeb3Modal({
      wagmiConfig: config,
      projectId: env.WALLETCONNECT_PROJECT_ID,
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
  } catch (error) {
    console.warn("Failed to initialize Web3Modal:", error);
    web3modal = null;
  }
} else {
  console.warn(
    "WalletConnect Project ID not configured. Web3Modal will not be available."
  );
}

// Export the modal instance for use in components
export { web3modal };
export default web3modal;
