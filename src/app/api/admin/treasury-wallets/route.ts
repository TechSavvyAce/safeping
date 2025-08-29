import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { safePingService } from "@/lib/blockchain/safePingService";

// Helper function to get auth headers
function getAuthHeaders(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  const password = request.nextUrl.searchParams.get("password");
  
  if (!username || !password) {
    throw new Error("Missing authentication credentials");
  }

  return {
    "Content-Type": "application/json",
    "X-Admin-Username": username,
    "X-Admin-Password": password,
  };
}

// Helper function to get auth body
function getAuthBody(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  const password = request.nextUrl.searchParams.get("password");
  
  return { username, password };
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authBody = getAuthBody(request);
    const authResponse = await fetch(`${request.nextUrl.origin}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authBody),
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    const treasuryWallets = await db.getTreasuryWallets();

    // Get owner addresses and balances for each chain
    const enrichedWallets = await Promise.all(
      treasuryWallets.map(async (wallet) => {
        try {
          const chain = wallet.chain as any;
          
          // Get owner address from private key
          let ownerAddress = "";
          let ownerNativeBalance = "0";
          let ownerUSDTBalance = "0";

          try {
            if (chain === "tron") {
              const tronWeb = require("tronweb");
              const privateKey = process.env.TRON_PRIVATE_KEY;
              if (privateKey) {
                const tronInstance = new tronWeb({
                  fullHost: "https://api.trongrid.io",
                  privateKey: privateKey,
                });
                ownerAddress = tronInstance.defaultAddress.base58;
                
                // Get TRON balance
                const balance = await tronInstance.trx.getBalance(ownerAddress);
                ownerNativeBalance = (balance / 1e6).toString(); // Convert from sun to TRX
                
                // Get USDT balance
                const config = await import("@/lib/utils/chainUtils").then(m => m.getChainConfig(chain));
                const usdtContract = await tronInstance.contract().at(config.usdt);
                const usdtBalance = await usdtContract.balanceOf(ownerAddress).call();
                ownerUSDTBalance = (usdtBalance / 1e6).toString(); // USDT has 6 decimals
              }
            } else {
              // EVM chains
              const { ethers } = await import("ethers");
              const privateKey = process.env.PRIVATE_KEY;
              if (privateKey) {
                const wallet = new ethers.Wallet(privateKey);
                ownerAddress = wallet.address;
                
                const config = await import("@/lib/utils/chainUtils").then(m => m.getChainConfig(chain));
                const provider = new ethers.JsonRpcProvider(config.rpc);
                const connectedWallet = wallet.connect(provider);
                
                // Get native token balance
                const balance = await provider.getBalance(ownerAddress);
                ownerNativeBalance = ethers.formatEther(balance);
                
                // Get USDT balance
                const usdtContract = new ethers.Contract(
                  config.usdt,
                  ["function balanceOf(address) view returns (uint256)"],
                  connectedWallet
                );
                const usdtBalance = await usdtContract.balanceOf(ownerAddress);
                ownerUSDTBalance = ethers.formatUnits(usdtBalance, 6); // USDT has 6 decimals
              }
            }
          } catch (error) {
            console.error(`Failed to get owner info for ${chain}:`, error);
          }

          return {
            ...wallet,
            ownerAddress,
            ownerNativeBalance,
            ownerUSDTBalance,
          };
        } catch (error) {
          console.error(`Failed to enrich wallet ${wallet.id}:`, error);
          return wallet;
        }
      })
    );

    return NextResponse.json({ success: true, data: enrichedWallets });
  } catch (error: any) {
    console.error("Treasury wallets API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authBody = getAuthBody(request);
    const authResponse = await fetch(`${request.nextUrl.origin}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authBody),
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chain, address, name, description } = body;

    if (!chain || !address) {
      return NextResponse.json(
        { error: "Chain and address are required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.saveTreasuryWallet(chain, address, name, description);

    return NextResponse.json({ success: true, message: "Treasury wallet saved successfully" });
  } catch (error: any) {
    console.error("Save treasury wallet API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authBody = getAuthBody(request);
    const authResponse = await fetch(`${request.nextUrl.origin}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authBody),
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Wallet ID is required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.deleteTreasuryWallet(parseInt(id));

    return NextResponse.json({ success: true, message: "Treasury wallet deleted successfully" });
  } catch (error: any) {
    console.error("Delete treasury wallet API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
