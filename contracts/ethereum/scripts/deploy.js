const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting Ethereum Mainnet deployment...");
  console.log("⚠️  WARNING: Deploying to MAINNET - Real funds will be used!");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Check minimum balance (0.1 ETH for deployment)
  const minBalance = ethers.parseEther("0.1");
  if (balance < minBalance) {
    throw new Error(
      "❌ Insufficient ETH balance. Need at least 0.1 ETH for deployment."
    );
  }

  // Get current gas price for estimation
  const gasPrice = await deployer.provider.getGasPrice();
  console.log(
    "⛽ Current gas price:",
    ethers.formatUnits(gasPrice, "gwei"),
    "gwei"
  );

  // Ethereum Mainnet USDT contract address
  const ETHEREUM_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

  // Treasury address (replace with your actual treasury address)
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  if (TREASURY_ADDRESS === deployer.address) {
    console.log(
      "⚠️  Using deployer address as treasury. Consider using a dedicated treasury address."
    );
  }

  console.log("🏦 Treasury address:", TREASURY_ADDRESS);
  console.log("🪙 Ethereum USDT address:", ETHEREUM_USDT_ADDRESS);

  // Deploy PaymentProcessor
  console.log("\n🔸 Deploying PaymentProcessor...");
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");

  // Estimate gas for deployment
  const deploymentData = PaymentProcessor.interface.encodeDeploy([
    TREASURY_ADDRESS,
    ETHEREUM_USDT_ADDRESS,
  ]);
  const gasEstimate = await deployer.estimateGas({
    data: PaymentProcessor.bytecode + deploymentData.slice(2),
  });

  const estimatedCost = gasEstimate * gasPrice;
  console.log("⛽ Estimated gas:", gasEstimate.toString());
  console.log("💰 Estimated cost:", ethers.formatEther(estimatedCost), "ETH");

  console.log("⏳ Deploying contract...");
  const paymentProcessor = await PaymentProcessor.deploy(
    TREASURY_ADDRESS,
    ETHEREUM_USDT_ADDRESS,
    {
      gasLimit: gasEstimate + gasEstimate / 10n, // Add 10% buffer
    }
  );

  console.log("⏳ Waiting for deployment confirmation...");
  const receipt = await paymentProcessor.waitForDeployment();

  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log("✅ PaymentProcessor deployed to:", paymentProcessorAddress);

  // Get deployment transaction details
  const deployTx = await ethers.provider.getTransaction(
    paymentProcessor.deploymentTransaction().hash
  );
  const deployReceipt = await ethers.provider.getTransactionReceipt(
    paymentProcessor.deploymentTransaction().hash
  );

  console.log("⛽ Gas used:", deployReceipt.gasUsed.toString());
  console.log(
    "💰 Actual cost:",
    ethers.formatEther(deployReceipt.gasUsed * deployTx.gasPrice),
    "ETH"
  );

  // Verify the deployment
  console.log("\n🔸 Verifying deployment...");
  try {
    const contractInfo = await paymentProcessor.getContractInfo();
    console.log("✅ Owner:", contractInfo.contractOwner);
    console.log("✅ Treasury:", contractInfo.treasuryAddress);
    console.log("✅ USDT:", contractInfo.usdtAddress);

    // Verify USDT contract
    const usdtContract = await ethers.getContractAt(
      "IERC20",
      ETHEREUM_USDT_ADDRESS
    );
    const usdtBalance = await usdtContract.balanceOf(deployer.address);
    console.log(
      "💰 Deployer USDT balance:",
      ethers.formatUnits(usdtBalance, 6),
      "USDT"
    );
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "Ethereum Mainnet",
    chainId: 1,
    deployer: deployer.address,
    treasury: TREASURY_ADDRESS,
    contracts: {
      paymentProcessor: paymentProcessorAddress,
      usdt: ETHEREUM_USDT_ADDRESS,
    },
    transaction: {
      hash: paymentProcessor.deploymentTransaction().hash,
      gasUsed: deployReceipt.gasUsed.toString(),
      gasPrice: deployTx.gasPrice.toString(),
      cost: ethers.formatEther(deployReceipt.gasUsed * deployTx.gasPrice),
    },
    deploymentTime: new Date().toISOString(),
    blockNumber: deployReceipt.blockNumber,
  };

  console.log("\n🔸 Deployment Summary");
  console.log("=".repeat(60));
  console.log("🌐 Network: Ethereum Mainnet");
  console.log("🔗 Chain ID:", deploymentInfo.chainId);
  console.log("📝 Deployer:", deployer.address);
  console.log("🏦 Treasury:", TREASURY_ADDRESS);
  console.log("💳 PaymentProcessor:", paymentProcessorAddress);
  console.log("🪙 USDT Token:", ETHEREUM_USDT_ADDRESS);
  console.log(
    "🔗 Etherscan:",
    `https://etherscan.io/address/${paymentProcessorAddress}`
  );
  console.log("⛽ Gas Used:", deploymentInfo.transaction.gasUsed);
  console.log("💰 Total Cost:", deploymentInfo.transaction.cost, "ETH");
  console.log("📅 Deployed at:", deploymentInfo.deploymentTime);
  console.log("=".repeat(60));

  // Save deployment info to file
  fs.writeFileSync(
    "deployment-mainnet.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-mainnet.json");

  console.log("\n🎉 Ethereum Mainnet deployment completed successfully!");
  console.log("\n💡 Next steps:");
  console.log("   1. Verify contract on Etherscan:");
  console.log(
    `      npx hardhat verify --network mainnet ${paymentProcessorAddress} "${TREASURY_ADDRESS}" "${ETHEREUM_USDT_ADDRESS}"`
  );
  console.log("   2. Update frontend contract address");
  console.log("   3. Test payment processing with small amounts");
  console.log("   4. Set up monitoring and alerts");

  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("   - Store private keys securely");
  console.log("   - Consider using a multisig for treasury");
  console.log("   - Monitor contract for unusual activity");
  console.log("   - Gas prices on Ethereum can be high - monitor costs");
  console.log("   - Test thoroughly before processing large amounts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
