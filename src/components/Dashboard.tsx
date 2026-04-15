/**
 * Dashboard Component
 * Extracted from monolithic App.tsx per PDF recommendations
 */

import React from 'react';
import {
  Wallet, Activity, TrendingUp, TrendingDown, BarChart3,
  Settings, Play, Square, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, ReferenceLine, Tooltip
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { MarketData, Trade, BotState, SymbolInfo } from '../types';

interface DashboardProps {
  marketData: MarketData[];
  trades: Trade[];
  botState: BotState;
  symbolInfo: SymbolInfo;
  onOpenSettings: () => void;
  onToggleTrading: () => void;
  onSymbolSelect: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  marketData, trades, botState, symbolInfo,
  onOpenSettings, onToggleTrading, onSymbolSelect
}) => {
  const currentPrice = marketData[marketData.length - 1]?.price || 0;
  const priceChange = marketData.length > 1 
    ? currentPrice - (marketData[marketData.length - 2]?.price || 0) : 0;
  const priceChangePercent = marketData.length > 1 
    ? (priceChange / (marketData[marketData.length - 2]?.price || 1)) * 100 : 0;
  const openTrades = trades.filter(t => t.status === 'open');
  const totalPnl = trades.reduce((sum, t) => sum + (t.status === 'closed' ? t.pnl : t.pnl), 0);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Balance"
          value={`$${botState.balance.toFixed(2)}`}
          subValue={botState.isConnected ? 'Live' : 'Disconnected'}
          icon={<Wallet className="text-blue-400" />}
          loading={botState.balance === 0}
        />
        <StatCard
          label="Equity"
          value={`$${botState.equity.toFixed(2)}`}
          subValue={`P&L: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`}
          icon={<Activity className="text-emerald-400" />}
        />
        <StatCard
          label="Current Price"
          value={currentPrice.toFixed(2)}
          subValue={`${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${priceChangePercent.toFixed(2)}%)`}
          icon={priceChange >= 0 ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-red-400" />}
        />
        <StatCard
          label="Open Trades"
          value={openTrades.length.toString()}
          subValue={openTrades.length > 0 ? `${openTrades.reduce((s, t) => s + t.pnl, 0) >= 0 ? '+' : ''}${openTrades.reduce((s, t) => s + t.pnl, 0).toFixed(2)}` : 'None'}
          icon={<BarChart3 className="text-purple-400" />}
        />
      </div>

      {/* Market Chart */}
      <div className="p-6 bg-[#0d0d0f] border border-white/5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onSymbolSelect}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="text-sm font-bold text-white">{botState.activeSymbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-xs text-gray-500">M1 Candles</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTrading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                botState.isTrading
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {botState.isTrading ? (
                <><Square className="w-3 h-3" /> Stop</>
              ) : (
                <><Play className="w-3 h-3" /> Start</>
              )}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={marketData.slice(-50)}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#0d0d0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelFormatter={(value) => format(new Date(value), 'HH:mm:ss')}
              />
              <ReferenceLine y={currentPrice} stroke="#3b82f6" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="price"
                stroke={priceChange >= 0 ? "#10b981" : "#ef4444"}
                fill="url(#priceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, loading }) => (
  <div className="p-4 bg-[#0d0d0f] border border-white/5 rounded-xl">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</span>
      {icon}
    </div>
    {loading ? (
      <div className="h-6 w-20 bg-white/5 animate-pulse rounded" />
    ) : (
      <div className="text-lg font-bold text-white">{value}</div>
    )}
    {subValue && <div className="text-[10px] text-gray-500 mt-1">{subValue}</div>}
  </div>
);

interface TradeCardProps {
  trade: Trade;
  onCloseTrade?: (id: string) => void;
}

export const TradeCard: React.FC<TradeCardProps> = ({ trade, onCloseTrade }) => {
  const pnlColor = trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="p-4 bg-[#0d0d0f] border border-white/5 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          trade.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        )}>
          {trade.type === 'buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        </div>
        <div>
          <div className="text-sm font-bold text-white">{trade.symbol}</div>
          <div className="text-[10px] text-gray-500">
            {trade.type.toUpperCase()} {trade.lotSize} @ {trade.entryPrice.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={cn("text-sm font-bold", pnlColor)}>
          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
        </div>
        <div className="text-[10px] text-gray-500">{trade.status}</div>
      </div>
    </div>
  );
};
