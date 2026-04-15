/**
 * useDrawdownManagement Hook
 * Manages daily drawdown tracking and automatic trading halt
 */

import { useCallback, useEffect, useRef } from 'react';
import { BotState } from '../types';

interface UseDrawdownManagementProps {
  balance: number;
  highWaterMark: number;
  lastResetTime: number;
  isHalted: boolean;
  onHalt: (isHalted: boolean) => void;
  onUpdateHighWaterMark: (hwm: number) => void;
  onUpdateResetTime: (time: number) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useDrawdownManagement({
  balance,
  highWaterMark,
  lastResetTime,
  isHalted,
  onHalt,
  onUpdateHighWaterMark,
  onUpdateResetTime,
  onAddLog
}: UseDrawdownManagementProps) {
  const maxDrawdownPercent = 5; // 5% daily drawdown limit
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getUTCMidnight = useCallback(() => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
  }, []);

  const checkAndUpdateReset = useCallback(() => {
    const currentUTCMidnight = getUTCMidnight();
    
    // Check if we need to reset for a new day
    if (lastResetTime < currentUTCMidnight) {
      onUpdateResetTime(currentUTCMidnight);
      onUpdateHighWaterMark(balance);
      onAddLog('New trading day: High water mark reset', 'info');
    }
  }, [lastResetTime, balance, getUTCMidnight, onUpdateResetTime, onUpdateHighWaterMark, onAddLog]);

  const calculateDrawdown = useCallback(() => {
    if (highWaterMark === 0) return 0;
    return ((highWaterMark - balance) / highWaterMark) * 100;
  }, [balance, highWaterMark]);

  const updateHighWaterMark = useCallback(() => {
    if (balance > highWaterMark) {
      onUpdateHighWaterMark(balance);
    }
  }, [balance, highWaterMark, onUpdateHighWaterMark]);

  const checkDrawdownLimit = useCallback(() => {
    const currentDrawdown = calculateDrawdown();
    
    if (currentDrawdown > maxDrawdownPercent && !isHalted) {
      onHalt(true);
      onAddLog(
        `Trading HALTED: Daily drawdown (${currentDrawdown.toFixed(2)}%) exceeds ${maxDrawdownPercent}% limit`,
        'error'
      );
    }
  }, [calculateDrawdown, isHalted, onHalt, onAddLog]);

  const resetTrading = useCallback(() => {
    if (isHalted) {
      const currentDrawdown = calculateDrawdown();
      if (currentDrawdown <= maxDrawdownPercent * 0.5) { // Resume if drawdown < 2.5%
        onHalt(false);
        onUpdateHighWaterMark(balance);
        onAddLog('Trading RESUMED: Drawdown within acceptable limits', 'success');
      }
    }
  }, [isHalted, calculateDrawdown, balance, onHalt, onUpdateHighWaterMark, onAddLog]);

  // Check for new day on mount and periodically
  useEffect(() => {
    checkAndUpdateReset();
    
    checkIntervalRef.current = setInterval(() => {
      checkAndUpdateReset();
      updateHighWaterMark();
      checkDrawdownLimit();
    }, 10000); // Check every 10 seconds

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkAndUpdateReset, updateHighWaterMark, checkDrawdownLimit]);

  return {
    calculateDrawdown,
    updateHighWaterMark,
    checkDrawdownLimit,
    resetTrading,
    maxDrawdownPercent
  };
}
