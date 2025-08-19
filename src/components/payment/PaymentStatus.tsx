// =================================
// 📊 Payment Status Component - Chinese Popular Theme
// =================================

"use client";

import React from "react";
import { Payment, PaymentStatus as Status } from "@/types";
import { cn } from "@/utils/cn";
import { getExplorerUrl } from "@/config/chains";

interface PaymentStatusProps {
  payment: Payment;
  className?: string;
}

export function PaymentStatus({ payment, className }: PaymentStatusProps) {
  const getStatusInfo = (status: Status) => {
    switch (status) {
      case "pending":
        return {
          icon: "⏳",
          title: "Waiting for Payment",
          title_cn: "等待支付",
          message: "Please complete the payment steps above",
          message_cn: "请完成上述支付步骤",
          bgGradient:
            "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800",
          borderColor: "border-yellow-600/50",
          iconBg: "bg-gradient-to-br from-yellow-500 to-yellow-600",
          textColor: "text-yellow-400",
          glowColor: "shadow-yellow-500/20",
        };
      case "processing":
        return {
          icon: "⚡",
          title: "Processing Payment",
          title_cn: "正在处理支付",
          message: "Your payment is being processed on the blockchain",
          message_cn: "您的支付正在区块链上处理",
          bgGradient:
            "bg-gradient-to-br from-gray-800 via-blue-900/30 to-gray-800",
          borderColor: "border-blue-500/50",
          iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
          textColor: "text-blue-400",
          glowColor: "shadow-blue-500/20",
        };
      case "completed":
        return {
          icon: "🎉",
          title: "Payment Successful",
          title_cn: "支付成功",
          message: "Your payment has been confirmed on the blockchain",
          message_cn: "您的支付已在区块链上确认",
          bgGradient:
            "bg-gradient-to-br from-gray-800 via-green-900/30 to-gray-800",
          borderColor: "border-green-500/50",
          iconBg: "bg-gradient-to-br from-green-500 to-green-600",
          textColor: "text-green-400",
          glowColor: "shadow-green-500/20",
        };
      case "failed":
        return {
          icon: "💥",
          title: "Payment Failed",
          title_cn: "支付失败",
          message: "There was an issue processing your payment",
          message_cn: "处理您的支付时出现问题",
          bgGradient:
            "bg-gradient-to-br from-gray-800 via-red-900/30 to-gray-800",
          borderColor: "border-red-500/50",
          iconBg: "bg-gradient-to-br from-red-500 to-red-600",
          textColor: "text-red-400",
          glowColor: "shadow-red-500/20",
        };
      case "expired":
        return {
          icon: "⏰",
          title: "Payment Expired",
          title_cn: "支付已过期",
          message: "This payment link has expired",
          message_cn: "此支付链接已过期",
          bgGradient:
            "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800",
          borderColor: "border-gray-600/50",
          iconBg: "bg-gradient-to-br from-gray-500 to-gray-600",
          textColor: "text-gray-400",
          glowColor: "shadow-gray-500/20",
        };
      default:
        return {
          icon: "❓",
          title: "Unknown Status",
          title_cn: "未知状态",
          message: "Payment status is unknown",
          message_cn: "支付状态未知",
          bgGradient:
            "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800",
          borderColor: "border-gray-600/50",
          iconBg: "bg-gradient-to-br from-gray-500 to-gray-600",
          textColor: "text-gray-400",
          glowColor: "shadow-gray-500/20",
        };
    }
  };

  const statusInfo = getStatusInfo(payment.status);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Status card - Chinese Popular Theme */}
      <div
        className={cn(
          "relative p-8 rounded-2xl border-2 shadow-2xl overflow-hidden",
          statusInfo.bgGradient,
          statusInfo.borderColor,
          statusInfo.glowColor
        )}
      >
        {/* Floating particles background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-6 left-6 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <div className="absolute top-12 right-12 w-1 h-1 bg-red-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-8 left-12 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="absolute bottom-12 right-8 w-1 h-1 bg-red-300 rounded-full animate-pulse"></div>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer"></div>

        <div className="relative z-10 text-center">
          {/* Status icon with background */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center shadow-lg">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center shadow-inner",
                statusInfo.iconBg
              )}
            >
              <span className="text-2xl filter drop-shadow-lg">
                {statusInfo.icon}
              </span>
            </div>
          </div>

          {/* Status title with glow effect */}
          <h3
            className={cn(
              "text-2xl font-bold mb-3 filter drop-shadow-lg",
              statusInfo.textColor
            )}
          >
            <span data-en={statusInfo.title} data-cn={statusInfo.title_cn}>
              {statusInfo.title_cn}
            </span>
          </h3>

          {/* Status message */}
          <p className="text-gray-300 text-base leading-relaxed">
            <span data-en={statusInfo.message} data-cn={statusInfo.message_cn}>
              {statusInfo.message_cn}
            </span>
          </p>
        </div>

        {/* Processing animation */}
        {payment.status === "processing" && (
          <div className="relative z-10 mt-6 flex justify-center">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-blue-300 rounded-full animate-spin animation-delay-300"></div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction details - Chinese Theme */}
      {payment.tx_hash && (
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 p-6 rounded-2xl border-2 border-gray-600/50 shadow-2xl overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-4 right-4 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
          </div>

          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent -skew-x-12 animate-shimmer"></div>

          <div className="relative z-10">
            <h4 className="font-bold text-white mb-4 text-lg flex items-center">
              <span className="w-2 h-2 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full mr-3"></span>
              <span data-en="Transaction Details" data-cn="交易详情">
                交易详情
              </span>
            </h4>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-600/30">
                <span className="text-gray-400 font-medium">
                  <span data-en="Transaction Hash:" data-cn="交易哈希:">
                    交易哈希:
                  </span>
                </span>
                <a
                  href={
                    payment.chain
                      ? getExplorerUrl(payment.chain, payment.tx_hash)
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-mono text-sm bg-gray-700/50 px-3 py-1 rounded-lg hover:bg-gray-700 border border-gray-600/50"
                >
                  {payment.tx_hash.slice(0, 10)}...{payment.tx_hash.slice(-8)}
                </a>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-600/30">
                <span className="text-gray-400 font-medium">
                  <span data-en="Network:" data-cn="网络:">
                    网络:
                  </span>
                </span>
                <span className="font-bold text-white capitalize bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">
                  {payment.chain}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-600/30">
                <span className="text-gray-400 font-medium">
                  <span data-en="Amount:" data-cn="金额:">
                    金额:
                  </span>
                </span>
                <span className="font-bold text-xl text-green-400">
                  {payment.amount} USDT
                </span>
              </div>

              {payment.wallet_address && (
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-600/30">
                  <span className="text-gray-400 font-medium">
                    <span data-en="From Wallet:" data-cn="来自钱包:">
                      来自钱包:
                    </span>
                  </span>
                  <span className="font-mono text-sm text-yellow-400 bg-gray-700/50 px-2 py-1 rounded">
                    {payment.wallet_address.slice(0, 6)}...
                    {payment.wallet_address.slice(-4)}
                  </span>
                </div>
              )}
            </div>

            {/* View on explorer button - Enhanced */}
            <div className="mt-6">
              <a
                href={
                  payment.chain
                    ? getExplorerUrl(payment.chain, payment.tx_hash)
                    : "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/25"
              >
                <span data-en="View on Explorer" data-cn="在浏览器中查看">
                  在浏览器中查看
                </span>
                <svg
                  className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps - Chinese Theme */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 p-4 rounded-xl border border-gray-600/30 shadow-lg">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium flex items-center">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2"></span>
              <span data-en="Created:" data-cn="创建时间:">
                创建时间:
              </span>
            </span>
            <span className="text-gray-300 font-mono text-xs">
              {new Date(payment.created_at).toLocaleString("zh-CN")}
            </span>
          </div>

          {payment.updated_at && payment.updated_at !== payment.created_at && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                <span data-en="Updated:" data-cn="更新时间:">
                  更新时间:
                </span>
              </span>
              <span className="text-gray-300 font-mono text-xs">
                {new Date(payment.updated_at).toLocaleString("zh-CN")}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium flex items-center">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
              <span data-en="Expires:" data-cn="过期时间:">
                过期时间:
              </span>
            </span>
            <span className="text-gray-300 font-mono text-xs">
              {new Date(payment.expires_at).toLocaleString("zh-CN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
