// =================================
// 🔗 Professional Wallet Connection Hook
// =================================

import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";

export function useWalletConnect() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const connectWallet = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  const openWalletModal = () => {
    // Find the first available connector and connect
    const availableConnector = connectors.find((c) => c.ready);
    if (availableConnector) {
      connect({ connector: availableConnector });
    }
  };

  const switchToChain = async (chainId: number) => {
    if (switchChain) {
      switchChain({ chainId });
    }
  };

  return {
    address,
    isConnected,
    isConnecting,
    isLoading: isPending, // Map isPending to isLoading for backward compatibility
    connect: connectWallet,
    disconnect,
    openWalletModal,
    chain: { id: chainId },
    switchNetwork: switchToChain,
    connectors,
    pendingConnector: undefined, // Not available in wagmi v2
    error,
  };
}
