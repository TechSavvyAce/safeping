import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock the UUID module to return predictable IDs
vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("test-payment-id"),
}));

// Mock the database module
vi.mock("@/lib/database", () => ({
  getDatabase: () => ({
    createPayment: vi.fn().mockResolvedValue({
      payment_id: "test-payment-id",
      service_name: "Test Service",
      amount: 100,
      description: "Test Description",
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    }),
  }),
}));

// Mock the rate limiting module
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue({ success: true }),
  createRateLimitResponse: vi.fn(),
}));

// Mock the QR code generation
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock-qr-code"),
  },
}));

describe("POST /api/payment/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create payment successfully with all required fields", async () => {
    const requestBody = {
      service_name: "Test Service",
      amount: 100,
      description: "Test Description",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/payment/create",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.payment_id).toBe("test-payment-id");
    expect(data.base_url).toBeDefined();
    expect(data.payment_url).toContain("/pay/test-payment-id");
    expect(data.qr_code).toBeDefined();
    expect(data.expires_at).toBeDefined();
    expect(data.amount).toBe(100);
    expect(data.service_name).toBe("Test Service");
    expect(data.description).toBe("Test Description");
  });

  it("should return validation error for invalid request", async () => {
    const requestBody = {
      service_name: "", // Invalid: empty string
      amount: -1, // Invalid: negative amount
    };

    const request = new NextRequest(
      "http://localhost:3000/api/payment/create",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("should handle missing optional fields gracefully", async () => {
    const requestBody = {
      service_name: "Test Service",
      amount: 50,
      // description is optional
    };

    const request = new NextRequest(
      "http://localhost:3000/api/payment/create",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.payment_id).toBe("test-payment-id");
    expect(data.description).toBeUndefined();
  });

  it("should include base_url in response", async () => {
    const requestBody = {
      service_name: "Test Service",
      amount: 100,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/payment/create",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.base_url).toBeDefined();
    expect(typeof data.base_url).toBe("string");
    expect(data.base_url.length).toBeGreaterThan(0);
  });
});
