const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * Generate a new wallet for BSC mainnet deployment
 * This script creates a new wallet with private key and address
 * WARNING: Keep the private key secure and never share it!
 */
async function generateWallet() {
  console.log("🔐 Generating new wallet for BSC mainnet deployment...");
  console.log("=".repeat(60));

  // Generate a new random wallet (using ethers directly, not hardhat)
  const wallet = ethers.Wallet.createRandom();

  // Get wallet details
  const address = wallet.address;
  const privateKey = wallet.privateKey;
  const mnemonic = wallet.mnemonic.phrase;

  // Save wallet info to file (without private key for security)
  const publicWalletInfo = {
    address: address,
    network: "BSC Mainnet",
    chainId: 56,
    currency: "BNB",
    generatedAt: new Date().toISOString(),
    notes: {
      security: [
        "NEVER share your private key with anyone",
        "Store your mnemonic phrase securely offline",
        "Consider using a hardware wallet for large amounts",
        "This wallet needs BNB for gas fees to deploy contracts",
      ],
      usage: [
        "Add private key to .env file as PRIVATE_KEY",
        "Fund this address with BNB before deployment",
        "Minimum 0.05-0.1 BNB recommended for deployment",
        "Use this address as treasury or create separate treasury",
      ],
    },
  };

  // Save public info to file
  const walletFile = path.join(__dirname, "generated-wallet-info.json");
  fs.writeFileSync(walletFile, JSON.stringify(publicWalletInfo, null, 2));

  // Security warnings
  console.log("⚠️  IMPORTANT SECURITY NOTES:");
  console.log("   1. NEVER commit private key to version control");
  console.log("   2. Store mnemonic phrase securely offline");
  console.log("   3. Consider using hardware wallet for production");
  console.log("   4. This wallet needs BNB for gas fees");
  console.log("");

  // Next steps
  console.log("🚀 Next Steps:");
  console.log("   1. Fund this address with BNB:");
  console.log(`      ${address}`);
  console.log("   2. Add to .env file:");
  console.log(`      PRIVATE_KEY=${privateKey}`);
  console.log(`      TREASURY_ADDRESS=${address}  # or use different treasury`);
  console.log("   3. Minimum BNB needed: 0.05-0.1 BNB");
  console.log("   4. Run deployment: npm run deploy");
  console.log("");

  // Check current BSC prices for funding reference
  console.log("💰 Funding Reference:");
  console.log("   - Deployment cost: ~0.05-0.07 BNB (~$42-60 USD)");
  console.log("   - Recommended balance: 0.1 BNB for safety");
  console.log("   - Buy BNB on: Binance, Coinbase, or other exchanges");
  console.log("");

  console.log("💾 Wallet info (without private key) saved to:");
  console.log("  ", walletFile);
  console.log("");

  // Create sample .env content
  const envContent = `# BSC Mainnet Deployment Configuration
# Generated on ${new Date().toISOString()}

# Deployer wallet private key (keep secure!)
PRIVATE_KEY=${privateKey}

# Treasury address (can be same as deployer or different)
TREASURY_ADDRESS=${address}

# BSC API key for contract verification (get from bscscan.com)
BSC_API_KEY=5P9KJ277JBMI3IH4BW6VS5HPB5M9BIXRQP

# Enable gas reporting (optional)
REPORT_GAS=false

# Network settings (pre-configured)
NETWORK=bscMainnet
`;

  // Save .env template
  const envFile = path.join(__dirname, "..", ".env.generated");
  fs.writeFileSync(envFile, envContent);

  console.log("📄 Generated .env template saved to:");
  console.log("  ", envFile);
  console.log("");
  console.log("⚠️  Remember to:");
  console.log("   - Copy .env.generated to .env");
  console.log("   - Add your BSCScan API key");
  console.log("   - Fund the wallet with BNB");
  console.log("");

  return {
    address,
    privateKey,
    mnemonic,
    walletFile,
    envFile,
  };
}

/**
 * Check BNB balance of an address
 */
async function checkBalance(address) {
  try {
    console.log(`💰 Checking BNB balance for ${address}...`);

    // Note: This requires a network connection and RPC endpoint
    // For offline generation, skip balance check
    console.log("   (Balance check requires network connection)");
    console.log(
      "   Check balance manually at: https://bscscan.com/address/" + address
    );
  } catch (error) {
    console.log("   Could not check balance:", error.message);
    console.log("   Check manually at: https://bscscan.com/address/" + address);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("🌟 BSC Mainnet Wallet Generator");
    console.log("━".repeat(60));

    const result = await generateWallet();

    console.log("🎉 Wallet generation completed successfully!");
    console.log("");
    console.log("🔗 Useful Links:");
    console.log("   BSCScan:", `https://bscscan.com/address/${result.address}`);
    console.log("   Buy BNB:", "https://www.binance.com");
    console.log("   BSC Bridge:", "https://www.binance.org/bridge");
    console.log("");
    console.log("🛡️  Keep your private key and mnemonic secure!");
  } catch (error) {
    console.error("❌ Error generating wallet:", error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  generateWallet,
  checkBalance,
};

// Run if called directly
if (require.main === module) {
  main();
}
