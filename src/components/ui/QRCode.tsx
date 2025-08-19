// =================================
// 📱 QR Code Component
// =================================

"use client";

import React, { useEffect, useState } from "react";
import QRCodeGenerator from "qrcode";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  showValue?: boolean;
  onError?: (error: Error) => void;
}

export function QRCode({
  value,
  size = 200,
  className,
  showValue = false,
  onError,
}: QRCodeProps) {
  const [qrDataURL, setQrDataURL] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataURL = await QRCodeGenerator.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "M",
        });
        setQrDataURL(dataURL);
        setError("");
      } catch (err) {
        const errorMessage = "Failed to generate QR code";
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    };

    if (value) {
      generateQR();
    }
  }, [value, size, onError]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  if (error) {
    return (
      <div className={cn("flex flex-col items-center p-4", className)}>
        <div className="text-red-500 text-sm text-center">❌ {error}</div>
      </div>
    );
  }

  if (!qrDataURL) {
    return (
      <div className={cn("flex flex-col items-center p-4", className)}>
        <div
          className="border-2 border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
        {showValue && (
          <p className="text-xs text-gray-500 mt-2">{t("common.loading")}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* QR Code Image */}
      <div className="relative group">
        <img
          src={qrDataURL}
          alt="QR Code"
          className="border-2 border-gray-200 dark:border-gray-700 rounded-lg"
          style={{ width: size, height: size }}
        />

        {/* Copy overlay (appears on hover) */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={copyToClipboard}
            className="bg-white text-black px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            {copied ? t("common.copied") : t("common.copy")}
          </button>
        </div>
      </div>

      {/* Value display and copy button */}
      {showValue && (
        <div className="mt-3 w-full max-w-xs">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
              {value.length > 30
                ? `${value.slice(0, 15)}...${value.slice(-15)}`
                : value}
            </span>
            <button
              onClick={copyToClipboard}
              className={cn(
                "text-xs px-2 py-1 rounded transition-colors",
                copied
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              )}
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Payment URL QR Code Component
interface PaymentQRProps {
  paymentId: string;
  amount?: number;
  description?: string;
  className?: string;
}

export function PaymentQR({
  paymentId,
  amount,
  description,
  className,
}: PaymentQRProps) {
  const { t } = useTranslation();
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const paymentUrl = `${baseUrl}/pay/${paymentId}`;

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl p-6 text-center",
        className
      )}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        📱 Mobile Payment
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Scan this QR code with your mobile device to complete the payment
      </p>

      <QRCode
        value={paymentUrl}
        size={180}
        showValue={false}
        className="mx-auto"
      />

      {amount && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {amount} USDT
          </div>
          {description && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Payment ID: {paymentId}
      </div>
    </div>
  );
}
