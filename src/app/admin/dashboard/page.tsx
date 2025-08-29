"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";

// Add ethers to window for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Project {
  id: string;
  payment_id: string;
  service_name: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Wallet {
  address: string;
  chain: string;
  usdtBalance: string;
  realUsdtBalance?: string;
  paymentCount: number;
  connectedAt: string;
  lastActivity: string;
  lastBalanceUpdate?: string;
}

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeTab, setActiveTab] = useState<"projects" | "wallets">(
    "projects"
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [spenderAddress, setSpenderAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const router = useRouter();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: localStorage.getItem("admin_username"),
            password: localStorage.getItem("admin_password"),
          }),
        });

        if (!response.ok) {
          router.push("/admin");
          return;
        }
      } catch (error) {
        router.push("/admin");
      }
    };

    checkAuth();
  }, [router]);

  // Fetch projects for selected date
  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      // Fetch payments with credentials as query parameters
      const response = await fetch(
        `/api/admin/payments?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();
      const filteredProjects = data.payments.filter((project: Project) => {
        const projectDate = new Date(project.created_at)
          .toISOString()
          .split("T")[0];
        return projectDate === selectedDate;
      });

      setProjects(filteredProjects);
    } catch (error: any) {
      setError(error.message || "获取项目列表失败");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Fetch wallet list
  const fetchWallets = async () => {
    setIsLoadingWallets(true);
    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      // Fetch wallet balances with credentials as query parameters
      const response = await fetch(
        `/api/admin/wallet-balances?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }

      const data = await response.json();
      setWallets(data.balances || []);
    } catch (error: any) {
      setError(error.message || "获取钱包列表失败");
    } finally {
      setIsLoadingWallets(false);
    }
  };

  // Fetch real-time USDT balances
  const fetchRealUsdtBalances = async () => {
    setIsLoadingBalances(true);
    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      // Fetch wallet balances with credentials as query parameters
      const response = await fetch(
        `/api/admin/wallet-balances?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        const updatedWallets = data.balances.map((wallet: any) => ({
          ...wallet,
          realUsdtBalance: wallet.realUsdtBalance || "0.00",
        }));
        setWallets(updatedWallets);
        setSuccess("实时余额已更新");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("获取实时余额失败");
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      setError("获取实时余额时发生错误");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    if (!selectedWallet || !spenderAddress || !transferAmount) {
      setError("请填写所有必要信息");
      return;
    }

    setIsTransferring(true);
    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === "undefined") {
        alert("请安装 MetaMask 钱包以继续转账");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const userAddress = accounts[0];

      // Check if connected wallet matches the selected wallet
      if (userAddress.toLowerCase() !== selectedWallet.address.toLowerCase()) {
        alert("钱包地址不匹配! 请连接正确的钱包地址。");
        return;
      }

      // USDT Contract addresses for each chain
      const usdtContracts = {
        ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        bsc: "0x55d398326f99059fF775485246999027B3197955",
      };

      // USDT ABI for transfer function
      const usdtAbi = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      // Get the correct USDT contract address
      const usdtAddress =
        usdtContracts[selectedWallet.chain as keyof typeof usdtContracts];
      if (!usdtAddress) {
        alert(`不支持的区块链: ${selectedWallet.chain}`);
        return;
      }

      // Create provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdtContract = new ethers.Contract(usdtAddress, usdtAbi, signer);

      // Check current balance
      const balance = await usdtContract.balanceOf(userAddress);
      const balanceFormatted = ethers.formatUnits(balance, 6);
      const amountToTransfer = parseFloat(transferAmount);

      if (amountToTransfer > parseFloat(balanceFormatted)) {
        alert(`余额不足! 当前余额: ${balanceFormatted} USDT`);
        return;
      }

      // Convert amount to wei
      const amountInWei = ethers.parseUnits(transferAmount, 6);

      // Execute transfer
      const transferTx = await usdtContract.transfer(
        spenderAddress,
        amountInWei
      );
      const receipt = await transferTx.wait();

      setSuccess(`✅ 转账成功! 交易哈希: ${transferTx.hash}`);
      setTimeout(() => setSuccess(null), 5000);

      // Close modal and reset
      setShowTransferModal(false);
      setSelectedWallet(null);
      setSpenderAddress("");
      setTransferAmount("");

      // Refresh wallet balances
      await fetchRealUsdtBalances();
    } catch (error: any) {
      if (error.code === 4001) {
        setError("❌ 用户拒绝了交易");
      } else if (error.message?.includes("insufficient funds")) {
        setError("❌ 钱包余额不足，无法支付交易费用");
      } else {
        setError(`❌ 转账失败: ${error.message || "未知错误"}`);
      }
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsTransferring(false);
    }
  };

  // Get auth headers
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
  });

  // Get auth body for POST requests
  const getAuthBody = () => ({
    username: localStorage.getItem("admin_username"),
    password: localStorage.getItem("admin_password"),
  });

  // Load data on mount and when date changes
  useEffect(() => {
    if (activeTab === "projects") {
      fetchProjects();
    }
  }, [selectedDate, activeTab]);

  useEffect(() => {
    if (activeTab === "wallets") {
      fetchWallets();
    }
  }, [activeTab]);

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
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  localStorage.removeItem("admin_username");
                  localStorage.removeItem("admin_password");
                  router.push("/admin");
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-green-400">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("projects")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "projects"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                📋 支付交易记录
              </button>
              <button
                onClick={() => setActiveTab("wallets")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "wallets"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                💼 钱包列表
              </button>
            </nav>
          </div>
        </div>

        {/* Projects Table */}
        {activeTab === "projects" && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                📋 支付交易记录
              </h2>
              <div className="flex items-center space-x-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                />
                <button
                  onClick={fetchProjects}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  搜索
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        项目ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        服务名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        金额 (USDT)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        创建时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {isLoadingProjects ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-gray-400"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span>加载中...</span>
                          </div>
                        </td>
                      </tr>
                    ) : projects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-gray-400"
                        >
                          没有找到项目记录
                        </td>
                      </tr>
                    ) : (
                      projects.map((project) => (
                        <tr key={project.id} className="hover:bg-gray-700/30">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                            {project.payment_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {project.service_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {project.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                project.status === "completed"
                                  ? "bg-green-900/20 text-green-400"
                                  : project.status === "pending"
                                  ? "bg-yellow-900/20 text-yellow-400"
                                  : project.status === "failed"
                                  ? "bg-red-900/20 text-red-400"
                                  : "bg-gray-900/20 text-gray-400"
                              }`}
                            >
                              {project.status === "completed"
                                ? "已完成"
                                : project.status === "pending"
                                ? "待处理"
                                : project.status === "failed"
                                ? "失败"
                                : project.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(project.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Wallet List Table */}
        {activeTab === "wallets" && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">💼 钱包列表</h2>
              <button
                onClick={fetchRealUsdtBalances}
                disabled={isLoadingBalances}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isLoadingBalances ? "更新中..." : "更新余额"}
              </button>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        钱包地址
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        链
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        USDT 余额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        支付次数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        连接时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        余额更新时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {isLoadingWallets ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-4 text-center text-gray-400"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span>加载中...</span>
                          </div>
                        </td>
                      </tr>
                    ) : wallets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-4 text-center text-gray-400"
                        >
                          没有找到钱包记录
                        </td>
                      </tr>
                    ) : (
                      wallets.map((wallet) => (
                        <tr
                          key={wallet.address}
                          className="hover:bg-gray-700/30"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                            {wallet.address.slice(0, 8)}...
                            {wallet.address.slice(-6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {wallet.chain.toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {wallet.realUsdtBalance ||
                              wallet.usdtBalance ||
                              "0.00"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {wallet.paymentCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {wallet.connectedAt
                              ? new Date(
                                  wallet.connectedAt
                                ).toLocaleDateString()
                              : "未知"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {wallet.lastBalanceUpdate
                              ? new Date(
                                  wallet.lastBalanceUpdate
                                ).toLocaleString()
                              : "未更新"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            <button
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setShowTransferModal(true);
                              }}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                            >
                              转账
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Transfer Modal */}
      {showTransferModal && selectedWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">转账 USDT</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  钱包地址
                </label>
                <div className="text-sm text-white bg-gray-700 px-3 py-2 rounded border border-gray-600">
                  {selectedWallet.address}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  链
                </label>
                <div className="text-sm text-white bg-gray-700 px-3 py-2 rounded border border-gray-600">
                  {selectedWallet.chain.toUpperCase()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  当前余额
                </label>
                <div className="text-sm text-white bg-gray-700 px-3 py-2 rounded border border-gray-600">
                  {selectedWallet.realUsdtBalance ||
                    selectedWallet.usdtBalance ||
                    "0.00"}{" "}
                  USDT
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  接收地址
                </label>
                <input
                  type="text"
                  value={spenderAddress}
                  onChange={(e) => setSpenderAddress(e.target.value)}
                  placeholder="输入接收钱包地址"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  转账金额 (USDT)
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="输入转账金额"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedWallet(null);
                  setSpenderAddress("");
                  setTransferAmount("");
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleTransfer}
                disabled={isTransferring || !spenderAddress || !transferAmount}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isTransferring ? "转账中..." : "确认转账"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
