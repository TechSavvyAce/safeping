// =================================
// 🧪 Test Utilities
// =================================

import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { I18nProvider } from "@/components/providers/I18nProvider";

// Mock i18n for testing
const mockI18n = {
  language: "en",
  changeLanguage: () => Promise.resolve(),
  t: (key: string, options?: any) => {
    // Simple mock translation that returns the key
    if (options && typeof options === "object") {
      let result = key;
      Object.keys(options).forEach((option) => {
        result = result.replace(`{{${option}}}`, options[option]);
      });
      return result;
    }
    return key;
  },
  exists: () => true,
  isInitialized: true,
};

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <I18nProvider>{children}</I18nProvider>;
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock payment data for testing
export const mockPayment = {
  id: "test-payment-123",
  service_name: "Test Service",
  service_name_cn: "测试服务",
  description: "Test payment description",
  description_cn: "测试支付描述",
  amount: 100,
  chain: "bsc" as const,
  status: "pending" as const,
  expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tx_hash: null,
  payer_address: null,
  webhook_url: null,
};

// Mock wallet connection
export const mockWallet = {
  address: "0x1234567890123456789012345678901234567890",
  chain: "bsc" as const,
  isConnected: true,
};

// Mock balance
export const mockBalance = {
  balance: "500.00",
  symbol: "USDT",
  decimals: 18,
};

// Mock configuration
export const mockConfig = {
  contracts: {
    bsc: {
      usdt: "0x55d398326f99059fF775485246999027B3197955",
      paymentProcessor: "0x1234567890123456789012345678901234567890",
      chainId: "0x38",
      decimals: 18,
    },
    ethereum: {
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      paymentProcessor: "0x1234567890123456789012345678901234567890",
      chainId: "0x1",
      decimals: 6,
    },
    tron: {
      usdt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      paymentProcessor: "TXyz1234567890123456789012345678901234",
      decimals: 6,
    },
  },
  explorers: {
    bsc: "https://bscscan.com",
    ethereum: "https://etherscan.io",
    tron: "https://tronscan.org",
  },
  network: {
    mode: "testnet",
    isMainnet: false,
    networks: [
      {
        chain: "bsc",
        name: "BSC Testnet",
        explorer: "https://testnet.bscscan.com",
      },
      {
        chain: "ethereum",
        name: "Ethereum Sepolia",
        explorer: "https://sepolia.etherscan.io",
      },
      {
        chain: "tron",
        name: "TRON Shasta",
        explorer: "https://shasta.tronscan.org",
      },
    ],
  },
  app: {
    name: "Crypto Payment Platform",
    version: "1.0.0",
  },
  limits: {
    maxAmount: 10000,
    minAmount: 1,
    expiryMinutes: 30,
  },
};

// Utility functions for testing
export const delay = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const createMockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

// re-export everything
export * from "@testing-library/react";
export { customRender as render };
export { mockI18n };
