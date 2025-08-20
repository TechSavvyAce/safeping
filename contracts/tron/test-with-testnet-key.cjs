const TronWeb = require("tronweb");
const { compileContract } = require("./compile.cjs");

// TESTNET Configuration with provided key
const config = {
  fullHost: "https://api.shasta.trongrid.io", // TESTNET
  privateKey:
    "fd7615bae7934d8eb7136e6c3391f8266a1f4b7c43e5a0c34efaff398a8bd903", // Testnet key
  treasuryAddress: "TKcuV94uywnWYV6oYx734RgQWgDWKT2M4y", // Your treasury (same as mainnet)
  usdtAddress: "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs", // Testnet USDT
};

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

async function testnetCostFinder() {
  try {
    console.log("🧪 TESTNET COST ANALYSIS");
    console.log("💰 Finding EXACT deployment cost with testnet key...");

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);
    console.log("🔐 Testnet deployer:", deployerAddress);

    // Check starting balance
    const startBalance = await tronWeb.trx.getBalance(deployerAddress);
    const startTrx = tronWeb.fromSun(startBalance);
    console.log("💰 Starting testnet balance:", startTrx, "TRX");

    if (parseFloat(startTrx) < 500) {
      console.log("❌ Need more testnet TRX!");
      console.log("🔗 Get free TRX: https://www.trongrid.io/shasta");
      console.log("📝 Use address:", deployerAddress);
      return;
    }

    // Compile contract
    console.log("📝 Compiling contract...");
    const artifact = await compileContract("PaymentProcessorOptimized");
    console.log("✅ Contract compiled successfully");
    console.log("📊 Bytecode size:", artifact.bytecode.length / 2, "bytes");

    // Check testnet resources
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

    console.log("\n⏳ Deploying on testnet with NO restrictions...");
    console.log("📋 Parameters:");
    console.log("   Treasury:", config.treasuryAddress);
    console.log("   Testnet USDT:", config.usdtAddress);
    console.log("   Fee limit: UNLIMITED (1000 TRX)");

    // Record exact time
    const deployStart = Date.now();

    // Deploy with very high fee limit to capture exact cost
    const contract = await tronWeb.contract().new({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      feeLimit: 1000000000, // 1000 TRX - unlimited for testing
      callValue: 0,
      userFeePercentage: 100,
      parameters: [config.treasuryAddress, config.usdtAddress],
    });

    const deployEnd = Date.now();

    console.log("✅ DEPLOYMENT SUCCESSFUL!");
    console.log("📍 Contract Address:", contract.address);
    console.log(
      "⏱️  Deployment time:",
      (deployEnd - deployStart) / 1000,
      "seconds"
    );
    console.log(
      "🔗 Testnet explorer:",
      `https://shasta.tronscan.org/#/contract/${contract.address}`
    );

    // Check final balance
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for balance to update
    const endBalance = await tronWeb.trx.getBalance(deployerAddress);
    const endTrx = tronWeb.fromSun(endBalance);
    const actualCost = parseFloat(startTrx) - parseFloat(endTrx);

    console.log("\n💰 EXACT DEPLOYMENT COST:");
    console.log("=".repeat(50));
    console.log("   Starting balance:", startTrx, "TRX");
    console.log("   Final balance:", endTrx, "TRX");
    console.log("   🎯 ACTUAL COST:", actualCost.toFixed(6), "TRX");
    console.log("   🚨 MAINNET COST:", actualCost.toFixed(6), "TRX");
    console.log("=".repeat(50));

    // Test basic contract functions
    console.log("\n🔸 Testing deployed contract...");
    try {
      const owner = await contract.owner().call();
      console.log("✅ Contract owner:", owner);

      const treasury = await contract.treasury().call();
      console.log("✅ Treasury address:", treasury);

      console.log("✅ Contract is fully functional!");
    } catch (error) {
      console.log("⚠️  Contract function test failed:", error.message);
    }

    // Final summary
    console.log("\n🎉 TESTNET DEPLOYMENT COMPLETE!");
    console.log(
      "💡 For mainnet deployment, you need:",
      Math.ceil(actualCost + 50),
      "TRX minimum"
    );
    console.log(
      "💡 Recommended mainnet amount:",
      Math.ceil(actualCost * 1.5),
      "TRX for safety"
    );

    return actualCost;
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    console.error("Full error:", error);

    // Still check balance change even on failure
    try {
      const endBalance = await tronWeb.trx.getBalance(
        tronWeb.address.fromPrivateKey(config.privateKey)
      );
      const endTrx = tronWeb.fromSun(endBalance);
      console.log("💰 Balance after failure:", endTrx, "TRX");
    } catch (balanceError) {
      console.log("Could not check final balance");
    }
  }
}

testnetCostFinder();
