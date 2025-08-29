// =================================
// 🌐 Internationalization Configuration
// =================================

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: "Loading...",
        error: "Error",
        success: "Success",
        cancel: "Cancel",
        confirm: "Confirm",
        close: "Close",
        copy: "Copy",
        copied: "Copied!",
        retry: "Try Again",
        scan: "Scan",
        continue: "Continue",
        back: "Back",
        next: "Next",
        previous: "Previous",
        save: "Save",
        delete: "Delete",
        edit: "Edit",
        view: "View",
      },

      // App Header
      app: {
        title: "Crypto Payment",
        subtitle: "Secure USDT Payment Platform",
        version: "Version {{version}}",
        language: "中文",
      },

      // Payment
      payment: {
        title: "USDT Payment",
        amount: "Payment Amount",
        status: "Payment Status",
        id: "Payment ID",
        expires: "Expires",
        expired: "Expired",
        pending: "Pending",
        processing: "Processing",
        completed: "Completed",
        failed: "Failed",
        notFound: "Payment Link Invalid",
        invalidLink:
          "The payment link has expired or does not exist, please obtain a new payment link",
        loadingInfo: "Loading payment information...",
        pleaseWait: "Please wait",
        mainnet: "Mainnet",
        address: "Address",
        network: "Network",
        balance: "USDT Balance",
        selectNetwork: "Select Blockchain Network",
        connectWallet: "Connect Wallet",
        completePayment: "Complete Payment",
        walletConnected: "Wallet Connected",
        reload: "Reload",
        paymentAmount: "Payment Amount",
        timer: {
          expiresIn: "Expires in",
          expired: "Payment Expired",
          minutes: "{{count}} minute",
          minutes_plural: "{{count}} minutes",
          seconds: "{{count}} second",
          seconds_plural: "{{count}} seconds",
        },
      },

      // Chains
      chains: {
        select: "Select Network",
        bsc: "BSC",
        ethereum: "Ethereum",
        tron: "TRON",
        bscFull: "BSC Chain",
        ethereumFull: "Ethereum",
        tronFull: "TRON",
        mainnet: "Mainnet",
        testnet: "Testnet",
      },

      // Wallets
      wallet: {
        connect: "Connect Wallet",
        connected: "Connected Wallet",
        disconnect: "Disconnect",
        address: "Address:",
        network: "Network:",
        balance: "USDT Balance:",
        notConnected: "Wallet not connected",
        installing: "Installing...",
        switchNetwork: "Switch Network",
        networkMismatch: "Please switch to {{network}} network",
        metamask: {
          name: "MetaMask",
          description: "Connect using browser extension",
          install: "Install MetaMask",
        },
        tronlink: {
          name: "TronLink",
          description: "Connect using TronLink wallet",
          install: "Install TronLink",
        },
        imtoken: {
          name: "ImToken",
          description: "Connect using ImToken wallet",
          install: "Install ImToken",
        },
      },

      // Payment Steps
      steps: {
        selectChain: "Select Network",
        connectWallet: "Connect Wallet",
        approveToken: "Approve USDT",
        confirmPayment: "Confirm Payment",
        approve: {
          title: "Approve USDT Spending",
          description: "Allow the payment contract to spend your USDT tokens",
          button: "Approve USDT",
          confirming: "Confirming approval...",
          success: "USDT approval confirmed!",
          error: "Approval failed. Please try again.",
        },
        payment: {
          title: "Complete Payment",
          description: "Send {{amount}} USDT to complete your payment",
          button: "Pay {{amount}} USDT",
          confirming: "Processing payment...",
          success: "Payment completed successfully!",
          error: "Payment failed. Please try again.",
        },
      },

      // Status Messages
      status: {
        pending: {
          title: "Payment Pending",
          description: "Complete the payment process to continue",
        },
        processing: {
          title: "Payment Processing",
          description: "Your payment is being confirmed on the blockchain",
          txHash: "Transaction Hash:",
          explorer: "View on {{explorer}}",
        },
        completed: {
          title: "Payment Completed",
          description: "Your payment has been successfully processed",
          thankYou: "Thank you for your payment!",
        },
        failed: {
          title: "Payment Failed",
          description: "There was an issue processing your payment",
          support: "Please contact support if this issue persists",
        },
        expired: {
          title: "Payment Expired",
          description: "This payment link has expired",
          createNew: "Please create a new payment",
        },
      },

      // Network Indicator
      network: {
        mode: "{{mode}} Mode",
        mainnet: "MAINNET",
        testnet: "TESTNET",
        warning: "This is a test environment. Use test tokens only.",
      },

      // Errors
      errors: {
        walletNotInstalled: "{{wallet}} is not installed",
        networkNotSupported: "Network not supported",
        insufficientBalance: "Insufficient USDT balance",
        transactionFailed: "Transaction failed",
        connectionFailed: "Connection failed",
        unknownError: "An unknown error occurred",
      },

      // Footer
      footer: {
        poweredBy: "Powered by",
      },
    },
  },
  zh: {
    translation: {
      // Common
      common: {
        loading: "正在加载...",
        error: "错误",
        success: "成功",
        cancel: "取消",
        confirm: "确认",
        close: "关闭",
        copy: "复制",
        copied: "已复制！",
        retry: "重试",
        scan: "扫描",
        continue: "继续",
        back: "返回",
        next: "下一步",
        previous: "上一步",
        save: "保存",
        delete: "删除",
        edit: "编辑",
        view: "查看",
      },

      // App Header
      app: {
        title: "加密货币支付",
        subtitle: "安全的USDT多链支付平台",
        version: "版本 {{version}}",
        language: "English",
      },

      // Payment
      payment: {
        title: "USDT支付",
        amount: "支付金额",
        status: "支付状态",
        id: "支付ID",
        expires: "过期时间",
        expired: "已过期",
        pending: "待支付",
        processing: "处理中",
        completed: "已完成",
        failed: "失败",
        notFound: "支付链接无效",
        invalidLink: "支付链接已过期或不存在，请重新获取支付链接",
        loadingInfo: "正在加载支付信息...",
        pleaseWait: "请稍候",
        mainnet: "主网",
        address: "地址",
        network: "网络",
        balance: "USDT余额",
        selectNetwork: "选择区块链网络",
        connectWallet: "连接钱包",
        completePayment: "完成支付",
        walletConnected: "钱包已连接",
        reload: "重新加载",
        paymentAmount: "支付金额",
        timer: {
          expiresIn: "剩余时间",
          expired: "支付已过期",
          minutes: "{{count}} 分钟",
          minutes_plural: "{{count}} 分钟",
          seconds: "{{count}} 秒",
          seconds_plural: "{{count}} 秒",
        },
      },

      // Chains
      chains: {
        select: "选择网络",
        bsc: "BSC币安智能链",
        ethereum: "以太坊",
        tron: "波场",
        bscFull: "BSC链",
        ethereumFull: "以太坊",
        tronFull: "波场",
        mainnet: "主网",
        testnet: "测试网",
      },

      // Wallets
      wallet: {
        connect: "连接钱包",
        connected: "已连接钱包",
        disconnect: "断开连接",
        address: "地址:",
        network: "网络:",
        balance: "USDT余额:",
        notConnected: "钱包未连接",
        installing: "正在安装...",
        switchNetwork: "切换网络",
        networkMismatch: "请切换到 {{network}} 网络",
        metamask: {
          name: "MetaMask",
          description: "使用浏览器扩展连接",
          install: "安装 MetaMask",
        },
        tronlink: {
          name: "TronLink",
          description: "使用 TronLink 钱包连接",
          install: "安装 TronLink",
        },
        imtoken: {
          name: "ImToken",
          description: "使用 ImToken 钱包连接",
          install: "安装 ImToken",
        },
      },

      // Payment Steps
      steps: {
        selectChain: "选择网络",
        connectWallet: "连接钱包",
        approveToken: "授权USDT",
        confirmPayment: "确认支付",
        approve: {
          title: "授权USDT支出",
          description: "允许支付合约使用您的USDT代币",
          button: "授权USDT",
          confirming: "正在确认授权...",
          success: "USDT授权已确认！",
          error: "授权失败，请重试。",
        },
        payment: {
          title: "完成支付",
          description: "发送 {{amount}} USDT 完成您的支付",
          button: "支付 {{amount}} USDT",
          confirming: "正在处理支付...",
          success: "支付成功完成！",
          error: "支付失败，请重试。",
        },
      },

      // Status Messages
      status: {
        pending: {
          title: "待支付",
          description: "请完成支付流程以继续",
        },
        processing: {
          title: "支付处理中",
          description: "您的支付正在区块链上确认",
          txHash: "交易哈希:",
          explorer: "在 {{explorer}} 上查看",
        },
        completed: {
          title: "支付完成",
          description: "您的支付已成功处理",
          thankYou: "感谢您的支付！",
        },
        failed: {
          title: "支付失败",
          description: "处理您的支付时出现问题",
          support: "如果问题持续存在，请联系客服",
        },
        expired: {
          title: "支付已过期",
          description: "此支付链接已过期",
          createNew: "请创建新的支付",
        },
      },

      // Network Indicator
      network: {
        mode: "{{mode}} 模式",
        mainnet: "主网",
        testnet: "测试网",
        warning: "这是测试环境，请仅使用测试代币。",
      },

      // Errors
      errors: {
        walletNotInstalled: "{{wallet}} 未安装",
        networkNotSupported: "不支持的网络",
        insufficientBalance: "USDT余额不足",
        transactionFailed: "交易失败",
        connectionFailed: "连接失败",
        unknownError: "发生未知错误",
      },

      // Footer
      footer: {
        poweredBy: "技术支持",
      },
    },
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: "zh-CN",
    fallbackLng: "zh-CN",
    debug: process.env.NODE_ENV === "development",

    // Language detection options
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Pluralization
    pluralSeparator: "_",
    contextSeparator: "_",

    // Namespace
    defaultNS: "translation",
    ns: ["translation"],
  });

export default i18n;
