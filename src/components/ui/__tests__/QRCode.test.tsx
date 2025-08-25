// =================================
// 🧪 QRCode Component Tests
// =================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { QRCode, PaymentQR } from "../QRCode";

// Mock QR code generation
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock-qr-code"),
  },
}));

describe("QRCode Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<QRCode value="test-value" showValue />);

    // Check for loading spinner
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();

    // Check for loading text when showValue is true (it's translated to Chinese)
    expect(screen.getByText("正在加载...")).toBeInTheDocument();
  });

  it("renders QR code after generation", async () => {
    render(<QRCode value="test-value" size={200} />);

    await waitFor(() => {
      const img = screen.getByAltText("QR Code");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "data:image/png;base64,mock-qr-code");
    });
  });

  it("shows value when showValue is true", async () => {
    render(<QRCode value="test-value-123" showValue={true} />);

    await waitFor(() => {
      expect(screen.getByText(/test-value-123/)).toBeInTheDocument();
    });
  });

  it("truncates long values", async () => {
    const longValue =
      "this-is-a-very-long-value-that-should-be-truncated-for-display-purposes";
    render(<QRCode value={longValue} showValue={true} />);

    await waitFor(() => {
      const truncatedText = screen.getByText(/this-is-a-very-l...lay-purposes/);
      expect(truncatedText).toBeInTheDocument();
    });
  });

  it("handles QR generation error", async () => {
    const QRCodeGenerator = await import("qrcode");
    vi.mocked(QRCodeGenerator.default.toDataURL).mockRejectedValueOnce(
      new Error("QR generation failed")
    );

    const onError = vi.fn();
    render(<QRCode value="test-value" onError={onError} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to generate QR code/)
      ).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith(
        new Error("Failed to generate QR code")
      );
    });
  });
});

describe("PaymentQR Component", () => {
  const mockPaymentId = "payment-123";
  const mockAmount = 100;
  const mockDescription = "Test Payment";

  // Mock window.location.origin
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        origin: "https://example.com",
      },
    });
  });

  it("renders payment QR code with payment ID", () => {
    render(
      <PaymentQR
        paymentId={mockPaymentId}
      />
    );

    expect(screen.getByText("📱 Mobile Payment")).toBeInTheDocument();
    expect(screen.getByText("100 USDT")).toBeInTheDocument();
    expect(screen.getByText("Test Payment")).toBeInTheDocument();
    expect(screen.getByText(/payment-123/)).toBeInTheDocument();

    await waitFor(() => {
      const img = screen.getByAltText("QR Code");
      expect(img).toBeInTheDocument();
    });
  });

  it("renders payment QR code without optional props", () => {
    render(<PaymentQR paymentId={mockPaymentId} />);

    expect(screen.getByText("📱 Mobile Payment")).toBeInTheDocument();
    expect(screen.queryByText("USDT")).not.toBeInTheDocument();

    await waitFor(() => {
      const img = screen.getByAltText("QR Code");
      expect(img).toBeInTheDocument();
    });
  });
});
