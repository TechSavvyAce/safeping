const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing PaymentProcessorOptimized on Ethereum Mainnet...");
  console.log("⚠️  WARNING: This will use real USDT on mainnet!");
  console.log("💰 Ethereum gas is EXPENSIVE! Each transaction costs $10-50+");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Testing with account:", deployer.address);

  // Read deployment info
  const deploymentFiles = fs
    .readdirSync(".")
    .filter((f) => f.startsWith("deployment-ethereum-optimized-"));
  if (deploymentFiles.length === 0) {
    throw new Error("❌ No deployment file found. Deploy the contract first.");
  }

  const latestDeployment = deploymentFiles.sort().pop();
  const deploymentInfo = JSON.parse(fs.readFileSync(latestDeployment, "utf8"));
  console.log("📄 Using deployment:", latestDeployment);

  const contractAddress = deploymentInfo.contracts.paymentProcessorOptimized;
  const usdtAddress = deploymentInfo.contracts.usdt;

  console.log("💳 Contract address:", contractAddress);
  console.log("🪙 USDT address:", usdtAddress);
  console.log("⚠️  Remember: Ethereum USDT has 6 decimals!");

  // Get contract instances
  const paymentProcessor = await ethers.getContractAt(
    "PaymentProcessorOptimized",
    contractAddress
  );
  const usdt = await ethers.getContractAt("IERC20", usdtAddress);

  // Check current gas price (fixed for ethers v6)
  const feeData = await deployer.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(
    "⛽ Current gas price:",
    ethers.formatUnits(gasPrice, "gwei"),
    "gwei"
  );

  // Check current state
  console.log("\n🔸 Current State Check");
  const balance = await usdt.balanceOf(deployer.address);
  const allowance = await usdt.allowance(deployer.address, contractAddress);
  console.log("💰 USDT Balance:", ethers.formatUnits(balance, 6), "USDT"); // 6 decimals
  console.log(
    "✅ Current Allowance:",
    ethers.formatUnits(allowance, 6),
    "USDT"
  );

  if (balance === 0n) {
    console.log("❌ No USDT balance. Cannot test payments.");
    console.log("💡 To test:");
    console.log("   1. Get some USDT in your wallet");
    console.log("   2. Run this script again");
    return;
  }

  // Test amount (1 USDT = 1,000,000 units due to 6 decimals)
  const testAmount = ethers.parseUnits("1", 6); // 1 USDT
  console.log("🧪 Test amount:", ethers.formatUnits(testAmount, 6), "USDT");

  if (balance < testAmount) {
    console.log("❌ Insufficient USDT balance for test.");
    console.log("💡 Need at least 1 USDT for testing");
    return;
  }

  // Check if allowance is sufficient
  if (allowance < testAmount) {
    console.log("\n🔸 Approving USDT...");
    console.log("⚠️  You need to approve USDT spending first");
    console.log("💰 This will cost gas! (~$10-30)");
    console.log("💡 Run this command:");
    console.log(`   npx hardhat run scripts/approve-usdt.js --network mainnet`);
    return;
  }

  // Estimate gas for payment before proceeding
  const paymentId = `eth-test-${Date.now()}`;
  const serviceDescription = "Test payment for Ethereum optimized contract";

  console.log("\n🔸 Estimating Gas Costs");
  try {
    const gasEstimate = await paymentProcessor.processPayment.estimateGas(
      paymentId,
      testAmount,
      serviceDescription
    );
    const estimatedCost = gasEstimate * gasPrice;

    console.log("⛽ Estimated gas:", gasEstimate.toString());
    console.log("💵 Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
    console.log(
      "💰 Estimated USD cost: $",
      (parseFloat(ethers.formatEther(estimatedCost)) * 3000).toFixed(2)
    );

    // Warning about high costs
    if (parseFloat(ethers.formatEther(estimatedCost)) * 3000 > 50) {
      console.log("⚠️  HIGH GAS COST WARNING!");
      console.log("This transaction will cost more than $50!");
      console.log(
        "Consider waiting for lower gas prices or testing on a testnet first."
      );
      return;
    }
  } catch (error) {
    console.error("❌ Gas estimation failed:", error.message);
    return;
  }

  // Test payment processing
  console.log("\n🔸 Testing Payment Processing");
  console.log("🆔 Payment ID:", paymentId);
  console.log("📝 Service:", serviceDescription);

  try {
    // Process payment
    console.log("⏳ Processing payment...");
    console.log("💰 This will cost real ETH!");

    const tx = await paymentProcessor.processPayment(
      paymentId,
      testAmount,
      serviceDescription,
      {
        gasLimit: gasEstimate + 20000n, // Add buffer
      }
    );

    console.log("📄 Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("✅ Payment processed successfully!");
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    console.log(
      "💵 Gas cost:",
      ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
      "ETH"
    );
    console.log(
      "💰 USD cost: $",
      (
        parseFloat(ethers.formatEther(receipt.gasUsed * receipt.gasPrice)) *
        3000
      ).toFixed(2)
    );

    // Verify payment
    console.log("\n🔸 Verifying Payment");
    const paymentHash = ethers.keccak256(ethers.toUtf8Bytes(paymentId));
    console.log("🔗 Payment hash:", paymentHash);

    const payment = await paymentProcessor.getPaymentByHash(paymentHash);
    console.log("✅ Payment verified:");
    console.log("   Payer:", payment.payer);
    console.log("   Amount:", ethers.formatUnits(payment.amount, 6), "USDT");
    console.log(
      "   Timestamp:",
      new Date(Number(payment.timestamp) * 1000).toISOString()
    );
    console.log("   Completed:", payment.completed);
    console.log("   Description:", payment.serviceDescription);

    // Test string-based getter
    const paymentByString = await paymentProcessor.getPayment(paymentId);
    console.log("✅ String-based getter also works");

    // Check user payments
    const userPaymentHashes = await paymentProcessor.getUserPaymentHashes(
      deployer.address
    );
    console.log("📋 User has", userPaymentHashes.length, "payment(s)");

    console.log(
      "\n🎉 All tests passed! Contract is working correctly on Ethereum!"
    );
    console.log(
      "💡 Remember: Ethereum USDT uses 6 decimals in your frontend integration"
    );
  } catch (error) {
    console.error("❌ Payment test failed:", error.message);

    if (error.message.includes("InsufficientAllowance")) {
      console.log("💡 Solution: Approve USDT first");
    } else if (error.message.includes("PaymentIdExists")) {
      console.log("💡 Solution: Payment ID already used, try again");
    } else if (error.message.includes("insufficient funds")) {
      console.log("💡 Solution: You need more ETH for gas");
    } else {
      console.log("💡 Check contract state and try again");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
