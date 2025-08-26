"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChainType } from "@/types";
import { usePayment } from "@/hooks/usePayment";
import { PaymentSteps } from "@/components/payment/PaymentSteps";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { PaymentTimer } from "@/components/payment/PaymentTimer";
import { NetworkIndicator } from "@/components/ui/NetworkIndicator";
import { QRCode } from "@/components/ui/QRCode";

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params.id as string;
  const { t } = useTranslation();
  const { payment, isLoading, error, refetch } = usePayment(paymentId);

  // Default state - Ethereum + MetaMask
  const [selectedChain, setSelectedChain] = useState<ChainType>("ethereum");
  const [selectedWallet, setSelectedWallet] = useState<string>("metamask");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMobilePaymentProcessing, setIsMobilePaymentProcessing] =
    useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Check if user arrived via QR code (mobile wallet)
  const urlWallet = searchParams.get("wallet");
  const urlChain = searchParams.get("chain") as ChainType;
  const isMobileWalletUser = urlWallet && urlChain;

  // Auto-set chain/wallet if user arrived via QR code
  useEffect(() => {
    if (isMobileWalletUser) {
      setSelectedChain(urlChain);
      setSelectedWallet(urlWallet);
      console.log(
        `📱 Mobile wallet user detected: ${urlWallet} on ${urlChain}`
      );
    }
  }, [isMobileWalletUser, urlChain, urlWallet]);

  // Validate wallet-chain compatibility and auto-correct if needed
  useEffect(() => {
    // Check if current wallet selection is compatible with selected chain
    if (selectedChain === "tron" && selectedWallet === "metamask") {
      console.log(
        "⚠️ MetaMask not compatible with Tron, switching to TronLink"
      );
      setSelectedWallet("tronlink");
    } else if (
      (selectedChain === "ethereum" || selectedChain === "bsc") &&
      selectedWallet === "tronlink"
    ) {
      console.log(
        "⚠️ TronLink not compatible with EVM chains, switching to MetaMask"
      );
      setSelectedWallet("metamask");
    }
  }, [selectedChain, selectedWallet]);

  // Handle language from payment metadata
  useEffect(() => {
    const targetLanguage = payment?.language || "zh";
    i18n.changeLanguage(targetLanguage);
  }, [payment]);

  // Simple wallet connection (only for MetaMask/TronLink)
  const connectWallet = async () => {
    try {
      if (typeof window === "undefined") return;

      const win = window as any;

      if (selectedChain === "tron") {
        // Tron wallet connection
        if (win.tronWeb && win.tronWeb.ready) {
          const address = win.tronWeb.defaultAddress.base58;
          setWalletAddress(address);
          setIsConnected(true);
          console.log("🔗 TronLink connected:", address);
        } else {
          alert("Please install TronLink wallet");
        }
      } else {
        // EVM wallet connection (MetaMask only)
        if (win.ethereum) {
          const provider = new (await import("ethers")).BrowserProvider(
            win.ethereum
          );
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
          setIsConnected(true);
          console.log("🔗 MetaMask connected:", address);
        } else {
          alert("Please install MetaMask wallet");
        }
      }
    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
      alert("Failed to connect wallet");
    }
  };

  // Simple wallet disconnection
  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsConnected(false);
    console.log("🔌 Wallet disconnected");
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    console.log("🎉 Payment completed!");
    refetch();
  };

  // Handle mobile wallet payment (QR code scanned)
  const handleMobileWalletPayment = async () => {
    try {
      setIsMobilePaymentProcessing(true);
      setIsPaymentProcessing(true); // Show full-screen loading
      console.log(
        `📱 Processing mobile wallet payment for ${selectedWallet} on ${selectedChain}`
      );

      // Import blockchain functions
      const { approveUSDT, processPayment } = await import("@/lib/blockchain");

      // Get user address from the wallet (this would need to be implemented based on wallet type)
      let userAddress: string;

      if (typeof window === "undefined") {
        throw new Error("This function must be called from a browser");
      }

      const win = window as any;

      // Try to get address from different wallet types
      if (selectedWallet === "imtoken" && win.imToken) {
        // For imToken, we need to get the connected address
        if (win.imToken.ethereum) {
          const provider = new (await import("ethers")).BrowserProvider(
            win.imToken.ethereum
          );
          const signer = await provider.getSigner();
          userAddress = await signer.getAddress();
        } else if (win.imToken.tron) {
          userAddress = win.imToken.tron.defaultAddress?.base58;
        } else {
          throw new Error("imToken wallet not properly connected");
        }
      } else if (selectedWallet === "bitpie" && win.bitpie) {
        // For Bitpie, similar logic
        if (win.bitpie.ethereum) {
          const provider = new (await import("ethers")).BrowserProvider(
            win.bitpie.ethereum
          );
          const signer = await provider.getSigner();
          userAddress = await signer.getAddress();
        } else if (win.bitpie.tron) {
          userAddress = win.bitpie.tron.defaultAddress?.base58;
        } else {
          throw new Error("Bitpie wallet not properly connected");
        }
      } else {
        throw new Error(`Unsupported wallet type: ${selectedWallet}`);
      }

      if (!userAddress) {
        throw new Error("Could not get user address from wallet");
      }

      console.log(`💼 User address: ${userAddress}`);

      // Format amount for the chain
      if (!payment) {
        throw new Error("Payment not found");
      }
      const amount = payment.amount;
      const formattedAmount = (
        amount * Math.pow(10, selectedChain === "ethereum" ? 6 : 18)
      ).toString();

      // Step 1: Approve USDT spending
      console.log("🔐 Step 1: Approving USDT spending...");
      await approveUSDT(selectedChain, formattedAmount, userAddress);
      console.log("✅ USDT approval completed");

      // Step 2: Process payment
      console.log("💸 Step 2: Processing payment...");
      const result = await processPayment(
        paymentId,
        amount,
        userAddress,
        selectedChain
      );

      if (result.success) {
        console.log("🎉 Payment completed successfully!");
        alert("支付成功！");
        refetch();
      } else {
        throw new Error(result.error || "Payment failed");
      }
    } catch (error: any) {
      console.error("❌ Mobile wallet payment failed:", error);
      alert(`支付失败: ${error.message}`);
    } finally {
      setIsMobilePaymentProcessing(false);
      setIsPaymentProcessing(false); // Hide full-screen loading
    }
  };

  // Handle payment expiration
  const handleExpire = () => {
    console.log("⏰ Payment expired");
    refetch();
  };

  // Check if selected wallet needs browser connection
  const needsBrowserWallet =
    selectedWallet === "metamask" || selectedWallet === "tronlink";

  // Loading state
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

  // Error state
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

  // Generate QR code data for mobile wallets
  const generateQRCodeData = () => {
    const baseUrl = `${window.location.origin}/pay/${paymentId}`;
    const params = `chain=${selectedChain}&wallet=${selectedWallet}`;

    // For MetaMask, generate a deep link that opens in MetaMask mobile app
    // Only available for EVM chains (Ethereum, BSC)
    if (
      selectedWallet === "metamask" &&
      (selectedChain === "ethereum" || selectedChain === "bsc")
    ) {
      const metamaskDeepLink = `https://metamask.app.link/dapp/${baseUrl}?${params}`;
      return metamaskDeepLink;
    }

    // For TronLink, generate a deep link (if available)
    if (selectedWallet === "tronlink") {
      // TronLink doesn't have a standard deep link format, so we'll use the regular URL
      // But we could implement TronLink-specific logic here if needed
      const tronLinkUrl = `${baseUrl}?${params}`;
      console.log("🔗 Generated TronLink URL:", tronLinkUrl);
      return tronLinkUrl;
    }

    // For imToken and Bitpie (universal wallets), use regular payment URL
    // These wallets can handle regular URLs and will open in their built-in browsers
    if (selectedWallet === "imtoken" || selectedWallet === "bitpie") {
      const universalWalletUrl = `${baseUrl}?${params}`;
      console.log(`📱 Generated ${selectedWallet} URL:`, universalWalletUrl);
      return universalWalletUrl;
    }

    // Default fallback
    const defaultUrl = `${baseUrl}?${params}`;
    console.log("🔗 Generated default URL:", defaultUrl);
    return defaultUrl;
  };

  const qrCodeData = generateQRCodeData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-lg mx-auto min-h-screen bg-gray-900 shadow-2xl border border-gray-800">
        {/* Header */}
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

        {/* Main Content */}
        <main className="p-4 space-y-4">
          {/* Payment Info */}
          <div className="bg-gradient-to-br from-gray-800 to-black rounded-xl p-6 border border-gray-600 relative overflow-hidden">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500"></div>

            {/* Service Name */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">
                {payment.service_name}
              </h2>
              <p className="text-gray-400 text-sm">{payment.description}</p>
            </div>

            {/* Payment ID & Status */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 text-xs">ID: {paymentId}</span>
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

            {/* USDT Amount */}
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

            {/* Chain & Expiry Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Show chain info only if user has selected or arrived via QR */}
              {selectedChain && (
                <div className="bg-gray-700/30 rounded p-2 text-center">
                  <span className="text-gray-400 block">网络</span>
                  <span className="text-white font-medium">
                    {selectedChain.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Show wallet info only if user has selected or arrived via QR */}
              {selectedWallet && (
                <div className="bg-gray-700/30 rounded p-2 text-center">
                  <span className="text-gray-400 block">钱包</span>
                  <span className="text-white font-medium">
                    {selectedWallet.charAt(0).toUpperCase() +
                      selectedWallet.slice(1)}
                  </span>
                </div>
              )}

              {/* Always show expiry with full date and time */}
              <div className="bg-gray-700/30 rounded p-2 text-center col-span-2">
                <span className="text-gray-400 block">过期时间</span>
                <span className="text-white font-medium text-xs">
                  {new Date(payment.expires_at).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Timer */}
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
            <div className="space-y-4">
              {/* Chain Selection - Only show for desktop users */}
              {!isMobileWalletUser && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3">选择网络</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {["ethereum", "bsc", "tron"].map((chain) => (
                      <button
                        key={chain}
                        onClick={() => {
                          const newChain = chain as ChainType;
                          setSelectedChain(newChain);

                          // Auto-switch wallet based on chain selection
                          if (
                            newChain === "tron" &&
                            selectedWallet === "metamask"
                          ) {
                            // If switching to Tron and MetaMask is selected, switch to TronLink
                            setSelectedWallet("tronlink");
                            console.log(
                              "🔄 Auto-switched to TronLink for Tron chain"
                            );
                          } else if (
                            (newChain === "ethereum" || newChain === "bsc") &&
                            selectedWallet === "tronlink"
                          ) {
                            // If switching to EVM chain and TronLink is selected, switch to MetaMask
                            setSelectedWallet("metamask");
                            console.log(
                              "🔄 Auto-switched to MetaMask for EVM chain"
                            );
                          }
                        }}
                        className={`p-2 rounded text-sm font-medium transition-all ${
                          selectedChain === chain
                            ? "bg-red-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {chain.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallet Selection - Only show for desktop users */}
              {!isMobileWalletUser && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3">选择钱包</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      // Filter wallets based on selected chain
                      let availableWallets = [
                        "metamask",
                        "imtoken",
                        "bitpie",
                        "tronlink",
                      ];

                      if (selectedChain === "tron") {
                        // For Tron chain, hide MetaMask and show TronLink prominently
                        availableWallets = ["tronlink", "imtoken", "bitpie"];
                      } else if (
                        selectedChain === "ethereum" ||
                        selectedChain === "bsc"
                      ) {
                        // For EVM chains, show MetaMask prominently
                        availableWallets = ["metamask", "imtoken", "bitpie"];
                      }

                      return availableWallets.map((wallet) => (
                        <button
                          key={wallet}
                          onClick={() => setSelectedWallet(wallet)}
                          className={`p-2 rounded text-sm font-medium transition-all ${
                            selectedWallet === wallet
                              ? "bg-red-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {wallet.charAt(0).toUpperCase() + wallet.slice(1)}
                        </button>
                      ));
                    })()}
                  </div>

                  {/* Chain-specific wallet information */}
                  {selectedChain === "tron" && (
                    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-center">
                      <p className="text-blue-300 text-xs">
                        💡 Tron 网络：MetaMask 不支持，推荐使用 TronLink
                      </p>
                    </div>
                  )}

                  {(selectedChain === "ethereum" ||
                    selectedChain === "bsc") && (
                    <div className="mt-2 p-2 bg-green-900/20 border border-green-700/30 rounded text-center">
                      <p className="text-green-300 text-xs">
                        💡 {selectedChain.toUpperCase()} 网络：支持 MetaMask 等
                        EVM 钱包
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code - Only show for desktop users (so mobile can scan) */}
              {!isMobileWalletUser && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3 text-center">
                    📱 移动端扫码支付
                  </h3>
                  <div className="flex justify-center">
                    <QRCode value={qrCodeData} size={200} />
                  </div>

                  {/* Copy button for MetaMask deep link */}
                  {selectedWallet === "metamask" && (
                    <div className="mt-3 text-center">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(qrCodeData);
                            setIsLinkCopied(true);
                            setTimeout(() => setIsLinkCopied(false), 2000);
                          } catch (err) {
                            console.error("Failed to copy link:", err);
                          }
                        }}
                        className={`inline-flex items-center px-3 py-1 text-xs rounded-lg transition-colors ${
                          isLinkCopied
                            ? "bg-green-600 text-white"
                            : "bg-orange-600 hover:bg-orange-700 text-white"
                        }`}
                      >
                        {isLinkCopied ? "✅ 已复制" : "📋 复制 MetaMask 链接"}
                      </button>
                    </div>
                  )}
                  <p className="text-gray-400 text-xs text-center mt-2">
                    {selectedWallet === "metamask"
                      ? "📱 扫描后将在 MetaMask 移动端打开"
                      : `使用 ${selectedWallet} 扫描二维码进行支付`}
                  </p>

                  {/* Show special message for universal wallets */}
                  {(selectedWallet === "imtoken" ||
                    selectedWallet === "bitpie") && (
                    <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-center">
                      <p className="text-blue-300 text-xs">
                        💡 {selectedWallet === "imtoken" ? "imToken" : "Bitpie"}{" "}
                        是通用钱包，请使用移动端扫描二维码
                      </p>
                    </div>
                  )}

                  {/* Show special message for MetaMask */}
                  {selectedWallet === "metamask" && (
                    <div className="mt-3 p-2 bg-orange-900/20 border border-orange-700/30 rounded text-center">
                      <p className="text-orange-300 text-xs">
                        🦊 MetaMask 移动端用户：扫描后将自动在 MetaMask
                        应用中打开
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Browser Wallet Connection - Only for MetaMask/TronLink on desktop */}
              {!isMobileWalletUser && needsBrowserWallet && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3">
                    桌面端钱包连接
                  </h3>

                  {!isConnected ? (
                    <button
                      onClick={connectWallet}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                    >
                      🔗 连接{" "}
                      {selectedWallet === "metamask" ? "MetaMask" : "TronLink"}{" "}
                      钱包
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-green-900/20 border border-green-700/30 rounded p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-300">钱包已连接</span>
                          <span className="text-gray-300 font-mono">
                            {walletAddress?.slice(0, 6)}...
                            {walletAddress?.slice(-4)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={disconnectWallet}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm transition-colors"
                        >
                          🔌 断开连接
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Wallet User Message - Clean and simple */}
              {isMobileWalletUser && (
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <div className="text-center text-blue-300">
                    <div className="text-lg mb-2">📱</div>
                    <p className="font-medium">在钱包内支付</p>
                    <p className="text-sm text-blue-400 mt-1">
                      您正在使用 {selectedWallet} 钱包，请在钱包内完成支付操作
                    </p>

                    {/* ✅ Add payment button for mobile wallet users */}
                    <div className="mt-4">
                      <button
                        onClick={handleMobileWalletPayment}
                        disabled={isMobilePaymentProcessing}
                        className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                          isMobilePaymentProcessing
                            ? "bg-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                        }`}
                      >
                        {isMobilePaymentProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                            处理中...
                          </>
                        ) : (
                          `💳 支付 ${payment.amount} USDT`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Steps - Only show when browser wallet is connected on desktop */}
              {!isMobileWalletUser &&
                isConnected &&
                walletAddress &&
                needsBrowserWallet && (
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <PaymentSteps
                      payment={payment}
                      wallet={{
                        address: walletAddress,
                        wallet: selectedWallet as any,
                        chain: selectedChain,
                      }}
                      onApprovalComplete={() =>
                        console.log("✅ Approval completed")
                      }
                      onPaymentComplete={handlePaymentComplete}
                      onPaymentStart={() => setIsPaymentProcessing(true)}
                      onPaymentEnd={() => setIsPaymentProcessing(false)}
                    />
                  </div>
                )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-4 py-3">
          <div className="text-center px-4">
            <p className="text-xs text-gray-400">
              © 2025 {t("payment.title")}平台
            </p>
          </div>
        </footer>
      </div>

      {/* Full-Screen Payment Loading Overlay */}
      {isPaymentProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl max-w-md mx-4 text-center">
            {/* Animated Payment Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <span className="text-3xl">💳</span>
              </div>
              {/* Rotating Ring */}
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-red-400 rounded-full animate-spin"></div>
            </div>

            {/* Loading Text */}
            <h3 className="text-xl font-bold text-white mb-3">支付处理中...</h3>
            <p className="text-gray-300 mb-4">
              正在处理您的 {payment?.amount} USDT 支付
            </p>

            {/* Progress Steps */}
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-300 text-sm">连接钱包</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xs">⏳</span>
                </div>
                <span className="text-gray-300 text-sm">USDT 授权</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">⏳</span>
                </div>
                <span className="text-gray-400 text-sm">处理支付</span>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-6 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
              <p className="text-yellow-300 text-xs">
                ⚠️ 请勿关闭页面或刷新，等待支付完成
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
