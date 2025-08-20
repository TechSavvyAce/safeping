const TronWeb = require("tronweb");
require("dotenv").config();

// Configuration
const config = {
  fullHost: "https://api.trongrid.io",
  privateKey: process.env.TRON_PRIVATE_KEY || "",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
};

// Validate configuration
if (!config.privateKey || !config.treasuryAddress) {
  console.log(
    "❌ Please set TRON_PRIVATE_KEY and TREASURY_ADDRESS in .env file"
  );
  process.exit(1);
}

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

async function estimateDeploymentCost() {
  try {
    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);

    console.log("💰 TRON Deployment Cost Estimator");
    console.log("=".repeat(50));

    // Get current balance
    const balance = await tronWeb.trx.getBalance(deployerAddress);
    const trxBalance = tronWeb.fromSun(balance);
    console.log("🔐 Deployer:", deployerAddress);
    console.log("💰 Current Balance:", trxBalance, "TRX");

    // Get account resources
    const accountResources = await tronWeb.trx.getAccountResources(
      deployerAddress
    );
    const energyLimit = accountResources.EnergyLimit || 0;
    const energyUsed = accountResources.EnergyUsed || 0;
    const availableEnergy = energyLimit - energyUsed;
    const freeNetLimit = accountResources.freeNetLimit || 0;
    const freeNetUsed = accountResources.freeNetUsed || 0;
    const availableBandwidth = freeNetLimit - freeNetUsed;

    console.log("\n🔋 Account Resources:");
    console.log("⚡ Available Energy:", availableEnergy);
    console.log("📶 Available Bandwidth:", availableBandwidth);

    // Estimate deployment costs
    const estimatedEnergy = 150000; // Conservative estimate for smart contract deployment
    const estimatedBandwidth = 1000; // Estimated bandwidth needed
    const energyPrice = 0.00042; // TRX per energy unit (approximate)
    const bandwidthPrice = 0.001; // TRX per bandwidth unit (approximate)

    console.log("\n📊 Deployment Requirements (Estimated):");
    console.log("⚡ Energy needed:", estimatedEnergy);
    console.log("📶 Bandwidth needed:", estimatedBandwidth);

    // Calculate costs
    let energyCost = 0;
    let bandwidthCost = 0;

    if (availableEnergy < estimatedEnergy) {
      const energyToBurn = estimatedEnergy - availableEnergy;
      energyCost = energyToBurn * energyPrice;
      console.log(
        "💸 Energy to burn:",
        energyToBurn,
        `(Cost: ${energyCost.toFixed(6)} TRX)`
      );
    } else {
      console.log("✅ Sufficient energy available (Free!)");
    }

    if (availableBandwidth < estimatedBandwidth) {
      const bandwidthToBurn = estimatedBandwidth - availableBandwidth;
      bandwidthCost = bandwidthToBurn * bandwidthPrice;
      console.log(
        "💸 Bandwidth to burn:",
        bandwidthToBurn,
        `(Cost: ${bandwidthCost.toFixed(6)} TRX)`
      );
    } else {
      console.log("✅ Sufficient bandwidth available (Free!)");
    }

    const totalEstimatedCost = energyCost + bandwidthCost;

    console.log("\n💵 Cost Summary:");
    console.log("⚡ Energy cost:", energyCost.toFixed(6), "TRX");
    console.log("📶 Bandwidth cost:", bandwidthCost.toFixed(6), "TRX");
    console.log(
      "💰 Total estimated cost:",
      totalEstimatedCost.toFixed(6),
      "TRX"
    );
    console.log(
      "💰 Fee limit recommended:",
      Math.max(150, totalEstimatedCost * 3).toFixed(0),
      "TRX"
    );

    // Safety recommendations
    console.log("\n🛡️  Safety Recommendations:");

    if (parseFloat(trxBalance) < 10) {
      console.log("❌ CRITICAL: Get at least 10 TRX before deployment");
    } else if (parseFloat(trxBalance) < 20) {
      console.log("⚠️  WARNING: Consider getting 20+ TRX for safety");
    } else {
      console.log("✅ Balance looks good for deployment");
    }

    if (availableEnergy < estimatedEnergy) {
      console.log("💡 TIP: Stake TRX for energy to reduce deployment costs");
      console.log("   - Stake ~3000 TRX to get ~150k energy");
      console.log("   - Energy regenerates daily");
    }

    if (availableBandwidth < estimatedBandwidth) {
      console.log("💡 TIP: Stake TRX for bandwidth to reduce costs");
    }

    console.log("\n🚀 Ready for deployment?");
    if (parseFloat(trxBalance) >= 10) {
      console.log("✅ Yes! Run: node deploy-optimized.cjs");
    } else {
      console.log("❌ No, get more TRX first");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the estimator
estimateDeploymentCost();
