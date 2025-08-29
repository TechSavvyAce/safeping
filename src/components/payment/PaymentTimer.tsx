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
        if (onExpire) {
          onExpire();
        }
      }
    };

    calculateTimeLeft();

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

  const isExpired = timeLeft.total <= 0;
  const { minutes, seconds } = timeLeft;

  if (isExpired) {
    return (
      <div className="text-center p-4 rounded-lg border-2 relative overflow-hidden text-red-300 bg-red-900/30 border-red-700">
        <div className="flex items-center justify-center space-x-3">
          <div className="text-2xl">⚠️</div>
          <div className="text-center">
            <div className="font-semibold text-white text-lg">支付已过期</div>
            <p className="text-sm mt-1">请重新创建支付链接</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-4 rounded-lg border-2 relative overflow-hidden text-yellow-300 bg-yellow-900/30 border-yellow-700">
      <div className="flex items-center justify-center space-x-3">
        <div className="text-2xl">⏰</div>
        <div className="text-center">
          <div className="font-semibold text-white text-lg">剩余时间</div>
          <div className="font-mono text-2xl font-bold text-white bg-black/20 px-3 py-1 rounded-lg mt-1">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}
