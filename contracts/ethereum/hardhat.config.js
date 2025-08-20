require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Environment variables for production deployment
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY; // From etherscan.io

if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

// RPC URL configuration (use Infura or Alchemy)
let mainnetUrl = `https://eth.llamarpc.com`;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000, // Increased for better runtime optimization
      },
      viaIR: true, // Enable for better optimization with the new contract
    },
  },
  networks: {
    mainnet: {
      url: mainnetUrl,
      chainId: 1,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto", // Let the network determine gas price
      timeout: 120000, // 2 minutes timeout
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY, // Use single API key format
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
