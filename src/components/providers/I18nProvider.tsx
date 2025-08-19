// =================================
// 🌐 I18n Provider Component
// =================================

"use client";

import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize i18n if not already initialized
    if (!i18n.isInitialized) {
      i18n.init();
    }
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by waiting for client-side initialization
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
