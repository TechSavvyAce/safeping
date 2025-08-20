require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Environment variables for production deployment
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BSC_API_KEY = process.env.BSC_API_KEY;

if (!PRIVATE_KEY) {
  console.log(PRIVATE_KEY);
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

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
    bscMainnet: {
      url: "https://bsc-dataseed1.binance.org/",
      chainId: 56,
      accounts: [PRIVATE_KEY],
      gasPrice: 3000000000,
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: BSC_API_KEY, // Use single API key format
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
