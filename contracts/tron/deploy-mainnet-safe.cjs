const TronWeb = require("tronweb");
const { compileContract } = require("./compile.cjs");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// MAINNET Configuration (based on working testnet version)
const config = {
  fullHost: "https://api.trongrid.io", // MAINNET
  privateKey: process.env.TRON_PRIVATE_KEY || "",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Real TRON USDT (6 decimals)
};

// Validate configuration
function validateConfig() {
  console.log("🔍 Checking mainnet configuration...");
  console.log("Private key present:", !!config.privateKey);
  console.log("Treasury address present:", !!config.treasuryAddress);

  if (!config.privateKey) {
    throw new Error("❌ Please set TRON_PRIVATE_KEY in your .env file");
  }
  if (!config.treasuryAddress) {
    throw new Error("❌ Please set TREASURY_ADDRESS in your .env file");
  }
  if (!TronWeb.isAddress(config.treasuryAddress)) {
    throw new Error(
      "❌ Invalid treasury address format: " + config.treasuryAddress
    );
  }

  console.log("✅ Mainnet configuration validated");
}

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

// Deploy PaymentProcessorOptimized contract on MAINNET
async function deployPaymentProcessorMainnet() {
  try {
    console.log("🚀 Starting MAINNET deployment...");
    console.log("⚠️  WARNING: REAL MONEY! This will cost TRX!");
    console.log("💰 Based on testnet: Expected cost ~0-300 TRX");

    validateConfig();

    // Compile the contract
    console.log("📝 Compiling PaymentProcessorOptimized...");
    const artifact = await compileContract("PaymentProcessorOptimized");
    console.log("✅ Contract compiled successfully");
    console.log("📊 Bytecode size:", artifact.bytecode.length / 2, "bytes");

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);

    console.log("🔐 Deployer:", deployerAddress);
    console.log("🏦 Treasury:", config.treasuryAddress);
    console.log("🪙 TRON USDT:", config.usdtAddress);
    console.log("🌐 Network: TRON Mainnet");

    // Check mainnet balance
    const startBalance = await tronWeb.trx.getBalance(deployerAddress);
    const startTrx = tronWeb.fromSun(startBalance);
    console.log("💰 Starting TRX Balance:", startTrx, "TRX");

    // Safety check
    if (parseFloat(startTrx) < 300) {
      console.log("❌ INSUFFICIENT TRX FOR SAFE DEPLOYMENT!");
      console.log("   Current:", startTrx, "TRX");
      console.log("   Required: 300+ TRX for safety");
      console.log("   💡 Get more TRX or stake for energy first");
      throw new Error("Insufficient TRX balance for deployment");
    }

    // Check account resources
    console.log("\n🔋 Checking mainnet resources...");
    const accountResources = await tronWeb.trx.getAccountResources(
      deployerAddress
    );
    const energyLimit = accountResources.EnergyLimit || 0;
    const energyUsed = accountResources.EnergyUsed || 0;
    const availableEnergy = energyLimit - energyUsed;

    console.log("⚡ Available Energy:", availableEnergy);
    console.log(
      "📶 Available Bandwidth:",
      (accountResources.freeNetLimit || 0) - (accountResources.freeNetUsed || 0)
    );

    if (availableEnergy > 100000) {
      console.log("✅ Good energy available - deployment will be cheaper!");
    } else {
      console.log("⚠️  No staked energy - will burn TRX for deployment");
    }

    // Safe fee limit - enough for deployment but not excessive
    const safeFeeLimit = 300000000; // 300 TRX maximum

    console.log("\n⏳ Deploying on MAINNET...");
    console.log("📋 Deployment parameters:");
    console.log("   Treasury:", config.treasuryAddress);
    console.log("   USDT:", config.usdtAddress);
    console.log("   Fee limit: 300 TRX (safe maximum)");

    console.log("🔧 Debug info:");
    console.log("   - ABI length:", artifact.abi.length);
    console.log("   - Bytecode length:", artifact.bytecode.length);
    console.log("   - Fee limit (SUN):", safeFeeLimit);

    // Test connection
    const networkInfo = await tronWeb.trx.getCurrentBlock();
    console.log(
      "✅ Connected to mainnet, block:",
      networkInfo.block_header.raw_data.number
    );

    // Record exact time
    const deployStart = Date.now();

    // Deploy with the same structure as working testnet
    const contract = await tronWeb.contract().new({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      feeLimit: safeFeeLimit, // 300 TRX maximum
      callValue: 0,
      userFeePercentage: 100,
      parameters: [config.treasuryAddress, config.usdtAddress],
    });

    const deployEnd = Date.now();

    console.log("✅ MAINNET DEPLOYMENT SUCCESSFUL!");
    console.log("📍 Contract Address:", contract.address);
    console.log(
      "⏱️  Deployment time:",
      (deployEnd - deployStart) / 1000,
      "seconds"
    );
    console.log(
      "🔗 TRONSCAN:",
      `https://tronscan.org/#/contract/${contract.address}`
    );

    // Check final balance and calculate actual cost
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for balance to update
    const endBalance = await tronWeb.trx.getBalance(deployerAddress);
    const endTrx = tronWeb.fromSun(endBalance);
    const actualCost = parseFloat(startTrx) - parseFloat(endTrx);

    console.log("\n💰 ACTUAL DEPLOYMENT COST:");
    console.log("=".repeat(50));
    console.log("   Starting balance:", startTrx, "TRX");
    console.log("   Final balance:", endTrx, "TRX");
    console.log("   🎯 ACTUAL COST:", actualCost.toFixed(6), "TRX");
    console.log("   💰 Remaining:", endTrx, "TRX");
    console.log("=".repeat(50));

    // Verify the deployment
    console.log("\n🔸 Verifying mainnet deployment...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const owner = await contract.owner().call();
      console.log("✅ Contract owner:", owner);

      const treasury = await contract.treasury().call();
      console.log("✅ Treasury address:", treasury);

      const usdt = await contract.USDT().call();
      console.log("✅ USDT address:", usdt);

      console.log("✅ Contract is fully functional!");
    } catch (error) {
      console.log(
        "⚠️  Verification failed (may need time to propagate):",
        error.message
      );
    }

    // Test basic functionality
    console.log("\n🔸 Testing basic functionality...");
    try {
      const allowanceCheck = await contract
        .checkAllowance(deployerAddress, 1000000)
        .call();
      console.log("✅ Allowance check function works:", allowanceCheck);

      const userBalance = await contract.getUserBalance(deployerAddress).call();
      console.log(
        "✅ Balance check function works. Balance:",
        (userBalance / Math.pow(10, 6)).toFixed(6),
        "USDT"
      );
    } catch (error) {
      console.log("⚠️  Basic functionality test failed:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
      network: "TRON Mainnet",
      contractName: "PaymentProcessorOptimized",
      contractAddress: contract.address,
      deployerAddress: deployerAddress,
      treasuryAddress: config.treasuryAddress,
      usdtAddress: config.usdtAddress,
      deploymentTime: new Date().toISOString(),
      actualCost: actualCost,
      startingBalance: startTrx,
      finalBalance: endTrx,
      explorerUrl: `https://tronscan.org/#/contract/${contract.address}`,
    };

    const filename = `mainnet-deployment-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(__dirname, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🎉 MAINNET DEPLOYMENT COMPLETE!");
    console.log("=".repeat(70));
    console.log("🌐 Network: TRON Mainnet");
    console.log("📜 Contract: PaymentProcessorOptimized");
    console.log("💳 Contract Address:", contract.address);
    console.log(
      "🔗 TRONSCAN:",
      `https://tronscan.org/#/contract/${contract.address}`
    );
    console.log("💰 Deployment cost:", actualCost.toFixed(6), "TRX");
    console.log("💰 Remaining balance:", endTrx, "TRX");
    console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
    console.log("💾 Info saved to:", filename);
    console.log("=".repeat(70));

    console.log("\n💡 Next steps:");
    console.log("   1. Verify contract on TRONSCAN");
    console.log(
      "   2. Update frontend with contract address:",
      contract.address
    );
    console.log("   3. Test payment processing");
    console.log("   4. Set up monitoring");

    console.log("\n⚠️  IMPORTANT NOTES:");
    console.log("   - TRON USDT has 6 decimals (1 USDT = 1,000,000 units)");
    console.log("   - Store private keys securely");
    console.log("   - Consider using a multisig for treasury");

    return contract.address;
  } catch (error) {
    console.error("❌ Mainnet deployment failed:", error.message);
    console.error("Full error:", error);

    // Check balance even on failure
    try {
      const failBalance = await tronWeb.trx.getBalance(
        tronWeb.address.fromPrivateKey(config.privateKey)
      );
      const failTrx = tronWeb.fromSun(failBalance);
      console.log("💰 Balance after failure:", failTrx, "TRX");
    } catch (balanceError) {
      console.log("Could not check balance after failure");
    }

    throw error;
  }
}

// Main deployment function
async function main() {
  try {
    await deployPaymentProcessorMainnet();
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  deployPaymentProcessorMainnet,
  config,
};

// Run main if called directly
if (require.main === module) {
  main();
}
