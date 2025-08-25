"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import { ethers } from "ethers";

// Add ethers to window for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Payment {
  id: string;
  payment_id: string;
  service_name: string;
  amount: number;
  chain: string;
  status: string;
  wallet_address?: string;
  tx_hash?: string;
  created_at: string;
  expires_at: string;
}

interface WalletBalance {
  address: string;
  chain: string;
  balance: string;
  usdtBalance: string;
  realUsdtBalance?: string;
  paymentCount: number;
  lastActivity: string | null;
}

interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalAmount: number;
}

interface DashboardData {
  system: {
    status: string;
    network: string;
    timestamp: string;
  };
  stats: {
    last30Days: DashboardStats;
    last24Hours: DashboardStats;
  };
  metrics: {
    totalPayments: number;
    successRate: string;
    totalVolume: number;
    averagePayment: string;
  };
  breakdown: {
    completed: number;
    pending: number;
    failed: number;
    expired: number;
  };
}

export default function AdminDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [lastDataRefresh, setLastDataRefresh] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChain, setSelectedChain] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingPayments, setUpdatingPayments] = useState<Set<string>>(
    new Set()
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "wallets">(
    "payments"
  );
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractAddress, setExtractAddress] = useState("");
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuthenticated");
    const loginTime = localStorage.getItem("adminLoginTime");

    if (!isAuthenticated || !loginTime) {
      router.push("/admin");
      return;
    }

    // Check if session is expired (24 hours)
    const sessionAge = Date.now() - parseInt(loginTime);
    if (sessionAge > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("adminAuthenticated");
      localStorage.removeItem("adminLoginTime");
      router.push("/admin");
      return;
    }

    fetchDashboardData();
  }, [router]);

  // Set up auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 30000);

    // Set up time update every second
    const timeInterval = setInterval(() => {
      setLastRefresh(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  // Removed critical refresh interval to reduce system stress
  // Users can manually refresh when needed

  // Check for expired payments every minute
  useEffect(() => {
    const expiredCheckInterval = setInterval(() => {
      updateExpiredPayments();
    }, 60000); // Check every minute

    return () => clearInterval(expiredCheckInterval);
  }, [payments]);

  // Check for expired payments on initial load
  useEffect(() => {
    if (payments.length > 0) {
      updateExpiredPayments();
    }
  }, [payments]);

  // Debug environment status
  useEffect(() => {
    console.log("🔍 Admin Dashboard Environment Check:");
    console.log("🔍 Current URL:", window.location.origin);
    console.log(
      "🔍 Admin Auth Status:",
      localStorage.getItem("adminAuthenticated")
        ? "Authenticated"
        : "Not authenticated"
    );
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("adminAuthenticated");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      // Fetch dashboard stats
      const statsResponse = await fetch("/api/admin/dashboard", {
        headers,
      });

      if (!statsResponse.ok) {
        throw new Error(`Dashboard API error: ${statsResponse.status}`);
      }

      const statsData: DashboardData = await statsResponse.json();
      setDashboardStats(statsData);

      // Fetch payments
      const paymentsResponse = await fetch("/api/admin/payments?limit=100", {
        headers,
      });

      if (!paymentsResponse.ok) {
        throw new Error(`Payments API error: ${paymentsResponse.status}`);
      }

      const paymentsData = await paymentsResponse.json();
      setPayments(paymentsData.payments || []);

      // Fetch wallet balances
      const balancesResponse = await fetch("/api/admin/wallet-balances", {
        headers,
      });

      if (!balancesResponse.ok) {
        throw new Error(
          `Wallet balances API error: ${balancesResponse.status}`
        );
      }

      const balancesData = await balancesResponse.json();
      setWalletBalances(balancesData.balances || []);

      setLastRefresh(new Date());
      setLastDataRefresh(new Date());
      setIsInitialLoading(false);
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error);
      setError(error.message || "获取仪表板数据失败");
      setIsInitialLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("adminLoginTime");
    router.push("/admin");
  };

  const confirmPaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const headers = getAuthHeaders();
      const isUpdating = updatingPayments.has(paymentId);

      if (isUpdating) {
        console.log(`Payment ${paymentId} is already updating.`);
        return;
      }

      setUpdatingPayments((prev) => new Set([...prev, paymentId]));

      const response = await fetch(`/api/admin/payments/${paymentId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update payment status: ${response.status}`);
      }

      // Refresh data after successful update
      await fetchDashboardData();

      // Show success message
      setSuccess(`支付状态已更新为: ${newStatus}`);
      setError(null);

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error("Failed to update payment status:", error);
      setError(error.message || "更新支付状态失败");
    } finally {
      setUpdatingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(paymentId);
        return newSet;
      });
    }
  };

  // Function to automatically update expired payments
  const updateExpiredPayments = async () => {
    try {
      const now = new Date();
      const expiredPayments = payments.filter((payment) => {
        const expiresAt = new Date(payment.expires_at);
        return payment.status === "pending" && now > expiresAt;
      });

      if (expiredPayments.length > 0) {
        console.log(
          `Found ${expiredPayments.length} expired payments, updating...`
        );

        // Update each expired payment
        for (const payment of expiredPayments) {
          try {
            const headers = getAuthHeaders();
            await fetch(`/api/admin/payments/${payment.payment_id}/status`, {
              method: "PUT",
              headers,
              body: JSON.stringify({ status: "expired" }),
            });
          } catch (error) {
            console.error(
              `Failed to update expired payment ${payment.payment_id}:`,
              error
            );
          }
        }

        // Refresh data after updating expired payments
        await fetchDashboardData();
        setSuccess(`已自动更新 ${expiredPayments.length} 个过期支付状态`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error("Failed to update expired payments:", error);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    // Check if payment is expired and update status if needed
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    const isExpired = now > expiresAt;

    // If payment is pending and expired, update the local state to show as expired
    if (payment.status === "pending" && isExpired) {
      // Update the local payment status to expired for display purposes
      payment.status = "expired";
    }

    const matchesSearch =
      payment.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.wallet_address
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChain =
      selectedChain === "all" || payment.chain === selectedChain;
    const matchesStatus =
      selectedStatus === "all" || payment.status === selectedStatus;

    return matchesSearch && matchesChain && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-900/20 border-green-700/50";
      case "pending":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-700/50";
      case "failed":
        return "text-red-400 bg-red-900/20 border-red-700/50";
      case "expired":
        return "text-gray-400 bg-gray-900/20 border-gray-700/50";
      default:
        return "text-blue-400 bg-blue-900/20 border-blue-700/50";
    }
  };

  const getChainIcon = (chain: string) => {
    switch (chain) {
      case "ethereum":
        return "🔵";
      case "bsc":
        return "🟡";
      case "tron":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getChainExplorer = (chain: string, txHash: string) => {
    switch (chain) {
      case "ethereum":
        return `https://etherscan.io/tx/${txHash}`;
      case "bsc":
        return `https://bscscan.com/tx/${txHash}`;
      case "tron":
        return `https://tronscan.org/#/transaction/${txHash}`;
      default:
        return "#";
    }
  };

  const getChainExplorerAddress = (chain: string, address: string) => {
    switch (chain) {
      case "ethereum":
        return `https://etherscan.io/address/${address}`;
      case "bsc":
        return `https://bscscan.com/address/${address}`;
      case "tron":
        return `https://tronscan.org/#/address/${address}`;
      default:
        return "#";
    }
  };

  const handlePayClick = async (wallet: WalletBalance) => {
    // Prevent multiple clicks
    if (processingPayments.has(wallet.address)) {
      return;
    }

    setProcessingPayments((prev) => new Set([...prev, wallet.address]));

    const realBalance =
      wallet.realUsdtBalance === "API_ERROR"
        ? "无法获取"
        : wallet.realUsdtBalance || "0.00";

    console.log(`🚀 Pay function triggered for wallet: ${wallet.address}`);
    console.log(`💰 Chain: ${wallet.chain}`);
    console.log(`💵 Real USDT Balance: ${realBalance}`);
    console.log(`💵 Stored USDT Balance: ${wallet.usdtBalance}`);
    console.log(`📊 Payment Count: ${wallet.paymentCount}`);

    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === "undefined") {
        alert("请安装 MetaMask 钱包以继续支付");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const userAddress = accounts[0];

      console.log(`🔐 Connected wallet: ${userAddress}`);

      // Check if connected wallet matches the wallet in the table
      if (userAddress.toLowerCase() !== wallet.address.toLowerCase()) {
        alert(
          `钱包地址不匹配!\n\n当前连接: ${userAddress}\n表格地址: ${wallet.address}\n\n请连接正确的钱包地址。`
        );
        return;
      }

      // USDT Contract addresses for each chain
      const usdtContracts = {
        ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        bsc: "0x55d398326f99059fF775485246999027B3197955",
        tron: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      };

      // USDT ABI for approve function
      const usdtAbi = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      // Get the correct USDT contract address
      const usdtAddress =
        usdtContracts[wallet.chain as keyof typeof usdtContracts];
      if (!usdtAddress) {
        alert(`不支持的区块链: ${wallet.chain}`);
        return;
      }

      // Create provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdtContract = new ethers.Contract(usdtAddress, usdtAbi, signer);

      // Check current allowance
      const currentAllowance = await usdtContract.allowance(
        userAddress,
        userAddress
      );
      console.log(
        `📊 Current USDT allowance: ${ethers.formatUnits(currentAllowance, 6)}`
      );

      // Check if approval is needed
      const balance = await usdtContract.balanceOf(userAddress);
      const balanceFormatted = ethers.formatUnits(balance, 6);

      if (currentAllowance.gte(balance)) {
        alert(
          `✅ USDT 已获得足够授权!\n\n当前余额: ${balanceFormatted} USDT\n当前授权: ${ethers.formatUnits(
            currentAllowance,
            6
          )} USDT\n\n无需额外授权即可进行支付。`
        );
        return;
      }

      // Request approval for maximum amount
      const maxAmount = ethers.MaxUint256;
      console.log(`🔐 Requesting USDT approval for maximum amount...`);

      const approvalTx = await usdtContract.approve(userAddress, maxAmount);
      console.log(`📝 Approval transaction hash: ${approvalTx.hash}`);

      // Wait for confirmation
      const receipt = await approvalTx.wait();
      console.log(`✅ USDT approval confirmed! Block: ${receipt.blockNumber}`);

      // Check new allowance
      const newAllowance = await usdtContract.allowance(
        userAddress,
        userAddress
      );

      alert(
        `🎉 USDT 授权成功!\n\n交易哈希: ${
          approvalTx.hash
        }\n新授权额度: ${ethers.formatUnits(
          newAllowance,
          6
        )} USDT\n\n现在可以进行支付了!`
      );
    } catch (error: any) {
      console.error("❌ USDT approval failed:", error);

      if (error.code === 4001) {
        alert("❌ 用户拒绝了交易");
      } else if (error.message?.includes("insufficient funds")) {
        alert("❌ 钱包余额不足，无法支付交易费用");
      } else {
        alert(`❌ USDT 授权失败: ${error.message || "未知错误"}`);
      }
    } finally {
      setProcessingPayments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(wallet.address);
        return newSet;
      });
    }
  };

  const handleExtract = () => {
    setShowExtractModal(true);
  };

  const handleExtractConfirm = () => {
    console.log("✅ Extract confirmed!");
    console.log("📍 Target address:", extractAddress);
    console.log("success");
    setShowExtractModal(false);
    setExtractAddress("");
  };

  const handleExtractCancel = () => {
    setShowExtractModal(false);
    setExtractAddress("");
  };

  const fetchRealUsdtBalances = async () => {
    if (walletBalances.length === 0) return;

    setIsLoadingBalances(true);
    try {
      // Refresh wallet balances from API to get real-time USDT balances
      const headers = getAuthHeaders();
      const response = await fetch("/api/admin/wallet-balances", { headers });

      if (response.ok) {
        const data = await response.json();
        console.log("Real USDT balances API response:", data);

        // Update wallet balances with real USDT amounts
        const updatedBalances = data.balances.map((wallet: any) => ({
          ...wallet,
          // Ensure we're using the real balance from the API response
          realUsdtBalance: wallet.realUsdtBalance || "0.00",
        }));

        console.log(
          "Updated wallet balances with real USDT amounts:",
          updatedBalances
        );
        setWalletBalances(updatedBalances);

        // Show success message if no API errors
        if (
          !updatedBalances.some(
            (w: WalletBalance) => w.realUsdtBalance === "API_ERROR"
          )
        ) {
          setSuccess("实时余额已更新");
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError("部分余额无法获取 - 请检查API密钥");
          setTimeout(() => setError(null), 5000);
        }
      } else {
        console.error("Failed to fetch real USDT balances:", response.status);
        setError("获取实时余额失败");
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error("Failed to fetch real USDT balances:", error);
      setError("获取实时余额时发生错误");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Fetch real USDT balances when wallets tab is active
  useEffect(() => {
    // Only fetch real balances when manually requested, not automatically
    // This reduces API calls and system stress
  }, [activeTab, walletBalances]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">正在加载管理后台...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">📊 管理后台</h1>
              <span className="px-2 py-1 bg-green-900/20 border border-green-700/50 rounded text-green-400 text-xs">
                已认证
              </span>
              {isLoading && (
                <div className="flex items-center space-x-2 px-2 py-1 bg-blue-900/20 border border-blue-700/50 rounded text-blue-400 text-xs">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>刷新中</span>
                </div>
              )}
              <div className="flex items-center space-x-2 px-2 py-1 bg-yellow-900/20 border border-yellow-700/50 rounded text-yellow-400 text-xs">
                <span>⏰ 手动刷新</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-xs text-gray-400">最后更新</div>
                <div className="text-sm text-white">
                  {lastRefresh.toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={isLoading}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isLoading
                    ? "bg-gray-600 cursor-not-allowed text-gray-400"
                    : "bg-red-600 hover:bg-red-700 text-white"
                )}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>刷新中</span>
                  </div>
                ) : (
                  "🔄 刷新数据"
                )}
              </button>
              <button
                onClick={() => {
                  // Force immediate refresh
                  fetchDashboardData();
                  setSuccess("数据已强制刷新");
                  setTimeout(() => setSuccess(null), 2000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ⚡ 强制刷新
              </button>
              <button
                onClick={updateExpiredPayments}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ⏰ 检查过期支付
              </button>
              <button
                onClick={handleExtract}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🧪 测试提取
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Status Messages */}
      {(error || success) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-400">❌</span>
                <span className="text-red-200">{error}</span>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-green-400">✅</span>
                <span className="text-green-200">{success}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                搜索
              </label>
              <input
                type="text"
                placeholder="搜索支付ID、钱包地址或服务名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                区块链网络
              </label>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">所有网络</option>
                <option value="ethereum">以太坊</option>
                <option value="bsc">币安智能链</option>
                <option value="tron">波场</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                支付状态
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">所有状态</option>
                <option value="pending">待处理</option>
                <option value="completed">已完成</option>
                <option value="failed">失败</option>
                <option value="expired">已过期</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedChain("all");
                  setSelectedStatus("all");
                }}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                🗑️ 清除筛选
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab("payments")}
              className={cn(
                "px-6 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === "payments"
                  ? "bg-red-600 text-white"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
              )}
            >
              💰 支付记录 ({filteredPayments.length})
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={cn(
                "px-6 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === "wallets"
                  ? "bg-red-600 text-white"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
              )}
            >
              🏦 钱包地址 ({walletBalances.length})
            </button>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {payments.filter((p) => p.status === "completed").length}
              </div>
              <div className="text-sm text-gray-400">已完成</div>
              <div className="text-xs text-gray-500">
                $
                {payments
                  .filter((p) => p.status === "completed")
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {payments.filter((p) => p.status === "pending").length}
              </div>
              <div className="text-sm text-gray-400">待处理</div>
              <div className="text-xs text-gray-500">
                $
                {payments
                  .filter((p) => p.status === "pending")
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {payments.filter((p) => p.status === "failed").length}
              </div>
              <div className="text-sm text-gray-400">失败</div>
              <div className="text-xs text-gray-500">
                $
                {payments
                  .filter((p) => p.status === "failed")
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">
                {payments.filter((p) => p.status === "expired").length}
              </div>
              <div className="text-sm text-gray-400">已过期</div>
              <div className="text-xs text-gray-500">
                $
                {payments
                  .filter((p) => p.status === "expired")
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString()}
              </div>
              <div className="text-xs text-red-400 mt-1">
                {
                  payments.filter((p) => {
                    const now = new Date();
                    const expiresAt = new Date(p.expires_at);
                    return p.status === "pending" && now > expiresAt;
                  }).length
                }{" "}
                个待更新
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        {activeTab === "payments" && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold text-white">
                支付交易记录 ({filteredPayments.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">
                    {searchTerm ||
                    selectedChain !== "all" ||
                    selectedStatus !== "all" ? (
                      <>
                        <div className="text-4xl mb-4">🔍</div>
                        <p>未找到匹配的支付记录</p>
                        <p className="text-sm text-gray-500 mt-2">
                          请尝试调整搜索条件或筛选器
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-4">📭</div>
                        <p>暂无支付记录</p>
                        <p className="text-sm text-gray-500 mt-2">
                          当有新的支付时，它们将显示在这里
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-700/50">
                  <thead className="bg-gray-700/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        支付ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        服务
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        充值金额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-700/20">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-white">
                            {payment.payment_id}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {payment.service_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-white">
                            ${payment.amount}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex px-2 py-1 text-xs font-semibold rounded-full border",
                              getStatusColor(payment.status)
                            )}
                          >
                            {payment.status === "completed"
                              ? "已完成"
                              : payment.status === "pending"
                              ? "待处理"
                              : payment.status === "failed"
                              ? "失败"
                              : payment.status === "expired"
                              ? "已过期"
                              : payment.status}
                          </span>
                          {payment.status === "pending" && (
                            <div className="mt-1 text-xs text-gray-400">
                              过期时间:{" "}
                              {new Date(payment.expires_at).toLocaleString()}
                            </div>
                          )}
                          {payment.status === "expired" && (
                            <div className="mt-1 text-xs text-red-400">
                              过期于:{" "}
                              {new Date(payment.expires_at).toLocaleString()}
                            </div>
                          )}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {payment.status === "pending" && (
                              <>
                                <button
                                  onClick={() =>
                                    confirmPaymentStatus(
                                      payment.payment_id,
                                      "completed"
                                    )
                                  }
                                  disabled={updatingPayments.has(
                                    payment.payment_id
                                  )}
                                  className={cn(
                                    "px-3 py-1 text-white text-xs rounded transition-colors flex items-center justify-center min-w-[60px]",
                                    updatingPayments.has(payment.payment_id)
                                      ? "bg-gray-600 cursor-not-allowed"
                                      : "bg-green-600 hover:bg-green-700"
                                  )}
                                >
                                  {updatingPayments.has(payment.payment_id) ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                      <span>处理中</span>
                                    </>
                                  ) : (
                                    "✅ 完成"
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    confirmPaymentStatus(
                                      payment.payment_id,
                                      "failed"
                                    )
                                  }
                                  disabled={updatingPayments.has(
                                    payment.payment_id
                                  )}
                                  className={cn(
                                    "px-3 py-1 text-white text-xs rounded transition-colors flex items-center justify-center min-w-[60px]",
                                    updatingPayments.has(payment.payment_id)
                                      ? "bg-gray-600 cursor-not-allowed"
                                      : "bg-red-600 hover:bg-red-700"
                                  )}
                                >
                                  {updatingPayments.has(payment.payment_id) ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                      <span>处理中</span>
                                    </>
                                  ) : (
                                    "❌ 失败"
                                  )}
                                </button>
                              </>
                            )}
                            {payment.tx_hash && (
                              <a
                                href={getChainExplorer(
                                  payment.chain,
                                  payment.tx_hash
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                              >
                                🔗 查看交易
                              </a>
                            )}
                          </div>
                        </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Wallet Addresses Tab */}
        {activeTab === "wallets" && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">
                  钱包地址管理 ({walletBalances.length})
                </h2>
                <div className="flex items-center space-x-3">
                  {isLoadingBalances && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-blue-900/20 border border-blue-700/50 rounded text-blue-400 text-xs">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>更新余额中...</span>
                    </div>
                  )}
                  <button
                    onClick={fetchRealUsdtBalances}
                    disabled={isLoadingBalances}
                    className={cn(
                      "px-3 py-1 text-xs rounded transition-colors",
                      isLoadingBalances
                        ? "bg-gray-600 cursor-not-allowed text-gray-400"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    )}
                  >
                    🔄 刷新余额
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {walletBalances.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">
                    <div className="text-4xl mb-4">🏦</div>
                    <p>暂无钱包地址</p>
                    <p className="text-sm text-gray-500 mt-2">
                      当有新的钱包连接时，它们将显示在这里
                    </p>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-700/50">
                  <thead className="bg-gray-700/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        钱包地址
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        区块链
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        USDT余额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        支付次数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {walletBalances.map((wallet, index) => (
                      <tr key={index} className="hover:bg-gray-700/20">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <div className="text-sm font-mono text-blue-400">
                                {wallet.address}
                              </div>
                              <div className="text-xs text-gray-400">
                                最后活动:{" "}
                                {wallet.lastActivity
                                  ? new Date(
                                      wallet.lastActivity
                                    ).toLocaleDateString()
                                  : "从未"}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(wallet.address);
                                  // You can add a toast notification here
                                }}
                                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                                title="复制地址"
                              >
                                {" "}
                              </button>
                              <a
                                href={getChainExplorerAddress(
                                  wallet.chain,
                                  wallet.address
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                                title="查看地址"
                              >
                                {" "}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {getChainIcon(wallet.chain)}
                            </span>
                            <span className="text-sm text-white capitalize">
                              {wallet.chain === "ethereum"
                                ? "eth"
                                : wallet.chain === "bsc"
                                ? "bsc"
                                : wallet.chain === "tron"
                                ? "trc20"
                                : wallet.chain}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-400">
                            {wallet.realUsdtBalance === "API_ERROR"
                              ? "API错误"
                              : wallet.realUsdtBalance
                              ? wallet.realUsdtBalance
                              : "0.00"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {wallet.realUsdtBalance === "API_ERROR"
                              ? "无法获取实时余额"
                              : wallet.realUsdtBalance
                              ? "实时余额"
                              : "未获取"}
                          </div>
                          {wallet.realUsdtBalance === "API_ERROR" && (
                            <div className="text-xs text-red-400 mt-1">
                              存储余额: {wallet.usdtBalance} (非实时)
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {wallet.paymentCount}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePayClick(wallet)}
                              disabled={processingPayments.has(wallet.address)}
                              className={cn(
                                "px-3 py-1 text-white text-xs rounded-md transition-colors",
                                processingPayments.has(wallet.address)
                                  ? "bg-gray-600 cursor-not-allowed"
                                  : "bg-green-600 hover:bg-green-700"
                              )}
                            >
                              {processingPayments.has(wallet.address) ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                  处理中
                                </>
                              ) : (
                                "继续支付"
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Wallet Summary */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {walletBalances.length}
              </div>
              <div className="text-sm text-gray-400">活跃钱包</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {walletBalances.some(
                  (w: WalletBalance) => w.realUsdtBalance === "API_ERROR"
                )
                  ? "API错误"
                  : walletBalances
                      .reduce((sum, w: WalletBalance) => {
                        if (w.realUsdtBalance === "API_ERROR") return sum;
                        return (
                          sum + (parseFloat(w.realUsdtBalance || "0") || 0)
                        );
                      }, 0)
                      .toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">
                {walletBalances.some(
                  (w: WalletBalance) => w.realUsdtBalance === "API_ERROR"
                )
                  ? "无法获取实时余额"
                  : "总USDT余额"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {walletBalances.reduce((sum, w) => sum + w.paymentCount, 0)}
              </div>
              <div className="text-sm text-gray-400">总支付次数</div>
            </div>
          </div>
        </div>

        {/* Extract Modal */}
        {showExtractModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                提取USDT
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  目标地址
                </label>
                <input
                  type="text"
                  value={extractAddress}
                  onChange={(e) => setExtractAddress(e.target.value)}
                  placeholder="输入钱包地址"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {extractAddress && (
                  <div className="mt-2 text-xs text-gray-400">
                    输入地址: {extractAddress}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleExtractCancel}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleExtractConfirm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
