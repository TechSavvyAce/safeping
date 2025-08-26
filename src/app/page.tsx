// =================================
// 🏠 首页 - USDT支付API平台
// =================================

"use client";

import React from "react";
import Link from "next/link";
import { CHAIN_CONFIG } from "@/config/chains";

export default function HomePage() {
  // Debug: Log blockchain configuration
  if (typeof window !== "undefined") {
    console.log("🔍 Blockchain Configuration Debug:", {
      networkMode: process.env.NEXT_PUBLIC_NETWORK_MODE,
      bsc: {
        paymentProcessor: CHAIN_CONFIG.bsc.paymentProcessor,
        usdt: CHAIN_CONFIG.bsc.usdt,
      },
      ethereum: {
        paymentProcessor: CHAIN_CONFIG.ethereum.paymentProcessor,
        usdt: CHAIN_CONFIG.ethereum.usdt,
      },
      tron: {
        paymentProcessor: CHAIN_CONFIG.tron.paymentProcessor,
        usdt: CHAIN_CONFIG.tron.usdt,
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">💳</div>
            <div>
              <h1 className="text-xl font-bold text-white">USDT多链支付平台</h1>
              <p className="text-sm text-gray-400">
                支持BSC、以太坊、波场网络的安全支付API
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            区块链支付API服务
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            提供简单、安全、可靠的USDT支付API接口，支持创建支付链接、状态查询、回调通知等功能
          </p>
        </div>

        {/* API Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-2xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              创建支付链接
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              通过API快速创建USDT支付链接，支持自定义金额和回调地址
            </p>
            <code className="text-xs text-green-400 bg-gray-900 px-2 py-1 rounded">
              POST /api/payment/create
            </code>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">状态查询</h3>
            <p className="text-gray-400 text-sm mb-4">
              实时查询支付状态，支持待支付、处理中、已完成、已失败等状态
            </p>
            <code className="text-xs text-blue-400 bg-gray-900 px-2 py-1 rounded">
              GET /api/payment/[id]/status
            </code>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-2xl mb-3">🔄</div>
            <h3 className="text-lg font-semibold text-white mb-2">自动回调</h3>
            <p className="text-gray-400 text-sm mb-4">
              支付状态变更时自动通知您的系统，确保业务流程及时响应
            </p>
            <code className="text-xs text-purple-400 bg-gray-900 px-2 py-1 rounded">
              POST /webhook/callback
            </code>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-2xl mb-3">🌐</div>
            <h3 className="text-lg font-semibold text-white mb-2">多链支持</h3>
            <p className="text-gray-400 text-sm mb-4">
              支持BSC、以太坊、波场三大主流区块链网络的USDT支付
            </p>
            <div className="flex space-x-2">
              <span className="text-xs text-yellow-400 bg-gray-900 px-2 py-1 rounded">
                BSC
              </span>
              <span className="text-xs text-blue-400 bg-gray-900 px-2 py-1 rounded">
                ETH
              </span>
              <span className="text-xs text-red-400 bg-gray-900 px-2 py-1 rounded">
                TRON
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/generate"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              生成支付链接
            </Link>

            <Link
              href="/api/health"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              API状态检查
            </Link>

            <Link
              href="/api/config"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              配置信息
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            API基地址: <code className="text-gray-300">/api/*</code>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              © 2025 USDT支付平台 - 安全 • 快速 • 可靠
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
