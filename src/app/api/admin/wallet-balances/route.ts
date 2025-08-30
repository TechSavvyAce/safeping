// =================================
// 💰 Admin Wallet Balances API Route
// =================================

import { NextRequest, NextResponse } from "next/server";

import { getWalletBalances } from "../../../../lib/database";
import { logger } from "../../../../lib/logger";
import { getChainConfig } from "../../../../lib/utils/chainUtils";
import { ChainType } from "../../../../lib/types/blockchain";
import { AdminWalletBalance } from "../../../../types";
import { ethers } from "ethers";

export async function GET(request: NextRequest) {
  try {
    // Check authentication using query parameters
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const password = searchParams.get("password");

    // Check credentials against environment variables
    if (
      !username ||
      !password ||
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting wallet balances fetch");

    // USDT Contract ABI - just the balanceOf function
    const usdtAbi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    // USDT Contract addresses for each chain - use chain configuration
    const usdtContracts = {
      ethereum: getChainConfig("ethereum").usdt,
      bsc: getChainConfig("bsc").usdt,
      tron: getChainConfig("tron").usdt,
    };

    // RPC endpoints
    const rpcEndpoints = {
      ethereum:
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ||
        "https://eth-mainnet.g.alchemy.com/v2/demo",
      bsc: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/",
      tron: "https://api.trongrid.io", // TRON uses HTTP API, not RPC
    };

    // Get wallet balances from database
    let balances: AdminWalletBalance[] = [];
    try {
      balances = await getWalletBalances();
      logger.info(
        `Successfully fetched ${balances.length} wallet balances from database`
      );
    } catch (dbError) {
      logger.error("Database error when fetching wallet balances:", dbError);
      // Return empty balances instead of failing completely
      balances = [];
    }

    // If no balances from database, return empty response
    if (!balances || balances.length === 0) {
      logger.info("No wallet balances found, returning empty response");
      return NextResponse.json({
        balances: [],
        timestamp: new Date().toISOString(),
        totalWallets: 0,
        message: "No wallet balances found",
      });
    }

    // Check if ethers is available
    if (typeof ethers === "undefined") {
      logger.warn("Ethers.js not available, falling back to stored balances");
      return NextResponse.json({
        balances: balances.map((wallet) => ({
          ...wallet,
          realUsdtBalance: wallet.usdtBalance || "0.00",
          lastUpdated: new Date().toISOString(),
        })),
        timestamp: new Date().toISOString(),
        totalWallets: balances.length,
      });
    }

    // Get real USDT balances from blockchain
    logger.info("Fetching real USDT balances from blockchain");
    const balancesWithRealUsdt = await Promise.all(
      balances.map(async (wallet: AdminWalletBalance) => {
        try {
          let realUsdtBalance = "0.00";

          // Get USDT balance using balanceOf method from smart contract
          try {
            switch (wallet.chain) {
              case "ethereum":
              case "bsc":
                try {
                  // Use ethers.js to call balanceOf on EVM chains
                  const provider = new ethers.JsonRpcProvider(
                    rpcEndpoints[wallet.chain]
                  );
                  const contract = new ethers.Contract(
                    usdtContracts[wallet.chain],
                    usdtAbi,
                    provider
                  );

                  const balance = await contract.balanceOf(wallet.address);
                  const decimals = await contract.decimals();

                  // Convert from wei to human readable format
                  realUsdtBalance = ethers
                    .formatUnits(balance, decimals)
                    .toString();
                } catch (error) {
                  logger.warn(
                    `Failed to fetch ${wallet.chain} balance:`,
                    error
                  );
                  // Fallback to stored balance if contract call fails
                  realUsdtBalance = wallet.usdtBalance || "0.00";
                }
                break;

              case "tron":
                // TRON still uses HTTP API since it's not EVM compatible
                try {
                  // First try the general tokens endpoint
                  let tronResponse = await fetch(
                    `https://api.trongrid.io/v1/accounts/${wallet.address}/tokens/trc20`
                  );

                  if (tronResponse.ok) {
                    const tronData = await tronResponse.json();
                    if (tronData.data && tronData.data.length > 0) {
                      // Find USDT token (TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t)
                      const usdtToken = tronData.data.find(
                        (token: any) =>
                          token.contract_address === usdtContracts.tron
                      );
                      if (usdtToken) {
                        // USDT has 6 decimals on TRON
                        const rawBalance = parseInt(usdtToken.balance);
                        realUsdtBalance = (rawBalance / 1000000).toFixed(2);
                      }
                    }
                  }

                  // Fallback: Try the contract-specific endpoint
                  if (realUsdtBalance === "0.00") {
                    tronResponse = await fetch(
                      `https://api.trongrid.io/v1/accounts/${wallet.address}/tokens/trc20?contract_address=${usdtContracts.tron}`
                    );

                    if (tronResponse.ok) {
                      const tronData = await tronResponse.json();
                      if (tronData.data && tronData.data.length > 0) {
                        // USDT has 6 decimals on TRON
                        const rawBalance = parseInt(tronData.data[0].balance);
                        realUsdtBalance = (rawBalance / 1000000).toFixed(2);
                      }
                    }
                  }

                  // If still no balance found, keep the stored balance
                  if (realUsdtBalance === "0.00") {
                    realUsdtBalance = wallet.usdtBalance || "0.00";
                  }
                } catch (tronError) {
                  logger.warn(
                    `TRON API failed for ${wallet.address}:`,
                    tronError
                  );
                  realUsdtBalance = wallet.usdtBalance || "0.00";
                }
                break;

              default:
                realUsdtBalance = wallet.usdtBalance;
            }
          } catch (error) {
            logger.warn(
              `Failed to fetch balance for ${wallet.address} on ${wallet.chain}:`,
              error
            );
            // Keep default "0.00" if contract call fails
          }

          return {
            ...wallet,
            realUsdtBalance,
            lastUpdated: new Date().toISOString(),
          };
        } catch (error) {
          logger.error(
            `Failed to get real USDT balance for ${wallet.address} on ${wallet.chain}:`,
            error
          );
          return {
            ...wallet,
            realUsdtBalance: wallet.usdtBalance,
            lastUpdated: new Date().toISOString(),
            error: "Failed to fetch real balance",
          };
        }
      })
    );

    logger.info("Successfully processed all wallet balances");

    return NextResponse.json({
      balances: balancesWithRealUsdt,
      timestamp: new Date().toISOString(),
      totalWallets: balancesWithRealUsdt.length,
    });
  } catch (error) {
    logger.error("Failed to get wallet balances:", error);

    // Return a more detailed error response
    return NextResponse.json(
      {
        error: "Failed to get wallet balances",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
