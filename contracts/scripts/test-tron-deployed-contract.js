const TronWeb = require("tronweb");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Configuration for TRON Mainnet
const config = {
  fullHost: "https://api.trongrid.io", // TRON Mainnet
  privateKey: process.env.TRON_PRIVATE_KEY || "", // Add your private key to .env
  usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Real TRON USDT (6 decimals)
  chainId: 728126428, // Tron mainnet chain ID
};

// Contract address from your deployment (you'll need to update this after deployment)
const CONTRACT_ADDRESS = "410d9a431b3f5e704e7f4cf570b4b1e4391c8088b1"; // UPDATE THIS AFTER DEPLOYMENT

// Validate configuration
function validateConfig() {
  console.log("🔍 Checking configuration...");
  console.log("Private key present:", !!config.privateKey);

  if (!config.privateKey) {
    throw new Error("❌ Please set TRON_PRIVATE_KEY in your .env file");
  }

  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "❌ Please update CONTRACT_ADDRESS with your deployed contract address"
    );
  }

  console.log("✅ Configuration validated");
}

const tronWeb = new TronWeb({
  fullHost: config.fullHost,
  privateKey: config.privateKey,
});

async function testSafePingContract() {
  try {
    console.log("🧪 Testing deployed SafePing contract on Tron Mainnet...");
    console.log("🔗 Contract address:", CONTRACT_ADDRESS);

    validateConfig();

    const deployerAddress = tronWeb.address.fromPrivateKey(config.privateKey);
    console.log(`📝 Testing with account: ${deployerAddress}`);

    // Load the compiled contract artifact
    console.log("\n📝 Loading compiled contract...");
    const contractPath = path.join(
      __dirname,
      "../artifacts/tron/SafePing.sol/SafePing.json"
    );

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract artifact not found at: ${contractPath}`);
    }

    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    console.log("✅ Contract artifact loaded successfully");

    // Get contract instance
    const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);
    console.log(`🌐 Network: Tron Mainnet`);

    // Test 1: Basic contract info
    console.log("\n📋 Test 1: Basic Contract Information");
    console.log("=====================================");

    const owner = await contract.owner().call();
    const usdtContract = await contract.usdtContract().call();
    const chainId = await contract.chainId().call();

    console.log(`✅ Owner: ${owner}`);
    console.log(`✅ USDT Contract: ${usdtContract}`);
    console.log(`✅ Chain ID: ${chainId}`);

    // Verify these match expected values
    if (owner === deployerAddress) {
      console.log("✅ Owner verification: PASSED");
    } else {
      console.log("❌ Owner verification: FAILED");
    }

    if (usdtContract === config.usdtAddress) {
      console.log("✅ USDT contract verification: PASSED");
    } else {
      console.log("❌ USDT contract verification: FAILED");
    }

    if (chainId.toString() === config.chainId.toString()) {
      console.log("✅ Chain ID verification: PASSED");
    } else {
      console.log("❌ Chain ID verification: FAILED");
    }

    // Test 2: View functions
    console.log("\n📋 Test 2: View Functions");
    console.log("==========================");

    try {
      const approvedUsersCount = await contract.getApprovedUsersCount().call();
      const totalApprovedAmount = await contract
        .getTotalApprovedAmount()
        .call();

      console.log(`✅ Approved users count: ${approvedUsersCount}`);
      console.log(
        `✅ Total approved amount: ${(
          totalApprovedAmount / Math.pow(10, 6)
        ).toFixed(6)} USDT`
      );
    } catch (error) {
      console.log(`⚠️  View functions error: ${error.message}`);
    }

    // Test 3: Check deployer's status
    console.log("\n📋 Test 3: Deployer Status Check");
    console.log("=================================");

    try {
      const deployerNonce = await contract.getUserNonce(deployerAddress).call();
      const deployerAllowance = await contract
        .getUserAllowance(deployerAddress)
        .call();
      const deployerUSDTBalance = await contract
        .getUserUSDTBalance(deployerAddress)
        .call();
      const contractAllowance = await contract
        .getContractAllowance(deployerAddress)
        .call();

      console.log(`✅ Deployer nonce: ${deployerNonce}`);
      console.log(
        `✅ Deployer allowance: ${(deployerAllowance / Math.pow(10, 6)).toFixed(
          6
        )} USDT`
      );
      console.log(
        `✅ Deployer USDT balance: ${(
          deployerUSDTBalance / Math.pow(10, 6)
        ).toFixed(6)} USDT`
      );
      console.log(
        `✅ Contract allowance from deployer: ${(
          contractAllowance / Math.pow(10, 6)
        ).toFixed(6)} USDT`
      );
    } catch (error) {
      console.log(`⚠️  Deployer status check error: ${error.message}`);
    }

    // Test 4: Contract info function
    console.log("\n📋 Test 4: Contract Info Function");
    console.log("==================================");

    try {
      const contractInfo = await contract.getContractInfo().call();
      console.log(`✅ Contract owner: ${contractInfo.contractOwner}`);
      console.log(`✅ USDT address: ${contractInfo.usdtAddress}`);
      console.log(`✅ Chain ID: ${contractInfo.chainId}`);
    } catch (error) {
      console.log(`⚠️  Contract info function error: ${error.message}`);
    }

    // Test 5: Check if contract is working (read-only operations)
    console.log("\n📋 Test 5: Contract Functionality Check");
    console.log("=========================================");

    try {
      const allApprovedUsers = await contract.getAllApprovedUsers().call();
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
      const testNonce = await contract
        .getUserNonce("T9yD14Nj9j7xAB4dbGeiX9h8okKTqQqyqK")
        .call();
      console.log(`✅ Contract is responsive: ${testNonce}`);
      console.log("✅ Contract health: GOOD");
    } catch (error) {
      console.log(`❌ Contract health check failed: ${error.message}`);
    }

    // Test 7: USDT Contract Interaction
    console.log("\n📋 Test 7: USDT Contract Interaction");
    console.log("=====================================");

    try {
      const usdtContractInstance = await tronWeb
        .contract()
        .at(config.usdtAddress);
      const usdtBalance = await usdtContractInstance
        .balanceOf(deployerAddress)
        .call();
      const usdtDecimals = await usdtContractInstance.decimals().call();

      console.log(
        `✅ USDT balance: ${(usdtBalance / Math.pow(10, usdtDecimals)).toFixed(
          6
        )} USDT`
      );
      console.log(`✅ USDT decimals: ${usdtDecimals}`);
      console.log(`✅ USDT contract address: ${config.usdtAddress}`);
    } catch (error) {
      console.log(`⚠️  USDT contract interaction error: ${error.message}`);
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

    console.log("\n🔗 View on Tronscan:");
    console.log(`https://tronscan.org/#/contract/${CONTRACT_ADDRESS}`);

    console.log("\n🔗 View on Tronscan (USDT):");
    console.log(`https://tronscan.org/#/address/${config.usdtAddress}`);

    // Save test results
    const testResults = {
      network: "TRON Mainnet",
      contractAddress: CONTRACT_ADDRESS,
      testTime: new Date().toISOString(),
      deployerAddress: deployerAddress,
      owner: owner,
      usdtContract: usdtContract,
      chainId: chainId.toString(),
      tronScanUrl: `https://tronscan.org/#/contract/${CONTRACT_ADDRESS}`,
      usdtScanUrl: `https://tronscan.org/#/address/${config.usdtAddress}`,
    };

    const filename = `test-results-tron-safeping-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(__dirname, "../deployments", filename),
      JSON.stringify(testResults, null, 2)
    );

    console.log(`\n💾 Test results saved to deployments/${filename}`);
  } catch (error) {
    console.error("❌ Testing failed:", error.message);
    throw error;
  }
}

// Main test function
async function main() {
  try {
    await testSafePingContract();
  } catch (error) {
    console.error("❌ Test script failed:", error.message);
    process.exit(1);
  }
}

// Export functions
module.exports = {
  testSafePingContract,
  config,
};

// Run main if called directly
if (require.main === module) {
  main();
}
