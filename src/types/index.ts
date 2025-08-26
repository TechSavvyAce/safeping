// =================================
// 🎯 Type Definitions for Crypto Payment Platform
// =================================

// Blockchain Networks
export type ChainType = "ethereum" | "bsc" | "tron";

// Wallet Types
export type WalletType = "metamask" | "tronlink" | "imtoken" | "bitpie";

// Payment Status
export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

// Database Entities
export interface Payment {
  id: string;
  payment_id: string;
  service_name: string;
  service_name_cn?: string;
  description?: string;
  description_cn?: string;
  amount: number;
  chain?: ChainType;
  status: PaymentStatus;
  wallet_address?: string;
  tx_hash?: string;
  webhook_url?: string;
  metadata?: string;
  language: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface PaymentEvent {
  id: number;
  payment_id: string;
  event_type: string;
  data: string;
  created_at: string;
}

export interface WebhookLog {
  id: number;
  payment_id: string;
  webhook_url: string;
  payload: string;
  response_status: number;
  response_data?: string;
  created_at: string;
}

// API Request/Response Types
export interface CreatePaymentRequest {
  service_name: string;
  description?: string;
  amount: number;
  webhook_url?: string;
  language?: string;
}

export interface CreatePaymentResponse {
  payment_id: string;
  payment_url: string;
  qr_code?: string;
  expires_at: string;
}

export interface PaymentStatusResponse {
  payment_id: string;
  status: PaymentStatus;
  amount: number;
  chain: ChainType;
  tx_hash?: string;
  created_at: string;
  expires_at: string;
}

// Wallet Integration Types
export interface WalletConnection {
  address: string;
  wallet: WalletType;
  chain: ChainType;
}

export interface ContractConfig {
  usdt: string;
  paymentProcessor: string;
  chainId: string;
  decimals: number;
  rpc?: string;
}

export interface ChainConfig {
  bsc: ContractConfig;
  ethereum: ContractConfig;
  tron: ContractConfig;
}

export interface WalletBalance {
  balance: string;
  formatted: string;
  symbol: string;
}

// Admin Dashboard Wallet Balance Interface
export interface AdminWalletBalance {
  address: string;
  chain: string;
  balance: string;
  usdtBalance: string;
  realUsdtBalance?: string;
  paymentCount: number;
  lastActivity: string | null;
}

// Component Props Types
export interface WalletConnectProps {
  onConnect: (connection: WalletConnection) => void;
  selectedChain: ChainType;
  disabled?: boolean;
}

export interface PaymentFormProps {
  payment: Payment;
  onStatusChange: (status: PaymentStatus) => void;
}

export interface ChainSelectorProps {
  selectedChain: ChainType;
  onChainSelect: (chain: ChainType) => void;
  disabled?: boolean;
}

// Blockchain Transaction Types
export interface TransactionResponse {
  hash: string;
  confirmations: number;
  status: "pending" | "confirmed" | "failed";
}

export interface ApprovalResponse {
  hash: string;
  amount: string;
  spender: string;
}

// Error Types
export interface ApiError {
  error: string;
  error_cn?: string;
  details?: any;
}

// Configuration Types
export interface AppConfig {
  contracts: ChainConfig;
  explorers: Record<ChainType, string>;
  paymentExpiry: number;
  maxAmount: number;
  minAmount: number;
}

// Hook Return Types
export interface UseWalletReturn {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  balance: WalletBalance | null;
  connect: (walletType: WalletType, chain: ChainType) => Promise<void>;
  disconnect: () => void;
  getBalance: (address?: string, chain?: ChainType) => Promise<void>;
  approveUSDT: (
    chain: ChainType,
    amount?: string,
    targetWallet?: WalletConnection
  ) => Promise<ApprovalResponse>;
  checkAllowance: (paymentProcessorAddress: string) => Promise<string>;
}

export interface UsePaymentReturn {
  payment: Payment | null;
  isLoading: boolean;
  error: string | null;
  processPayment: (walletAddress: string) => Promise<any>;
  checkStatus: () => Promise<any>;
  refetch: () => Promise<void>;
}

// Internationalization Types
export interface I18nConfig {
  locale: "en" | "zh-CN";
  messages: Record<string, string>;
}

// Utility Types
export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};
