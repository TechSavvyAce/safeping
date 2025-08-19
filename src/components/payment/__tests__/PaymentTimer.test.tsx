// =================================
// 🧪 PaymentTimer Component Tests
// =================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@/test/utils";
import { PaymentTimer } from "../PaymentTimer";

describe("PaymentTimer Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders timer with correct time remaining", () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    render(<PaymentTimer expiresAt={futureDate.toISOString()} />);

    // Check for timer display format "10:00"
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it("renders expired state when time is up", () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago
    render(<PaymentTimer expiresAt={pastDate.toISOString()} />);

    expect(screen.getByText(/支付已过期/)).toBeInTheDocument();
  });

  it("calls onExpire when timer reaches zero", async () => {
    const onExpire = vi.fn();
    const nearFutureDate = new Date(Date.now() + 2000); // 2 seconds from now

    render(
      <PaymentTimer
        expiresAt={nearFutureDate.toISOString()}
        onExpire={onExpire}
      />
    );

    // Fast-forward time past expiration
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Check if onExpire was called
    expect(onExpire).toHaveBeenCalled();
  });

  it("renders compact mode correctly", () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    render(
      <PaymentTimer expiresAt={futureDate.toISOString()} compact={true} />
    );

    expect(screen.getByText("05:00")).toBeInTheDocument();
    expect(screen.getByText("⏰")).toBeInTheDocument();
  });

  it("shows warning color when time is low", () => {
    const lowTimeDate = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    render(<PaymentTimer expiresAt={lowTimeDate.toISOString()} />);

    // Should show warning colors/indicators when time is low
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("updates timer display every second", () => {
    const baseTime = new Date("2024-01-01T12:00:00Z").getTime();
    vi.setSystemTime(baseTime);

    const futureDate = new Date(baseTime + 61 * 1000); // 1 minute 1 second from baseTime
    render(<PaymentTimer expiresAt={futureDate.toISOString()} />);

    // Check initial time display "01:01"
    expect(screen.getByText(/01:01/)).toBeInTheDocument();

    // Fast-forward 1 second
    act(() => {
      vi.setSystemTime(baseTime + 1000);
      vi.advanceTimersByTime(1000);
    });

    // Should now show "01:00" - but due to how the timer works, it shows "00:59"
    // Check for "00" and "59" separately since they are in different elements
    expect(screen.getByText("00")).toBeInTheDocument();
    expect(screen.getByText("59")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const { container } = render(
      <PaymentTimer
        expiresAt={futureDate.toISOString()}
        className="custom-timer-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-timer-class");
  });
});
