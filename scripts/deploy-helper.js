#!/usr/bin/env node

// =================================
// 🚀 Contract Deployment Helper
// =================================

const fs = require("fs");
const path = require("path");

/**
 * Update mainnet addresses configuration
 */
function updateMainnetAddresses(chain, contractAddress, deploymentInfo) {
  const addressesPath = path.join(
    __dirname,
    "../../contracts/mainnet/mainnet-addresses.json"
  );

  try {
    let addresses = {};

    // Read existing addresses if file exists
    if (fs.existsSync(addressesPath)) {
      const content = fs.readFileSync(addressesPath, "utf8");
      addresses = JSON.parse(content);
    }

    // Update the deployment info
    if (!addresses.deployment) {
      addresses.deployment = { paymentProcessor: {} };
    }

    if (!addresses.deployment.paymentProcessor) {
      addresses.deployment.paymentProcessor = {};
    }

    addresses.deployment.paymentProcessor[chain] = {
      address: contractAddress,
      deployedAt: new Date().toISOString(),
      deployer: deploymentInfo.deployer || null,
      treasury: deploymentInfo.treasury || null,
      txHash: deploymentInfo.txHash || null,
      gasUsed: deploymentInfo.gasUsed || null,
      gasPrice: deploymentInfo.gasPrice || null,
    };

    // Write updated addresses
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log(`✅ Updated mainnet addresses for ${chain}`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to update mainnet addresses:`, error);
    return false;
  }
}

/**
 * Update Next.js environment configuration
 */
function updateNextJsEnv(chain, contractAddress) {
  const envPath = path.join(__dirname, "../.env.local");

  try {
    let envContent = "";

    // Read existing .env.local if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    const envKey = `${chain.toUpperCase()}_PAYMENT_PROCESSOR_MAINNET`;
    const envLine = `${envKey}=${contractAddress}`;

    // Check if the key already exists
    const keyRegex = new RegExp(`^${envKey}=.*$`, "m");

    if (keyRegex.test(envContent)) {
      // Update existing line
      envContent = envContent.replace(keyRegex, envLine);
    } else {
      // Add new line
      envContent += `\n# ${chain.toUpperCase()} Mainnet Contract\n${envLine}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated Next.js environment for ${chain}`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to update Next.js environment:`, error);
    return false;
  }
}

/**
 * Generate deployment report
 */
function generateDeploymentReport(deployments) {
  const reportPath = path.join(__dirname, "../deployment-report.md");

  const report = `# 🚀 Contract Deployment Report

Generated: ${new Date().toISOString()}

## Deployed Contracts

${deployments
  .map(
    (deployment) => `
### ${deployment.chain.toUpperCase()} Network

- **Contract Address**: \`${deployment.address}\`
- **Transaction Hash**: \`${deployment.txHash || "N/A"}\`
- **Deployer**: \`${deployment.deployer || "N/A"}\`
- **Treasury**: \`${deployment.treasury || "N/A"}\`
- **Gas Used**: ${deployment.gasUsed || "N/A"}
- **Gas Price**: ${deployment.gasPrice || "N/A"}
- **Explorer**: [View on Explorer](${deployment.explorerUrl})

`
  )
  .join("")}

## Next Steps

1. **Test Payments**: Perform small test payments on each network
2. **Update Frontend**: Ensure frontend is using the new contract addresses
3. **Monitor Treasury**: Set up monitoring for treasury balance changes
4. **Update Documentation**: Update any relevant documentation

## Frontend Integration

Add these addresses to your frontend configuration:

\`\`\`javascript
const MAINNET_CONTRACTS = {
${deployments.map((d) => `  ${d.chain}: "${d.address}",`).join("\n")}
};
\`\`\`

## Security Checklist

- [ ] Contract addresses verified on block explorers
- [ ] Test payments completed successfully
- [ ] Treasury receiving payments correctly
- [ ] Monitoring systems active
- [ ] Team notified of deployment
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Deployment report generated: ${reportPath}`);
}

/**
 * Main deployment tracking function
 */
function trackDeployment(chain, contractAddress, deploymentInfo = {}) {
  console.log(`\n🎯 Tracking deployment for ${chain.toUpperCase()}`);
  console.log(`📍 Contract Address: ${contractAddress}`);

  // Update mainnet addresses file
  const addressesUpdated = updateMainnetAddresses(
    chain,
    contractAddress,
    deploymentInfo
  );

  // Update Next.js environment
  const envUpdated = updateNextJsEnv(chain, contractAddress);

  if (addressesUpdated && envUpdated) {
    console.log(`✅ ${chain.toUpperCase()} deployment tracking completed`);
    return true;
  } else {
    console.log(`❌ ${chain.toUpperCase()} deployment tracking failed`);
    return false;
  }
}

/**
 * Check deployment status
 */
function checkDeploymentStatus() {
  const addressesPath = path.join(
    __dirname,
    "../../contracts/mainnet/mainnet-addresses.json"
  );

  try {
    if (!fs.existsSync(addressesPath)) {
      console.log("📋 No deployments found");
      return;
    }

    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    const deployments = addresses.deployment?.paymentProcessor || {};

    console.log("\n📊 Deployment Status:");
    console.log("═══════════════════════");

    ["bsc", "ethereum", "tron"].forEach((chain) => {
      const deployment = deployments[chain];

      if (deployment && deployment.address !== "TBD_AFTER_DEPLOYMENT") {
        console.log(`✅ ${chain.toUpperCase()}: ${deployment.address}`);
        console.log(`   Deployed: ${deployment.deployedAt || "Unknown"}`);
        console.log(`   Treasury: ${deployment.treasury || "Unknown"}`);
      } else {
        console.log(`❌ ${chain.toUpperCase()}: Not deployed`);
      }
      console.log("");
    });
  } catch (error) {
    console.error("❌ Failed to check deployment status:", error);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "track":
      const chain = args[1];
      const address = args[2];
      const info = args[3] ? JSON.parse(args[3]) : {};

      if (!chain || !address) {
        console.error(
          "Usage: node deploy-helper.js track <chain> <address> [info]"
        );
        process.exit(1);
      }

      trackDeployment(chain, address, info);
      break;

    case "status":
      checkDeploymentStatus();
      break;

    case "report":
      const addressesPath = path.join(
        __dirname,
        "../../contracts/mainnet/mainnet-addresses.json"
      );
      if (fs.existsSync(addressesPath)) {
        const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
        const deployments = addresses.deployment?.paymentProcessor || {};

        const deploymentList = Object.entries(deployments)
          .filter(
            ([, deployment]) => deployment.address !== "TBD_AFTER_DEPLOYMENT"
          )
          .map(([chain, deployment]) => ({
            chain,
            address: deployment.address,
            txHash: deployment.txHash,
            deployer: deployment.deployer,
            treasury: deployment.treasury,
            gasUsed: deployment.gasUsed,
            gasPrice: deployment.gasPrice,
            explorerUrl: `https://${
              chain === "bsc"
                ? "bscscan.com"
                : chain === "ethereum"
                ? "etherscan.io"
                : "tronscan.org"
            }/${chain === "tron" ? "#/contract/" : "address/"}${
              deployment.address
            }`,
          }));

        generateDeploymentReport(deploymentList);
      } else {
        console.log("❌ No deployment data found");
      }
      break;

    default:
      console.log(`
🚀 Contract Deployment Helper

Commands:
  track <chain> <address> [info]  - Track a new deployment
  status                          - Check deployment status
  report                          - Generate deployment report

Examples:
  node deploy-helper.js track bsc 0x123...
  node deploy-helper.js status
  node deploy-helper.js report
`);
  }
}

module.exports = {
  updateMainnetAddresses,
  updateNextJsEnv,
  generateDeploymentReport,
  trackDeployment,
  checkDeploymentStatus,
};
