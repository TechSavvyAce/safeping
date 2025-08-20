const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔐 Approving USDT for PaymentProcessorOptimized on Ethereum...");
  console.log(
    "⚠️  WARNING: Ethereum gas is EXPENSIVE! This could cost $10-50+"
  );

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Approving with account:", deployer.address);

  // Check current gas price (fixed for ethers v6)
  const feeData = await deployer.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(
    "⛽ Current gas price:",
    ethers.formatUnits(gasPrice, "gwei"),
    "gwei"
  );

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

  // Get USDT contract
  const usdt = await ethers.getContractAt("IERC20", usdtAddress);

  // Check current balance and allowance
  const balance = await usdt.balanceOf(deployer.address);
  const currentAllowance = await usdt.allowance(
    deployer.address,
    contractAddress
  );

  console.log(
    "💰 Current USDT balance:",
    ethers.formatUnits(balance, 6), // 6 decimals for Ethereum USDT
    "USDT"
  );
  console.log(
    "✅ Current allowance:",
    ethers.formatUnits(currentAllowance, 6),
    "USDT"
  );

  if (balance === 0n) {
    console.log("❌ No USDT balance. Cannot approve.");
    console.log("💡 Get some USDT first and try again.");
    return;
  }

  // Approve amount (you can change this) - using 6 decimals for Ethereum USDT
  const approveAmount = process.env.APPROVE_AMOUNT
    ? ethers.parseUnits(process.env.APPROVE_AMOUNT, 6)
    : ethers.parseUnits("100", 6); // Default: 100 USDT

  console.log(
    "🔐 Approving amount:",
    ethers.formatUnits(approveAmount, 6),
    "USDT"
  );

  if (balance < approveAmount) {
    console.log(
      "⚠️  Approve amount is greater than balance. Approving balance instead."
    );
    approveAmount = balance;
  }

  try {
    // Estimate gas
    const gasEstimate = await usdt.approve.estimateGas(
      contractAddress,
      approveAmount
    );
    const estimatedCost = gasEstimate * gasPrice;

    console.log("⛽ Estimated gas:", gasEstimate.toString());
    console.log("💵 Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
    console.log(
      "💰 Estimated USD cost: $",
      (parseFloat(ethers.formatEther(estimatedCost)) * 3000).toFixed(2)
    );

    // Warning about high costs
    if (parseFloat(ethers.formatEther(estimatedCost)) * 3000 > 30) {
      console.log("⚠️  HIGH GAS COST WARNING!");
      console.log("This approval will cost more than $30!");
      console.log("Consider waiting for lower gas prices.");

      // Wait 5 seconds to allow cancellation
      console.log("Continuing in 5 seconds... (Ctrl+C to cancel)");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Approve USDT
    console.log("⏳ Sending approval transaction...");
    const tx = await usdt.approve(contractAddress, approveAmount, {
      gasLimit: gasEstimate + 10000n, // Add buffer
    });

    console.log("📄 Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("✅ USDT approved successfully!");
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

    // Verify approval
    const newAllowance = await usdt.allowance(
      deployer.address,
      contractAddress
    );
    console.log(
      "✅ New allowance:",
      ethers.formatUnits(newAllowance, 6),
      "USDT"
    );

    console.log("\n🎉 Approval completed! You can now test payments.");
    console.log("💡 Run payment test:");
    console.log("   npx hardhat run scripts/test-payment.js --network mainnet");
    console.log("⚠️  Remember: Each payment will also cost significant gas!");
  } catch (error) {
    console.error("❌ Approval failed:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("💡 Solution: Make sure you have enough ETH for gas");
    } else if (error.message.includes("gas price")) {
      console.log("💡 Solution: Try again when gas prices are lower");
    } else {
      console.log("💡 Check your wallet and try again");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Approval failed:", error);
    process.exit(1);
  });
