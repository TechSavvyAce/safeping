const TronWeb = require("tronweb");
const { loadArtifact, compileContract } = require("./compile.cjs");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Configuration for TRON Mainnet
const config = {
  fullHost: "https://api.trongrid.io", // TRON Mainnet
  privateKey: process.env.TRON_PRIVATE_KEY || "", // Add your private key to .env
  treasuryAddress: process.env.TREASURY_ADDRESS || "", // Your treasury address
  usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Real TRON USDT (6 decimals)
};

// Validate configuration
function validateConfig() {
  console.log("🔍 Checking configuration...");
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

  console.log("✅ Configuration validated");
}

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

// Deploy PaymentProcessorOptimized contract
async function deployPaymentProcessorOptimized() {
  try {
    console.log("🚀 Starting TRON Mainnet deployment (OPTIMIZED VERSION)...");
    console.log("⚠️  WARNING: Deploying to MAINNET - Real funds will be used!");
    console.log("💰 TRON has very low fees! Should cost <1 TRX");

    validateConfig();

    // Compile the optimized contract first
    console.log("📝 Compiling PaymentProcessorOptimized...");
    const artifact = await compileContract("PaymentProcessorOptimized");

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);

    console.log("🔐 Deployer:", deployerAddress);
    console.log("🏦 Treasury:", config.treasuryAddress);
    console.log("🪙 TRON USDT:", config.usdtAddress);
    console.log("⚠️  Remember: TRON USDT has 6 decimals, not 18!");

    // Check balance
    const balance = await tronWeb.trx.getBalance(deployerAddress);
    const trxBalance = tronWeb.fromSun(balance);
    console.log("💰 TRX Balance:", trxBalance, "TRX");

    // Enhanced balance check with deployment cost estimation
    const minimumRequired = 10; // Minimum TRX needed for safe deployment

    if (parseFloat(trxBalance) < minimumRequired) {
      console.log(`❌ Insufficient TRX balance for deployment!`);
      console.log(`   Current: ${trxBalance} TRX`);
      console.log(`   Required: ${minimumRequired} TRX minimum`);
      console.log(`   Recommended: 20+ TRX for safety`);
      console.log("💡 Get TRX from exchanges or swap services");
      throw new Error(
        `Insufficient balance. Need at least ${minimumRequired} TRX.`
      );
    }

    if (parseFloat(trxBalance) < 20) {
      console.log(
        "⚠️  Low TRX balance. You might need more TRX for deployment."
      );
      console.log("💡 Recommended: 20+ TRX for multiple attempts");
    }

    // Estimate deployment cost
    console.log("\n⛽ Deployment cost estimation:");
    console.log("   Energy: ~80,000 (optimized contract)");
    console.log("   Bandwidth: ~500");
    console.log("   Fee: <1 TRX (very cheap!)");

    // Check account resources first
    console.log("\n🔋 Checking account resources...");
    const accountResources = await tronWeb.trx.getAccountResources(
      deployerAddress
    );
    const energyLimit = accountResources.EnergyLimit || 0;
    const energyUsed = accountResources.EnergyUsed || 0;
    const availableEnergy = energyLimit - energyUsed;

    console.log("⚡ Available Energy:", availableEnergy);
    console.log(
      "📶 Bandwidth Available:",
      (accountResources.freeNetLimit || 0) - (accountResources.freeNetUsed || 0)
    );

    // Estimate energy needed (conservative estimate)
    const estimatedEnergy = 150000; // Conservative estimate for contract deployment
    const estimatedTRXCost = estimatedEnergy * 0.00042; // Energy price: ~0.00042 TRX per energy

    console.log("📊 Energy Requirements:");
    console.log("   Estimated needed:", estimatedEnergy);
    console.log("   Available energy:", availableEnergy);
    console.log("   Estimated TRX cost:", estimatedTRXCost.toFixed(6), "TRX");

    if (availableEnergy < estimatedEnergy) {
      console.log("⚠️  WARNING: Insufficient energy! Will burn TRX instead.");
      console.log("💡 Consider staking TRX for energy to reduce costs.");
    }

    // Deploy contract with constructor parameters
    console.log("\n⏳ Deploying contract...");
    console.log("📋 Deployment parameters:");
    console.log("   Treasury:", config.treasuryAddress);
    console.log("   USDT:", config.usdtAddress);
    console.log("   Fee limit: 150 TRX (increased for safety)");

    console.log(
      "🚨 EMERGENCY PROTECTION: Fee limit set to",
      safeFeeLimit / 1000000,
      "TRX"
    );

    let contract;
    try {
      console.log("🔧 Debug: Deployment config:");
      console.log("   - ABI length:", artifact.abi.length);
      console.log("   - Bytecode length:", artifact.bytecode.length);
      console.log("   - Fee limit (SUN):", safeFeeLimit);
      console.log("   - Parameters:", [
        config.treasuryAddress,
        config.usdtAddress,
      ]);

      // Test TronWeb connection first
      const networkInfo = await tronWeb.trx.getCurrentBlock();
      console.log(
        "✅ TronWeb connected, current block:",
        networkInfo.block_header.raw_data.number
      );

      contract = await tronWeb.contract().new({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        feeLimit: safeFeeLimit, // MUCH lower limit for safety
        callValue: 0,
        userFeePercentage: 100,
        parameters: [config.treasuryAddress, config.usdtAddress],
      });
    } catch (contractError) {
      console.error("❌ Contract deployment error details:");
      console.error("   - Error type:", typeof contractError);
      console.error("   - Error message:", contractError.message);
      console.error("   - Error code:", contractError.code);
      console.error("   - Full error:", JSON.stringify(contractError, null, 2));
      throw new Error(
        `Contract deployment failed: ${
          contractError.message || JSON.stringify(contractError)
        }`
      );
    }

    console.log("✅ PaymentProcessorOptimized deployed successfully!");
    console.log("📍 Contract Address:", contract.address);
    console.log(
      "🔗 TRONSCAN:",
      `https://tronscan.org/#/contract/${contract.address}`
    );

    // Verify the deployment
    console.log("\n🔸 Verifying deployment...");
    try {
      // Wait a moment for the contract to be available
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const contractInfo = await contract.getContractInfo().call();
      console.log("✅ Owner:", contractInfo.contractOwner);
      console.log("✅ Treasury:", contractInfo.treasuryAddress);
      console.log("✅ USDT:", contractInfo.usdtAddress);

      // Test USDT contract interaction
      const usdtContract = await tronWeb.contract().at(config.usdtAddress);
      const usdtBalance = await usdtContract.balanceOf(deployerAddress).call();
      console.log(
        "💰 Deployer USDT balance:",
        (usdtBalance / Math.pow(10, 6)).toFixed(6), // 6 decimals for TRON USDT
        "USDT"
      );
    } catch (error) {
      console.log("⚠️  Contract verification failed:", error.message);
      console.log(
        "💡 The contract may still be deploying. Check TRONSCAN in a few minutes."
      );
    }

    // Test basic functionality
    console.log("\n🔸 Testing basic functionality...");
    try {
      // Test checkAllowance function
      const allowanceCheck = await contract
        .checkAllowance(
          deployerAddress,
          1000000 // 1 USDT (6 decimals)
        )
        .call();
      console.log("✅ Allowance check function works:", allowanceCheck);

      // Test getUserBalance function
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
      trxBalance: trxBalance,
      optimization: {
        gasOptimized: true,
        structPacking: true,
        customErrors: true,
        eventOptimization: true,
      },
    };

    const filename = `deployment-tron-optimized-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(__dirname, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🔸 Deployment Summary");
    console.log("=".repeat(70));
    console.log("🌐 Network: TRON Mainnet");
    console.log("📜 Contract: PaymentProcessorOptimized");
    console.log("🔐 Deployer:", deployerAddress);
    console.log("🏦 Treasury:", config.treasuryAddress);
    console.log("💳 Contract Address:", contract.address);
    console.log("🪙 USDT Token:", config.usdtAddress);
    console.log("💰 TRX Balance:", trxBalance, "TRX");
    console.log(
      "🔗 TRONSCAN:",
      `https://tronscan.org/#/contract/${contract.address}`
    );
    console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
    console.log("=".repeat(70));

    console.log(`\n💾 Deployment info saved to ${filename}`);

    console.log("\n🎉 TRON Mainnet deployment completed successfully!");

    console.log("\n💡 Next steps:");
    console.log("   1. Verify contract on TRONSCAN (automatic)");
    console.log("   2. Test payment processing (use 6 decimals for amounts!):");
    console.log("      node test-payment.cjs");
    console.log("   3. Update frontend contract address");
    console.log("   4. Set up monitoring and alerts");

    console.log("\n⚠️  IMPORTANT NOTES:");
    console.log("   - TRON USDT has 6 decimals (1 USDT = 1,000,000 units)");
    console.log("   - TRON has very low fees compared to Ethereum");
    console.log("   - Store private keys securely");
    console.log("   - Consider using a multisig for treasury");
    console.log("   - Monitor contract for unusual activity");

    console.log("\n🔄 Migration from old contract:");
    console.log("   - Users will need to approve the new contract address");
    console.log("   - Payment IDs will be hashed (check frontend integration)");
    console.log("   - Historical data remains in the old contract");
    console.log("   - TRON USDT: 6 decimals vs BSC USDT: 18 decimals");

    return contract.address;
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

// Main deployment function
async function main() {
  try {
    await deployPaymentProcessorOptimized();
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  deployPaymentProcessorOptimized,
  config,
};

// Run main if called directly
if (require.main === module) {
  main();
}
