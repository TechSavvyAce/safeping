// =================================
// 🌐 Web3Modal Configuration
// =================================

import { createWeb3Modal } from "@web3modal/wagmi/react";
import { config } from "./wagmi";

// Check if WalletConnect project ID is configured
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
console.log(projectId);
if (!projectId || projectId === "YOUR_WALLETCONNECT_PROJECT_ID") {
  console.error("❌ WalletConnect Project ID not configured!");
  console.error("🔧 To fix this issue:");
  console.error("1. Go to https://cloud.walletconnect.com/");
  console.error("2. Create a new project or use existing one");
  console.error("3. Copy the Project ID");
  console.error("4. Create a .env.local file in your project root");
  console.error(
    "5. Add: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_actual_project_id"
  );
  console.error("6. Restart your development server");
  console.error("");
  console.error(
    "⚠️  WalletConnect features will not work until you configure this!"
  );
  console.error(
    "📱 Users will see connection errors when trying to connect wallets"
  );

  // Don't throw error, just warn and continue with placeholder
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
