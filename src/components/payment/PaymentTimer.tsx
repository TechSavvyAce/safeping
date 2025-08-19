// =================================
// ⏰ Payment Timer Component
// =================================

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/utils/cn";

interface PaymentTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
}

export function PaymentTimer({
  expiresAt,
  onExpire,
  className,
  compact = false,
}: PaymentTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    total: number;
  }>({ minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({
          minutes,
          seconds,
          total: difference,
        });
      } else {
        setTimeLeft({ minutes: 0, seconds: 0, total: 0 });
        onExpire?.();
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const formatTime = (time: number) => {
    return time.toString().padStart(2, "0");
  };

  const getTimerColor = () => {
    const totalMinutes = timeLeft.total / (1000 * 60);

    if (totalMinutes <= 2) {
      return "text-red-300 bg-red-900/30 border-red-700";
    } else if (totalMinutes <= 5) {
      return "text-orange-300 bg-orange-900/30 border-orange-700";
    } else {
      return "text-yellow-300 bg-yellow-900/30 border-yellow-700";
    }
  };

  if (timeLeft.total <= 0) {
    return (
      <div
        className={cn(
          "text-center p-6 rounded-xl border-2 bg-red-900/30 border-red-700",
          className
        )}
      >
        <div className="text-3xl mb-3 animate-pulse">⏰</div>
        <h3 className="font-semibold text-red-300 text-lg">支付已过期</h3>
        <p className="text-sm text-red-400 mt-2">此支付链接已过期</p>
      </div>
    );
  }

  // Compact mode for mobile
  if (compact) {
    return (
      <div
        className={cn("flex items-center justify-center space-x-3", className)}
      >
        <span className="text-lg animate-bounce">⏰</span>
        <span className="font-mono text-lg font-bold text-white">
          {String(timeLeft.minutes).padStart(2, "0")}:
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
        <div className="w-20 bg-gray-700 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-1000",
              timeLeft.total / (1000 * 60) <= 1
                ? "bg-red-400"
                : timeLeft.total / (1000 * 60) <= 5
                ? "bg-orange-400"
                : "bg-yellow-400"
            )}
            style={{
              width: `${Math.max(
                0,
                Math.min(100, (timeLeft.total / (30 * 60 * 1000)) * 100)
              )}%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-center p-6 rounded-xl border-2 relative overflow-hidden",
        getTimerColor(),
        className
      )}
    >
      {/* Chinese-style shimmer background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full animate-pulse" />

      <div className="relative z-10 flex items-center justify-center space-x-4">
        {/* Timer icon with animation */}
        <div className="text-3xl animate-bounce">
          {timeLeft.total / (1000 * 60) <= 2 ? "⚠️" : "⏰"}
        </div>

        {/* Timer display - Chinese style */}
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-white">剩余时间:</span>
          <div className="font-mono text-2xl font-bold text-white bg-black/20 px-3 py-1 rounded-lg">
            {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </div>
        </div>
      </div>

      {/* Warning message for low time */}
      {timeLeft.total / (1000 * 60) <= 2 && (
        <p className="text-sm mt-3 font-bold text-white animate-pulse">
          请尽快完成支付!
        </p>
      )}

      {/* Progress bar - Chinese style */}
      <div className="mt-4">
        <div className="w-full bg-black/30 rounded-full h-3 border border-white/20">
          <div
            className={cn(
              "h-3 rounded-full transition-all duration-1000 relative overflow-hidden",
              timeLeft.total / (1000 * 60) <= 2
                ? "bg-gradient-to-r from-red-400 to-red-500"
                : timeLeft.total / (1000 * 60) <= 5
                ? "bg-gradient-to-r from-orange-400 to-yellow-500"
                : "bg-gradient-to-r from-yellow-400 to-yellow-500"
            )}
            style={{
              width: `${Math.max(
                0,
                Math.min(100, (timeLeft.total / (30 * 60 * 1000)) * 100)
              )}%`,
            }}
          >
            {/* Shimmer effect on progress bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
