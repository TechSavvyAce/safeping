// =================================
// 📋 Payment Steps Component
// =================================

"use client";

import React, { useState } from "react";
import { Payment, WalletConnection } from "@/types";
import { cn } from "@/utils/cn";
import { useWallet } from "@/hooks/useWallet";

interface PaymentStepsProps {
  payment: Payment;
  wallet: WalletConnection | null;
  onApprovalComplete: () => Promise<void> | void;
  onPaymentComplete: () => void;
  className?: string;
}

type StepStatus = "pending" | "active" | "processing" | "completed" | "failed";

interface Step {
  id: string;
  title: string;
  title_cn: string;
  description: string;
  description_cn: string;
  status: StepStatus;
}

export function PaymentSteps({
  payment,
  wallet,
  onApprovalComplete,
  onPaymentComplete,
  className,
}: PaymentStepsProps) {
  const { approveUSDT, checkAllowance } = useWallet();
  const [approving, setApproving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate step statuses based on payment and wallet state
  const getStepStatus = (stepId: string): StepStatus => {
    if (!wallet) return "pending";

    switch (stepId) {
      case "payment":
        if (payment.status === "completed") return "completed";
        if (
          payment.status === "processing" ||
          processing ||
          autoProcessing ||
          approving
        )
          return "processing";
        if (payment.status === "failed") return "failed";
        return "active";

      default:
        return "pending";
    }
  };

  const steps: Step[] = [
    {
      id: "payment",
      title: `Pay ${payment.amount} USDT`,
      title_cn: `支付 ${payment.amount} USDT`,
      description:
        approving || autoProcessing
          ? "Processing payment..."
          : `Click to pay ${payment.amount} USDT`,
      description_cn:
        approving || autoProcessing
          ? "正在处理支付..."
          : `点击支付 ${payment.amount} USDT`,
      status: getStepStatus("payment"),
    },
  ];

  const handlePayment = async () => {
    if (!wallet) return;

    setApproving(true);
    setError(null);

    try {
      if (!wallet) {
        throw new Error("Wallet not available");
      }

      console.log(`🚀 Starting payment of ${payment.amount} USDT...`);

      // Step 1: Approve USDT (hidden from user)
      console.log("🔐 Step 1/2: Approving USDT...");
      await approveUSDT(undefined, wallet);
      console.log("✅ USDT approval completed");

      // Step 2: Backend payment processing (auto)
      setAutoProcessing(true);
      console.log("💰 Step 2/2: Processing backend payment...");

      // Call the approval complete handler (which will trigger backend payment)
      await onApprovalComplete();

      console.log(
        `✅ Payment of ${payment.amount} USDT completed successfully!`
      );
    } catch (err: any) {
      console.error("❌ Payment failed:", err);
      setError(err.message);
    } finally {
      setApproving(false);
      setAutoProcessing(false);
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return "✅";
      case "processing":
        return "⏳";
      case "failed":
        return "❌";
      case "active":
        return "🔵";
      default:
        return "⚪";
    }
  };

  const getStepButton = (step: Step) => {
    const isDisabled =
      step.status === "pending" ||
      step.status === "completed" ||
      step.status === "processing";

    if (step.id === "payment") {
      return (
        <button
          onClick={handlePayment}
          disabled={isDisabled || processing || approving || autoProcessing}
          className={cn(
            "w-full px-6 py-3 rounded-xl font-bold transition-all duration-300 transform",
            "focus:outline-none focus:ring-2 focus:ring-green-500",
            step.status === "active"
              ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-105 shadow-lg"
              : step.status === "completed"
              ? "bg-gradient-to-r from-green-600 to-green-700 text-white cursor-not-allowed"
              : step.status === "processing"
              ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white cursor-not-allowed"
              : step.status === "failed"
              ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:scale-105"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          )}
        >
          {approving || autoProcessing || processing ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              {approving
                ? "正在支付..."
                : autoProcessing
                ? "正在处理..."
                : "处理中..."}
            </span>
          ) : step.status === "completed" ? (
            <span className="flex items-center justify-center">
              <span className="mr-2">🎉</span>
              支付完成
            </span>
          ) : step.status === "failed" ? (
            <span className="flex items-center justify-center">
              <span className="mr-2">🔄</span>
              重试支付
            </span>
          ) : (
            step.title_cn
          )}
        </button>
      );
    }

    return null;
  };

  if (!wallet) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-gray-400">请先连接钱包</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Simple Payment Button */}
      <div className="text-center">{getStepButton(steps[0])}</div>
    </div>
  );
}
