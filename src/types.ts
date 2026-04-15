/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Core Market Data Types
 */
export interface MarketData {
  symbol: string;
  price: number;
  time: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
  spread: number;
}

/**
 * Symbol Configuration
 */
export interface SymbolInfo {
  symbol: string;
  point: number;
  tickValue: number;
  minVolume: number;
  maxVolume: number;
  spread: number;
}

/**
 * Order Block - Areas of institutional trading activity
 */
export interface OrderBlock {
  id: string;
  type: 'supply' | 'demand';
  high: number;
  low: number;
  startTime: number;
  isMitigated: boolean;
  strength: number;
}

/**
 * Structure Break - BOS (Break of Structure) or ChoCh (Change of Character)
 */
export interface StructureBreak {
  id: string;
  type: 'BOS' | 'ChoCh';
  direction: 'bullish' | 'bearish';
  price: number;
  time: number;
}

/**
 * Trade - Represents an individual trade position
 */
export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  status: 'open' | 'closed' | 'pending';
  pnl: number;
  openTime: number;
  closeTime?: number;
  tpAlertEnabled?: boolean;
  summary?: string;
}

/**
 * Risk Management Settings
 */
export interface RiskSettings {
  riskPercentage: number;
  maxDailyDrawdown: number;
  maxOpenTrades: number;
  trailingStop: boolean;
}

/**
 * Instrument Configuration - Per-symbol trading parameters
 */
export interface InstrumentConfig {
  symbol: string;
  isCrashBoom: boolean;
  spikeThresholdATR: number;
  disableBOSOnSpikes: boolean;
  gapProtectionMultiplier: number;
  riskPercentage: number;
  stopLossPips: number;
  takeProfitPips: number;
  lotSizeMethod: 'fixed' | 'dynamic';
  fixedLotSize: number;
}

/**
 * Market Analysis Results from APA Engine
 */
export interface MarketAnalysis {
  linearRegression: { slope: number; intercept: number; r2: number };
  garch: { volatility: number; forecast: number };
  monteCarlo: { expectedReturn: number; var95: number; paths: number[][] };
  kalmanFilter: { filteredPrice: number; gain: number };
  hmm: { currentState: 'trending' | 'ranging' | 'volatile'; confidence: number };
  arima: { forecast: number; confidenceInterval: [number, number] };
  neuralNetwork: { bias: 'bullish' | 'bearish' | 'neutral'; confidence: number };
}

/**
 * Trading Account
 */
export interface Account {
  id: string;
  name: string;
  appId: string;
  apiToken: string;
  isActive: boolean;
  balance: number;
  status: 'connected' | 'disconnected' | 'error';
}

/**
 * Performance Metrics for Learning System
 */
export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  consecutiveLosses: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  maxFavorableExcursion?: number;
  maxAdverseExcursion?: number;
}

/**
 * Bot State - Complete application state
 * FIXED: Added missing fields (activeAccountId, isLocked, pin)
 */
export interface BotState {
  isConnected: boolean;
  isTrading: boolean;
  balance: number;
  equity: number;
  activeSymbol: string;
  highWaterMark: number;
  lastResetTime: number;
  isHalted: boolean;
  instrumentConfigs: Record<string, InstrumentConfig>;
  appId: string;
  apiToken: string;
  accounts: Account[];
  soundEnabled: boolean;
  highPerformanceMode: boolean;
  activeAccountId: string;
  isLocked: boolean;
  pin: string;
}

/**
 * Backtest Results
 */
export interface BacktestResult {
  id: string;
  symbol: string;
  startDate: number;
  endDate: number;
  initialBalance: number;
  finalBalance: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  equityCurve: { time: number; equity: number }[];
  trades: Trade[];
}

/**
 * Log Entry
 */
export interface LogEntry {
  time: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Notification Settings
 */
export interface NotificationSettings {
  tradeAlerts: boolean;
  balanceChanges: boolean;
  connectionIssues: boolean;
  marketMovements: boolean;
  strategySignals: boolean;
}

/**
 * APA Engine Adjustment Record
 */
export interface APAAdjustment {
  parameter: string;
  value: number;
  change: string;
  time: number;
}
