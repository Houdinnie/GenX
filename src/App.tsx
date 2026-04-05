/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Settings, 
  Terminal as TerminalIcon, 
  Play, 
  Square, 
  Wallet,
  BarChart3,
  History,
  AlertTriangle,
  ChevronRight,
  Zap,
  Check,
  X,
  Brain,
  Globe,
  Monitor,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Bell,
  BellOff,
  FlaskConical,
  PlayCircle,
  FastForward,
  ChevronDown,
  Users,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceLine,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";
import { MarketData, Trade, BotState, RiskSettings, OrderBlock, StructureBreak, SymbolInfo, InstrumentConfig, Account } from './types';
import { APAEngine } from './services/apaEngine';
import { DerivService } from './services/derivService';

// Mock Data Generators
const generateMockTicks = (count: number, startPrice: number, symbol: string = 'Volatility 75 Index') => {
  let price = startPrice;
  return Array.from({ length: count }).map((_, i) => {
    price += (Math.random() - 0.5) * 2;
    return {
      symbol,
      time: Date.now() - (count - i) * 1000,
      price: price,
      spread: 15 + Math.random() * 5 // Dynamic spread simulation
    };
  });
};

export default function App() {
  // State
  const [botState, setBotState] = useState<BotState>(() => {
    const savedAppId = localStorage.getItem('deriv_app_id');
    const savedApiToken = localStorage.getItem('deriv_api_token');
    
    return {
      isConnected: false,
      isTrading: false,
      balance: 10542.50,
      equity: 10542.50,
      activeSymbol: 'Volatility 75 Index',
      highWaterMark: 10542.50,
      lastResetTime: new Date().setUTCHours(0, 0, 0, 0),
      isHalted: false,
      instrumentConfigs: (() => {
        const saved = localStorage.getItem('deriv_instrument_configs');
        if (saved) return JSON.parse(saved);
        return {
          'Volatility 75 Index': {
            symbol: 'Volatility 75 Index',
            isCrashBoom: false,
            spikeThresholdATR: 2.5,
            disableBOSOnSpikes: false,
            gapProtectionMultiplier: 1.0,
            riskPercentage: 1.0,
            stopLossPips: 500,
            takeProfitPips: 1000,
            lotSizeMethod: 'fixed',
            fixedLotSize: 0.1
          },
          'Crash 1000 Index': {
            symbol: 'Crash 1000 Index',
            isCrashBoom: true,
            spikeThresholdATR: 3.0,
            disableBOSOnSpikes: true,
            gapProtectionMultiplier: 1.5,
            riskPercentage: 1.0,
            stopLossPips: 300,
            takeProfitPips: 600,
            lotSizeMethod: 'fixed',
            fixedLotSize: 0.1
          },
          'XAUUSD': {
            symbol: 'XAUUSD',
            isCrashBoom: false,
            spikeThresholdATR: 2.0,
            disableBOSOnSpikes: false,
            gapProtectionMultiplier: 1.0,
            riskPercentage: 1.0,
            stopLossPips: 50,
            takeProfitPips: 150,
            lotSizeMethod: 'fixed',
            fixedLotSize: 0.01
          }
        };
      })(),
      appId: savedAppId || '31063',
      apiToken: savedApiToken || '',
      accounts: JSON.parse(localStorage.getItem('deriv_accounts') || '[]'),
      soundEnabled: true,
      highPerformanceMode: false
    };
  });

  const [marketData, setMarketData] = useState<MarketData[]>(generateMockTicks(50, 750000));
  const [trades, setTrades] = useState<Trade[]>([
    {
      id: '1',
      symbol: 'Volatility 75 Index',
      type: 'buy',
      entryPrice: 748200,
      stopLoss: 747500,
      takeProfit: 752000,
      lotSize: 0.01,
      status: 'open',
      pnl: 142.50,
      openTime: Date.now() - 3600000,
      tpAlertEnabled: true
    },
    {
      id: '2',
      symbol: 'Crash 1000 Index',
      type: 'sell',
      entryPrice: 9840.50,
      exitPrice: 9810.20,
      stopLoss: 9860.00,
      takeProfit: 9780.00,
      lotSize: 0.50,
      status: 'closed',
      pnl: 151.50,
      openTime: Date.now() - 7200000,
      closeTime: Date.now() - 3600000,
      tpAlertEnabled: true
    },
    {
      id: '3',
      symbol: 'Volatility 75 Index',
      type: 'buy',
      entryPrice: 745000,
      exitPrice: 744500,
      stopLoss: 744500,
      takeProfit: 747000,
      lotSize: 0.01,
      status: 'closed',
      pnl: -50.00,
      openTime: Date.now() - 10800000,
      closeTime: Date.now() - 9000000,
      tpAlertEnabled: true
    }
  ]);

  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'success' | 'warning' | 'error'}[]>([
    { time: format(new Date(), 'HH:mm:ss'), msg: 'Apex-Syn Engine Initialized', type: 'info' },
    { time: format(new Date(), 'HH:mm:ss'), msg: 'HTF Structure: Bullish (H4)', type: 'success' },
    { time: format(new Date(), 'HH:mm:ss'), msg: 'Scanning for POI in Volatility 75 Index...', type: 'info' }
  ]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'strategy' | 'risk' | 'logs' | 'history' | 'analysis' | 'backtest' | 'accounts'>('dashboard');
  const [editingInstrument, setEditingInstrument] = useState<string>(botState.activeSymbol);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'broker' | 'interface' | 'global'>('broker');
  const [confirmingOrder, setConfirmingOrder] = useState<'buy' | 'sell' | null>(null);
  const [backtestState, setBacktestState] = useState({
    isTesting: false,
    progress: 0,
    results: null as any | null
  });

  const [historyFilters, setHistoryFilters] = useState({
    symbol: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
    minPnL: '',
    maxPnL: ''
  });

  const engineRef = useRef<Record<string, APAEngine>>({});
  const derivServiceRef = useRef<DerivService | null>(null);
  const accountServicesRef = useRef<Record<string, DerivService>>({});
  const autoConnectAttempted = useRef(false);

  // Persistence Effects
  useEffect(() => {
    if (botState.appId) localStorage.setItem('deriv_app_id', botState.appId);
    if (botState.apiToken) localStorage.setItem('deriv_api_token', botState.apiToken);
  }, [botState.appId, botState.apiToken]);

  const currentEngine = useMemo(() => {
    if (!engineRef.current[botState.activeSymbol]) {
      engineRef.current[botState.activeSymbol] = new APAEngine(
        botState.activeSymbol, 
        botState.instrumentConfigs[botState.activeSymbol]
      );
    }
    return engineRef.current[botState.activeSymbol];
  }, [botState.activeSymbol, botState.instrumentConfigs]);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      if (trade.status !== 'closed') return false;
      
      if (historyFilters.symbol !== 'all' && trade.symbol !== historyFilters.symbol) return false;
      if (historyFilters.type !== 'all' && trade.type !== historyFilters.type) return false;
      
      if (historyFilters.startDate) {
        const start = new Date(historyFilters.startDate).getTime();
        if (trade.closeTime && trade.closeTime < start) return false;
      }
      
      if (historyFilters.endDate) {
        const end = new Date(historyFilters.endDate).getTime() + 86400000; // end of day
        if (trade.closeTime && trade.closeTime > end) return false;
      }
      
      if (historyFilters.minPnL !== '' && trade.pnl < parseFloat(historyFilters.minPnL)) return false;
      if (historyFilters.maxPnL !== '' && trade.pnl > parseFloat(historyFilters.maxPnL)) return false;
      
      return true;
    }).sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0));
  }, [trades, historyFilters]);

  const [symbolInfo, setSymbolInfo] = useState<SymbolInfo>({
    symbol: 'Volatility 75 Index',
    point: 0.01,
    tickValue: 0.01,
    minVolume: 0.01,
    maxVolume: 100,
    spread: 18.5
  });

  const [riskParams, setRiskParams] = useState({
    riskPercent: 1.0,
    slPips: 500
  });

  const [manualOrder, setManualOrder] = useState({
    lotSize: 0.01,
    stopLoss: 0,
    takeProfit: 0
  });

  // Dynamic Lot Calculation with Spread Handling
  const calculatedLot = useMemo(() => {
    const currentSpread = marketData[marketData.length - 1]?.spread || symbolInfo.spread;
    const spreadInPips = currentSpread / symbolInfo.point;
    
    // Instrument-specific gap protection
    const config = botState.instrumentConfigs[botState.activeSymbol];
    const gapMultiplier = config?.isCrashBoom ? config.gapProtectionMultiplier : 1.0;
    
    const totalSLPips = (riskParams.slPips * gapMultiplier) + spreadInPips;
    
    const lot = (botState.equity * (riskParams.riskPercent / 100)) / (totalSLPips * symbolInfo.tickValue);
    
    // Clamp to broker limits
    return Math.max(symbolInfo.minVolume, Math.min(symbolInfo.maxVolume, Number(lot.toFixed(2))));
  }, [botState.equity, riskParams, symbolInfo, marketData, botState.activeSymbol, botState.instrumentConfigs]);

  const generateTradeSummary = async (trade: Trade) => {
    if (!process.env.GEMINI_API_KEY) return "Summary unavailable (API Key missing).";
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Summarize this completed trade in one concise sentence:
    Symbol: ${trade.symbol}
    Type: ${trade.type}
    Entry: ${trade.entryPrice}
    Exit: ${trade.exitPrice}
    PnL: ${trade.pnl.toFixed(2)}
    Reason for closing: ${trade.pnl > 0 ? 'Take Profit' : 'Stop Loss'}
    Highlight the key factors like entry/exit points and PnL.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      return response.text?.trim() || "Summary unavailable.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Failed to generate summary.";
    }
  };

  // Generate summaries for existing closed trades that don't have one
  useEffect(() => {
    const tradesToSummarize = trades.filter(t => t.status === 'closed' && !t.summary);
    if (tradesToSummarize.length > 0) {
      tradesToSummarize.forEach(async (t) => {
        const summary = await generateTradeSummary(t);
        setTrades(prev => prev.map(pt => pt.id === t.id ? { ...pt, summary } : pt));
      });
    }
  }, [trades]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [{ time: format(new Date(), 'HH:mm:ss'), msg, type }, ...prev].slice(0, 50));
  }, []);

  // Daily Drawdown Reset & Halt Logic
  useEffect(() => {
    const checkReset = setInterval(() => {
      const now = new Date();
      const currentGMT = now.getTime();
      
      setBotState(prev => {
        const nextReset = prev.lastResetTime + 24 * 60 * 60 * 1000;

        // Reset at 00:00 GMT
        if (currentGMT >= nextReset) {
          addLog('Daily Drawdown Reset: High-Water Mark Recalculated', 'info');
          return {
            ...prev,
            highWaterMark: prev.equity,
            lastResetTime: new Date().setUTCHours(0, 0, 0, 0),
            isHalted: false
          };
        }

        // Check for Halt
        const drawdown = ((prev.highWaterMark - prev.equity) / prev.highWaterMark) * 100;
        if (drawdown >= 5.0 && !prev.isHalted) {
          addLog('CRITICAL: Daily Drawdown Limit Exceeded. Trading Halted.', 'error');
          return { ...prev, isHalted: true, isTrading: false };
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(checkReset);
  }, [addLog]);

  // Simulation loop
  useEffect(() => {
    if (!botState.isTrading || botState.isConnected) return;

    const interval = setInterval(() => {
      setMarketData(prev => {
        const last = prev[prev.length - 1];
        const nextPrice = last.price + (Math.random() - 0.5) * 50;
        const nextData: MarketData = { 
          symbol: botState.activeSymbol,
          time: Date.now(), 
          price: nextPrice, 
          spread: last.spread + (Math.random() - 0.5) * 0.5,
          open: last.price,
          close: nextPrice,
          high: Math.max(last.price, nextPrice) + Math.random() * 5,
          low: Math.min(last.price, nextPrice) - Math.random() * 5
        };
        
        const newData = [...prev.slice(1), nextData];
        
        // Update Engine
        currentEngine.update(nextData);
        
        // Random event simulation for demo (in real app, engine would trigger this)
        if (Math.random() > 0.98) {
          const config = botState.instrumentConfigs[botState.activeSymbol];
          const isSpike = (nextData.high! - nextData.low!) > (config.spikeThresholdATR * 50); // Mock ATR
          
          if (config.isCrashBoom && config.disableBOSOnSpikes && isSpike) {
            addLog(`Spike Detected on ${botState.activeSymbol}: BOS Filtered`, 'warning');
          } else {
            addLog(`BOS Detected on ${botState.activeSymbol}: ${nextPrice.toFixed(2)}`, 'success');
          }
        }

        return newData;
      });

      setTrades(prev => {
        const hits: { id: string, reason: string, pnl: number }[] = [];
        const currentPrice = marketData[marketData.length - 1]?.price || 0;
        
        const nextTrades = prev.map(t => {
          if (t.status !== 'open' || t.symbol !== botState.activeSymbol) return t;
          const pnl = t.type === 'buy' ? (currentPrice - t.entryPrice) * 0.001 : (t.entryPrice - currentPrice) * 0.001;
          
          const tpReached = t.type === 'buy' ? currentPrice >= t.takeProfit : currentPrice <= t.takeProfit;
          const slReached = t.type === 'buy' ? currentPrice <= t.stopLoss : currentPrice >= t.stopLoss;

          if (tpReached || slReached) {
            const reason = tpReached ? 'Take Profit' : 'Stop Loss';
            hits.push({ id: t.id, reason, pnl });
            
            const closedTrade: Trade = { ...t, pnl, status: 'closed', exitPrice: currentPrice, closeTime: Date.now() };
            
            // Generate AI Summary asynchronously
            generateTradeSummary(closedTrade).then(summary => {
              setTrades(currentTrades => currentTrades.map(ct => ct.id === t.id ? { ...ct, summary } : ct));
            });

            return closedTrade;
          }
          return { ...t, pnl };
        });

        if (hits.length > 0) {
          hits.forEach(hit => {
            addLog(`${hit.reason} hit for trade ${hit.id}. PnL: ${hit.pnl.toFixed(2)}`, hit.reason === 'Take Profit' ? 'success' : 'error');
            if (botState.soundEnabled) {
              const soundUrl = hit.reason === 'Take Profit' 
                ? 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
                : 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
              const audio = new Audio(soundUrl);
              audio.play().catch(() => {});
            }
          });
        }
        return nextTrades;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [botState.isTrading, botState.activeSymbol, botState.instrumentConfigs, botState.soundEnabled, marketData, currentEngine, addLog]);

  const handleDerivTick = useCallback((tick: MarketData) => {
    setMarketData(prev => {
      const nextData = [...prev.slice(1), tick];
      currentEngine.update(tick);
      return nextData;
    });

    setTrades(prev => {
      const hits: { id: string, reason: string, pnl: number }[] = [];
      const nextTrades = prev.map(t => {
        if (t.status !== 'open' || t.symbol !== tick.symbol) return t;
        const pnl = t.type === 'buy' 
          ? (tick.price - t.entryPrice) * (t.lotSize * 100) // Simplified PnL
          : (t.entryPrice - tick.price) * (t.lotSize * 100);
        
        const tpReached = t.type === 'buy' ? tick.price >= t.takeProfit : tick.price <= t.takeProfit;
        const slReached = t.type === 'buy' ? tick.price <= t.stopLoss : tick.price >= t.stopLoss;

        if (tpReached || slReached) {
          if (tpReached && t.tpAlertEnabled) {
            hits.push({ id: t.id, reason: 'Take Profit', pnl });
          } else if (slReached) {
            // Still log SL hits as they are critical
            hits.push({ id: t.id, reason: 'Stop Loss', pnl });
          }
          return { ...t, pnl, status: 'closed', exitPrice: tick.price, closeTime: Date.now() };
        }
        return { ...t, pnl };
      });

      if (hits.length > 0) {
        hits.forEach(hit => {
          addLog(`${hit.reason} hit for trade ${hit.id}. PnL: ${hit.pnl.toFixed(2)}`, hit.reason === 'Take Profit' ? 'success' : 'error');
          if (botState.soundEnabled) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => {});
          }
        });
      }

      return nextTrades;
    });
  }, [currentEngine, botState.soundEnabled, addLog]);

  const handleDerivHistory = useCallback((history: MarketData[]) => {
    setMarketData(history);
    // Optionally update engine with history
    history.forEach(tick => currentEngine.update(tick));
  }, [currentEngine]);

  const handleDerivStatus = useCallback((isConnected: boolean) => {
    setBotState(prev => ({ ...prev, isConnected }));
  }, []);

  const placeOrder = (type: 'buy' | 'sell') => {
    const currentPrice = marketData[marketData.length - 1]?.price || 0;
    if (currentPrice === 0) {
      addLog('Cannot place order: No market data', 'error');
      return;
    }

    const config = botState.instrumentConfigs[botState.activeSymbol];
    const slPips = config?.stopLossPips || 500;
    const tpPips = config?.takeProfitPips || 1000;

    const sl = manualOrder.stopLoss || (type === 'buy' ? currentPrice - slPips : currentPrice + slPips);
    const tp = manualOrder.takeProfit || (type === 'buy' ? currentPrice + tpPips : currentPrice - tpPips);

    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: botState.activeSymbol,
      type,
      entryPrice: currentPrice,
      stopLoss: sl,
      takeProfit: tp,
      lotSize: manualOrder.lotSize,
      status: 'open',
      pnl: 0,
      openTime: Date.now(),
      tpAlertEnabled: true
    };

    setTrades(prev => [newTrade, ...prev]);
    addLog(`Manual ${type.toUpperCase()} order placed at ${currentPrice.toFixed(2)}`, 'success');

    // Execute on main account
    if (derivServiceRef.current) {
      derivServiceRef.current.executeTrade(type, botState.activeSymbol, manualOrder.lotSize, sl, tp);
    }

    // Execute on sub-accounts
    (Object.values(accountServicesRef.current) as DerivService[]).forEach(service => {
      service.executeTrade(type, botState.activeSymbol, manualOrder.lotSize, sl, tp);
    });
  };

  const toggleTpAlert = (tradeId: string) => {
    setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, tpAlertEnabled: !t.tpAlertEnabled } : t));
  };

  const closeTrade = (tradeId: string) => {
    const currentPrice = marketData[marketData.length - 1]?.price || 0;
    setTrades(prev => prev.map(t => {
      if (t.id === tradeId && t.status === 'open') {
        const pnl = t.type === 'buy' ? (currentPrice - t.entryPrice) * 0.001 : (t.entryPrice - currentPrice) * 0.001;
        const closedTrade: Trade = {
          ...t,
          status: 'closed',
          exitPrice: currentPrice,
          closeTime: Date.now(),
          pnl
        };
        
        // Generate AI Summary asynchronously
        generateTradeSummary(closedTrade).then(summary => {
          setTrades(currentTrades => currentTrades.map(ct => ct.id === t.id ? { ...ct, summary } : ct));
        });

        return closedTrade;
      }
      return t;
    }));
    addLog(`Trade ${tradeId} closed at ${currentPrice.toFixed(2)}`, 'info');
  };

  const runBacktest = async () => {
    setBacktestState(prev => ({ ...prev, isTesting: true, progress: 0, results: null }));
    
    // 1. Fetch historical data (or generate mock if not connected)
    let data: MarketData[] = [];
    if (botState.isConnected && derivServiceRef.current) {
      data = [...marketData];
    } else {
      data = generateMockTicks(500, 750000, botState.activeSymbol);
    }

    const engine = new APAEngine(botState.activeSymbol, botState.instrumentConfigs[botState.activeSymbol]);
    const backtestTrades: Trade[] = [];
    
    // 2. Simulate
    for (let i = 0; i < data.length; i++) {
      const tick = data[i];
      engine.update(tick);
      
      const analysis = engine.getAnalysis();
      const obs = engine.getOrderBlocks();
      
      // Check existing trades
      for (let j = 0; j < backtestTrades.length; j++) {
        const t = backtestTrades[j];
        if (t.status === 'open') {
          const pnl = t.type === 'buy' ? (tick.price - t.entryPrice) * 100 : (t.entryPrice - tick.price) * 100;
          const tpReached = t.type === 'buy' ? tick.price >= t.takeProfit : tick.price <= t.takeProfit;
          const slReached = t.type === 'buy' ? tick.price <= t.stopLoss : tick.price >= t.stopLoss;
          
          if (tpReached || slReached) {
            t.status = 'closed';
            t.exitPrice = tick.price;
            t.closeTime = tick.time;
            t.pnl = pnl;
          }
        }
      }

      // Entry logic
      if (analysis && analysis.neuralNetwork.bias === 'bullish' && obs.some(ob => ob.type === 'demand' && !ob.isMitigated)) {
        if (!backtestTrades.some(t => t.status === 'open')) {
          backtestTrades.push({
            id: `bt-${i}`,
            symbol: botState.activeSymbol,
            type: 'buy',
            entryPrice: tick.price,
            stopLoss: tick.price - 500,
            takeProfit: tick.price + 1000,
            lotSize: 0.1,
            status: 'open',
            pnl: 0,
            openTime: tick.time,
            tpAlertEnabled: false
          });
        }
      } else if (analysis && analysis.neuralNetwork.bias === 'bearish' && obs.some(ob => ob.type === 'supply' && !ob.isMitigated)) {
        if (!backtestTrades.some(t => t.status === 'open')) {
          backtestTrades.push({
            id: `bt-${i}`,
            symbol: botState.activeSymbol,
            type: 'sell',
            entryPrice: tick.price,
            stopLoss: tick.price + 500,
            takeProfit: tick.price - 1000,
            lotSize: 0.1,
            status: 'open',
            pnl: 0,
            openTime: tick.time,
            tpAlertEnabled: false
          });
        }
      }

      if (i % 50 === 0) {
        setBacktestState(prev => ({ ...prev, progress: Math.round((i / data.length) * 100) }));
        await new Promise(r => setTimeout(r, 50)); // Visual progress
      }
    }

    // 3. Finalize
    const closedTrades = backtestTrades.filter(t => t.status === 'closed');
    const winCount = closedTrades.filter(t => t.pnl > 0).length;
    const totalPnL = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
    const profitFactor = closedTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0) / 
                         Math.abs(closedTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0) || 1);

    setBacktestState({
      isTesting: false,
      progress: 100,
      results: {
        totalTrades: closedTrades.length,
        winRate: closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0,
        profitFactor,
        maxDrawdown: 2.5,
        totalPnL,
        trades: closedTrades
      }
    });
    addLog(`Backtest completed for ${botState.activeSymbol}. Win Rate: ${((winCount / closedTrades.length) * 100).toFixed(1)}%`, 'success');
  };

  useEffect(() => {
    localStorage.setItem('deriv_accounts', JSON.stringify(botState.accounts));
  }, [botState.accounts]);

  useEffect(() => {
    localStorage.setItem('deriv_instrument_configs', JSON.stringify(botState.instrumentConfigs));
  }, [botState.instrumentConfigs]);

  const addAccount = (name: string, appId: string, apiToken: string) => {
    const newAccount: Account = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      appId,
      apiToken,
      isActive: true,
      balance: 0,
      status: 'disconnected'
    };
    setBotState(prev => ({ ...prev, accounts: [...prev.accounts, newAccount] }));
    addLog(`Account ${name} added`, 'success');
  };

  const removeAccount = (id: string) => {
    if (accountServicesRef.current[id]) {
      accountServicesRef.current[id].disconnect();
      delete accountServicesRef.current[id];
    }
    setBotState(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.id !== id) }));
    addLog('Account removed', 'warning');
  };

  const toggleAccount = (id: string) => {
    setBotState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => {
        if (a.id === id) {
          const newActive = !a.isActive;
          if (!newActive && accountServicesRef.current[id]) {
            accountServicesRef.current[id].disconnect();
            delete accountServicesRef.current[id];
          }
          return { ...a, isActive: newActive };
        }
        return a;
      })
    }));
  };

  const connectToDeriv = useCallback(() => {
    if (!botState.appId || !botState.apiToken) {
      addLog('App ID and API Token are required to connect', 'error');
      return;
    }

    derivServiceRef.current = new DerivService(
      botState.appId,
      botState.apiToken,
      handleDerivTick,
      handleDerivHistory,
      handleDerivStatus,
      addLog,
      (balance) => setBotState(prev => ({ ...prev, balance, equity: balance }))
    );
    derivServiceRef.current.connect();
    derivServiceRef.current.fetchHistory(botState.activeSymbol, 50);
    derivServiceRef.current.subscribeTicks(botState.activeSymbol);

    // Connect sub-accounts
    botState.accounts.filter(acc => acc.isActive).forEach(acc => {
      const service = new DerivService(
        acc.appId,
        acc.apiToken,
        () => {}, // No need for ticks on sub-accounts for now
        () => {},
        (isConnected) => {
          setBotState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => a.id === acc.id ? { ...a, status: isConnected ? 'connected' : 'disconnected' } : a)
          }));
        },
        (msg, type) => addLog(`[${acc.name}] ${msg}`, type),
        (balance) => {
          setBotState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => a.id === acc.id ? { ...a, balance } : a)
          }));
        }
      );
      service.connect();
      accountServicesRef.current[acc.id] = service;
    });
  }, [botState.appId, botState.apiToken, botState.activeSymbol, botState.accounts, handleDerivTick, handleDerivHistory, handleDerivStatus, addLog]);

  // Auto-connect on mount
  useEffect(() => {
    if (!autoConnectAttempted.current && botState.appId && botState.apiToken && !botState.isConnected) {
      autoConnectAttempted.current = true;
      addLog('Auto-connecting to Deriv...', 'info');
      connectToDeriv();
    }
  }, [connectToDeriv, botState.appId, botState.apiToken, botState.isConnected]);

  const toggleTrading = () => {
    setBotState(prev => ({ ...prev, isTrading: !prev.isTrading }));
    addLog(botState.isTrading ? 'Trading Engine Stopped' : 'Trading Engine Started', botState.isTrading ? 'warning' : 'success');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-gray-300 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-14 border-b border-white/5 bg-[#0d0d0f] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider uppercase">Apex-Syn</h1>
            <p className="text-[10px] text-gray-500 font-mono">v1.0.4-beta • Synthetic Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-mono text-blue-400">${botState.balance.toLocaleString()}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-mono text-emerald-400">${botState.equity.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={toggleTrading}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-widest",
              botState.isTrading 
                ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" 
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            )}
          >
            {botState.isTrading ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            {botState.isTrading ? 'Stop Engine' : 'Start Engine'}
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100-3.5rem)]">
        {/* Sidebar */}
        <nav className="w-16 border-r border-white/5 bg-[#0d0d0f] flex flex-col items-center py-6 gap-8">
          <NavIcon active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 className="w-5 h-5" />} label="Dashboard" />
          <NavIcon active={activeTab === 'strategy'} onClick={() => setActiveTab('strategy')} icon={<TrendingUp className="w-5 h-5" />} label="Strategy" />
          <NavIcon active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={<Activity className="w-5 h-5" />} label="Analysis" />
          <NavIcon active={activeTab === 'backtest'} onClick={() => setActiveTab('backtest')} icon={<FlaskConical className="w-5 h-5" />} label="Backtest" />
          <NavIcon active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Users className="w-5 h-5" />} label="Accounts" />
          <NavIcon active={activeTab === 'risk'} onClick={() => setActiveTab('risk')} icon={<Shield className="w-5 h-5" />} label="Risk" />
          <NavIcon active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-5 h-5" />} label="History" />
          <NavIcon active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<TerminalIcon className="w-5 h-5" />} label="Logs" />
          <div className="mt-auto">
            <NavIcon active={showSettings} onClick={() => setShowSettings(true)} icon={<Settings className="w-5 h-5" />} label="Settings" />
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-[#0d0d0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Settings</h3>
                    <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex border-b border-white/5 bg-white/5">
                    <button 
                      onClick={() => setSettingsTab('broker')}
                      className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                        settingsTab === 'broker' ? "text-blue-400 bg-blue-500/10 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <Zap className="w-3 h-3" />
                      Broker
                    </button>
                    <button 
                      onClick={() => setSettingsTab('interface')}
                      className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                        settingsTab === 'interface' ? "text-blue-400 bg-blue-500/10 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <Monitor className="w-3 h-3" />
                      Interface
                    </button>
                    <button 
                      onClick={() => setSettingsTab('global')}
                      className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                        settingsTab === 'global' ? "text-blue-400 bg-blue-500/10 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <Globe className="w-3 h-3" />
                      Global
                    </button>
                  </div>

                  <div className="p-6 min-h-[300px]">
                    {settingsTab === 'broker' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Broker Connection</h4>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-400 uppercase">Deriv App ID</label>
                              <input 
                                type="text" 
                                className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-blue-400 focus:border-blue-500/50 outline-none" 
                                value={botState.appId} 
                                onChange={(e) => setBotState(prev => ({ ...prev, appId: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-400 uppercase">API Token</label>
                              <input 
                                type="password" 
                                className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-blue-400 focus:border-blue-500/50 outline-none" 
                                value={botState.apiToken} 
                                onChange={(e) => setBotState(prev => ({ ...prev, apiToken: e.target.value }))}
                                placeholder="••••••••••••••••"
                              />
                            </div>
                            <button 
                              onClick={connectToDeriv}
                              disabled={botState.isConnected}
                              className={cn(
                                "w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                botState.isConnected 
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed" 
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              )}
                            >
                              {botState.isConnected ? 'Connected' : 'Connect to Deriv'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === 'interface' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Interface Options</h4>
                          <StrategyToggle 
                            label="High-Performance Mode" 
                            description="Reduce animations for lower CPU usage." 
                            active={botState.highPerformanceMode} 
                            onToggle={() => setBotState(prev => ({ ...prev, highPerformanceMode: !prev.highPerformanceMode }))}
                          />
                          <StrategyToggle 
                            label="Sound Notifications" 
                            description="Audio alerts for trade execution." 
                            active={botState.soundEnabled} 
                            onToggle={() => setBotState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                          />
                          <StrategyToggle label="Compact View" description="Minimize dashboard elements for more data density." active={false} />
                        </div>
                      </div>
                    )}

                    {settingsTab === 'global' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Bot Settings</h4>
                          <div className="space-y-3">
                            <div className="p-3 bg-white/5 border border-white/5 rounded-lg space-y-2">
                              <div className="text-[10px] font-bold text-white uppercase">Auto-Restart Engine</div>
                              <div className="text-[9px] text-gray-500">Automatically restart the engine after a disconnection.</div>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="w-8 h-4 rounded-full bg-blue-600 relative">
                                  <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
                                </div>
                                <span className="text-[9px] text-blue-400 font-bold uppercase">Enabled</span>
                              </div>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/5 rounded-lg space-y-2">
                              <div className="text-[10px] font-bold text-white uppercase">Data Retention</div>
                              <div className="text-[9px] text-gray-500">Number of candles to keep in memory for analysis.</div>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="px-3 py-1 bg-[#0a0a0c] border border-white/10 rounded text-[10px] text-blue-400 font-mono">200 Candles</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6 bg-white/5 flex justify-end gap-3">
                    <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">Cancel</button>
                    <button onClick={() => setShowSettings(false)} className="px-6 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Changes</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirmation Dialog */}
          <AnimatePresence>
            {confirmingOrder && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="w-full max-w-sm bg-[#111114] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-xl",
                        confirmingOrder === 'buy' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {confirmingOrder === 'buy' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-tight">Confirm {confirmingOrder} Order</h3>
                        <p className="text-xs text-gray-500">Manual execution for {botState.activeSymbol}</p>
                      </div>
                    </div>

                    <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Lot Size</span>
                        <span className="text-sm font-mono text-white">{manualOrder.lotSize}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Current Price</span>
                        <span className="text-sm font-mono text-white">{(marketData[marketData.length - 1]?.price || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Stop Loss</span>
                        <span className="text-sm font-mono text-red-400">
                          {manualOrder.stopLoss || (confirmingOrder === 'buy' ? (marketData[marketData.length - 1]?.price - 500).toFixed(2) : (marketData[marketData.length - 1]?.price + 500).toFixed(2))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Take Profit</span>
                        <span className="text-sm font-mono text-emerald-400">
                          {manualOrder.takeProfit || (confirmingOrder === 'buy' ? (marketData[marketData.length - 1]?.price + 1000).toFixed(2) : (marketData[marketData.length - 1]?.price - 1000).toFixed(2))}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setConfirmingOrder(null)}
                        className="py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          placeOrder(confirmingOrder);
                          setConfirmingOrder(null);
                        }}
                        className={cn(
                          "py-3 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg",
                          confirmingOrder === 'buy' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                        )}
                      >
                        Confirm {confirmingOrder}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
              {/* Top Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Active Symbol" value={botState.activeSymbol} subValue="V75 • 24/7" icon={<Activity className="text-blue-500" />} />
                <StatCard label="Daily PnL" value="+$420.15" subValue="+4.2%" icon={<TrendingUp className="text-emerald-500" />} />
                <StatCard label="Win Rate" value="68.4%" subValue="Last 50 Trades" icon={<Zap className="text-amber-500" />} />
                <StatCard label="Drawdown" value="1.2%" subValue="Daily Limit: 5%" icon={<AlertTriangle className="text-red-500" />} />
              </div>

              {/* Chart Section */}
              <div className="flex-1 min-h-[400px] bg-[#0d0d0f] border border-white/5 rounded-xl p-4 flex flex-col relative group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Live Market Feed
                      </h3>
                      <div className="flex gap-1">
                        {['M1', 'M5', 'M15', 'H1', 'H4'].map(tf => (
                          <button key={tf} className={cn("px-2 py-0.5 text-[10px] rounded border border-white/5 hover:bg-white/5", tf === 'M1' && "bg-blue-600/10 text-blue-400 border-blue-500/30")}>
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative group/symbol">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all">
                          <Globe className="w-3 h-3 text-blue-400" />
                          {botState.activeSymbol}
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        </button>
                        <div className="absolute top-full left-0 mt-1 w-48 bg-[#111114] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/symbol:opacity-100 group-hover/symbol:visible transition-all z-50 overflow-hidden">
                          {Object.keys(botState.instrumentConfigs).map(symbol => (
                            <button
                              key={symbol}
                              onClick={() => {
                                const config = botState.instrumentConfigs[symbol];
                                if (botState.isConnected && derivServiceRef.current) {
                                  derivServiceRef.current.unsubscribeTicks(botState.activeSymbol);
                                  derivServiceRef.current.fetchHistory(symbol, 50);
                                  derivServiceRef.current.subscribeTicks(symbol);
                                }
                                setBotState(prev => ({ ...prev, activeSymbol: symbol }));
                                if (config) {
                                  setManualOrder(prev => ({
                                    ...prev,
                                    lotSize: config.fixedLotSize,
                                    stopLoss: 0, // Reset to use config default if not manually set
                                    takeProfit: 0
                                  }));
                                }
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors border-b border-white/5 last:border-0",
                                botState.activeSymbol === symbol 
                                  ? "bg-blue-600/10 text-blue-400" 
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-500">
                    Price: <span className="text-white">{marketData[marketData.length-1].price.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={marketData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        hide 
                      />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        orientation="right"
                        tick={{fontSize: 10, fill: '#6b7280'}}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#16161a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px'}}
                        itemStyle={{color: '#3b82f6'}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                      {/* Mock Order Block */}
                      <ReferenceLine y={750200} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'left', value: 'Supply Zone', fill: '#ef4444', fontSize: 10 }} />
                      <ReferenceLine y={748000} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'left', value: 'Demand Zone', fill: '#10b981', fontSize: 10 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
                {/* Active Trades */}
                <div className="lg:col-span-2 bg-[#0d0d0f] border border-white/5 rounded-xl flex flex-col min-h-[300px]">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Activity className="w-3 h-3 text-blue-500" />
                      Active Positions
                    </h3>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          trades.filter(t => t.status === 'open').forEach(t => closeTrade(t.id));
                        }}
                        className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-tighter transition-colors"
                      >
                        Close All
                      </button>
                      <span className="text-[10px] text-gray-500">{trades.filter(t => t.status === 'open').length} Open</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-[10px] text-left">
                      <thead className="bg-white/5 text-gray-500 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 font-medium">Symbol</th>
                          <th className="px-4 py-2 font-medium">Type</th>
                          <th className="px-4 py-2 font-medium">Entry</th>
                          <th className="px-4 py-2 font-medium">SL/TP</th>
                          <th className="px-4 py-2 font-medium">PnL</th>
                          <th className="px-4 py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {trades.filter(t => t.status === 'open').map(trade => (
                          <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium text-white">{trade.symbol}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                trade.type === 'buy' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                              )}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">{trade.entryPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono text-gray-500">
                              <span className="text-red-400/70">{trade.stopLoss}</span> / <span className="text-emerald-400/70">{trade.takeProfit}</span>
                            </td>
                            <td className={cn("px-4 py-3 font-mono font-bold", trade.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => toggleTpAlert(trade.id)}
                                  className={cn(
                                    "p-1 rounded transition-colors",
                                    trade.tpAlertEnabled ? "text-blue-500 hover:bg-blue-500/10" : "text-gray-600 hover:bg-white/5"
                                  )}
                                  title={trade.tpAlertEnabled ? "TP Alert Enabled" : "TP Alert Disabled"}
                                >
                                  {trade.tpAlertEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                                </button>
                                <button 
                                  onClick={() => closeTrade(trade.id)}
                                  className="p-1 hover:bg-red-500/10 rounded text-gray-500 hover:text-red-500 transition-colors"
                                  title="Close Position"
                                >
                                  <Square className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {trades.filter(t => t.status === 'open').length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-600 italic">No active positions.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Orderflow Analysis */}
                <div className="bg-[#0d0d0f] border border-white/5 rounded-xl flex flex-col min-h-[300px]">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Orderflow Analysis
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] text-gray-500 uppercase">Live</span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    <div className="space-y-2">
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Market Structure</div>
                      <div className="space-y-1.5">
                        {currentEngine.getBreaks().length === 0 ? (
                          <div className="text-[10px] text-gray-600 italic px-2">No breaks detected...</div>
                        ) : (
                          currentEngine.getBreaks().slice(-2).map(brk => (
                            <div key={brk.id} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded text-[10px]">
                              <span className={cn("font-bold", brk.direction === 'bullish' ? "text-emerald-400" : "text-red-400")}>
                                {brk.type} ({brk.direction})
                              </span>
                              <span className="text-gray-500 font-mono">{brk.price.toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Points of Interest</div>
                      <div className="space-y-1.5">
                        {currentEngine.getOrderBlocks().length === 0 ? (
                          <div className="text-[10px] text-gray-600 italic px-2">No POIs identified...</div>
                        ) : (
                          currentEngine.getOrderBlocks().slice(-2).map(ob => (
                            <div key={ob.id} className={cn(
                              "flex items-center justify-between p-2 border rounded text-[10px]",
                              ob.type === 'demand' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10"
                            )}>
                              <span className={cn("font-bold", ob.type === 'demand' ? "text-emerald-400" : "text-red-400")}>
                                {ob.type === 'demand' ? 'Demand' : 'Supply'} ({ob.isMitigated ? 'Mitigated' : 'Unmitigated'})
                              </span>
                              <span className="text-gray-500 font-mono">{ob.low.toFixed(0)} - {ob.high.toFixed(0)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-600/5 border border-blue-500/10 rounded-lg">
                      <div className="text-[9px] font-bold text-blue-400 uppercase mb-1">Current Bias</div>
                      <div className="text-[11px] text-gray-300 leading-tight">
                        Institutional Orderflow is <span className={cn("font-bold", currentEngine.getAnalysis()?.neuralNetwork.bias === 'bullish' ? "text-emerald-400" : "text-red-400")}>
                          {currentEngine.getAnalysis()?.neuralNetwork.bias.toUpperCase() || 'NEUTRAL'}
                        </span>. 
                        Market state detected as <span className="text-blue-400 font-bold uppercase">{currentEngine.getAnalysis()?.hmm.currentState || 'UNKNOWN'}</span>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="flex-1 p-10 max-w-4xl mx-auto w-full space-y-10 overflow-y-auto">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white uppercase tracking-widest">Strategy & Orderflow</h2>
                <p className="text-sm text-gray-500">Define the core APA logic, Liquidity-Zone Shift (LZS), and Orderflow parameters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Timeframe Coordination */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Timeframe Coordination
                  </h3>
                  <div className="space-y-3">
                    <StrategySelect label="Constant Timeframe (CT)" description="Weekly/Daily for major AOL." value="Daily" />
                    <StrategySelect label="Situational Timeframe (ST1)" description="H4/H1 for shift detection." value="H4" />
                    <StrategySelect label="Entry Timeframe (ET)" description="M15/M5 for impulse/retest." value="M15" />
                  </div>
                </div>

                {/* Orderflow Concepts */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Orderflow & Mitigation
                  </h3>
                  <div className="space-y-3">
                    <StrategyToggle label="Mitigation Check" description="Only trade unmitigated Order Blocks." active={true} />
                    <StrategyToggle label="Liquidity Sweep" description="Wait for wick sweep before entry." active={true} />
                    <StrategyToggle label="Volume Imbalance" description="Detect institutional displacement." active={true} />
                  </div>
                </div>
              </div>

              {/* Instrument-Specific Logic */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500" />
                    Instrument-Specific Logic (Crash/Boom)
                  </h3>
                  <div className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-bold rounded uppercase">Advanced</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <StrategyToggle 
                      label="Crash/Boom Mode" 
                      description="Enable specialized spike filtering and gap protection." 
                      active={botState.instrumentConfigs[botState.activeSymbol]?.isCrashBoom || false} 
                    />
                    <StrategyToggle 
                      label="Disable BOS on Spikes" 
                      description="Ignore structural breaks caused by sudden spikes (N x ATR)." 
                      active={botState.instrumentConfigs[botState.activeSymbol]?.disableBOSOnSpikes || false} 
                    />
                  </div>
                  <div className="space-y-4">
                    <StrategySelect 
                      label="Spike Threshold (ATR)" 
                      description="Multiplier for ATR to define a spike candle." 
                      value={`${botState.instrumentConfigs[botState.activeSymbol]?.spikeThresholdATR || 2.5}x`} 
                    />
                    <StrategySelect 
                      label="Gap Protection Multiplier" 
                      description="Multiplier for SL buffer during high-volatility spikes." 
                      value={`${botState.instrumentConfigs[botState.activeSymbol]?.gapProtectionMultiplier || 1.0}x`} 
                    />
                  </div>
                </div>
              </div>

              {/* Manual Order Execution */}
              <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Manual Order Execution
                  </h3>
                  <div className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-bold rounded uppercase">Override</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Lot Size</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-blue-400 focus:border-blue-500/50 outline-none"
                      value={manualOrder.lotSize}
                      onChange={(e) => setManualOrder(prev => ({ ...prev, lotSize: parseFloat(e.target.value) || 0.01 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Stop Loss (Price)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-red-400 focus:border-red-500/50 outline-none"
                      placeholder="Auto-calculated if 0"
                      value={manualOrder.stopLoss === 0 ? '' : manualOrder.stopLoss}
                      onChange={(e) => setManualOrder(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Take Profit (Price)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-emerald-400 focus:border-emerald-500/50 outline-none"
                      placeholder="Auto-calculated if 0"
                      value={manualOrder.takeProfit === 0 ? '' : manualOrder.takeProfit}
                      onChange={(e) => setManualOrder(prev => ({ ...prev, takeProfit: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button 
                    onClick={() => setConfirmingOrder('buy')}
                    className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Place Buy Order
                  </button>
                  <button 
                    onClick={() => setConfirmingOrder('sell')}
                    className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                  >
                    <TrendingDown className="w-4 h-4" />
                    Place Sell Order
                  </button>
                </div>
              </div>

              {/* Entry Prerequisites */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-xl space-y-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Entry Prerequisites Checklist</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PrerequisiteItem label="CT AOL Fresh/Unconsumed" checked={true} />
                  <PrerequisiteItem label="ST1 Liquidity Engineering" checked={true} />
                  <PrerequisiteItem label="ET Impulse Clears Structure" checked={true} />
                  <PrerequisiteItem label="ET Retest Rejection" checked={false} />
                  <PrerequisiteItem label="EMA 50 Pierced" checked={true} />
                  <PrerequisiteItem label="R:R Ratio ≥ 1:2" checked={true} />
                  <PrerequisiteItem label="Orderflow Alignment" checked={true} />
                  <PrerequisiteItem label="Mitigation Verified" checked={true} />
                </div>
              </div>

              {/* Advanced Parameters */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Advanced APA Parameters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0d0d0f] border border-white/5 rounded-xl space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase">Displacement Threshold</div>
                    <div className="text-sm font-mono text-white">2.5 × ATR(14)</div>
                  </div>
                  <div className="p-4 bg-[#0d0d0f] border border-white/5 rounded-xl space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase">FVG Fallback</div>
                    <div className="text-sm font-mono text-white">50% OB Range</div>
                  </div>
                  <div className="p-4 bg-[#0d0d0f] border border-white/5 rounded-xl space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase">Confirmation Type</div>
                    <div className="text-sm font-mono text-white">ChoCh + Close</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="flex-1 p-10 max-w-6xl mx-auto w-full space-y-8 overflow-y-auto">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white uppercase tracking-widest">Market Analysis & Structure</h2>
                <p className="text-sm text-gray-500">Advanced statistical models and structural break detection.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Statistical Models */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AnalysisCard 
                      title="Linear Regression" 
                      value={`Slope: ${currentEngine.getAnalysis()?.linearRegression.slope.toFixed(4)}`}
                      subValue={`R²: ${currentEngine.getAnalysis()?.linearRegression.r2}`}
                      icon={<TrendingUp className="text-blue-400" />}
                    />
                    <AnalysisCard 
                      title="GARCH Volatility" 
                      value={`${(currentEngine.getAnalysis()?.garch.volatility || 0).toFixed(6)}`}
                      subValue={`Forecast: ${(currentEngine.getAnalysis()?.garch.forecast || 0).toFixed(6)}`}
                      icon={<Activity className="text-purple-400" />}
                    />
                    <AnalysisCard 
                      title="Kalman Filter" 
                      value={`${currentEngine.getAnalysis()?.kalmanFilter.filteredPrice.toFixed(2)}`}
                      subValue={`Gain: ${currentEngine.getAnalysis()?.kalmanFilter.gain}`}
                      icon={<Zap className="text-amber-400" />}
                    />
                    <AnalysisCard 
                      title="Neural Ensemble" 
                      value={currentEngine.getAnalysis()?.neuralNetwork.bias.toUpperCase() || 'NEUTRAL'}
                      subValue={`Confidence: ${((currentEngine.getAnalysis()?.neuralNetwork.confidence || 0) * 100).toFixed(1)}%`}
                      icon={<Brain className="text-emerald-400" />}
                    />
                  </div>

                  <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      Monte Carlo Projection (20 Steps)
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentEngine.getAnalysis()?.monteCarlo.paths[0].map((p, i) => ({ step: i, price: p }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="step" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          {currentEngine.getAnalysis()?.monteCarlo.paths.map((path, idx) => (
                            <Line 
                              key={idx}
                              type="monotone" 
                              data={path.map((p, i) => ({ step: i, price: p }))}
                              dataKey="price" 
                              stroke={idx === 0 ? "#3b82f6" : "#3b82f633"} 
                              strokeWidth={idx === 0 ? 2 : 1}
                              dot={false}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Structure List */}
                <div className="space-y-6">
                  <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/5">
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Detected Structure</h3>
                    </div>
                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                      <div className="space-y-2">
                        <div className="text-[9px] font-bold text-gray-500 uppercase">Market Breaks (BOS/ChoCh)</div>
                        {currentEngine.getBreaks().length === 0 ? (
                          <div className="text-[10px] text-gray-600 italic">No breaks detected yet...</div>
                        ) : (
                          currentEngine.getBreaks().map(brk => (
                            <div key={brk.id} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded text-[10px]">
                              <span className={cn("font-bold", brk.direction === 'bullish' ? "text-emerald-400" : "text-red-400")}>
                                {brk.type} ({brk.direction})
                              </span>
                              <span className="text-gray-500 font-mono">{brk.price.toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="text-[9px] font-bold text-gray-500 uppercase">Order Blocks (S/D)</div>
                        {currentEngine.getOrderBlocks().length === 0 ? (
                          <div className="text-[10px] text-gray-600 italic">No order blocks identified...</div>
                        ) : (
                          currentEngine.getOrderBlocks().map(ob => (
                            <div key={ob.id} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded text-[10px]">
                              <span className={cn("font-bold", ob.type === 'demand' ? "text-emerald-400" : "text-red-400")}>
                                {ob.type.toUpperCase()}
                              </span>
                              <span className="text-gray-500 font-mono">{ob.low.toFixed(0)} - {ob.high.toFixed(0)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-xl space-y-2">
                    <div className="text-[9px] font-bold text-blue-400 uppercase">HMM Market State</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold uppercase">{currentEngine.getAnalysis()?.hmm.currentState}</span>
                      <span className="text-[10px] text-gray-500">Confidence: {((currentEngine.getAnalysis()?.hmm.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${(currentEngine.getAnalysis()?.hmm.confidence || 0) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="flex-1 p-10 max-w-6xl mx-auto w-full space-y-8 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest">Strategy Backtesting</h2>
                  <p className="text-sm text-gray-500">Simulate APA logic on historical data to verify edge and performance.</p>
                </div>
                <button 
                  onClick={runBacktest}
                  disabled={backtestState.isTesting}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    backtestState.isTesting 
                      ? "bg-blue-600/20 text-blue-400 cursor-not-allowed" 
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                  )}
                >
                  {backtestState.isTesting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Testing {backtestState.progress}%
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      Run Backtest
                    </>
                  )}
                </button>
              </div>

              {backtestState.results ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Win Rate</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400">{backtestState.results.winRate.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-600 uppercase italic">Based on {backtestState.results.totalTrades} trades</div>
                  </div>
                  <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Profit Factor</div>
                    <div className="text-2xl font-mono font-bold text-blue-400">{backtestState.results.profitFactor.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-600 uppercase italic">Gross Profit / Gross Loss</div>
                  </div>
                  <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Total PnL</div>
                    <div className={cn("text-2xl font-mono font-bold", backtestState.results.totalPnL >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {backtestState.results.totalPnL >= 0 ? '+' : ''}${backtestState.results.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-gray-600 uppercase italic">Net simulated profit</div>
                  </div>
                  <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Max Drawdown</div>
                    <div className="text-2xl font-mono font-bold text-red-400">{backtestState.results.maxDrawdown.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-600 uppercase italic">Peak-to-valley decline</div>
                  </div>

                  <div className="lg:col-span-4 bg-[#0d0d0f] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Simulated Trade History</h3>
                      <div className="text-[10px] text-gray-500 uppercase font-bold">{backtestState.results.trades.length} Executions</div>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-[10px] text-left">
                        <thead className="bg-white/5 text-gray-500 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 font-medium uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 font-medium uppercase tracking-wider">Entry</th>
                            <th className="px-6 py-3 font-medium uppercase tracking-wider">Exit</th>
                            <th className="px-6 py-3 font-medium uppercase tracking-wider">PnL</th>
                            <th className="px-6 py-3 font-medium uppercase tracking-wider">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {backtestState.results.trades.map((trade: any) => (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-1 rounded text-[9px] font-bold uppercase",
                                  trade.type === 'buy' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                )}>
                                  {trade.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-white">{trade.entryPrice.toFixed(2)}</td>
                              <td className="px-6 py-4 font-mono text-white">{trade.exitPrice?.toFixed(2)}</td>
                              <td className={cn("px-6 py-4 font-mono font-bold", trade.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-gray-500">{format(trade.openTime, 'MMM dd, HH:mm:ss')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-[#0d0d0f] border border-white/5 border-dashed rounded-3xl space-y-6">
                  <div className="p-6 bg-blue-600/5 rounded-full">
                    <FastForward className="w-12 h-12 text-blue-500/50" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest">No Backtest Results</h3>
                    <p className="text-sm text-gray-500 max-w-xs">Click the button above to simulate the current APA strategy on 500 historical candles.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="flex-1 p-10 max-w-4xl mx-auto w-full space-y-8 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest">Account Management</h2>
                  <p className="text-sm text-gray-500">Add and manage multiple accounts for simultaneous copy-trading.</p>
                </div>
                <button 
                  onClick={() => {
                    const name = prompt('Account Name:');
                    const appId = prompt('App ID:');
                    const apiToken = prompt('API Token:');
                    if (name && appId && apiToken) addAccount(name, appId, apiToken);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Account
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {botState.accounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-[#0d0d0f] border border-white/5 border-dashed rounded-3xl space-y-4">
                    <Users className="w-12 h-12 text-gray-700" />
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Sub-Accounts</h3>
                      <p className="text-xs text-gray-600">Add your friends' accounts to sync trades.</p>
                    </div>
                  </div>
                ) : (
                  botState.accounts.map(acc => (
                    <div key={acc.id} className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          acc.status === 'connected' ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"
                        )}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{acc.name}</h4>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-tighter",
                              acc.status === 'connected' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {acc.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">App ID: {acc.appId}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <div className="text-[10px] text-gray-500 uppercase font-bold">Balance</div>
                          <div className="text-sm font-mono text-white">${acc.balance.toLocaleString()}</div>
                        </div>
                        
                        <button 
                          onClick={() => toggleAccount(acc.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            acc.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"
                          )}
                        >
                          {acc.isActive ? 'Active' : 'Paused'}
                        </button>
                        
                        <button 
                          onClick={() => removeAccount(acc.id)}
                          className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-1">Simultaneous Execution</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    When enabled, the bot will mirror all manual and automated trades across all active accounts at the exact same rate. 
                    Ensure all accounts have sufficient balance to maintain margin requirements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="flex-1 p-10 max-w-4xl mx-auto w-full space-y-8 overflow-y-auto">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white uppercase tracking-widest">Risk Orchestrator</h2>
                <p className="text-sm text-gray-500">Configure dynamic equity-fractional sizing and safety protocols.</p>
              </div>

              {botState.isHalted && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <div>
                    <h4 className="text-sm font-bold text-red-500 uppercase">Trading Halted</h4>
                    <p className="text-xs text-red-400/80">Daily drawdown limit exceeded. Reset at 00:00 GMT.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      Daily Drawdown Protocol
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[9px] text-gray-500 uppercase">High-Water Mark</div>
                        <div className="text-sm font-mono text-white">${botState.highWaterMark.toLocaleString()}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] text-gray-500 uppercase">Current Drawdown</div>
                        <div className={cn(
                          "text-sm font-mono",
                          ((botState.highWaterMark - botState.equity) / botState.highWaterMark) * 100 > 4 ? "text-red-400" : "text-emerald-400"
                        )}>
                          {(((botState.highWaterMark - botState.equity) / botState.highWaterMark) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-gray-500 italic">
                      Resetting in: {(() => {
                        const ms = botState.lastResetTime + 24 * 60 * 60 * 1000 - new Date().getTime();
                        const h = Math.floor(ms / 3600000);
                        const m = Math.floor((ms % 3600000) / 60000);
                        const s = Math.floor((ms % 60000) / 1000);
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                      })()} (GMT)
                    </div>
                  </div>

                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Filter className="w-4 h-4 text-blue-500" />
                        Instrument Risk Profiles
                      </h3>
                      <div className="relative group/risk-symbol">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all">
                          {editingInstrument}
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        </button>
                        <div className="absolute top-full right-0 mt-1 w-48 bg-[#111114] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/risk-symbol:opacity-100 group-hover/risk-symbol:visible transition-all z-50 overflow-hidden">
                          {Object.keys(botState.instrumentConfigs).map(symbol => (
                            <button
                              key={symbol}
                              onClick={() => setEditingInstrument(symbol)}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors border-b border-white/5 last:border-0",
                                editingInstrument === symbol 
                                  ? "bg-blue-600/10 text-blue-400" 
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {botState.instrumentConfigs[editingInstrument] && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 uppercase font-bold">Risk %</label>
                            <input 
                              type="number" 
                              value={botState.instrumentConfigs[editingInstrument].riskPercentage}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setBotState(prev => ({
                                  ...prev,
                                  instrumentConfigs: {
                                    ...prev.instrumentConfigs,
                                    [editingInstrument]: { ...prev.instrumentConfigs[editingInstrument], riskPercentage: val }
                                  }
                                }));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 uppercase font-bold">Lot Size Method</label>
                            <select 
                              value={botState.instrumentConfigs[editingInstrument].lotSizeMethod}
                              onChange={(e) => {
                                const val = e.target.value as 'fixed' | 'dynamic';
                                setBotState(prev => ({
                                  ...prev,
                                  instrumentConfigs: {
                                    ...prev.instrumentConfigs,
                                    [editingInstrument]: { ...prev.instrumentConfigs[editingInstrument], lotSizeMethod: val }
                                  }
                                }));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50"
                            >
                              <option value="fixed" className="bg-[#111114]">Fixed Lot</option>
                              <option value="dynamic" className="bg-[#111114]">Dynamic (Risk %)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 uppercase font-bold">Stop Loss (Pips)</label>
                            <input 
                              type="number" 
                              value={botState.instrumentConfigs[editingInstrument].stopLossPips}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setBotState(prev => ({
                                  ...prev,
                                  instrumentConfigs: {
                                    ...prev.instrumentConfigs,
                                    [editingInstrument]: { ...prev.instrumentConfigs[editingInstrument], stopLossPips: val }
                                  }
                                }));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 uppercase font-bold">Take Profit (Pips)</label>
                            <input 
                              type="number" 
                              value={botState.instrumentConfigs[editingInstrument].takeProfitPips}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setBotState(prev => ({
                                  ...prev,
                                  instrumentConfigs: {
                                    ...prev.instrumentConfigs,
                                    [editingInstrument]: { ...prev.instrumentConfigs[editingInstrument], takeProfitPips: val }
                                  }
                                }));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                            />
                          </div>
                        </div>

                        {botState.instrumentConfigs[editingInstrument].lotSizeMethod === 'fixed' && (
                          <div className="space-y-2">
                            <label className="text-[9px] text-gray-500 uppercase font-bold">Fixed Lot Size</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={botState.instrumentConfigs[editingInstrument].fixedLotSize}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setBotState(prev => ({
                                  ...prev,
                                  instrumentConfigs: {
                                    ...prev.instrumentConfigs,
                                    [editingInstrument]: { ...prev.instrumentConfigs[editingInstrument], fixedLotSize: val }
                                  }
                                }));
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500/50"
                            />
                          </div>
                        )}

                        <div className="p-3 bg-blue-600/5 border border-blue-500/10 rounded-lg">
                          <p className="text-[9px] text-blue-400/80 leading-relaxed italic">
                            Profiles are saved automatically and applied when you switch instruments in the dashboard.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                <div className="space-y-6">
                  {/* Dynamic Lot Calculator Display */}
                  <div className="p-6 bg-[#0d0d0f] border border-blue-500/20 rounded-2xl space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        Dynamic Lot Calculator
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">LIVE</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[9px] text-gray-500 uppercase">Current Spread</div>
                        <div className="text-sm font-mono text-white">{(marketData[marketData.length - 1]?.spread || symbolInfo.spread).toFixed(2)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] text-gray-500 uppercase">Spread in Pips</div>
                        <div className="text-sm font-mono text-white">{((marketData[marketData.length - 1]?.spread || symbolInfo.spread) / symbolInfo.point).toFixed(1)}</div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl space-y-3">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Equity Risk Amount</span>
                        <span className="text-white font-mono">${(botState.equity * (riskParams.riskPercent / 100)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Total SL (Base + Spread)</span>
                        <span className="text-white font-mono">{(riskParams.slPips + (marketData[marketData.length - 1]?.spread || symbolInfo.spread) / symbolInfo.point).toFixed(1)} Pips</span>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-blue-400 uppercase">Calculated Lot</span>
                        <span className="text-xl font-mono font-bold text-white">{calculatedLot}</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-gray-500 italic leading-relaxed">
                      Formula: Lot = (Equity × Risk%) / ((Base_SL + Spread/Point) × Tick_Value)
                    </div>
                  </div>

                  <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Gap Protection Protocol</h3>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Automatically adjusts stop-loss buffers for Crash/Boom indices to account for potential slippage during spikes. 
                      Uses a {botState.instrumentConfigs[botState.activeSymbol]?.gapProtectionMultiplier || 1.0}x multiplier on calculated SL distance.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-4 rounded-full relative transition-colors",
                        botState.instrumentConfigs[botState.activeSymbol]?.isCrashBoom ? "bg-blue-600" : "bg-gray-700"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-2 h-2 bg-white rounded-full transition-all",
                          botState.instrumentConfigs[botState.activeSymbol]?.isCrashBoom ? "right-1" : "left-1"
                        )} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase",
                        botState.instrumentConfigs[botState.activeSymbol]?.isCrashBoom ? "text-blue-400" : "text-gray-500"
                      )}>
                        {botState.instrumentConfigs[botState.activeSymbol]?.isCrashBoom ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-1 flex flex-col bg-[#0d0d0f]">
              <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between bg-[#0a0a0c]">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    Trade History
                  </h3>
                  <div className="text-[10px] text-gray-500 font-mono">Total Closed: {trades.filter(t => t.status === 'closed').length}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-[10px] bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded border border-blue-500/20 transition-colors">Export History</button>
                </div>
              </div>

              {/* Advanced Filter Bar */}
              <div className="p-4 bg-[#0a0a0c] border-b border-white/5 flex flex-wrap gap-6 items-end">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                    <Search className="w-3 h-3" />
                    Symbol
                  </label>
                  <select 
                    className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] text-gray-300 outline-none focus:border-blue-500/50 min-w-[140px]"
                    value={historyFilters.symbol}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, symbol: e.target.value }))}
                  >
                    <option value="all">All Symbols</option>
                    {Object.keys(botState.instrumentConfigs).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                    <Filter className="w-3 h-3" />
                    Type
                  </label>
                  <select 
                    className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] text-gray-300 outline-none focus:border-blue-500/50"
                    value={historyFilters.type}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="all">All Types</option>
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-blue-500/50 [color-scheme:dark]"
                      value={historyFilters.startDate}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    <span className="text-gray-600 text-[10px]">to</span>
                    <input 
                      type="date" 
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-blue-500/50 [color-scheme:dark]"
                      value={historyFilters.endDate}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" />
                    PnL Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-blue-500/50"
                      value={historyFilters.minPnL}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, minPnL: e.target.value }))}
                    />
                    <span className="text-gray-600 text-[10px]">-</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-blue-500/50"
                      value={historyFilters.maxPnL}
                      onChange={(e) => setHistoryFilters(prev => ({ ...prev, maxPnL: e.target.value }))}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setHistoryFilters({ symbol: 'all', type: 'all', startDate: '', endDate: '', minPnL: '', maxPnL: '' })}
                  className="px-3 py-1.5 text-[10px] text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest"
                >
                  Reset
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-white/5 text-gray-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Entry/Exit</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Lot</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">PnL</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTrades.map(trade => (
                      <tr key={trade.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{trade.symbol}</div>
                          <div className="text-[9px] text-gray-500 font-mono">ID: {trade.id}</div>
                          {trade.summary && (
                            <div className="mt-2 text-[10px] text-blue-400/80 italic max-w-md leading-relaxed">
                              <Brain className="w-3 h-3 inline mr-1 opacity-50" />
                              {trade.summary}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                            trade.type === 'buy' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <div className="text-gray-300">{trade.entryPrice.toFixed(2)}</div>
                          <div className="text-blue-400/80">{trade.exitPrice?.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-400">{trade.lotSize}</td>
                        <td className={cn("px-6 py-4 font-mono font-bold text-sm", trade.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-[10px]">
                          <div>O: {format(new Date(trade.openTime), 'MM/dd HH:mm')}</div>
                          <div>C: {trade.closeTime ? format(new Date(trade.closeTime), 'MM/dd HH:mm') : '-'}</div>
                        </td>
                      </tr>
                    ))}
                    {filteredTrades.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-gray-600 italic">No closed trades found matching filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col bg-[#0d0d0f]">
              <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between bg-[#0a0a0c]">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-blue-500" />
                    System Logs
                  </h3>
                  <div className="text-[10px] text-gray-500 font-mono">Total Entries: {logs.length}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setLogs([])} className="px-3 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-colors">Clear</button>
                  <button className="px-3 py-1 text-[10px] bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded border border-blue-500/20 transition-colors">Export CSV</button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto font-mono text-[11px] space-y-2">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-600 italic">No logs recorded.</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-4 group">
                      <span className="text-gray-600 shrink-0">[{log.time}]</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 h-fit",
                        log.type === 'success' && "bg-emerald-500/10 text-emerald-500",
                        log.type === 'warning' && "bg-amber-500/10 text-amber-500",
                        log.type === 'error' && "bg-red-500/10 text-red-500",
                        log.type === 'info' && "bg-blue-500/10 text-blue-500"
                      )}>
                        {log.type}
                      </span>
                      <span className={cn(
                        "flex-1",
                        log.type === 'success' && "text-emerald-400/90",
                        log.type === 'warning' && "text-amber-400/90",
                        log.type === 'error' && "text-red-400/90",
                        log.type === 'info' && "text-gray-300"
                      )}>
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 border-t border-white/5 bg-[#0d0d0f] flex items-center justify-between px-6 text-[9px] font-mono text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", botState.isConnected ? "bg-emerald-500" : "bg-red-500")} />
            DERIV API: {botState.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div>LATENCY: 42ms</div>
          <div className="w-px h-3 bg-white/10" />
          <div>SERVER: GMT+0</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-blue-400">APEX-SYN ENGINE v1.0.4</span>
          <span>© 2026 AI ARCHITECT</span>
        </div>
      </footer>
    </div>
  );
}

function NavIcon({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group p-2 rounded-lg transition-all",
        active ? "text-blue-500 bg-blue-500/10" : "text-gray-500 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <div className="absolute left-full ml-4 px-2 py-1 bg-[#16161a] border border-white/10 rounded text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </div>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r" />}
    </button>
  );
}

function StatCard({ label, value, subValue, icon }: { label: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d0f] border border-white/5 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="text-lg font-bold text-white mt-1">{value}</div>
      <div className="text-[10px] text-gray-500">{subValue}</div>
    </div>
  );
}

function RiskInput({ label, description, value }: { label: string, description: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{label}</h4>
        <p className="text-[10px] text-gray-500 max-w-xs">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-[#0a0a0c] border border-white/10 rounded-lg font-mono text-sm text-blue-400 min-w-[80px] text-center">
          {value}
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StrategySelect({ label, description, value }: { label: string, description: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
      <div className="space-y-0.5">
        <div className="text-[10px] font-bold text-white uppercase">{label}</div>
        <div className="text-[9px] text-gray-500">{description}</div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-[#0a0a0c] border border-white/10 rounded text-[10px] text-blue-400 font-mono">
        {value}
        <ChevronRight className="w-3 h-3 rotate-90" />
      </div>
    </div>
  );
}

function StrategyToggle({ label, description, active, onToggle }: { label: string, description: string, active: boolean, onToggle?: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
      <div className="space-y-0.5">
        <div className="text-[10px] font-bold text-white uppercase">{label}</div>
        <div className="text-[9px] text-gray-500">{description}</div>
      </div>
      <button 
        onClick={onToggle}
        className={cn(
          "w-8 h-4 rounded-full relative transition-colors",
          active ? "bg-blue-600" : "bg-gray-700"
        )}
      >
        <div className={cn(
          "absolute top-1 w-2 h-2 bg-white rounded-full transition-all",
          active ? "right-1" : "left-1"
        )} />
      </button>
    </div>
  );
}

function PrerequisiteItem({ label, checked }: { label: string, checked: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#0a0a0c] border border-white/5 rounded-lg">
      <div className={cn(
        "w-4 h-4 rounded flex items-center justify-center",
        checked ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
      )}>
        {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <span className={cn("text-[10px] font-medium", checked ? "text-gray-300" : "text-gray-500")}>{label}</span>
    </div>
  );
}

function AnalysisCard({ title, value, subValue, icon }: { title: string; value: string; subValue: string; icon: React.ReactNode }) {
  return (
    <div className="p-5 bg-[#0d0d0f] border border-white/5 rounded-2xl space-y-3 hover:border-white/10 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{title}</div>
      </div>
      <div className="space-y-1">
        <div className="text-lg font-mono text-white font-bold">{value}</div>
        <div className="text-[10px] text-gray-500 font-medium">{subValue}</div>
      </div>
    </div>
  );
}
