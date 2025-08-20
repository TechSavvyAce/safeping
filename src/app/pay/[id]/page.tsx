// =================================
// 💳 支付页面 - 移动优先设计
// =================================

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChainType, WalletConnection } from "@/types";
import { usePayment } from "@/hooks/usePayment";
import { useWallet } from "@/hooks/useWallet";
import { USDTChainSelector } from "@/components/payment/USDTChainSelector";
import { WalletModal } from "@/components/payment/WalletModal";
import { PaymentSteps } from "@/components/payment/PaymentSteps";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { PaymentTimer } from "@/components/payment/PaymentTimer";
import { NetworkIndicator } from "@/components/ui/NetworkIndicator";

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params.id as string;
  const { t } = useTranslation();

  const { payment, isLoading, error, refetch } = usePayment(paymentId);

  // Handle language from payment metadata with URL parameter override
  useEffect(() => {
    const targetLanguage = payment?.language || "zh";
    i18n.changeLanguage(targetLanguage);
  }, [payment]);

  const { wallet, balance, isConnecting, connect } = useWallet();

  // Get URL parameters for wallet and chain
  const urlWallet = searchParams.get("wallet");
  const urlChain = searchParams.get("chain") as ChainType;

  const [selectedChain, setSelectedChain] = useState<ChainType | null>(
    urlChain || null
  );
  const [selectedWallet, setSelectedWallet] = useState<string | null>(
    urlWallet || null
  );
  const [isMobile, setIsMobile] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStep, setCurrentStep] = useState<
    "chain-selection" | "wallet-selection" | "payment"
  >(
    urlChain && urlWallet
      ? "payment"
      : urlChain
      ? "wallet-selection"
      : "chain-selection"
  );

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  // Handle URL parameters on load
  useEffect(() => {
    if (urlChain && urlWallet) {
      setSelectedChain(urlChain);
      setSelectedWallet(urlWallet);
      setCurrentStep("payment");
    } else if (urlChain) {
      setSelectedChain(urlChain);
      setCurrentStep("wallet-selection");
      setShowWalletModal(true);
    }
  }, [urlChain, urlWallet]);

  // Progress to payment step when wallet is connected
  useEffect(() => {
    if (wallet && selectedChain && selectedWallet) {
      setCurrentStep("payment");
      setShowWalletModal(false);
    }
  }, [wallet, selectedChain, selectedWallet]);

  const handleChainSelect = async (chain: ChainType) => {
    setSelectedChain(chain);
    setCurrentStep("wallet-selection");
    setShowWalletModal(true);

    // Update payment record with selected chain
    try {
      const response = await fetch(`/api/payment/${paymentId}/update-chain`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to update payment chain:", errorData);
      } else {
        console.log(`✅ Payment chain updated to: ${chain}`);
        // Refetch payment data to get updated chain
        refetch();
      }
    } catch (error) {
      console.error("Error updating payment chain:", error);
    }
  };

  const handleWalletConnect = async (walletId: string) => {
    if (!selectedChain) return;

    setSelectedWallet(walletId);

    try {
      await connect(walletId as any, selectedChain);
      console.log("🔗 Wallet connected successfully");
    } catch (error: any) {
      console.error("❌ Wallet connection failed:", error);

      // Show more helpful error messages
      let userFriendlyMessage = error.message;

      if (error.message.includes("TronLink")) {
        if (error.message.includes("not installed")) {
          userFriendlyMessage = "请先安装 TronLink 浏览器扩展";
        } else if (error.message.includes("locked")) {
          userFriendlyMessage = "TronLink 已锁定，请先解锁钱包";
        } else if (error.message.includes("network")) {
          userFriendlyMessage = "网络不匹配，请在 TronLink 中切换到正确的网络";
        } else if (error.message.includes("rejected")) {
          userFriendlyMessage = "连接被拒绝，请在 TronLink 中批准连接";
        }
      } else if (error.message.includes("MetaMask")) {
        if (error.message.includes("not installed")) {
          userFriendlyMessage = "请先安装 MetaMask 浏览器扩展";
        } else if (error.message.includes("locked")) {
          userFriendlyMessage = "MetaMask 已锁定，请先解锁钱包";
        } else if (error.message.includes("rejected")) {
          userFriendlyMessage = "连接被拒绝，请在 MetaMask 中批准连接";
        }
      }

      // Show error modal instead of alert
      setErrorMessage(userFriendlyMessage);
      setShowErrorModal(true);
    }
  };

  const handleBackToChainSelection = () => {
    setSelectedChain(null);
    setSelectedWallet(null);
    setShowWalletModal(false);
    setCurrentStep("chain-selection");
    // Clear URL parameters
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleApprovalComplete = async () => {
    console.log(
      "✅ Approval completed - Starting automatic backend transfer..."
    );

    if (!wallet || !payment) {
      console.error("❌ Missing wallet or payment data for auto transfer");
      return;
    }

    try {
      console.log("🔄 Processing automatic backend payment...");

      // Call backend to process payment automatically
      const response = await fetch(
        `/api/payment/${payment.payment_id}/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: wallet.address }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Backend payment failed");
      }

      const result = await response.json();
      console.log("✅ Backend payment completed:", result);

      // Refresh payment status
      refetch();
    } catch (error: any) {
      console.error("❌ Automatic backend payment failed:", error);
      // You might want to show an error state or retry mechanism here
    }
  };

  const handlePaymentComplete = () => {
    console.log("🎉 Payment completed!");
    refetch();
  };

  const handleExpire = () => {
    console.log("⏰ Payment expired");
    refetch();
  };

  // Loading state - Dark Chinese theme
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="max-w-lg mx-auto min-h-screen bg-gray-900 shadow-2xl border border-gray-800 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white text-lg font-semibold mb-2">
              {t("payment.loadingInfo")}
            </p>
            <p className="text-gray-400 text-sm">{t("payment.pleaseWait")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - Beautiful Chinese style
  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-800">
        <div className="max-w-lg mx-auto min-h-screen bg-white shadow-2xl flex items-center justify-center">
          <div className="max-w-sm mx-auto text-center p-8">
            <div className="text-8xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {t("payment.notFound")}
            </h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {error || t("payment.invalidLink")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 px-6 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 text-lg shadow-lg"
            >
              {t("payment.reload")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-lg mx-auto min-h-screen bg-gray-900 shadow-2xl border border-gray-800">
        {/* Beautiful Header with Chinese Red Gradient */}
        <header className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white relative overflow-hidden">
          {/* Floating Animation Background - Chinese Style */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="absolute top-8 right-8 w-1 h-1 bg-yellow-300 rounded-full animate-ping"></div>
            <div className="absolute bottom-6 left-8 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute top-12 right-16 w-1 h-1 bg-yellow-500 rounded-full animate-pulse"></div>
          </div>

          <div className="relative z-10 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl animate-pulse">💳</div>
                <h1 className="text-xl font-bold text-yellow-100">
                  {t("payment.title")}
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <NetworkIndicator variant="badge" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Dark Chinese Theme */}
        <main className="p-6 space-y-8">
          {/* Service Info Card - Dark Theme */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-850 rounded-xl p-6 border-2 border-gray-700 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {payment.service_name}
            </h2>
            {payment.description && (
              <p className="text-gray-300 text-sm leading-relaxed">
                {payment.description}
              </p>
            )}
          </div>

          {/* Payment Amount - Chinese Gold on Dark */}
          <div className="relative bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-600 rounded-xl p-8 text-black text-center overflow-hidden border-2 border-yellow-400/50">
            {/* Chinese-style Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent -skew-x-12 -translate-x-full animate-pulse"></div>

            <div className="relative z-10">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-4xl font-bold drop-shadow-lg text-gray-900">
                  {payment.amount}
                </span>
                <span className="text-lg font-semibold opacity-90 text-gray-800">
                  USDT
                </span>
              </div>
              <div className="text-sm opacity-80 text-gray-800 font-medium">
                {t("payment.paymentAmount")}
              </div>
            </div>
          </div>

          {/* Chain Info - Dark Theme with Chinese Colors */}
          {selectedChain && (
            <div className="flex justify-center space-x-3">
              <span className="text-xs font-medium text-red-300 bg-red-900/50 px-4 py-2 rounded-full border border-red-700">
                {selectedChain === "bsc"
                  ? t("chains.bscFull")
                  : selectedChain === "ethereum"
                  ? t("chains.ethereumFull")
                  : t("chains.tronFull")}
              </span>
              <span className="text-xs font-medium text-green-300 bg-green-900/50 px-4 py-2 rounded-full border border-green-700">
                {t("chains.mainnet")}
              </span>
            </div>
          )}

          {/* Timer - Simple Orange Style */}
          {payment.status === "pending" && (
            <PaymentTimer
              expiresAt={payment.expires_at}
              onExpire={handleExpire}
            />
          )}

          {/* Payment Status */}
          {(payment.status === "processing" ||
            payment.status === "completed" ||
            payment.status === "failed" ||
            payment.status === "expired") && (
            <PaymentStatus payment={payment} />
          )}

          {/* Payment Flow */}
          {payment.status === "pending" && (
            <div className="space-y-6">
              {/* Step 1: USDT Chain Selection */}
              {currentStep === "chain-selection" && (
                <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700 shadow-lg">
                  <USDTChainSelector
                    onSelect={handleChainSelect}
                    disabled={payment.status !== "pending"}
                  />
                </div>
              )}

              {/* Step 2: Wallet Connection Modal */}
              <WalletModal
                isOpen={showWalletModal}
                onClose={() => {
                  setShowWalletModal(false);
                  if (!wallet) {
                    setCurrentStep("chain-selection");
                  }
                }}
                selectedChain={selectedChain!}
                onConnect={handleWalletConnect}
              />

              {/* Step 3: Payment Execution */}
              {currentStep === "payment" && (
                <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-white">
                        完成支付
                      </h3>
                    </div>
                    {!urlChain && !urlWallet && (
                      <button
                        onClick={handleBackToChainSelection}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        返回选择
                      </button>
                    )}
                  </div>

                  {/* Mobile QR Scan - Show Connect Button */}
                  {urlChain && urlWallet && !wallet && (
                    <div className="text-center space-y-6">
                      <div className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-xl border-2 border-blue-700">
                        <div className="text-4xl mb-4">📱</div>
                        <h4 className="text-lg font-semibold text-white mb-2">
                          使用{" "}
                          {selectedWallet === "metamask"
                            ? "MetaMask"
                            : selectedWallet === "tronlink"
                            ? "TronLink"
                            : "imToken"}{" "}
                          支付
                        </h4>
                        <p className="text-gray-300 text-sm mb-4">
                          点击下方按钮连接钱包并完成支付
                        </p>
                        <p className="text-blue-300 text-xs">
                          网络:{" "}
                          {selectedChain === "bsc"
                            ? "币安智能链"
                            : selectedChain === "ethereum"
                            ? "以太坊"
                            : "波场"}
                        </p>
                      </div>

                      <button
                        onClick={() => handleWalletConnect(selectedWallet!)}
                        disabled={isConnecting}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50"
                      >
                        {isConnecting
                          ? "连接中..."
                          : `连接钱包并支付 ${payment.amount} USDT`}
                      </button>

                      <button
                        onClick={handleBackToChainSelection}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        返回选择其他支付方式
                      </button>
                    </div>
                  )}

                  {/* Wallet Connected - Show Payment Steps */}
                  {wallet && (
                    <>
                      {/* Wallet Info - Dark Theme with Chinese Green */}
                      <div className="mb-6 p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border-2 border-green-700">
                        <h4 className="font-semibold text-white mb-3 flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          钱包已连接
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div className="text-center">
                            <span className="text-gray-300 font-medium block">
                              地址
                            </span>
                            <span className="font-mono text-gray-200 bg-gray-700 px-2 py-1 rounded-lg text-xs mt-1 inline-block">
                              {wallet.address.slice(0, 6)}...
                              {wallet.address.slice(-4)}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-gray-300 font-medium block">
                              网络
                            </span>
                            <span className="text-gray-200 capitalize bg-gray-700 px-2 py-1 rounded-lg font-medium text-xs mt-1 inline-block">
                              {wallet.chain}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-gray-300 font-medium block">
                              余额
                            </span>
                            <span className="text-green-400 font-bold text-sm mt-1 inline-block">
                              {balance?.balance || "0.00"} USDT
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Steps */}
                      <PaymentSteps
                        payment={payment}
                        wallet={wallet}
                        onApprovalComplete={handleApprovalComplete}
                        onPaymentComplete={handlePaymentComplete}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Beautiful Footer - Dark Theme */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-8 py-6">
          <div className="text-center px-6">
            <p className="text-sm text-gray-400">
              © 2025 {t("payment.title")}平台
            </p>
          </div>
        </footer>

        {/* Wallet Modal */}
        <WalletModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          selectedChain={selectedChain!}
          onConnect={handleWalletConnect}
        />

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl border-2 border-red-600 shadow-2xl p-6 mx-4 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">连接失败</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {errorMessage}
                </p>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
