// =================================
// 🧪 Blockchain Service Tests
// =================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BlockchainService } from "../blockchain";

describe("BlockchainService", () => {
  let service: BlockchainService;

  beforeEach(() => {
    service = BlockchainService.getInstance();
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("returns singleton instance", () => {
      const instance1 = BlockchainService.getInstance();
      const instance2 = BlockchainService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("getChainConfig", () => {
    it("returns BSC configuration", () => {
      const config = service.getChainConfig("bsc");

      expect(config).toHaveProperty("usdt");
      expect(config).toHaveProperty("paymentProcessor");
      expect(config).toHaveProperty("chainId");
      expect(config).toHaveProperty("decimals");
      expect(config.decimals).toBe(18);
    });

    it("returns Ethereum configuration", () => {
      const config = service.getChainConfig("ethereum");

      expect(config).toHaveProperty("usdt");
      expect(config).toHaveProperty("paymentProcessor");
      expect(config).toHaveProperty("chainId");
      expect(config).toHaveProperty("decimals");
      expect(config.decimals).toBe(6);
    });

    it("returns TRON configuration", () => {
      const config = service.getChainConfig("tron");

      expect(config).toHaveProperty("usdt");
      expect(config).toHaveProperty("paymentProcessor");
      expect(config).toHaveProperty("decimals");
      expect(config.decimals).toBe(6);
    });
  });

  describe("formatAmount", () => {
    it("formats amount for BSC (18 decimals)", () => {
      const formatted = service.formatAmount(100, "bsc");

      expect(formatted).toBe("100000000000000000000"); // 100 * 10^18
    });

    it("formats amount for Ethereum (6 decimals)", () => {
      const formatted = service.formatAmount(100, "ethereum");

      expect(formatted).toBe("100000000"); // 100 * 10^6
    });

    it("formats amount for TRON (6 decimals)", () => {
      const formatted = service.formatAmount(50.5, "tron");

      expect(formatted).toBe("50500000"); // 50.5 * 10^6
    });
  });

  describe("parseAmount", () => {
    it("parses BSC amount (18 decimals)", () => {
      const parsed = service.parseAmount("100000000000000000000", "bsc");

      expect(parsed).toBe(100);
    });

    it("parses Ethereum amount (6 decimals)", () => {
      const parsed = service.parseAmount("100000000", "ethereum");

      expect(parsed).toBe(100);
    });

    it("parses TRON amount (6 decimals)", () => {
      const parsed = service.parseAmount("50500000", "tron");

      expect(parsed).toBe(50.5);
    });
  });

  describe("validateConfiguration", () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.BSC_PAYMENT_PROCESSOR_TESTNET = "0x123";
      process.env.ETHEREUM_PAYMENT_PROCESSOR_TESTNET = "0x456";
      process.env.TRON_PAYMENT_PROCESSOR_TESTNET = "TXyz789";
    });

    it("validates BSC configuration", () => {
      const isValid = service.validateConfiguration("bsc");

      expect(isValid).toBe(true);
    });

    it("returns false for missing payment processor", () => {
      // Mock getChainConfig to return config without payment processor
      const originalGetChainConfig = service.getChainConfig;
      vi.spyOn(service, "getChainConfig").mockReturnValue({
        usdt: "0x123",
        paymentProcessor: "", // Empty payment processor
        chainId: "0x61",
        decimals: 18,
        rpc: "https://test.rpc",
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const isValid = service.validateConfiguration("bsc");

      expect(isValid).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Payment processor not configured for bsc"
      );

      consoleSpy.mockRestore();
      // Restore original method
      vi.spyOn(service, "getChainConfig").mockImplementation(
        originalGetChainConfig
      );
    });
  });

  describe("getNetworkInfo", () => {
    it("returns testnet info by default", () => {
      const networkInfo = service.getNetworkInfo();

      expect(networkInfo.isMainnet).toBe(false);
      expect(networkInfo.networks).toHaveLength(3);
      expect(networkInfo.networks[0].name).toContain("Testnet");
    });

    it("returns mainnet info when configured", () => {
      process.env.NEXT_PUBLIC_NETWORK_MODE = "mainnet";

      const networkInfo = service.getNetworkInfo();

      expect(networkInfo.isMainnet).toBe(true);
      expect(networkInfo.networks[0].name).toContain("Mainnet");

      // Clean up
      delete process.env.NEXT_PUBLIC_NETWORK_MODE;
    });
  });

  describe("processPayment", () => {
    it("returns error for invalid configuration", async () => {
      // Mock invalid configuration
      vi.spyOn(service, "validateConfiguration").mockReturnValue(false);

      const result = await service.processPayment(
        "payment-123",
        100,
        "0x123",
        "bsc"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid chain configuration");
    });

    it("returns error for TRON (not implemented)", async () => {
      vi.spyOn(service, "validateConfiguration").mockReturnValue(true);

      const result = await service.processPayment(
        "payment-123",
        100,
        "TRX123",
        "tron"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("TRON payment processing not implemented");
    });

    it("returns error for EVM chains (not implemented)", async () => {
      vi.spyOn(service, "validateConfiguration").mockReturnValue(true);

      const result = await service.processPayment(
        "payment-123",
        100,
        "0x123",
        "bsc"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Server wallet not configured for automatic payments"
      );
    });
  });

  describe("getTransactionStatus", () => {
    it("calls TRON transaction status for TRON chain", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({}),
      });
      global.fetch = mockFetch;

      const result = await service.getTransactionStatus("tron-tx-hash", "tron");

      expect(result.status).toBe("pending");
      expect(result.confirmations).toBe(0);
    });

    it("calls EVM transaction status for BSC chain", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ result: null }),
      });
      global.fetch = mockFetch;

      const result = await service.getTransactionStatus("0x123", "bsc");

      expect(result.status).toBe("pending");
      expect(result.confirmations).toBe(0);
    });

    it("handles errors gracefully", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const result = await service.getTransactionStatus("invalid-hash", "bsc");

      expect(result.status).toBe("failed");
      expect(result.confirmations).toBe(0);
    });
  });
});
