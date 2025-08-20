# 🚀 TRON Smart Contracts

Simple and clean TRON smart contract deployment for USDT payments.

## 📁 Files

- **Contracts:**

  - `TestUSDT.sol` - Test USDT token with unlimited minting
  - `PaymentProcessor.sol` - Main payment processing contract

- **Scripts:**
  - `deploy.cjs` - Deploy contracts to TRON testnet
  - `utils.cjs` - Utility functions (balance, mint, test)
  - `compile.cjs` - Compile Solidity contracts

## 🚀 Quick Start

### 1. Get Testnet TRX

```bash
# Check your balance first
node utils.cjs balance

# Get free TRX from: https://shasta.tronex.io
```

### 2. Deploy Contracts

```bash
# Deploy TestUSDT only
node deploy.cjs testusdt

# Deploy PaymentProcessor only
node deploy.cjs payment

# Deploy both contracts
node deploy.cjs all
```

### 3. Test & Use

```bash
# Mint test USDT tokens
node utils.cjs mint 10000

# Test payment flow
node utils.cjs test

# Check balances
node utils.cjs balance
```

## 📋 Contract Addresses (Shasta Testnet)

After deployment, addresses are saved in:

- `testusdt-deployment.json`
- `paymentprocessor-deployment.json`

**Current deployed contracts:**

- **TestUSDT**: `TRD7EjQNVwrnfkMijXtsWuY42jAqYVQL1m`
- **Treasury**: `TMcnTthQUo7mnpMYym9CFieNJedCn15vMT`

## 🔧 Configuration

Edit the config in `deploy.cjs` and `utils.cjs`:

```javascript
const config = {
  fullHost: "https://api.shasta.trongrid.io", // Testnet
  privateKey: "your_private_key_here",
  treasuryAddress: "your_treasury_address",
  testUSDTAddress: "deployed_testusdt_address",
};
```

## 🧪 Payment Flow

1. **Approve**: User approves contract to spend USDT
2. **Transfer**: Contract calls `transferFrom` to move USDT to treasury
3. **Record**: Payment is recorded on-chain

## 🌐 Network URLs

- **Testnet**: https://api.shasta.trongrid.io
- **Mainnet**: https://api.trongrid.io
- **Explorer**: https://shasta.tronscan.org

---

**Simple. Clean. Working.** ✨
