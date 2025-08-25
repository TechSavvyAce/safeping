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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
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

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [router]);

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
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error);
      setError(error.message || "Failed to fetch dashboard data");
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

      // Show success message (you can add a toast notification here)
      console.log(`Payment ${paymentId} status updated to ${newStatus}`);
    } catch (error: any) {
      console.error("Failed to update payment status:", error);
      setError(error.message || "Failed to update payment status");
    }
  };

  const filteredPayments = payments.filter((payment) => {
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

  if (isLoading && !dashboardStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Dashboard...</p>
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
              <h1 className="text-2xl font-bold text-white">
                📊 Admin Dashboard
              </h1>
              <span className="px-2 py-1 bg-green-900/20 border border-green-700/50 rounded text-green-400 text-xs">
                Authenticated
              </span>
              {dashboardStats && (
                <span className="px-2 py-1 bg-blue-900/20 border border-blue-700/50 rounded text-blue-400 text-xs">
                  {dashboardStats.system?.network || "Unknown"}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
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
                  <p className="text-gray-400 text-sm">Total Payments</p>
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
                  <p className="text-gray-400 text-sm">Success Rate</p>
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
                  <p className="text-gray-400 text-sm">Pending</p>
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
                  <p className="text-gray-400 text-sm">Total Volume</p>
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

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Payment ID, Wallet, or Service"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chain
              </label>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Chains</option>
                <option value="ethereum">Ethereum</option>
                <option value="bsc">BSC</option>
                <option value="tron">Tron</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  "🔄"
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-white">
              Payment Transactions ({filteredPayments.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Chain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      {isLoading ? "Loading payments..." : "No payments found"}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
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
                            {payment.chain}
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
                          <span className="text-sm text-gray-500">
                            Not provided
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex px-2 py-1 text-xs font-semibold rounded-full border",
                            getStatusColor(payment.status)
                          )}
                        >
                          {payment.status}
                        </span>
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
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                              >
                                ✅ Complete
                              </button>
                              <button
                                onClick={() =>
                                  confirmPaymentStatus(
                                    payment.payment_id,
                                    "failed"
                                  )
                                }
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                              >
                                ❌ Fail
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
                              🔗 View TX
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Wallet Balances */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 mt-8">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-white">
              Wallet Balances ({walletBalances.length})
            </h2>
          </div>

          <div className="p-6">
            {walletBalances.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No wallet balances found
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
                          {wallet.chain}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-gray-400">Address</div>
                      <div className="text-sm font-mono text-blue-400 break-all">
                        {wallet.address}
                      </div>

                      <div className="text-xs text-gray-400">
                        Native Balance
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {wallet.balance}
                      </div>

                      <div className="text-xs text-gray-400">USDT Balance</div>
                      <div className="text-sm font-semibold text-green-400">
                        {wallet.usdtBalance}
                      </div>

                      <div className="text-xs text-gray-400">Payment Count</div>
                      <div className="text-sm font-semibold text-white">
                        {wallet.paymentCount}
                      </div>

                      <div className="text-xs text-gray-400">Total Volume</div>
                      <div className="text-sm font-semibold text-white">
                        ${wallet.totalVolume.toLocaleString()}
                      </div>

                      <div className="text-xs text-gray-400">Last Activity</div>
                      <div className="text-sm text-gray-400">
                        {wallet.lastActivity
                          ? new Date(wallet.lastActivity).toLocaleDateString()
                          : "Never"}
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
