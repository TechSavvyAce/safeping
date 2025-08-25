# 🚀 Crypto Payment Platform - Next.js

A comprehensive, production-ready cryptocurrency payment platform built with Next.js, supporting multiple blockchain networks with automatic transfer capabilities.

## ✨ Features

### 🔐 **Core Payment System**

- **Multi-Chain Support**: Ethereum, BSC, Tron networks
- **USDT Payments**: Secure USDT token processing
- **Smart Contracts**: Optimized payment processor contracts
- **Real-time Status**: Live payment tracking and updates

### 💰 **Auto-Transfer System** (NEW!)

- **Automatic Balance Management**: Monitors wallet balances continuously
- **Smart Transfers**: Automatically transfers funds when thresholds are met
- **Configurable Rules**: Set minimum balances, transfer amounts, and intervals
- **Admin Control**: Full control panel for managing auto-transfer settings
- **Transaction History**: Complete audit trail of all transfers

### 🏦 **Admin Dashboard**

- **Payment Management**: View, filter, and manage all payments
- **Wallet Monitoring**: Real-time balance tracking across all networks
- **Auto-Transfer Control**: Start/stop and configure auto-transfer service
- **Analytics**: Comprehensive payment statistics and reporting
- **Real-time Updates**: Live data refresh and notifications

### 🔔 **Notification System**

- **Telegram Integration**: Real-time payment and transfer notifications
- **Webhook Support**: Custom webhook endpoints for external integrations
- **Multi-level Alerts**: Info, warning, and error notifications

### 🛡️ **Security & Performance**

- **Rate Limiting**: Advanced API protection
- **Content Security Policy**: Secure resource loading
- **Database Migrations**: Version-controlled schema management
- **Health Monitoring**: Comprehensive system health checks
- **Error Handling**: Robust error handling and logging

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- SQLite (included)
- Blockchain wallet with testnet/mainnet access

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd crypto-payment-nextjs
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp env.example .env.local
```

4. **Update environment variables**

```env
# App Configuration
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_NETWORK_MODE="testnet"

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id"

# Telegram Bot (optional)
TELEGRAM_TOKEN="your_bot_token"
TELEGRAM_CHANNEL_ID="your_channel_id"

# Auto-Transfer Configuration
AUTO_TRANSFER_ENABLED="true"
AUTO_TRANSFER_MIN_BALANCE="100"
AUTO_TRANSFER_DESTINATION="your_destination_address"
AUTO_TRANSFER_INTERVAL_MINUTES="30"

# Admin Configuration
ADMIN_SECRET_KEY="your_admin_secret"
ADMIN_WALLET_ADDRESS="your_admin_wallet"
ADMIN_PRIVATE_KEY="your_private_key"

# Blockchain API Keys
ETHERSCAN_API_KEY="your_etherscan_key"
BSCSCAN_API_KEY="your_bscscan_key"
TRONGRID_API_KEY="your_trongrid_key"
```

5. **Run the development server**

```bash
npm run dev
```

6. **Access the application**

- **Frontend**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Health Check**: http://localhost:3000/api/health

## 🏗️ Architecture

### **Frontend Layer**

- **Next.js 14**: App Router with TypeScript
- **Tailwind CSS**: Modern, responsive UI design
- **Wallet Integration**: MetaMask, WalletConnect, TronLink support
- **Real-time Updates**: Live payment status and balance monitoring

### **Backend Layer**

- **API Routes**: RESTful API endpoints
- **Database**: SQLite with migration system
- **Blockchain Integration**: Multi-chain support with ethers.js
- **Auto-Transfer Service**: Automated wallet management

### **Smart Contracts**

- **PaymentProcessor**: Optimized payment processing
- **Multi-Chain**: Deployed on Ethereum, BSC, and Tron
- **Gas Optimization**: Efficient transaction handling
- **Security**: Audited and tested contracts

## 🔧 Configuration

### **Auto-Transfer Settings**

```typescript
// Configure automatic transfers
const config = {
  enabled: true,
  minBalance: 100, // Minimum USDT balance before transfer
  destinationAddress: "0x...", // Where to send funds
  intervalMinutes: 30, // Check frequency
  maxTransferAmount: 1000, // Maximum transfer per transaction
  gasLimit: 300000,
  gasPrice: "20000000000", // 20 Gwei
};
```

### **Supported Networks**

- **Ethereum**: Mainnet & Sepolia testnet
- **BSC**: Mainnet & BSC testnet
- **Tron**: Mainnet & Shasta testnet

### **Payment Flow**

1. **Create Payment**: Generate payment request with unique ID
2. **User Approval**: User approves USDT spending
3. **Payment Processing**: Smart contract processes payment
4. **Confirmation**: Transaction confirmed on blockchain
5. **Auto-Transfer**: Optional automatic fund consolidation

## 📊 Admin Dashboard

### **Payment Management**

- View all payments with filtering and search
- Update payment statuses
- Monitor payment statistics
- Handle expired payments automatically

### **Wallet Management**

- Real-time balance monitoring
- Multi-chain wallet support
- Payment history tracking
- Balance refresh capabilities

### **Auto-Transfer Control**

- Service status monitoring
- Start/stop auto-transfer service
- Configuration management
- Transfer history and logs

## 🔌 API Endpoints

### **Public APIs**

- `GET /api/health` - System health check
- `POST /api/payment/create` - Create new payment
- `GET /api/payment/[id]` - Get payment details
- `GET /api/payment/[id]/status` - Get payment status

### **Admin APIs**

- `GET /api/admin/payments` - List all payments
- `PUT /api/admin/payments/[id]/status` - Update payment status
- `GET /api/admin/wallet-balances` - Get wallet balances
- `GET /api/admin/auto-transfer` - Get auto-transfer status
- `POST /api/admin/auto-transfer` - Control auto-transfer service

### **Webhook**

- `POST /api/webhook` - Payment confirmation webhooks

## 🧪 Testing

### **Run Tests**

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### **Test Coverage**

- Unit tests for all components
- Integration tests for API endpoints
- Blockchain interaction tests
- Auto-transfer service tests

## 🚀 Deployment

### **Production Build**

```bash
npm run build
npm start
```

### **Environment Variables**

- Set `NODE_ENV=production`
- Configure production database
- Set secure admin credentials
- Configure production blockchain networks

### **Docker Support**

```bash
docker build -t crypto-payment .
docker run -p 3000:3000 crypto-payment
```

## 📈 Monitoring & Health

### **Health Checks**

- Database connectivity
- Auto-transfer service status
- Telegram service status
- System resource monitoring

### **Logging**

- Structured logging with levels
- Error tracking and reporting
- Performance monitoring
- Audit trail for all operations

## 🔒 Security Features

- **Rate Limiting**: API protection against abuse
- **CSP Headers**: Content Security Policy
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Secure rendering and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately

## 🎯 Roadmap

- [ ] **Multi-token Support**: Support for additional cryptocurrencies
- [ ] **Advanced Analytics**: Enhanced reporting and insights
- [ ] **Mobile App**: React Native mobile application
- [ ] **DeFi Integration**: Yield farming and staking features
- [ ] **Cross-chain Bridges**: Interoperability between networks

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies**
