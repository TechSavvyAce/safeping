// =================================
// 🔧 Environment Configuration
// =================================

// Safe environment variable access with fallbacks
export const env = {
  // WalletConnect
  WALLETCONNECT_PROJECT_ID:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

  // App Configuration
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",

  // Network Mode
  NETWORK_MODE: process.env.NEXT_PUBLIC_NETWORK_MODE || "testnet",

  // Blockchain RPC URLs
  ETHEREUM_RPC_URL:
    process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ||
    "https://ethereum.publicnode.com",
  BSC_RPC_URL:
    process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
  TRON_RPC_URL:
    process.env.NEXT_PUBLIC_TRON_RPC_URL || "https://api.trongrid.io",

  // Contract Addresses
  ETHEREUM_PAYMENT_PROCESSOR:
    process.env.NEXT_PUBLIC_ETHEREUM_PAYMENT_PROCESSOR_MAINNET || "",
  BSC_PAYMENT_PROCESSOR:
    process.env.NEXT_PUBLIC_BSC_PAYMENT_PROCESSOR_MAINNET || "",
  TRON_PAYMENT_PROCESSOR:
    process.env.NEXT_PUBLIC_TRON_PAYMENT_PROCESSOR_MAINNET || "",

  // Telegram
  TELEGRAM_TOKEN: process.env.NEXT_PUBLIC_TELEGRAM_TOKEN || "",
  TELEGRAM_CHANNEL_ID: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID || "",
};

// Check if WalletConnect is properly configured
export const isWalletConnectConfigured = () => {
  return (
    env.WALLETCONNECT_PROJECT_ID &&
    env.WALLETCONNECT_PROJECT_ID !== "YOUR_WALLETCONNECT_PROJECT_ID"
  );
};

// Check if we're in development mode
export const isDevelopment = () => {
  return process.env.NODE_ENV === "development";
};

// Check if we're in production mode
export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};
