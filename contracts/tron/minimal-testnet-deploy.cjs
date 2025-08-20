const TronWeb = require("tronweb");
const { compileContract } = require("./compile.cjs");
require("dotenv").config();

// TESTNET Configuration - MINIMAL
const config = {
  fullHost: "https://api.shasta.trongrid.io", // TESTNET
  privateKey: process.env.TRON_PRIVATE_KEY || "",
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  usdtAddress: "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs", // Testnet USDT
};

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

async function minimalDeploy() {
  try {
    console.log("🧪 MINIMAL TESTNET DEPLOYMENT");
    console.log("💰 Finding EXACT deployment cost...");

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);

    // Check starting balance
    const startBalance = await tronWeb.trx.getBalance(deployerAddress);
    const startTrx = tronWeb.fromSun(startBalance);
    console.log("💰 Starting balance:", startTrx, "TRX");

    if (parseFloat(startTrx) < 1000) {
      console.log("❌ Need testnet TRX first!");
      console.log("🔗 Get free TRX: https://www.trongrid.io/shasta");
      return;
    }

    // Compile contract
    const artifact = await compileContract("PaymentProcessorOptimized");
    console.log("✅ Contract compiled");

    console.log("⏳ Deploying with NO fee limits...");

    // Deploy with VERY HIGH fee limit to see exact cost
    const contract = await tronWeb.contract().new({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      feeLimit: 1000000000, // 1000 TRX - no restrictions
      callValue: 0,
      userFeePercentage: 100,
      parameters: [config.treasuryAddress, config.usdtAddress],
    });

    console.log("✅ DEPLOYED!");
    console.log("📍 Address:", contract.address);

    // Check final balance
    const endBalance = await tronWeb.trx.getBalance(deployerAddress);
    const endTrx = tronWeb.fromSun(endBalance);
    const actualCost = parseFloat(startTrx) - parseFloat(endTrx);

    console.log("\n💰 EXACT COST ANALYSIS:");
    console.log("   Start:", startTrx, "TRX");
    console.log("   End:", endTrx, "TRX");
    console.log("   ACTUAL COST:", actualCost.toFixed(6), "TRX");
    console.log("   🚨 This is what mainnet would cost!");

    return actualCost;
  } catch (error) {
    console.error("❌ Failed:", error.message);
  }
}

minimalDeploy();
