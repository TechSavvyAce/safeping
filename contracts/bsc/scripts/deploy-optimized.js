const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting BSC Mainnet deployment (OPTIMIZED VERSION)...");
  console.log("⚠️  WARNING: Deploying to MAINNET - Real funds will be used!");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "BNB");

  // Check minimum balance (0.01 BNB for deployment + safety buffer)
  const minBalance = ethers.parseEther("0.01");
  if (balance < minBalance) {
    throw new Error(
      "❌ Insufficient BNB balance. Need at least 0.01 BNB for deployment (~$3 USD)."
    );
  }

  // BSC Mainnet USDT contract address
  const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

  // Treasury address (replace with your actual treasury address)
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  if (TREASURY_ADDRESS === deployer.address) {
    console.log(
      "⚠️  Using deployer address as treasury. Consider using a dedicated treasury address."
    );
  }

  console.log("🏦 Treasury address:", TREASURY_ADDRESS);
  console.log("🪙 BSC USDT address:", BSC_USDT_ADDRESS);

  // Deploy PaymentProcessorOptimized
  console.log("\n🔸 Deploying PaymentProcessorOptimized...");
  const PaymentProcessorOptimized = await ethers.getContractFactory(
    "PaymentProcessorOptimized"
  );

  // Estimate gas before deployment
  const deploymentTx = await PaymentProcessorOptimized.getDeployTransaction(
    TREASURY_ADDRESS,
    BSC_USDT_ADDRESS
  );
  const gasEstimate = await deployer.estimateGas(deploymentTx);
  console.log("⛽ Estimated deployment gas:", gasEstimate.toString());
  console.log(
    "💵 Estimated cost:",
    ethers.formatEther(gasEstimate * 3000000000n),
    "BNB"
  );

  console.log("⏳ Deploying contract...");
  const paymentProcessor = await PaymentProcessorOptimized.deploy(
    TREASURY_ADDRESS,
    BSC_USDT_ADDRESS
  );

  console.log("⏳ Waiting for deployment confirmation...");
  const receipt = await paymentProcessor.waitForDeployment();

  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log(
    "✅ PaymentProcessorOptimized deployed to:",
    paymentProcessorAddress
  );

  // Get actual gas used
  const deploymentReceipt = await paymentProcessor
    .deploymentTransaction()
    .wait();
  console.log("⛽ Actual gas used:", deploymentReceipt.gasUsed.toString());
  console.log(
    "💵 Actual cost:",
    ethers.formatEther(deploymentReceipt.gasUsed * deploymentReceipt.gasPrice),
    "BNB"
  );

  // Verify the deployment
  console.log("\n🔸 Verifying deployment...");
  try {
    const contractInfo = await paymentProcessor.getContractInfo();
    console.log("✅ Owner:", contractInfo.contractOwner);
    console.log("✅ Treasury:", contractInfo.treasuryAddress);
    console.log("✅ USDT:", contractInfo.usdtAddress);

    // Verify USDT contract
    const usdtContract = await ethers.getContractAt("IERC20", BSC_USDT_ADDRESS);
    const usdtBalance = await usdtContract.balanceOf(deployer.address);
    console.log(
      "💰 Deployer USDT balance:",
      ethers.formatUnits(usdtBalance, 18),
      "USDT"
    );
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
  }

  // Test basic functionality
  console.log("\n🔸 Testing basic functionality...");
  try {
    // Test checkAllowance function
    const allowanceCheck = await paymentProcessor.checkAllowance(
      deployer.address,
      ethers.parseUnits("1", 18)
    );
    console.log("✅ Allowance check function works:", allowanceCheck);

    // Test getUserBalance function
    const userBalance = await paymentProcessor.getUserBalance(deployer.address);
    console.log(
      "✅ Balance check function works. Balance:",
      ethers.formatUnits(userBalance, 18),
      "USDT"
    );
  } catch (error) {
    console.log("⚠️  Basic functionality test failed:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "BSC Mainnet",
    chainId: 56,
    contractName: "PaymentProcessorOptimized",
    deployer: deployer.address,
    treasury: TREASURY_ADDRESS,
    contracts: {
      paymentProcessorOptimized: paymentProcessorAddress,
      usdt: BSC_USDT_ADDRESS,
    },
    gasUsed: {
      estimated: gasEstimate.toString(),
      actual: deploymentReceipt.gasUsed.toString(),
      gasPrice: deploymentReceipt.gasPrice.toString(),
      costBNB: ethers.formatEther(
        deploymentReceipt.gasUsed * deploymentReceipt.gasPrice
      ),
    },
    deploymentTime: new Date().toISOString(),
    blockNumber: await deployer.provider.getBlockNumber(),
    txHash: deploymentReceipt.hash,
  };

  console.log("\n🔸 Deployment Summary");
  console.log("=".repeat(70));
  console.log("🌐 Network: BSC Mainnet");
  console.log("📜 Contract: PaymentProcessorOptimized");
  console.log("🔗 Chain ID:", deploymentInfo.chainId);
  console.log("📝 Deployer:", deployer.address);
  console.log("🏦 Treasury:", TREASURY_ADDRESS);
  console.log("💳 Contract Address:", paymentProcessorAddress);
  console.log("🪙 USDT Token:", BSC_USDT_ADDRESS);
  console.log("⛽ Gas Used:", deploymentReceipt.gasUsed.toString());
  console.log("💵 Cost:", deploymentInfo.gasUsed.costBNB, "BNB");
  console.log("🔗 Transaction:", deploymentReceipt.hash);
  console.log(
    "🔗 BscScan:",
    `https://bscscan.com/address/${paymentProcessorAddress}`
  );
  console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
  console.log("=".repeat(70));

  // Save deployment info to file
  const filename = `deployment-optimized-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${filename}`);

  console.log("\n🎉 BSC Mainnet deployment completed successfully!");

  console.log("\n💡 Next steps:");
  console.log("   1. Verify contract on BscScan:");
  console.log(
    `      npx hardhat verify --network bscMainnet ${paymentProcessorAddress} "${TREASURY_ADDRESS}" "${BSC_USDT_ADDRESS}"`
  );
  console.log("   2. Test payment processing:");
  console.log(
    "      npx hardhat run scripts/test-payment.js --network bscMainnet"
  );
  console.log("   3. Update frontend contract address");
  console.log("   4. Set up monitoring and alerts");

  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("   - Store private keys securely");
  console.log("   - Consider using a multisig for treasury");
  console.log("   - Monitor contract for unusual activity");
  console.log("   - Test thoroughly before processing large amounts");

  console.log("\n🔄 Migration from old contract:");
  console.log("   - Users will need to approve the new contract address");
  console.log("   - Payment IDs will be hashed (check frontend integration)");
  console.log("   - Historical data remains in the old contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
