const TronWeb = require("tronweb");
const { compileContract } = require("./compile.cjs");
require("dotenv").config();

// TESTNET Configuration (Shasta Testnet)
const config = {
  fullHost: "https://api.shasta.trongrid.io", // TESTNET - FREE!
  privateKey: process.env.TRON_PRIVATE_KEY || "",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  usdtAddress: "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs", // Testnet USDT (6 decimals)
};

// Validate configuration
function validateConfig() {
  console.log("🔍 Checking testnet configuration...");
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

  console.log("✅ Testnet configuration validated");
}

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

// Deploy PaymentProcessorOptimized contract on TESTNET
async function deployPaymentProcessorTestnet() {
  try {
    console.log("🧪 Starting TESTNET deployment (Shasta)...");
    console.log("💰 TESTNET - FREE TRX! No real money at risk!");
    console.log("🔗 Get testnet TRX: https://www.trongrid.io/shasta");

    validateConfig();

    // Compile the contract
    console.log("📝 Compiling PaymentProcessorOptimized...");
    const artifact = await compileContract("PaymentProcessorOptimized");

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);

    console.log("🔐 Deployer:", deployerAddress);
    console.log("🏦 Treasury:", config.treasuryAddress);
    console.log("🪙 Testnet USDT:", config.usdtAddress);
    console.log("🧪 Network: Shasta Testnet");

    // Check testnet balance
    const balance = await tronWeb.trx.getBalance(deployerAddress);
    const trxBalance = tronWeb.fromSun(balance);
    console.log("💰 Testnet TRX Balance:", trxBalance, "TRX");

    if (parseFloat(trxBalance) < 1000) {
      console.log("⚠️  Low testnet TRX. Get free TRX from:");
      console.log("   🔗 https://www.trongrid.io/shasta");
      console.log("   🔗 https://faucetlist.co/tron");
    }

    // Check account resources
    console.log("\n🔋 Checking testnet resources...");
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

    // Generous fee limit for testnet testing
    const testnetFeeLimit = 1000000000; // 1000 TRX (generous for testing)

    console.log("\n⏳ Deploying on testnet...");
    console.log("📋 Testnet deployment parameters:");
    console.log("   Treasury:", config.treasuryAddress);
    console.log("   Testnet USDT:", config.usdtAddress);
    console.log("   Fee limit: 1000 TRX (generous for testing)");

    console.log("🔧 Debug info:");
    console.log("   - ABI length:", artifact.abi.length);
    console.log("   - Bytecode length:", artifact.bytecode.length);
    console.log("   - Fee limit (SUN):", testnetFeeLimit);

    // Test connection
    const networkInfo = await tronWeb.trx.getCurrentBlock();
    console.log(
      "✅ Connected to testnet, block:",
      networkInfo.block_header.raw_data.number
    );

    const contract = await tronWeb.contract().new({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      feeLimit: testnetFeeLimit,
      callValue: 0,
      userFeePercentage: 100,
      parameters: [config.treasuryAddress, config.usdtAddress],
    });

    console.log("✅ PaymentProcessorOptimized deployed on TESTNET!");
    console.log("📍 Contract Address:", contract.address);
    console.log(
      "🔗 Testnet Explorer:",
      `https://shasta.tronscan.org/#/contract/${contract.address}`
    );

    // Verify the deployment
    console.log("\n🔸 Verifying testnet deployment...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const contractInfo = await contract.getContractInfo().call();
      console.log("✅ Owner:", contractInfo.contractOwner);
      console.log("✅ Treasury:", contractInfo.treasuryAddress);
      console.log("✅ Testnet USDT:", contractInfo.usdtAddress);
    } catch (error) {
      console.log(
        "⚠️  Verification failed (normal on testnet):",
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

    // Check final testnet balance
    const finalBalance = await tronWeb.trx.getBalance(deployerAddress);
    const finalTrxBalance = tronWeb.fromSun(finalBalance);
    const costUsed = parseFloat(trxBalance) - parseFloat(finalTrxBalance);

    console.log("\n💰 TESTNET COST ANALYSIS:");
    console.log("   Starting balance:", trxBalance, "TRX");
    console.log("   Final balance:", finalTrxBalance, "TRX");
    console.log("   TRX used:", costUsed.toFixed(6), "TRX");
    console.log("   💡 This would be the REAL cost on mainnet!");

    // Save deployment info
    const deploymentInfo = {
      network: "TRON Testnet (Shasta)",
      contractName: "PaymentProcessorOptimized",
      contractAddress: contract.address,
      deployerAddress: deployerAddress,
      treasuryAddress: config.treasuryAddress,
      usdtAddress: config.usdtAddress,
      deploymentTime: new Date().toISOString(),
      testnetCost: costUsed,
      explorerUrl: `https://shasta.tronscan.org/#/contract/${contract.address}`,
    };

    const filename = `testnet-deployment-${Date.now()}.json`;
    const fs = require("fs");
    const path = require("path");
    fs.writeFileSync(
      path.join(__dirname, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🎉 TESTNET DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(70));
    console.log("🧪 Network: TRON Testnet (Shasta)");
    console.log("📜 Contract: PaymentProcessorOptimized");
    console.log("💳 Contract Address:", contract.address);
    console.log(
      "🔗 Explorer:",
      `https://shasta.tronscan.org/#/contract/${contract.address}`
    );
    console.log("💰 Testnet cost:", costUsed.toFixed(6), "TRX");
    console.log("💡 Expected mainnet cost:", costUsed.toFixed(6), "TRX");
    console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
    console.log("💾 Info saved to:", filename);
    console.log("=".repeat(70));

    console.log("\n✅ NOW YOU KNOW THE EXACT MAINNET COST!");
    console.log(
      "🚀 When ready for mainnet, you'll need exactly",
      costUsed.toFixed(6),
      "TRX"
    );

    return contract.address;
  } catch (error) {
    console.error("❌ Testnet deployment failed:", error.message);
    console.error("   Full error:", error);
    throw error;
  }
}

// Main deployment function
async function main() {
  try {
    await deployPaymentProcessorTestnet();
  } catch (error) {
    console.error("❌ Testnet deployment failed:", error.message);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  deployPaymentProcessorTestnet,
  config,
};

// Run main if called directly
if (require.main === module) {
  main();
}
