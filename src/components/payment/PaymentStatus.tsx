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
    <div className={cn("space-y-4", className)}>
      {/* Status Card - Compact */}
      <div className={cn("rounded-lg p-4 border", statusInfo.borderColor)}>
        <div className="flex items-center justify-center space-x-3 mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-xl",
              statusInfo.iconBg
            )}
          >
            {statusInfo.icon}
          </div>
          <div className="text-center">
            <h3 className={cn("text-lg font-bold", statusInfo.textColor)}>
              {statusInfo.title_cn}
            </h3>
            <p className="text-gray-400 text-sm">{statusInfo.message_cn}</p>
          </div>
        </div>
      </div>

      {/* Essential Payment Info - Compact */}
      {payment.status === "completed" && payment.tx_hash && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
          <div className="space-y-3">
            {/* Transaction Hash */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">交易哈希</span>
              <a
                href={
                  payment.chain
                    ? getExplorerUrl(payment.chain, payment.tx_hash)
                    : "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm font-mono bg-gray-700/50 px-2 py-1 rounded"
              >
                {payment.tx_hash.slice(0, 8)}...{payment.tx_hash.slice(-6)}
              </a>
            </div>

            {/* Network */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">网络</span>
              <span className="text-white text-sm capitalize">
                {payment.chain}
              </span>
            </div>

            {/* Wallet Address */}
            {payment.wallet_address && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">钱包地址</span>
                <span className="text-gray-300 text-sm font-mono">
                  {payment.wallet_address.slice(0, 6)}...
                  {payment.wallet_address.slice(-4)}
                </span>
              </div>
            )}
          </div>

          {/* Explorer Button */}
          <div className="mt-4">
            <a
              href={
                payment.chain
                  ? getExplorerUrl(payment.chain, payment.tx_hash)
                  : "#"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              在浏览器中查看
            </a>
          </div>
        </div>
      )}

      {/* Timestamps - Compact */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/30">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block">创建时间</span>
            <span className="text-gray-300">
              {new Date(payment.created_at).toLocaleDateString("zh-CN")}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block">过期时间</span>
            <span className="text-gray-300">
              {new Date(payment.expires_at).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
