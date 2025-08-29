require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./evm", // Change this to the correct path
    artifacts: "./artifacts",
  },
  networks: {
    // Ethereum Mainnet
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://eth.drpc.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gasPrice: 20000000000, // 20 gwei
    },
    // BSC Mainnet
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 5000000000, // 5 gwei
    },
    // For testing
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      ethereum: process.env.ETHERSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
    },
  },
};
