const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting BSC Mainnet deployment...");
  console.log("⚠️  WARNING: Deploying to MAINNET - Real funds will be used!");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "BNB");

  // Check minimum balance (0.1 BNB for deployment)
  const minBalance = ethers.parseEther("0.1");
  if (balance < minBalance) {
    throw new Error(
      "❌ Insufficient BNB balance. Need at least 0.1 BNB for deployment."
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

  // Deploy PaymentProcessor
  console.log("\n🔸 Deploying PaymentProcessor...");
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");

  console.log("⏳ Deploying contract...");
  const paymentProcessor = await PaymentProcessor.deploy(
    TREASURY_ADDRESS,
    BSC_USDT_ADDRESS
  );

  console.log("⏳ Waiting for deployment confirmation...");
  await paymentProcessor.waitForDeployment();

  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log("✅ PaymentProcessor deployed to:", paymentProcessorAddress);

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

  // Save deployment info
  const deploymentInfo = {
    network: "BSC Mainnet",
    chainId: 56,
    deployer: deployer.address,
    treasury: TREASURY_ADDRESS,
    contracts: {
      paymentProcessor: paymentProcessorAddress,
      usdt: BSC_USDT_ADDRESS,
    },
    gasUsed: {
      // Will be filled after deployment
    },
    deploymentTime: new Date().toISOString(),
    blockNumber: await deployer.provider.getBlockNumber(),
  };

  console.log("\n🔸 Deployment Summary");
  console.log("=".repeat(60));
  console.log("🌐 Network: BSC Mainnet");
  console.log("🔗 Chain ID:", deploymentInfo.chainId);
  console.log("📝 Deployer:", deployer.address);
  console.log("🏦 Treasury:", TREASURY_ADDRESS);
  console.log("💳 PaymentProcessor:", paymentProcessorAddress);
  console.log("🪙 USDT Token:", BSC_USDT_ADDRESS);
  console.log(
    "🔗 BscScan:",
    `https://bscscan.com/address/${paymentProcessorAddress}`
  );
  console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
  console.log("=".repeat(60));

  // Save deployment info to file
  fs.writeFileSync(
    "deployment-mainnet.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-mainnet.json");

  console.log("\n🎉 BSC Mainnet deployment completed successfully!");
  console.log("\n💡 Next steps:");
  console.log("   1. Verify contract on BscScan:");
  console.log(
    `      npx hardhat verify --network bscMainnet ${paymentProcessorAddress} "${TREASURY_ADDRESS}" "${BSC_USDT_ADDRESS}"`
  );
  console.log("   2. Update frontend contract address");
  console.log("   3. Test payment processing with small amounts");
  console.log("   4. Set up monitoring and alerts");

  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("   - Store private keys securely");
  console.log("   - Consider using a multisig for treasury");
  console.log("   - Monitor contract for unusual activity");
  console.log("   - Test thoroughly before processing large amounts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
