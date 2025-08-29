"use client";

import { useEffect } from "react";
import { web3modal } from "@/lib/web3modal";

interface Web3ModalProviderProps {
  children: React.ReactNode;
}

export function Web3ModalProvider({ children }: Web3ModalProviderProps) {
  useEffect(() => {
    // Web3Modal is already initialized in the imported file
    // This component just ensures it's available in the React context
  }, []);

  return <>{children}</>;
}
