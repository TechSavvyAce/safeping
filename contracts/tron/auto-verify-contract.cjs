const axios = require("axios");
const fs = require("fs");

// Contract verification via TRONSCAN API
async function verifyContract() {
  try {
    console.log("🚀 Starting automated contract verification...");

    // Read contract source code
    const sourceCode = fs.readFileSync("PaymentProcessorOptimized.sol", "utf8");

    // Contract details
    const contractData = {
      contractAddress: "TW6KLGWgvz2RF5mx6ShQiDdg3cvePvVxuf", // Your contract address
      contractName: "PaymentProcessorOptimized",
      compilerVersion: "v0.8.19+commit.7dd6d404", // Try different versions if this fails
      optimization: true,
      optimizationRuns: 200,
      sourceCode: sourceCode,
      licenseType: "MIT",
    };

    console.log("📋 Verification parameters:");
    console.log("   Contract:", contractData.contractAddress);
    console.log("   Name:", contractData.contractName);
    console.log("   Compiler:", contractData.compilerVersion);
    console.log("   Optimization:", contractData.optimization);
    console.log("   Runs:", contractData.optimizationRuns);

    // TRONSCAN verification API endpoint
    const verificationUrl =
      "https://apilist.tronscanapi.com/api/contract-verification";

    console.log("\n⏳ Submitting verification request...");

    const response = await axios.post(
      verificationUrl,
      {
        contractaddress: contractData.contractAddress,
        contractname: contractData.contractName,
        compilerversion: contractData.compilerVersion,
        optimizationUsed: contractData.optimization ? "1" : "0",
        runs: contractData.optimizationRuns.toString(),
        sourceCode: contractData.sourceCode,
        licenseType: contractData.licenseType,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Contract-Verification-Script",
        },
        timeout: 30000,
      }
    );

    console.log("✅ Verification response:", response.data);

    if (response.data.success || response.data.status === "1") {
      console.log("🎉 Contract verification submitted successfully!");
      console.log("⏱️  Please wait 2-5 minutes for verification to complete");
      console.log(
        "🔗 Check status at: https://tronscan.org/#/contract/TW6KLGWgvz2RF5mx6ShQiDdg3cvePvVxuf/code"
      );
    } else {
      console.log(
        "❌ Verification failed:",
        response.data.message || response.data
      );
    }
  } catch (error) {
    console.error("❌ Verification error:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    console.log("\n💡 Fallback options:");
    console.log("1. Try manual verification on TRONSCAN");
    console.log("2. Try different compiler versions");
    console.log("3. Check if contract is already verified");
  }
}

// Alternative verification with different compiler versions
async function tryMultipleVersions() {
  const compilerVersions = [
    "v0.8.19+commit.7dd6d404",
    "0.8.19+commit.7dd6d404",
    "v0.8.19",
    "0.8.19",
  ];

  for (const version of compilerVersions) {
    console.log(`\n🔄 Trying compiler version: ${version}`);

    try {
      const sourceCode = fs.readFileSync(
        "PaymentProcessorOptimized.sol",
        "utf8"
      );

      const response = await axios.post(
        "https://apilist.tronscanapi.com/api/contract-verification",
        {
          contractaddress: "TW6KLGWgvz2RF5mx6ShQiDdg3cvePvVxuf",
          contractname: "PaymentProcessorOptimized",
          compilerversion: version,
          optimizationUsed: "1",
          runs: "200",
          sourceCode: sourceCode,
          licenseType: "MIT",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Contract-Verification-Script",
          },
          timeout: 15000,
        }
      );

      if (response.data.success || response.data.status === "1") {
        console.log(`✅ Success with compiler version: ${version}`);
        return true;
      } else {
        console.log(`❌ Failed with ${version}:`, response.data.message);
      }
    } catch (error) {
      console.log(`❌ Error with ${version}:`, error.message);
    }

    // Wait between attempts
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return false;
}

// Check if contract is already verified
async function checkVerificationStatus() {
  try {
    console.log("🔍 Checking current verification status...");

    const response = await axios.get(
      `https://apilist.tronscanapi.com/api/contract?contract=TW6KLGWgvz2RF5mx6ShQiDdg3cvePvVxuf`,
      { timeout: 10000 }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const contract = response.data.data[0];
      console.log("📊 Contract status:", {
        verified: contract.verified || false,
        name: contract.name || "N/A",
        compiler: contract.compiler_version || "N/A",
      });

      return contract.verified || false;
    }
  } catch (error) {
    console.log("⚠️  Could not check verification status:", error.message);
  }

  return false;
}

// Main function
async function main() {
  console.log("🔍 AUTOMATED CONTRACT VERIFICATION");
  console.log("=".repeat(50));

  // Check current status
  const isVerified = await checkVerificationStatus();

  if (isVerified) {
    console.log("✅ Contract is already verified!");
    return;
  }

  console.log("⚡ Contract not verified. Starting verification...");

  // Try single verification first
  await verifyContract();

  // If that fails, try multiple compiler versions
  console.log("\n🔄 If above failed, trying multiple compiler versions...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const success = await tryMultipleVersions();

  if (!success) {
    console.log("\n💡 All automatic attempts failed. Try manual verification:");
    console.log(
      "🔗 https://tronscan.org/#/contract/TW6KLGWgvz2RF5mx6ShQiDdg3cvePvVxuf/code"
    );
  }
}

// Run the verification
main().catch(console.error);
