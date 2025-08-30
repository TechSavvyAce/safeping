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
  const [activeTab, setActiveTab] = useState<
    "projects" | "wallets" | "treasury-wallets"
  >("projects");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoadingTreasuryWallets, setIsLoadingTreasuryWallets] =
    useState(false);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [ownerAddresses, setOwnerAddresses] = useState<{
    [key: string]: string;
  }>({});
  const [ownerBalances, setOwnerBalances] = useState<{
    [key: string]: { native: string; usdt: string };
  }>({});
  const [isUpdatingBalances, setIsUpdatingBalances] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [spenderAddress, setSpenderAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [treasuryWallets, setTreasuryWallets] = useState<any[]>([]);
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [newTreasuryWallet, setNewTreasuryWallet] = useState({
    chain: "ethereum",
    address: "",
    name: "",
    description: "",
  });

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

  // Fetch treasury wallets
  const fetchTreasuryWallets = async () => {
    setIsLoadingTreasuryWallets(true);
    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      const response = await fetch(
        `/api/admin/treasury-wallets?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch treasury wallets");
      }

      const data = await response.json();
      setTreasuryWallets(data.data || []);
    } catch (error: any) {
      setError(error.message || "Failed to fetch treasury wallets");
    } finally {
      setIsLoadingTreasuryWallets(false);
    }
  };

  // Fetch owner addresses from API
  const fetchOwnerAddresses = async () => {
    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      const response = await fetch(
        `/api/admin/owner-addresses?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "GET",
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        const addresses = data.data || {};
        setOwnerAddresses(addresses);
        console.log("✅ Owner addresses fetched:", addresses);

        // Immediately fetch balances for valid addresses
        if (Object.keys(addresses).length > 0) {
          console.log("🔄 Fetching owner balances...");
          await fetchOwnerBalances(addresses);
        }
      }
    } catch (error) {
      console.error("Error fetching owner addresses:", error);
    }
  };

  // Fetch owner balances
  const fetchOwnerBalances = async (addresses: { [key: string]: string }) => {
    try {
      console.log(
        "🔄 Starting to fetch owner balances for addresses:",
        addresses
      );
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      // Fetch balances for each owner address directly from blockchain
      const balancePromises = Object.entries(addresses).map(
        async ([chain, address]) => {
          console.log(`🔄 Fetching balance for ${chain}: ${address}`);

          if (
            !address ||
            address === "TTuptMg5xuXy3kWvjU8DJKVPovPwcX1WFN" ||
            address === "NOT_CONFIGURED"
          ) {
            console.log(`⏭️ Skipping ${chain} - invalid address: ${address}`);
            return { chain, native: "0.000000", usdt: "0.00" };
          }

          try {
            // Call the balance service API to get real-time balances
            const response = await fetch(
              `/api/admin/owner-balances?username=${encodeURIComponent(
                authBody.username || ""
              )}&password=${encodeURIComponent(
                authBody.password || ""
              )}&chain=${chain}&address=${address}`,
              {
                method: "GET",
                headers,
              }
            );

            if (response.ok) {
              const data = await response.json();
              console.log(`✅ ${chain} balance fetched:`, data);
              return {
                chain,
                native: data.nativeBalance || "0.000000",
                usdt: data.usdtBalance || "0.00",
              };
            } else {
              console.log(`⚠️ ${chain} balance fetch failed:`, response.status);
            }
          } catch (error) {
            console.error(`❌ Error fetching ${chain} owner balance:`, error);
          }

          return { chain, native: "0.000000", usdt: "0.00" };
        }
      );

      const balances = await Promise.all(balancePromises);
      const balanceMap = balances.reduce((acc, { chain, native, usdt }) => {
        acc[chain] = { native, usdt };
        return acc;
      }, {} as { [key: string]: { native: string; usdt: string } });

      console.log("✅ Owner balances updated:", balanceMap);
      setOwnerBalances(balanceMap);
    } catch (error) {
      console.error("Error fetching owner balances:", error);
    }
  };

  // Auto-update treasury balances every 10 seconds
  const autoUpdateBalances = async () => {
    // Double-check if tab is still active
    if (activeTab !== "treasury-wallets") {
      console.log("⏸️ 自动更新跳过 - 标签页不活跃");
      return;
    }

    console.log("🔄 自动更新: 获取金库钱包余额...");

    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      const response = await fetch(
        `/api/admin/treasury-wallets?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "GET",
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTreasuryWallets(data.data || []);
        // Also update owner balances if we have addresses
        if (Object.keys(ownerAddresses).length > 0) {
          await fetchOwnerBalances(ownerAddresses);
        }
        console.log("✅ 自动更新: 余额更新成功");
      } else {
        console.log("⚠️ 自动更新: API 响应异常");
      }
    } catch (error) {
      // Silent error handling - keep old balances
      console.error("❌ 自动更新错误:", error);
    }
  };

  // Refresh treasury wallet balances
  const refreshTreasuryBalances = async () => {
    setIsRefreshingBalances(true);
    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      const response = await fetch(
        `/api/admin/treasury-wallets?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to refresh treasury wallet balances");
      }

      const data = await response.json();
      setTreasuryWallets(data.data || []);
      // Also update owner balances if we have addresses
      if (Object.keys(ownerAddresses).length > 0) {
        await fetchOwnerBalances(ownerAddresses);
      }
      setSuccess("金库钱包余额更新成功");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || "刷新金库钱包余额失败");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRefreshingBalances(false);
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
        setError("请安装 MetaMask 钱包以继续转账");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const userAddress = accounts[0];

      // Check if connected wallet matches the selected wallet
      if (userAddress.toLowerCase() !== selectedWallet.address.toLowerCase()) {
        setError("钱包地址不匹配! 请连接正确的钱包地址。");
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
        setError(`不支持的区块链: ${selectedWallet.chain}`);
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
        setError(`余额不足! 当前余额: ${balanceFormatted} USDT`);
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

  // Save treasury wallet
  const saveTreasuryWallet = async () => {
    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      const response = await fetch(
        `/api/admin/treasury-wallets?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(newTreasuryWallet),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save treasury wallet");
      }

      setSuccess("金库钱包保存成功");
      setShowTreasuryModal(false);
      setNewTreasuryWallet({
        chain: "ethereum",
        address: "",
        name: "",
        description: "",
      });
      fetchTreasuryWallets(); // Refresh the list
    } catch (error: any) {
      setError(error.message || "保存金库钱包失败");
    }
  };

  // Delete treasury wallet
  const deleteTreasuryWallet = async (id: number) => {
    if (!confirm("Are you sure you want to delete this treasury wallet?")) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      const authBody = getAuthBody();

      const response = await fetch(
        `/api/admin/treasury-wallets?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}&id=${id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete treasury wallet");
      }

      setSuccess("金库钱包删除成功");
      fetchTreasuryWallets(); // Refresh the list
    } catch (error: any) {
      setError(error.message || "删除金库钱包失败");
    }
  };

  // Mark expired payments
  const markExpiredPayments = async () => {
    try {
      const authBody = getAuthBody();
      const response = await fetch(
        `/api/admin/mark-expired?username=${encodeURIComponent(
          authBody.username || ""
        )}&password=${encodeURIComponent(authBody.password || "")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to mark expired payments");
      }

      const data = await response.json();
      setSuccess(data.message);
      fetchProjects(); // Refresh the projects list
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      setError(error.message || "Failed to mark expired payments");
      setTimeout(() => setError(null), 5000);
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

  // Fetch wallets when tab is active
  useEffect(() => {
    if (activeTab === "wallets") {
      fetchWallets();
    }
  }, [activeTab]);

  // Fetch treasury wallets when tab is active
  useEffect(() => {
    if (activeTab === "treasury-wallets") {
      fetchTreasuryWallets();
      fetchOwnerAddresses();
    }
  }, [activeTab]);

  // Auto-update balances every 10 seconds when treasury tab is active
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTab === "treasury-wallets") {
      console.log("🔄 开始金库钱包自动更新...");

      // Initial update - don't set updating state to true initially
      autoUpdateBalances();

      // Set up interval for every 10 seconds
      interval = setInterval(() => {
        // Double-check if tab is still active before making API call
        if (activeTab === "treasury-wallets") {
          console.log("🔄 自动更新触发...");
          // Set updating state to true only during actual updates
          setIsUpdatingBalances(true);
          autoUpdateBalances().finally(() => {
            // Reset updating state after update completes
            setIsUpdatingBalances(false);
          });
        } else {
          console.log("⏸️ 自动更新停止 - 标签页不活跃");
        }
      }, 10000);
    }

    return () => {
      if (interval) {
        console.log("🛑 清除自动更新间隔...");
        clearInterval(interval);
        // Reset the updating state when cleaning up
        setIsUpdatingBalances(false);
      }
    };
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
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "projects"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              项目记录
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "wallets"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              钱包管理
            </button>
            <button
              onClick={() => setActiveTab("treasury-wallets")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "treasury-wallets"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              金库地址
            </button>
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
                <button
                  onClick={markExpiredPayments}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ⏰ 标记过期
                </button>
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
                                  : project.status === "processing"
                                  ? "bg-blue-900/20 text-blue-400"
                                  : project.status === "failed"
                                  ? "bg-red-900/20 text-red-400"
                                  : project.status === "expired"
                                  ? "bg-gray-900/20 text-gray-400"
                                  : "bg-gray-900/20 text-gray-400"
                              }`}
                            >
                              {project.status === "completed"
                                ? "已完成"
                                : project.status === "pending"
                                ? "待处理"
                                : project.status === "processing"
                                ? "处理中"
                                : project.status === "failed"
                                ? "失败"
                                : project.status === "expired"
                                ? "已过期"
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

        {/* Treasury Wallets Tab */}
        {activeTab === "treasury-wallets" && (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  🏦 金库地址
                </h2>
                <p className="text-gray-400 text-sm">
                  管理不同区块链网络的金库钱包地址
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={refreshTreasuryBalances}
                  disabled={isRefreshingBalances}
                  className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg
                    className={`w-5 h-5 ${
                      isRefreshingBalances ? "animate-spin" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {isRefreshingBalances ? "更新中..." : "手动刷新"}
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isUpdatingBalances
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-500"
                    }`}
                  ></div>
                  <span>自动更新: {isUpdatingBalances ? "活跃" : "停止"}</span>
                </div>
                <button
                  onClick={() => setShowTreasuryModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  添加金库钱包
                </button>
              </div>
            </div>

            {/* Owner Address Summary */}
            {Object.keys(ownerAddresses).length > 0 && (
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-blue-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    所有者地址 (只读)
                  </h3>
                  <button
                    onClick={() => fetchOwnerBalances(ownerAddresses)}
                    disabled={isUpdatingBalances}
                    className="px-3 py-2 bg-blue-600/80 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    <svg
                      className={`w-4 h-4 ${
                        isUpdatingBalances ? "animate-spin" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {isUpdatingBalances ? "更新中..." : "刷新余额"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(ownerAddresses).map(([chain, address]) => (
                    <div
                      key={chain}
                      className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/30"
                    >
                      <div className="text-xs text-gray-400 mb-2 uppercase">
                        {chain}
                      </div>
                      <div className="text-sm font-mono text-blue-400 break-all mb-3">
                        {address}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">
                            {chain === "tron"
                              ? "TRX 余额"
                              : chain === "bsc"
                              ? "BNB 余额"
                              : "ETH 余额"}
                          </span>
                          <span className="text-green-400 font-mono">
                            {!ownerBalances[chain] ? (
                              <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : isUpdatingBalances &&
                              ownerBalances[chain]?.native ? (
                              <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              ownerBalances[chain]?.native || "0.000000"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">USDT 余额</span>
                          <span className="text-blue-400 font-mono">
                            {!ownerBalances[chain] ? (
                              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : isUpdatingBalances &&
                              ownerBalances[chain]?.usdt ? (
                              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              ownerBalances[chain]?.usdt || "0.00"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoadingTreasuryWallets ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                <p className="mt-4 text-gray-400 text-lg">
                  正在加载金库钱包...
                </p>
              </div>
            ) : (
              /* Treasury Wallets Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {treasuryWallets.length === 0 ? (
                  /* Empty State */
                  <div className="col-span-full">
                    <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gray-700/50 rounded-full flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-300 mb-2">
                        暂无金库钱包
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        开始添加您的第一个金库钱包。这将用于接收客户的付款。
                      </p>
                      <button
                        onClick={() => setShowTreasuryModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
                      >
                        添加第一个钱包
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Treasury Wallet Cards */
                  treasuryWallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 hover:border-gray-600/50 transition-all duration-300 hover:transform hover:scale-[1.02] group"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
                            <img
                              src={
                                wallet.chain === "ethereum"
                                  ? "/icons/ethereum.png"
                                  : wallet.chain === "bsc"
                                  ? "/icons/bsc.png"
                                  : wallet.chain === "tron"
                                  ? "/icons/tron.png"
                                  : "/icons/ethereum.png"
                              }
                              alt={wallet.chain}
                              className="w-7 h-7"
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {wallet.chain.toUpperCase()}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {wallet.name || "默认金库"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            wallet.is_active
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {wallet.is_active ? "活跃" : "停止"}
                        </span>
                      </div>

                      {/* Treasury Address */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          金库地址
                        </label>
                        <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                          <div className="text-sm text-white font-mono break-all">
                            {wallet.address || (
                              <span className="text-gray-500 italic">
                                未配置
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Wallet Info Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-900/30 rounded-xl p-3 border border-gray-700/30">
                          <div className="text-xs text-gray-400 mb-1">
                            {wallet.chain === "tron"
                              ? "TRX 余额"
                              : wallet.chain === "bsc"
                              ? "BNB 余额"
                              : "ETH 余额"}
                          </div>
                          <div className="text-sm font-semibold text-green-400 flex items-center gap-2">
                            {isUpdatingBalances &&
                            !wallet.ownerNativeBalance ? (
                              <>
                                <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin"></div>
                                <span>更新中...</span>
                              </>
                            ) : wallet.ownerNativeBalance ? (
                              `${parseFloat(wallet.ownerNativeBalance).toFixed(
                                6
                              )} ${
                                wallet.chain === "tron"
                                  ? "TRX"
                                  : wallet.chain === "bsc"
                                  ? "BNB"
                                  : "ETH"
                              }`
                            ) : (
                              "0.000000"
                            )}
                          </div>
                        </div>
                        <div className="bg-gray-900/30 rounded-xl p-3 border border-gray-700/30">
                          <div className="text-xs text-gray-400 mb-1">
                            USDT 余额
                          </div>
                          <div className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                            {isUpdatingBalances && !wallet.ownerUSDTBalance ? (
                              <>
                                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                <span>更新中...</span>
                              </>
                            ) : wallet.ownerUSDTBalance ? (
                              `${parseFloat(wallet.ownerUSDTBalance).toFixed(
                                2
                              )} USDT`
                            ) : (
                              "0.00 USDT"
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setNewTreasuryWallet({
                              chain: wallet.chain,
                              address: wallet.address || "",
                              name: wallet.name || "",
                              description: wallet.description || "",
                            });
                            setShowTreasuryModal(true);
                          }}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105"
                        >
                          <svg
                            className="w-4 h-4 mr-2 inline"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          编辑
                        </button>
                        <button
                          onClick={() => deleteTreasuryWallet(wallet.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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

      {/* Treasury Wallet Modal */}
      {showTreasuryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-lg mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {newTreasuryWallet.address
                      ? "编辑金库钱包"
                      : "添加金库钱包"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    为 {newTreasuryWallet.chain.toUpperCase()} 配置您的金库钱包
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTreasuryModal(false);
                  setNewTreasuryWallet({
                    chain: "ethereum",
                    address: "",
                    name: "",
                    description: "",
                  });
                }}
                className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Chain Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  区块链网络
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: "ethereum",
                      label: "Ethereum",
                      icon: "/icons/ethereum.png",
                    },
                    { value: "bsc", label: "BSC", icon: "/icons/bsc.png" },
                    { value: "tron", label: "TRON", icon: "/icons/tron.png" },
                  ].map((chain) => (
                    <button
                      key={chain.value}
                      onClick={() =>
                        setNewTreasuryWallet({
                          ...newTreasuryWallet,
                          chain: chain.value,
                        })
                      }
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        newTreasuryWallet.chain === chain.value
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={chain.icon}
                          alt={chain.label}
                          className="w-8 h-8"
                        />
                        <span className="text-sm font-medium text-white">
                          {chain.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Treasury Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  金库地址
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newTreasuryWallet.address}
                    onChange={(e) =>
                      setNewTreasuryWallet({
                        ...newTreasuryWallet,
                        address: e.target.value,
                      })
                    }
                    placeholder={`输入 ${newTreasuryWallet.chain.toUpperCase()} 金库地址`}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {newTreasuryWallet.address && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  此地址将接收 {newTreasuryWallet.chain.toUpperCase()}{" "}
                  网络上的所有付款
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  钱包名称
                </label>
                <input
                  type="text"
                  value={newTreasuryWallet.name}
                  onChange={(e) =>
                    setNewTreasuryWallet({
                      ...newTreasuryWallet,
                      name: e.target.value,
                    })
                  }
                  placeholder={`${newTreasuryWallet.chain.toUpperCase()} 金库`}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  描述
                </label>
                <textarea
                  value={newTreasuryWallet.description}
                  onChange={(e) =>
                    setNewTreasuryWallet({
                      ...newTreasuryWallet,
                      description: e.target.value,
                    })
                  }
                  placeholder={`您的 ${newTreasuryWallet.chain.toUpperCase()} 金库钱包描述`}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-700/50">
              <button
                onClick={() => {
                  setShowTreasuryModal(false);
                  setNewTreasuryWallet({
                    chain: "ethereum",
                    address: "",
                    name: "",
                    description: "",
                  });
                }}
                className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
              >
                取消
              </button>
              <button
                onClick={saveTreasuryWallet}
                disabled={!newTreasuryWallet.address}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                <svg
                  className="w-4 h-4 mr-2 inline"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {newTreasuryWallet.address ? "更新钱包" : "保存钱包"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
