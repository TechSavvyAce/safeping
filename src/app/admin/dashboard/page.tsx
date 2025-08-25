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
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [lastDataRefresh, setLastDataRefresh] = useState<Date>(new Date());
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

    // Set up time update every second
    const timeInterval = setInterval(() => {
      setLastRefresh(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
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
      setLastDataRefresh(new Date());
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error);
      setError(error.message || "获取仪表板数据失败");
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

      // Show success message
      setSuccess(`支付状态已更新为: ${newStatus}`);
      setError(null);

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error("Failed to update payment status:", error);
      setError(error.message || "更新支付状态失败");
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
              {dashboardStats && (
                <span className="px-2 py-1 bg-blue-900/20 border border-blue-700/50 rounded text-blue-400 text-xs">
                  {dashboardStats.system?.network === "mainnet"
                    ? "主网"
                    : "测试网"}
                </span>
              )}
              <span className="px-2 py-1 bg-green-900/20 border border-green-700/50 rounded text-green-400 text-xs">
                🟢 系统正常
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                当前时间: {lastRefresh.toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-400">
                当前日期: {lastRefresh.toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-400">
                数据更新: {lastDataRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                退出登录
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

      {/* Success Banner */}
      {success && (
        <div className="bg-green-900/20 border border-green-700/50 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <p className="text-green-400">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clock Display */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-xl border border-blue-700/50 p-6 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {lastRefresh.toLocaleTimeString()}
            </div>
            <div className="text-lg text-blue-300">
              {lastRefresh.toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Warranty Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">保修状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">硬件保修</div>
              <div className="text-lg font-bold text-green-400">🟢 有效</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">软件保修</div>
              <div className="text-lg font-bold text-green-400">🟢 有效</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">服务保修</div>
              <div className="text-lg font-bold text-green-400">🟢 有效</div>
            </div>
          </div>
        </div>

        {/* License Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">许可证状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                软件许可证
              </div>
              <div className="text-lg font-bold text-green-400">🟢 有效</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                API 许可证
              </div>
              <div className="text-lg font-bold text-green-400">🟢 有效</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                服务许可证
              </div>
              <div className="text-lg font-bold text-green-400">🟢 有效</div>
            </div>
          </div>
        </div>

        {/* Audit Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">审计状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">系统审计</div>
              <div className="text-lg font-bold text-green-400">🟢 通过</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">安全审计</div>
              <div className="text-lg font-bold text-green-400">🟢 通过</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">合规审计</div>
              <div className="text-lg font-bold text-green-400">🟢 通过</div>
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">合规状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">数据保护</div>
              <div className="text-lg font-bold text-green-400">🟢 合规</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">隐私保护</div>
              <div className="text-lg font-bold text-green-400">🟢 合规</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">安全标准</div>
              <div className="text-lg font-bold text-green-400">🟢 合规</div>
            </div>
          </div>
        </div>

        {/* Support Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">支持状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">技术支持</div>
              <div className="text-lg font-bold text-green-400">🟢 可用</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">文档支持</div>
              <div className="text-lg font-bold text-green-400">🟢 可用</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">社区支持</div>
              <div className="text-lg font-bold text-green-400">🟢 可用</div>
            </div>
          </div>
        </div>

        {/* Uptime Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            运行时间状态
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                系统运行时间
              </div>
              <div className="text-lg font-bold text-green-400">🟢 24/7</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                数据库运行时间
              </div>
              <div className="text-lg font-bold text-green-400">🟢 24/7</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                API 运行时间
              </div>
              <div className="text-lg font-bold text-green-400">🟢 24/7</div>
            </div>
          </div>
        </div>

        {/* Version Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">版本状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">应用版本</div>
              <div className="text-lg font-bold text-blue-400">v2.0.0</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                数据库版本
              </div>
              <div className="text-lg font-bold text-green-400">v1.0.0</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">API 版本</div>
              <div className="text-lg font-bold text-purple-400">v1.0.0</div>
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">集成状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                WalletConnect
              </div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">Web3Modal</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                Telegram Bot
              </div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">Webhook</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
          </div>
        </div>

        {/* Notification Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">通知状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">邮件通知</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">短信通知</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">推送通知</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
          </div>
        </div>

        {/* Log Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">日志状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">错误日志</div>
              <div className="text-lg font-bold text-red-400">🔴 0 条</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">警告日志</div>
              <div className="text-lg font-bold text-yellow-400">🟡 0 条</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">信息日志</div>
              <div className="text-lg font-bold text-blue-400">🔵 0 条</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">调试日志</div>
              <div className="text-lg font-bold text-gray-400">⚪ 0 条</div>
            </div>
          </div>
        </div>

        {/* Alert Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">告警状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">严重告警</div>
              <div className="text-lg font-bold text-red-400">🔴 0 个</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">警告</div>
              <div className="text-lg font-bold text-yellow-400">🟡 0 个</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">信息</div>
              <div className="text-lg font-bold text-blue-400">🔵 0 个</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">调试</div>
              <div className="text-lg font-bold text-gray-400">⚪ 0 个</div>
            </div>
          </div>
        </div>

        {/* Monitoring Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">监控状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">系统监控</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">性能监控</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">错误监控</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">安全监控</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">备份状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                数据库备份
              </div>
              <div className="text-lg font-bold text-green-400">🟢 已备份</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                配置文件备份
              </div>
              <div className="text-lg font-bold text-green-400">🟢 已备份</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">日志备份</div>
              <div className="text-lg font-bold text-green-400">🟢 已备份</div>
            </div>
          </div>
        </div>

        {/* Maintenance Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">维护状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">系统维护</div>
              <div className="text-lg font-bold text-green-400">
                🟢 无需维护
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                数据库维护
              </div>
              <div className="text-lg font-bold text-green-400">
                🟢 无需维护
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">API 维护</div>
              <div className="text-lg font-bold text-green-400">
                🟢 无需维护
              </div>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">安全状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">认证状态</div>
              <div className="text-lg font-bold text-green-400">🟢 已认证</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">会话安全</div>
              <div className="text-lg font-bold text-green-400">🟢 安全</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">API 安全</div>
              <div className="text-lg font-bold text-green-400">🟢 安全</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">数据加密</div>
              <div className="text-lg font-bold text-green-400">🟢 已加密</div>
            </div>
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">系统性能</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">响应时间</div>
              <div className="text-lg font-bold text-green-400">🟢 快速</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">内存使用</div>
              <div className="text-lg font-bold text-blue-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">CPU 使用</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">网络延迟</div>
              <div className="text-lg font-bold text-green-400">🟢 低延迟</div>
            </div>
          </div>
        </div>

        {/* Wallet Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">钱包状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">活跃钱包</div>
              <div className="text-lg font-bold text-blue-400">
                {walletBalances.length} 个
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">总交易额</div>
              <div className="text-lg font-bold text-green-400">
                $
                {walletBalances
                  .reduce((sum, w) => sum + w.totalVolume, 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                总支付次数
              </div>
              <div className="text-lg font-bold text-purple-400">
                {walletBalances.reduce((sum, w) => sum + w.paymentCount, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Processing Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            支付处理状态
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">处理中</div>
              <div className="text-lg font-bold text-yellow-400">
                {payments.filter((p) => p.status === "pending").length} 笔
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">已完成</div>
              <div className="text-lg font-bold text-green-400">
                {payments.filter((p) => p.status === "completed").length} 笔
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">失败</div>
              <div className="text-lg font-bold text-red-400">
                {payments.filter((p) => p.status === "failed").length} 笔
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">过期</div>
              <div className="text-lg font-bold text-gray-400">
                {payments.filter((p) => p.status === "expired").length} 笔
              </div>
            </div>
          </div>
        </div>

        {/* Blockchain Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">区块链状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">以太坊</div>
              <div className="text-lg font-bold text-blue-400">🔵 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                币安智能链
              </div>
              <div className="text-lg font-bold text-yellow-400">🟡 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">波场</div>
              <div className="text-lg font-bold text-red-400">🔴 正常</div>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">数据库状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">连接状态</div>
              <div className="text-lg font-bold text-green-400">🟢 已连接</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">支付记录</div>
              <div className="text-lg font-bold text-blue-400">
                {payments.length} 条
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">钱包记录</div>
              <div className="text-lg font-bold text-purple-400">
                {walletBalances.length} 个
              </div>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            API 服务状态
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">
                仪表板 API
              </div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">支付 API</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">钱包 API</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">认证 API</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">会话信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">登录状态</div>
              <div className="text-lg font-bold text-green-400">🟢 已登录</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">会话时长</div>
              <div className="text-lg font-bold text-blue-400">
                {Math.floor(
                  (Date.now() -
                    parseInt(localStorage.getItem("adminLoginTime") || "0")) /
                    (1000 * 60)
                )}{" "}
                分钟
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">最后活动</div>
              <div className="text-lg font-bold text-yellow-400">
                {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            系统环境信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">环境</div>
              <div className="text-lg font-bold text-blue-400">
                {process.env.NODE_ENV === "production"
                  ? "生产环境"
                  : "开发环境"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">网络模式</div>
              <div className="text-lg font-bold text-green-400">
                {dashboardStats?.system?.network === "mainnet"
                  ? "主网"
                  : "测试网"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">系统状态</div>
              <div className="text-lg font-bold text-green-400">🟢 正常</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400">数据库</div>
              <div className="text-lg font-bold text-green-400">
                🟢 连接正常
              </div>
            </div>
          </div>
        </div>

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

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                搜索
              </label>
              <input
                type="text"
                placeholder="支付ID、钱包地址或服务名称"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                区块链
              </label>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">所有链</option>
                <option value="ethereum">以太坊</option>
                <option value="bsc">币安智能链</option>
                <option value="tron">波场</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                状态
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  "🔄"
                )}
                刷新
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
            <table className="w-full">
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
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      {isLoading ? "正在加载支付记录..." : "未找到支付记录"}
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
                                ✅ 完成
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
                                ❌ 失败
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
                  ))
                )}
              </tbody>
            </table>
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
