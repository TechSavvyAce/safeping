"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

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
  paymentCount: number;
  totalVolume: number;
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

  // Add a more frequent refresh for critical data
  useEffect(() => {
    const criticalRefreshInterval = setInterval(() => {
      // Only refresh if not currently loading
      if (!isLoading) {
        fetchDashboardData();
      }
    }, 10000); // Refresh every 10 seconds for critical updates

    return () => clearInterval(criticalRefreshInterval);
  }, [isLoading]);

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
                <span>⏰ 自动刷新: 10秒</span>
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
        {/* Stats Overview */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-900/20 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">总支付数</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboardStats.metrics?.totalPayments || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-900/20 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">成功率</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboardStats.metrics?.successRate || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-900/20 rounded-lg">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">待处理</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboardStats.breakdown?.pending || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-900/20 rounded-lg">
                  <span className="text-2xl">💵</span>
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">总交易额</p>
                  <p className="text-2xl font-bold text-white">
                    $
                    {(
                      dashboardStats.metrics?.totalVolume || 0
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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
                      金额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      区块链
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      钱包地址
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      操作
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
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {getChainIcon(payment.chain)}
                          </span>
                          <span className="text-sm text-white capitalize">
                            {payment.chain === "ethereum"
                              ? "以太坊"
                              : payment.chain === "bsc"
                              ? "币安智能链"
                              : payment.chain === "tron"
                              ? "波场"
                              : payment.chain}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.wallet_address ? (
                          <div className="text-sm font-mono text-blue-400">
                            {payment.wallet_address.slice(0, 8)}...
                            {payment.wallet_address.slice(-6)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">未提供</span>
                        )}
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
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

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
                $
                {walletBalances
                  .reduce((sum, w) => sum + w.totalVolume, 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">钱包总交易额</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {walletBalances.reduce((sum, w) => sum + w.paymentCount, 0)}
              </div>
              <div className="text-sm text-gray-400">总支付次数</div>
            </div>
          </div>
        </div>

        {/* Wallet Balances */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 mt-8">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-white">
              钱包余额 ({walletBalances.length})
            </h2>
          </div>

          <div className="p-6">
            {walletBalances.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                未找到钱包余额信息
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {walletBalances.map((wallet, index) => (
                  <div
                    key={index}
                    className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {getChainIcon(wallet.chain)}
                        </span>
                        <span className="text-sm font-medium text-white capitalize">
                          {wallet.chain === "ethereum"
                            ? "以太坊"
                            : wallet.chain === "bsc"
                            ? "币安智能链"
                            : wallet.chain === "tron"
                            ? "波场"
                            : wallet.chain}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-gray-400">地址</div>
                      <div className="text-sm font-mono text-blue-400 break-all">
                        {wallet.address}
                      </div>

                      <div className="text-xs text-gray-400">原生代币余额</div>
                      <div className="text-sm font-semibold text-white">
                        {wallet.balance}
                      </div>

                      <div className="text-xs text-gray-400">USDT余额</div>
                      <div className="text-sm font-semibold text-green-400">
                        {wallet.usdtBalance}
                      </div>

                      <div className="text-xs text-gray-400">支付次数</div>
                      <div className="text-sm font-semibold text-white">
                        {wallet.paymentCount}
                      </div>

                      <div className="text-xs text-gray-400">总交易额</div>
                      <div className="text-sm font-semibold text-white">
                        ${wallet.totalVolume.toLocaleString()}
                      </div>

                      <div className="text-xs text-gray-400">最后活动</div>
                      <div className="text-sm text-gray-400">
                        {wallet.lastActivity
                          ? new Date(wallet.lastActivity).toLocaleDateString()
                          : "从未"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
