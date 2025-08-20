const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting Ethereum Mainnet deployment (OPTIMIZED VERSION)...");
  console.log("⚠️  WARNING: Deploying to MAINNET - Real funds will be used!");
  console.log(
    "💰 Ethereum gas is EXPENSIVE! This could cost $50-200+ depending on gas prices!"
  );

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Check current gas price (fixed for ethers v6)
  const feeData = await deployer.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(
    "⛽ Current gas price:",
    ethers.formatUnits(gasPrice, "gwei"),
    "gwei"
  );

  // Check minimum balance (0.05 ETH for deployment + safety buffer)
  const minBalance = ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(
      "❌ Insufficient ETH balance. Need at least 0.05 ETH for deployment (~$150-200 USD at current prices)."
    );
  }

  // Ethereum Mainnet USDT contract address (6 decimals!)
  const ETH_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

  // Treasury address (replace with your actual treasury address)
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  if (TREASURY_ADDRESS === deployer.address) {
    console.log(
      "⚠️  Using deployer address as treasury. Consider using a dedicated treasury address."
    );
  }

  console.log("🏦 Treasury address:", TREASURY_ADDRESS);
  console.log("🪙 Ethereum USDT address:", ETH_USDT_ADDRESS);
  console.log("⚠️  Remember: Ethereum USDT has 6 decimals, not 18!");

  // Deploy PaymentProcessorOptimized
  console.log("\n🔸 Deploying PaymentProcessorOptimized...");
  const PaymentProcessorOptimized = await ethers.getContractFactory(
    "PaymentProcessorOptimized"
  );

  // Use a conservative gas limit for deployment (no estimation due to RPC limits)
  const deploymentGasLimit = 2000000; // 2M gas should be enough for our optimized contract
  const estimatedCost = BigInt(deploymentGasLimit) * gasPrice;

  console.log("⛽ Using deployment gas limit:", deploymentGasLimit.toString());
  console.log(
    "💵 Estimated max cost:",
    ethers.formatEther(estimatedCost),
    "ETH"
  );
  console.log(
    "💰 Estimated USD cost: $",
    (parseFloat(ethers.formatEther(estimatedCost)) * 3000).toFixed(2)
  ); // Assuming ETH = $3000

  // Ask for confirmation (in a real scenario, you might want to pause here)
  console.log("\n⚠️  HIGH GAS COST WARNING!");
  console.log(
    "Deployment will cost approximately:",
    ethers.formatEther(estimatedCost),
    "ETH"
  );
  console.log("Continue deployment in 5 seconds...");

  // Wait 5 seconds to allow cancellation
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("⏳ Deploying contract...");
  const paymentProcessor = await PaymentProcessorOptimized.deploy(
    TREASURY_ADDRESS,
    ETH_USDT_ADDRESS,
    {
      gasLimit: deploymentGasLimit,
    }
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
  const actualCost = deploymentReceipt.gasUsed * deploymentReceipt.gasPrice;

  console.log("⛽ Actual gas used:", deploymentReceipt.gasUsed.toString());
  console.log("💵 Actual cost:", ethers.formatEther(actualCost), "ETH");
  console.log(
    "💰 Actual USD cost: $",
    (parseFloat(ethers.formatEther(actualCost)) * 3000).toFixed(2)
  );

  // Verify the deployment
  console.log("\n🔸 Verifying deployment...");
  try {
    const contractInfo = await paymentProcessor.getContractInfo();
    console.log("✅ Owner:", contractInfo.contractOwner);
    console.log("✅ Treasury:", contractInfo.treasuryAddress);
    console.log("✅ USDT:", contractInfo.usdtAddress);

    // Verify USDT contract
    const usdtContract = await ethers.getContractAt("IERC20", ETH_USDT_ADDRESS);
    const usdtBalance = await usdtContract.balanceOf(deployer.address);
    console.log(
      "💰 Deployer USDT balance:",
      ethers.formatUnits(usdtBalance, 6), // 6 decimals for Ethereum USDT
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
      ethers.parseUnits("1", 6)
    );
    console.log("✅ Allowance check function works:", allowanceCheck);

    // Test getUserBalance function
    const userBalance = await paymentProcessor.getUserBalance(deployer.address);
    console.log(
      "✅ Balance check function works. Balance:",
      ethers.formatUnits(userBalance, 6),
      "USDT"
    );
  } catch (error) {
    console.log("⚠️  Basic functionality test failed:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "Ethereum Mainnet",
    chainId: 1,
    contractName: "PaymentProcessorOptimized",
    deployer: deployer.address,
    treasury: TREASURY_ADDRESS,
    contracts: {
      paymentProcessorOptimized: paymentProcessorAddress,
      usdt: ETH_USDT_ADDRESS,
    },
    gasUsed: {
      estimated: gasEstimate.toString(),
      actual: deploymentReceipt.gasUsed.toString(),
      gasPrice: deploymentReceipt.gasPrice.toString(),
      costETH: ethers.formatEther(actualCost),
      costUSD: (parseFloat(ethers.formatEther(actualCost)) * 3000).toFixed(2),
    },
    deploymentTime: new Date().toISOString(),
    blockNumber: await deployer.provider.getBlockNumber(),
    txHash: deploymentReceipt.hash,
  };

  console.log("\n🔸 Deployment Summary");
  console.log("=".repeat(70));
  console.log("🌐 Network: Ethereum Mainnet");
  console.log("📜 Contract: PaymentProcessorOptimized");
  console.log("🔗 Chain ID:", deploymentInfo.chainId);
  console.log("📝 Deployer:", deployer.address);
  console.log("🏦 Treasury:", TREASURY_ADDRESS);
  console.log("💳 Contract Address:", paymentProcessorAddress);
  console.log("🪙 USDT Token:", ETH_USDT_ADDRESS);
  console.log("⛽ Gas Used:", deploymentReceipt.gasUsed.toString());
  console.log("💵 Cost:", deploymentInfo.gasUsed.costETH, "ETH");
  console.log("💰 USD Cost: $", deploymentInfo.gasUsed.costUSD);
  console.log("🔗 Transaction:", deploymentReceipt.hash);
  console.log(
    "🔗 Etherscan:",
    `https://etherscan.io/address/${paymentProcessorAddress}`
  );
  console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
  console.log("=".repeat(70));

  // Save deployment info to file
  const filename = `deployment-ethereum-optimized-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${filename}`);

  console.log("\n🎉 Ethereum Mainnet deployment completed successfully!");

  console.log("\n💡 Next steps:");
  console.log("   1. Verify contract on Etherscan:");
  console.log(
    `      npx hardhat verify --network mainnet ${paymentProcessorAddress} "${TREASURY_ADDRESS}" "${ETH_USDT_ADDRESS}"`
  );
  console.log("   2. Test payment processing (use 6 decimals for amounts!):");
  console.log(
    "      npx hardhat run scripts/test-payment.js --network mainnet"
  );
  console.log("   3. Update frontend contract address");
  console.log("   4. Set up monitoring and alerts");

  console.log("\n⚠️  IMPORTANT NOTES:");
  console.log("   - Ethereum USDT has 6 decimals (1 USDT = 1,000,000 units)");
  console.log("   - Gas costs are much higher than BSC");
  console.log("   - Store private keys securely");
  console.log("   - Consider using a multisig for treasury");
  console.log("   - Monitor contract for unusual activity");

  console.log("\n🔄 Migration from old contract:");
  console.log("   - Users will need to approve the new contract address");
  console.log("   - Payment IDs will be hashed (check frontend integration)");
  console.log("   - Historical data remains in the old contract");
  console.log("   - Remember: 6 decimals for Ethereum USDT vs 18 for BSC USDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
