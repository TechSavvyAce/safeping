const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing PaymentProcessorOptimized on BSC Mainnet...");
  console.log("⚠️  WARNING: This will use real USDT on mainnet!");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Testing with account:", deployer.address);

  // Read deployment info
  const deploymentFiles = fs
    .readdirSync(".")
    .filter((f) => f.startsWith("deployment-optimized-"));
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

  // Get contract instances
  const paymentProcessor = await ethers.getContractAt(
    "PaymentProcessorOptimized",
    contractAddress
  );
  const usdt = await ethers.getContractAt("IERC20", usdtAddress);

  // Check current state
  console.log("\n🔸 Current State Check");
  const balance = await usdt.balanceOf(deployer.address);
  const allowance = await usdt.allowance(deployer.address, contractAddress);
  console.log("💰 USDT Balance:", ethers.formatUnits(balance, 18), "USDT");
  console.log(
    "✅ Current Allowance:",
    ethers.formatUnits(allowance, 18),
    "USDT"
  );

  if (balance === 0n) {
    console.log("❌ No USDT balance. Cannot test payments.");
    console.log("💡 To test:");
    console.log("   1. Get some USDT in your wallet");
    console.log("   2. Run this script again");
    return;
  }

  // Test amount (0.1 USDT)
  const testAmount = ethers.parseUnits("0.1", 18);
  console.log("🧪 Test amount:", ethers.formatUnits(testAmount, 18), "USDT");

  if (balance < testAmount) {
    console.log("❌ Insufficient USDT balance for test.");
    return;
  }

  // Check if allowance is sufficient
  if (allowance < testAmount) {
    console.log("\n🔸 Approving USDT...");
    console.log("⚠️  You need to approve USDT spending first");
    console.log("💡 Run this command:");
    console.log(
      `   npx hardhat run scripts/approve-usdt.js --network bscMainnet`
    );
    return;
  }

  // Test payment processing
  console.log("\n🔸 Testing Payment Processing");
  const paymentId = `test-${Date.now()}`;
  const serviceDescription = "Test payment for optimized contract";

  console.log("🆔 Payment ID:", paymentId);
  console.log("📝 Service:", serviceDescription);

  try {
    // Estimate gas for payment
    const gasEstimate = await paymentProcessor.processPayment.estimateGas(
      paymentId,
      testAmount,
      serviceDescription
    );
    console.log("⛽ Estimated gas:", gasEstimate.toString());

    // Process payment
    console.log("⏳ Processing payment...");
    const tx = await paymentProcessor.processPayment(
      paymentId,
      testAmount,
      serviceDescription
    );

    console.log("📄 Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("✅ Payment processed successfully!");
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    console.log(
      "💵 Gas cost:",
      ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
      "BNB"
    );

    // Verify payment
    console.log("\n🔸 Verifying Payment");
    const paymentHash = ethers.keccak256(ethers.toUtf8Bytes(paymentId));
    console.log("🔗 Payment hash:", paymentHash);

    const payment = await paymentProcessor.getPaymentByHash(paymentHash);
    console.log("✅ Payment verified:");
    console.log("   Payer:", payment.payer);
    console.log("   Amount:", ethers.formatUnits(payment.amount, 18), "USDT");
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

    console.log("\n🎉 All tests passed! Contract is working correctly.");
  } catch (error) {
    console.error("❌ Payment test failed:", error.message);

    if (error.message.includes("InsufficientAllowance")) {
      console.log("💡 Solution: Approve USDT first");
    } else if (error.message.includes("PaymentIdExists")) {
      console.log("💡 Solution: Payment ID already used, try again");
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
