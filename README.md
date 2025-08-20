# 🚀 Crypto Payment Platform

A **production-ready, professional-grade cryptocurrency payment platform** built with Next.js 14, supporting secure USDT payments across multiple blockchain networks.

[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-green)](#)

## ✨ Features

### 💳 **Multi-Chain Payment Support**

- **BSC (Binance Smart Chain)** - Fast and low-cost payments
- **Ethereum** - Maximum security and liquidity
- **TRON** - Energy-efficient transactions
- **USDT Token Support** across all networks

### 🔒 **Enterprise Security**

- Rate limiting and DDoS protection
- Input validation and sanitization
- Secure headers and CSRF protection
- Environment-based configuration management
- Professional logging and monitoring

### 🌐 **Professional UI/UX**

- Beautiful, intuitive payment interface
- Mobile-first responsive design
- QR code support for mobile payments
- Multi-language support (English/Chinese)
- Dark mode throughout the application

### 🛠 **Developer Experience**

- Type-safe development with TypeScript
- Comprehensive testing framework
- Hot reloading and development tools
- Professional project structure
- Extensive documentation

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later

### Development Setup

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
   # Edit .env.local with your configuration
   ```

4. **Initialize database**

   ```bash
   npm run db:migrate
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

### Production Deployment

For production deployment, see our comprehensive guides:

- [🚀 Production Deployment Guide](PRODUCTION_GUIDE.md)
- [📋 Production Checklist](PRODUCTION_CHECKLIST.md)
- [🔧 Mainnet Deployment](DEPLOYMENT_CHECKLIST.md)

**Quick Node.js deployment:**

```bash
# Deploy with Node.js
./scripts/deploy.sh

# Check health
curl http://localhost:3000/api/health
```

## 📁 Project Structure

```
crypto-payment-nextjs/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/            # API routes
│   │   ├── generate/       # Payment generation
│   │   └── pay/           # Payment processing
│   ├── components/         # React components
│   │   ├── payment/       # Payment-specific components
│   │   ├── mobile/        # Mobile-optimized components
│   │   └── ui/           # Reusable UI components
│   ├── lib/               # Core libraries
│   │   ├── blockchain.ts  # Blockchain service
│   │   ├── database.ts    # Database layer
│   │   ├── wallet.ts      # Wallet management
│   │   └── logger.ts      # Logging system
│   ├── hooks/             # React hooks
│   ├── config/            # Configuration
│   └── types/             # TypeScript types
├── public/                # Static assets
├── scripts/               # Deployment scripts
├── data/                  # Database files
└── contracts/             # Smart contracts (external)
```

## 🔧 Configuration

### Environment Variables

Key environment variables for production:

```bash
# Network Mode
NEXT_PUBLIC_NETWORK_MODE=mainnet

# Security
WEBHOOK_SECRET=your-secure-secret
JWT_SECRET=your-jwt-secret

# Mainnet Contracts (deploy these first)
BSC_PAYMENT_PROCESSOR_MAINNET=0x...
ETHEREUM_PAYMENT_PROCESSOR_MAINNET=0x...
TRON_PAYMENT_PROCESSOR_MAINNET=TXyz...

# Treasury
TREASURY_ADDRESS=your-treasury-address
```

See [env.example](env.example) for complete configuration.

### Database Management

```bash
# Run migrations
npm run db:migrate

# Check status
npm run db:status

# Reset database (DANGER)
npm run db:reset
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📊 API Documentation

### Core Endpoints

| Endpoint                   | Method | Description            |
| -------------------------- | ------ | ---------------------- |
| `/api/health`              | GET    | System health check    |
| `/api/config`              | GET    | Frontend configuration |
| `/api/payment/create`      | POST   | Create new payment     |
| `/api/payment/[id]`        | GET    | Get payment details    |
| `/api/payment/[id]/status` | GET    | Payment status         |
| `/api/webhook`             | POST   | Test webhook endpoint  |

### Payment Flow

1. **Create Payment** → `POST /api/payment/create`
2. **Get Payment Details** → `GET /api/payment/{id}`
3. **User Selects Chain** → `PATCH /api/payment/{id}/update-chain`
4. **Process Payment** → `POST /api/payment/{id}/process`
5. **Monitor Status** → `GET /api/payment/{id}/status`

## 🔗 Blockchain Integration

### Supported Networks

| Network     | Chain ID | USDT Contract                                | Status   |
| ----------- | -------- | -------------------------------------------- | -------- |
| BSC Mainnet | 56       | `0x55d398326f99059fF775485246999027B3197955` | ✅ Ready |
| Ethereum    | 1        | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | ✅ Ready |
| TRON        | -        | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`         | ✅ Ready |

### Wallet Support

- **MetaMask** (BSC, Ethereum)
- **TronLink** (TRON)
- **ImToken** (All networks)
- **WalletConnect** (Coming soon)

## 🛡️ Security Features

- **Rate Limiting**: Configurable per endpoint
- **CORS Protection**: Origin validation
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **HTTPS Enforcement**: SSL/TLS required
- **Security Headers**: Comprehensive header set

## 📈 Performance

### Optimizations

- **Static Generation** where possible
- **Image Optimization** with Next.js
- **Bundle Optimization** with tree shaking
- **Database Indexing** for fast queries
- **Caching Strategies** for API responses

### Monitoring

- **Health Check Endpoints**: `/api/health`
- **Performance Tracking**: Response times
- **Error Monitoring**: Comprehensive logging
- **Database Metrics**: Query performance

## 🌍 Internationalization

Supported languages:

- **English** (en)
- **中文** (Chinese - zh)

Add new languages by extending `src/lib/i18n.ts`.

## 🚀 Node.js Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

Or use the deployment script:

```bash
./scripts/deploy.sh
```

Includes:

- Production build optimization
- Health checks
- Process management
- Logging and monitoring

## 📝 Scripts

| Script               | Description              |
| -------------------- | ------------------------ |
| `npm run dev`        | Start development server |
| `npm run build`      | Production build         |
| `npm run start`      | Start production server  |
| `npm run lint`       | Run ESLint               |
| `npm test`           | Run tests                |
| `npm run db:migrate` | Run database migrations  |
| `npm run deploy`     | Deploy to production     |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- [Production Guide](PRODUCTION_GUIDE.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Project Summary](PROJECT_SUMMARY.md)

### Getting Help

- Check the documentation first
- Search existing issues
- Create new issue with detailed description
- Join our community discussions

## 🎉 Success Stories

This platform is **production-ready** and handles:

- ✅ **Multi-chain payments** across BSC, Ethereum, TRON
- ✅ **Enterprise security** with comprehensive protection
- ✅ **Professional UI/UX** for user confidence
- ✅ **Scalable architecture** for business growth
- ✅ **Complete monitoring** for operational excellence

---

**Ready to launch your crypto payment platform?** 🚀

Start with the [Production Checklist](PRODUCTION_CHECKLIST.md) and follow the [Deployment Guide](PRODUCTION_GUIDE.md) for a smooth launch.
