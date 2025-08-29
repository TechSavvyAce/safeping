// =================================
// 🪝 Payment Management Hook
// =================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { Payment, PaymentStatus, UsePaymentReturn } from "@/types";

export function usePayment(paymentId: string): UsePaymentReturn {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch payment details
   */
  const fetchPayment = useCallback(async () => {
    if (!paymentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payment/${paymentId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch payment");
      }

      const paymentData = await response.json();
      setPayment(paymentData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  /**
   * Process payment (backend handles the transfer)
   */
  const processPayment = useCallback(
    async (walletAddress: string) => {
      if (!paymentId) {
        throw new Error("No payment ID");
      }

      setError(null);

      try {
        const response = await fetch(`/api/payment/${paymentId}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wallet_address: walletAddress,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process payment");
        }

        const result = await response.json();

        // Update local payment status
        if (payment) {
          setPayment((prev) =>
            prev
              ? { ...prev, status: "processing", wallet_address: walletAddress }
              : null
          );
        }

        return result;
      } catch (err: any) {
        console.error("Payment processing failed:", err);
        setError(err.message);
        throw err;
      }
    },
    [paymentId, payment]
  );

  /**
   * Check payment status
   */
  const checkStatus = useCallback(async () => {
    if (!paymentId) return;

    try {
      const response = await fetch(`/api/payment/${paymentId}/status`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check status");
      }

      const statusData = await response.json();

      // Update payment with latest status
      if (payment && statusData.status !== payment.status) {
        setPayment((prev) =>
          prev
            ? {
                ...prev,
                status: statusData.status,
                tx_hash: statusData.tx_hash || prev.tx_hash,
                updated_at: statusData.updated_at || prev.updated_at,
              }
            : null
        );
      }

      return statusData;
    } catch (err: any) {
      console.error("Failed to check payment status:", err);
      // Don't set error for status checks to avoid interrupting the flow
    }
  }, [paymentId, payment]);

  /**
   * Auto-refresh payment status for active payments
   */
  useEffect(() => {
    if (!payment || !["pending", "processing"].includes(payment.status)) {
      return;
    }

    // Check status every 5 seconds for active payments
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [payment?.status, checkStatus]);

  /**
   * Handle payment expiration
   */
  useEffect(() => {
    if (!payment || payment.status !== "pending") return;

    const expiresAt = new Date(payment.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry > 0) {
      // Set timeout to mark payment as expired
      const timeout = setTimeout(() => {
        setPayment((prev) => (prev ? { ...prev, status: "expired" } : null));
      }, timeUntilExpiry);

      return () => clearTimeout(timeout);
    } else {
      // Already expired
      setPayment((prev) => (prev ? { ...prev, status: "expired" } : null));
    }
  }, [payment]);

  /**
   * Initial payment fetch
   */
  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  return {
    payment,
    isLoading,
    error,
    processPayment,
    checkStatus,
    refetch: fetchPayment,
  };
}
