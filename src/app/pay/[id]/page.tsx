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
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function PaymentPage() {
  return (
    <ErrorBoundary>
      <PaymentPageContent />
    </ErrorBoundary>
  );
}

function PaymentPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = params.id as string;
  const { t } = useTranslation();
  const { payment, isLoading, error, refetch } = usePayment(paymentId);

  const [selectedChain, setSelectedChain] = useState<ChainType>("ethereum");
  const [selectedWallet, setSelectedWallet] = useState<string>("metamask");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMobilePaymentProcessing, setIsMobilePaymentProcessing] =
    useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const urlWallet = searchParams.get("wallet");
  const urlChain = searchParams.get("chain") as ChainType;
  const isMobileWalletUser = urlWallet && urlChain;

  useEffect(() => {
    try {
      if (isMobileWalletUser) {
        setSelectedChain(urlChain);
        setSelectedWallet(urlWallet);
      }
    } catch (error) {
      console.error("Error setting mobile wallet user:", error);
    }
  }, [isMobileWalletUser, urlChain, urlWallet]);

  useEffect(() => {
    try {
      if (selectedChain === "tron" && selectedWallet === "metamask") {
        setSelectedWallet("tronlink");
      } else if (
        (selectedChain === "ethereum" || selectedChain === "bsc") &&
        selectedWallet === "tronlink"
      ) {
        setSelectedWallet("metamask");
      }
    } catch (error) {
      console.error("Error updating wallet selection:", error);
    }
  }, [selectedChain, selectedWallet]);

  useEffect(() => {
    try {
      const targetLanguage = payment?.language || "zh";
      i18n.changeLanguage(targetLanguage);
    } catch (error) {
      console.error("Error changing language:", error);
    }
  }, [payment]);

  const connectWallet = async () => {
    try {
      if (typeof window === "undefined") return;

      const win = window as any;

      if (selectedChain === "tron") {
        if (win.tronWeb && win.tronWeb.ready) {
          const address = win.tronWeb.defaultAddress.base58;
          setWalletAddress(address);
          setIsConnected(true);
        } else {
          alert("Please install TronLink wallet");
        }
      } else {
        if (win.ethereum) {
          try {
            const provider = new (await import("ethers")).BrowserProvider(
              win.ethereum
            );
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setWalletAddress(address);
            setIsConnected(true);
          } catch (providerError) {
            console.error("Provider error:", providerError);
            alert("Failed to connect to wallet provider. Please try again.");
          }
        } else {
          alert("Please install MetaMask wallet");
        }
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsConnected(false);
  };

  const handlePaymentComplete = () => {
    refetch();
  };

  const handleMobileWalletPayment = async () => {
    try {
      setIsMobilePaymentProcessing(true);
      setIsPaymentProcessing(true);

      if (typeof window === "undefined") {
        throw new Error("This function must be called from a browser");
      }

      const win = window as any;
      let userAddress: string;

      try {
        if (selectedWallet === "imtoken") {
          if (selectedChain === "tron" && win.tronWeb?.ready) {
            userAddress = win.tronWeb.defaultAddress.base58;
          } else if (
            (selectedChain === "ethereum" || selectedChain === "bsc") &&
            win.ethereum
          ) {
            const provider = new (await import("ethers")).BrowserProvider(
              win.ethereum
            );
            const signer = await provider.getSigner();
            userAddress = await signer.getAddress();
          } else {
            throw new Error(
              `${selectedWallet} wallet not detected. Please ensure you're using ${selectedWallet} app and have selected the correct network.`
            );
          }
        } else if (selectedWallet === "metamask") {
          if (win.ethereum) {
            const provider = new (await import("ethers")).BrowserProvider(
              win.ethereum
            );
            const signer = await provider.getSigner();
            userAddress = await signer.getAddress();
          } else {
            throw new Error(
              "MetaMask not detected. Please ensure you're using MetaMask mobile app."
            );
          }
        } else if (selectedWallet === "tronlink") {
          if (win.tronWeb?.ready) {
            userAddress = win.tronWeb.defaultAddress.base58;
          } else {
            throw new Error(
              "TronLink not detected. Please ensure you're using TronLink mobile app."
            );
          }
        } else {
          if (win.ethereum) {
            const provider = new (await import("ethers")).BrowserProvider(
              win.ethereum
            );
            const signer = await provider.getSigner();
            userAddress = await signer.getAddress();
          } else if (win.tronWeb?.ready) {
            userAddress = win.tronWeb.defaultAddress.base58;
          } else {
            throw new Error(
              `Wallet ${selectedWallet} not detected. Please ensure your wallet app is properly connected.`
            );
          }
        }
      } catch (walletError: any) {
        console.error("Wallet detection error:", walletError);
        throw new Error(`Wallet detection failed: ${walletError.message}`);
      }

      if (!userAddress) {
        throw new Error("Could not get user address from wallet");
      }

      if (!payment) {
        throw new Error("Payment not found");
      }

      // Mobile wallet payment will be handled by PaymentSteps component
    } catch (error: any) {
      console.error("Mobile wallet payment error:", error);
      let errorMessage = "支付失败，请重试";

      if (
        error.message &&
        error.message.includes("Insufficient USDT balance")
      ) {
        errorMessage = `USDT余额不足！需要: ${
          payment?.amount || "未知"
        } USDT，当前余额不足。请确保您的钱包中有足够的USDT。`;
      } else if (
        error.message &&
        error.message.includes("Insufficient USDT allowance")
      ) {
        errorMessage = "USDT授权不足！请先完成USDT授权步骤。";
      } else if (error.message && error.message.includes("User rejected")) {
        errorMessage = "用户取消了交易";
      } else if (
        error.message &&
        error.message.includes("insufficient funds")
      ) {
        errorMessage =
          "网络费用不足！请确保您的钱包中有足够的原生代币（ETH/BNB/TRX）支付网络费用。";
      } else if (
        error.message &&
        error.message.includes("execution reverted")
      ) {
        errorMessage = "智能合约执行失败，请检查网络状态或联系客服";
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(`❌ 支付失败\n\n${errorMessage}`);
    } finally {
      setIsMobilePaymentProcessing(false);
      setIsPaymentProcessing(false);
    }
  };

  const handleExpire = () => {
    refetch();
  };

  const needsBrowserWallet =
    selectedWallet === "metamask" || selectedWallet === "tronlink";

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

  const generateQRCodeData = () => {
    try {
      if (typeof window === "undefined") {
        return "";
      }

      const baseUrl = `${window.location.origin}/pay/${paymentId}`;
      const params = `chain=${selectedChain}&wallet=${selectedWallet}`;

      if (
        selectedWallet === "metamask" &&
        (selectedChain === "ethereum" || selectedChain === "bsc")
      ) {
        return `https://metamask.app.link/dapp/${baseUrl}?${params}`;
      }

      if (selectedWallet === "tronlink") {
        return `${baseUrl}?${params}`;
      }

      if (selectedWallet === "imtoken") {
        return `${baseUrl}?${params}`;
      }

      return `${baseUrl}?${params}`;
    } catch (error) {
      console.error("Error generating QR code data:", error);
      return "";
    }
  };

  const qrCodeData = generateQRCodeData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-lg mx-auto min-h-screen bg-gray-900 shadow-2xl border border-gray-800">
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

        <main className="p-4 space-y-4">
          <div className="bg-gradient-to-br from-gray-800 to-black rounded-xl p-6 border border-gray-600 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-yellow-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500"></div>

            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-white">
                {payment.service_name}
              </h2>
              <p className="text-gray-400 text-sm">{payment.description}</p>
            </div>

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

            {(selectedChain || selectedWallet) && (
              <div className="text-center mb-3">
                <div className="inline-flex items-center space-x-3 bg-gray-700/50 rounded-full px-4 py-2 border border-gray-600">
                  {selectedChain && (
                    <div className="flex items-center space-x-1">
                      <img
                        src={
                          selectedChain === "ethereum"
                            ? "/icons/ethereum.png"
                            : selectedChain === "bsc"
                            ? "/icons/bsc.png"
                            : selectedChain === "tron"
                            ? "/icons/tron.png"
                            : "/icons/ethereum.png"
                        }
                        alt={selectedChain}
                        className="w-5 h-5 object-contain"
                      />
                      <span className="text-white text-sm font-medium">
                        {selectedChain.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {selectedChain && selectedWallet && (
                    <div className="w-px h-4 bg-gray-500"></div>
                  )}
                  {selectedWallet && (
                    <div className="flex items-center space-x-1">
                      <img
                        src={
                          selectedWallet === "metamask"
                            ? "/icons/metamask.png"
                            : selectedWallet === "tronlink"
                            ? "/icons/tronlink.png"
                            : selectedWallet === "imtoken"
                            ? "/icons/imtoken.png"
                            : "/icons/metamask.png"
                        }
                        alt={selectedWallet}
                        className="w-5 h-5 object-contain"
                      />
                      <span className="text-white text-sm font-medium">
                        {selectedWallet === "metamask"
                          ? "MetaMask"
                          : selectedWallet === "tronlink"
                          ? "TronLink"
                          : selectedWallet === "imtoken"
                          ? "imToken"
                          : selectedWallet}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

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
          </div>

          {payment.status === "pending" && (
            <PaymentTimer
              expiresAt={payment.expires_at}
              onExpire={handleExpire}
            />
          )}

          {(payment.status === "processing" ||
            payment.status === "completed" ||
            payment.status === "failed" ||
            payment.status === "expired") && (
            <PaymentStatus payment={payment} />
          )}

          {payment.status === "pending" && (
            <div className="space-y-4">
              {!isMobileWalletUser && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3">选择网络</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "ethereum",
                        name: "Ethereum",
                        icon: "/icons/ethereum.png",
                      },
                      { id: "bsc", name: "BSC", icon: "/icons/bsc.png" },
                      { id: "tron", name: "TRON", icon: "/icons/tron.png" },
                    ].map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => {
                          const newChain = chain.id as ChainType;
                          setSelectedChain(newChain);

                          if (
                            newChain === "tron" &&
                            selectedWallet === "metamask"
                          ) {
                            setSelectedWallet("tronlink");
                          } else if (
                            (newChain === "ethereum" || newChain === "bsc") &&
                            selectedWallet === "tronlink"
                          ) {
                            setSelectedWallet("metamask");
                          }
                        }}
                        className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center space-y-2 ${
                          selectedChain === chain.id
                            ? "bg-red-600 text-white shadow-lg scale-105"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                        }`}
                      >
                        <img
                          src={chain.icon}
                          alt={chain.name}
                          className="w-8 h-8 object-contain"
                        />
                        <span className="text-xs">{chain.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isMobileWalletUser && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3">选择钱包</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      let availableWallets = [
                        {
                          id: "metamask",
                          name: "MetaMask",
                          icon: "/icons/metamask.png",
                        },
                        {
                          id: "imtoken",
                          name: "imToken",
                          icon: "/icons/imtoken.png",
                        },
                        {
                          id: "tronlink",
                          name: "TronLink",
                          icon: "/icons/tronlink.png",
                        },
                      ];

                      if (selectedChain === "tron") {
                        availableWallets = [
                          {
                            id: "tronlink",
                            name: "TronLink",
                            icon: "/icons/tronlink.png",
                          },
                          {
                            id: "imtoken",
                            name: "imToken",
                            icon: "/icons/imtoken.png",
                          },
                        ];
                      } else if (
                        selectedChain === "ethereum" ||
                        selectedChain === "bsc"
                      ) {
                        availableWallets = [
                          {
                            id: "metamask",
                            name: "MetaMask",
                            icon: "/icons/metamask.png",
                          },
                          {
                            id: "imtoken",
                            name: "imToken",
                            icon: "/icons/imtoken.png",
                          },
                        ];
                      }

                      return availableWallets.map((wallet) => (
                        <button
                          key={wallet.id}
                          onClick={() => setSelectedWallet(wallet.id)}
                          className={`p-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center space-y-2 ${
                            selectedWallet === wallet.id
                              ? "bg-red-600 text-white shadow-lg scale-105"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                          }`}
                        >
                          <img
                            src={wallet.icon}
                            alt={wallet.name}
                            className="w-8 h-8 object-contain"
                          />
                          <span className="text-xs">{wallet.name}</span>
                        </button>
                      ));
                    })()}
                  </div>

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

              {!isMobileWalletUser && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3 text-center">
                    📱 移动端扫码支付
                  </h3>
                  <div className="flex justify-center">
                    {qrCodeData ? (
                      <QRCode value={qrCodeData} size={200} />
                    ) : (
                      <div className="w-[200px] h-[200px] bg-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-sm">
                          QR码生成中...
                        </span>
                      </div>
                    )}
                  </div>

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

                  {selectedWallet === "imtoken" && (
                    <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-center">
                      <p className="text-blue-300 text-xs">
                        💡 imToken 是通用钱包，请使用移动端扫描二维码
                      </p>
                    </div>
                  )}

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

              {!isMobileWalletUser && needsBrowserWallet && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-3">
                    桌面端钱包连接
                  </h3>

                  {!isConnected ? (
                    <button
                      onClick={connectWallet}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                    >
                      <img
                        src={
                          selectedWallet === "metamask"
                            ? "/icons/metamask.png"
                            : "/icons/tronlink.png"
                        }
                        alt={
                          selectedWallet === "metamask"
                            ? "MetaMask"
                            : "TronLink"
                        }
                        className="w-6 h-6 object-contain"
                      />
                      <span>
                        🔗 连接{" "}
                        {selectedWallet === "metamask"
                          ? "MetaMask"
                          : "TronLink"}{" "}
                        钱包
                      </span>
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

              {isMobileWalletUser && (
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <div className="text-center text-blue-300">
                    <div className="text-lg mb-2">📱</div>
                    <p className="font-medium">在钱包内支付</p>
                    <p className="text-sm text-blue-400 mt-1">
                      您正在使用 {selectedWallet} 钱包，请在钱包内完成支付操作
                    </p>

                    <div className="mt-4">
                      <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-center">
                        <p className="text-yellow-300 text-xs">
                          ⚠️ 请确保您的钱包中有足够的 {payment.amount} USDT
                          和网络费用
                        </p>
                      </div>

                      <button
                        onClick={handleMobileWalletPayment}
                        disabled={isMobilePaymentProcessing}
                        className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 ${
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
                          <>
                            <img
                              src={
                                selectedWallet === "metamask"
                                  ? "/icons/metamask.png"
                                  : selectedWallet === "tronlink"
                                  ? "/icons/tronlink.png"
                                  : selectedWallet === "imtoken"
                                  ? "/icons/imtoken.png"
                                  : "/icons/metamask.png"
                              }
                              alt={selectedWallet}
                              className="w-5 h-5 object-contain"
                            />
                            <span>💳 支付 {payment.amount} USDT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                      onApprovalComplete={() => {}}
                      onPaymentComplete={handlePaymentComplete}
                      onPaymentStart={() => setIsPaymentProcessing(true)}
                      onPaymentEnd={() => setIsPaymentProcessing(false)}
                    />
                  </div>
                )}
            </div>
          )}
        </main>

        <footer className="bg-gray-800 border-t border-gray-700 mt-4 py-3">
          <div className="text-center px-4">
            <p className="text-xs text-gray-400">
              © 2025 {t("payment.title")}平台
            </p>
          </div>
        </footer>
      </div>

      {isPaymentProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl max-w-md mx-4 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <span className="text-3xl">💳</span>
              </div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-red-400 rounded-full animate-spin"></div>
            </div>

            <h3 className="text-xl font-bold text-white mb-3">支付处理中...</h3>
            <p className="text-gray-300 mb-4">
              正在处理您的 {payment?.amount} USDT 支付
            </p>

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
