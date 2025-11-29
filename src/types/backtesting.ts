// Backtesting Types
export interface BacktestConfig {
  strategy: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  riskPerTrade: number; // percentage
  maxOpenPositions: number;
  symbols: string[];
  timeframes: string[];
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfit: number;
  totalLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  finalBalance: number;
  returnPercent: number;
  equityCurve: Array<{ date: string; equity: number }>;
  trades: Array<{
    entry: number;
    exit: number;
    entryTime: string;
    exitTime: string;
    pnl: number;
    rr: number;
  }>;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  entryRules: string[];
  exitRules: string[];
  filters: string[];
}

