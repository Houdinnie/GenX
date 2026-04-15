/**
 * useAutomatedTrading Hook
 * Encapsulates automated trading logic extracted from App.tsx
 * Implements the trading decision engine based on APA analysis
 */

import { useEffect, useRef, useCallback } from 'react';
import { APAEngine } from '../services/apaEngine';
import { BotState, Trade, MarketData } from '../types';

interface UseAutomatedTradingProps {
  isTrading: boolean;
  botState: BotState;
  currentEngine: APAEngine;
  marketData: MarketData[];
  trades: Trade[];
  onExecuteTrade: (type: 'buy' | 'sell', lotSize: number, sl?: number, tp?: number) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onUpdateBotState: (updater: (prev: BotState) => BotState) => void;
}

export function useAutomatedTrading({
  isTrading,
  botState,
  currentEngine,
  marketData,
  trades,
  onExecuteTrade,
  onAddLog,
  onUpdateBotState
}: UseAutomatedTradingProps) {
  const lastTradeTime = useRef<number>(0);
  const tradeCooldown = 30000; // 30 seconds between trades

  const checkDrawdown = useCallback(() => {
    const currentTime = Date.now();
    const resetTime = new Date().setUTCHours(0, 0, 0, 0);

    // Reset high water mark if new day
    if (currentTime >= resetTime && botState.lastResetTime < resetTime) {
      onUpdateBotState(prev => ({
        ...prev,
        highWaterMark: prev.balance,
        lastResetTime: resetTime
      }));
      onAddLog('Daily drawdown reset', 'info');
    }

    // Check if current balance exceeds high water mark
    if (botState.balance > botState.highWaterMark) {
      onUpdateBotState(prev => ({ ...prev, highWaterMark: prev.balance }));
    }

    // Calculate current drawdown
    const drawdown = ((botState.highWaterMark - botState.balance) / botState.highWaterMark) * 100;

    // Halt trading if drawdown exceeds 5%
    if (drawdown > 5 && !botState.isHalted) {
      onUpdateBotState(prev => ({ ...prev, isHalted: true }));
      onAddLog(`Trading halted: Drawdown ${drawdown.toFixed(2)}% exceeds 5% limit`, 'error');
    }
  }, [botState, onUpdateBotState, onAddLog]);

  const executeAutomatedTrade = useCallback(() => {
    const analysis = currentEngine.getAnalysis();
    if (!analysis || !analysis.neuralNetwork) return;

    const bias = analysis.neuralNetwork.bias;
    const confidence = analysis.neuralNetwork.confidence;
    const currentPrice = marketData[marketData.length - 1]?.price;

    if (!currentPrice || confidence < 0.7) return;

    // Check for open trades
    const hasOpenTrade = trades.some(t => t.status === 'open');
    if (hasOpenTrade) return;

    // Check cooldown
    if (Date.now() - lastTradeTime.current < tradeCooldown) return;

    // Entry logic based on neural network bias
    if (bias === 'bullish' && confidence > 0.75) {
      onAddLog(`Automated BUY signal | Confidence: ${(confidence * 100).toFixed(1)}%`, 'success');
      lastTradeTime.current = Date.now();
      // Lot size would be calculated externally
      onExecuteTrade('buy', 0.01);
    } else if (bias === 'bearish' && confidence > 0.75) {
      onAddLog(`Automated SELL signal | Confidence: ${(confidence * 100).toFixed(1)}%`, 'success');
      lastTradeTime.current = Date.now();
      onExecuteTrade('sell', 0.01);
    }
  }, [currentEngine, marketData, trades, onExecuteTrade, onAddLog]);

  useEffect(() => {
    if (!isTrading || botState.isHalted) return;

    const interval = setInterval(() => {
      executeAutomatedTrade();
      checkDrawdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTrading, botState.isHalted, executeAutomatedTrade, checkDrawdown]);

  return {
    executeAutomatedTrade,
    checkDrawdown
  };
}
