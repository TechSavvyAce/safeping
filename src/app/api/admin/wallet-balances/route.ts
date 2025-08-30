// =================================
// 💰 Admin Wallet Balances API Route
// =================================

import { NextRequest, NextResponse } from "next/server";

import { getWalletBalances } from "../../../../lib/database";
import { logger } from "../../../../lib/logger";
import { EVMService } from "../../../../lib/blockchain/evmService";
import { ChainType } from "../../../../lib/types/blockchain";
import { AdminWalletBalance } from "../../../../types";

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

    // Get wallet balances from database
    let balances: AdminWalletBalance[] = [];
    try {
      balances = await getWalletBalances();
      logger.info(
        `Successfully fetched ${balances.length} wallet balances from database`
      );
    } catch (dbError) {
      logger.error("Database error when fetching wallet balances:", dbError);
      console.error("❌ Database error:", dbError);
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

    // Get real USDT balances using existing services
    logger.info("Fetching real USDT balances from blockchain");
    const balancesWithRealUsdt = await Promise.all(
      balances.map(async (wallet: AdminWalletBalance) => {
        try {
          let realUsdtBalance = "0.00";
          // Use existing services based on chain type
          switch (wallet.chain) {
            case "ethereum":
            case "bsc":
              try {
                realUsdtBalance = await EVMService.getUserUSDTBalance(
                  wallet.chain,
                  wallet.address
                );
              } catch (error) {
                logger.warn(`Failed to fetch ${wallet.chain} balance:`, error);
                realUsdtBalance = wallet.usdtBalance || "0.00";
              }
              break;

            case "tron":
              try {
                console.log(
                  `\n=== TRON Balance Check for ${wallet.address} ===`
                );
                console.log(`Stored balance: ${wallet.usdtBalance}`);
                console.log(
                  `Stored balance type: ${typeof wallet.usdtBalance}`
                );

                // Use direct TRON API instead of TronService for more reliability
                const { getChainConfig } = await import(
                  "../../../../lib/utils/chainUtils"
                );
                const config = getChainConfig("tron");
                console.log(`USDT contract address: ${config.usdt}`);
                console.log(
                  `Expected TRON API structure: trc20: [{"${config.usdt}": "balance"}]`
                );

                // First try the general tokens endpoint
                let tronResponse = await fetch(
                  `https://api.trongrid.io/v1/accounts/${wallet.address}/tokens/trc20`,
                  {
                    method: "GET",
                    headers: { Accept: "application/json" },
                    signal: AbortSignal.timeout(10000), // 10 second timeout
                  }
                );

                if (tronResponse.ok) {
                  const tronData = await tronResponse.json();
                  console.log(
                    "TRON API response:",
                    JSON.stringify(tronData, null, 2)
                  );

                  if (tronData.data && tronData.data.length > 0) {
                    // TRON API returns trc20 as array of objects with contract addresses as keys
                    const trc20Data = tronData.data[0].trc20;
                    console.log("TRC20 data:", trc20Data);

                    if (trc20Data && Array.isArray(trc20Data)) {
                      // Find the USDT token data
                      const usdtTokenData = trc20Data.find((tokenObj: any) => {
                        // Check if this object contains the USDT contract address as a key
                        return Object.keys(tokenObj).includes(config.usdt);
                      });

                      if (usdtTokenData) {
                        console.log("Found USDT token data:", usdtTokenData);
                        // Get the balance value using the contract address as key
                        const rawBalance = usdtTokenData[config.usdt];
                        console.log("Raw balance from USDT token:", rawBalance);

                        if (rawBalance) {
                          // USDT has 6 decimals on TRON
                          realUsdtBalance = (
                            parseInt(rawBalance) / 1000000
                          ).toFixed(2);
                          console.log(
                            `Raw balance: ${rawBalance}, Converted: ${realUsdtBalance}`
                          );
                        } else {
                          console.log("No balance found in USDT token data");
                        }
                      } else {
                        console.log("USDT token not found in TRC20 data");
                      }
                    } else {
                      console.log("No TRC20 data found in response");
                    }
                  } else {
                    console.log("No account data in TRON response");
                  }
                } else {
                  console.log(
                    `TRON API failed with status: ${tronResponse.status}`
                  );
                }

                // Fallback: Try the contract-specific endpoint if still no balance
                if (realUsdtBalance === "0.00") {
                  console.log("Trying contract-specific endpoint...");
                  tronResponse = await fetch(
                    `https://api.trongrid.io/v1/accounts/${wallet.address}/tokens/trc20?contract_address=${config.usdt}`,
                    {
                      method: "GET",
                      headers: { Accept: "application/json" },
                      signal: AbortSignal.timeout(10000), // 10 second timeout
                    }
                  );

                  if (tronResponse.ok) {
                    const tronData = await tronResponse.json();
                    console.log(
                      "Contract-specific response:",
                      JSON.stringify(tronData, null, 2)
                    );

                    if (tronData.data && tronData.data.length > 0) {
                      // Contract-specific endpoint returns the same structure
                      const trc20Data = tronData.data[0].trc20;
                      console.log("Contract-specific TRC20 data:", trc20Data);

                      if (trc20Data && Array.isArray(trc20Data)) {
                        const usdtTokenData = trc20Data.find(
                          (tokenObj: any) => {
                            return Object.keys(tokenObj).includes(config.usdt);
                          }
                        );

                        if (usdtTokenData) {
                          console.log(
                            "Found USDT token in contract-specific data:",
                            usdtTokenData
                          );
                          const rawBalance = usdtTokenData[config.usdt];

                          if (rawBalance) {
                            // USDT has 6 decimals on TRON
                            realUsdtBalance = (
                              parseInt(rawBalance) / 1000000
                            ).toFixed(2);
                            console.log(
                              `Fallback - Raw balance: ${rawBalance}, Converted: ${realUsdtBalance}`
                            );
                          }
                        }
                      }
                    }
                  }
                }

                // If still no balance found, keep the stored balance
                if (realUsdtBalance === "0.00") {
                  console.log("Using stored balance as fallback");
                  // Check if stored balance is in raw format (like "1000000" = 1 USDT)
                  if (
                    wallet.usdtBalance &&
                    !isNaN(parseFloat(wallet.usdtBalance))
                  ) {
                    const storedBalance = parseFloat(wallet.usdtBalance);
                    console.log(`Stored balance parsed: ${storedBalance}`);

                    // Check if it's in raw format (6 decimals) or already in USDT format
                    if (storedBalance >= 1000000) {
                      // Likely in raw format, convert to USDT
                      realUsdtBalance = (storedBalance / 1000000).toFixed(2);
                      console.log(
                        `Converted stored balance from raw: ${storedBalance} -> ${realUsdtBalance} USDT`
                      );
                    } else if (storedBalance >= 1) {
                      // Likely already in USDT format
                      realUsdtBalance = storedBalance.toFixed(2);
                      console.log(
                        `Using stored balance as USDT: ${realUsdtBalance}`
                      );
                    } else if (storedBalance > 0) {
                      // Small amount, might be in USDT format
                      realUsdtBalance = storedBalance.toFixed(6);
                      console.log(
                        `Using stored balance as small USDT amount: ${realUsdtBalance}`
                      );
                    } else {
                      realUsdtBalance = "0.00";
                      console.log(
                        `Stored balance is 0 or negative: ${storedBalance}`
                      );
                    }
                  } else {
                    realUsdtBalance = wallet.usdtBalance || "0.00";
                    console.log(
                      `Using stored balance fallback: ${realUsdtBalance}`
                    );
                  }
                }

                console.log(
                  `Final TRON balance for ${wallet.address}: ${realUsdtBalance}`
                );
                console.log(`=== End TRON Balance Check ===\n`);
              } catch (error) {
                logger.warn(`Failed to fetch TRON balance:`, error);
                console.error("TRON balance fetch error:", error);
                realUsdtBalance = wallet.usdtBalance || "0.00";
              }
              break;

            default:
              realUsdtBalance = wallet.usdtBalance || "0.00";
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
            realUsdtBalance: wallet.usdtBalance || "0.00",
            lastUpdated: new Date().toISOString(),
            error: "Failed to fetch real balance",
          };
        }
      })
    );

    logger.info("Successfully processed all wallet balances");

    // Log summary of results
    const tronWallets = balancesWithRealUsdt.filter((w) => w.chain === "tron");
    const evmWallets = balancesWithRealUsdt.filter(
      (w) => w.chain === "ethereum" || w.chain === "bsc"
    );

    console.log(`\n=== BALANCE UPDATE SUMMARY ===`);
    console.log(`Total wallets: ${balancesWithRealUsdt.length}`);
    console.log(`TRON wallets: ${tronWallets.length}`);
    console.log(`EVM wallets: ${evmWallets.length}`);

    // Check for any wallets with 0 balance that should have balance
    const zeroBalanceWallets = balancesWithRealUsdt.filter(
      (w) =>
        w.realUsdtBalance === "0.00" && parseFloat(w.usdtBalance || "0") > 0
    );

    if (zeroBalanceWallets.length > 0) {
      console.log(
        `⚠️  Wallets with 0 real balance but stored balance > 0: ${zeroBalanceWallets.length}`
      );
      zeroBalanceWallets.forEach((w) => {
        console.log(
          `  - ${w.address} (${w.chain}): stored=${w.usdtBalance}, real=${w.realUsdtBalance}`
        );
      });
    }

    console.log(`=== END SUMMARY ===\n`);

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
