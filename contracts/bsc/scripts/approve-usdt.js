const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔐 Approving USDT for PaymentProcessorOptimized...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Approving with account:", deployer.address);

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
    ethers.formatUnits(balance, 18),
    "USDT"
  );
  console.log(
    "✅ Current allowance:",
    ethers.formatUnits(currentAllowance, 18),
    "USDT"
  );

  if (balance === 0n) {
    console.log("❌ No USDT balance. Cannot approve.");
    console.log("💡 Get some USDT first and try again.");
    return;
  }

  // Approve amount (you can change this)
  const approveAmount = process.env.APPROVE_AMOUNT
    ? ethers.parseUnits(process.env.APPROVE_AMOUNT, 18)
    : ethers.parseUnits("100", 18); // Default: 100 USDT

  console.log(
    "🔐 Approving amount:",
    ethers.formatUnits(approveAmount, 18),
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
    console.log("⛽ Estimated gas:", gasEstimate.toString());

    // Approve USDT
    console.log("⏳ Sending approval transaction...");
    const tx = await usdt.approve(contractAddress, approveAmount);

    console.log("📄 Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("✅ USDT approved successfully!");
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    console.log(
      "💵 Gas cost:",
      ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
      "BNB"
    );

    // Verify approval
    const newAllowance = await usdt.allowance(
      deployer.address,
      contractAddress
    );
    console.log(
      "✅ New allowance:",
      ethers.formatUnits(newAllowance, 18),
      "USDT"
    );

    console.log("\n🎉 Approval completed! You can now test payments.");
    console.log("💡 Run payment test:");
    console.log(
      "   npx hardhat run scripts/test-payment.js --network bscMainnet"
    );
  } catch (error) {
    console.error("❌ Approval failed:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("💡 Solution: Make sure you have enough BNB for gas");
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
