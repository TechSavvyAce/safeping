// =================================
// 🌐 Language Switcher Component
// =================================

"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "button" | "dropdown" | "toggle";
}

export function LanguageSwitcher({
  className,
  variant = "button",
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language;
  const displayText = t("app.language");

  if (variant === "toggle") {
    return (
      <button
        onClick={toggleLanguage}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "bg-gray-200 dark:bg-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          className
        )}
        aria-label="Toggle language"
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            "shadow-lg ring-0",
            currentLang === "zh" ? "translate-x-6" : "translate-x-1"
          )}
        />
        <span className="sr-only">{displayText}</span>
      </button>
    );
  }

  if (variant === "dropdown") {
    return (
      <div className={cn("relative", className)}>
        <select
          value={currentLang}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className={cn(
            "appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
            "rounded-md px-3 py-1 text-sm font-medium",
            "text-gray-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "cursor-pointer"
          )}
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md",
        "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200",
        "font-medium text-gray-700 dark:text-gray-300",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        className
      )}
    >
      {displayText}
    </button>
  );
}

// Language context indicator for debugging
export function LanguageDebugger() {
  const { i18n } = useTranslation();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
      Lang: {i18n.language}
    </div>
  );
}
