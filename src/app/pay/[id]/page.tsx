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
import { WalletSelector } from "@/components/payment/WalletSelector";
import { PaymentSteps } from "@/components/payment/PaymentSteps";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { PaymentTimer } from "@/components/payment/PaymentTimer";
import { NetworkIndicator } from "@/components/ui/NetworkIndicator";
import { cn } from "@/utils/cn";

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

  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Get URL parameters for wallet and chain
  const urlWallet = searchParams.get("wallet");
  const urlChain = searchParams.get("chain") as ChainType;

  const [selectedChain, setSelectedChain] = useState<ChainType | null>(
    urlChain || null
  );
  const [selectedWallet, setSelectedWallet] = useState<string | null>(
    urlWallet || null
  );
  const [currentStep, setCurrentStep] = useState<"chain-selection" | "payment">(
    urlChain && urlWallet ? "payment" : "chain-selection"
  );

  // Handle URL parameters on load
  useEffect(() => {
    if (urlChain && urlWallet) {
      setSelectedChain(urlChain);
      setSelectedWallet(urlWallet);
      setCurrentStep("payment");

      // Check if this is a WalletConnect connection
      const isWalletConnect = searchParams.get("connect") === "walletconnect";

      if (isWalletConnect) {
        // Handle WalletConnect for imToken/Bitpie
        handleWalletConnectPayment(urlWallet, urlChain);
      } else {
        // Handle regular QR code or deep link
        handleAutoPayment(urlWallet, urlChain);
      }
    } else if (urlChain) {
      setSelectedChain(urlChain);
      setCurrentStep("chain-selection");
    }
  }, [urlChain, urlWallet, searchParams]);

  // Handle WalletConnect payment for mobile wallets
  const handleWalletConnectPayment = async (
    walletType: string,
    chainType: string
  ) => {
    console.log(
      `🔗 WalletConnect payment initiated for ${walletType} on ${chainType}`
    );

    try {
      setCurrentStep("payment");

      // For WalletConnect, we need to establish a connection
      // This would typically involve WalletConnect SDK
      console.log("📱 Establishing WalletConnect session...");

      // Simulate WalletConnect connection
      const walletConnectAddress = `wc-${walletType}-${Date.now()}`;
      setWalletAddress(walletConnectAddress);

      console.log("✅ WalletConnect session established");
    } catch (error) {
      console.error("❌ WalletConnect failed:", error);
      setCurrentStep("chain-selection");
    }
  };

  // Auto-payment handler for QR code users
  const handleAutoPayment = async (walletType: string, chainType: string) => {
    console.log(`🚀 Auto-payment initiated for ${walletType} on ${chainType}`);

    try {
      // Set processing state
      setCurrentStep("payment");

      // Simulate wallet connection for QR code users
      const mockWalletAddress = `qr-${walletType}-${Date.now()}`;
      setWalletAddress(mockWalletAddress);

      // Don't auto-process - wait for user to click Pay button
      console.log("📱 QR Code user detected - waiting for Pay button click");
    } catch (error) {
      console.error("❌ Auto-payment failed:", error);
      // Fall back to manual connection
      setCurrentStep("chain-selection");
    }
  };

  // Handle Pay button click for QR code users
  const handlePayButtonClick = async () => {
    if (!selectedWallet || !selectedChain) return;

    console.log(
      `💰 Pay button clicked for ${selectedWallet} on ${selectedChain}`
    );

    try {
      // Auto-process payment based on wallet type
      if (selectedWallet === "metamask" || selectedWallet === "imtoken") {
        // EVM wallets - use backend processing
        await handleBackendPayment(
          `qr-${selectedWallet}-${Date.now()}`,
          selectedChain
        );
      } else if (selectedWallet === "tronlink") {
        // TRON wallet - use TRON-specific processing
        await handleTronPayment(
          `qr-${selectedWallet}-${Date.now()}`,
          selectedChain
        );
      } else if (selectedWallet === "bitpie") {
        // Bitpie wallet - use backend processing
        await handleBackendPayment(
          `qr-${selectedWallet}-${Date.now()}`,
          selectedChain
        );
      }
    } catch (error) {
      console.error("❌ Payment failed:", error);
    }
  };

  // Backend payment processing for EVM chains
  const handleBackendPayment = async (
    walletAddress: string,
    chainType: string
  ) => {
    try {
      console.log("🔄 Processing backend payment for EVM chain...");

      const response = await fetch(`/api/payment/${paymentId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          chain: chainType,
          auto_processed: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Backend payment failed");
      }

      const result = await response.json();
      console.log("✅ Backend payment completed:", result);

      // Refresh payment status
      refetch();
    } catch (error) {
      console.error("❌ Backend payment failed:", error);
      throw error;
    }
  };

  // TRON-specific payment processing
  const handleTronPayment = async (
    walletAddress: string,
    chainType: string
  ) => {
    try {
      console.log("🔄 Processing TRON payment...");

      // TRON payments might need different handling
      // For now, use the same backend endpoint
      await handleBackendPayment(walletAddress, chainType);
    } catch (error) {
      console.error("❌ TRON payment failed:", error);
      throw error;
    }
  };

  // Progress to payment step when wallet is connected
  useEffect(() => {
    if (walletAddress && selectedChain && selectedWallet) {
      setCurrentStep("payment");
    }
  }, [walletAddress, selectedChain, selectedWallet]);

  const handleChainSelect = async (chain: ChainType) => {
    setSelectedChain(chain);

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

  const handleWalletConnected = async (walletId: string, address: string) => {
    if (!selectedChain) return;

    setSelectedWallet(walletId);
    setWalletAddress(address);
    console.log("🔗 Wallet connected successfully:", address);
  };

  const handleBackToChainSelection = () => {
    setSelectedChain(null);
    setSelectedWallet(null);
    setWalletAddress(null);
    setCurrentStep("chain-selection");
    // Clear URL parameters
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleApprovalComplete = async () => {
    console.log(
      "✅ Approval completed - Starting automatic backend transfer..."
    );

    if (!walletAddress || !payment) {
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
          body: JSON.stringify({ wallet_address: walletAddress }),
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
        <header className="bg-gradient-to-r from-red-600 to-red-700 text-white relative overflow-hidden">
          <div className="relative z-10 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="text-2xl">💳</div>
                <h1 className="text-lg font-bold text-yellow-100">
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
        <main className="p-4 space-y-4">
          {/* Unified Payment Block - Sharp & Compact */}
          <div className="bg-gradient-to-br from-gray-800 to-black rounded-xl p-6 border border-gray-600 relative overflow-hidden">
            {/* Sharp corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500"></div>

            {/* Service Name - Top */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">
                {payment.service_name}
              </h2>
              <p className="text-gray-400 text-sm">{payment.description}</p>
            </div>

            {/* Payment ID & Status - Compact Row */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 text-xs">ID: {payment.id}</span>
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  payment.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : payment.status === "completed"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-gray-500/20 text-gray-300"
                }`}
              >
                {payment.status === "pending" ? "待支付" : "已完成"}
              </span>
            </div>

            {/* USDT Amount - Prominent & Compact */}
            <div className="text-center mb-4">
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-black text-yellow-400">
                    {payment.amount}
                  </span>
                  <span className="text-lg font-bold text-gray-300">USDT</span>
                </div>
              </div>
            </div>

            {/* Essential Info - Compact Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-700/30 rounded p-2 text-center">
                <span className="text-gray-400 block">网络</span>
                <span className="text-white font-medium">
                  {selectedChain?.toUpperCase() || "未选择"}
                </span>
              </div>
              <div className="bg-gray-700/30 rounded p-2 text-center">
                <span className="text-gray-400 block">过期</span>
                <span className="text-white font-medium">
                  {new Date(payment.expires_at).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          </div>

          {/* Timer - Compact */}
          {payment.status === "pending" && (
            <PaymentTimer
              expiresAt={payment.expires_at}
              onExpire={handleExpire}
            />
          )}

          {/* Payment Status - Compact */}
          {(payment.status === "processing" ||
            payment.status === "completed" ||
            payment.status === "failed" ||
            payment.status === "expired") && (
            <PaymentStatus payment={payment} />
          )}

          {/* Payment Flow - Compact */}
          {payment.status === "pending" && (
            <div className="space-y-4">
              {/* Chain Selection & Wallet */}
              {currentStep === "chain-selection" && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <WalletSelector
                    selectedChain={selectedChain || "ethereum"}
                    onWalletConnected={handleWalletConnected}
                  />
                </div>
              )}

              {/* Payment Execution */}
              {currentStep === "payment" && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">
                      {walletAddress?.startsWith("qr-")
                        ? "二维码支付处理中"
                        : "完成支付"}
                    </h3>
                    {!urlChain &&
                      !urlWallet &&
                      !walletAddress?.startsWith("qr-") && (
                        <button
                          onClick={handleBackToChainSelection}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          返回
                        </button>
                      )}
                  </div>

                  {/* Wallet Info - Compact */}
                  {walletAddress && (
                    <div
                      className={cn(
                        "mb-4 p-3 rounded border",
                        walletAddress.startsWith("qr-")
                          ? "bg-blue-900/20 border-blue-700/30"
                          : "bg-green-900/20 border-green-700/30"
                      )}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={
                            walletAddress.startsWith("qr-")
                              ? "text-blue-300"
                              : "text-green-300"
                          }
                        >
                          {walletAddress.startsWith("qr-")
                            ? "二维码支付"
                            : "钱包已连接"}
                        </span>
                        <span className="text-gray-300 font-mono">
                          {walletAddress.startsWith("qr-")
                            ? `QR-${walletAddress.split("-")[1]}`
                            : `${walletAddress.slice(
                                0,
                                6
                              )}...${walletAddress.slice(-4)}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* QR Code Payment Status */}
                  {walletAddress?.startsWith("qr-") && (
                    <div className="mb-4 p-3 bg-blue-900/20 rounded border border-blue-700/30">
                      <div className="text-center text-blue-300 text-sm">
                        <div className="text-lg mb-2">📱</div>
                        <p>支付已通过二维码自动发起</p>
                        <p className="text-xs text-blue-400 mt-1">
                          请等待区块链确认完成
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payment Steps */}
                  {walletAddress && (
                    <PaymentSteps
                      payment={payment}
                      wallet={{
                        address: walletAddress,
                        wallet: selectedWallet as any,
                        chain: selectedChain!,
                      }}
                      onApprovalComplete={handleApprovalComplete}
                      onPaymentComplete={handlePaymentComplete}
                      onPayButtonClick={
                        walletAddress?.startsWith("qr-")
                          ? handlePayButtonClick
                          : undefined
                      }
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Beautiful Footer - Dark Theme */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-4 py-3">
          <div className="text-center px-4">
            <p className="text-xs text-gray-400">
              © 2025 {t("payment.title")}平台
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
