const TronWeb = require("tronweb");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Configuration for TRON Mainnet
const config = {
  fullHost: "https://api.trongrid.io", // TRON Mainnet
  privateKey: process.env.TRON_PRIVATE_KEY || "", // Add your private key to .env
  usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Real TRON USDT (6 decimals)
  chainId: 728126428, // Tron mainnet chain ID
};

// Validate configuration
function validateConfig() {
  console.log("🔍 Checking configuration...");
  console.log("Private key present:", !!config.privateKey);

  if (!config.privateKey) {
    throw new Error("❌ Please set TRON_PRIVATE_KEY in your .env file");
  }

  console.log("✅ Configuration validated");
}

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

// Helper function to calculate energy staking recommendations
function calculateEnergyStaking(estimatedEnergy, currentBalance) {
  const energyPerTRX = 1000; // Approximate energy per TRX staked
  const recommendedStaking = Math.ceil(estimatedEnergy / energyPerTRX);
  const stakingCost = recommendedStaking * 1; // 1 TRX per staking unit

  return {
    recommendedStaking,
    stakingCost,
    energyPerTRX,
    estimatedEnergy,
  };
}

// Deploy SafePing contract
async function deploySafePing() {
  try {
    console.log("🚀 Starting TRON Mainnet deployment for SafePing...");
    console.log("⚠️  WARNING: Deploying to MAINNET - Real funds will be used!");
    console.log("💰 TRON has very low fees! Should cost <1 TRX");
    console.log(
      "💡 IMPORTANT: Previous deployment failed due to insufficient fee limit"
    );
    console.log(
      "💡 Fee limit increased to 350 TRX based on actual consumption of 158.54 TRX"
    );

    validateConfig();

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);

    console.log("🔐 Deployer:", deployerAddress);
    console.log("🪙 TRON USDT:", config.usdtAddress);
    console.log("🌐 Chain ID:", config.chainId);
    console.log("⚠️  Remember: TRON USDT has 6 decimals, not 18!");

    // Check balance
    const balance = await tronWeb.trx.getBalance(deployerAddress);
    const trxBalance = tronWeb.fromSun(balance);
    console.log("💰 TRX Balance:", trxBalance, "TRX");

    // Enhanced balance check with deployment cost estimation
    const minimumRequired = 300; // Increased minimum TRX needed for safe deployment (based on actual cost)
    const recommendedBalance = 500; // Recommended balance for multiple attempts

    if (parseFloat(trxBalance) < minimumRequired) {
      console.log(`❌ Insufficient TRX balance for deployment!`);
      console.log(`   Current: ${trxBalance} TRX`);
      console.log(`   Required: ${minimumRequired} TRX minimum`);
      console.log(`   Recommended: ${recommendedBalance}+ TRX for safety`);
      console.log("💡 Get TRX from exchanges or swap services");
      console.log("💡 Previous deployment cost: ~158.54 TRX");
      throw new Error(
        `Insufficient balance. Need at least ${minimumRequired} TRX.`
      );
    }

    if (parseFloat(trxBalance) < recommendedBalance) {
      console.log(
        "⚠️  Low TRX balance. You might need more TRX for deployment."
      );
      console.log(
        `💡 Recommended: ${recommendedBalance}+ TRX for multiple attempts`
      );
      console.log("💡 Previous deployment cost: ~158.54 TRX");
    }

    // Estimate deployment cost
    console.log("\n⛽ Deployment cost estimation:");
    console.log("   Energy: ~100,000 (SafePing contract)");
    console.log("   Bandwidth: ~800");
    console.log("   Fee: ~158.54 TRX (based on actual deployment cost)");
    console.log("   💡 Previous deployment failed due to insufficient energy");
    console.log("   💡 Account consumed 158.54 TRX but ran out of energy");
    console.log("   💡 Fee limit increased to 350 TRX for safety");

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
    const estimatedEnergy = 150000; // Conservative estimate for SafePing deployment
    const estimatedTRXCost = estimatedEnergy * 0.00042; // Energy price: ~0.00042 TRX per energy

    console.log("📊 Energy Requirements:");
    console.log("   Estimated needed:", estimatedEnergy);
    console.log("   Available energy:", availableEnergy);
    console.log("   Estimated TRX cost:", estimatedTRXCost.toFixed(6), "TRX");

    if (availableEnergy < estimatedEnergy) {
      console.log("⚠️  WARNING: Insufficient energy! Will burn TRX instead.");
      console.log("💡 Consider staking TRX for energy to reduce costs.");
    }

    // Load the compiled contract artifact
    console.log("\n📝 Loading compiled contract...");
    const contractPath = path.join(
      __dirname,
      "../artifacts/tron/SafePing.sol/SafePing.json"
    );

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract artifact not found at: ${contractPath}`);
    }

    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    console.log("✅ Contract artifact loaded successfully");

    // Deploy contract with constructor parameters
    console.log("\n⏳ Deploying SafePing contract...");
    console.log("📋 Deployment parameters:");
    console.log("   USDT Contract:", config.usdtAddress);
    console.log("   Chain ID:", config.chainId);
    console.log(
      "   Fee limit: 350 TRX (increased for safety based on actual consumption)"
    );

    const safeFeeLimit = 350000000; // 350 TRX in SUN units (increased from 150)
    console.log(
      "🚨 EMERGENCY PROTECTION: Fee limit set to",
      safeFeeLimit / 1000000,
      "TRX"
    );
    console.log(
      "💡 Based on actual deployment cost: ~158.54 TRX + buffer for safety"
    );

    // Check if we need to stake TRX for energy
    console.log("\n🔋 Energy Management Strategy:");
    if (availableEnergy < estimatedEnergy) {
      console.log("⚠️  WARNING: Insufficient energy! Will burn TRX instead.");
      console.log("💡 Consider staking TRX for energy to reduce costs.");
      console.log("   - Current energy cost: ~158.54 TRX");
      console.log("   - With energy staking: ~50-80 TRX");
      console.log("   - Energy staking requires 24h lock period");

      // Calculate recommended staking amount using helper function
      const stakingInfo = calculateEnergyStaking(
        estimatedEnergy,
        parseFloat(trxBalance)
      );
      console.log(
        `   - Recommended staking: ${stakingInfo.recommendedStaking} TRX for 24h`
      );
      console.log(
        `   - This will provide ~${stakingInfo.estimatedEnergy.toLocaleString()} energy`
      );
      console.log(
        `   - Staking cost: ${stakingInfo.stakingCost} TRX (locked for 24h)`
      );
      console.log(
        "   - Future deployments will cost ~50-80 TRX instead of 158+ TRX"
      );
      console.log(
        "   - Energy staking can be done via TRON wallet or TronScan"
      );
    } else {
      console.log("✅ Sufficient energy available for deployment");
    }

    let contract;
    try {
      console.log("🔧 Debug: Deployment config:");
      console.log("   - ABI length:", contractArtifact.abi.length);
      console.log("   - Bytecode length:", contractArtifact.bytecode.length);
      console.log("   - Fee limit (SUN):", safeFeeLimit);
      console.log("   - Parameters:", [config.usdtAddress, config.chainId]);

      // Test TronWeb connection first
      const networkInfo = await tronWeb.trx.getCurrentBlock();
      console.log(
        "✅ TronWeb connected, current block:",
        networkInfo.block_header.raw_data.number
      );

      contract = await tronWeb.contract().new({
        abi: contractArtifact.abi,
        bytecode: contractArtifact.bytecode,
        feeLimit: safeFeeLimit,
        callValue: 0,
        userFeePercentage: 100,
        parameters: [config.usdtAddress, config.chainId],
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

    console.log("✅ SafePing deployed successfully!");
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

      const owner = await contract.owner().call();
      const usdtContract = await contract.usdtContract().call();
      const chainId = await contract.chainId().call();

      console.log("✅ Owner:", owner);
      console.log("✅ USDT Contract:", usdtContract);
      console.log("✅ Chain ID:", chainId);

      // Test USDT contract interaction
      const usdtContractInstance = await tronWeb
        .contract()
        .at(config.usdtAddress);
      const usdtBalance = await usdtContractInstance
        .balanceOf(deployerAddress)
        .call();
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
      // Test getApprovedUsersCount function
      const approvedUsersCount = await contract.getApprovedUsersCount().call();
      console.log(
        "✅ getApprovedUsersCount function works:",
        approvedUsersCount
      );

      // Test getTotalApprovedAmount function
      const totalApprovedAmount = await contract
        .getTotalApprovedAmount()
        .call();
      console.log(
        "✅ getTotalApprovedAmount function works. Total:",
        (totalApprovedAmount / Math.pow(10, 6)).toFixed(6),
        "USDT"
      );
    } catch (error) {
      console.log("⚠️  Basic functionality test failed:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
      network: "TRON Mainnet",
      contractName: "SafePing",
      contractAddress: contract.address,
      deployerAddress: deployerAddress,
      usdtAddress: config.usdtAddress,
      chainId: config.chainId,
      deploymentTime: new Date().toISOString(),
      trxBalance: trxBalance,
      tronScanUrl: `https://tronscan.org/#/contract/${contract.address}`,
    };

    const filename = `deployment-tron-safeping-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(__dirname, "../deployments", filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🔸 Deployment Summary");
    console.log("=".repeat(70));
    console.log("🌐 Network: TRON Mainnet");
    console.log("📜 Contract: SafePing");
    console.log("🔐 Deployer:", deployerAddress);
    console.log("💳 Contract Address:", contract.address);
    console.log("🪙 USDT Token:", config.usdtAddress);
    console.log("🌐 Chain ID:", config.chainId);
    console.log("💰 TRX Balance:", trxBalance, "TRX");
    console.log(
      "🔗 TRONSCAN:",
      `https://tronscan.org/#/contract/${contract.address}`
    );
    console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
    console.log("=".repeat(70));

    console.log(`\n💾 Deployment info saved to deployments/${filename}`);

    console.log("\n🎉 TRON Mainnet deployment completed successfully!");

    console.log("\n💡 Next steps:");
    console.log("   1. Verify contract on TRONSCAN (automatic)");
    console.log("   2. Test the deployed contract:");
    console.log("      node scripts/test-tron-deployed-contract.js");
    console.log("   3. Update frontend contract address");
    console.log("   4. Set up monitoring and alerts");

    console.log("\n🔋 Energy Management for Future Deployments:");
    console.log(
      "   - Current deployment cost: ~158.54 TRX (high due to no energy)"
    );
    console.log(
      "   - To reduce future costs, consider staking TRX for energy:"
    );
    console.log(
      "     * Stake 150-200 TRX for 24h to get ~150,000-200,000 energy"
    );
    console.log(
      "     * Future deployments will cost ~50-80 TRX instead of 158+ TRX"
    );
    console.log(
      "     * Energy staking can be done via TRON wallet or TronScan"
    );
    console.log(
      "     * Staking requires 24h lock period but saves significant costs"
    );

    console.log("\n⚠️  IMPORTANT NOTES:");
    console.log("   - TRON USDT has 6 decimals (1 USDT = 1,000,000 units)");
    console.log("   - TRON has very low fees compared to Ethereum");
    console.log("   - Store private keys securely");
    console.log("   - Monitor contract for unusual activity");
    console.log("   - Consider energy staking for cost optimization");

    return contract.address;
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

// Main deployment function
async function main() {
  try {
    await deploySafePing();
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  deploySafePing,
  config,
};

// Run main if called directly
if (require.main === module) {
  main();
}
