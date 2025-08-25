"use client";

import React, { useState } from "react";
import { Payment, WalletConnection } from "@/types";
import { cn } from "@/utils/cn";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { getChainName } from "@/lib/wagmi";

// Import Telegram service with error handling
let telegramService: any = null;
try {
  telegramService = require("@/lib/telegram").telegramService;
} catch (error) {
  console.log("📱 Telegram service not available");
}

interface PaymentStepsProps {
  payment: Payment;
  wallet: WalletConnection | null;
  onApprovalComplete: () => Promise<void> | void;
  onPaymentComplete: () => void;
  onPayButtonClick?: () => Promise<void> | void;
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
  onPayButtonClick,
  className,
}: PaymentStepsProps) {
  const { address, chain } = useWalletConnect();
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
      title: "Complete Payment",
      title_cn: "完成支付",
      description:
        approving || autoProcessing
          ? "Processing payment..."
          : "Click to complete your payment",
      description_cn:
        approving || autoProcessing ? "正在处理支付..." : "点击完成支付",
      status: getStepStatus("payment"),
    },
  ];

  // Check if this is an auto-processed QR code payment
  const isQRCodePayment = wallet?.address?.startsWith("qr-");

  // Check if this is a WalletConnect payment
  const isWalletConnectPayment = wallet?.address?.startsWith("wc-");

  const handlePayment = async () => {
    if (!wallet || !address) return;

    // For WalletConnect payments, use the special pay button handler
    if (isWalletConnectPayment && onPayButtonClick) {
      try {
        await onPayButtonClick();
        return;
      } catch (error) {
        console.error("❌ WalletConnect payment failed:", error);
        setError("支付失败，请重试");
        return;
      }
    }

    // For QR code payments, use the special pay button handler
    if (isQRCodePayment && onPayButtonClick) {
      try {
        await onPayButtonClick();
        return;
      } catch (error) {
        console.error("❌ QR Code payment failed:", error);
        setError("支付失败，请重试");
        return;
      }
    }

    // For manual wallet payments, use the original flow
    if (isQRCodePayment || isWalletConnectPayment) {
      setError("此支付已通过移动端自动处理，请等待确认");
      return;
    }

    setApproving(true);
    setError(null);

    try {
      console.log(`🚀 Starting payment of ${payment.amount} USDT...`);

      // For now, we'll skip the USDT approval step since we're using WalletConnect
      // The actual payment will be handled by the backend
      console.log("💰 Processing backend payment...");

      // Call the approval complete handler (which will trigger backend payment)
      await onApprovalComplete();

      console.log(
        `✅ Payment of ${payment.amount} USDT completed successfully!`
      );

      // Send Telegram notification for payment completion
      if (telegramService?.isEnabled()) {
        try {
          await telegramService.sendCustomNotification(
            "Payment Completed",
            `💰 Payment of ${
              payment.amount
            } USDT completed successfully!\n\n👤 User: ${address}\n🌐 Chain: ${
              chain?.id ? getChainName(chain.id) : wallet.chain
            }\n💼 Wallet: ${wallet.wallet}`,
            ["PaymentSuccess", wallet.chain, "USDT"]
          );
        } catch (error) {
          console.log("📱 Telegram notification failed:", error);
        }
      }
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

  if (!wallet || !address) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-gray-400">请先连接钱包</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step) => (
        <div
          key={step.id}
          className={cn(
            "p-4 rounded-lg border transition-all duration-200",
            step.status === "completed"
              ? "bg-green-900/20 border-green-700/30"
              : step.status === "processing"
              ? "bg-blue-900/20 border-blue-700/30"
              : step.status === "failed"
              ? "bg-red-900/20 border-red-700/30"
              : "bg-gray-800/50 border-gray-600/30"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  step.status === "completed"
                    ? "bg-green-500 text-white"
                    : step.status === "processing"
                    ? "bg-blue-500 text-white animate-pulse"
                    : step.status === "failed"
                    ? "bg-red-500 text-white"
                    : "bg-gray-600 text-gray-300"
                )}
              >
                {step.status === "completed"
                  ? "✓"
                  : step.status === "processing"
                  ? "⚡"
                  : "●"}
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">
                  {isWalletConnectPayment
                    ? "WalletConnect 支付"
                    : isQRCodePayment
                    ? "扫码支付"
                    : step.title_cn}
                </h4>
                <p className="text-gray-400 text-xs">
                  {isWalletConnectPayment
                    ? "点击支付按钮完成 WalletConnect 支付"
                    : isQRCodePayment
                    ? "点击支付按钮完成支付"
                    : step.description_cn}
                </p>
              </div>
            </div>

            {step.status === "active" && (
              <button
                onClick={handlePayment}
                disabled={approving || processing || autoProcessing}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium text-sm transition-colors",
                  isWalletConnectPayment || isQRCodePayment
                    ? "bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white"
                    : "bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white"
                )}
              >
                {approving || processing || autoProcessing
                  ? "处理中..."
                  : isWalletConnectPayment
                  ? "WalletConnect 支付"
                  : isQRCodePayment
                  ? "支付"
                  : "支付"}
              </button>
            )}

            {(isWalletConnectPayment || isQRCodePayment) &&
              step.status === "processing" && (
                <div className="px-3 py-1 bg-blue-600/20 text-blue-300 text-xs rounded-full border border-blue-600/30">
                  {isWalletConnectPayment ? "WalletConnect 处理中" : "处理中"}
                </div>
              )}
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-900/20 border border-red-700/30 rounded text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* WalletConnect Payment Info */}
          {isWalletConnectPayment && (
            <div className="mt-3 p-2 bg-green-900/20 border border-green-700/30 rounded text-green-300 text-xs">
              <div className="flex items-center space-x-2">
                <span>🔗</span>
                <span>
                  WalletConnect 用户：已建立安全连接，点击支付按钮即可完成支付
                </span>
              </div>
            </div>
          )}

          {/* QR Code Payment Info */}
          {isQRCodePayment && (
            <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-blue-300 text-xs">
              <div className="flex items-center space-x-2">
                <span>📱</span>
                <span>扫码用户：点击支付按钮即可完成支付</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
