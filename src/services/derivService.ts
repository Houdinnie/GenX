import { MarketData } from '../types';

export class DerivService {
  private ws: WebSocket | null = null;
  private appId: string;
  private apiToken: string;
  private onTick: (data: MarketData, isHistory?: boolean) => void;
  private onHistory: (data: MarketData[]) => void;
  private onStatus: (isConnected: boolean) => void;
  private onLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;

  constructor(
    appId: string,
    apiToken: string,
    onTick: (data: MarketData, isHistory?: boolean) => void,
    onHistory: (data: MarketData[]) => void,
    onStatus: (isConnected: boolean) => void,
    onLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void
  ) {
    this.appId = appId;
    this.apiToken = apiToken;
    this.onTick = onTick;
    this.onHistory = onHistory;
    this.onStatus = onStatus;
    this.onLog = onLog;
  }

  public connect() {
    if (this.ws) this.ws.close();

    const url = `wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.onLog('Deriv WebSocket Connected', 'success');
      this.onStatus(true);
      this.authenticate();
    };

    this.ws.onmessage = (msg) => {
      const response = JSON.parse(msg.data);
      this.handleResponse(response);
    };

    this.ws.onclose = () => {
      this.onLog('Deriv WebSocket Disconnected', 'warning');
      this.onStatus(false);
    };

    this.ws.onerror = (err) => {
      this.onLog('Deriv WebSocket Error', 'error');
      console.error('Deriv WS Error:', err);
    };
  }

  private authenticate() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.apiToken) {
      this.ws.send(JSON.stringify({ authorize: this.apiToken }));
    }
  }

  public subscribeTicks(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Convert UI symbol to Deriv symbol if needed
      const derivSymbol = this.mapSymbol(symbol);
      this.ws.send(JSON.stringify({ ticks: derivSymbol, subscribe: 1 }));
      this.onLog(`Subscribed to ${symbol} ticks`, 'info');
    }
  }

  public unsubscribeTicks(symbol: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const derivSymbol = this.mapSymbol(symbol);
      this.ws.send(JSON.stringify({ forget_all: 'ticks' }));
    }
  }

  public fetchHistory(symbol: string, count: number = 100) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const derivSymbol = this.mapSymbol(symbol);
      this.ws.send(JSON.stringify({
        ticks_history: derivSymbol,
        adjust_start_time: 1,
        count: count,
        end: 'latest',
        start: 1,
        style: 'candles'
      }));
    }
  }

  private handleResponse(response: any) {
    if (response.error) {
      this.onLog(`Deriv Error: ${response.error.message}`, 'error');
      return;
    }

    if (response.msg_type === 'authorize') {
      this.onLog('Deriv Authentication Successful', 'success');
      // Fetch balance after auth
      this.ws?.send(JSON.stringify({ balance: 1, subscribe: 1 }));
    }

    if (response.msg_type === 'tick') {
      const tick = response.tick;
      this.onTick({
        symbol: this.unmapSymbol(tick.symbol),
        price: tick.quote,
        time: tick.epoch * 1000,
        spread: 0,
      });
    }

    if (response.msg_type === 'ohlc') {
      const ohlc = response.ohlc;
      this.onTick({
        symbol: this.unmapSymbol(ohlc.symbol),
        price: ohlc.close,
        time: ohlc.epoch * 1000,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        spread: 0
      });
    }

    if (response.msg_type === 'history') {
      const history = response.history;
      const prices = history.prices;
      const times = history.times;
      const historyData: MarketData[] = [];
      
      if (prices && times) {
        for (let i = 0; i < prices.length; i++) {
          historyData.push({
            symbol: this.unmapSymbol(response.echo_req.ticks_history),
            price: prices[i],
            time: times[i] * 1000,
            spread: 0
          });
        }
      }

      const candles = response.candles;
      if (candles) {
        for (const candle of candles) {
          historyData.push({
            symbol: this.unmapSymbol(response.echo_req.ticks_history),
            price: candle.close,
            time: candle.epoch * 1000,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            spread: 0
          });
        }
      }
      this.onHistory(historyData);
    }

    if (response.msg_type === 'balance') {
      // Update balance in state if needed
    }
  }

  private mapSymbol(symbol: string): string {
    const mapping: Record<string, string> = {
      'Volatility 75 Index': 'R_75',
      'Crash 1000 Index': 'R_1000',
      'XAUUSD': 'frxXAUUSD',
    };
    return mapping[symbol] || symbol;
  }

  private unmapSymbol(symbol: string): string {
    const mapping: Record<string, string> = {
      'R_75': 'Volatility 75 Index',
      'R_1000': 'Crash 1000 Index',
      'frxXAUUSD': 'XAUUSD',
    };
    return mapping[symbol] || symbol;
  }

  public executeTrade(type: 'buy' | 'sell', symbol: string, lotSize: number, sl?: number, tp?: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.onLog(`[Account: ${this.appId}] Executing ${type.toUpperCase()} on ${symbol} (Lot: ${lotSize})`, 'success');
      // Real implementation would send 'buy' request to Deriv API
    } else {
      this.onLog(`[Account: ${this.appId}] Failed to execute: Not connected`, 'error');
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
