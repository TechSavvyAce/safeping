const { ethers } = require("hardhat");

async function main() {
  console.log("�� Deploying SafePing to Ethereum Mainnet...");

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);

  // Ethereum USDT contract address
  const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const CHAIN_ID = 1;

  let balance;
  try {
    balance = await deployer.getBalance();
  } catch (error) {
    // Fallback: get balance using provider
    const provider = ethers.provider;
    balance = await provider.getBalance(deployer.address);
  }

  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 USDT Contract: ${USDT_CONTRACT}`);
  console.log(`🌐 Chain ID: ${CHAIN_ID}`);

  // Deploy SafePing
  const SafePing = await ethers.getContractFactory("evm/SafePing.sol:SafePing");
  const safePing = await SafePing.deploy(USDT_CONTRACT, CHAIN_ID);

  console.log("⏳ Waiting for deployment...");
  await safePing.deployed();

  console.log(`✅ SafePing deployed to: ${safePing.address}`);
  console.log(`🔗 Transaction hash: ${safePing.deployTransaction.hash}`);

  // Wait for confirmations
  await safePing.deployTransaction.wait(5);
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
    network: "Ethereum Mainnet",
    contract: "SafePing",
    address: safePing.address,
    owner: owner,
    usdtContract: usdtContract,
    chainId: chainId.toString(),
    transactionHash: safePing.deployTransaction.hash,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
  };

  const fs = require("fs");
  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments");
  }

  fs.writeFileSync(
    "deployments/ethereum-deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(
    "\n💾 Deployment info saved to deployments/ethereum-deployment.json"
  );
  console.log("\n�� To verify on Etherscan:");
  console.log(
    `npx hardhat verify --network ethereum ${safePing.address} ${USDT_CONTRACT} ${CHAIN_ID}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
