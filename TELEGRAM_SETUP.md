# 📱 Telegram Bot Notification Setup

This guide explains how to set up Telegram bot notifications for your crypto payment platform.

## 🚀 Quick Setup

### 1. Create a Telegram Bot

1. **Message @BotFather** on Telegram
2. **Send `/newbot`** command
3. **Choose a name** for your bot (e.g., "Crypto Payment Notifications")
4. **Choose a username** (e.g., "crypto_payment_bot")
5. **Save the bot token** - you'll need this for the `TELEGRAM_TOKEN` environment variable

### 2. Create a Channel

1. **Create a new channel** in Telegram
2. **Add your bot as an admin** to the channel
3. **Get the channel ID**:
   - Send a message to the channel
   - Forward that message to @userinfobot
   - The channel ID will be in the format `-100xxxxxxxxxx`

### 3. Environment Configuration

Add these variables to your `.env` file:

```bash
# Telegram Bot Configuration
TELEGRAM_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=-1002940840996
```

## 🔧 Configuration Details

### Environment Variables

| Variable              | Description                    | Example                                 |
| --------------------- | ------------------------------ | --------------------------------------- |
| `TELEGRAM_TOKEN`      | Your bot token from @BotFather | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `TELEGRAM_CHANNEL_ID` | Your channel ID                | `-1002940840996`                        |

### Bot Permissions

Make sure your bot has these permissions in the channel:

- ✅ Send Messages
- ✅ Send Media
- ✅ Add Reactions

## 📱 Notification Types

The system automatically sends notifications for:

### 1. Wallet Connection 🔗

```
🔗 Wallet Connected

💰 Wallet: MetaMask
🌐 Chain: ethereum
👤 Address: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
⏰ Time: 12/25/2024, 3:45:30 PM

#WalletConnect #ethereum #metamask
```

### 2. Token Approval Success ✅

```
✅ Token Approval Successful

💰 Wallet: MetaMask
🌐 Chain: ethereum
👤 Address: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
💎 Amount: 100 USDT
⏰ Time: 12/25/2024, 3:45:35 PM

#ApprovalSuccess #ethereum #USDT
```

### 3. Payment Completion 💰

```
📢 Payment Completed

💰 Payment of 50 USDT completed successfully!

👤 User: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
🌐 Chain: ethereum
💼 Wallet: metamask

#PaymentSuccess #ethereum #USDT
```

## 🧪 Testing

### Test the Integration

Run the test script to verify everything works:

```bash
npx tsx src/lib/test-telegram.ts
```

This will send test notifications to your channel.

### Manual Testing

You can also test by:

1. **Connecting a wallet** - should trigger connection notification
2. **Approving USDT** - should trigger approval notification
3. **Completing a payment** - should trigger payment notification

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Telegram notifications are disabled"

- Check that both `TELEGRAM_TOKEN` and `TELEGRAM_CHANNEL_ID` are set
- Verify the bot token is correct
- Ensure the bot is added to the channel

#### 2. "Telegram API error"

- Check bot permissions in the channel
- Verify channel ID format (should start with `-100`)
- Ensure bot is an admin in the channel

#### 3. No notifications received

- Check browser console for errors
- Verify network connectivity
- Test with the test script first

### Debug Mode

Enable debug logging by setting:

```bash
LOG_LEVEL=debug
```

## 🔒 Security Considerations

- **Never commit** your `.env` file to version control
- **Keep your bot token** private and secure
- **Use environment variables** for production deployments
- **Monitor bot usage** to prevent abuse

## 📚 API Reference

### TelegramService Methods

```typescript
// Check if service is enabled
telegramService.isEnabled(): boolean

// Get current configuration
telegramService.getConfig()

// Send wallet connection notification
telegramService.notifyWalletConnect(data: WalletConnectNotification)

// Send approval success notification
telegramService.notifyApproveSuccess(data: ApproveSuccessNotification)

// Send custom notification
telegramService.sendCustomNotification(title: string, content: string, tags?: string[])
```

## 🎯 Customization

### Modify Notification Format

Edit `src/lib/telegram.ts` to customize:

- Message templates
- Emoji usage
- Hashtag format
- Message structure

### Add New Notification Types

1. **Create new interface** for notification data
2. **Add new method** to TelegramService class
3. **Integrate** in your components/hooks

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your bot setup with @BotFather
3. Test with the provided test script
4. Check browser console for error messages

---

**Happy coding! 🚀**
