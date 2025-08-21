// =================================
// 📱 Telegram Notification Demo Component
// =================================

"use client";

import React, { useState } from "react";
import { telegramService } from "@/lib/telegram";
import { cn } from "@/utils/cn";

export function TelegramDemo({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const config = telegramService.getConfig();

  const showMessage = (text: string, type: "success" | "error" | "info") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  const testWalletConnect = async () => {
    if (!config.isEnabled) {
      showMessage(
        "Telegram notifications are disabled. Please configure TELEGRAM_TOKEN and TELEGRAM_CHANNEL_ID in your .env file.",
        "error"
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await telegramService.notifyWalletConnect({
        walletType: "metamask",
        chain: "ethereum",
        userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        timestamp: new Date().toLocaleString(),
      });

      if (result) {
        showMessage(
          "✅ Wallet connection notification sent successfully! Check your Telegram channel.",
          "success"
        );
      } else {
        showMessage(
          "❌ Failed to send wallet connection notification.",
          "error"
        );
      }
    } catch (error: any) {
      showMessage(`❌ Error: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testApprovalSuccess = async () => {
    if (!config.isEnabled) {
      showMessage(
        "Telegram notifications are disabled. Please configure TELEGRAM_TOKEN and TELEGRAM_CHANNEL_ID in your .env file.",
        "error"
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await telegramService.notifyApproveSuccess({
        walletType: "metamask",
        chain: "ethereum",
        userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        amount: "100",
        token: "USDT",
        timestamp: new Date().toLocaleString(),
      });

      if (result) {
        showMessage(
          "✅ Approval success notification sent successfully! Check your Telegram channel.",
          "success"
        );
      } else {
        showMessage("❌ Failed to send approval notification.", "error");
      }
    } catch (error: any) {
      showMessage(`❌ Error: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testCustomNotification = async () => {
    if (!config.isEnabled) {
      showMessage(
        "Telegram notifications are disabled. Please configure TELEGRAM_TOKEN and TELEGRAM_CHANNEL_ID in your .env file.",
        "error"
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await telegramService.sendCustomNotification(
        "Demo Notification",
        "This is a test notification from the demo component! 🎉\n\nFeatures:\n• Wallet connection alerts\n• Approval success notifications\n• Custom payment notifications\n• Real-time blockchain activity tracking",
        ["Demo", "Test", "Integration"]
      );

      if (result) {
        showMessage(
          "✅ Custom notification sent successfully! Check your Telegram channel.",
          "success"
        );
      } else {
        showMessage("❌ Failed to send custom notification.", "error");
      }
    } catch (error: any) {
      showMessage(`❌ Error: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "p-6 bg-gray-900/50 border border-gray-700 rounded-xl",
        className
      )}
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          📱 Telegram Notifications Demo
        </h3>
        <p className="text-gray-400 text-sm">
          Test the Telegram integration by sending sample notifications
        </p>
      </div>

      {/* Status Display */}
      <div className="mb-6 p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Status:</span>
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                config.isEnabled ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                config.isEnabled ? "text-green-400" : "text-red-400"
              )}
            >
              {config.isEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {config.isEnabled ? (
          <div className="mt-2 text-xs text-gray-500">
            Channel ID: {config.channelId}
          </div>
        ) : (
          <div className="mt-2 text-xs text-red-400">
            Configure TELEGRAM_TOKEN and TELEGRAM_CHANNEL_ID in your .env file
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="space-y-3">
        <button
          onClick={testWalletConnect}
          disabled={!config.isEnabled || isLoading}
          className={cn(
            "w-full px-4 py-3 rounded-lg font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            config.isEnabled && !isLoading
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </span>
          ) : (
            "🔗 Test Wallet Connection"
          )}
        </button>

        <button
          onClick={testApprovalSuccess}
          disabled={!config.isEnabled || isLoading}
          className={cn(
            "w-full px-4 py-3 rounded-lg font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-green-500",
            config.isEnabled && !isLoading
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </span>
          ) : (
            "✅ Test Approval Success"
          )}
        </button>

        <button
          onClick={testCustomNotification}
          disabled={!config.isEnabled || isLoading}
          className={cn(
            "w-full px-4 py-3 rounded-lg font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-purple-500",
            config.isEnabled && !isLoading
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </span>
          ) : (
            "📢 Test Custom Notification"
          )}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={cn(
            "mt-4 p-3 rounded-lg border text-sm",
            messageType === "success" &&
              "bg-green-900/30 border-green-700 text-green-300",
            messageType === "error" &&
              "bg-red-900/30 border-red-700 text-red-300",
            messageType === "info" &&
              "bg-blue-900/30 border-blue-700 text-blue-300"
          )}
        >
          {message}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          💡 Check your Telegram channel for the test notifications
        </p>
        <p className="text-xs text-gray-500 mt-1">
          🔧 Run{" "}
          <code className="bg-gray-800 px-1 py-0.5 rounded">
            npm run telegram:setup
          </code>{" "}
          to configure
        </p>
      </div>
    </div>
  );
}
