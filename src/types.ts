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

export interface SymbolInfo {
  symbol: string;
  point: number;
  tickValue: number;
  minVolume: number;
  maxVolume: number;
  spread: number;
}

export interface OrderBlock {
  id: string;
  type: 'supply' | 'demand';
  high: number;
  low: number;
  startTime: number;
  isMitigated: boolean;
  strength: number;
}

export interface StructureBreak {
  id: string;
  type: 'BOS' | 'ChoCh';
  direction: 'bullish' | 'bearish';
  price: number;
  time: number;
}

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
}

export interface RiskSettings {
  riskPercentage: number;
  maxDailyDrawdown: number;
  maxOpenTrades: number;
  trailingStop: boolean;
}

export interface InstrumentConfig {
  symbol: string;
  isCrashBoom: boolean;
  spikeThresholdATR: number; // N in "range > N x ATR"
  disableBOSOnSpikes: boolean;
  gapProtectionMultiplier: number;
  // Risk Profile
  riskPercentage: number;
  stopLossPips: number;
  takeProfitPips: number;
  lotSizeMethod: 'fixed' | 'dynamic';
  fixedLotSize: number;
}

export interface MarketAnalysis {
  linearRegression: { slope: number; intercept: number; r2: number };
  garch: { volatility: number; forecast: number };
  monteCarlo: { expectedReturn: number; var95: number; paths: number[][] };
  kalmanFilter: { filteredPrice: number; gain: number };
  hmm: { currentState: 'trending' | 'ranging' | 'volatile'; confidence: number };
  arima: { forecast: number; confidenceInterval: [number, number] };
  neuralNetwork: { bias: 'bullish' | 'bearish' | 'neutral'; confidence: number };
}

export interface Account {
  id: string;
  name: string;
  appId: string;
  apiToken: string;
  isActive: boolean;
  balance: number;
  status: 'connected' | 'disconnected' | 'error';
}

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
}
