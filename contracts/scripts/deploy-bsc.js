const { ethers } = require("hardhat");

async function main() {
  console.log("�� Deploying SafePing to BSC Mainnet...");

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);

  // BSC USDT contract address
  const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
  const CHAIN_ID = 56;

  let balance;
  try {
    balance = await deployer.getBalance();
  } catch (error) {
    // Fallback: get balance using provider
    const provider = ethers.provider;
    balance = await provider.getBalance(deployer.address);
  }
  console.log(`🔗 USDT Contract: ${USDT_CONTRACT}`);
  console.log(`🌐 Chain ID: ${CHAIN_ID}`);

  // Deploy SafePing
  const SafePing = await ethers.getContractFactory("evm/SafePing.sol:SafePing");
  const safePing = await SafePing.deploy(USDT_CONTRACT, CHAIN_ID);

  console.log("⏳ Waiting for deployment...");
  await safePing.waitForDeployment();

  const deployedAddress = await safePing.getAddress();
  const deploymentReceipt = await safePing.deploymentTransaction().wait(5);

  console.log(`✅ SafePing deployed to: ${deployedAddress}`);
  console.log(`🔗 Transaction hash: ${deploymentReceipt.hash}`);
  console.log("✅ Deployment confirmed!");
  console.log("✅ Deployment confirmed!");

  // Verify deployment
  const owner = await safePing.owner();
  const usdtContract = await safePing.usdtContract();
  const chainId = await safePing.chainId();

  console.log("\n📋 Contract Details:");
  console.log(`   Owner: ${owner}`);
  console.log(`   USDT Contract: ${usdtContract}`);
  console.log(`   Chain ID: ${chainId}`);

  // Save deployment info
  const deploymentInfo = {
    network: "BSC Mainnet",
    contract: "SafePing",
    address: deployedAddress,
    owner: owner,
    usdtContract: usdtContract,
    chainId: chainId.toString(),
    transactionHash: deploymentReceipt.hash,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
  };

  const fs = require("fs");
  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments");
  }

  fs.writeFileSync(
    "deployments/bsc-deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployments/bsc-deployment.json");
  console.log("\n🔍 To verify on BSCScan:");
  console.log(
    `npx hardhat verify --network bsc ${safePing.address} ${USDT_CONTRACT} ${CHAIN_ID}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
