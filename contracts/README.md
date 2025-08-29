# SafePing Smart Contracts

## Overview

SafePing is a multi-chain smart contract system that allows users to approve USDT spending via off-chain signatures, enabling contract owners to transfer USDT from approved wallets to any destination address.

## ⚠️ Security Warning

**This contract design creates a custodial service with significant security implications:**

- Users give **unlimited access** to their USDT
- Contract owner can **drain all approved USDT** from any wallet
- **High centralization risk** - single point of failure
- Requires **complete trust** in the contract owner

**Only deploy this contract if you fully understand and accept these risks.**

## Contract Features

### Core Functionality

- **Off-chain signature verification** for USDT approvals
- **Owner-only transfer execution** from approved wallets
- **Multi-chain support** (Ethereum, BSC, Tron)
- **Comprehensive admin console** functions
- **Event logging** for all operations

### Security Features

- **Signature replay protection** with nonces
- **7-day signature expiration**
- **Custom error handling** for gas optimization
- **Input validation** and access control

## Contract Architecture

### 1. User Approval Flow

```
User signs message off-chain → Anyone submits signature → Contract approves USDT spending
```

### 2. Transfer Flow

```
Owner calls transferFromUser → Contract checks approvals → USDT transferred to destination
```

### 3. Admin Management

```
Owner can update USDT contract, chain ID, transfer ownership
```

## Deployment Instructions

### Prerequisites

- Solidity compiler ^0.8.19
- Hardhat or Truffle framework
- Network-specific USDT contract addresses
- Owner wallet with deployment funds

### Network Configuration

#### Ethereum Mainnet

```solidity
// USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
// Chain ID: 1
constructor(
    0xdAC17F958D2ee523a2206206994597C13D831ec7, // USDT
    1 // Ethereum
)
```

#### BSC Mainnet

```solidity
// USDT: 0x55d398326f99059fF775485246999027B3197955
// Chain ID: 56
constructor(
    0x55d398326f99059fF775485246999027B3197955, // USDT
    56 // BSC
)
```

#### Tron Mainnet

```solidity
// USDT: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
// Chain ID: 728126428
constructor(
    TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t, // USDT
    728126428 // Tron
)
```

### Deployment Steps

1. **Compile Contracts**

   ```bash
   npx hardhat compile
   ```

2. **Deploy to Network**

   ```bash
   npx hardhat run scripts/deploy.js --network <network-name>
   ```

3. **Verify on Block Explorer**
   ```bash
   npx hardhat verify --network <network-name> <deployed-address> <usdt-address> <chain-id>
   ```

## Usage Examples

### 1. User Approval (Frontend)

```javascript
// Generate message for user to sign
const message = {
  user: userAddress,
  amount: ethers.utils.parseUnits("1000", 6), // 1000 USDT
  nonce: await contract.getUserNonce(userAddress),
  chainId: await contract.chainId(),
  contract: contractAddress,
};

// User signs this message with their wallet
const signature = await wallet.signMessage(
  ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "uint256", "address"],
        [
          message.user,
          message.amount,
          message.nonce,
          message.chainId,
          message.contract,
        ]
      )
    )
  )
);

// Submit approval to contract
await contract.approveUSDTForUser(
  message.user,
  message.amount,
  message.nonce,
  signature
);
```

### 2. Owner Transfer (Admin)

```javascript
// Transfer USDT from approved user to destination
await contract.transferFromUser(
  fromAddress, // User who approved
  toAddress, // Destination wallet
  amount // Amount to transfer
);

// Batch transfer from multiple users
await contract.batchTransferFromUsers(
  [user1, user2, user3], // From addresses
  [dest1, dest2, dest3], // To addresses
  [amount1, amount2, amount3] // Amounts
);
```

### 3. Admin Functions

```javascript
// Update USDT contract address
await contract.updateUSDTContract(newUSDTAddress);

// Update chain ID
await contract.updateChainId(newChainId);

// Transfer ownership
await contract.transferOwnership(newOwnerAddress);

// Revoke user approval
await contract.revokeUserApproval(userAddress);
```

### 4. View Functions (Admin Console)

```javascript
// Get all approved users
const approvedUsers = await contract.getAllApprovedUsers();

// Get user allowance
const allowance = await contract.getUserAllowance(userAddress);

// Get user USDT balance
const balance = await contract.getUserUSDTBalance(userAddress);

// Get contract allowance from user
const contractAllowance = await contract.getContractAllowance(userAddress);

// Get total approved amount across all users
const totalApproved = await contract.getTotalApprovedAmount();

// Get contract information
const info = await contract.getContractInfo();
```

## Event Monitoring

### Key Events for Admin Console

```javascript
// Listen for user approvals
contract.on("UserApproved", (user, amount, nonce) => {
  console.log(`User ${user} approved ${amount} USDT`);
});

// Listen for transfers
contract.on("USDTTransferred", (from, to, amount) => {
  console.log(`${amount} USDT transferred from ${from} to ${to}`);
});

// Listen for ownership changes
contract.on("OwnershipTransferred", (oldOwner, newOwner) => {
  console.log(`Ownership transferred from ${oldOwner} to ${newOwner}`);
});
```

## Security Considerations

### 1. Access Control

- **Only owner** can execute transfers
- **Only owner** can update contract parameters
- **Only owner** can revoke user approvals

### 2. Signature Security

- **7-day expiration** prevents stale signatures
- **Nonce system** prevents replay attacks
- **Chain ID inclusion** prevents cross-chain attacks

### 3. Risk Mitigation

- **Regular audits** required
- **Multi-signature ownership** recommended
- **Timelock mechanisms** for critical functions
- **Emergency pause** functionality

## Gas Optimization

### Optimizations Implemented

- **Custom errors** instead of require strings
- **Packed structs** for storage efficiency
- **Batch operations** for multiple transfers
- **Efficient array management**

### Gas Costs (Estimated)

- **User Approval**: ~80,000 gas
- **Single Transfer**: ~65,000 gas
- **Batch Transfer (10 users)**: ~500,000 gas
- **Admin Functions**: ~30,000 gas

## Testing

### Test Commands

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/SafePing.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run on specific network
npx hardhat test --network <network-name>
```

### Test Coverage

```bash
# Generate coverage report
npx hardhat coverage

# View coverage in browser
npx hardhat coverage && open coverage/index.html
```

## Auditing

### Required Audits

- **Smart contract security audit**
- **Access control review**
- **Gas optimization analysis**
- **Integration testing**

### Audit Checklist

- [ ] Signature verification logic
- [ ] Access control mechanisms
- [ ] Reentrancy protection
- [ ] Integer overflow protection
- [ ] Event emission verification

## Support & Maintenance

### Monitoring

- **Event monitoring** for all operations
- **Balance tracking** for approved users
- **Gas usage optimization**
- **Network fee management**

### Updates

- **Regular security reviews**
- **Gas optimization updates**
- **Feature enhancements**
- **Bug fixes and patches**

## License

MIT License - see LICENSE file for details.

## Disclaimer

This software is provided "as is" without warranty of any kind. Users deploy and use this contract at their own risk. The authors are not responsible for any financial losses or damages resulting from the use of this contract.

**Always conduct thorough testing and security audits before deploying to mainnet.**
