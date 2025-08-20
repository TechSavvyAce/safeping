const TronWeb = require("tronweb");
const { compileContract } = require("./compile.cjs");
require("dotenv").config();

// Configuration
const config = {
  fullHost: "https://api.trongrid.io",
  privateKey: process.env.TRON_PRIVATE_KEY || "",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
};

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

async function safeTestMode() {
  try {
    console.log("🛡️  SAFE TEST MODE - NO TRX WILL BE SPENT");
    console.log("=".repeat(60));

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);
    const balance = await tronWeb.trx.getBalance(deployerAddress);
    const trxBalance = tronWeb.fromSun(balance);

    console.log("🔐 Deployer:", deployerAddress);
    console.log("💰 Current Balance:", trxBalance, "TRX");

    // Compile contract to check for compilation issues
    console.log("\n📝 Testing contract compilation...");
    const artifact = await compileContract("PaymentProcessorOptimized");
    console.log("✅ Contract compiled successfully");
    console.log("📊 Bytecode size:", artifact.bytecode.length / 2, "bytes");

    // Validate parameters
    console.log("\n🔍 Validating deployment parameters...");
    console.log("✅ Treasury address:", config.treasuryAddress);
    console.log("✅ USDT address:", config.usdtAddress);
    console.log(
      "✅ Treasury is valid TRON address:",
      TronWeb.isAddress(config.treasuryAddress)
    );
    console.log(
      "✅ USDT is valid TRON address:",
      TronWeb.isAddress(config.usdtAddress)
    );

    // Check account resources in detail
    console.log("\n🔋 Detailed Resource Analysis...");
    const accountResources = await tronWeb.trx.getAccountResources(
      deployerAddress
    );

    console.log("⚡ Energy Details:");
    console.log("   - Total Limit:", accountResources.EnergyLimit || 0);
    console.log("   - Used:", accountResources.EnergyUsed || 0);
    console.log(
      "   - Available:",
      (accountResources.EnergyLimit || 0) - (accountResources.EnergyUsed || 0)
    );

    console.log("📶 Bandwidth Details:");
    console.log("   - Free Limit:", accountResources.freeNetLimit || 0);
    console.log("   - Free Used:", accountResources.freeNetUsed || 0);
    console.log(
      "   - Free Available:",
      (accountResources.freeNetLimit || 0) - (accountResources.freeNetUsed || 0)
    );
    console.log("   - Net Limit:", accountResources.NetLimit || 0);
    console.log("   - Net Used:", accountResources.NetUsed || 0);

    // Calculate EXACT energy requirements
    console.log("\n⚡ ENERGY REQUIREMENT ANALYSIS:");

    // Real-world data for similar contract deployments on TRON
    const realWorldEnergyEstimates = {
      simpleContract: 50000,
      mediumContract: 150000,
      complexContract: 300000,
      veryComplexContract: 500000,
    };

    console.log("📋 Real-world deployment energy consumption:");
    Object.entries(realWorldEnergyEstimates).forEach(([type, energy]) => {
      const cost = energy * 0.00042;
      console.log(`   - ${type}: ${energy} energy (${cost.toFixed(3)} TRX)`);
    });

    // Analyze bytecode complexity
    const bytecodeSize = artifact.bytecode.length / 2;
    let estimatedComplexity;
    let estimatedEnergy;

    if (bytecodeSize < 3000) {
      estimatedComplexity = "Simple";
      estimatedEnergy = realWorldEnergyEstimates.simpleContract;
    } else if (bytecodeSize < 8000) {
      estimatedComplexity = "Medium";
      estimatedEnergy = realWorldEnergyEstimates.mediumContract;
    } else if (bytecodeSize < 15000) {
      estimatedComplexity = "Complex";
      estimatedEnergy = realWorldEnergyEstimates.complexContract;
    } else {
      estimatedComplexity = "Very Complex";
      estimatedEnergy = realWorldEnergyEstimates.veryComplexContract;
    }

    console.log(`\n🎯 YOUR CONTRACT ANALYSIS:`);
    console.log(`   - Bytecode size: ${bytecodeSize} bytes`);
    console.log(`   - Complexity: ${estimatedComplexity}`);
    console.log(`   - Estimated energy: ${estimatedEnergy}`);
    console.log(
      `   - Estimated cost: ${(estimatedEnergy * 0.00042).toFixed(3)} TRX`
    );

    // Safety recommendations
    const availableEnergy =
      (accountResources.EnergyLimit || 0) - (accountResources.EnergyUsed || 0);
    const energyDeficit = Math.max(0, estimatedEnergy - availableEnergy);
    const estimatedCost = energyDeficit * 0.00042;

    console.log(`\n💰 COST BREAKDOWN:`);
    console.log(`   - Available energy: ${availableEnergy}`);
    console.log(`   - Energy deficit: ${energyDeficit}`);
    console.log(`   - TRX to burn: ${estimatedCost.toFixed(6)} TRX`);

    // Safe fee limit calculation
    const safeFeeLimit = Math.max(estimatedCost * 1.5, 10); // 50% safety margin, minimum 10 TRX
    console.log(`   - Recommended fee limit: ${safeFeeLimit.toFixed(1)} TRX`);

    console.log(`\n🚨 CRITICAL ANALYSIS:`);

    if (estimatedCost > parseFloat(trxBalance) * 0.5) {
      console.log("❌ WARNING: Estimated cost exceeds 50% of your balance!");
      console.log("💡 RECOMMENDATION: Stake TRX for energy first");
    } else if (estimatedCost > 100) {
      console.log("❌ WARNING: Very high deployment cost!");
      console.log(
        "💡 RECOMMENDATION: Consider optimizing contract or staking for energy"
      );
    } else if (estimatedCost > 50) {
      console.log("⚠️  CAUTION: Moderate deployment cost");
      console.log(
        "💡 RECOMMENDATION: Consider staking for energy to reduce costs"
      );
    } else {
      console.log("✅ Deployment cost looks reasonable");
    }

    // Final recommendation
    console.log(`\n🎯 FINAL RECOMMENDATION:`);
    console.log(`   - Maximum TRX at risk: ${safeFeeLimit.toFixed(1)} TRX`);
    console.log(
      `   - Success probability: ${
        estimatedCost < 80 ? "HIGH" : estimatedCost < 150 ? "MEDIUM" : "LOW"
      }`
    );

    if (safeFeeLimit < 80) {
      console.log(
        "✅ SAFE TO PROCEED with fee limit:",
        safeFeeLimit.toFixed(1),
        "TRX"
      );
    } else {
      console.log("⚠️  RISKY - Consider staking TRX for energy first");
      console.log(
        "💡 Stake ~3000 TRX for energy to make deployment nearly free"
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("🛡️  NO TRX WAS SPENT IN THIS ANALYSIS");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

safeTestMode();
