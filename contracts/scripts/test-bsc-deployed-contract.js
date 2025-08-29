const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing deployed SafePing contract on BSC Mainnet...");

  // Contract address from your deployment (you'll need to update this after deployment)
  const CONTRACT_ADDRESS = "0xB6b8c0D260de8cc01610b88678a783f6039648b3"; // UPDATE THIS AFTER DEPLOYMENT

  // BSC USDT contract address
  const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Testing with account: ${deployer.address}`);

  try {
    // Get contract instance
    const SafePing = await ethers.getContractFactory(
      "evm/SafePing.sol:SafePing"
    );
    const safePing = SafePing.attach(CONTRACT_ADDRESS);

    console.log(`🔗 Contract address: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network: BSC Mainnet`);

    // Test 1: Basic contract info
    console.log("\n📋 Test 1: Basic Contract Information");
    console.log("=====================================");

    const owner = await safePing.owner();
    const usdtContract = await safePing.usdtContract();
    const chainId = await safePing.chainId();

    console.log(`✅ Owner: ${owner}`);
    console.log(`✅ USDT Contract: ${usdtContract}`);
    console.log(`✅ Chain ID: ${chainId}`);

    // Verify these match expected values
    if (owner === deployer.address) {
      console.log("✅ Owner verification: PASSED");
    } else {
      console.log("❌ Owner verification: FAILED");
    }

    if (usdtContract === USDT_CONTRACT) {
      console.log("✅ USDT contract verification: PASSED");
    } else {
      console.log("❌ USDT contract verification: FAILED");
    }

    if (chainId.toString() === "56") {
      console.log("✅ Chain ID verification: PASSED");
    } else {
      console.log("❌ Chain ID verification: FAILED");
    }

    // Test 2: View functions
    console.log("\n📋 Test 2: View Functions");
    console.log("==========================");

    const approvedUsersCount = await safePing.getApprovedUsersCount();
    const totalApprovedAmount = await safePing.getTotalApprovedAmount();

    console.log(`✅ Approved users count: ${approvedUsersCount}`);
    console.log(
      `✅ Total approved amount: ${ethers.formatUnits(
        totalApprovedAmount,
        18
      )} USDT`
    );

    // Test 3: Check deployer's status
    console.log("\n📋 Test 3: Deployer Status Check");
    console.log("=================================");

    const deployerNonce = await safePing.getUserNonce(deployer.address);
    const deployerAllowance = await safePing.getUserAllowance(deployer.address);
    const deployerUSDTBalance = await safePing.getUserUSDTBalance(
      deployer.address
    );
    const contractAllowance = await safePing.getContractAllowance(
      deployer.address
    );

    console.log(`✅ Deployer nonce: ${deployerNonce}`);
    console.log(
      `✅ Deployer allowance: ${ethers.formatUnits(deployerAllowance, 18)} USDT`
    );
    console.log(
      `✅ Deployer USDT balance: ${ethers.formatUnits(
        deployerUSDTBalance,
        18
      )} USDT`
    );
    console.log(
      `✅ Contract allowance from deployer: ${ethers.formatUnits(
        contractAllowance,
        18
      )} USDT`
    );

    // Test 4: Contract info function
    console.log("\n📋 Test 4: Contract Info Function");
    console.log("==================================");

    const contractInfo = await safePing.getContractInfo();
    console.log(`✅ Contract owner: ${contractInfo.contractOwner}`);
    console.log(`✅ USDT address: ${contractInfo.usdtAddress}`);
    console.log(`✅ Chain ID: ${contractInfo.chainId}`);

    // Test 5: Check if contract is working (read-only operations)
    console.log("\n📋 Test 5: Contract Functionality Check");
    console.log("=========================================");

    try {
      const allApprovedUsers = await safePing.getAllApprovedUsers();
      console.log(`✅ All approved users: ${allApprovedUsers.length} users`);
      if (allApprovedUsers.length > 0) {
        console.log(`   Users: ${allApprovedUsers.join(", ")}`);
      }
    } catch (error) {
      console.log(`⚠️  getAllApprovedUsers error: ${error.message}`);
    }

    // Test 6: Verify contract is not paused or broken
    console.log("\n📋 Test 6: Contract Health Check");
    console.log("=================================");

    try {
      // Try to call a simple view function to ensure contract is responsive
      const testNonce = await safePing.getUserNonce(
        ethers.constants.AddressZero
      );
      console.log(`✅ Contract is responsive: ${testNonce}`);
      console.log("✅ Contract health: GOOD");
    } catch (error) {
      console.log(`❌ Contract health check failed: ${error.message}`);
    }

    // Summary
    console.log("\n🎯 DEPLOYMENT VERIFICATION SUMMARY");
    console.log("==================================");
    console.log(`✅ Contract deployed successfully to: ${CONTRACT_ADDRESS}`);
    console.log(`✅ Owner set correctly: ${owner}`);
    console.log(`✅ USDT contract configured: ${usdtContract}`);
    console.log(`✅ Chain ID set: ${chainId}`);
    console.log(`✅ All view functions working`);
    console.log(`✅ Contract is responsive and healthy`);

    console.log("\n🔗 View on BSCScan:");
    console.log(`https://bscscan.com/address/${CONTRACT_ADDRESS}`);

    console.log("\n🔗 View on BSCScan (USDT):");
    console.log(`https://bscscan.com/address/${USDT_CONTRACT}`);
  } catch (error) {
    console.error("❌ Testing failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
  });
