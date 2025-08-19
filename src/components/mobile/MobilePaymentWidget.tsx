// =================================
// 📱 Mobile Payment Widget
// =================================

"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PaymentQR } from "@/components/ui/QRCode";
import { NetworkIndicator } from "@/components/ui/NetworkIndicator";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { PaymentTimer } from "@/components/payment/PaymentTimer";
import { PaymentStatus } from "@/components/payment/PaymentStatus";
import { Payment } from "@/types";
import { cn } from "@/utils/cn";

interface MobilePaymentWidgetProps {
  payment: Payment;
  onExpire?: () => void;
  className?: string;
}

export function MobilePaymentWidget({
  payment,
  onExpire,
  className,
}: MobilePaymentWidgetProps) {
  const { t } = useTranslation();
  const [showQR, setShowQR] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detect if user is on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (payment.status !== "pending") {
    return (
      <div className={cn("w-full", className)}>
        <PaymentStatus payment={payment} />
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {/* Mobile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-t-xl p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-xl">💳</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("payment.title")}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <NetworkIndicator variant="minimal" />
            <LanguageSwitcher variant="dropdown" />
          </div>
        </div>

        {/* Service Info */}
        <div className="text-center">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {payment.service_name_cn || payment.service_name}
          </h3>
          {(payment.description_cn || payment.description) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {payment.description_cn || payment.description}
            </p>
          )}
        </div>

        {/* Amount - Chinese style */}
        <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl text-center border-2 border-red-100 dark:border-red-800 shadow-lg">
          <div className="text-3xl font-bold text-gradient-success mb-1">
            💰 {payment.amount}{" "}
            <span className="text-xl text-gradient-money">USDT</span>
          </div>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {t("payment.amount")} • 数字货币支付
          </p>
          <div className="flex justify-center space-x-2 mt-2">
            <span className="badge-wechat text-xs">安全支付</span>
            <span className="badge-alipay text-xs">实时到账</span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <PaymentTimer
          expiresAt={payment.expires_at}
          onExpire={onExpire}
          compact={true}
        />
      </div>

      {/* Payment Options Toggle - Chinese style */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-2 shadow-inner">
          <button
            onClick={() => setShowQR(true)}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center space-x-2",
              showQR
                ? "bg-gradient-to-r from-orange-400 to-red-400 text-white shadow-lg transform scale-105"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50"
            )}
          >
            <span className="text-lg">📱</span>
            <span>扫码支付</span>
          </button>
          <button
            onClick={() => setShowQR(false)}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center space-x-2",
              !showQR
                ? "bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg transform scale-105"
                : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50"
            )}
          >
            <span className="text-lg">🔗</span>
            <span>钱包连接</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-b-xl p-4">
        {showQR ? (
          <div className="text-center">
            {/* QR Code */}
            <div
              className={cn(
                "relative",
                isFullscreen &&
                  "fixed inset-0 z-50 bg-white dark:bg-gray-900 flex items-center justify-center"
              )}
            >
              {isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="absolute top-4 right-4 z-10 bg-gray-100 dark:bg-gray-800 rounded-full p-2 text-gray-600 dark:text-gray-400"
                >
                  ✕
                </button>
              )}

              <PaymentQR
                paymentId={payment.id}
                amount={payment.amount}
                description={payment.service_name}
                className={cn("border-none", isFullscreen ? "scale-150" : "")}
              />
            </div>

            {!isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                🔍 Enlarge QR Code
              </button>
            )}

            {/* Mobile Instructions - Enhanced Chinese style */}
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-md">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-xl mr-2">📱</span>
                手机支付步骤：
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-red-400 rounded-full text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    打开您的数字钱包APP
                  </span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-red-400 rounded-full text-white text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    扫描上方二维码
                  </span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-red-400 rounded-full text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    确认并完成支付
                  </span>
                </div>
              </div>

              {/* Quick tip */}
              <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border-l-4 border-yellow-400">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                  💡 支持微信、支付宝等主流钱包扫码支付
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {/* Wallet Connection Guide - Enhanced Chinese style */}
            <div className="space-y-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center">
                <span className="text-2xl mr-2">🔗</span>
                连接数字钱包直接支付
              </div>

              {/* Wallet Options */}
              <div className="space-y-3">
                {[
                  {
                    name: "MetaMask",
                    nameZH: "小狐狸钱包",
                    icon: "🦊",
                    chains: ["BSC", "Ethereum"],
                    color: "from-orange-400 to-red-400",
                  },
                  {
                    name: "TronLink",
                    nameZH: "波场钱包",
                    icon: "🔗",
                    chains: ["TRON"],
                    color: "from-red-500 to-pink-500",
                  },
                  {
                    name: "ImToken",
                    nameZH: "数字钱包",
                    icon: "💰",
                    chains: ["Multi-chain"],
                    color: "from-blue-500 to-cyan-500",
                  },
                ].map((wallet) => (
                  <div
                    key={wallet.name}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 rounded-2xl border-2 border-gray-100 dark:border-gray-600 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 bg-gradient-to-r ${wallet.color} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}
                      >
                        {wallet.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                          {wallet.nameZH}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {wallet.name} • {wallet.chains.join("、")}
                        </div>
                        <div className="flex space-x-1 mt-1">
                          {wallet.chains.map((chain) => (
                            <span
                              key={chain}
                              className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
                            >
                              {chain}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl text-gradient transform group-hover:translate-x-1 transition-transform">
                      →
                    </div>
                  </div>
                ))}
              </div>

              {/* Alternative QR Suggestion */}
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl border-l-4 border-yellow-400 shadow-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  💡 <strong>小贴士：</strong>
                  使用扫码支付更快捷，支持主流钱包APP
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment ID */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t("payment.id")}: {payment.id}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Detection Hook
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
