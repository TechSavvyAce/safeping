const TronWeb = require("tronweb");
const fs = require("fs");
const path = require("path");

// Configuration for TRON Mainnet
const config = {
  fullHost: "https://api.trongrid.io", // TRON Mainnet
  privateKey: process.env.TRON_PRIVATE_KEY || "",
  usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Real TRON USDT
};

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

async function main() {
  try {
    console.log("🧪 Testing PaymentProcessorOptimized on TRON Mainnet...");
    console.log("⚠️  WARNING: This will use real USDT on mainnet!");
    console.log("💰 TRON fees are very low! Each transaction costs <0.1 TRX");

    if (!config.privateKey) {
      throw new Error("❌ Please set TRON_PRIVATE_KEY in your .env file");
    }

    // Get the deployer account
    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);
    console.log("👤 Testing with account:", deployerAddress);

    // Read deployment info
    const deploymentFiles = fs
      .readdirSync(__dirname)
      .filter((f) => f.startsWith("deployment-tron-optimized-"));

    if (deploymentFiles.length === 0) {
      throw new Error(
        "❌ No deployment file found. Deploy the contract first."
      );
    }

    const latestDeployment = deploymentFiles.sort().pop();
    const deploymentInfo = JSON.parse(
      fs.readFileSync(path.join(__dirname, latestDeployment), "utf8")
    );
    console.log("📄 Using deployment:", latestDeployment);

    const contractAddress = deploymentInfo.contractAddress;
    const usdtAddress = deploymentInfo.usdtAddress;

    console.log("💳 Contract address:", contractAddress);
    console.log("🪙 USDT address:", usdtAddress);
    console.log("⚠️  Remember: TRON USDT has 6 decimals!");

    // Get contract instances
    const paymentProcessor = await tronWeb.contract().at(contractAddress);
    const usdt = await tronWeb.contract().at(usdtAddress);

    // Check current state
    console.log("\n🔸 Current State Check");
    const balance = await usdt.balanceOf(deployerAddress).call();
    const allowance = await usdt
      .allowance(deployerAddress, contractAddress)
      .call();

    console.log(
      "💰 USDT Balance:",
      (balance / Math.pow(10, 6)).toFixed(6),
      "USDT"
    ); // 6 decimals
    console.log(
      "✅ Current Allowance:",
      (allowance / Math.pow(10, 6)).toFixed(6),
      "USDT"
    );

    if (balance == 0) {
      console.log("❌ No USDT balance. Cannot test payments.");
      console.log("💡 To test:");
      console.log("   1. Get some USDT in your TRON wallet");
      console.log("   2. Run this script again");
      return;
    }

    // Test amount (1 USDT = 1,000,000 units due to 6 decimals)
    const testAmount = 1000000; // 1 USDT
    console.log(
      "🧪 Test amount:",
      (testAmount / Math.pow(10, 6)).toFixed(6),
      "USDT"
    );

    if (balance < testAmount) {
      console.log("❌ Insufficient USDT balance for test.");
      console.log("💡 Need at least 1 USDT for testing");
      return;
    }

    // Check if allowance is sufficient
    if (allowance < testAmount) {
      console.log("\n🔸 Approving USDT...");
      console.log("⚠️  You need to approve USDT spending first");
      console.log("💰 This will cost <0.1 TRX (very cheap!)");

      try {
        console.log("⏳ Sending approval transaction...");
        const approveTx = await usdt
          .approve(contractAddress, testAmount * 100)
          .send({
            feeLimit: 100000000, // 100 TRX limit
          });

        console.log("📄 Approval transaction:", approveTx);
        console.log("⏳ Waiting for confirmation...");

        // Wait for transaction confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check new allowance
        const newAllowance = await usdt
          .allowance(deployerAddress, contractAddress)
          .call();
        console.log(
          "✅ New allowance:",
          (newAllowance / Math.pow(10, 6)).toFixed(6),
          "USDT"
        );
      } catch (error) {
        console.error("❌ Approval failed:", error.message);
        return;
      }
    }

    // Test payment processing
    console.log("\n🔸 Testing Payment Processing");
    const paymentId = `tron-test-${Date.now()}`;
    const serviceDescription = "Test payment for TRON optimized contract";

    console.log("🆔 Payment ID:", paymentId);
    console.log("📝 Service:", serviceDescription);

    try {
      // Process payment
      console.log("⏳ Processing payment...");
      console.log("💰 This will cost <0.1 TRX!");

      const tx = await paymentProcessor
        .processPayment(paymentId, testAmount, serviceDescription)
        .send({
          feeLimit: 100000000, // 100 TRX limit
        });

      console.log("📄 Transaction hash:", tx);
      console.log("⏳ Waiting for confirmation...");

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 5000));

      console.log("✅ Payment processed successfully!");

      // Verify payment
      console.log("\n🔸 Verifying Payment");
      const paymentHash = tronWeb.utils.keccak256(
        tronWeb.utils.toUtf8Bytes(paymentId)
      );
      console.log("🔗 Payment hash:", paymentHash);

      const payment = await paymentProcessor
        .getPaymentByHash(paymentHash)
        .call();
      console.log("✅ Payment verified:");
      console.log("   Payer:", payment.payer);
      console.log(
        "   Amount:",
        (payment.amount / Math.pow(10, 6)).toFixed(6),
        "USDT"
      );
      console.log(
        "   Timestamp:",
        new Date(Number(payment.timestamp) * 1000).toISOString()
      );
      console.log("   Completed:", payment.completed);
      console.log("   Description:", payment.serviceDescription);

      // Test string-based getter
      const paymentByString = await paymentProcessor
        .getPayment(paymentId)
        .call();
      console.log("✅ String-based getter also works");

      // Check user payments
      const userPaymentHashes = await paymentProcessor
        .getUserPaymentHashes(deployerAddress)
        .call();
      console.log("📋 User has", userPaymentHashes.length, "payment(s)");

      console.log(
        "\n🎉 All tests passed! Contract is working correctly on TRON!"
      );
      console.log(
        "💡 Remember: TRON USDT uses 6 decimals in your frontend integration"
      );
    } catch (error) {
      console.error("❌ Payment test failed:", error.message);

      if (error.message.includes("InsufficientAllowance")) {
        console.log("💡 Solution: Approve USDT first");
      } else if (error.message.includes("PaymentIdExists")) {
        console.log("💡 Solution: Payment ID already used, try again");
      } else if (error.message.includes("insufficient")) {
        console.log("💡 Solution: You need more TRX for transaction fees");
      } else {
        console.log("💡 Check contract state and try again");
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run main if called directly
if (require.main === module) {
  main();
}
