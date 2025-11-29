// Session Analytics Types
export interface SessionPerformance {
  session: 'ASIA' | 'LONDON' | 'NEWYORK' | 'CLOSE';
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  profitFactor: number;
  averageRR: number;
  bestHour: number; // 0-23
  worstHour: number;
  avgHoldingTime: number; // minutes
}

export interface HourlyPerformance {
  hour: number; // 0-23
  totalTrades: number;
  winRate: number;
  avgRR: number;
  totalPnL: number;
}

