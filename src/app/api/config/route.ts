// =================================
// 🔧 Configuration API Route
// =================================

import { NextResponse } from "next/server";
import { CHAIN_CONFIG, EXPLORERS } from "@/config/chains";

export async function GET() {
  try {
    // Simple network info since blockchainService.getNetworkInfo() no longer exists
    const networkInfo = {
      isMainnet: process.env.NEXT_PUBLIC_NETWORK_MODE === "mainnet",
      networks: Object.keys(CHAIN_CONFIG),
    };

    // Return safe configuration for frontend
    const safeConfig = {
      contracts: {
        bsc: {
          usdt: CHAIN_CONFIG.bsc.usdt,
          paymentProcessor: CHAIN_CONFIG.bsc.paymentProcessor,
          chainId: CHAIN_CONFIG.bsc.chainId,
          decimals: CHAIN_CONFIG.bsc.decimals,
        },
        ethereum: {
          usdt: CHAIN_CONFIG.ethereum.usdt,
          paymentProcessor: CHAIN_CONFIG.ethereum.paymentProcessor,
          chainId: CHAIN_CONFIG.ethereum.chainId,
          decimals: CHAIN_CONFIG.ethereum.decimals,
        },
        tron: {
          usdt: CHAIN_CONFIG.tron.usdt,
          paymentProcessor: CHAIN_CONFIG.tron.paymentProcessor,
          decimals: CHAIN_CONFIG.tron.decimals,
        },
      },
      explorers: EXPLORERS,
      network: {
        mode: networkInfo.isMainnet ? "mainnet" : "testnet",
        isMainnet: networkInfo.isMainnet,
        networks: networkInfo.networks,
      },
      app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || "Crypto Payment Platform",
        version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      },
      limits: {
        maxAmount: Number(process.env.MAX_PAYMENT_AMOUNT) || 10000,
        minAmount: Number(process.env.MIN_PAYMENT_AMOUNT) || 1,
        expiryMinutes: Number(process.env.PAYMENT_EXPIRY_MINUTES) || 30,
      },
    };

    return NextResponse.json(safeConfig);
  } catch (error: any) {
    // Silent error handling for production
    return NextResponse.json(
      { error: "Failed to get configuration" },
      { status: 500 }
    );
  }
}
